// A2-F Blind Review Bundle builder.
//
// One-shot, no LLM calls (per user direction "不要让 LLM 预评分").
// Reads the A2-D raw outputs, randomly assigns Result A / B per
// case (using a per-case deterministic random so the assignment
// is reproducible from the caseId alone), generates 14 directly
// fillable scorecards + blinded raw-output copies + a single
// mapping file (marked DO NOT OPEN UNTIL DONE), and writes a
// README that explains the procedure and what NOT to open.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO = path.resolve(__dirname, '..');

const EVAL_DIR = path.join(REPO, 'docs', 'visual-analysis', 'evaluation');
const BUNDLE_DIR = path.join(REPO, 'docs', 'visual-analysis', 'human-review');
const BLINDED_DIR = path.join(BUNDLE_DIR, 'blinded');
const MAPPING_FILE = path.join(BUNDLE_DIR, '_MAPPING_DO_NOT_OPEN_UNTIL_DONE.md');
const README_FILE = path.join(BUNDLE_DIR, 'README.md');
const ALL_FILE = path.join(BUNDLE_DIR, 'scorecards-all.md');

const CASES = [
  { caseId: 'C01', category: 'Brand VI', project: '一剂良方-a13d6c09' },
  { caseId: 'C02', category: 'Packaging / Physical Application', project: '九州美学-590eadf2' },
  { caseId: 'C03', category: 'Space / Environment', project: '九州美学-590eadf2 + 一剂良方-a13d6c09' },
  { caseId: 'C04', category: 'Poster / Campaign', project: '视觉项目-20260728-002711-dca9b7d4' },
  { caseId: 'C05', category: 'Mixed Visual System', project: '九州美学-590eadf2' },
  { caseId: 'C06', category: 'Reference-heavy', project: '九州美学-590eadf2' },
  { caseId: 'C07', category: 'Weak / Incomplete Input', project: '视觉项目-20260728-002711-dca9b7d4' },
];

const RUBRIC = [
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

const RUBRIC_HASH = 'f57da490dcb31f99f07142aaa3b3fc9a2bd2be0d3a5b849e872adb117100cdaa';
const RUBRIC_FROZEN_AT = '2026-08-12T17:14:44+08:00';

function pickRandomA(caseId) {
  // Per-case deterministic random based on the caseId hash.
  // Reproducible from the caseId alone.
  let h = 0;
  for (let i = 0; i < caseId.length; i += 1) h = ((h << 5) - h + caseId.charCodeAt(i)) | 0;
  return (h & 1) === 0 ? 'qwen' : 'volcengine';
}

function findOriginal(caseId, provider) {
  const dir = path.join(EVAL_DIR, caseId, provider);
  if (!fs.existsSync(dir)) throw new Error(`missing eval dir: ${dir}`);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
  if (files.length !== 1) throw new Error(`expected exactly 1 .md in ${dir}, got ${files.length}`);
  return {
    md: path.join(dir, files[0]),
    json: path.join(dir, files[0].replace(/\.md$/u, '.json')),
  };
}

function renderScorecard({ caseId, category, project, resultLabel, blindedRawPath, providerIsRevealed }) {
  const lines = [];
  lines.push(`# Scorecard — Case ${caseId} — Result ${resultLabel}`);
  lines.push('');
  lines.push(`**Case:** ${caseId} — ${category} (${project})`);
  lines.push(`**Result label:** ${resultLabel} (one of the two candidate providers; provider/model identity NOT disclosed in this scorecard)`);
  lines.push(`**Raw output to read:** \`${blindedRawPath}\``);
  lines.push('');
  lines.push(`**Rubric (frozen at ${RUBRIC_FROZEN_AT}, manifest hash \`${RUBRIC_HASH}\`):**`);
  lines.push('');
  lines.push('| # | Dimension | Weight | Score (1–5) | Notes |');
  lines.push('|---:|---|---:|---:|---|');
  for (let i = 0; i < RUBRIC.length; i += 1) {
    const d = RUBRIC[i];
    lines.push(`| ${i + 1} | ${d.name} | ${d.weight} | _ | |`);
  }
  lines.push(`| | **Weighted total** | 100 | _ (compute: Σ score × weight ÷ 100) | |`);
  lines.push('');
  lines.push('**Hard-fail overrides** (any of these = case FAIL regardless of total; per A2-evaluation-rubric.md §4):');
  lines.push('');
  lines.push('- [ ] Locked Asset materially wrong (Logo redrawn / decomposed / inner glyphs altered)');
  lines.push('- [ ] Brand identity hallucinated (brand name or product line not present in input)');
  lines.push('- [ ] Output contract invalid (canonical Analysis Provider result not parseable / required fields missing)');
  lines.push('- [ ] Analysis unusable downstream (cannot be passed to Reference First / Generation planning without a full rewrite)');
  lines.push('- [ ] Wrong project / category understanding');
  lines.push('');
  lines.push('**Reviewer notes** (free form, plain text):');
  lines.push('');
  lines.push('- Major Errors:');
  lines.push('- Best Insight:');
  lines.push('- Notes:');
  lines.push('');
  if (providerIsRevealed) {
    lines.push('**PROVIDER REVEALED:** (scoring complete; this scorecard is no longer blinded)');
    lines.push('');
  }
  return lines.join('\n');
}

function renderMapping(assignments) {
  const lines = [];
  lines.push('# MAPPING — DO NOT OPEN UNTIL SCORING IS COMPLETE');
  lines.push('');
  lines.push('**Status:** BLINDED. Do not consult this file during the scoring pass. Reveal only after every score is recorded.');
  lines.push('');
  lines.push('A2-D run batch: `2026-08-12T09-30-05-859Z`');
  lines.push('Manifest hash: `f57da490dcb31f99f07142aaa3b3fc9a2bd2be0d3a5b849e872adb117100cdaa`');
  lines.push('');
  lines.push('## Provider ↔ Result mapping (per case)');
  lines.push('');
  lines.push('| Case | Result A | Result B |');
  lines.push('|---|---|---|');
  for (const a of assignments) {
    const aIs = a.resultA === 'qwen' ? 'qwen (model: qwen3.6-plus)' : 'volcengine (model: doubao-seed-2-1-turbo-260628)';
    const bIs = a.resultB === 'qwen' ? 'qwen (model: qwen3.6-plus)' : 'volcengine (model: doubao-seed-2-1-turbo-260628)';
    lines.push(`| ${a.caseId} | **Result A = ${aIs}** | **Result B = ${bIs}** |`);
  }
  lines.push('');
  lines.push('## Reproducibility');
  lines.push('');
  lines.push('The per-case assignment is computed as:');
  lines.push('');
  lines.push('```js');
  lines.push('function pickRandomA(caseId) {');
  lines.push('  let h = 0;');
  lines.push('  for (let i = 0; i < caseId.length; i += 1) h = ((h << 5) - h + caseId.charCodeAt(i)) | 0;');
  lines.push('  return (h & 1) === 0 ? "qwen" : "volcengine";');
  lines.push('}');
  lines.push('```');
  lines.push('');
  lines.push('Deterministic from caseId alone; no random seed required.');
  lines.push('');
  lines.push('## After scoring');
  lines.push('');
  lines.push('Once all 14 scorecards are recorded, read this file to learn the mapping, then transfer the scores into `A2-human-review-sheet.md` §3.1 and the per-case notes §5.');
  return lines.join('\n');
}

function renderReadme(assignments) {
  const lines = [];
  lines.push('# A2-F Blind Review Bundle — README');
  lines.push('');
  lines.push('**Phase:** Visual Analysis A2 — Human Visual Review (A2-F)');
  lines.push('**Date:** 2026-08-12');
  lines.push('**Status:** `A2_F_BUNDLE_READY` (human scoring pending)');
  lines.push('**A2-D run batch:** `2026-08-12T09-30-05-859Z`');
  lines.push('**Manifest hash:** `f57da490dcb31f99f07142aaa3b3fc9a2bd2be0d3a5b849e872adb117100cdaa`');
  lines.push('**Rubric frozen at:** `2026-08-12T17:14:44+08:00`');
  lines.push('');
  lines.push('## 1. What is in this folder');
  lines.push('');
  lines.push('```');
  lines.push('human-review/');
  lines.push('├── README.md                                (this file)');
  lines.push('├── C01-A.md … C07-B.md                       (14 scorecards, 2 per case)');
  lines.push('├── scorecards-all.md                        (all 14 scorecards in one file)');
  lines.push('├── blinded/');
  lines.push('│   ├── C01-A.md … C07-B.md                  (14 blinded raw output copies)');
  lines.push('└── _MAPPING_DO_NOT_OPEN_UNTIL_DONE.md        (provider ↔ Result A/B mapping)');
  lines.push('```');
  lines.push('');
  lines.push('## 2. Blinding protocol');
  lines.push('');
  lines.push('Per A2 spec §112:');
  lines.push('');
  lines.push('- The 14 raw outputs in `docs/visual-analysis/evaluation/{caseId}/{provider}/`');
  lines.push('  contain the provider name (`qwen` / `volcengine`) in the file path and');
  lines.push('  the model name in the body. **Do not open any of those files during');
  lines.push('  scoring.** Read only the blinded copies under `blinded/C0X-{A,B}.md`.');
  lines.push('- Do NOT open `_MAPPING_DO_NOT_OPEN_UNTIL_DONE.md` until all 14');
  lines.push('  scorecards are recorded.');
  lines.push('- Do NOT run `scripts/a2-f-llm-judge.mjs` (this is the LLM Judge');
  lines.push('  secondary-evidence pass; explicitly NOT authorized for this round).');
  lines.push('');
  lines.push('## 3. How to score');
  lines.push('');
  lines.push('For each of the 14 scorecards (C01-A, C01-B, ..., C07-B):');
  lines.push('');
  lines.push('1. Open the matching raw output: `blinded/C0X-A.md` or `blinded/C0X-B.md`.');
  lines.push('2. Read the rubric dimensions (the table in the scorecard).');
  lines.push('3. For each of the 10 dimensions, write a score 1–5 in the "Score" column.');
  lines.push('4. Compute the weighted total: Σ (score × weight) ÷ 100.');
  lines.push('5. Tick any hard-fail override (case = FAIL regardless of total).');
  lines.push('6. Fill the "Reviewer notes" free-form section.');
  lines.push('');
  lines.push('Do NOT modify the rubric. Do NOT adjust weights. Do NOT consult');
  lines.push('the mapping. Do NOT open the original `evaluation/{caseId}/{provider}/`');
  lines.push('paths during scoring.');
  lines.push('');
  lines.push('## 4. After all 14 are recorded');
  lines.push('');
  lines.push('1. Open `_MAPPING_DO_NOT_OPEN_UNTIL_DONE.md` to learn the mapping.');
  lines.push('2. Transfer scores + per-case notes into');
  lines.push('   `docs/visual-analysis/A2-human-review-sheet.md` §3.1 + §5.');
  lines.push('3. Fill `docs/visual-analysis/A2-model-character-profiles.md` for both providers.');
  lines.push('4. A2-G (Production Model Decision) is the next batch.');
  lines.push('');
  lines.push('## 5. Per-case blinding assignments (file naming only; the model/Provider identity is in the MAPPING file and is NOT to be consulted during scoring)');
  lines.push('');
  lines.push('| Case | Result A | Result B |');
  lines.push('|---|---|---|');
  for (const a of assignments) {
    lines.push(`| ${a.caseId} | blinded/C${a.caseNumber}-A.md | blinded/C${a.caseNumber}-B.md |`);
  }
  lines.push('');
  lines.push('## 6. Files you should NOT open during scoring');
  lines.push('');
  lines.push('- `_MAPPING_DO_NOT_OPEN_UNTIL_DONE.md` (in this folder)');
  lines.push('- `docs/visual-analysis/evaluation/{caseId}/{provider}/` (original raw outputs; contain provider/model names)');
  lines.push('- `docs/visual-analysis/evaluation/evaluation-matrix.json` (records which provider is A vs B; do not consult)');
  lines.push('- `scripts/a2-d-run-evaluations.mjs` (the runner; reads provider names; do not consult)');
  lines.push('');
  return lines.join('\n');
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function main() {
  fs.mkdirSync(BUNDLE_DIR, { recursive: true });
  fs.mkdirSync(BLINDED_DIR, { recursive: true });

  const assignments = [];
  for (const c of CASES) {
    const caseNumber = c.caseId.replace(/^C/u, '');
    const resultA = pickRandomA(c.caseId);
    const resultB = resultA === 'qwen' ? 'volcengine' : 'qwen';

    // Copy raw outputs to blinded paths.
    const originalA = findOriginal(c.caseId, resultA);
    const originalB = findOriginal(c.caseId, resultB);
    const blindedA = path.join(BLINDED_DIR, `${c.caseId}-A.md`);
    const blindedB = path.join(BLINDED_DIR, `${c.caseId}-B.md`);
    fs.copyFileSync(originalA.md, blindedA);
    fs.copyFileSync(originalB.md, blindedB);

    // Generate the two scorecards.
    const scorecardA = renderScorecard({
      caseId: c.caseId,
      category: c.category,
      project: c.project,
      resultLabel: 'A',
      blindedRawPath: path.relative(REPO, blindedA).replaceAll('\\', '/'),
      providerIsRevealed: false,
    });
    const scorecardB = renderScorecard({
      caseId: c.caseId,
      category: c.category,
      project: c.project,
      resultLabel: 'B',
      blindedRawPath: path.relative(REPO, blindedB).replaceAll('\\', '/'),
      providerIsRevealed: false,
    });
    fs.writeFileSync(path.join(BUNDLE_DIR, `${c.caseId}-A.md`), scorecardA, 'utf8');
    fs.writeFileSync(path.join(BUNDLE_DIR, `${c.caseId}-B.md`), scorecardB, 'utf8');

    assignments.push({ caseId: c.caseId, caseNumber, resultA, resultB });

    console.log(`[a2-f-bundle] ${c.caseId}: Result A=${resultA}, Result B=${resultB}`);
  }

  // Aggregate file: all 14 scorecards in one.
  const all = [];
  for (const c of CASES) {
    const a = fs.readFileSync(path.join(BUNDLE_DIR, `${c.caseId}-A.md`), 'utf8');
    const b = fs.readFileSync(path.join(BUNDLE_DIR, `${c.caseId}-B.md`), 'utf8');
    all.push(a);
    all.push('---');
    all.push('');
    all.push(b);
    all.push('');
    all.push('='.repeat(80));
    all.push('');
  }
  fs.writeFileSync(ALL_FILE, all.join('\n'), 'utf8');

  // Mapping + README.
  fs.writeFileSync(MAPPING_FILE, renderMapping(assignments), 'utf8');
  fs.writeFileSync(README_FILE, renderReadme(assignments), 'utf8');

  // Per-mapping manifest hash (for audit).
  const mappingHash = sha256(fs.readFileSync(MAPPING_FILE, 'utf8'));
  const summaryPath = path.join(BUNDLE_DIR, 'bundle-manifest.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    schemaVersion: '1.0',
    builtAt: new Date().toISOString(),
    a2dRunBatch: '2026-08-12T09-30-05-859Z',
    a2cManifestHash: RUBRIC_HASH,
    rubricFrozenAt: RUBRIC_FROZEN_AT,
    mappingFileSha256: mappingHash,
    assignments: assignments.map((a) => ({
      caseId: a.caseId,
      resultA: a.resultA,
      resultB: a.resultB,
    })),
  }, null, 2), 'utf8');

  console.log(`[a2-f-bundle] done.`);
  console.log(`[a2-f-bundle] scorecards: 14 (one per (case, result))`);
  console.log(`[a2-f-bundle] aggregate:   ${path.relative(REPO, ALL_FILE)}`);
  console.log(`[a2-f-bundle] blinded:     ${path.relative(REPO, BLINDED_DIR)}/C0X-{{A,B}}.md (14 files)`);
  console.log(`[a2-f-bundle] mapping:     ${path.relative(REPO, MAPPING_FILE)} (DO NOT OPEN UNTIL DONE)`);
  console.log(`[a2-f-bundle] manifest:    ${path.relative(REPO, summaryPath)} (audit; ok to open)`);
}

main();
