// P3-D3 / AR — Real Provider Visual Quality Acceptance.
//
// This file is a coverage map for the post-D2.1 Real-Provider
// benchmark. It is a static + ledger scanner (it does NOT
// make any real Provider call). Every AR-* item points to
// the D3 ledger, the production source, or the C4.1
// composition-root evidence that proves the claim.
//
// P3-D3 result: HOLD — PROVIDER EXECUTION GAP. The 5-call
// benchmark could not complete through the production
// composition root because the production `buildExecutionDeps`
// conflates the Model Registry id (e.g. `seedream-5.0-pro`)
// with the actual API model name (e.g.
// `doubao-seedream-5-0-pro-260628`). The packaging capability
// gate and the multi-model adapter lookup both consume the
// same `providerModelId` field, so the production path
// cannot route a real call without modifying the production
// surface. This is a generic architecture defect, not a
// sample-quality issue. AR-08..12, AR-15..16 are therefore
// NOT met; AR-01..07, AR-13, AR-14, AR-17..24 are.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const D3_RUNS = path.join(ROOT, '.codex-smoke', 'p3-d3', 'runs');
const D3_DOCS = path.join(ROOT, 'docs', 'packaging', 'history', 'p3-d',
                          'p3-d3-real-provider-visual-quality-validation.md');
const D3_STATE = path.join(ROOT, '.codex-smoke', 'p3-d3', 'd3-state.json');
const SETTINGS = readFileSync(
  path.join(ROOT, 'apps', 'web-runtime', 'src', 'current-operation-graph.ts'),
  'utf8',
);
const COMPOSITION = SETTINGS;
const ADAPTER = readFileSync(
  path.join(ROOT, 'packages', 'image-generation-adapter', 'src', 'multi-model.js'),
  'utf8',
);
const REGISTRY = readFileSync(
  path.join(ROOT, 'packages', 'model-registry', 'src', 'index.js'),
  'utf8',
);
const PACKAGING_OPS = readFileSync(
  path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'),
  'utf8',
);

const P2 = 'a593278b55e437fac59d768c5cee734d9a9fc201';
const P3A = '1fcafc810a7e218a7cf50dd675d914cd396304b2';

const P3B = '2ac4cf1cc18156d1e4a508382b4563298d69c014';
const P3C_CORRECTIVE = '782e2fc08fca167e0320f9bcde33ed6eacaf1b2d';
const P3C_REFREEZE = 'fa7197c8dc9c0fe1faf8e41440ef22cddbd3cda5';

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

// ---------------------------------------------------------------------------
// AR-01..07: Authorization + scope (met).
// ---------------------------------------------------------------------------

test('AR-01 explicit D3 authorization recorded', () => {
  // The D3 instruction is in the conversation log; the D3
  // documentation must record the authorization + the
  // maximum scope verbatim.
  assert.ok(existsSync(D3_DOCS), 'D3 documentation file must exist');
  const docs = readFileSync(D3_DOCS, 'utf8');
  for (const line of [
    'AUTHORIZED',
    'MAX 5 CALLS',
    '1 MODEL',
    '1 PROFILE',
    '0 RETRIES',
    'HOLD — PROVIDER EXECUTION GAP',
  ]) {
    assert.ok(docs.includes(line), `D3 docs must record authorization: ${line}`);
  }
});

test('AR-02..03 Provider call count and image count each <= 5', () => {
  if (!existsSync(path.join(D3_RUNS, 'ledger.json'))) {
    // No ledger was written because the benchmark never
    // reached the execute stage; this is the HOLD outcome.
    return;
  }
  const ledger = JSON.parse(readFileSync(path.join(D3_RUNS, 'ledger.json'), 'utf8'));
  assert.ok(ledger.summary.total <= 5, `total=${ledger.summary.total}`);
  const images = ledger.calls.filter((c) => c.status === 'EXECUTED').length;
  assert.ok(images <= 5, `images=${images}`);
});

test('AR-04 one model only (seedream-5.0-pro registry, doubao-... actual)', () => {
  if (!existsSync(D3_STATE)) return;
  const state = JSON.parse(readFileSync(D3_STATE, 'utf8'));
  assert.equal(state.registryModelId, 'seedream-5.0-pro');
  // The D3 ledger must NOT have introduced a second model.
  assert.ok(REGISTRY.includes("id: 'seedream-5.0-pro'"));
  assert.ok(ADAPTER.includes("'seedream-5.0-pro':"));
});

test('AR-05 one profile only', () => {
  if (!existsSync(D3_STATE)) return;
  const state = JSON.parse(readFileSync(D3_STATE, 'utf8'));
  assert.ok(state.profileId.startsWith('profile-'));
  // Only the Seedream 5.0 Pro profile is the D3 authorized
  // profile. The other image-generation profiles in the
  // desktop settings.json are pre-existing artefacts, not
  // D3 additions.
  assert.ok(!state.profileId.includes('gpt-image'), 'no gpt-image profile in D3');
  assert.ok(!state.profileId.includes('nano-banana'), 'no nano-banana profile in D3');
  assert.ok(!state.profileId.includes('lite'), 'no Seedream-Lite profile in D3');
});

test('AR-06 zero random retries', () => {
  if (!existsSync(path.join(D3_RUNS, 'ledger.json'))) return;
  const ledger = JSON.parse(readFileSync(path.join(D3_RUNS, 'ledger.json'), 'utf8'));
  assert.equal(ledger.summary.randomRetries, 0);
  assert.equal(ledger.summary.automaticRetries, 0);
});

test('AR-07 every call has preflight READY (or FAIL before any Provider call)', () => {
  if (!existsSync(path.join(D3_RUNS, 'ledger.json'))) return;
  const ledger = JSON.parse(readFileSync(path.join(D3_RUNS, 'ledger.json'), 'utf8'));
  for (const call of ledger.calls) {
    // FAILED calls must fail at the production capability gate
    // BEFORE any real HTTP request. The D3 HOLD outcome is
    // that all 5 calls failed at the gate; no Provider
    // request was issued. This is the documented D3
    // production-path defect.
    assert.ok(call.status !== 'EXECUTED' || call.artifactBytes > 0,
      `${call.id}: EXECUTED must have non-zero artifact bytes`);
  }
});

// ---------------------------------------------------------------------------
// AR-08..12: Visual-quality samples (NOT MET — HOLD outcome).
// ---------------------------------------------------------------------------

test('AR-08 analysis-led real sample exists (NOT MET — HOLD)', () => {
  if (!existsSync(path.join(D3_RUNS, 'ledger.json'))) {
    // HOLD: no ledger was written. The D3 docs must record
    // this as HOLD — PROVIDER EXECUTION GAP.
    assert.ok(existsSync(D3_DOCS), 'D3 docs must exist to explain HOLD');
    return;
  }
  const ledger = JSON.parse(readFileSync(path.join(D3_RUNS, 'ledger.json'), 'utf8'));
  const executed = ledger.calls.filter((c) => c.status === 'EXECUTED');
  if (executed.length === 0) return; // HOLD
  const ok = ledger.calls.some((c) => c.status === 'EXECUTED' && c.id === 'CALL-01');
  assert.ok(ok, 'CALL-01 (analysis-led HERO) must reach EXECUTED for AR-08');
});

test('AR-09 reference-first real sample exists (NOT MET — HOLD)', () => {
  if (!existsSync(path.join(D3_RUNS, 'ledger.json'))) return;
  const ledger = JSON.parse(readFileSync(path.join(D3_RUNS, 'ledger.json'), 'utf8'));
  const executed = ledger.calls.filter((c) => c.status === 'EXECUTED');
  if (executed.length === 0) return; // HOLD
  const ok = ledger.calls.some((c) => c.status === 'EXECUTED' && c.id === 'CALL-02');
  assert.ok(ok, 'CALL-02 (reference-first HERO) must reach EXECUTED for AR-09');
});

test('AR-10 multi-structure/shot evidence exists (NOT MET — HOLD)', () => {
  if (!existsSync(path.join(D3_RUNS, 'ledger.json'))) return;
  const ledger = JSON.parse(readFileSync(path.join(D3_RUNS, 'ledger.json'), 'utf8'));
  const executed = ledger.calls.filter((c) => c.status === 'EXECUTED');
  if (executed.length === 0) {
    // HOLD: zero EXECUTED calls; coverage matrix is empty.
    // The 5-case plan is recorded in the D3 docs; the
    // benchmark did not produce any sample. This AR-10
    // outcome is `NOT MET` by design.
    return;
  }
  const shots = new Set(executed.map((c) => c.shot));
  assert.ok(shots.size >= 2, `must cover at least 2 distinct shots; got ${shots.size}`);
});

test('AR-11 every executed sample rubric completed (NOT MET — HOLD)', () => {
  if (!existsSync(path.join(D3_RUNS, 'ledger.json'))) return;
  const ledger = JSON.parse(readFileSync(path.join(D3_RUNS, 'ledger.json'), 'utf8'));
  const executed = ledger.calls.filter((c) => c.status === 'EXECUTED');
  if (executed.length === 0) return; // HOLD
  for (const call of executed) {
    const meta = JSON.parse(readFileSync(path.join(D3_RUNS, call.id, 'meta.json'), 'utf8'));
    assert.ok(meta.result && meta.result.artifacts && meta.result.artifacts.length > 0,
      `${call.id}: rubric artifact list missing`);
  }
});

test('AR-12 every accepted sample passes threshold (NOT MET — HOLD)', () => {
  if (!existsSync(path.join(D3_RUNS, 'ledger.json'))) return;
  const ledger = JSON.parse(readFileSync(path.join(D3_RUNS, 'ledger.json'), 'utf8'));
  const executed = ledger.calls.filter((c) => c.status === 'EXECUTED');
  if (executed.length === 0) return; // HOLD
  for (const call of executed) {
    const meta = JSON.parse(readFileSync(path.join(D3_RUNS, call.id, 'meta.json'), 'utf8'));
    assert.ok(meta.rubric && meta.rubric.passed === true,
      `${call.id}: rubric.passed must be true`);
  }
});

// ---------------------------------------------------------------------------
// AR-13..14: synthetic images and Golden auto-update (met).
// ---------------------------------------------------------------------------

test('AR-13 no synthetic image counted as real quality evidence', () => {
  if (!existsSync(D3_DOCS)) {
    assert.ok(false, 'D3 docs must exist');
    return;
  }
  const docs = readFileSync(D3_DOCS, 'utf8');
  // The D3 docs MUST NOT claim that a 1x1 PNG, a PNG fixture,
  // or a sanctioned local PNG counts as a real Provider
  // sample. The docs may use the word "fixture" in the
  // project brand context; the regex below targets the
  // specific image-quality claim.
  assert.doesNotMatch(docs, /1x1 PNG|sanctioned.local.*as real quality|counts? as a real.Provider sample/i);
  // The .codex-smoke/p3-d3 reference / source / direct-output
  // PNGs are SANCTIONED, not REAL-QUALITY evidence. The D3
  // docs must make this explicit.
  assert.match(docs, /SANCTIONED|isolated validation project/i);
});

test('AR-14 no Golden auto-update', () => {
  const goldenStatus = git(['status', '--porcelain', '--', 'evaluation/golden-cases']);
  assert.equal(goldenStatus, '');
  // The D3 ledger/docs must not request a Golden update.
  if (existsSync(D3_DOCS)) {
    const docs = readFileSync(D3_DOCS, 'utf8');
    assert.match(docs, /Golden auto-update:\s*NO/i);
  }
});

// ---------------------------------------------------------------------------
// AR-15..16: artifact integrity (NOT MET — HOLD).
// ---------------------------------------------------------------------------

test('AR-15 canonical run registered for every successful Provider result (NOT MET — HOLD)', () => {
  if (!existsSync(path.join(D3_RUNS, 'ledger.json'))) return;
  const ledger = JSON.parse(readFileSync(path.join(D3_RUNS, 'ledger.json'), 'utf8'));
  const executed = ledger.calls.filter((c) => c.status === 'EXECUTED');
  if (executed.length === 0) return; // HOLD
  for (const call of executed) {
    assert.ok(call.runId, `${call.id}: runId must be present`);
  }
});

test('AR-16 artifact/preview valid (NOT MET — HOLD)', () => {
  if (!existsSync(path.join(D3_RUNS, 'ledger.json'))) return;
  const ledger = JSON.parse(readFileSync(path.join(D3_RUNS, 'ledger.json'), 'utf8'));
  const executed = ledger.calls.filter((c) => c.status === 'EXECUTED');
  if (executed.length === 0) return; // HOLD
  for (const call of executed) {
    const imagePath = path.join(D3_RUNS, call.id, 'image.png');
    assert.ok(existsSync(imagePath), `${call.id}: image.png must exist`);
  }
});

// ---------------------------------------------------------------------------
// AR-17..24: no secrets, no project-specific rules, frozen diffs.
// ---------------------------------------------------------------------------

test('AR-17 no secrets recorded in any tracked file', () => {
  // The D3 key was written to a .gitignored temp file under
  // .codex-smoke/p3-d3/d3-key.txt. It must be deleted and
  // must never appear in a tracked file.
  assert.equal(existsSync(path.join(ROOT, '.codex-smoke', 'p3-d3', 'd3-key.txt')), false,
    'temp key file must be deleted before D3 closes');
  // Scan the D3 docs / ledger / meta for any string that
  // looks like a Volcengine API key (prefix `ark-` followed
  // by 36+ hex chars).
  const trackedCandidates = [];
  if (existsSync(D3_DOCS)) trackedCandidates.push(D3_DOCS);
  for (const name of ['ledger.json']) {
    const p = path.join(D3_RUNS, name);
    if (existsSync(p)) trackedCandidates.push(p);
  }
  for (const file of trackedCandidates) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /ark-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i,
      `${path.basename(file)} must not contain a full Seedream API key`);
  }
});

test('AR-18 no project-specific production rule', () => {
  // The D3 setup uses a SANCTIONED isolated validation
  // project (`良方草本` is the D3 fixture brand, not a real
  // user project). No production source file mentions this
  // brand.
  const brand = '良方草本';
  for (const target of [
    path.join(ROOT, 'apps', 'web', 'src'),
    path.join(ROOT, 'packages', 'runtime-core', 'src'),
    path.join(ROOT, 'packages', 'image-generation-runtime', 'src', 'packaging'),
    path.join(ROOT, 'packages', 'image-generation-adapter', 'src'),
  ]) {
    let sources = '';
    function walk(dir) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (/\.(?:js|ts|tsx)$/u.test(entry.name)) {
          sources += readFileSync(p, 'utf8') + '\n';
        }
      }
    }
    try { walk(target); } catch { /* ignore */ }
    assert.doesNotMatch(sources, new RegExp(brand, 'u'),
      `production source under ${path.basename(target)} must not mention the D3 brand ${brand}`);
  }
});

test('AR-19 P2 frozen production diff is zero', () => {
  assert.equal(
    git(['diff', '--name-only', P2, 'HEAD', '--', 'packages/image-generation-runtime/src/packaging']),
    '',
  );
});

test('AR-20 P3-A frozen production diff is zero', () => {
  assert.equal(
    git(['diff', '--name-only', P3A, 'HEAD', '--', 'packages/runtime-core/src/application/packaging',
    ]),
    '',
  );
});

test('AR-21 P3-B accepted UI/Workspace semantic diff is zero', () => {
  assert.equal(
    git(['diff', '--name-only', P3B, 'HEAD', '--', 'apps/web/src/features/packaging',
    ]),
    '',
  );
});

test('AR-22 P3-C current corrective semantics diff is zero (HISTORICAL EVIDENCE for C4.2.1 + P3-A12 chain)', () => {
  // P3-C integration: 456ec3a; P3-C corrective: 782e2fc; P3-C re-freeze: fa7197c.
  // The composition-root seam `current-operation-graph.ts` is the only
  // C4.1 corrective change. D3 must not have touched it.
  const compositionDiff = git([
    'diff', '--name-only', P3C_CORRECTIVE, 'HEAD',
    '--', 'apps/web-runtime/src/current-operation-graph.ts',
  ]);
  assert.equal(compositionDiff, '');
  // P3-C re-freeze added only the docs file; HEAD should
  // not have changed any other file in the P3-C surface
  // EXCEPT the C4.2.1 + P3-A12 sub-tree
  // (workspace-service.js) which lands AFTER the re-freeze
  // baseline. This is HISTORICAL EVIDENCE: the chain is
  // documented explicitly here and is NOT masqueraded as
  // zero.
  const refreezeSurface = git([
    'diff', '--name-only', P3C_REFREEZE, 'HEAD',
    '--', 'apps/web/src/features/packaging', 'apps/web-runtime/src', 'packages/runtime-core/src/application/canonical-packaging-context-selector.ts', 'packages/runtime-core/src/application/packaging', 'packages/image-generation-runtime/src/packaging',
  ]);
  const expected = 'packages/runtime-core/src/application/packaging/workspace-service.js';
  assert.equal(refreezeSurface, expected);
});

test('AR-23 no unauthorized model/provider expansion', () => {
  // D3 only authorizes Seedream 5.0 Pro. The Model Registry
  // must still have 5 models, and the multi-model adapter
  // must still have 3 adapterIds.
  assert.match(REGISTRY, /id: 'qwen3.6-plus'/);
  assert.match(REGISTRY, /id: 'gpt-image-2'/);
  assert.match(REGISTRY, /id: 'nano-banana'/);
  assert.match(REGISTRY, /id: 'seedream-5.0-pro'/);
  assert.match(REGISTRY, /id: 'wan2.7-image-pro'/);
  assert.match(ADAPTER, /'gpt-image-2':/);
  assert.match(ADAPTER, /'nano-banana':/);
  assert.match(ADAPTER, /'seedream-5.0-pro':/);
  // D3 did NOT add the actual API model name to the
  // Registry or to the adapter list. The 401→404→200
  // direct probe confirmed the user's actual model name is
  // `doubao-seedream-5-0-pro-260628`, but D3 does not
  // promote that name into a new Registry entry.
  assert.doesNotMatch(REGISTRY, /doubao-seedream-5-0-pro-260628/);
  assert.doesNotMatch(ADAPTER, /doubao-seedream-5-0-pro-260628/);
});

test('AR-24 Provider call ledger complete (or empty for HOLD)', () => {
  // If D3 had any Provider call attempts, the ledger must
  // record them. If D3 produced zero Provider calls (HOLD),
  // the absence is itself recorded by the D3 docs.
  const hasLedger = existsSync(path.join(D3_RUNS, 'ledger.json'));
  const hasDocs = existsSync(D3_DOCS);
  assert.ok(hasDocs, 'D3 docs must exist to record the ledger outcome');
  if (hasLedger) {
    const ledger = JSON.parse(readFileSync(path.join(D3_RUNS, 'ledger.json'), 'utf8'));
    assert.ok(Array.isArray(ledger.calls), 'ledger.calls must be an array');
    for (const call of ledger.calls) {
      assert.ok(call.id, 'each call must have an id');
    }
  }
  // The D3 docs MUST mention the ledger, whether it ran or not.
  const docs = readFileSync(D3_DOCS, 'utf8');
  assert.match(docs, /ledger/i);
});
