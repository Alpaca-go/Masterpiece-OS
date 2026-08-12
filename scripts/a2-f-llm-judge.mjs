// A2-F LLM Judge — secondary evidence pass.
//
// Opt-in only. Per A2 spec §63, the LLM Judge output is
// secondary evidence; it does not override the human review
// scorecard. Per A2 spec §20, this script is manual / opt-in
// / networked / cost-sensitive; per A2 spec §21 and §105, it
// is NEVER invoked by `repo:verify` or default CI.
//
// Invocation (PowerShell):
//   $env:QWEN_API_KEY='sk-...'
//   npm run a2-f:llm-judge
//
// Or with the Volcengine reasoner:
//   $env:VOLCENGINE_API_KEY='ark-...'
//   npm run a2-f:llm-judge -- --provider=volcengine
//
// Output:
//   - docs/visual-analysis/evaluation/llm-judge/{caseId}/{provider}/judge-01.md
//   - docs/visual-analysis/evaluation/llm-judge/{caseId}/{provider}/judge-01.json
//   - docs/visual-analysis/evaluation/llm-judge-scores.json (aggregate)
//
// The LLM Judge receives the original raw output and the frozen
// A2-evaluation-rubric.md dimensions, and is asked to score
// 1-5 on each dimension. The Judge is NOT told which Provider
// produced the original output (blind review, A2 spec §112).

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { createQwenReasoner } from '../packages/model-runtime/src/qwen-reasoner.js';
import { createVolcengineReasoner } from '../packages/model-runtime/src/volcengine-reasoner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO = path.resolve(__dirname, '..');

const EVAL_DIR = path.join(REPO, 'docs', 'visual-analysis', 'evaluation');
const JUDGE_DIR = path.join(EVAL_DIR, 'llm-judge');
const SCORE_FILE = path.join(EVAL_DIR, 'llm-judge-scores.json');

const providerArg = process.argv.find((a) => a.startsWith('--provider='))?.split('=')[1] || 'qwen';

function readEnv(name, alts = []) {
  for (const k of [name, ...alts]) {
    const v = String(process.env[k] || '').trim();
    if (v) return v;
  }
  return '';
}

const QWEN_API_KEY = readEnv('QWEN_API_KEY');
const VOLCENGINE_API_KEY = readEnv('VOLCENGINE_API_KEY', ['ARK_API_KEY']);

const QWEN_BASE_URL = process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const QWEN_MODEL = process.env.QWEN_MODEL || 'qwen3.6-plus';
const VOLCENGINE_BASE_URL = process.env.VOLCENGINE_BASE_URL || process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/plan/v3';
const VOLCENGINE_MODEL = process.env.VOLCENGINE_MODEL || process.env.ARK_MODEL || 'doubao-seed-2.1-turbo';

const RUBRIC_DIMENSIONS = [
  { key: 'visualUnderstanding', name: 'Visual Understanding', weight: 15 },
  { key: 'brandLockedAssetFidelity', name: 'Brand / Locked Asset Fidelity', weight: 15 },
  { key: 'designSystemExtraction', name: 'Design-System Extraction', weight: 15 },
  { key: 'creativeReasoning', name: 'Creative Reasoning', weight: 10 },
  { key: 'decisionUsefulness', name: 'Decision Usefulness', weight: 15 },
  { key: 'evidenceGrounding', name: 'Evidence Grounding', weight: 10 },
  { key: 'hallucinationControl', name: 'Hallucination Control', weight: 10 },
  { key: 'crossImageConsistency', name: 'Cross-Image Consistency', weight: 5 },
  { key: 'reportStructureCompliance', name: 'Report Structure Compliance', weight: 2.5 },
  { key: 'downstreamUsability', name: 'Downstream Usability', weight: 2.5 },
];

const JUDGE_SYSTEM_PROMPT = [
  'You are an LLM Judge for the Masterpiece OS A2 Visual Analysis evaluation. You receive one candidate Visual Analysis output and score it 1-5 on each of the 10 rubric dimensions.',
  '',
  'Rules:',
  '- Score each dimension 1-5 (integer; no half points) per the rubric scale (1=unusable, 2=weak, 3=usable w/ correction, 4=strong, 5=excellent).',
  '- Do NOT add your own analysis; only score the candidate output.',
  '- Return JSON with one integer per dimension key. No prose.',
  '- Use the dimension keys exactly as listed: ' + RUBRIC_DIMENSIONS.map((d) => d.key).join(', ') + '.',
  '',
  'JSON shape:',
  '{',
  '  "visualUnderstanding": <int 1-5>,',
  '  "brandLockedAssetFidelity": <int 1-5>,',
  '  ...',
  '  "hardFailure": <bool — true if Locked Asset / Brand / Output contract / Downstream / Wrong category is observed>',
  '  "hardFailureReason": <string or null>',
  '  "reviewerNote": <one short sentence>',
  '}',
].join('\n');

function buildJudgeUserPrompt({ caseId, category, originalOutput, originalRunId }) {
  return [
    `Case: ${caseId} (${category})`,
    `Original run id: ${originalRunId}`,
    '',
    '--- Original candidate output (verbatim) ---',
    String(originalOutput || '').slice(0, 28000), // bound input to 28k chars; LLM judge reads from a single text block
    '--- End original candidate output ---',
    '',
    'Score per the 10 dimensions above. Return JSON only.',
  ].join('\n');
}

function safeParseJsonFromText(text) {
  if (typeof text !== 'string') return null;
  const stripped = text.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '');
  try { return JSON.parse(stripped); } catch { return null; }
}

function readRawOutputs() {
  const cases = {};
  for (const d of fs.readdirSync(EVAL_DIR, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const caseId = d.name;
    if (!/^C\d{2}$/u.test(caseId)) continue;
    cases[caseId] = {};
    for (const sub of fs.readdirSync(path.join(EVAL_DIR, caseId), { withFileTypes: true })) {
      if (!sub.isDirectory()) continue;
      const provider = sub.name;
      const mdFiles = fs.readdirSync(path.join(EVAL_DIR, caseId, provider))
        .filter((f) => f.endsWith('.md'))
        .sort();
      cases[caseId][provider] = mdFiles.map((f) => ({
        runId: f.replace(/\.md$/u, ''),
        file: path.join(EVAL_DIR, caseId, provider, f),
      }));
    }
  }
  return cases;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function main() {
  const apiKey = providerArg === 'qwen' ? QWEN_API_KEY : VOLCENGINE_API_KEY;
  if (!apiKey) {
    console.error(`[a2-f-judge] need ${providerArg.toUpperCase()}_API_KEY (or ARK_API_KEY for volcengine)`);
    process.exit(2);
  }
  const reasoner = providerArg === 'qwen'
    ? createQwenReasoner({ apiKey, model: QWEN_MODEL, baseUrl: QWEN_BASE_URL })
    : createVolcengineReasoner({ apiKey, model: VOLCENGINE_MODEL, baseUrl: VOLCENGINE_BASE_URL });

  const manifest = readRawOutputs();
  const scores = [];
  for (const [caseId, providers] of Object.entries(manifest).sort()) {
    for (const [provider, runs] of Object.entries(providers).sort()) {
      for (const run of runs) {
        const original = fs.readFileSync(run.file, 'utf8');
        const originalJson = JSON.parse(fs.readFileSync(run.file.replace(/\.md$/u, '.json'), 'utf8'));
        const userPrompt = buildJudgeUserPrompt({
          caseId,
          category: originalJson.caseId === caseId ? 'unknown' : originalJson.caseId, // category is in manifest; we keep it simple here
          originalOutput: original,
          originalRunId: originalJson.runId,
        });
        const t0 = performance.now();
        let result = null;
        let error = null;
        try {
          result = await reasoner({
            prompt: {
              messages: [
                { role: 'system', content: JUDGE_SYSTEM_PROMPT },
                { role: 'user', content: userPrompt },
              ],
              attachments: [],
            },
            responseSchema: {
              type: 'object',
              required: ['visualUnderstanding', 'brandLockedAssetFidelity', 'designSystemExtraction', 'creativeReasoning', 'decisionUsefulness', 'evidenceGrounding', 'hallucinationControl', 'crossImageConsistency', 'reportStructureCompliance', 'downstreamUsability', 'hardFailure', 'hardFailureReason', 'reviewerNote'],
              properties: {
                visualUnderstanding: { type: 'integer' },
                brandLockedAssetFidelity: { type: 'integer' },
                designSystemExtraction: { type: 'integer' },
                creativeReasoning: { type: 'integer' },
                decisionUsefulness: { type: 'integer' },
                evidenceGrounding: { type: 'integer' },
                hallucinationControl: { type: 'integer' },
                crossImageConsistency: { type: 'integer' },
                reportStructureCompliance: { type: 'integer' },
                downstreamUsability: { type: 'integer' },
                hardFailure: { type: 'boolean' },
                hardFailureReason: { type: 'string' },
                reviewerNote: { type: 'string' },
              },
            },
            responseSchemaName: 'a2_f_judge',
            maximumDurationMs: 5 * 60 * 1000,
          });
        } catch (err) {
          error = err;
        }
        const elapsedMs = Math.round(performance.now() - t0);
        const parsed = result ? safeParseJsonFromText(result.reportMarkdown) : null;
        const judgeDir = path.join(JUDGE_DIR, caseId, provider);
        fs.mkdirSync(judgeDir, { recursive: true });
        const judgeFile = path.join(judgeDir, `${run.runId}-judge-01.md`);
        const judgeJson = path.join(judgeDir, `${run.runId}-judge-01.json`);
        const record = {
          caseId,
          provider,
          runId: run.runId,
          originalRunId: originalJson.runId,
          judgeModel: result?.model || (providerArg === 'qwen' ? QWEN_MODEL : VOLCENGINE_MODEL),
          elapsedMs,
          scores: parsed || null,
          judgePromptSha256: sha256(JUDGE_SYSTEM_PROMPT + '\n' + userPrompt),
          judgeOutputSha256: result ? sha256(result.reportMarkdown) : null,
          error: error ? { code: error.code || null, message: String(error.message || error) } : null,
        };
        fs.writeFileSync(judgeFile, result?.reportMarkdown || `[error] ${error?.code || 'no-code'} ${error?.message || ''}`, 'utf8');
        fs.writeFileSync(judgeJson, JSON.stringify(record, null, 2), 'utf8');
        scores.push(record);
        console.log(`[a2-f-judge] ${caseId} × ${provider} (${run.runId}): ${parsed ? 'ok' : 'error'} (${elapsedMs} ms)`);
      }
    }
  }

  fs.writeFileSync(SCORE_FILE, JSON.stringify({
    schemaVersion: '1.0',
    judgeProvider: providerArg,
    judgeModelResolved: scores.find((s) => s.judgeModel)?.judgeModel || null,
    scoredAt: new Date().toISOString(),
    runBatch: '2026-08-12T09-30-05-859Z',
    scores,
  }, null, 2), 'utf8');
  console.log(`[a2-f-judge] scorecard written to ${SCORE_FILE}`);
}

main().catch((err) => {
  console.error('[a2-f-judge] FAIL', err);
  process.exit(1);
});
