// P3-A12 / AV — Canonical STALE Inspection Contract.
//
// Coverage map for the P3-A12 corrective. P3-A12 formally
// accepts `workspace-service.checkStale(sessionId)` as the
// Canonical Read-Only STALE Inspection API — the single legal
// bridge between the operations layer and the canonical STALE
// authority (computeStale in stale-tracker.js). The
// operations layer MUST NOT import computeStale directly
// (AK-15 contract preserved).
//
// Each AV-* item below points to the production source / test
// that proves the claim. The pattern follows the AS / AT /
// AU coverage map pattern.
//
// Authoritative: docs/packaging/history/p3-a/p3-a12-canonical-stale-inspection-corrective.md

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const WORKSPACE_SERVICE = readFileSync(
  path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'packaging', 'workspace-service.js'),
  'utf8',
);
const STALE_TRACKER = readFileSync(
  path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'packaging', 'stale-tracker.js'),
  'utf8',
);
const VIEW_MODEL = readFileSync(
  path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'packaging', 'view-model.js'),
  'utf8',
);
const WORKSPACE_STATE = readFileSync(
  path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'packaging', 'workspace-state.js'),
  'utf8',
);
const OPERATIONS = readFileSync(
  path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'),
  'utf8',
);
const SELECTOR = readFileSync(
  path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'canonical-packaging-context-selector.ts'),
  'utf8',
);

const P2 = 'a593278b55e437fac59d768c5cee734d9a9fc201';
const P3A_HISTORICAL = 'f95c145b9b1e37430ac68315c9e039f1f3262ae4';

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

// Balanced-brace slice: find the start marker, then walk
// forward matching braces until the corresponding closing `}`.
// Useful for capturing full function bodies when `}` may
// appear inside the body (e.g. inside an Object.freeze({...})).
function sliceFunctionBody(source, startMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`start marker not found: ${startMarker.slice(0, 60)}`);
  let depth = 0;
  let i = source.indexOf('{', start);
  if (i < 0) throw new Error(`no opening brace after start: ${startMarker.slice(0, 60)}`);
  const openIndex = i;
  for (; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }
  throw new Error(`unbalanced braces after start: ${startMarker.slice(0, 60)} (openIndex=${openIndex})`);
}

// ---------------------------------------------------------------------------
// AV-01..03 — Seam exists, uses canonical computeStale, returns the contract shape
// ---------------------------------------------------------------------------

test('AV-01 checkStale exists on Workspace Service and is part of the public API', () => {
  // The seam is exposed via the return Object.freeze({..., checkStale, ...})
  // block of createPackagingWorkspaceService.
  assert.match(WORKSPACE_SERVICE, /function checkStale\(sessionId\)/);
  assert.match(WORKSPACE_SERVICE, /checkStale,/);
  // The function name is the only allowed consumer-facing name.
  assert.doesNotMatch(WORKSPACE_SERVICE, /function markStale\(/u);
  assert.doesNotMatch(WORKSPACE_SERVICE, /function recomputeStale\(/u);
});

test('AV-02 checkStale uses the canonical computeStale (single source of truth)', () => {
  // The seam calls computeStale from the existing stale-tracker.
  // This is the only legal computation; the seam does NOT
  // re-implement intent comparison / truth comparison /
  // fingerprint comparison / stale reason generation.
  const seam = sliceFunctionBody(WORKSPACE_SERVICE, 'function checkStale(sessionId) {');
  assert.match(seam, /computeStale\(/);
  // The canonical STALE_REASON set lives in stale-tracker.js.
  assert.match(STALE_TRACKER, /STALE_REASON = Object\.freeze\(\{/);
  assert.match(STALE_TRACKER, /INTENT_CHANGED: 'intent_changed'/);
  assert.match(STALE_TRACKER, /TRUTH_SURFACE_CHANGED: 'truth_surface_changed'/);
  // The seam must NOT redefine the canonical reasons.
  assert.doesNotMatch(seam, /STALE_REASON\s*=/u);
  assert.doesNotMatch(seam, /identity_mismatch/u);
  assert.doesNotMatch(seam, /provider_model_identity_mismatch/u);
});

test('AV-03 checkStale returns only { stale, reasons } (no raw state exposure)', () => {
  // The return shape is exactly `{ stale, reasons }`. No
  // raw canonical inputs (currentIntent / prepared /
  // truthSnapshot) leak through the seam.
  const seam = sliceFunctionBody(WORKSPACE_SERVICE, 'function checkStale(sessionId) {');
  assert.match(seam, /return Object\.freeze\(\{[\s\S]*?stale:[\s\S]*?reasons:/u);
  // The seam must NOT return currentIntent, intentAtPrepare,
  // truthFingerprintAtPrepare, truthSnapshot, or any other
  // raw canonical input as a public field.
  assert.doesNotMatch(seam, /return\s*Object\.freeze\(\{[\s\S]*?currentIntent/u);
  assert.doesNotMatch(seam, /return\s*Object\.freeze\(\{[\s\S]*?intentAtPrepare/u);
  assert.doesNotMatch(seam, /return\s*Object\.freeze\(\{[\s\S]*?truthFingerprintAtPrepare/u);
  assert.doesNotMatch(seam, /return\s*Object\.freeze\(\{[\s\S]*?truthSnapshot/u);
  assert.doesNotMatch(seam, /return\s*Object\.freeze\(\{[\s\S]*?prepared:/u);
});

// ---------------------------------------------------------------------------
// AV-04..07 — Read-only contract: no mutation of state
// ---------------------------------------------------------------------------

test('AV-04 checkStale does not change status', () => {
  // The seam must NOT call any state-transition / withError /
  // transitionSession / freezeAndStore / setStatus function.
  const seam = sliceFunctionBody(WORKSPACE_SERVICE, 'function checkStale(sessionId) {');
  assert.doesNotMatch(seam, /status\s*=/u);
  assert.doesNotMatch(seam, /transitionSession/u);
  assert.doesNotMatch(seam, /withError/u);
  assert.doesNotMatch(seam, /freezeAndStore/u);
  assert.doesNotMatch(seam, /setStatus/u);
  assert.doesNotMatch(seam, /nextStatus/u);
  assert.doesNotMatch(seam, /state\.status\s*=/u);
});

test('AV-05 checkStale does not change staleReasons / lastStaleReasons / lastStaleReason', () => {
  // The seam must NOT mutate any STALE-related fields. STALE
  // transitions are owned by the canonical P3-A state
  // machine, not by the inspection seam.
  const seam = sliceFunctionBody(WORKSPACE_SERVICE, 'function checkStale(sessionId) {');
  assert.doesNotMatch(seam, /staleReasons\s*=/u);
  assert.doesNotMatch(seam, /lastStaleReasons\s*=/u);
  assert.doesNotMatch(seam, /lastStaleReason\s*=/u);
  assert.doesNotMatch(seam, /state\.staleReasons/u);
  assert.doesNotMatch(seam, /state\.lastStaleReasons/u);
  assert.doesNotMatch(seam, /state\.lastStaleReason/u);
});

test('AV-06 checkStale does not change intent / truthSnapshot / prepared', () => {
  // The seam reads the canonical state via getSessionOrThrow
  // and computeStale. It must NOT mutate any of those fields.
  const seam = sliceFunctionBody(WORKSPACE_SERVICE, 'function checkStale(sessionId) {');
  assert.doesNotMatch(seam, /state\.intent\s*=/u);
  assert.doesNotMatch(seam, /state\.truthSnapshot\s*=/u);
  assert.doesNotMatch(seam, /state\.prepared\s*=/u);
  assert.doesNotMatch(seam, /currentIntent\s*=/u);
  assert.doesNotMatch(seam, /truthSnapshot\s*=/u);
  assert.doesNotMatch(seam, /prepared\s*=/u);
});

test('AV-07 checkStale does not change execution / error / persistence', () => {
  // The seam must NOT mutate execution state, error state, or
  // write to the artifact store / run store / persistence.
  const seam = sliceFunctionBody(WORKSPACE_SERVICE, 'function checkStale(sessionId) {');
  assert.doesNotMatch(seam, /state\.execution/u);
  assert.doesNotMatch(seam, /state\.lastError/u);
  assert.doesNotMatch(seam, /saveRun/u);
  assert.doesNotMatch(seam, /packagingArtifactStore/u);
  assert.doesNotMatch(seam, /writeFileSync/u);
  assert.doesNotMatch(seam, /fs\./u);
});

// ---------------------------------------------------------------------------
// AV-08..11 — Behavioural contracts: fresh / drift / combined
// ---------------------------------------------------------------------------

test('AV-08 the canonical STALE_REASON set is intent_changed + truth_surface_changed (no new reasons)', () => {
  // The seam returns existing canonical STALE reasons. It does
  // NOT add new STALE_REASON values (e.g. identity_mismatch,
  // provider_model_identity_mismatch, profile_changed, etc.).
  const seam = sliceFunctionBody(WORKSPACE_SERVICE, 'function checkStale(sessionId) {');
  // The reasons returned are exactly what computeStale returns.
  assert.match(seam, /reasons: Object\.freeze\(Array\.isArray\(fresh\.reasons\) \? Array\.from\(fresh\.reasons\) : \[\]\)/u);
  // No new STALE_REASON values are added.
  assert.doesNotMatch(seam, /identity_mismatch/u);
  assert.doesNotMatch(seam, /provider_model_identity_mismatch/u);
  assert.doesNotMatch(seam, /profile_changed/u);
  assert.doesNotMatch(seam, /credential_changed/u);
  assert.doesNotMatch(seam, /provider_error/u);
});

test('AV-09 the seam reads canonical state through the existing getSessionOrThrow accessor', () => {
  // The seam obtains the session via the existing
  // getSessionOrThrow accessor (the canonical "session is
  // known" gate). It does NOT bypass it with private access.
  const seam = sliceFunctionBody(WORKSPACE_SERVICE, 'function checkStale(sessionId) {');
  assert.match(seam, /getSessionOrThrow\(sessionId\)/);
  // The seam does NOT reach into a private sessions Map directly.
  assert.doesNotMatch(seam, /sessions\.get/u);
  assert.doesNotMatch(seam, /sessions\.has/u);
});

test('AV-10 the seam re-runs computeStale against the current state (not the saved snapshot)', () => {
  // The seam uses `state.intent` and `state.truthSnapshot`
  // (the LATEST values, NOT the saved `state.lastStaleReasons`
  // snapshot from the last state transition). This is what
  // makes the inspection fresh.
  const seam = sliceFunctionBody(WORKSPACE_SERVICE, 'function checkStale(sessionId) {');
  assert.match(seam, /currentIntent: state\.intent/);
  assert.match(seam, /prepared: state\.prepared/);
  assert.match(seam, /truthSnapshot: state\.truthSnapshot/);
  // The seam does NOT read from the saved snapshot.
  assert.doesNotMatch(seam, /currentIntent: state\.lastStaleReasons/u);
  assert.doesNotMatch(seam, /truthSnapshot: state\.lastStaleReasons/u);
});

test('AV-11 the canonical stale reason set is the ONLY reason set surfaced', () => {
  // The seam returns `fresh.reasons` (what computeStale
  // returns). It does NOT augment or filter the reason set.
  // The canonical STALE_REASON values are listed in the
  // STALE_REASON export of stale-tracker.js.
  const staleReasonExport = sliceBetween(STALE_TRACKER, 'export const STALE_REASON', '}');
  assert.match(staleReasonExport, /INTENT_CHANGED/);
  assert.match(staleReasonExport, /TRUTH_SURFACE_CHANGED/);
  // The seam returns the fresh.reasons array verbatim (no
  // augmentation, no filtering, no transformation).
  const seam = sliceFunctionBody(WORKSPACE_SERVICE, 'function checkStale(sessionId) {');
  assert.match(seam, /Array\.isArray\(fresh\.reasons\)/);
  assert.match(seam, /Array\.from\(fresh\.reasons\)/);
  // No additional reason-construction code.
  assert.doesNotMatch(seam, /\.reasons\.push/u);
  assert.doesNotMatch(seam, /\.reasons\.concat/u);
  assert.doesNotMatch(seam, /\.reasons\.filter/u);
});

// ---------------------------------------------------------------------------
// AV-12..14 — Provider identity mismatch separation
// ---------------------------------------------------------------------------

test('AV-12 identity_mismatch is NOT a STALE_REASON', () => {
  // The seam must NOT add identity_mismatch or any related
  // execution/config reason to the STALE reason set.
  // STALE reasons remain: intent_changed, truth_surface_changed.
  const seam = sliceFunctionBody(WORKSPACE_SERVICE, 'function checkStale(sessionId) {');
  assert.doesNotMatch(seam, /identity_mismatch/u);
  assert.doesNotMatch(seam, /provider_model_identity_mismatch/u);
  // The canonical STALE_REASON in stale-tracker.js has only
  // intent_changed and truth_surface_changed.
  const staleReasonExport = sliceBetween(STALE_TRACKER, 'export const STALE_REASON', '}');
  assert.doesNotMatch(staleReasonExport, /identity_mismatch/u);
  assert.doesNotMatch(staleReasonExport, /provider_model_identity_mismatch/u);
});

test('AV-13 STALE_REASON registry is unchanged (no new reasons added by P3-A12)', () => {
  // P3-A12 is a narrow corrective reopen. It does NOT add
  // new STALE_REASON values. The canonical STALE_REASON
  // registry is unchanged from its P3-A11 state.
  // Compare the current STALE_REASON export vs the
  // historical P3-A11 baseline.
  const diff = git(['diff', '--name-only', P3A_HISTORICAL, 'HEAD',
    '--', 'packages/runtime-core/src/application/packaging/stale-tracker.js']);
  assert.equal(diff, '',
    'P3-A12 must not modify stale-tracker.js (STALE_REASON is unchanged)');
  // The P3-A workspace-state.js STALE_REASON registry is
  // also unchanged.
  assert.doesNotMatch(WORKSPACE_STATE, /identity_mismatch/);
  assert.doesNotMatch(WORKSPACE_STATE, /provider_model_identity_mismatch/);
});

test('AV-14 the operations layer uses the seam only for inspection (not for state mutation)', () => {
  // The operations layer's call site is `service.checkStale(...)`
  // and the result is used only to project the canonical STALE
  // error envelope. It is NOT used to mutate state.
  const execSlice = sliceBetween(OPERATIONS, 'execute-generation', 'service.executeGeneration(sessionId, deps)');
  assert.match(execSlice, /service\.checkStale/);
  // The result is consumed only for the boolean + reasons.
  // No state transition, no freezeAndStore, no withError on
  // the STALE inspection path.
  assert.doesNotMatch(execSlice, /freezeAndStore/u);
  assert.doesNotMatch(execSlice, /transitionSession/u);
  // The STALE error is thrown (not stored); the throw itself
  // is consumed by the RPC caller.
});

// ---------------------------------------------------------------------------
// AV-15..17 — Operations boundary: no computeStale / stale-tracker import
// ---------------------------------------------------------------------------

test('AV-15 operations does NOT import computeStale', () => {
  // The operations layer is forbidden from importing
  // computeStale. The seam is the only legal access path.
  // (This preserves the AK-15 contract.)
  assert.doesNotMatch(OPERATIONS, /computeStale/u);
  assert.doesNotMatch(OPERATIONS, /from.*stale-tracker/u);
  assert.doesNotMatch(OPERATIONS, /from.*'\.\.\/application\/packaging\/stale-tracker/u);
  // Also no destructured import from a barrel.
  assert.doesNotMatch(OPERATIONS, /import\s*\{[^}]*computeStale/u);
});

test('AV-16 operations does NOT import stale-tracker module', () => {
  // The operations layer does NOT deep-import the stale-tracker
  // module. The seam is the only legal access path.
  assert.doesNotMatch(OPERATIONS, /stale-tracker/u);
  assert.doesNotMatch(OPERATIONS, /PACKAGING_WORKSPACE_STALE_TRACKER/u);
});

test('AV-17 AK-15 contract preserved: no second stale tracker in operations', () => {
  // The AK-15 test asserts that the operations layer source
  // does not contain stale-tracker / computeStale /
  // STALE_REASON text. Re-verify the spirit of that contract
  // here (the original AK-15 test lives in
  // packaging-canonical-context-runtime-handoff.test.ts).
  assert.doesNotMatch(OPERATIONS, /stale-tracker/);
  assert.doesNotMatch(OPERATIONS, /computeStale/);
  assert.doesNotMatch(OPERATIONS, /STALE_REASON/);
  // Also no parallel `detectStaleChange` (the underlying
  // helper of computeStale).
  assert.doesNotMatch(OPERATIONS, /detectStaleChange/);
});

// ---------------------------------------------------------------------------
// AV-18..20 — View model privacy + no raw state accessors
// ---------------------------------------------------------------------------

test('AV-18 view model does NOT expose intentAtPrepare', () => {
  // The P3-A view model intentionally hides
  // `intentAtPrepare` as "internal application state, not
  // UI surface". P3-A12 does NOT change this.
  // The view model docs explicitly mention this exclusion.
  assert.match(VIEW_MODEL, /intentAtPrepare[\s\S]{0,200}not UI surface/u);
  // The view model code does NOT pass intentAtPrepare to
  // any field of the view.
  assert.doesNotMatch(VIEW_MODEL, /intentAtPrepare:\s*prepared/u);
  assert.doesNotMatch(VIEW_MODEL, /intentAtPrepare:\s*intent/u);
});

test('AV-19 view model does NOT expose truthFingerprintAtPrepare', () => {
  // The P3-A view model intentionally hides
  // `truthFingerprintAtPrepare`. P3-A12 does NOT change this.
  assert.match(VIEW_MODEL, /truthFingerprintAtPrepare[\s\S]{0,200}not UI surface/u);
  assert.doesNotMatch(VIEW_MODEL, /truthFingerprintAtPrepare:\s*\w/u);
});

test('AV-20 no raw stale-input accessor is added to workspace-service', () => {
  // P3-A12 explicitly forbids adding
  // getCanonicalStaleInputs / getRawPrepared / getInternalState
  // to the Workspace service. The seam is the only added API.
  assert.doesNotMatch(WORKSPACE_SERVICE, /getCanonicalStaleInputs/u);
  assert.doesNotMatch(WORKSPACE_SERVICE, /getRawPrepared/u);
  assert.doesNotMatch(WORKSPACE_SERVICE, /getInternalState/u);
  assert.doesNotMatch(WORKSPACE_SERVICE, /preparedCanonicalView/u);
  // The selector also does not add these.
  assert.doesNotMatch(SELECTOR, /getCanonicalStaleInputs/u);
  assert.doesNotMatch(SELECTOR, /getRawPrepared/u);
  assert.doesNotMatch(SELECTOR, /getInternalState/u);
  assert.doesNotMatch(SELECTOR, /preparedCanonicalView/u);
});

// ---------------------------------------------------------------------------
// AV-21..24 — Frozen surfaces unchanged
// ---------------------------------------------------------------------------

test('AV-21 P2 frozen production diff is zero', () => {
  // The P2 frozen baseline is unchanged. P3-A12 is a P3-A
  // surface event, not a P2 event.
  assert.equal(git(['diff', '--name-only', P2, 'HEAD', '--', 'packages/image-generation-runtime/src/packaging']), '');
});

test('AV-22 P3-B accepted UI semantic diff is zero', () => {
  // P3-A12 does not change the Web UI / RPC / Workspace
  // presentation. P3-B semantic diff is zero.
  assert.equal(git(['diff', '--name-only', '2ac4cf1cc18156d1e4a508382b4563298d69c014', 'HEAD', '--', 'apps/web/src/features/packaging']), '');
});

test('AV-23 P3-A state machine unchanged (state machine + STALE envelope)', () => {
  // The canonical P3-A state machine (workspace-state.js) and
  // the STALE envelope (workspace-service.js executeGeneration
  // STALE check) are unchanged.
  // 1. workspace-state.js is unchanged.
  assert.equal(
    git(['diff', '--name-only', P3A_HISTORICAL, 'HEAD', '--', 'packages/runtime-core/src/application/packaging/workspace-state.js']),
    '',
  );
  // 2. The R-13 STALE envelope is preserved.
  assert.match(WORKSPACE_SERVICE, /PACKAGING_WORKSPACE_EXECUTE_REJECTED: stale/u);
  assert.match(WORKSPACE_SERVICE, /err\.issues = \['stale', \.\.\.stale\.reasons\]/u);
  // 3. The P3-A canonical-context selector is unchanged.
  assert.equal(
    git(['diff', '--name-only', '456ec3a9d0273b599ed15bcd424fde1f36b8ce1b', 'HEAD',
      '--', 'packages/runtime-core/src/application/canonical-packaging-context-selector.ts']),
    '',
  );
});

test('AV-24 the seam is the ONLY authorized P3-A12 production delta', () => {
  // P3-A12 production delta: only the comment header of
  // checkStale in workspace-service.js. The function body
  // is byte-equivalent to the C4.2.1 state.
  // Compare the WORKING TREE (where the P3-A12 comment update
  // lives) against the C4.2.1 final SHA (71289b8). The
  // working tree vs HEAD diff is the P3-A12 production delta.
  const c4_2_1_final = '71289b8ce42b704ffaa87d718044911955e6da9d';
  const workTree = readFileSync(
    path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'packaging', 'workspace-service.js'),
    'utf8',
  );
  const baseSrc = execFileSync(
    'git', ['show', `${c4_2_1_final}:packages/runtime-core/src/application/packaging/workspace-service.js`],
    { cwd: ROOT, encoding: 'utf8' },
  );
  // Slice out the function body via balanced braces. The
  // function body must be byte-identical. We normalize
  // CRLF to LF for comparison (Windows line-ending noise).
  const headBody = sliceFunctionBody(workTree, 'function checkStale(sessionId) {')
    .replace(/\r\n/g, '\n');
  const baseBody = sliceFunctionBody(baseSrc, 'function checkStale(sessionId) {')
    .replace(/\r\n/g, '\n');
  assert.equal(headBody, baseBody,
    'P3-A12 production delta must be comment-only; the checkStale function body must be byte-equivalent to the C4.2.1 state');
  // Sanity: there IS a comment-only diff (i.e. the working tree
  // is not byte-identical to the C4.2.1 final SHA, modulo
  // CRLF). This confirms that P3-A12 changed SOMETHING (the
  // comment) in the production file.
  assert.notEqual(
    workTree.replace(/\r\n/g, '\n'),
    baseSrc.replace(/\r\n/g, '\n'),
    'expected a comment-only diff in the working tree vs C4.2.1 final SHA');
});

// ---------------------------------------------------------------------------
// AV-25 — Golden unchanged + no Provider calls
// ---------------------------------------------------------------------------

test('AV-25 P3-A12 makes no Provider calls and does not update Golden', () => {
  // P3-A12 is a read-only inspection contract formalization.
  // It does not exercise the Provider or update any Golden
  // asset.
  // The Golden auto-update contract is verified at the
  // repo:check / golden:test level (run separately); the
  // absence of Golden assets in the P3-A12 production delta
  // is asserted here.
  const goldenFiles = git(['diff', '--name-only', 'HEAD~1', 'HEAD',
    '--', 'evaluation/golden-cases/', 'evaluation/anti-cases/', 'evaluation/hidden-cases/']);
  assert.equal(goldenFiles, '');
  // No Provider keys or Provider request artifacts in the
  // P3-A12 production delta.
  const secretFiles = git(['diff', '--name-only', 'HEAD~1', 'HEAD',
    '--', '*.key', '*.api-key', 'credentials*']);
  assert.equal(secretFiles, '');
});
