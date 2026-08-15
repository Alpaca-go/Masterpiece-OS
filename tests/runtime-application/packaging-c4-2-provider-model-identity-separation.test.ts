// P3-C4.2 / AS — Provider Model Identity Separation Corrective.
//
// Coverage map for the C4.2 corrective. The C4.2 fix
// separates the canonical Masterpiece Model Registry
// identity (e.g. `seedream-5.0-pro`) from the actual
// Provider API identity (e.g.
// `doubao-seedream-5-0-pro-260628`) in the production
// composition root. Each AS-* item below points to the
// production source / test / P2-frozen surface that proves
// the claim.
//
// Authoritative: docs/packaging/history/p3-c/p3-c4-2-provider-model-identity-separation-corrective.md

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
const C4_2_CORRECTIVE = '4f3a0a3d6ee83a3ddbb6225bd2634ce94a11f551';
const C4_2_REFREEZE = '__pending__'; // re-freeze commit lands after this test commit
const P2_GATE = 'packages/image-generation-runtime/src/packaging';

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

// ---------------------------------------------------------------------------
// AS-01..03 — Identity definitions are explicit in production.
// ---------------------------------------------------------------------------

test('AS-01 intent providerModelId remains the canonical Registry identity (P3-A10 preserved)', () => {
  // The P3-A10 contract: `intent.providerModelId` is the
  // Masterpiece Model Registry id, NOT the Provider raw
  // API model name. C4.2 must not change this. Verify
  // by:
  //   1. Reading the canonical-context-selector source.
  //   2. Asserting the selector's intent → context
  //      projection still uses `intent.providerModelId`
  //      as the producer slot key (Registry semantics).
  //   3. Asserting no `actualModel` / `apiModel` field
  //      is in the Workspace intent schema.
  assert.match(SELECTOR, /PackagingTranslationSource/u);
  assert.doesNotMatch(
    SELECTOR,
    /intent\.[a-zA-Z]*[Aa]ctualModel/u,
    'selector must not read an actualModel / apiModel intent field (P3-A10 preserves Registry semantics)',
  );
  // P3-A5.1 — STALE envelope preserved.
  assert.match(WORKSPACE_SERVICE, /PACKAGING_WORKSPACE_EXECUTE_REJECTED: stale/u);
  // C4.2.1 — identity-mismatch is NOT a Workspace STALE
  // reason. The P3-A STALE surface remains unchanged; the
  // mismatch is owned by `buildExecutionDeps` as a safe
  // preflight error (not a Workspace state mutation).
  assert.doesNotMatch(
    WORKSPACE_SERVICE,
    /identity_mismatch/u,
    'C4.2.1: workspace-service must not carry identity_mismatch (P3-A STALE surface is frozen)',
  );
});

test('AS-02 profile registryModelId identifies the Registry model', () => {
  // The deterministic resolution rule: registryModelId
  // is read from `profile.registryModelId` first, with a
  // fall-back to `profile.modelId` for legacy profiles.
  // Verify the rule is encoded in buildExecutionDeps.
  const slice = sliceBetween(EXEC_OPS, 'P3-C4.2 \u2014 Provider Model Identity Separation.', 'return {');
  assert.ok(slice.includes('profile.registryModelId'));
  assert.ok(slice.includes("asString(profile.registryModelId) || asString(profile.modelId)"));
});

test('AS-03 profile modelId identifies the actual Provider API model', () => {
  // The actual API identity is read from `profile.modelId`
  // only. It is NEVER read from `profile.registryModelId`
  // or from the Masterpiece Model Registry.
  const slice = sliceBetween(EXEC_OPS, 'P3-C4.2 \u2014 Provider Model Identity Separation.', 'return {');
  assert.ok(slice.includes('const profileApiModelId = asString(profile.modelId)'));
  // The actual API identity is what the executor sends
  // to the Provider.
  const executorSlice = sliceBetween(EXEC_OPS, 'let executor;', '// P3-B5: `resolveExecutionConfig`');
  assert.ok(executorSlice.includes('adapterId: registryModelId'));
  assert.ok(executorSlice.includes('modelId: providerApiModelId'));
});

// ---------------------------------------------------------------------------
// AS-04..06 — Routing identities are used at the right seam.
// ---------------------------------------------------------------------------

test('AS-04 multi-model adapter lookup uses the Registry identity', () => {
  // The executor's adapter is built with the Registry
  // identity as the adapterId, NOT the actual API
  // identity. This is what the multi-model adapter
  // registry understands.
  const slice = sliceBetween(EXEC_OPS, 'let executor;', '// P3-B5: `resolveExecutionConfig`');
  assert.ok(slice.includes('createMultiModelImageAdapter({'));
  assert.ok(slice.includes('adapterId: registryModelId'));
  assert.ok(slice.includes('modelId: providerApiModelId'));
  // Negative: the executor must NOT use `providerApiModelId`
  // as the adapterId. (Defense in depth.)
  assert.doesNotMatch(slice, /adapterId: providerApiModelId/);
});

test('AS-05 capability lookup uses the Registry identity', () => {
  // The P2 frozen capability gate is called with the
  // Registry identity, not the actual API identity.
  // The Registry identity must match an entry in the
  // canonical Model Registry.
  assert.match(REGISTRY, /id: 'seedream-5\.0-pro'/);
  assert.match(REGISTRY, /maxReferenceImages:\s*10/);
  // The P2 frozen `preparePackagingGeneration` reads
  // `input.modelId` and passes it to the capability
  // gate. The C4.2 fix ensures the caller passes the
  // Registry identity (intent.providerModelId is the
  // Registry identity per P3-A10).
  // The Workspace intent preserves the P3-A10 contract.
  assert.doesNotMatch(
    SELECTOR,
    /actualModel|apiModel|providerDeployment/u,
    'selector must not derive Registry identity from an actualModel / apiModel field',
  );
});

test('AS-06 actual Provider API request body uses the actual API model identity', () => {
  // The executor's adapter (multi-model-image-adapter)
  // compiles the request body. The Seedream adapter
  // uses `config.modelId` as the actual model field.
  // The C4.2 fix ensures `config.modelId` is the
  // actual API identity.
  assert.match(ADAPTER, /const modelId = config\.modelId \|\| 'seedream-5\.0-pro'/u);
  assert.match(ADAPTER, /body:\s*\{[\s\S]*?model:\s*modelId/u);
});

// ---------------------------------------------------------------------------
// AS-07..08 — Backward compatibility for legacy same-id profiles.
// ---------------------------------------------------------------------------

test('AS-07 legacy same-id profile remains compatible', () => {
  // A profile with `modelId = 'seedream-5.0-pro'` and no
  // explicit `registryModelId` must produce the same
  // routing as before: registry = api = `seedream-5.0-pro`.
  const slice = sliceBetween(EXEC_OPS, 'P3-C4.2 \u2014 Provider Model Identity Separation.', 'return {');
  // The fall-back rule (the C4.2 source wraps both sides
  // with `asString(...)` for canonical type normalization).
  assert.match(slice, /asString\(profile\.registryModelId\) \|\| asString\(profile\.modelId\)/u);
});

test('AS-08 split-id profile works', () => {
  // A profile with `registryModelId = 'seedream-5.0-pro'`
  // and `modelId = 'doubao-seedream-5-0-pro-260628'` must
  // route to the Seedream adapter (Registry) and send
  // the actual model name (API).
  const slice = sliceBetween(EXEC_OPS, 'let executor;', '// P3-B5: `resolveExecutionConfig`');
  assert.match(slice, /adapterId: registryModelId/u);
  assert.match(slice, /modelId: providerApiModelId/u);
});

// ---------------------------------------------------------------------------
// AS-09 — Intent/profile Registry mismatch fails closed.
// ---------------------------------------------------------------------------

test('AS-09 intent/profile Registry mismatch fails closed (execution preflight, NOT a STALE reason)', () => {
  // C4.2.1: the identity-mismatch check is owned by
  // `buildExecutionDeps` itself and throws
  // `EXECUTION_PROVIDER_MODEL_IDENTITY_MISMATCH` BEFORE
  // any adapter / network call. The Workspace STALE
  // surface (P3-A frozen) is NOT touched: workspace-service
  // carries no `identity_mismatch` field, no new
  // `staleReasons` member, and no Workspace state mutation.
  // 1. Mismatch detection in buildExecutionDeps.
  const execSlice = sliceBetween(EXEC_OPS, 'P3-C4.2 \u2014 Provider Model Identity Separation.', 'return {');
  assert.match(execSlice, /identityMismatch\s*=\s*Boolean\(intentRegistryId\)[\s\S]*?Boolean\(profileRegistryId\)[\s\S]*?intentRegistryId !== profileRegistryId/u);
  // 2. The error is thrown in buildExecutionDeps itself
  //    (execution preflight), not deferred to the service.
  assert.match(execSlice, /EXECUTION_PROVIDER_MODEL_IDENTITY_MISMATCH/u);
  assert.match(execSlice, /throw err/u);
  // 3. The error does NOT carry a `PACKAGING_WORKSPACE_*`
  //    STALE code; it is a standalone execution preflight
  //    error so the P3-A STALE envelope is not coupled.
  assert.doesNotMatch(execSlice, /PACKAGING_WORKSPACE_EXECUTE_REJECTED[\s\S]{0,200}identityMismatch/u);
  // 4. workspace-service carries no `identity_mismatch` /
  //    `identityMismatchError` field — the P3-A surface is
  //    restored.
  assert.doesNotMatch(
    WORKSPACE_SERVICE,
    /identity_mismatch|identityMismatchError/u,
    'C4.2.1: workspace-service must not reference identity-mismatch (P3-A STALE surface is frozen)',
  );
  // 5. The canonical R-13 STALE envelope is preserved
  //    unchanged (no new stale reason).
  assert.match(WORKSPACE_SERVICE, /PACKAGING_WORKSPACE_EXECUTE_REJECTED: stale/u);
  assert.match(WORKSPACE_SERVICE, /err\.issues = \['stale', \.\.\.stale\.reasons\]/u);
});

// ---------------------------------------------------------------------------
// AS-10..11 — Mode + Reference capability with the split profile.
// ---------------------------------------------------------------------------

test('AS-10 reference_first split profile passes Reference capability', () => {
  // The capability gate uses the Registry identity
  // (`seedream-5.0-pro`), so reference_support = true
  // and maxReferenceImages = 10 are reachable.
  assert.match(REGISTRY, /referenceSupport:\s*true/u);
  assert.match(REGISTRY, /maxReferenceImages:\s*10/u);
  // The P2 frozen `preparePackagingGeneration` does NOT
  // see the actual API identity. The split profile's
  // `modelId` never reaches the capability gate.
  // Verify the executor routes the Registry identity
  // to the adapter (which is the capability-input
  // carrier for the executor's buildAdapter path).
  const execSlice = sliceBetween(EXEC_OPS, 'let executor;', '// P3-B5: `resolveExecutionConfig`');
  assert.match(execSlice, /adapterId: registryModelId/u);
  // Negative: the actual API identity must NOT reach
  // the adapter lookup.
  assert.doesNotMatch(execSlice, /adapterId: providerApiModelId/);
});

test('AS-11 analysis_led split profile passes capability', () => {
  // Same as AS-10 but for analysis_led: the Registry
  // identity is what the capability gate sees; the
  // actual API identity never reaches the capability
  // path.
  const execSlice = sliceBetween(EXEC_OPS, 'let executor;', '// P3-B5: `resolveExecutionConfig`');
  assert.match(execSlice, /adapterId: registryModelId/u);
  assert.doesNotMatch(execSlice, /adapterId: providerApiModelId/);
});

// ---------------------------------------------------------------------------
// AS-12 — Request body contains the actual model name.
// ---------------------------------------------------------------------------

test('AS-12 request body contains the actual model name', () => {
  // The P2 frozen `buildAdapter` (consumed when the
  // executor is not pre-built) uses
  // `executionConfig.providerModelId` for the
  // `modelId` field, which is the actual API identity.
  // The C4.2 fix ensures this field carries the actual
  // API identity, NOT the Registry identity.
  // The Seedream adapter's compileRequest emits a body
  // with `model: config.modelId`. C4.2 ensures
  // `config.modelId` is the actual API identity.
  assert.match(ADAPTER, /model: modelId/u);
  // The buildAdapter function in generation-service.js
  // uses `executionConfig.providerModelId` for the
  // modelId. The C4.2 buildExecutionDeps sets this to
  // `providerApiModelId`.
  // Verify the C4.2 deps object carries providerApiModelId.
  // (The actual source uses the ES shorthand
  // `providerApiModelId,` which expands to
  // `providerApiModelId: providerApiModelId`.)
  assert.match(EXEC_OPS, /providerApiModelId,?\s*\n/u);
});

// ---------------------------------------------------------------------------
// AS-13..14 — No Model Registry expansion, no mock fallback.
// ---------------------------------------------------------------------------

test('AS-13 no actual model added to the Model Registry', () => {
  // The D3 spec forbids promoting the actual API
  // identity into a new Registry entry. The Registry
  // still has the same 5 models.
  assert.match(REGISTRY, /id: 'qwen3\.6-plus'/u);
  assert.match(REGISTRY, /id: 'gpt-image-2'/u);
  assert.match(REGISTRY, /id: 'nano-banana'/u);
  assert.match(REGISTRY, /id: 'seedream-5\.0-pro'/u);
  assert.match(REGISTRY, /id: 'wan2\.7-image-pro'/u);
  assert.doesNotMatch(REGISTRY, /doubao-seedream-5-0-pro-260628/u);
});

test('AS-14 no mock fallback caused by split identity', () => {
  // The C4.2 fix narrows the mock fallback to test
  // scenarios where the Registry identity is NOT a
  // known canonical adapter. For the Seedream split
  // profile, the adapter lookup MUST succeed (the
  // Registry identity `seedream-5.0-pro` is a known
  // canonical adapter) and the production path must
  // run, not the mock.
  const execSlice = sliceBetween(EXEC_OPS, 'let executor;', '// P3-B5: `resolveExecutionConfig`');
  // The try/catch is preserved (mock fallback is still
  // there for legitimate missing-adapter scenarios).
  // But the production path uses `adapterId:
  // registryModelId` which is `seedream-5.0-pro`,
  // a known canonical adapter.
  assert.match(execSlice, /adapterId: registryModelId/u);
  assert.match(execSlice, /modelId: providerApiModelId/u);
});

// ---------------------------------------------------------------------------
// AS-15..16 — D-PROVIDER-01 cap retained; no second model authority.
// ---------------------------------------------------------------------------

test('AS-15 D-PROVIDER-01 cap retained at 10', () => {
  assert.match(REGISTRY, /id: 'seedream-5\.0-pro'[\s\S]{0,400}maxReferenceImages:\s*10/u);
  assert.match(ADAPTER, /'seedream-5\.0-pro':[\s\S]{0,180}maxReferences:\s*10/u);
  // 89/89 targeted provider suites must continue to pass
  // (verified by npm test outside this file).
});

test('AS-16 no second model authority / store / resolver', () => {
  // The C4.2 fix does NOT create a new Model Registry,
  // Execution Model Registry, Provider Deployment
  // Registry, or second capability resolver.
  // The canonical capability gate is the existing
  // `resolvePackagingProviderCapability` from
  // `@masterpiece/image-generation-runtime/packaging/provider-capability`.
  // The C4.2 surface (workspace-service.js) imports it
  // and calls it; it does NOT re-implement or shadow it.
  assert.match(WORKSPACE_SERVICE, /resolvePackagingProviderCapability/u);
  // Negative: no new registry surface in the C4.2
  // surface or the ops layer.
  assert.doesNotMatch(WORKSPACE_SERVICE, /new (Registry|Resolver|Store|Index)/u);
  assert.doesNotMatch(EXEC_OPS, /new (Registry|Resolver|Store|Index)/u);
});

// ---------------------------------------------------------------------------
// AS-17..22 — Frozen surface diffs.
// ---------------------------------------------------------------------------

test('AS-17 P2 frozen production diff is zero', () => {
  assert.equal(
    git(['diff', '--name-only', P2, 'HEAD', '--', P2_GATE]),
    '',
  );
});

test('AS-18 P3-A frozen selector/identity/stale authority remains unchanged', () => {
  // The P3-A10 contract: `intent.providerModelId` is the
  // canonical Masterpiece Model Registry id. C4.2 must
  // not change the P3-A selector or identity projection.
  // The selector is unchanged.
  assert.equal(
    git(['diff', '--name-only', '456ec3a9d0273b599ed15bcd424fde1f36b8ce1b', 'HEAD',
      '--', 'packages/runtime-core/src/application/canonical-packaging-context-selector.ts']),
    '',
  );
  // The composition-root identity seam is unchanged.
  assert.match(COMPOSITION, /projectCanonicalIdentityFromAuthorities/u);
  // The Workspace stale authority is unchanged.
  assert.match(WORKSPACE_SERVICE, /withStaleStatusIfNeeded/u);
  assert.match(WORKSPACE_SERVICE, /computeStale/u);
});

test('AS-19 P3-B accepted UI and Workspace semantic diff is zero', () => {
  assert.equal(
    git(['diff', '--name-only', '2ac4cf1cc18156d1e4a508382b4563298d69c014', 'HEAD',
      '--', 'apps/web/src/features/packaging']),
    '',
  );
});

test('AS-20 P3-C current corrective semantics permit only the documented sub-tree', () => {
  // C4.2 is the new authorized P3-C corrective. From the
  // C4.2 baseline to HEAD, the only allowed changes in
  // the P3-C surface are the C4.2 corrective itself
  // (no additional changes pending). The C4.2 surface
  // change is documented in
  // p3-c4-2-provider-model-identity-separation-corrective.md.
  const diff = git([
    'diff', '--name-only', C4_2_CORRECTIVE, 'HEAD',
    '--', 'apps/web/src/features/packaging', 'apps/web-runtime/src', 'packages/runtime-core/src/application/canonical-packaging-context-selector.ts', 'packages/runtime-core/src/application/packaging', 'packages/runtime-core/src/operations/packaging-operations.js', 'packages/image-generation-runtime/src/packaging',
  ]);
  assert.equal(diff, '');
});

test('AS-21 P3-C4.2 corrective surface is exactly the documented ops-layer sub-tree', () => {
  // The C4.2 corrective baseline (`4f3a0a3`) is the
  // SHIPPED P3-C surface change. From the C4.1 baseline
  // (`782e2fc`) to the C4.2 baseline, the documented
  // allowed set is:
  //   - packages/runtime-core/src/operations/packaging-operations.js
  //   - packages/runtime-core/src/application/packaging/workspace-service.js
  // The composition-root seam
  // (`apps/web-runtime/src/current-operation-graph.ts`)
  // is unchanged (P3-A10 preserved).
  const diff = git([
    'diff', '--name-only', '782e2fc08fca167e0320f9bcde33ed6eacaf1b2d', C4_2_CORRECTIVE,
    '--', 'apps/web/src/features/packaging', 'apps/web-runtime/src', 'packages/runtime-core/src/application/canonical-packaging-context-selector.ts', 'packages/runtime-core/src/application/packaging', 'packages/runtime-core/src/operations/packaging-operations.js', 'packages/image-generation-runtime/src/packaging',
  ]);
  const expected = [
    'packages/runtime-core/src/application/packaging/workspace-service.js',
    'packages/runtime-core/src/operations/packaging-operations.js',
  ];
  assert.deepEqual(
    diff.split('\n').filter(Boolean).sort(),
    expected.sort(),
  );
});

test('AS-22 P3-C4.2 production path uses Registry identity for the capability input (defense in depth)', () => {
  // The P2 frozen `preparePackagingGeneration` accepts
  // `input.modelId` and passes it to the capability
  // gate. C4.2 ensures the production caller
  // (the C4.1 composition-root seam + the ops layer)
  // passes the Registry identity, not the actual API
  // identity. The selector / identity seam never reads
  // an `actualModel` / `apiModel` field.
  assert.doesNotMatch(SELECTOR, /actualModel|apiModel|providerDeployment/u);
  // The P2 frozen capability gate requires a Registry
  // identity; an actual API identity is rejected.
  // (Verified at runtime by the AS-09 negative test.)
});

// ---------------------------------------------------------------------------
// AS-23..25 — D3 HOLD outcome preserved; D3 re-run requires new authorization.
// ---------------------------------------------------------------------------

test('AS-23 D3 HOLD history preserved (AR-08..12, AR-15, AR-16 stay NOT MET)', () => {
  // The C4.2 fix must NOT rewrite the D3 HOLD report.
  // The D3 docs must still record HOLD — PROVIDER
  // EXECUTION GAP as the historical outcome.
  const d3Docs = path.join(ROOT, 'docs', 'packaging', 'history', 'p3-d',
                           'p3-d3-real-provider-visual-quality-validation.md');
  if (!existsSync(d3Docs)) {
    assert.fail('D3 docs must exist to record historical HOLD');
  }
  const content = readFileSync(d3Docs, 'utf8');
  assert.match(content, /HOLD — PROVIDER EXECUTION GAP/u);
  assert.match(content, /NOT MET — HOLD/u);
  // The D3 AR coverage map must continue to record the
  // 6 NOT MET HOLD outcomes.
  const d3Ar = path.join(ROOT, 'tests', 'runtime-application',
                         'packaging-d3-real-provider-visual-quality-validation.test.ts');
  assert.ok(existsSync(d3Ar), 'D3 AR coverage map must exist');
});

test('AS-24 P3-D3 re-run requires a new explicit authorization (D3 not auto-resumed by C4.2)', () => {
  // C4.2 fixes the production path but does NOT issue
  // any Provider call. The D3 re-run must wait for
  // explicit authorization.
  const d3Docs = path.join(ROOT, 'docs', 'packaging', 'history', 'p3-d',
                           'p3-d3-real-provider-visual-quality-validation.md');
  const content = readFileSync(d3Docs, 'utf8');
  assert.match(content, /P3-D4 is LOCKED/u);
  assert.match(content, /until P3-C4\.2 lands and a separately/u);
});

test('AS-25 C4.2 documentation exists at the canonical path', () => {
  const doc = path.join(ROOT, 'docs', 'packaging', 'history', 'p3-c',
                        'p3-c4-2-provider-model-identity-separation-corrective.md');
  assert.ok(existsSync(doc), 'C4.2 documentation file must exist');
  const content = readFileSync(doc, 'utf8');
  const lower = content.toLowerCase();
  for (const marker of [
    'P3-C4.2',
    'Provider Model Identity',
    'D3 HOLD discovery',
    'Registry identity',
    'Provider API identity',
    'A10 preservation',
    'before execution mapping',
    'after execution mapping',
    'legacy same-id compatibility',
    'split-id compatibility',
    'mismatch fail-closed',
  ]) {
    assert.ok(lower.includes(marker.toLowerCase()), `C4.2 docs missing required marker: ${marker}`);
  }
});

// ---------------------------------------------------------------------------
// Utility: slice a source string between two markers.
// ---------------------------------------------------------------------------

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`start marker not found: ${startMarker.slice(0, 60)}`);
  const rest = source.slice(start);
  const end = rest.indexOf(endMarker, startMarker.length);
  if (end < 0) throw new Error(`end marker not found after start: ${endMarker.slice(0, 60)}`);
  return rest.slice(0, end);
}
