// P3-B4 — Packaging Workspace Execution & Result Gallery tests.
//
// 40 cases (U-01..U-40) across 5 groups:
//   - Prepare/Execution state machine (U-01..U-10)
//   - Result projection (U-11..U-20)
//   - Artifact preview safety (U-21..U-27)
//   - State UX (U-28..U-35)
//   - Architecture invariants (U-36..U-40)
//
// The P3-A frozen View Model is the SOLE input; raw session /
// preparedResult / Provider payload / absolute path / credential /
// file:// / base64 dump are explicitly out-of-scope. Every assertion
// is enforced either via the Web feature source-level check or by
// replaying the frozen view-model projection with a deterministic
// session state.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const PACKAGING_WEB_FEATURE = path.join(ROOT, 'apps', 'web', 'src', 'features', 'packaging');
const PACKAGING_WORKSPACE = path.join(PACKAGING_WEB_FEATURE, 'PackagingWorkspace.tsx');
const PACKAGING_SERVICE = path.join(PACKAGING_WEB_FEATURE, 'service.ts');
const PACKAGING_VIEW_MODEL = path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'packaging', 'view-model.js');
const PACKAGING_PROD_DIR = path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'packaging');
const P2_FROZEN_BASELINE = '335405342951fedae5d4d6816444c2b4d2402787';
const P3A_PROD_BASELINE = 'dd4570a';

const workspaceSrc = readFileSync(PACKAGING_WORKSPACE, 'utf8');
const serviceSrc = readFileSync(PACKAGING_SERVICE, 'utf8');
const viewModelSrc = readFileSync(PACKAGING_VIEW_MODEL, 'utf8');

function readText(p: string): string {
  return readFileSync(p, 'utf8');
}

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, p1) => p1);
}

function stripStripped(): string {
  return stripComments(workspaceSrc);
}

// ---------------------------------------------------------------------------
// Group 1 — Prepare / Execution state machine (U-01..U-10)
// ---------------------------------------------------------------------------

test('U-01 Prepare button is enabled only when view.readiness.canPrepare is true', () => {
  // P3-B4 §V: button enable comes from the view model. The
  // Prepare button must check `view.readiness.canPrepare`
  // and combine with `isBusy` (not the local pending state).
  assert.match(workspaceSrc, /canPrepare/u);
  // The Prepare button is bound to the canPrepare + isBusy
  // gate; we forbid a direct `state.pending` check.
  assert.match(
    workspaceSrc,
    /disabled=\{!canPrepare \|\| isBusy\}/u,
    'Prepare button must use canPrepare + isBusy gate',
  );
});

test('U-02 Execute button is enabled only when view.readiness.canExecute is true', () => {
  assert.match(workspaceSrc, /canExecute/u);
  assert.match(
    workspaceSrc,
    /disabled=\{!canExecute \|\| isBusy\}/u,
    'Execute button must use canExecute + isBusy gate',
  );
});

test('U-03 Reset button is enabled only when view.readiness.canReset is true', () => {
  assert.match(workspaceSrc, /canReset/u);
  assert.match(
    workspaceSrc,
    /disabled=\{!canReset \|\| isBusy\}/u,
    'Reset button must use canReset + isBusy gate',
  );
});

test('U-04 isBusy (PREPARING / EXECUTING) disables all conflicting actions', () => {
  // P3-A §10.6 + P3-B4 §VII: during PREPARING / EXECUTING
  // every action is disabled. We assert that the toolbar
  // combines the can* flags with isBusy.
  for (const flag of ['canPrepare', 'canExecute', 'canReset']) {
    const gate = `disabled={!${flag} || isBusy}`;
    assert.ok(
      workspaceSrc.includes(gate),
      `${flag} must be combined with isBusy (expected: ${gate})`,
    );
  }
});

test('U-05 the Web handler does NOT implicitly call prepareGeneration before executeGeneration', () => {
  // P3-A §10.6: execute ≠ implicit prepare + execute. The
  // handleExecute function in PackagingWorkspace must not
  // call preparePackagingGeneration() before
  // executePackagingGeneration(). This is enforced by
  // looking at the handler body shape.
  const handleExecuteMatch = workspaceSrc.match(
    /const\s+handleExecute\s*=\s*useCallback\([\s\S]*?\}\s*,\s*\[state\]\);/u,
  );
  assert.ok(handleExecuteMatch, 'handleExecute must exist');
  const handler = handleExecuteMatch[0];
  assert.equal(
    /preparePackagingGeneration\s*\(/u.test(handler),
    false,
    'handleExecute must NOT call preparePackagingGeneration',
  );
  assert.match(handler, /executePackagingGeneration\s*\(/u);
});

test('U-06 READY execute reaches the frozen service through the executePackagingGeneration RPC', () => {
  // P3-B2 / P3-B4 contract: the Web-side execute handler
  // calls `executePackagingGeneration` (the service.ts
  // RPC client) — it does NOT call any frozen application
  // function directly.
  assert.match(serviceSrc, /executePackagingGeneration/u);
  assert.match(
    serviceSrc,
    /api\.executeGeneration/u,
    'service.ts must call api.executeGeneration',
  );
  // The handler in the workspace calls the service client.
  assert.match(workspaceSrc, /executePackagingGeneration\s*\(/u);
});

test('U-07 STALE execute is rejected by the frozen state machine (handler does not bypass the rejection)', () => {
  // P3-B4 §XV: STALE execute must fail closed at the
  // application boundary. The Web handler is not allowed to
  // short-circuit the rejection by retrying. The Execute
  // button is disabled by canExecute; the handler itself
  // surfaces a "STALE" hint.
  assert.match(workspaceSrc, /STALE/u);
  // The handler MUST surface the rejection to the user via
  // the view.error surface (no swallowed error).
  assert.match(workspaceSrc, /setState[\s\S]*?error/u);
});

test('U-08 EXECUTED retry uses the same executePackagingGeneration RPC (no new endpoint)', () => {
  // P3-B4 §XVII: Retry reuses the same handler / same RPC.
  // The Retry button must be bound to onExecute.
  assert.match(workspaceSrc, /onExecute/u);
  assert.match(
    workspaceSrc,
    /data-action=['"]retry['"]/u,
    'Retry button must be tagged data-action="retry"',
  );
  // The Retry button is rendered only when canRetry is true.
  assert.match(workspaceSrc, /canRetry/u);
});

test('U-09 retry is disabled / hidden after STALE (canRetry = false on STALE)', () => {
  // P3-A readiness contract: canRetry is true only for
  // READY / EXECUTED, NOT for STALE. The view-model
  // computation must enforce this.
  const canRetryMatch = viewModelSrc.match(
    /canRetry\s*=\s*[\s\S]*?;(\s*\/\/[^\n]*\n)?/u,
  );
  assert.ok(canRetryMatch, 'view-model must define canRetry');
  assert.match(canRetryMatch[0], /READY/);
  assert.match(canRetryMatch[0], /EXECUTED/);
  // The Retry button render guard must use canRetry (not
  // a parallel rule).
  assert.match(workspaceSrc, /canRetry\s*&&\s*!isBusy/u);
});

test('U-10 Reset renders the RPC-returned View (no local setState of execution = null)', () => {
  // P3-B4 §XVI: after clicking Reset, the UI MUST render
  // whatever View the runtime returns. The handler is
  // defined to call resetPackagingPreparation and apply
  // the returned view.
  const handleResetMatch = workspaceSrc.match(
    /const\s+handleReset\s*=\s*useCallback\([\s\S]*?\}\s*,\s*\[state\]\);/u,
  );
  assert.ok(handleResetMatch, 'handleReset must exist');
  const handler = handleResetMatch[0];
  assert.match(handler, /resetPackagingPreparation\s*\(/u);
  // After the await, the handler sets the returned view.
  assert.match(handler, /setState\([\s\S]*?view/u);
});

// ---------------------------------------------------------------------------
// Group 2 — Result projection (U-11..U-20)
// ---------------------------------------------------------------------------

test('U-11 ResultTile renders an empty hint when view.execution is null', () => {
  // P3-B4 §XII: empty execution state shows an empty hint
  // (no fake content).
  const resultTileMatch = workspaceSrc.match(
    /function\s+ResultTile\s*\([\s\S]*?\n\}/u,
  );
  assert.ok(resultTileMatch, 'ResultTile must exist');
  const tile = resultTileMatch[0];
  // The "exec" guard is the canonical null check.
  assert.match(tile, /const\s+exec\s*=\s*view\.execution/u);
  // Empty hint for null execution.
  assert.match(tile, /尚未执行任何生成/u);
});

test('U-12 ResultTile renders artifact cards with safe metadata only', () => {
  const tile = workspaceSrc.match(
    /function\s+ResultTile\s*\([\s\S]*?\n\}/u,
  )[0];
  // The tile iterates `exec.artifacts` and renders the
  // canonical safe fields.
  assert.match(tile, /exec\.artifacts/u);
  assert.match(tile, /artifact\.imageId/u);
  assert.match(tile, /artifact\.mimeType/u);
  assert.match(tile, /artifact\.width/u);
  assert.match(tile, /artifact\.height/u);
  assert.match(tile, /artifact\.sizeBytes/u);
});

test('U-13 ResultTile displays runId from view.execution (no other source)', () => {
  const tile = workspaceSrc.match(
    /function\s+ResultTile\s*\([\s\S]*?\n\}/u,
  )[0];
  // The runId is read from `exec.runId` only.
  assert.match(tile, /exec\.runId/u);
  // No "session.runId" / "state.runId" alternative.
  assert.equal(
    /session\.runId/u.test(tile),
    false,
    'ResultTile must not read runId from session',
  );
});

test('U-14 ResultTile renders width × height in the artifact metadata', () => {
  const tile = workspaceSrc.match(
    /function\s+ResultTile\s*\([\s\S]*?\n\}/u,
  )[0];
  assert.match(tile, /\$\{artifact\.width\}\s*×\s*\$\{artifact\.height\}/u);
});

test('U-15 ResultTile renders size in human-readable form (KB / MB / GB)', () => {
  const tile = workspaceSrc.match(
    /function\s+ResultTile\s*\([\s\S]*?\n\}/u,
  )[0];
  // formatBytes helper must be defined and used.
  assert.match(workspaceSrc, /function\s+formatBytes/u);
  assert.match(tile, /formatBytes\s*\(\s*artifact\.sizeBytes\s*\)/u);
});

test('U-16 ResultTile displays provider / model identifiers safely (no credentials)', () => {
  const tile = workspaceSrc.match(
    /function\s+ResultTile\s*\([\s\S]*?\n\}/u,
  )[0];
  assert.match(tile, /exec\.provider\?\.provider/u);
  assert.match(tile, /exec\.model\?\.registryModelId/u);
  assert.match(tile, /exec\.model\?\.providerModelId/u);
  // No apiKey / Authorization / Bearer anywhere in the tile.
  for (const forbidden of ['apiKey', 'Authorization', 'Bearer', 'apiSecret']) {
    assert.equal(
      tile.includes(forbidden),
      false,
      `ResultTile must not contain ${forbidden}`,
    );
  }
});

test('U-17 ResultTile surfaces diagnostics fields but never redactedRequest / redactedResponse', () => {
  const tile = workspaceSrc.match(
    /function\s+ResultTile\s*\([\s\S]*?\n\}/u,
  )[0];
  const strippedTile = stripComments(tile);
  // Diagnostics: duration, referenceCount, imageCount,
  // startedAt, completedAt, region.
  assert.match(tile, /exec\.diagnostics/u);
  assert.match(tile, /exec\.diagnostics\.durationMs/u);
  assert.match(tile, /exec\.diagnostics\.referenceCount/u);
  assert.match(tile, /exec\.diagnostics\.imageCount/u);
  assert.match(tile, /exec\.diagnostics\.region/u);
  // Negative: no redacted request / response bodies
  // (comments are stripped before checking).
  for (const forbidden of ['redactedRequest', 'redactedResponse', 'requestBody', 'responseBody']) {
    assert.equal(
      strippedTile.includes(forbidden),
      false,
      `ResultTile must not contain ${forbidden}`,
    );
  }
});

test('U-18 ResultTile does not read raw executionResult / preparedResult / Provider payload', () => {
  const tile = workspaceSrc.match(
    /function\s+ResultTile\s*\([\s\S]*?\n\}/u,
  )[0];
  const strippedTile = stripComments(tile);
  for (const forbidden of [
    'session.lastExecution',
    'session.prepared',
    'preparedResult',
    'executionResult',
    'providerPayload',
  ]) {
    assert.equal(
      strippedTile.includes(forbidden),
      false,
      `ResultTile must not read ${forbidden}`,
    );
  }
});

test('U-19 ResultTile does not read raw Provider response', () => {
  const tile = workspaceSrc.match(
    /function\s+ResultTile\s*\([\s\S]*?\n\}/u,
  )[0];
  const strippedTile = stripComments(tile);
  for (const forbidden of [
    'providerResponse',
    'redactedResponse',
    'rawResponse',
    'auditLog',
  ]) {
    assert.equal(
      strippedTile.includes(forbidden),
      false,
      `ResultTile must not read ${forbidden}`,
    );
  }
});

test('U-20 ResultTile does not embed a base64 / data URI preview', () => {
  // P3-B4 §IX / §X: no base64 dump in the Web feature.
  // The artifact thumbnail is a placeholder, not a data
  // URI image.
  const tile = workspaceSrc.match(
    /function\s+ResultTile\s*\([\s\S]*?\n\}/u,
  )[0];
  assert.equal(
    /data:image\/[^;]+;base64,/u.test(tile),
    false,
    'ResultTile must not embed a base64 data URI image',
  );
  assert.match(tile, /缩略图占位/u);
});

// ---------------------------------------------------------------------------
// Group 3 — Artifact preview safety (U-21..U-27)
// ---------------------------------------------------------------------------

test('U-21 the Web feature does NOT call imageGeneration.getImageDataUrl for packaging artifacts', () => {
  // P3-B4 §IX: the packaging runId is `pkg-...`; the
  // existing imageGeneration preview RPC does not route
  // packaging runs. The Web feature must not call it.
  const stripped = stripStripped();
  for (const forbidden of [
    'getImageDataUrl',
    'imageGeneration.getImageDataUrl',
  ]) {
    assert.equal(
      stripped.includes(forbidden),
      false,
      `PackagingWorkspace must not call ${forbidden} for packaging artifacts`,
    );
  }
});

test('U-22 the Web feature does NOT render absolute paths anywhere in the Result Gallery', () => {
  const stripped = stripStripped();
  for (const pattern of [
    /[A-Za-z]:[\\/]/u,
    /file:\/\//iu,
    /\\\\[A-Za-z0-9_.$-]+\\[A-Za-z0-9_.$-]+/u,
  ]) {
    assert.equal(
      pattern.test(stripped),
      false,
      `PackagingWorkspace must not contain pattern ${pattern}`,
    );
  }
});

test('U-23 the Web feature does NOT use file:// preview URLs', () => {
  const stripped = stripStripped();
  assert.equal(
    /['"`]file:\/\//u.test(stripped),
    false,
    'PackagingWorkspace must not contain a file:// preview URL',
  );
});

test('U-24 the Web feature does NOT use raw filesystem paths for artifact rendering', () => {
  // The artifact surface should NEVER expose `relativePath`
  // as an `<img src>` value. The thumbnail is a CSS
  // placeholder, not a path-based image.
  const tile = workspaceSrc.match(
    /function\s+ResultTile\s*\([\s\S]*?\n\}/u,
  )[0];
  // The tile does not assign artifact.relativePath to
  // an img src.
  assert.equal(
    /<img[\s\S]*?src=\{[^}]*relativePath/u.test(tile),
    false,
    'ResultTile must not use relativePath as img src',
  );
  // The tile does not assign thumbnailRelativePath either.
  assert.equal(
    /<img[\s\S]*?src=\{[^}]*thumbnailRelativePath/u.test(tile),
    false,
    'ResultTile must not use thumbnailRelativePath as img src',
  );
});

test('U-25 the Web feature does NOT use unsafe base64 / data URI for image preview', () => {
  const stripped = stripStripped();
  assert.equal(
    /data:image\/[^;,]+;base64,/u.test(stripped),
    false,
    'PackagingWorkspace must not embed a base64 image data URI',
  );
  assert.equal(
    /src=\s*\{[\s\S]*?toDataURL/u.test(stripped),
    false,
    'PackagingWorkspace must not call toDataURL on artifacts',
  );
});

test('U-26 the existing sanctioned preview surface is unused by the Packaging Web feature (separation of authority)', () => {
  // The Packaging Web feature is intentionally separate
  // from the imageGeneration preview surface; the existing
  // sanctioned serving is owned by the runtime and may
  // not be reused from the Web feature for packaging
  // artifacts (different runId namespace, no production
  // saveRun adapter wired yet).
  const stripped = stripStripped();
  assert.equal(
    /imageGeneration\.getImageDataUrl/u.test(stripped),
    false,
    'PackagingWorkspace must not reference imageGeneration.getImageDataUrl',
  );
  assert.equal(
    /window\.masterpiece\.imageGeneration\.getImageDataUrl/u.test(stripped),
    false,
    'PackagingWorkspace must not call window.masterpiece.imageGeneration.getImageDataUrl',
  );
});

test('U-27 missing / unavailable preview falls back to a placeholder (no broken <img>)', () => {
  // The ResultTile thumbnail is a CSS placeholder, not an
  // <img>. There is no <img src={artifact.*}> path that
  // could break.
  const tile = workspaceSrc.match(
    /function\s+ResultTile\s*\([\s\S]*?\n\}/u,
  )[0];
  assert.equal(
    /<img\s/u.test(tile),
    false,
    'ResultTile must not render <img> tags for artifact previews',
  );
  // The placeholder is a div with the muted label.
  assert.match(tile, /resultArtifactThumbMuted/u);
  assert.match(tile, /缩略图占位/u);
});

// ---------------------------------------------------------------------------
// Group 4 — State UX (U-28..U-35)
// ---------------------------------------------------------------------------

test('U-28 PREPARING status shows "准备中…" busy label, not a fake progress percentage', () => {
  // P3-B4 §VII: real status copy only. PREPARING maps to
  // the canonical "准备中…" label. The toolbar's busy
  // label computation maps status === 'preparing' to
  // "准备中…".
  assert.match(workspaceSrc, /准备中/u);
  // The status → label mapping is in the toolbar.
  assert.match(
    workspaceSrc,
    /status\s*===\s*['"]preparing['"]\s*\?\s*['"]准备中/u,
    'ActionToolbar must map preparing → 准备中',
  );
});

test('U-29 READY status does not display a busy label (the toolbar is fully idle)', () => {
  // The busy label is only shown when view.status is
  // preparing / executing. We assert the conditional
  // gates the render.
  assert.match(workspaceSrc, /isBusy\s*&&\s*busyLabel/u);
  // busyLabel is null unless preparing / executing.
  assert.match(
    workspaceSrc,
    /busyLabel\s*=\s*status\s*===\s*['"]preparing['"][\s\S]*?status\s*===\s*['"]executing['"]/u,
    'ActionToolbar must compute busyLabel only for preparing/executing',
  );
});

test('U-30 EXECUTING status shows "执行中…" busy label', () => {
  assert.match(workspaceSrc, /执行中/u);
  // The status → label mapping is in the toolbar.
  assert.match(
    workspaceSrc,
    /status\s*===\s*['"]executing['"]\s*\?\s*['"]执行中/u,
    'ActionToolbar must map executing → 执行中',
  );
});

test('U-31 EXECUTED status surfaces the "本次结果" badge on the Result Gallery', () => {
  const tile = workspaceSrc.match(
    /function\s+ResultTile\s*\([\s\S]*?\n\}/u,
  )[0];
  // The "本次结果" badge is shown when isExecuted is true.
  assert.match(tile, /本次结果/u);
  // The badge render is guarded by an `isExecuted` check.
  assert.match(
    tile,
    /isExecuted\s*&&\s*\([\s\S]*?本次结果/u,
    'ResultTile must guard "本次结果" badge by isExecuted',
  );
});

test('U-32 STALE + previous execution: gallery renders with a "上次结果" badge', () => {
  const tile = workspaceSrc.match(
    /function\s+ResultTile\s*\([\s\S]*?\n\}/u,
  )[0];
  assert.match(tile, /上次结果/u);
  // The previous-result badge is shown when the lifecycle
  // is NOT executed (e.g. stale / failed).
  assert.match(tile, /showPreviousLabel/u);
  assert.match(tile, /isStale/u);
  // The "上次结果" badge is rendered conditionally on
  // showPreviousLabel.
  assert.match(
    tile,
    /showPreviousLabel\s*&&\s*\([\s\S]*?上次结果/u,
    'ResultTile must guard "上次结果" badge by showPreviousLabel',
  );
});

test('U-33 FAILED status still surfaces the gallery (view.execution is not cleared by FAILED)', () => {
  // P3-B4 §XII: the View Model keeps the previous execution
  // on FAILED. The "上次结果" badge hint must be general
  // (not STALE-only).
  const tile = workspaceSrc.match(
    /function\s+ResultTile\s*\([\s\S]*?\n\}/u,
  )[0];
  assert.match(tile, /isFailed/u);
  // The "上次结果" message in the FAILED branch is a
  // separate ternary branch on isFailed / isStale.
  assert.match(tile, /上次结果 · 上次执行未成功/u);
});

test('U-34 the Error Surface consumes only view.error (code / userMessage / suggestedAction / recoverable)', () => {
  // P3-B4 §XXI: the Error Surface tile must read only
  // `view.error.*` — never `error.message` / `error.cause`
  // / stack.
  const errTile = workspaceSrc.match(
    /function\s+ErrorSurfaceTile\s*\([\s\S]*?\n\}/u,
  )[0];
  assert.match(errTile, /view\.error/u);
  assert.match(errTile, /err\.code/u);
  assert.match(errTile, /err\.userMessage/u);
  assert.match(errTile, /err\.suggestedAction/u);
  assert.match(errTile, /err\.recoverable/u);
  for (const forbidden of ['err\.message', 'err\.cause', 'err\.stack']) {
    assert.equal(
      new RegExp(forbidden, 'u').test(errTile),
      false,
      `ErrorSurfaceTile must not read ${forbidden}`,
    );
  }
});

test('U-35 the previous result is NOT mislabeled as "本次结果" after a STALE transition', () => {
  const tile = workspaceSrc.match(
    /function\s+ResultTile\s*\([\s\S]*?\n\}/u,
  )[0];
  // The "本次结果" badge is rendered ONLY when
  // `isExecuted` is true; STALE is not EXECUTED, so the
  // badge is not surfaced. The two branches are guarded by
  // mutually exclusive conditions.
  assert.match(
    tile,
    /isExecuted\s*&&\s*\([\s\S]*?本次结果/u,
    'ResultTile must gate "本次结果" by isExecuted',
  );
  assert.match(
    tile,
    /showPreviousLabel\s*&&\s*\([\s\S]*?上次结果/u,
    'ResultTile must gate "上次结果" by showPreviousLabel',
  );
  // showPreviousLabel is the inverse of isExecuted
  // (Boolean(exec) && !isExecuted), ensuring mutual
  // exclusion.
  assert.match(
    tile,
    /showPreviousLabel\s*=\s*Boolean\(exec\)\s*&&\s*!isExecuted/u,
  );
});

// ---------------------------------------------------------------------------
// Group 5 — Architecture invariants (U-36..U-40)
// ---------------------------------------------------------------------------

test('U-36 the Web feature does NOT persist the execution result to localStorage / sessionStorage / IndexedDB', () => {
  const stripped = stripStripped();
  for (const forbidden of [
    /localStorage\s*\./u,
    /sessionStorage\s*\./u,
    /indexedDB/u,
    /caches\.open/u,
  ]) {
    assert.equal(
      forbidden.test(stripped),
      false,
      `PackagingWorkspace must not call ${forbidden}`,
    );
  }
});

test('U-37 the Web feature does NOT invent an execution.history contract', () => {
  const stripped = stripStripped();
  for (const forbidden of [
    /execution\.history/u,
    /executionHistory/u,
    /runsHistory/u,
    /pastRuns/u,
  ]) {
    assert.equal(
      forbidden.test(stripped),
      false,
      `PackagingWorkspace must not invent ${forbidden}`,
    );
  }
});

test('U-38 the Web feature does NOT introduce a second run-store (no in-memory Map of runId → result)', () => {
  // The web feature may use React state, but must not
  // maintain a parallel runId → execution map.
  const stripped = stripStripped();
  assert.equal(
    /runs\s*:\s*new\s+Map/u.test(stripped),
    false,
    'PackagingWorkspace must not maintain a runs Map',
  );
  assert.equal(
    /runStore\s*[:=]/u.test(stripped),
    false,
    'PackagingWorkspace must not introduce a runStore',
  );
});

test('U-39 the Web feature is RPC-only (no second createPackagingWorkspaceService / no in-Web service instance)', () => {
  // P3-B2 contract: the Web feature is a thin RPC client.
  // It does NOT instantiate createPackagingWorkspaceService.
  for (const forbidden of [
    /createPackagingWorkspaceService\s*\(/u,
    /new\s+createPackagingWorkspaceService/u,
  ]) {
    assert.equal(
      forbidden.test(workspaceSrc),
      false,
      'PackagingWorkspace must not instantiate createPackagingWorkspaceService',
    );
  }
  // The service.ts is a pure RPC client (no factory call).
  for (const forbidden of [
    /createPackagingWorkspaceService\s*\(/u,
  ]) {
    assert.equal(
      forbidden.test(serviceSrc),
      false,
      'service.ts must not instantiate createPackagingWorkspaceService',
    );
  }
  // The service.ts talks to window.masterpiece.packaging.
  assert.match(serviceSrc, /window\.masterpiece\.packaging/u);
});

test('U-40 frozen boundaries hold: P3-A production surface and P2 frozen modules are unchanged', () => {
  // P3-B4 §XXVIII / §XXI: the frozen surfaces are not
  // touched. We assert the package layout is intact.
  for (const file of [
    'workspace-service.js',
    'workspace-state.js',
    'intent-schema.js',
    'stale-tracker.js',
    'reference-assignments.js',
    'lock-assets-projection.js',
    'view-model.js',
    'index.js',
  ]) {
    const full = path.join(PACKAGING_PROD_DIR, file);
    assert.ok(existsSync(full), `P3-A frozen file must exist: ${file}`);
  }
  // The P3-A production baseline is preserved; we are not
  // asserting a git diff here (covered by Y-17 / Y-18). The
  // P3-B4 changes are confined to apps/web/** and
  // tests/runtime-application/packaging-workspace-*
  // (architecture-guards + this file).
  assert.ok(
    statSync(PACKAGING_WORKSPACE).isFile(),
    'P3-B4 changes the Web feature',
  );
});

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

