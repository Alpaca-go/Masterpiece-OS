// Visual Analysis A2-D — Cross-Model Evaluation Matrix runner.
//
// One-shot, manual/opt-in real Provider evaluation. Reads the
// frozen A2-C manifest, runs each (Provider × Case) once by
// default (or 3× when --runs=3 is passed for close-stability
// investigation), writes raw outputs and structured metadata
// under docs/visual-analysis/evaluation/{caseId}/{provider}/, and
// emits docs/visual-analysis/A2-evaluation-matrix.md.
//
// Per A2 spec §20, §21, §105: this script is NEVER invoked by
// `repo:verify` or default CI. It is run by the user explicitly,
// after providing QWEN_API_KEY and VOLCENGINE_API_KEY (or
// ARK_API_KEY) environment variables.
//
// Invocation (PowerShell):
//   $env:QWEN_API_KEY='sk-...'
//   $env:VOLCENGINE_API_KEY='ark-...'   # or $env:ARK_API_KEY='ark-...'
//   npm run a2-d:run
//
// Or with 3 runs per case (close-stability):
//   node scripts/a2-d-run-evaluations.mjs --runs=3

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import sharp from 'sharp';
import { createQwenReasoner } from '../packages/model-runtime/src/qwen-reasoner.js';
import { createVolcengineReasoner } from '../packages/model-runtime/src/volcengine-reasoner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO = path.resolve(__dirname, '..');

const MANIFEST = path.join(REPO, 'docs', 'visual-analysis', 'A2-evaluation-corpus.manifest.json');
const EVAL_DIR = path.join(REPO, 'docs', 'visual-analysis', 'evaluation');
const MATRIX_DOC = path.join(REPO, 'docs', 'visual-analysis', 'A2-evaluation-matrix.md');

// A2-D run id (deterministic, used as the run number prefix).
const RUN_BATCH_ID = new Date().toISOString().replace(/[:.]/gu, '-');
const RUNS_PER_CASE = Number(process.argv.find((a) => a.startsWith('--runs='))?.split('=')[1] || '1');

// Provider config (resolved per-provider, per-case).
const QWEN_BASE_URL = process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const QWEN_MODEL = process.env.QWEN_MODEL || 'qwen3.6-plus';
const VOLCENGINE_BASE_URL = process.env.VOLCENGINE_BASE_URL || process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/plan/v3';
const VOLCENGINE_MODEL = process.env.VOLCENGINE_MODEL || process.env.ARK_MODEL || 'doubao-seed-2.1-turbo';

function readEnv(name, alts = []) {
  for (const k of [name, ...alts]) {
    const v = String(process.env[k] || '').trim();
    if (v) return v;
  }
  return '';
}

const QWEN_API_KEY = readEnv('QWEN_API_KEY');
const VOLCENGINE_API_KEY = readEnv('VOLCENGINE_API_KEY', ['ARK_API_KEY']);

// A2-spec §91: frozen prompt unchanged. A2-D uses a single
// semantic prompt template (per spec §48-§49 "Prompt Equality
// Principle") that approximates the Masterpiece analysis
// semantics from apps/cli/prompts/analysis/. The same template
// is used for all (Provider × Case) combinations.
const SYSTEM_PROMPT = [
  '你是 Masterpiece OS 视觉方案分析助手。基于给定的图片素材与项目事实，输出一份结构化的中文视觉分析报告。',
  '',
  '报告要求：',
  '1. 直接基于图片可见证据。不得虚构品牌事实、产品线、Logo 重构、活性成分或文案。',
  '2. 报告使用 markdown 格式，包含明确的章节标题。建议章节：',
  '   - ## 0. 项目事实与置信度',
  '   - ## 1. 关键视觉资产识别（Logo / Locked Asset / 其它）',
  '   - ## 2. 视觉系统提取（颜色 / 字体 / 构图 / 材料 / 跨触点一致性）',
  '   - ## 3. 设计决策与建议（Reference First / Space / Packaging 角度）',
  '   - ## 4. 限制与不确定性',
  '3. 用简体中文输出。',
  '4. 输出可直接被 Reference First / Generation planning 流程使用（结构化、可追溯、不需重写）。',
  '5. 多张图片输入时保持品牌分离；不同品牌不要混淆。',
].join('\n');

function caseContextBlock(c) {
  const lines = [];
  lines.push(`项目名称：${c.brandName}`);
  lines.push(`行业：${c.industry}`);
  lines.push(`品牌角色：${c.brandRole}`);
  if (Array.isArray(c.lockedAssetsInScope) && c.lockedAssetsInScope.length) {
    lines.push('约束（不可违反）：');
    for (const la of c.lockedAssetsInScope) {
      if (typeof la === 'string') {
        lines.push(`- ${la}`);
      } else if (la && typeof la === 'object') {
        if (la.project) {
          lines.push(`- [${la.project}] ${(la.assets || []).map((a) => a.value).join('; ')}`);
        } else {
          lines.push(`- [${la.type}] ${la.value}`);
        }
      }
    }
  }
  return lines.join('\n');
}

function specialInstructionsFor(c) {
  const notes = [];
  if (c.caseId === 'C06' && c.context) {
    notes.push('【Reference-heavy】本评估提供 2 张 reference 资产（[07] 与 [09]）。请将其作为品牌参考使用，并在分析中明确引用它们。referenceMode = reference_assisted, providerReferenceCount = 2。');
  }
  if (c.caseId === 'C07') {
    notes.push('【CONTROLLED_INCOMPLETE_SUBSET】本次输入是 3/10 子集（视觉项目 corpus 共有 10 张），不是完整项目。报告必须明确说明这一限制，不得从缺失的素材中虚构品牌事实。');
  }
  if (c.caseId === 'C03') {
    notes.push('【多品牌空间】本次输入涉及两个不同品牌的空间图。九州美学 ([07] [10] [14] [25]) + 一剂良方 ([16] [27])。请分别分析两个品牌的空间语言，输出两个独立分析，不要混淆。');
  }
  return notes.length ? '\n\n' + notes.join('\n\n') : '';
}

function buildUserPrompt(c) {
  return [
    caseContextBlock(c),
    '',
    '请分析以下图片素材（按给定顺序）。',
    specialInstructionsFor(c),
  ].join('\n');
}

function buildAttachments(c) {
  return c.inputAssets.map((a) => ({
    assetId: a.contactSheetNN ? `${c.caseId}-${a.contactSheetNN}` : `${c.caseId}-ref-${a.assetId.slice(0, 8)}`,
    mediaType: 'image',
    path: a.absolutePath,
    readable: true,
  }));
}

async function runProvider({ provider, reasoner, attachments, systemPrompt, userPrompt, signal }) {
  const reasonerFn = reasoner;
  const result = await reasonerFn({
    prompt: {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      attachments,
    },
    maximumDurationMs: 5 * 60 * 1000,
    signal,
  });
  return result;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeRunArtifacts({ caseId, provider, model, runIndex, prompt, attachments, result, error, elapsedMs, startedAt }) {
  const runId = `${caseId}-${provider}-${runIndex.toString().padStart(2, '0')}`;
  const dir = path.join(EVAL_DIR, caseId, provider);
  ensureDir(dir);
  const mdPath = path.join(dir, `${runId}.md`);
  const jsonPath = path.join(dir, `${runId}.json`);

  const record = {
    runId,
    runIndex,
    caseId,
    provider,
    model,
    startedAt,
    elapsedMs,
    attachments: attachments.map((a) => ({ assetId: a.assetId, absolutePath: a.path })),
    prompt: {
      systemSha256: sha256(systemPrompt),
      userSha256: sha256(userPrompt),
      systemChars: systemPrompt.length,
      userChars: userPrompt.length,
      attachmentCount: attachments.length,
    },
    result: result || null,
    error: error ? { code: error.code || null, message: String(error.message || error) } : null,
  };

  const md = result?.reportMarkdown
    ?? (error ? `# ${runId}\n\n[error] ${error.code || 'no-code'} ${error.message}\n` : `# ${runId}\n\n[no result]`);
  fs.writeFileSync(mdPath, md, 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify(record, null, 2), 'utf8');
  return { mdPath, jsonPath, record };
}

async function main() {
  if (!QWEN_API_KEY && !VOLCENGINE_API_KEY) {
    console.error('[a2-d] need at least one of QWEN_API_KEY or VOLCENGINE_API_KEY (or ARK_API_KEY)');
    process.exit(2);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  if (RUNS_PER_CASE < 1 || RUNS_PER_CASE > 3) {
    console.error('[a2-d] --runs must be 1, 2, or 3 (per A2 spec §50)');
    process.exit(2);
  }

  const matrixRows = [];
  const totals = { qwen: { ok: 0, fail: 0, latencyMs: 0 }, volcengine: { ok: 0, fail: 0, latencyMs: 0 } };
  const startedAtAll = new Date().toISOString();

  for (const c of manifest.cases) {
    const attachments = buildAttachments(c);
    const systemPrompt = SYSTEM_PROMPT;
    const userPrompt = buildUserPrompt(c);

    for (const provider of ['qwen', 'volcengine']) {
      const apiKey = provider === 'qwen' ? QWEN_API_KEY : VOLCENGINE_API_KEY;
      if (!apiKey) {
        console.log(`[a2-d] ${c.caseId} × ${provider}: SKIP (no API key)`);
        continue;
      }
      const cfg = provider === 'qwen'
        ? { apiKey: QWEN_API_KEY, model: QWEN_MODEL, baseUrl: QWEN_BASE_URL, reasonerFactory: createQwenReasoner }
        : { apiKey: VOLCENGINE_API_KEY, model: VOLCENGINE_MODEL, baseUrl: VOLCENGINE_BASE_URL, reasonerFactory: createVolcengineReasoner };
      const reasoner = cfg.reasonerFactory({ apiKey: cfg.apiKey, model: cfg.model, baseUrl: cfg.baseUrl });

      for (let runIndex = 1; runIndex <= RUNS_PER_CASE; runIndex += 1) {
        const startedAt = new Date().toISOString();
        const t0 = performance.now();
        console.log(`[a2-d] ${c.caseId} × ${provider} (run ${runIndex}/${RUNS_PER_CASE}, ${attachments.length} attachments): sending...`);
        let result = null;
        let error = null;
        try {
          result = await runProvider({
            provider,
            reasoner,
            attachments,
            systemPrompt,
            userPrompt,
            signal: AbortSignal.timeout(5 * 60 * 1000),
          });
        } catch (err) {
          error = err;
        }
        const elapsedMs = Math.round(performance.now() - t0);
        const artifacts = writeRunArtifacts({
          caseId: c.caseId,
          provider,
          model: cfg.model,
          runIndex,
          prompt: { system: systemPrompt, user: userPrompt },
          attachments,
          result,
          error,
          elapsedMs,
          startedAt,
        });
        const status = result ? 'ok' : 'error';
        matrixRows.push({
          caseId: c.caseId,
          category: c.category,
          projectName: c.projectName,
          provider,
          model: result?.model || cfg.model,
          runIndex,
          status,
          elapsedMs,
          runId: result?.runId || null,
          completedAt: result?.completedAt || null,
          inspectedAssetIds: result?.inspectedAssetIds || null,
          reportPath: artifacts.mdPath,
          jsonPath: artifacts.jsonPath,
          errorCode: error?.code || null,
          errorMessage: error ? String(error.message || error) : null,
        });
        if (status === 'ok') totals[provider].ok += 1;
        else totals[provider].fail += 1;
        totals[provider].latencyMs += elapsedMs;
        console.log(`[a2-d] ${c.caseId} × ${provider} (run ${runIndex}/${RUNS_PER_CASE}): ${status.toUpperCase()} (${elapsedMs} ms, model=${result?.model || cfg.model})`);
      }
    }
  }

  // Write structured matrix
  const matrixJson = path.join(EVAL_DIR, 'evaluation-matrix.json');
  ensureDir(EVAL_DIR);
  fs.writeFileSync(matrixJson, JSON.stringify({
    schemaVersion: '1.0',
    runBatchId: RUN_BATCH_ID,
    startedAt: startedAtAll,
    completedAt: new Date().toISOString(),
    runsPerCase: RUNS_PER_CASE,
    manifestHash: manifest.manifestHash,
    totals,
    rows: matrixRows,
  }, null, 2), 'utf8');

  // Write human-readable matrix doc
  const md = renderMatrixMd({ manifest, matrixRows, totals, startedAtAll, manifestHash: manifest.manifestHash });
  fs.writeFileSync(MATRIX_DOC, md, 'utf8');
  console.log(`[a2-d] matrix doc written to ${MATRIX_DOC}`);
  console.log(`[a2-d] structured matrix written to ${matrixJson}`);
  console.log(`[a2-d] done. totals: qwen=${totals.qwen.ok}ok/${totals.qwen.fail}fail volcengine=${totals.volcengine.ok}ok/${totals.volcengine.fail}fail`);
}

function renderMatrixMd({ manifest, matrixRows, totals, startedAtAll, manifestHash }) {
  const out = [];
  out.push('# A2 Evaluation Matrix');
  out.push('');
  out.push(`**Status:** ${totals.qwen.fail + totals.volcengine.fail === 0 ? 'RUN COMPLETE — all ok' : 'RUN COMPLETE — see failures'}`);
  out.push(`**Run batch id:** \`${RUN_BATCH_ID}\``);
  out.push(`**Started at:** ${startedAtAll}`);
  out.push(`**Completed at:** ${new Date().toISOString()}`);
  out.push(`**Manifest hash:** \`${manifestHash}\``);
  out.push(`**Runs per case:** ${RUNS_PER_CASE}`);
  out.push('');
  out.push('## Per-run results');
  out.push('');
  out.push('| Case | Category | Project | Provider | Run | Status | Latency (ms) | Model returned |');
  out.push('|---|---|---|---|---|---|---|---|');
  for (const r of matrixRows) {
    out.push(`| ${r.caseId} | ${r.category} | ${r.projectName} | ${r.provider} | ${r.runIndex} | ${r.status} | ${r.elapsedMs} | ${r.model || ''} |`);
  }
  out.push('');
  out.push('## Totals');
  out.push('');
  out.push('| Provider | OK | FAIL | Total latency (ms) |');
  out.push('|---|---|---|---|');
  out.push(`| qwen | ${totals.qwen.ok} | ${totals.qwen.fail} | ${totals.qwen.latencyMs} |`);
  out.push(`| volcengine | ${totals.volcengine.ok} | ${totals.volcengine.fail} | ${totals.volcengine.latencyMs} |`);
  out.push('');
  out.push('## Raw output locations');
  out.push('');
  for (const r of matrixRows) {
    out.push(`- ${r.caseId} × ${r.provider} (run ${r.runIndex}): ${path.relative(REPO, r.reportPath)}`);
  }
  out.push('');
  out.push('## Notes');
  out.push('');
  out.push('- All runs use the same semantic prompt (A2 spec §48-§49).');
  out.push('- Per-run raw markdown is preserved untouched (A2 spec §111).');
  out.push('- Provider identity is NOT blinded in this output (blinding happens in A2-F human review).');
  out.push('- Run batch id `' + RUN_BATCH_ID + '` is the single source of truth for which runs belong to this A2-D evaluation.');
  return out.join('\n');
}

main().catch((err) => {
  console.error('[a2-d] FAIL', err);
  process.exit(1);
});
