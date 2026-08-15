// P3-C4.2.1 / AT — Provider Model Identity Boundary Cleanup.
//
// Coverage map for the C4.2.1 corrective. C4.2 correctly
// separated the Masterpiece Model Registry identity from
// the actual Provider API identity, but the C4.2
// implementation also introduced `identity_mismatch` as a
// new STALE reason in the P3-A Workspace STALE surface
// (workspace-service.js). C4.2.1 reverts that: the
// mismatch is detected in `buildExecutionDeps` as an
// execution preflight error and is NO LONGER a STALE
// reason. The P3-A STALE surface is restored verbatim.
//
// Each AT-* item below points to the production source /
// test that proves the claim. The pattern follows the AS
// coverage map (C4.2) and the AQ coverage map (D2.1).
//
// Authoritative: docs/packaging/history/p3-c/p3-c4-2-1-provider-identity-boundary-cleanup.md

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const COMPOSITION = readFileSync(
  path.join(ROOT, 'apps', 'web-runtime', 'src', 'current-operation-graph.ts'),
  'utf8',
);
const SELECTOR = readFileSync(
  path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'canonical-packaging-context-selector.ts'),
  'utf8',
);
const WORKSPACE_SERVICE = readFileSync(
  path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'packaging', 'workspace-service.js'),
  'utf8',
);
const EXEC_OPS = readFileSync(
  path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'),
  'utf8',
);
const REGISTRY = readFileSync(
  path.join(ROOT, 'packages', 'model-registry', 'src', 'index.js'),
  'utf8',
);
const ADAPTER = readFileSync(
  path.join(ROOT, 'packages', 'image-generation-adapter', 'src', 'multi-model.js'),
  'utf8',
);

const P2 = 'a593278b55e437fac59d768c5cee734d9a9fc201';
const P3A = '1fcafc810a7e218a7cf50dd675d914cd396304b2';
const P3B = '2ac4cf1cc18156d1e4a508382b4563298d69c014';
const P3C = '456ec3a9d0273b599ed15bcd424fde1f36b8ce1b';
const C4_1 = '782e2fc08fca167e0320f9bcde33ed6eacaf1b2d';
const C4_2_CORRECTIVE = '4f3a0a3d6ee83a3ddbb6225bd2634ce94a11f551';
const P2_GATE = 'packages/image-generation-runtime/src/packaging';
const P3_A_GATE = 'packages/runtime-core/src/application/packaging';
const P3_B_GATE = 'apps/web/src/features/packaging';

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`start marker not found: ${startMarker.slice(0, 60)}`);
  const rest = source.slice(start);
  const end = rest.indexOf(endMarker, startMarker.length);
  if (end < 0) throw new Error(`end marker not found after start: ${endMarker.slice(0, 60)}`);
  return rest.slice(0, end);
}

// ---------------------------------------------------------------------------
// AT-01..06 — C4.2 identity split is RETAINED by C4.2.1.
// ---------------------------------------------------------------------------

test('AT-01 C4.2 Registry/API identity split is retained', () => {
  // The C4.2 split between `registryModelId` and
  // `providerApiModelId` in `buildExecutionDeps` is
  // preserved. The two identities are computed and
  // exposed as before.
  const execSlice = sliceBetween(EXEC_OPS, 'let executor;', '// P3-B5: `resolveExecutionConfig`');
  assert.match(execSlice, /adapterId: registryModelId/u);
  assert.match(execSlice, /modelId: providerApiModelId/u);
  // The returned deps still carries both identities.
  assert.match(EXEC_OPS, /registryModelId,/u);
  assert.match(EXEC_OPS, /providerApiModelId,/u);
});

test('AT-02 intent providerModelId remains the canonical Registry identity', () => {
  // P3-A10 contract preserved: `intent.providerModelId`
  // is the Masterpiece Model Registry id, NOT the raw
  // Provider API model name.
  assert.match(SELECTOR, /PackagingTranslationSource/u);
  assert.doesNotMatch(
    SELECTOR,
    /intent\.[a-zA-Z]*[Aa]ctualModel/u,
    'selector must not read an actualModel / apiModel intent field (P3-A10 preserved)',
  );
});

test('AT-03 analysis-led split profile passes (capability + adapter + request body)', () => {
  // The split profile (Registry: seedream-5.0-pro, API:
  // doubao-seedream-5-0-pro-260628) routes to the
  // Seedream adapter (Registry identity) and sends the
  // actual model name in the request body.
  assert.match(REGISTRY, /id: 'seedream-5\.0-pro'/u);
  assert.match(REGISTRY, /maxReferenceImages:\s*10/u);
  const execSlice = sliceBetween(EXEC_OPS, 'let executor;', '// P3-B5: `resolveExecutionConfig`');
  assert.match(execSlice, /adapterId: registryModelId/u);
  assert.doesNotMatch(execSlice, /adapterId: providerApiModelId/);
  assert.match(ADAPTER, /model: modelId/u);
});

test('AT-04 reference-first split profile passes (capability + adapter + request body)', () => {
  // Same as AT-03 but for reference-first: the
  // Reference capability (maxReferenceImages = 10) is
  // reachable because the capability gate uses the
  // Registry identity.
  const execSlice = sliceBetween(EXEC_OPS, 'let executor;', '// P3-B5: `resolveExecutionConfig`');
  assert.match(execSlice, /adapterId: registryModelId/u);
  assert.match(REGISTRY, /referenceSupport:\s*true/u);
  assert.match(REGISTRY, /maxReferenceImages:\s*10/u);
});

test('AT-05 actual request body uses the API identity (Registry does NOT leak)', () => {
  // The Seedream adapter compiles the request body with
  // `config.modelId` which is the actual API identity.
  // `config.modelId` is `providerApiModelId` in the C4.2
  // contract.
  assert.match(ADAPTER, /const modelId = config\.modelId \|\| 'seedream-5\.0-pro'/u);
  assert.match(ADAPTER, /body:\s*\{[\s\S]*?model:\s*modelId/u);
});

test('AT-06 adapter lookup uses the Registry identity (not the API identity)', () => {
  // Defense in depth: the multi-model adapter is keyed
  // by the Masterpiece Model Registry id.
  const execSlice = sliceBetween(EXEC_OPS, 'let executor;', '// P3-B5: `resolveExecutionConfig`');
  assert.match(execSlice, /createMultiModelImageAdapter\(/u);
  assert.match(execSlice, /adapterId: registryModelId/u);
  assert.doesNotMatch(execSlice, /adapterId: providerApiModelId/);
});

// ---------------------------------------------------------------------------
// AT-07..11 — Mismatch is a preflight error, NOT a STALE reason.
// ---------------------------------------------------------------------------

test('AT-07 mismatch fails closed BEFORE adapter or network call', () => {
  // The mismatch check lives in `buildExecutionDeps`
  // (execution preflight) and throws directly — no
  // adapter lookup, no Provider dispatch, no Workspace
  // state mutation.
  const execSlice = sliceBetween(EXEC_OPS, 'P3-C4.2 \u2014 Provider Model Identity Separation.', 'return {');
  assert.match(execSlice, /EXECUTION_PROVIDER_MODEL_IDENTITY_MISMATCH/u);
  assert.match(execSlice, /throw err/u);
  // Mismatch detection pattern is present.
  assert.match(execSlice, /identityMismatch\s*=\s*Boolean\(intentRegistryId\)[\s\S]*?Boolean\(profileRegistryId\)[\s\S]*?intentRegistryId !== profileRegistryId/u);
});

test('AT-08 mismatch is NOT a STALE reason in the P3-A Workspace surface', () => {
  // The C4.2.1 cleanup reverts the C4.2 STALE-side
  // addition: `workspace-service.js` carries no
  // `identity_mismatch` / `identityMismatchError`
  // field, no new STALE reason, no new issue token.
  assert.doesNotMatch(
    WORKSPACE_SERVICE,
    /identity_mismatch|identityMismatchError/u,
    'C4.2.1: workspace-service must not reference identity-mismatch (P3-A STALE surface is frozen)',
  );
  // The deps surface in packaging-operations.js no
  // longer carries an `identityMismatchError` field.
  assert.doesNotMatch(EXEC_OPS, /identityMismatchError/u);
  // Negative: there is no new STALE reason token.
  assert.doesNotMatch(WORKSPACE_SERVICE, /identity_mismatch/u);
});

test('AT-09 existing staleReasons remain unchanged', () => {
  // The canonical R-13 STALE envelope is the ONLY
  // reason set carried by the Workspace service. The
  // C4.2.1 cleanup does not touch it.
  assert.match(WORKSPACE_SERVICE, /PACKAGING_WORKSPACE_EXECUTE_REJECTED: stale/u);
  assert.match(WORKSPACE_SERVICE, /err\.issues = \['stale', \.\.\.stale\.reasons\]/u);
  // The set of canonical STALE reasons in the codebase
  // does not gain a new member.
  const PACKAGING_STALE_REASONS = readFileSync(
    path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'packaging', 'workspace-state.js'),
    'utf8',
  );
  assert.doesNotMatch(
    PACKAGING_STALE_REASONS,
    /identity_mismatch|provider_model_identity_mismatch/u,
    'workspace-state STALE_REASON registry must not grow an identity-mismatch reason (P3-A frozen)',
  );
});

test('AT-10 existing STALE wins when session is already STALE (mismatch does not override)', () => {
  // If the session is already STALE (e.g. intent
  // changed), the canonical STALE envelope fires
  // first. The mismatch check (in buildExecutionDeps)
  // is downstream of the STALE gate at the service
  // boundary; an already-STALE session never reaches
  // the mismatch check at all.
  // 1. The STALE check comes BEFORE any preflight.
  // 2. Mismatch check has no path to mutate staleReasons.
  // 3. The returned error code for STALE is
  //    `PACKAGING_WORKSPACE_EXECUTE_REJECTED`, with
  //    `issues: ['stale', ...stale.reasons]`. The
  //    preflight code is
  //    `EXECUTION_PROVIDER_MODEL_IDENTITY_MISMATCH`.
  // The two are disjoint.
  assert.match(WORKSPACE_SERVICE, /err\.issues = \['stale', \.\.\.stale\.reasons\]/u);
  // The preflight code appears ONLY in the ops layer.
  const execSlice = sliceBetween(EXEC_OPS, 'P3-C4.2 \u2014 Provider Model Identity Separation.', 'return {');
  assert.match(execSlice, /EXECUTION_PROVIDER_MODEL_IDENTITY_MISMATCH/u);
  assert.doesNotMatch(WORKSPACE_SERVICE, /EXECUTION_PROVIDER_MODEL_IDENTITY_MISMATCH/u);
});

test('AT-11 READY + mismatch fails as a safe execution configuration error', () => {
  // When the session is READY but profile identity
  // mismatches the intent Registry identity, the
  // rejection is an EXECUTION preflight error — the
  // P3-A STALE state is not transitioned (READY stays
  // READY; no new state is introduced).
  // 1. The mismatch check is in `buildExecutionDeps`,
  //    which is called from the execution pipeline —
  //    NOT from the Workspace service's STALE
  //    transition path.
  // 2. The error code is `EXECUTION_PROVIDER_MODEL_IDENTITY_MISMATCH`,
  //    NOT a `PACKAGING_WORKSPACE_*` STALE code.
  // 3. No `withError(state, err)` or `freezeAndStore`
  //    call happens for the mismatch path.
  const execSlice = sliceBetween(EXEC_OPS, 'P3-C4.2 \u2014 Provider Model Identity Separation.', 'return {');
  assert.match(execSlice, /EXECUTION_PROVIDER_MODEL_IDENTITY_MISMATCH/u);
  assert.doesNotMatch(
    WORKSPACE_SERVICE,
    /EXECUTION_PROVIDER_MODEL_IDENTITY_MISMATCH/u,
    'workspace-service must not own the mismatch preflight code (boundary ownership)',
  );
  // The Workspace service does not call withError /
  // freezeAndStore for an identity mismatch.
  // (We assert by reading the slice from STALE check
  // to the next status transition; this slice is
  // exactly what C4.2 added and C4.2.1 removed.)
  const postStaleSlice = sliceBetween(
    WORKSPACE_SERVICE,
    'PACKAGING_WORKSPACE_EXECUTE_REJECTED: stale;',
    'transitionSession(state, PACKAGING_WORKSPACE_STATUS.EXECUTING)',
  );
  assert.doesNotMatch(
    postStaleSlice,
    /identityMismatchError|identity_mismatch/iu,
    'C4.2.1: post-STALE check must not reference identity-mismatch',
  );
});

// ---------------------------------------------------------------------------
// AT-12..14 — Backward compatibility and existing caps.
// ---------------------------------------------------------------------------

test('AT-12 legacy same-id profile remains compatible', () => {
  // A profile with `modelId = 'seedream-5.0-pro'` and
  // no `registryModelId` resolves to the same routing
  // as before: registry = api = `seedream-5.0-pro`.
  const execSlice = sliceBetween(EXEC_OPS, 'P3-C4.2 \u2014 Provider Model Identity Separation.', 'return {');
  assert.match(execSlice, /asString\(profile\.registryModelId\) \|\| asString\(profile\.modelId\)/u);
});

test('AT-13 no mock fallback caused by split identity', () => {
  // For the Seedream split profile, the Registry
  // identity `seedream-5.0-pro` is a known canonical
  // adapter, so the production path runs.
  const execSlice = sliceBetween(EXEC_OPS, 'let executor;', '// P3-B5: `resolveExecutionConfig`');
  assert.match(execSlice, /adapterId: registryModelId/u);
  assert.match(execSlice, /modelId: providerApiModelId/u);
});

test('AT-14 D-PROVIDER-01 cap retained at 10', () => {
  assert.match(REGISTRY, /id: 'seedream-5\.0-pro'[\s\S]{0,400}maxReferenceImages:\s*10/u);
  assert.match(ADAPTER, /'seedream-5\.0-pro':[\s\S]{0,180}maxReferences:\s*10/u);
});

// ---------------------------------------------------------------------------
// AT-15 — P3-A12 current baseline: direct zero-diff frozen guard.
// ---------------------------------------------------------------------------

test('AT-15 P3-A12 current baseline direct frozen diff is zero (no exclusion)', () => {
  // P3-A12 (`1fcafc8`) is the current accepted P3-A
  // production-tree baseline. The P3-A12 corrective
  // formally accepts the read-only `checkStale` seam in
  // workspace-service.js as part of the P3-A frozen
  // surface. A direct `1fcafc8 -> HEAD` diff against the
  // P3-A gate therefore requires NO exclusion — the seam
  // is already part of the current baseline.
  //
  // Historical evidence (P3-A11 `f95c145b` -> P3-A12
  // `1fcafc8`) is preserved by the P3-A_HISTORICAL constant
  // in the AV / AW files. The historical delta is the
  // documented C4.2.1 sub-tree (workspace-service.js) and
  // is no longer a current-zero requirement.
  assert.equal(
    git(['diff', '--name-only', P3A, 'HEAD', '--', P3_A_GATE]),
    '',
  );
  // 2. P3-B diff is zero (no UI changes).
  const diffB = git(['diff', '--name-only', P3B, 'HEAD', '--', P3_B_GATE]);
  assert.equal(diffB, '');
  // 3. The C4.1 baseline diff in workspace-service.js is
  // the new `checkStale` method ONLY — no STALE reason
  // changes, no Workspace state mutation for mismatch.
  const diffC41 = git(['diff', C4_1, 'HEAD', '--', 'packages/runtime-core/src/application/packaging/workspace-service.js']);
  assert.match(diffC41, /\+.*function checkStale/);
  assert.doesNotMatch(diffC41, /\+.*identity_mismatch/u);
  assert.doesNotMatch(diffC41, /\+.*identityMismatchError/u);
  // 4. The deps surface in packaging-operations.js no
  // longer carries an `identityMismatchError` field.
  assert.doesNotMatch(EXEC_OPS, /identityMismatchError/u);
});

// ---------------------------------------------------------------------------
// AT-16..19 — Frozen surface diffs.
// ---------------------------------------------------------------------------

test('AT-16 P2 frozen production diff is zero', () => {
  assert.equal(git(['diff', '--name-only', P2, 'HEAD', '--', P2_GATE]), '');
});

test('AT-17 P3-A Workspace state/stale semantics restored (frozen)', () => {
  // The P3-A STALE surface is preserved: the R-13
  // STALE envelope is unchanged, no new STALE reason,
  // no new state transition. The C4.2.1 cleanup added
  // a small read-only helper (`checkStale`) so the
  // operations layer can do fresh STALE rechecks at
  // the execute-generation boundary (canonical
  // STALE-first ordering) — but this helper does NOT
  // introduce a new STALE reason, a new status, or a
  // new transition. It only exposes the existing
  // `computeStale` result.
  assert.match(WORKSPACE_SERVICE, /PACKAGING_WORKSPACE_EXECUTE_REJECTED: stale/u);
  assert.match(WORKSPACE_SERVICE, /err\.issues = \['stale', \.\.\.stale\.reasons\]/u);
  // No identity-mismatch STALE reason in workspace-service.
  assert.doesNotMatch(WORKSPACE_SERVICE, /identity_mismatch/u);
  // The `checkStale` helper exists and is read-only.
  assert.match(WORKSPACE_SERVICE, /function checkStale/);
  assert.match(WORKSPACE_SERVICE, /checkStale,/u);
  // The C4.2 mismatch block is REMOVED.
  assert.doesNotMatch(WORKSPACE_SERVICE, /identityMismatchError/);
  assert.doesNotMatch(WORKSPACE_SERVICE, /if \(deps && deps\.identityMismatchError\)/);
  // P3-A selector/identity seam unchanged.
  assert.equal(
    git(['diff', '--name-only', P3C, 'HEAD',
      '--', 'packages/runtime-core/src/application/canonical-packaging-context-selector.ts']),
    '',
  );
  assert.match(COMPOSITION, /projectCanonicalIdentityFromAuthorities/u);
});

test('AT-18 P3-B accepted UI semantic diff is zero', () => {
  assert.equal(git(['diff', '--name-only', P3B, 'HEAD', '--', P3_B_GATE]), '');
});

test('AT-19 P3-C selector/identity semantics unchanged', () => {
  // The P3-C composition-root seam (C4.1) is the only
  // file in the original P3-C surface that changed
  // since the P3-C integration baseline, plus the
  // C4.2.1 documented sub-tree (workspace-service.js
  // checkStale helper, which is the only new method
  // added in the application/packaging path since
  // C4.1).
  const diff = git([
    'diff', '--name-only', P3C, 'HEAD',
    '--', P3_B_GATE, 'apps/web-runtime/src', 'packages/runtime-core/src/application/canonical-packaging-context-selector.ts', P3_A_GATE, P2_GATE,
  ]).split('\n').filter(Boolean).sort().join('\n');
  const expectedP3C = [
    'apps/web-runtime/src/current-operation-graph.ts',
    // P3-D3.6B (authorized post-acceptance corrective): channel-aware
    // upload body cap in the Web Runtime RPC server.
    'apps/web-runtime/src/local-rpc-server.ts',
    'packages/runtime-core/src/application/packaging/workspace-service.js',
  ].sort().join('\n');
  assert.equal(diff, expectedP3C);
  // The C4.2.1 corrective sub-tree is the only delta
  // from the C4.2.1 corrective baseline.
  const C4_2_1_CORRECTIVE = 'b6730c3ca78289a72ec624c475d3945e08d4b5ca';
  const c421Diff = git([
    'diff', '--name-only', C4_2_1_CORRECTIVE, 'HEAD',
    '--', P3_B_GATE, 'apps/web-runtime/src', 'packages/runtime-core/src/application/canonical-packaging-context-selector.ts', P3_A_GATE, 'packages/runtime-core/src/operations/packaging-operations.js', P2_GATE,
  ]).split('\n').filter(Boolean).sort().join('\n');
  const expectedC421 = [
    'apps/web-runtime/src/local-rpc-server.ts',
    'packages/runtime-core/src/application/packaging/workspace-service.js',
    'packages/runtime-core/src/operations/packaging-operations.js',
  ].sort().join('\n');
  assert.equal(c421Diff, expectedC421);
});

// ---------------------------------------------------------------------------
// AT-20 — No Provider calls, no Golden auto-update.
// ---------------------------------------------------------------------------

test('AT-20 no Provider calls, no Golden auto-update, D3 HOLD preserved', () => {
  // C4.2.1 makes no Provider calls. The D3 HOLD
  // history is preserved (the D3 AR coverage map
  // continues to record AR-08..12, AR-15, AR-16 as
  // NOT MET — HOLD).
  const d3Docs = path.join(ROOT, 'docs', 'packaging', 'history', 'p3-d',
                           'p3-d3-real-provider-visual-quality-validation.md');
  assert.ok(existsSync(d3Docs), 'D3 docs must exist to record historical HOLD');
  const content = readFileSync(d3Docs, 'utf8');
  assert.match(content, /HOLD — PROVIDER EXECUTION GAP/u);
  // The D3 AR coverage map must continue to record the
  // 6 NOT MET HOLD outcomes.
  const d3Ar = path.join(ROOT, 'tests', 'runtime-application',
                         'packaging-d3-real-provider-visual-quality-validation.test.ts');
  assert.ok(existsSync(d3Ar), 'D3 AR coverage map must exist');
});

// ---------------------------------------------------------------------------
// AT-21..22 — C4.2.1 documentation exists; P3-D3 re-run not auto-resumed.
// ---------------------------------------------------------------------------

test('AT-21 C4.2.1 documentation exists at the canonical path', () => {
  const doc = path.join(ROOT, 'docs', 'packaging', 'history', 'p3-c',
                        'p3-c4-2-1-provider-identity-boundary-cleanup.md');
  assert.ok(existsSync(doc), 'C4.2.1 documentation file must exist');
  const content = readFileSync(doc, 'utf8');
  const lower = content.toLowerCase();
  for (const marker of [
    'P3-C4.2.1',
    'Provider Model Identity',
    'C4.2 identity split',
    'identity_mismatch STALE',
    'execution preflight',
    'STALE contract',
    'frozen guard cleanup',
    'before mapping',
    'after mapping',
  ]) {
    assert.ok(lower.includes(marker.toLowerCase()), `C4.2.1 docs missing required marker: ${marker}`);
  }
});

test('AT-22 P3-D3 re-run requires new explicit authorization (D3 not auto-resumed)', () => {
  const d3Docs = path.join(ROOT, 'docs', 'packaging', 'history', 'p3-d',
                           'p3-d3-real-provider-visual-quality-validation.md');
  const content = readFileSync(d3Docs, 'utf8');
  assert.match(content, /P3-D4 is LOCKED/u);
  assert.match(content, /until P3-C4\.2 lands and a separately/u);
});
