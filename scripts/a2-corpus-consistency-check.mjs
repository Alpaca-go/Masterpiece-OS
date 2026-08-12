// A2-C post-freeze consistency check. Verifies the frozen corpus
// doc, manifest, and rubric are internally consistent and that the
// C06 trace evidence matches what is on disk in
// `image-generation-vnext/.../reference-trace.json`.
//
// Read-only. Exits 0 on PASS, 1 on any FAIL.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO = path.resolve(__dirname, '..');

const PROJECTS_ROOT = 'C:\\Users\\Administrator\\Documents\\Masterpiece OS Data\\projects';
const MANIFEST = path.join(REPO, 'docs', 'visual-analysis', 'A2-evaluation-corpus.manifest.json');
const CORPUS_DOC = path.join(REPO, 'docs', 'visual-analysis', 'A2-evaluation-corpus.md');
const RUBRIC_DOC = path.join(REPO, 'docs', 'visual-analysis', 'A2-evaluation-rubric.md');

const results = [];
function check(name, predicate, detail = '') {
  results.push({ name, pass: !!predicate, detail });
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const sorted = {};
    for (const key of Object.keys(value).sort()) sorted[key] = canonicalize(value[key]);
    return sorted;
  }
  return value;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const corpusDoc = fs.readFileSync(CORPUS_DOC, 'utf8');
const rubricDoc = fs.readFileSync(RUBRIC_DOC, 'utf8');

// --- Check 1: manifestHash matches the canonical selection ---
{
  // The manifest embeds the hash twice: once in the JSON tree as
  // `manifestHash` (target), and as the SHA-256 of the canonical
  // selection (without manifestHash / manifestHashInput fields).
  const { manifestHash: target, manifestHashInput, ...selection } = manifest;
  const canonical = JSON.stringify(canonicalize(selection), null, 2);
  const computed = sha256(canonical);
  check(
    'manifestHash matches SHA-256(canonical selection)',
    computed === target,
    `target=${target} computed=${computed}`,
  );
  // Sanity: the manifestHashInput string in the file should equal canonical.
  check(
    'manifest.manifestHashInput equals canonical selection text',
    manifestHashInput === canonical,
    `len(canonical)=${canonical.length} len(input)=${manifestHashInput.length}`,
  );
}

// --- Check 2: rubric weights sum to 100 ---
{
  const expected = [
    ['Visual Understanding', 15],
    ['Brand / Locked Asset Fidelity', 15],
    ['Design-System Extraction', 15],
    ['Creative Reasoning', 10],
    ['Decision Usefulness', 15],
    ['Evidence Grounding', 10],
    ['Hallucination Control', 10],
    ['Cross-Image Consistency', 5],
    ['Report Structure Compliance', 2.5],
    ['Downstream Usability', 2.5],
  ];
  const total = expected.reduce((acc, [, w]) => acc + w, 0);
  check('rubric weight total = 100', total === 100, `sum=${total}`);
  for (const [name, w] of expected) {
    // The rubric renders each weight as `**15**` (bold) in the table
    // row. Match the row by dimension name on the same line.
    const re = new RegExp(`\\|\\s*\\d+\\s*\\|\\s*${name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}\\s*\\|[^|]*\\|\\s*\\*\\*${w}\\*\\*\\s*\\|`, 'u');
    check(`rubric has weight ${w} for "${name}"`, re.test(rubricDoc));
  }
}

// --- Check 3: 10 canonical A2 spec dimensions appear in the rubric ---
{
  const dimensions = [
    'Visual Understanding',
    'Brand / Locked Asset Fidelity',
    'Design-System Extraction',
    'Creative Reasoning',
    'Decision Usefulness',
    'Evidence Grounding',
    'Hallucination Control',
    'Cross-Image Consistency',
    'Report Structure Compliance',
    'Downstream Usability',
  ];
  for (const d of dimensions) {
    check(`rubric mentions "${d}"`, rubricDoc.includes(d));
  }
}

// --- Check 4: 7 caseIds in corpus doc match caseIds in manifest ---
{
  const expected = ['C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07'];
  for (const c of expected) {
    check(`manifest has case ${c}`, manifest.cases.some((mc) => mc.caseId === c));
    check(`corpus doc mentions ${c}`, corpusDoc.includes(`**${c}**`) || corpusDoc.includes(c + ' ') || corpusDoc.includes(c + '—') || corpusDoc.includes(c + ' —'));
  }
  check('manifest.cases.length == 7', manifest.cases.length === 7, `got ${manifest.cases.length}`);
}

// --- Check 5: C06 input assets match the on-disk reference-trace.json ---
{
  const c06 = manifest.cases.find((c) => c.caseId === 'C06');
  const refs = c06.inputAssets.filter((a) => a.role === 'reference');
  check('C06 has 2 reference assets', refs.length === 2);

  // Walk the actual reference-trace.json files for 九州美学.
  const projectName = c06.projectName;
  const projectDir = path.join(PROJECTS_ROOT, projectName);
  const files = fs.readdirSync(projectDir, { recursive: true })
    .map((rel) => path.join(projectDir, rel));
  const traceFiles = files.filter((f) => f.endsWith('reference-trace.json'));

  // Aggregate user_explicit references from text_only + reference_assisted traces.
  const actualRefs = new Map();
  for (const tf of traceFiles) {
    try {
      const j = JSON.parse(fs.readFileSync(tf, 'utf8'));
      if (Array.isArray(j.references)) {
        for (const r of j.references) {
          if (r.source === 'user_explicit') {
            if (!actualRefs.has(r.id)) actualRefs.set(r.id, []);
            actualRefs.get(r.id).push(path.basename(path.dirname(tf)));
          }
        }
      }
    } catch {}
  }

  // Each manifest reference must appear in the on-disk evidence.
  for (const ref of refs) {
    check(
      `C06 reference ${ref.assetId} found in vnext reference-trace.json`,
      actualRefs.has(ref.assetId),
      `actual keys: ${[...actualRefs.keys()].join(', ')}`,
    );
  }

  // The manifest must list EXACTLY the user_explicit references for
  // 九州美学 (not include any other project).
  const actualJzurRefs = new Set();
  for (const tf of traceFiles) {
    try {
      const j = JSON.parse(fs.readFileSync(tf, 'utf8'));
      if (Array.isArray(j.references)) {
        for (const r of j.references) {
          if (r.source === 'user_explicit') actualJzurRefs.add(r.id);
        }
      }
    } catch {}
  }
  const manifestIds = new Set(refs.map((r) => r.assetId));
  check(
    'C06 references are EXACTLY the user_explicit references found in 九州美学 vnext',
    manifestIds.size === actualJzurRefs.size && [...manifestIds].every((id) => actualJzurRefs.has(id)),
    `manifest=${[...manifestIds].join(', ')} actual=${[...actualJzurRefs].join(', ')}`,
  );

  // Each manifest reference has appearingInCompilations recorded.
  for (const ref of refs) {
    check(
      `C06 reference ${ref.assetId} has appearingInCompilations list (length ${ref.appearingInCompilations.length})`,
      Array.isArray(ref.appearingInCompilations) && ref.appearingInCompilations.length > 0,
    );
    check(
      `C06 reference ${ref.assetId} compilationCount matches on-disk count (manifest=${ref.compilationCount})`,
      ref.compilationCount === actualRefs.get(ref.assetId)?.length,
    );
  }
}

// --- Check 6: C07 CONTROLLED_INCOMPLETE_SUBSET tag ---
{
  const c07 = manifest.cases.find((c) => c.caseId === 'C07');
  const has = c07.inputAssets.length === 3
    && JSON.stringify(c07).includes('CONTROLLED_INCOMPLETE_SUBSET');
  check('C07 has CONTROLLED_INCOMPLETE_SUBSET tag and 3 input assets', has,
    `assets=${c07.inputAssets.length}`);
  check('C07 3 assets drawn from 视觉项目-...dca9b7d4 contact sheet', c07.projectId === 'dca9b7d4-f233-46ff-b4df-44a890f13c4f');
}

// --- Check 7: Run Budget ---
{
  const rb = manifest.runBudget;
  check('runBudget.maxProviders == 2', rb.maxProviders === 2);
  check('runBudget.maxCases == 7', rb.maxCases === 7);
  check('runBudget.caseIds length 7', rb.caseIds.length === 7);
  check('runBudget.maxRunsPerCase == 3', rb.maxRunsPerCase === 3);
  check('runBudget.estimatedCallCount.minimum == 14', rb.estimatedCallCount.minimum === 14);
  check('runBudget.estimatedCallCount.withCloseStability == 42', rb.estimatedCallCount.withCloseStability === 42);
  check('runBudget.expectedProviderCalls.qwen == 7', rb.expectedProviderCalls.qwen === 7);
  check('runBudget.expectedProviderCalls.volcengine == 7', rb.expectedProviderCalls.volcengine === 7);
}

// --- Check 8: corpus doc embeds the manifest hash ---
{
  const targetHash = manifest.manifestHash;
  check('corpus doc embeds manifestHash', corpusDoc.includes(targetHash));
  check('rubric doc declares status A2_RUBRIC_FROZEN', rubricDoc.includes('A2_RUBRIC_FROZEN'));
}

// --- Check 9: every input asset in the manifest exists on disk ---
{
  let allExist = true;
  let missing = [];
  for (const c of manifest.cases) {
    for (const a of c.inputAssets) {
      if (!fs.existsSync(a.absolutePath)) {
        allExist = false;
        missing.push(a.absolutePath);
      }
    }
  }
  check('all manifest inputAssets exist on disk', allExist, missing.length ? `missing: ${missing.join(', ')}` : '');
}

// --- Print summary ---
let pass = 0;
let fail = 0;
for (const r of results) {
  const mark = r.pass ? '\u2714' : '\u2716';
  const tail = r.pass ? '' : `   [${r.detail}]`;
  console.log(`${mark} ${r.name}${tail}`);
  if (r.pass) pass += 1; else fail += 1;
}
console.log(`---\n${pass} PASS, ${fail} FAIL`);

if (fail > 0) process.exit(1);
