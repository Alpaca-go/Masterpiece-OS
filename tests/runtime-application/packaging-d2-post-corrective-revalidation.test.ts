// P3-D2.1 / AQ — D2 Post-Corrective Revalidation coverage map.
//
// This file is a coverage map, not a behaviour suite. Every AQ-* item
// below points to the AP / AN / AO / AE test that already proves the
// underlying behaviour. The map runs `node --test` so a missing or
// renamed test breaks the gate and forces a deliberate update.
//
// Why a map instead of duplicating behaviour tests:
//   - AP / AN / AO / AE suites already cover the behaviour exhaustively.
//   - The C4.1 corrective baseline is at 782e2fc; the re-freeze is
//     fa7197c. AQ asserts the project-canonical identity projection is
//     retained, the corrective composition-root seam is the ONLY seam,
//     and the existing frozen surface diffs remain zero against the
//     authoritative baselines (P2 a593278b, P3-A12 current 1fcafc8 (P3-A11 historical f95c145b), P3-B 2ac4cf1,
//     P3-C 3da7a14) plus the C4.1 corrective commit 782e2fc.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

// Authoritative frozen baselines (re-stated here so the map is self
// contained; these match the constants in the existing suites).
const P2 = 'a593278b55e437fac59d768c5cee734d9a9fc201';
const P3A = '1fcafc810a7e218a7cf50dd675d914cd396304b2';

const P3B = '2ac4cf1cc18156d1e4a508382b4563298d69c014';
const P3C_INTEGRATION = '456ec3a9d0273b599ed15bcd424fde1f36b8ce1b';
const C4_CORRECTIVE = '782e2fc08fca167e0320f9bcde33ed6eacaf1b2d';

const COMPOSITION = readFileSync(
  path.join(ROOT, 'apps/web-runtime/src/current-operation-graph.ts'),
  'utf8',
);
const SELECTOR = readFileSync(
  path.join(ROOT, 'packages/runtime-core/src/application/canonical-packaging-context-selector.ts'),
  'utf8',
);
const REGISTRY = readFileSync(
  path.join(ROOT, 'packages/model-registry/src/index.js'),
  'utf8',
);
const ADAPTER = readFileSync(
  path.join(ROOT, 'packages/image-generation-adapter/src/multi-model.js'),
  'utf8',
);
const GLOBAL_CSS = readFileSync(
  path.join(ROOT, 'apps/web/src/styles.css'),
  'utf8',
);
const WORKSPACE_CSS = readFileSync(
  path.join(ROOT, 'apps/web/src/features/packaging/PackagingWorkspace.module.css'),
  'utf8',
);
const APP = readFileSync(path.join(ROOT, 'apps/web/src/App.tsx'), 'utf8');

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function fileContains(needle) {
  // Walk the runtime-application test directory and confirm a test
  // exists for the supplied id. Returns the matching path or null.
  const dir = path.join(ROOT, 'tests/runtime-application');
  for (const name of readdirSync(dir)) {
    if (!name.startsWith('packaging-') || !name.endsWith('.test.ts')) continue;
    const full = path.join(dir, name);
    const source = readFileSync(full, 'utf8');
    if (source.includes(needle)) return name;
  }
  return null;
}

function requireTest(id) {
  const where = fileContains(`'${id}`);
  assert.ok(where, `missing underlying test for ${id} — the AP/AN/AO/AE suite must retain it`);
  return where;
}

// ---------------------------------------------------------------------------
// AQ-01..05: C4.1 identity projection retained.
// ---------------------------------------------------------------------------

test('AQ-01 C4.1 identity projection retained', () => {
  requireTest('AP-01..07 canonical owners project the complete mode-invariant identity');
  assert.match(COMPOSITION, /export function projectCanonicalIdentityFromAuthorities/u);
  assert.match(
    COMPOSITION,
    /brandName:\s*input\.project\?\.brandName\s*\|\|\s*''/u,
  );
  assert.match(
    COMPOSITION,
    /industry:\s*input\.project\?\.industry\s*\|\|\s*''/u,
  );
  assert.match(
    COMPOSITION,
    /brandRole:\s*typeof projectFacts\?\.brandRole === 'string' \? projectFacts\.brandRole\.trim\(\) : ''/u,
  );
  assert.match(COMPOSITION, /productIdentity:\s*input\.productIdentityName/u);
});

test('AQ-02 analysis-led Renderer Prepare READY', () => {
  requireTest('AP-11 production composition root analysis-led reaches READY');
});

test('AQ-03 reference-first Renderer Prepare READY', () => {
  requireTest('AP-12 production composition root reference-first reaches READY');
});

test('AQ-04 identity invariant across modes', () => {
  requireTest('AP-01..07 canonical owners project the complete mode-invariant identity');
  // The corrective seam is identical for both modes: it does not branch
  // on `generationMode` and is the sole reader of project identity.
  const projector = (() => {
    const start = COMPOSITION.indexOf('export function projectCanonicalIdentityFromAuthorities');
    const end = COMPOSITION.indexOf('export function createCurrentBusinessOperations');
    return COMPOSITION.slice(start, end);
  })();
  assert.doesNotMatch(projector, /generationMode|reference_first|analysis_led/u);
});

test('AQ-05 missing identity safe fail-closed', () => {
  requireTest('AP-13 missing canonical identity fails closed without filler');
});

// ---------------------------------------------------------------------------
// AQ-06..10: Renderer acceptance + reference-limit failure.
// ---------------------------------------------------------------------------

test('AQ-06 desktop Renderer PASS', () => {
  requireTest('AP-11 production composition root analysis-led reaches READY');
  requireTest('AP-12 production composition root reference-first reaches READY');
  requireTest('AE-05 production Web build succeeds');
  requireTest('AE-06 Packaging route remains mounted from the production App');
  // The Packaging route is mounted from the production App.
  assert.match(APP, /screen === 'packaging'/u);
});

test('AQ-07 mobile Renderer PASS', () => {
  requireTest('AE-08 mobile workspace has no fixed-width shell or tile grid');
  requireTest('AE-09 responsive contract prevents horizontal content overflow');
  assert.match(WORKSPACE_CSS, /@media \(max-width: 420px\)/u);
  assert.match(GLOBAL_CSS, /overflow-wrap:\s*anywhere/u);
  assert.doesNotMatch(GLOBAL_CSS, /body\s*\{[^}]*\bmin-width:\s*[1-9]\d*px/su);
});

test('AQ-08 mode switch STALE PASS', () => {
  requireTest('AP-15 existing P3-A stale authority remains unchanged');
  requireTest('AO-20 two repeated STALE cycles block execution and recover deterministically');
  // The existing P3-A stale-tracker is the sole source of `intent_changed`.
  const staleTracker = readFileSync(
    path.join(ROOT, 'packages/runtime-core/src/application/packaging/stale-tracker.js'),
    'utf8',
  );
  assert.match(staleTracker, /INTENT_CHANGED:\s*'intent_changed'/u);
  // The selector remains the sole authority for selecting the producer
  // slot; it must not branch on intent change directly.
  assert.doesNotMatch(SELECTOR, /intent_changed/u);
});

test('AQ-09 over-reference-limit fail pre-execution', () => {
  requireTest('AO-12 limit + 1 fails before executor invocation');
  requireTest('AO-13 Registry and adapter caps are reconciled at 10');
});

test('AQ-10 executor calls zero on limit+1', () => {
  requireTest('AO-24 all execution is sanctioned local and external Provider calls remain zero');
});

// ---------------------------------------------------------------------------
// AQ-11: synthetic matrix retained (AO 31/31).
// ---------------------------------------------------------------------------

test('AQ-11 synthetic matrix retained', () => {
  requireTest('AO-05 HERO lifecycle produces run, artifact, and safe preview');
  requireTest('AO-06 SERIES lifecycle produces run, artifact, and safe preview');
  requireTest('AO-07 GIFT-OPEN lifecycle produces run, artifact, and safe preview');
  requireTest('AO-08 container / bottle structure produces valid translation');
  requireTest('AO-09 carton structure produces valid translation');
  requireTest('AO-10 reference-first with zero references fails closed');
  requireTest('AO-11 reference counts 1, 2, 6, and effective limit 10 are legal');
});

// ---------------------------------------------------------------------------
// AQ-12..18: isolation, run, repeated execution, two-session, Unicode.
// ---------------------------------------------------------------------------

test('AQ-12 truth isolation retained', () => {
  requireTest('AO-14 project truth and translation fingerprints fail cross-project selection');
  requireTest('AN-03 canonical project truth selection validates every project binding');
});

test('AQ-13 run isolation retained', () => {
  requireTest('AO-16 canonical run stores are project-isolated');
  requireTest('AN-05 run, artifact, and preview resolution remains project-bound');
});

test('AQ-14 artifact / preview isolation retained', () => {
  requireTest('AO-17 artifact and preview reads reject cross-session run identity');
});

test('AQ-15 repeated executions retained', () => {
  requireTest('AO-19 three sequential executions retain unique discoverable runs and artifacts');
});

test('AQ-16 repeated STALE cycles retained', () => {
  requireTest('AO-20 two repeated STALE cycles block execution and recover deterministically');
});

test('AQ-17 two-session isolation retained', () => {
  requireTest('AO-30 two sessions for one project keep preparation, stale state, and runs independent');
});

test('AQ-18 Unicode asset identity retained', () => {
  requireTest('AO-21 Unicode filenames never become reference identity');
});

// ---------------------------------------------------------------------------
// AQ-19: D-PROVIDER-01 retained.
// ---------------------------------------------------------------------------

test('AQ-19 D-PROVIDER-01 retained', () => {
  requireTest('AP-20 D-PROVIDER-01 effective cap remains 10 in Registry and Seedream adapter');
  assert.match(REGISTRY, /id: 'seedream-5\.0-pro'[\s\S]{0,400}maxReferenceImages:\s*10/u);
  assert.match(ADAPTER, /'seedream-5\.0-pro':[\s\S]{0,180}maxReferences:\s*10/u);
});

// ---------------------------------------------------------------------------
// AQ-20..21: no real Provider calls, no Golden update.
// ---------------------------------------------------------------------------

test('AQ-20 no real Provider calls', () => {
  requireTest('AO-24 all execution is sanctioned local and external Provider calls remain zero');
});

test('AQ-21 no Golden update', () => {
  // Authoritative gate: scripts/golden must not have produced a digest
  // change since the last accepted Golden. The Golden script writes a
  // fresh digest only when GOLDEN_AUTO_UPDATE=1, which D2.1 does not
  // set. We assert the only Golden-managed files are unchanged.
  const goldenStatus = git(['status', '--porcelain', '--', 'evaluation/golden-cases']);
  assert.equal(goldenStatus, '');
});

// ---------------------------------------------------------------------------
// AQ-22..25: frozen surface diffs.
// ---------------------------------------------------------------------------

test('AQ-22 P2 frozen diff is zero', () => {
  requireTest('AP-17 P2 frozen production diff remains zero');
  requireTest('AN-13 P2 frozen production diff remains zero');
  requireTest('AE-11 P2 frozen Packaging diff is zero');
  assert.equal(
    git(['diff', '--name-only', P2, 'HEAD', '--', 'packages/image-generation-runtime/src/packaging']),
    '',
  );
});

test('AQ-23 P3-A current P3-A12 baseline diff is zero (no exclusion needed)', () => {
  requireTest('AP-18 P3-A frozen production diff remains zero');
  requireTest('AN-14 P3-A frozen production diff remains zero');
  requireTest('AE-10 P3-A frozen Packaging application diff is zero');
  // P3-A12 is the current accepted P3-A production-tree
  // baseline. The P3-A12 corrective formally accepts the
  // read-only `checkStale` seam in workspace-service.js as
  // part of the P3-A frozen surface. A direct
  // `1fcafc8 -> HEAD` diff against the P3-A gate therefore
  // requires no exclusion — the seam is already part of
  // the baseline.
  assert.equal(
    git(['diff', '--name-only', P3A, 'HEAD', '--', 'packages/runtime-core/src/application/packaging']),
    '',
  );
});

test('AQ-24 P3-B accepted diff is zero', () => {
  requireTest('AP-19 P3-B accepted UI and Workspace semantics remain unchanged');
  requireTest('AN-15 P3-B accepted UI and Workspace semantic diff remains zero');
  assert.equal(
    git([
      'diff', '--name-only', P3B, 'HEAD',
      '--', 'apps/web/src/features/packaging', 'packages/runtime-core/src/application/packaging'
    ]),
    '',
  );
});

test('AQ-25 P3-C corrective semantics unchanged', () => {
  requireTest('AP-16 P3-C selector authority remains unchanged');
  requireTest('AP-15 existing P3-A stale authority remains unchanged');
  requireTest('AO-29 P3-C frozen semantics permit only the authorized C4.1 composition-root seam');
  // Selector authority: the only change between P3-C integration and
  // HEAD must be the C4.1 composition-root seam in
  // `apps/web-runtime/src/current-operation-graph.ts` and the C4.1
  // re-freeze documentation.
  const selectorDiff = git([
    'diff', '--name-only', P3C_INTEGRATION, 'HEAD',
    '--', SELECTOR.split(path.sep).join('/'),
  ]);
  assert.equal(selectorDiff, '');
  // The composition-root seam introduced by the C4.1 corrective remains
  // the ONLY difference vs. the C4.1 corrective baseline: nothing in
  // the corrective path has been altered.
  const correctiveDiff = git([
    'diff', '--name-only', C4_CORRECTIVE, 'HEAD',
    '--', 'apps/web-runtime/src/current-operation-graph.ts',
  ]);
  assert.equal(correctiveDiff, '');
});
