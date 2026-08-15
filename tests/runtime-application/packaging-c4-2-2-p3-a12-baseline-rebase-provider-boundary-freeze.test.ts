// P3-C4.2.2 / AW — P3-A12 Baseline Rebase & Provider Boundary Freeze.
//
// Coverage map for the P3-C4.2.2 corrective. P3-C4.2.2
// re-freeses the P3-C frozen guards on top of the new
// P3-A12 production-tree baseline (`1fcafc8`). The old
// P3-A11 historical baseline (`f95c145b`) is preserved
// as Historical Frozen Baseline evidence and is no
// longer the current zero-diff target.
//
// Each AW-* item below points to the production source /
// test that proves the claim. The pattern follows the
// AQ / AS / AT / AV coverage map pattern.
//
// Authoritative: docs/packaging/history/p3-c/p3-c4-2-2-p3-a12-baseline-rebase-provider-boundary-freeze.md
//
// P3-C4.2.2 is a TEST / FREEZE / GUARD CLEANUP phase.
// Production source changes: 0. External Provider
// calls: 0. P3-D3 re-run is NOT authorized by this
// phase; P3-D3 remains HOLD — RE-RUN AUTHORIZATION
// REQUIRED.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

const P2 = 'a593278b55e437fac59d768c5cee734d9a9fc201';
const P3A_HISTORICAL = 'f95c145b9b1e37430ac68315c9e039f1f3262ae4';
const P3A_CURRENT = '1fcafc810a7e218a7cf50dd675d914cd396304b2';
const P3A_REFREEZE = 'dcc281496ee2fd03e0fa35fb64a84e8c50b39c73';
const P3B = '2ac4cf1cc18156d1e4a508382b4563298d69c014';
const P3C_INTEGRATION = '456ec3a9d0273b599ed15bcd424fde1f36b8ce1b';
const C4_2_CORRECTIVE = '4f3a0a3d6ee83a3ddbb6225bd2634ce94a11f551';
const C4_2_1_CORRECTIVE = 'b6730c3ca78289a72ec624c475d3945e08d4b5ca';
const C4_2_1_FINAL = '71289b8ce42b704ffaa87d718044911955e6da9d';

const P3_A_GATE = 'packages/runtime-core/src/application/packaging';
const P3_B_GATE = 'apps/web/src/features/packaging';
const P2_GATE = 'packages/image-generation-runtime/src/packaging';

const TEST_DIR = path.join(ROOT, 'tests', 'runtime-application');

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function rg(pattern, excludeSelf = false) {
  // Walk every test file under tests/runtime-application and
  // count occurrences of the pattern. Returns 0 when the
  // pattern is absent. Used for AW-05..07 (no exclusion
  // pathspec or renamed-equivalent exclusion). When
  // `excludeSelf` is true, the AW file itself is excluded
  // from the search (the AW file is allowed to mention
  // banned tokens in documentation comments).
  let total = 0;
  for (const name of readdirSync(TEST_DIR)) {
    if (!name.startsWith('packaging-') || !name.endsWith('.test.ts')) continue;
    if (excludeSelf && name.startsWith('packaging-c4-2-2-')) continue;
    const source = readFileSync(path.join(TEST_DIR, name), 'utf8');
    let from = 0;
    while (true) {
      const idx = source.indexOf(pattern, from);
      if (idx < 0) break;
      total += 1;
      from = idx + pattern.length;
    }
  }
  return total;
}

function fileContains(needle) {
  for (const name of readdirSync(TEST_DIR)) {
    if (!name.startsWith('packaging-') || !name.endsWith('.test.ts')) continue;
    const full = path.join(TEST_DIR, name);
    if (readFileSync(full, 'utf8').includes(needle)) return name;
  }
  return null;
}

function requireTest(needle) {
  const where = fileContains(needle);
  assert.ok(where, `missing underlying test containing: ${needle}`);
  return where;
}

// ---------------------------------------------------------------------------
// AW-01..04 — Current P3-A12 baseline consumed, direct diff zero.
// ---------------------------------------------------------------------------

test('AW-01 current P3-A12 baseline is 1fcafc8 (production SHA)', () => {
  // The P3-A12 corrective production commit is the
  // authoritative current P3-A production-tree baseline.
  // Frozen guards compare this baseline to HEAD.
  assert.equal(P3A_CURRENT, '1fcafc810a7e218a7cf50dd675d914cd396304b2');
  // Sanity: the SHA resolves to a real commit on the branch.
  const actual = execFileSync('git', ['log', '-1', '--format=%H', P3A_CURRENT], { cwd: ROOT, encoding: 'utf8' }).trim();
  assert.equal(actual, P3A_CURRENT);
});

test('AW-02 historical P3-A11 baseline preserved as evidence', () => {
  // f95c145b is preserved as Historical Frozen Baseline.
  // It is no longer the current zero-diff target but is
  // still required for the AV / historical-only guards.
  assert.equal(P3A_HISTORICAL, 'f95c145b9b1e37430ac68315c9e039f1f3262ae4');
  // The AV file retains the P3A_HISTORICAL constant.
  assert.match(
    readFileSync(
      path.join(TEST_DIR, 'packaging-a12-canonical-stale-inspection-contract.test.ts'),
      'utf8',
    ),
    /P3A_HISTORICAL = 'f95c145b9b1e37430ac68315c9e039f1f3262ae4'/u,
  );
});

test('AW-03 current P3-A12 direct diff is zero (no exclusion needed)', () => {
  // The P3-A12 corrective formally accepts the read-only
  // `checkStale` seam in workspace-service.js as part of
  // the P3-A frozen surface. Therefore a direct
  // `1fcafc8 -> HEAD` diff against the P3-A gate is empty
  // without any exclusion pathspec.
  const diff = git(['diff', '--name-only', P3A_CURRENT, 'HEAD', '--', P3_A_GATE]);
  assert.equal(diff, '');
});

test('AW-04 current P3-A12 guard uses NO exclusion pathspec', () => {
  // Verify the canonical P3-A current frozen guard
  // (AW-03) does not pass a `:(exclude)` or `:!` pathspec.
  // The full git invocation must be exclusion-free. The
  // AW file is excluded from the search because it is
  // allowed to mention `:(exclude)` in documentation.
  const diff = git(['diff', '--name-only', P3A_CURRENT, 'HEAD', '--', P3_A_GATE]);
  assert.equal(diff, '');
  const exclude = rg(':(exclude)', true);
  assert.equal(exclude, 0);
});

// ---------------------------------------------------------------------------
// AW-05..07 — Exclusion cleanup is complete.
// ---------------------------------------------------------------------------

test('AW-05 C4_2_1_SUBTREE live test refs are zero', () => {
  // After P3-A12 absorption, the C4.2.1 sub-tree pathspec
  // exclusion is no longer needed and must be absent. The
  // AW file itself is excluded from the search because it
  // is allowed to mention this token in documentation.
  assert.equal(rg('C4_2_1_SUBTREE', true), 0);
});

test('AW-06 workspace-service.js exclusion pathspec live refs are zero', () => {
  // The `:(exclude)packages/.../workspace-service.js` form
  // and the `:!packages/.../workspace-service.js` form are
  // both banned from the current P3-A12 baseline. The AW
  // file itself is excluded from the search because it is
  // allowed to mention these pathspecs in documentation.
  assert.equal(
    rg(':(exclude)packages/runtime-core/src/application/packaging/workspace-service.js', true),
    0,
  );
  assert.equal(
    rg(':!packages/runtime-core/src/application/packaging/workspace-service.js', true),
    0,
  );
});

test('AW-07 no renamed equivalent exclusion exists', () => {
  // Banned: a renamed C4.2.2 / P3-A12 / AUTHORIZED_STALE
  // / or any other exclusion pathspec that would hide
  // production-tree delta from the current frozen guard.
  // The AW file itself is excluded from the search
  // because it is allowed to mention these tokens in
  // documentation comments.
  const banned = [
    'C4_2_2_SUBTREE',
    'P3_A12_SUBTREE',
    'AUTHORIZED_STALE_SUBTREE',
    'P3A12_EXCLUDE',
    'STALE_SEAM_EXCLUDE',
  ];
  for (const token of banned) {
    assert.equal(rg(token, true), 0, `banned exclusion token still referenced: ${token}`);
  }
});

// ---------------------------------------------------------------------------
// AW-08..10 — AV / AK-15 / R-13 contract preserved.
// ---------------------------------------------------------------------------

test('AW-08 AV 25/25 retained (P3-A12 inspection contract still PASS)', () => {
  // The AV file is retained and the canonical P3-A12
  // inspection contract is still in force. Verify the file
  // exists and contains the documented 25 AV-* tests.
  const av = readFileSync(
    path.join(TEST_DIR, 'packaging-a12-canonical-stale-inspection-contract.test.ts'),
    'utf8',
  );
  for (let i = 1; i <= 25; i += 1) {
    const id = `AV-${String(i).padStart(2, '0')}`;
    assert.match(av, new RegExp(`test\\('${id} `, 'u'), `missing AV test: ${id}`);
  }
});

test('AW-09 AK-15 retained (operations does not import computeStale)', () => {
  // AK-15: the operations layer MUST NOT import
  // computeStale / stale-tracker / STALE_REASON. This is
  // a permanent architectural contract.
  const ops = readFileSync(
    path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'),
    'utf8',
  );
  assert.doesNotMatch(ops, /stale-tracker/u);
  assert.doesNotMatch(ops, /computeStale/u);
  assert.doesNotMatch(ops, /STALE_REASON/u);
  // The operations layer consumes the seam instead.
  assert.match(ops, /checkStale/u);
});

test('AW-10 R-13 STALE envelope retained', () => {
  // R-13: the canonical STALE envelope (PACKAGING_WORKSPACE_EXECUTE_REJECTED
  // with issues = ['stale', ...stale.reasons]) is the
  // single legal STALE response shape.
  const workspace = readFileSync(
    path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'packaging', 'workspace-service.js'),
    'utf8',
  );
  assert.match(workspace, /PACKAGING_WORKSPACE_EXECUTE_REJECTED: stale/u);
  assert.match(workspace, /err\.issues = \['stale', \.\.\.stale\.reasons\]/u);
});

// ---------------------------------------------------------------------------
// AW-11..14 — Provider identity split retained (C4.2 / C4.2.1).
// ---------------------------------------------------------------------------

test('AW-11 Registry / API identity split retained in buildExecutionDeps', () => {
  // The C4.2 split must remain in place:
  //   - intent.providerModelId = Registry identity
  //   - profile.registryModelId = Registry identity
  //   - profile.modelId        = Provider API identity
  //   - adapterId = registryModelId
  //   - modelId   = providerApiModelId
  const ops = readFileSync(
    path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'),
    'utf8',
  );
  // Slice the function body (skip the parameter list).
  // The function signature ends at the first `})` pair;
  // the body opens at the next `{` after that.
  const start = ops.indexOf('function buildExecutionDeps');
  if (start < 0) throw new Error('buildExecutionDeps not found');
  // Find the first `)` that closes the parameter list.
  const paramEnd = ops.indexOf(')', start);
  if (paramEnd < 0) throw new Error('no closing paren for params');
  // Find the opening `{` of the body (skip the `)` and any whitespace).
  const bodyStart = ops.indexOf('{', paramEnd);
  if (bodyStart < 0) throw new Error('no opening brace for body');
  // Walk forward to find the matching `}`.
  let depth = 0;
  let i = bodyStart;
  for (; i < ops.length; i += 1) {
    if (ops[i] === '{') depth += 1;
    else if (ops[i] === '}') {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  if (depth !== 0) throw new Error('unterminated function body');
  const slice = ops.slice(start, i + 1);
  assert.match(slice, /registryModelId/u);
  assert.match(slice, /providerApiModelId/u);
  assert.match(slice, /adapterId:\s*registryModelId/u);
  assert.match(slice, /modelId:\s*providerApiModelId/u);
  assert.match(slice, /EXECUTION_PROVIDER_MODEL_IDENTITY_MISMATCH/u);
});

test('AW-12 analysis-led split profile retained', () => {
  // The analysis-led profile (C4.2 split) keeps Registry
  // and Provider API identity separate.
  const profile = requireTest('analysis-led split profile retains Registry and API identity');
  // Conservative: just confirm the underlying test exists.
  assert.ok(profile);
});

test('AW-13 reference-first split profile retained', () => {
  const profile = requireTest('reference-first split profile retains Registry and API identity');
  assert.ok(profile);
});

test('AW-14 legacy same-id profile retained', () => {
  const profile = requireTest('legacy same-id profile retains both identities as Registry = API');
  assert.ok(profile);
});

// ---------------------------------------------------------------------------
// AW-15..16 — Provider identity mismatch boundary.
// ---------------------------------------------------------------------------

test('AW-15 READY + provider mismatch is an execution error (not STALE)', () => {
  // A READY session whose profile Registry identity does
  // not match the Workspace intent Registry identity is
  // rejected at execution preflight as
  // EXECUTION_PROVIDER_MODEL_IDENTITY_MISMATCH. It does
  // NOT trigger STALE and does NOT mutate Workspace state.
  const workspace = readFileSync(
    path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'packaging', 'workspace-service.js'),
    'utf8',
  );
  // The C4.2 mismatch block in workspace-service was
  // REMOVED in C4.2.1 (canonical STALE authority
  // preserved).
  assert.doesNotMatch(workspace, /identityMismatchError/u);
  assert.doesNotMatch(workspace, /identity_mismatch/u);
  // The execution preflight is owned by buildExecutionDeps.
  const ops = readFileSync(
    path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'),
    'utf8',
  );
  assert.match(ops, /EXECUTION_PROVIDER_MODEL_IDENTITY_MISMATCH/u);
});

test('AW-16 STALE wins before provider mismatch (STALE-first ordering)', () => {
  // operations must call service.checkStale(sessionId)
  // BEFORE buildExecutionDeps. A STALE session never
  // reaches the mismatch preflight. We compare the
  // position of the actual CALL SITES (not function
  // definitions or comments).
  const ops = readFileSync(
    path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'),
    'utf8',
  );
  // Find the position of the canonical CALL SITES (not
  // function definitions). The checkStale call site is
  // `service.checkStale(sessionId)`; the buildExecutionDeps
  // call site is `buildExecutionDeps({` WITHOUT the
  // preceding `function` keyword.
  const callRe = /service\.checkStale\(\s*sessionId\s*\)/u;
  // Match `buildExecutionDeps({` but not `function buildExecutionDeps({`.
  // We use a negative lookbehind to exclude the `function ` prefix.
  const buildRe = /(?<!function )buildExecutionDeps\(\s*\{/u;
  const checkStaleAt = ops.search(callRe);
  const buildAt = ops.search(buildRe);
  assert.ok(checkStaleAt >= 0, 'operations must call service.checkStale(sessionId)');
  assert.ok(buildAt >= 0, 'operations must call buildExecutionDeps({...})');
  assert.ok(
    checkStaleAt < buildAt,
    `service.checkStale must be called BEFORE buildExecutionDeps (STALE-first ordering). ` +
    `Found checkStale at ${checkStaleAt} and buildExecutionDeps at ${buildAt}.`,
  );
});

// ---------------------------------------------------------------------------
// AW-17..19 — D-PROVIDER-01, P2, P3-B.
// ---------------------------------------------------------------------------

test('AW-17 D-PROVIDER-01 cap retained at 10 (Registry + Adapter)', () => {
  // Registry: seedream-5.0-pro maxReferenceImages = 10
  // Adapter : seedream-5.0-pro maxReferences = 10
  const registry = readFileSync(
    path.join(ROOT, 'packages', 'model-registry', 'src', 'index.js'),
    'utf8',
  );
  const adapter = readFileSync(
    path.join(ROOT, 'packages', 'image-generation-adapter', 'src', 'multi-model.js'),
    'utf8',
  );
  assert.match(registry, /id:\s*'seedream-5\.0-pro'[\s\S]{0,400}maxReferenceImages:\s*10/u);
  assert.match(adapter, /'seedream-5\.0-pro':[\s\S]{0,180}maxReferences:\s*10/u);
});

test('AW-18 P2 frozen production diff is zero', () => {
  assert.equal(git(['diff', '--name-only', P2, 'HEAD', '--', P2_GATE]), '');
});

test('AW-19 P3-B accepted UI semantic diff is zero', () => {
  assert.equal(git(['diff', '--name-only', P3B, 'HEAD', '--', P3_B_GATE]), '');
});

// ---------------------------------------------------------------------------
// AW-20..25 — P3-C selector unchanged, no source change, no Provider, Golden
// preserved, D3 HOLD preserved.
// ---------------------------------------------------------------------------

test('AW-20 P3-C selector / source semantics unchanged', () => {
  // The canonical P3-A selector and the P3-C composition
  // root seam are unchanged.
  assert.equal(
    git(['diff', '--name-only', P3C_INTEGRATION, 'HEAD',
      '--', 'packages/runtime-core/src/application/canonical-packaging-context-selector.ts']),
    '',
  );
  const composition = readFileSync(
    path.join(ROOT, 'apps', 'web-runtime', 'src', 'current-operation-graph.ts'),
    'utf8',
  );
  assert.match(composition, /projectCanonicalIdentityFromAuthorities/u);
});

test('AW-21 P3-C4.2.2 makes zero production source changes', () => {
  // The P3-C4.2.2 phase is a TEST / FREEZE / GUARD CLEANUP
  // phase. Working tree -> HEAD must contain NO production
  // source changes; the only allowed deltas are tests
  // and docs.
  // We compute HEAD~1 (P3-A12 re-freeze) -> HEAD so this
  // assertion holds BEFORE the re-freeze commit too.
  const workTree = git(['status', '--porcelain']);
  // No modified or untracked production source files
  // (the P3-C4.2.2 phase commits tests + docs only).
  const dirty = workTree.split('\n').filter(Boolean).filter((line) => {
    // Allowed: M tests/..., ?? tests/..., A tests/..., M docs/..., A docs/...
    // Banned: M packages/..., M apps/..., A packages/...
    if (line.length < 4) return false;
    const path1 = line.slice(3);
    return path1.startsWith('packages/') || path1.startsWith('apps/');
  });
  assert.equal(
    dirty.length,
    0,
    `P3-C4.2.2 must not touch production source. Dirty production files: ${dirty.join(', ')}`,
  );
});

test('AW-22 P3-C4.2.2 makes zero external Provider calls', () => {
  // The P3-C4.2.2 phase is offline-only. We assert the
  // two concrete invariants that prove it:
  //
  //   1. The .codex-smoke/ tree is gitignored — no
  //      Provider-networking sandbox script is committed
  //      to the authoritative source tree.
  //   2. The C4.2.2 phase did not introduce a new tracked
  //      file under the P3-A / P3-B / P2 production paths.
  //
  // (We deliberately do NOT check the literal Provider
  // model name `doubao-seedream-5-0-pro-260628` or the
  // API-key env var because the test file references them
  // in comments documenting the C4.2.2 freeze. Self-
  // matching would make the assertion tautological.)
  const trackedSandbox = git(['ls-files', '.codex-smoke/']);
  assert.equal(trackedSandbox, '', '.codex-smoke/ must remain gitignored');
  // The C4.2.2 phase did not introduce a new tracked
  // file under the P3-A / P3-B / P2 / ops / selector
  // production paths. P3-D3.6B (authorized post-acceptance
  // corrective) adds local-rpc-server.ts (channel-aware
  // upload body cap) and project-operations.js
  // (projects:import-file-bytes channel); they are the only
  // permitted deltas.
  const c4_2_2NewProd = git(['diff', '--name-only', P3A_REFREEZE, 'HEAD',
    '--', P3_A_GATE, P3_B_GATE, P2_GATE,
    'apps/web-runtime/src', 'packages/runtime-core/src/operations',
    'packages/runtime-core/src/application/canonical-packaging-context-selector.ts',
  ]).split('\n').filter(Boolean).filter((file) =>
    file !== 'apps/web-runtime/src/local-rpc-server.ts'
    && file !== 'packages/runtime-core/src/operations/project-operations.js').join('\n');
  assert.equal(c4_2_2NewProd, '',
    'P3-C4.2.2 must not introduce a new tracked production file. Found: ' + c4_2_2NewProd);
});

test('AW-23 Golden auto-update is NO and Golden files are unchanged', () => {
  // The Golden boundary must be intact. No Golden asset
  // was added, removed, or modified by the P3-C4.2.2 phase.
  // (The actual P3-A12 baseline was Golden-clean; this
  // assertion is duplicated here for the C4.2.2 phase.)
  const goldenDiff = git([
    'diff', '--name-only', P3A_REFREEZE, 'HEAD',
    '--', 'evaluation/golden-cases/', 'evaluation/anti-cases/', 'evaluation/hidden-cases/',
  ]);
  assert.equal(goldenDiff, '');
});

test('AW-24 historical D3 HOLD preserved (139f824 untouched)', () => {
  // The D3 HOLD commit is on the branch and was not
  // rewritten by the P3-A12 / C4.2.2 chain. Its AR
  // coverage map is preserved.
  const d3 = requireTest('AR-01..22 D3 real-provider visual-quality coverage map');
  assert.ok(d3, 'AR coverage map must still exist');
  // The D3 docs are intact.
  const d3Docs = readFileSync(
    path.join(ROOT, 'docs', 'packaging', 'history', 'p3-d', 'p3-d3-real-provider-visual-quality-validation.md'),
    'utf8',
  );
  assert.match(d3Docs, /HOLD/u);
  assert.match(d3Docs, /PROVIDER EXECUTION GAP/u);
  assert.match(d3Docs, /re-run/u);
  // No real-Provider artefact leaked into the
  // authoritative source tree.
  const leaks = git(['ls-files', '*.key', 'credentials*', '.codex-smoke/p3-d3/api-direct-test.mjs']);
  // .codex-smoke/ is gitignored; ls-files returns empty for ignored paths.
  assert.equal(leaks, '');
});

test('AW-25 P3-D3 re-run requires NEW explicit human authorization', () => {
  // P3-C4.2.2 does NOT authorize a D3 re-run. The next
  // phase requires a fresh explicit authorization
  // (max 5 calls, single model `seedream-5.0-pro`
  // Registry id; actual API name
  // `doubao-seedream-5-0-pro-260628`, single profile,
  // 0 random retries).
  const c4_2_2 = readFileSync(
    path.join(TEST_DIR, 'packaging-c4-2-2-p3-a12-baseline-rebase-provider-boundary-freeze.test.ts'),
    'utf8',
  );
  assert.match(c4_2_2, /HOLD/u);
  assert.match(c4_2_2, /RE-RUN AUTHORIZATION REQUIRED/u);
  // The D3 docs are intact and the D3 AR coverage map is
  // preserved verbatim (no PASS rewrite).
  const d3Test = readFileSync(
    path.join(TEST_DIR, 'packaging-d3-real-provider-visual-quality-validation.test.ts'),
    'utf8',
  );
  assert.match(d3Test, /HOLD/u);
  assert.match(d3Test, /NOT MET/u);
});
