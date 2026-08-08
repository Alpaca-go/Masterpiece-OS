#!/usr/bin/env node
// verify-space-r8.6-golden-boundary.mjs
// R8.6 Golden Baseline file gate (Baseline Freeze & R9 Unlock).
//
// Enforces that the frozen R8.6 golden baseline is present and traceable:
// - baseline manifest exists with provider/model/compiler recorded
// - per-brand golden selection exists
// - final smoke records carry prompt hash, image sha256, reference trace
//   (refs trackable), and a completed evaluation
// - R9-UNLOCK.json exists (r9Unlocked=true)
// - anti-regression samples indexed
//
// Offline / idempotent. Does NOT call a provider and does NOT do
// pixel-perfect image comparison. Its purpose is to keep the Baseline
// itself from being lost or losing traceability.
//
// Deliberate choice: the auto evaluations are marked
// auto-pending-human-review; this gate checks the evaluation is PRESENT and
// has a verdict + total, it does not block on human confirmation.

import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = 'space-generator/quality-baselines/r8.6';

const failures = [];

function checkFile(rel, label) {
  const full = path.join(root, rel);
  if (!existsSync(full)) {
    failures.push(`R86_BASELINE_FILE_MISSING: ${rel} (${label})`);
    return false;
  }
  if (!statSync(full).isFile() || statSync(full).size === 0) {
    failures.push(`R86_BASELINE_FILE_EMPTY: ${rel} (${label})`);
    return false;
  }
  return true;
}

function parseJson(rel, label) {
  if (!checkFile(rel, label)) return null;
  try {
    return JSON.parse(readFileSync(path.join(root, rel), 'utf8'));
  } catch (err) {
    failures.push(`R86_BASELINE_JSON_INVALID: ${rel} (${label}: ${err.message})`);
    return null;
  }
}

function ok(msg) { console.log(`  [ok]   ${msg}`); }
function fail(msg) { console.log(`  [FAIL] ${msg}`); }

console.log('\nR8.6 Golden Baseline Boundary Verifier\n');

// [1] Baseline manifest
console.log('[1] Baseline manifest...');
const manifest = parseJson(`${base}/manifest.json`, 'baseline manifest');
if (manifest) {
  if (manifest.baselineId !== 'space-r8.6-golden') {
    failures.push(`R86_MANIFEST_BASELINE_ID: expected space-r8.6-golden, got ${manifest.baselineId}`);
  }
  if (manifest.status !== 'frozen') {
    failures.push(`R86_MANIFEST_NOT_FROZEN: status=${manifest.status}`);
  }
  if (manifest.r9Unlocked !== true) {
    failures.push(`R86_MANIFEST_R9_NOT_UNLOCKED`);
  }
  if (!manifest.provider || !manifest.model) {
    failures.push(`R86_MANIFEST_PROVIDER_MODEL_MISSING`);
  }
  if (!manifest.compilerCommit || !manifest.spaceCompilerVersion) {
    failures.push(`R86_MANIFEST_COMPILER_TRACE_MISSING`);
  }
  ok(`manifest ${manifest.baselineId} status=${manifest.status} r9=${manifest.r9Unlocked} provider=${manifest.provider}/${manifest.model}`);
} else {
  fail('baseline manifest missing/invalid');
}

// [2] Golden selections per brand
console.log('\n[2] Per-brand golden selection...');
const brands = ['jiuzhou-aesthetics', 'feng-tang-tang', 'yi-ji-liang-fang'];
const brandDir = (b) => path.join(root, base, b);
for (const b of brands) {
  if (!existsSync(brandDir(b))) {
    failures.push(`R86_BRAND_DIR_MISSING: ${b}`);
    continue;
  }
  const gs = parseJson(`${base}/${b}/golden-selection.json`, `${b} golden selection`);
  if (!gs) { fail(`${b}: golden-selection missing/invalid`); continue; }
  const golds = gs.golds ?? [];
  const types = golds.map((g) => g.type);
  if (!types.includes('commercial') || !types.includes('architecture')) {
    failures.push(`R86_GOLDEN_TYPES_INCOMPLETE: ${b} needs commercial + architecture (got ${types.join(',')})`);
    fail(`${b}: golden types incomplete (${types.join(',')})`);
  } else {
    ok(`${b}: golds=${types.join('+')}`);
  }
}

// [3] Final smoke records (traceability)
console.log('\n[3] Final smoke records (4 runs, refs trackable)...');
const smokeScenes = [
  'jiuzhou-aesthetics/final-reception-1',
  'jiuzhou-aesthetics/final-entrance-1',
  'feng-tang-tang/final-dining-1',
  'yi-ji-liang-fang/final-reception-1',
];
for (const scene of smokeScenes) {
  const m = parseJson(`${base}/${scene}/manifest.json`, `${scene} manifest`);
  if (!m) { continue; }
  const run = parseJson(`${base}/${scene}/run.json`, `${scene} run`);
  const ref = parseJson(`${base}/${scene}/reference-trace.json`, `${scene} reference-trace`);
  const ev = parseJson(`${base}/${scene}/evaluation.json`, `${scene} evaluation`);
  const promptExists = checkFile(`${base}/${scene}/prompt.md`, `${scene} prompt`);
  const payloadExists = checkFile(`${base}/${scene}/provider-payload.redacted.json`, `${scene} provider payload`);

  let traceOk = true;
  if (!m.promptHash || m.promptHash.length !== 64) { failures.push(`R86_SMOKE_PROMPT_HASH_MISSING: ${scene}`); traceOk = false; }
  if (!m.output?.imageSha256 || m.output.imageSha256.length !== 64) { failures.push(`R86_SMOKE_IMAGE_HASH_MISSING: ${scene}`); traceOk = false; }
  if (run && m.promptHash !== run.promptHash) { failures.push(`R86_SMOKE_PROMPT_HASH_MISMATCH: ${scene}`); traceOk = false; }
  if (ref && typeof ref.referenceCount !== 'number') { failures.push(`R86_SMOKE_REFCOUNT_MISSING: ${scene}`); traceOk = false; }
  if (ev && (!ev.total || !ev.verdict)) { failures.push(`R86_SMOKE_EVALUATION_INCOMPLETE: ${scene}`); traceOk = false; }
  if (!ev) { failures.push(`R86_SMOKE_EVALUATION_MISSING: ${scene}`); traceOk = false; }

  const refCount = ref?.referenceCount ?? 'n/a';
  const evTotal = ev?.total ?? 'n/a';
  ok(`${scene}: refs=${refCount} ev=${evTotal} promptHash=${m.promptHash?.slice(0, 8)} sha=${m.output?.imageSha256?.slice(0, 8)} ${traceOk ? '' : 'TRACE ISSUE'}`);
}

// [4] R9 unlock
console.log('\n[4] R9 unlock...');
const unlock = parseJson(`${base}/R9-UNLOCK.json`, 'R9 unlock');
if (unlock) {
  if (unlock.unlocked !== true) failures.push(`R86_R9_UNLOCK_FALSE`);
  if (unlock.sourceBaseline !== 'space-r8.6-golden') failures.push(`R86_R9_SOURCE_BASELINE_MISMATCH`);
  if (!Array.isArray(unlock.requiredParity) || unlock.requiredParity.length === 0) failures.push(`R86_R9_PARITY_MISSING`);
  ok(`R9 unlocked=true source=${unlock.sourceBaseline}`);
} else {
  fail('R9-UNLOCK.json missing/invalid');
}

// [5] Anti-regression samples
console.log('\n[5] Anti-regression samples...');
const antiIndex = path.join(root, 'space-generator/quality-baselines/anti-regression/README.md');
if (!existsSync(antiIndex)) {
  failures.push('R86_ANTI_REGRESSION_INDEX_MISSING');
  fail('anti-regression/README.md missing');
} else {
  ok('anti-regression/README.md present');
}

console.log(`\nSummary: ${failures.length} failure(s)`);
if (failures.length > 0) {
  console.log('\nFAIL — R8.6 golden baseline is incomplete or untraceable.');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('\nPASS — R8.6 golden baseline frozen and fully traceable.');
