#!/usr/bin/env node
// Visual Analysis A2-B.2 — Volcengine / Ark capability probe (real Provider smoke).
//
// Manual / opt-in / networked / cost-sensitive. Per A2 spec §20 and §21:
//   - Requires the VOLCENGINE_API_KEY env var. Without it, exits 2.
//   - Never enters repo:verify or default CI. `npm test`, `repo:verify`,
//     `web:smoke`, and `golden:test` do not invoke this script.
//   - Reads the configured Volcengine analysis profile from the
//     local settings.json (plain JSON, no decryption required).
//   - Sends 4 minimal multimodal requests: vision / multi-image /
//     structured output / context introspection.
//   - Writes a markdown report to
//     docs/visual-analysis/A2-volcengine-probe-report.md
//     (overwrites any prior report).
//
// Invocation (manual):
//   VOLCENGINE_API_KEY=<key> node scripts/visual-analysis-probe-volcengine.mjs
//   VOLCENGINE_API_KEY=<key> npm run visual-analysis:probe-volcengine
//
// The 4 probes:
//   1. Vision:           1 generated 256x256 PNG, ask for a one-line description.
//   2. Multi-image:      2 generated 256x256 PNGs (different gradients), ask for
//                        a one-line comparison.
//   3. Structured:       1 generated 256x256 PNG, response_format=json_schema
//                        (a small { description: string } schema), parse result.
//   4. Context summary:  from probe 1, record the model identity returned by
//                        the upstream; mark Context as UNKNOWN (no usage block
//                        is exposed by the Volcengine reasoner today; this
//                        is recorded honestly in the report).

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { createVolcengineAnalysisProvider } from '../packages/model-runtime/src/volcengine-analysis-provider.js';
import { createDefaultAnalysisProviderRegistry } from '../packages/model-runtime/src/analysis-provider-registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function defaultUserData() {
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming'), 'masterpiece-os-desktop');
  }
  if (process.platform === 'darwin') return path.join(process.env.HOME || '', 'Library', 'Application Support', 'masterpiece-os-desktop');
  return path.join(process.env.XDG_CONFIG_HOME || path.join(process.env.HOME || '', '.config'), 'masterpiece-os-desktop');
}

const userData = process.env.MASTERPIECE_USER_DATA_DIR || defaultUserData();
const settingsPath = path.join(userData, 'settings.json');
const reportPath = path.join(repoRoot, 'docs', 'visual-analysis', 'A2-volcengine-probe-report.md');
const fixturesDir = path.join(repoRoot, '.codex-smoke', 'a2-volcengine-probe-fixtures');

const apiKey = String(process.env.VOLCENGINE_API_KEY || '').trim();

if (!apiKey) {
  console.error('[a2-probe] VOLCENGINE_API_KEY env var is required.');
  console.error('[a2-probe] Set it before invocation; this script is opt-in only.');
  process.exit(2);
}

if (!readFileSync && false) { /* keep import for symmetry */ }

const settingsRaw = readFileSync(settingsPath, 'utf8');
const settings = JSON.parse(settingsRaw);
const profile = (settings.profiles || []).find((p) => String(p.provider || '').trim() === 'volcengine'
  && String(p.modelType || '').trim() === 'analysis');

if (!profile) {
  console.error(`[a2-probe] No Volcengine analysis profile found in ${settingsPath}.`);
  process.exit(2);
}

console.log(`[a2-probe] Using profile: ${profile.displayName} (${profile.id})`);
console.log(`[a2-probe] Base URL: ${profile.baseUrl}`);
console.log(`[a2-probe] Model:    ${profile.modelId}`);

mkdirSync(fixturesDir, { recursive: true });

async function buildGradientPng(label, topColor, bottomColor) {
  const width = 256;
  const height = 256;
  const top = topColor;
  const bottom = bottomColor;
  const channels = 3;
  const data = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y += 1) {
    const t = y / (height - 1);
    for (let c = 0; c < channels; c += 1) {
      const value = Math.round(top[c] * (1 - t) + bottom[c] * t);
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * channels + c;
        data[offset] = value;
      }
    }
  }
  const pngPath = path.join(fixturesDir, `${label}.png`);
  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(pngPath);
  return pngPath;
}

const imageA = await buildGradientPng('a', [255, 0, 0], [0, 0, 255]);
const imageB = await buildGradientPng('b', [0, 255, 0], [255, 255, 0]);

function readablePngAttachment(label, filePath) {
  return {
    assetId: label,
    mediaType: 'image',
    path: filePath,
    readable: true,
  };
}

const provider = createVolcengineAnalysisProvider();
const reasoner = provider.createReasoner({
  apiKey,
  model: profile.modelId,
  baseUrl: profile.baseUrl,
});

const probes = [
  {
    name: 'vision',
    label: 'Probe 1: Vision input (1 image, free text)',
    buildContext: () => ({
      prompt: {
        messages: [
          { role: 'system', content: '你只回复一行中文。' },
          { role: 'user', content: '用一句中文描述这张图的颜色和构图。' },
        ],
        attachments: [readablePngAttachment('a', imageA)],
      },
      maximumDurationMs: 60_000,
    }),
  },
  {
    name: 'multi-image',
    label: 'Probe 2: Multi-image (2 images, free text)',
    buildContext: () => ({
      prompt: {
        messages: [
          { role: 'system', content: '你只回复一行中文。' },
          { role: 'user', content: '用一句中文比较这两张图的主要色相差异。' },
        ],
        attachments: [readablePngAttachment('a', imageA), readablePngAttachment('b', imageB)],
      },
      maximumDurationMs: 60_000,
    }),
  },
  {
    name: 'structured',
    label: 'Probe 3: Structured output (1 image + JSON Schema)',
    buildContext: () => ({
      prompt: {
        messages: [
          { role: 'system', content: '你必须按照用户给定的 JSON Schema 输出。' },
          { role: 'user', content: '描述这张图的主要颜色梯度。' },
        ],
        attachments: [readablePngAttachment('a', imageA)],
      },
      responseSchema: {
        type: 'object',
        required: ['description'],
        properties: { description: { type: 'string' } },
      },
      responseSchemaName: 'image_gradient_description',
      maximumDurationMs: 60_000,
    }),
  },
];

const results = [];
for (const probe of probes) {
  const start = Date.now();
  try {
    const result = await reasoner(probe.buildContext());
    const elapsedMs = Date.now() - start;
    results.push({
      probe: probe.name,
      label: probe.label,
      status: 'success',
      elapsedMs,
      model: result.model,
      provider: result.provider,
      runId: result.runId,
      inspectedAssetIds: result.inspectedAssetIds,
      reportMarkdown: result.reportMarkdown,
      parsedJson: probe.name === 'structured' ? safeParse(result.reportMarkdown) : null,
    });
    console.log(`[a2-probe] ${probe.label}: PASS (${elapsedMs} ms, model=${result.model})`);
  } catch (error) {
    const elapsedMs = Date.now() - start;
    results.push({
      probe: probe.name,
      label: probe.label,
      status: 'error',
      elapsedMs,
      errorCode: error.code || null,
      errorMessage: String(error.message || error),
    });
    console.log(`[a2-probe] ${probe.label}: FAIL (${elapsedMs} ms, ${error.code || 'no-code'} ${error.message})`);
  }
}

function safeParse(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  const stripped = text.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '');
  try { return JSON.parse(stripped); } catch { return null; }
}

const vision = results.find((r) => r.probe === 'vision');
const multiImage = results.find((r) => r.probe === 'multi-image');
const structured = results.find((r) => r.probe === 'structured');

const capability = {
  vision: vision?.status === 'success' && Boolean(vision?.reportMarkdown?.length) ? 'PASS' : 'FAIL',
  multiImage: multiImage?.status === 'success' && Boolean(multiImage?.reportMarkdown?.length) ? 'PASS' : 'FAIL',
  structured: structured?.status === 'success' && structured?.parsedJson && typeof structured.parsedJson.description === 'string' ? 'PASS' : 'FAIL',
  context: 'UNKNOWN', // reasoner does not surface usage; honest record.
};

const reportTimestamp = new Date().toISOString();
const reportLines = [];
reportLines.push('# A2-B.2 Volcengine Capability Probe Report');
reportLines.push('');
reportLines.push(`**Date:** ${reportTimestamp}`);
reportLines.push(`**Source script:** scripts/visual-analysis-probe-volcengine.mjs`);
reportLines.push(`**Profile:** \`${profile.displayName}\` (\`${profile.id}\`)`);
reportLines.push(`**Provider:** \`${profile.provider}\``);
reportLines.push(`**Model:** \`${profile.modelId}\``);
reportLines.push(`**Base URL:** \`${profile.baseUrl}\``);
reportLines.push(`**Settings path:** \`${settingsPath}\``);
reportLines.push('');
reportLines.push('## Capability summary');
reportLines.push('');
reportLines.push('| Capability | Result | Notes |');
reportLines.push('|---|---|---|');
reportLines.push(`| Vision input (1 image) | ${capability.vision} | free text prompt, 60 s budget |`);
reportLines.push(`| Multi-image (2 images) | ${capability.multiImage} | free text prompt, 60 s budget |`);
reportLines.push(`| Structured output (JSON Schema) | ${capability.structured} | schema={description: string} |`);
reportLines.push(`| Context / usage introspection | ${capability.context} | reasoner does not surface usage; record as UNKNOWN |`);
reportLines.push('');
reportLines.push('## Per-probe detail');
reportLines.push('');
for (const r of results) {
  reportLines.push(`### ${r.label}`);
  reportLines.push('');
  reportLines.push(`- status: \`${r.status}\``);
  reportLines.push(`- elapsedMs: \`${r.elapsedMs}\``);
  if (r.status === 'success') {
    reportLines.push(`- provider: \`${r.provider}\``);
    reportLines.push(`- model (returned): \`${r.model}\``);
    reportLines.push(`- runId: \`${r.runId}\``);
    reportLines.push(`- inspectedAssetIds: ${JSON.stringify(r.inspectedAssetIds)}`);
    reportLines.push(`- reportMarkdown (first 240 chars):`);
    reportLines.push('');
    reportLines.push('```markdown');
    reportLines.push(String(r.reportMarkdown || '').slice(0, 240));
    reportLines.push('```');
    if (r.probe === 'structured') {
      reportLines.push('');
      reportLines.push(`- parsedJson: \`${JSON.stringify(r.parsedJson)}\``);
    }
  } else {
    reportLines.push(`- error.code: \`${r.errorCode}\``);
    reportLines.push(`- error.message: \`${r.errorMessage}\``);
  }
  reportLines.push('');
}
reportLines.push('## A2-A discovery table update');
reportLines.push('');
reportLines.push('Per A2-A, Candidate A had `UNKNOWN` cells for vision / multi-image');
reportLines.push('/ structured / context. The results above resolve them as follows:');
reportLines.push('');
reportLines.push('| Capability | Before probe | After probe |');
reportLines.push('|---|---|---|');
reportLines.push(`| Vision input (1 image) | UNKNOWN | ${capability.vision} |`);
reportLines.push(`| Multi-image (2 images) | UNKNOWN | ${capability.multiImage} |`);
reportLines.push(`| Structured output | UNKNOWN | ${capability.structured} |`);
reportLines.push(`| Context / usage | UNKNOWN | ${capability.context} |`);
reportLines.push('');
reportLines.push('## Caveats');
reportLines.push('');
reportLines.push('- The probe is manual / opt-in / networked / cost-sensitive');
reportLines.push('  (A2 spec §20). It is not part of `repo:verify` or default CI');
reportLines.push('  (A2 spec §21 and §105).');
reportLines.push('- The probe uses two 256x256 gradient PNGs generated into');
reportLines.push(`  \`${fixturesDir}\`. They are not committed.`);
reportLines.push('- The API key is supplied only through the');
reportLines.push('  `VOLCENGINE_API_KEY` env var and is never written to disk.');
reportLines.push('- The result of probe 4 (context) is recorded as UNKNOWN');
reportLines.push('  because the Volcengine reasoner does not surface usage');
reportLines.push('  blocks; populating this cell requires a reasoner change');
reportLines.push('  (out of A2-B.2 scope).');
reportLines.push('- A successful Vision / Multi-image / Structured run means');
reportLines.push('  the configured Profile reaches the upstream and the');
reportLines.push('  canonical Analysis Provider result contract is honored;');
reportLines.push('  it does not certify visual analysis quality — that is');
reportLines.push('  A2-D / A2-F / A2-G work.');
reportLines.push('');

writeFileSync(reportPath, reportLines.join('\n'), 'utf8');
console.log(`[a2-probe] Report written to ${reportPath}`);

try { rmSync(fixturesDir, { recursive: true, force: true }); } catch { /* best-effort */ }
