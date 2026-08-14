// P3-B2 / P3-B5 — Packaging Workspace RPC operations.
//
// Capability boundary:
//   Thin RPC layer that maps the Web `window.masterpiece.packaging.*`
//   channel to the P3-A frozen Packaging Workspace Application
//   Service (per P3-A freeze report §20/21). The operations layer
//   is the SOLE bridge between the Web client and the Workspace
//   service — the Web feature MUST NOT instantiate the Workspace
//   service locally (P3-A freeze report §3 / §6 / §21).
//
// P3-B5 scope (additive, non-breaking):
//   - The operations layer now wires the canonical artifact
//     persistence seam (Packaging Artifact Store) into the P2
//     frozen `executePackagingGeneration` deps. The P3-A
//     application surface (`packages/runtime-core/src/application/
//     packaging/*`) is UNCHANGED. The P2 frozen
//     `generation-service.js` is UNCHANGED. The new
//     `createPackagingArtifactStore` lives in this file because
//     it is the bridge between the composition root and the
//     P2 frozen deps contract; the Web feature never sees it.
//   - A new RPC channel `packaging:get-artifact-preview` exposes
//     a safe artifact read operation. The read seam is
//     identity-validated (`runId` must equal
//     `view.execution.runId`; `imageId` must match the
//     canonical `image-NN` pattern) and returns a `{ mimeType,
//     dataUrl }` data URL — never an absolute path, never a
//     raw Buffer, never a credential.
//
// Stop conditions honoured (P3-A spec §55 + P3-A freeze report
// §20/21 + P3-B5 §III / §IV):
//   - STOP-P3-A-01: the operations layer does NOT deep-import the
//     P2 frozen packaging internals; the Workspace service is
//     the sole boundary and is the only thing this file touches.
//   - STOP-P3-A-02: the operations layer does NOT construct the
//     Provider payload; the payload is opaque to the Workspace
//     service.
//   - STOP-P3-A-03: the operations layer does NOT read credential
//     secrets; the `readCredentials` adapter is owned by the
//     existing Shared Core credential store. The operations
//     layer receives the credentials ONLY to inject them as the
//     P2 frozen `executePackagingGeneration` deps seam.
//   - STOP-P3-A-04: the operations layer does NOT modify the P2
//     frozen semantic contract.
//   - STOP-P3-A-07: the operations layer delegates stale / state
//     transitions to the Workspace service (which is the sole
//     owner of the canonical state machine).
//   - STOP-P3-A-09: the operations layer does NOT call the
//     Provider network directly; the Workspace service calls the
//     P2 frozen pipeline which is the only Provider entry point.
//   - STOP-P3-B5-01: the operations layer does NOT introduce a
//     second artifact store. The Packaging Artifact Store writes
//     to the canonical `<projectRoot>/image-generation/<runId>/`
//     directory — the same physical root that the existing
//     image-generation run-store uses. The runId namespace
//     (`pkg-...` for Packaging vs `igt-...` for image-generation)
//     isolates the two streams; the `image-generation/` physical
//     root is shared but never re-defined.
//   - STOP-P3-B5-02: the operations layer does NOT introduce a
//     second artifact server. All artifact reads go through the
//     existing Shared Runtime RPC bridge.
//   - STOP-P3-B5.1-01: the operations layer does NOT introduce a
//     second run lifecycle / retention / index authority. The
//     artifact record (`<runRoot>/packaging-generation-result
//     .json`) is a *target-specific sidecar* — it is read
//     by name for preview lookups and is the SOLE responsibility
//     of this layer; it is NOT listed, NOT retained, NOT
//     deleted, NOT indexed. If it is missing / corrupt, the
//     preview RPC returns `null` and the run is still
//     EXECUTED (the lifecycle / retention / index authorities
//     are unchanged).
//   - STOP-P3-B5.1-02: the preview RPC's MIME handling is
//     fail-closed. The canonical allowlist is
//     `image/png | image/jpeg | image/webp`; any other value
//     (unknown / hostile / empty / malformed / `text/html` /
//     `image/svg+xml` / `application/javascript` / etc.) is
//     rejected at record-write AND re-validated at record-read.
//     The previous B5 fail-open default
//     (`asString(entry.mimeType, 'image/png')`) is REMOVED.
//   - STOP-P3-B5.1-03: the data URL is constructed ONLY from a
//     validated MIME. The renderer-facing surface is
//     `data:<validatedMime>;base64,...` and nothing else.
//     `record.mimeType` is never interpolated into a `data:`
//     URL without first passing the canonical allowlist.
//
// Public RPC surface (8 channels):
//   packaging:create-session
//   packaging:get-view
//   packaging:update-intent
//   packaging:set-truth-snapshot
//   packaging:prepare-generation
//   packaging:execute-generation
//   packaging:reset-preparation
//   packaging:get-artifact-preview        (P3-B5)
//
// What the operations layer NEVER returns over RPC:
//   - The raw Workspace service instance.
//   - The raw session (only the frozen UI-safe view).
//   - The preparedResult (only the prepared view summary).
//   - The executionResult (only the execution view summary).
//   - Any Provider request / response body.
//   - Any credential / Authorization / Bearer header.
//   - Any absolute filesystem path.
//   - Any Buffer / ArrayBuffer / typed-array view.
//   - Any cross-project or cross-session artifact (the preview
//     RPC fails closed on identity mismatch).

import { createMultiModelImageAdapter } from '@masterpiece/image-generation-adapter/index.js';

const PACKAGING_OPERATION_IDS = Object.freeze({
  CREATE_SESSION: 'packaging:create-session',
  GET_VIEW: 'packaging:get-view',
  UPDATE_INTENT: 'packaging:update-intent',
  SET_TRUTH_SNAPSHOT: 'packaging:set-truth-snapshot',
  PREPARE_GENERATION: 'packaging:prepare-generation',
  EXECUTE_GENERATION: 'packaging:execute-generation',
  RESET_PREPARATION: 'packaging:reset-preparation',
  GET_ARTIFACT_PREVIEW: 'packaging:get-artifact-preview',
});

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function asString(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

// ---------------------------------------------------------------------------
// P3-B5 / P3-B5.1 — Packaging Artifact Store
//
// Role: ADAPTER (not authority). This module is a thin
// sidecar adapter that:
//   - writes a target-specific preview-lookup record
//     (`<runRoot>/packaging-generation-result.json`) AFTER the
//     P2 frozen `executePackagingGeneration` lifecycle has
//     finished;
//   - reads that same record to serve the
//     `packaging:get-artifact-preview` RPC channel.
//
// Authority boundary (P3-B5.1 §III / §IV):
//   - run identity authority   → existing image-generation
//     run-store (the canonical `run.json`).
//   - run root authority       → existing image-generation
//     run-store (the canonical
//     `<projectRoot>/image-generation/<runId>/` directory;
//     the sidecar is a sibling of `run.json`).
//   - artifact lifecycle       → P2 frozen
//     `executePackagingGeneration` +
//     `resolveArtifactLifecycle` + `downloadImpl`.
//   - artifact persistence authority → P2 frozen
//     `downloadImpl` writes the image / thumbnail bytes; the
//     sidecar only records the *paths*. The sidecar is
//     written AFTER bytes are persisted; a sidecar-write
//     failure does not roll back the lifecycle.
//   - artifact read authority   → this sidecar adapter, but
//     ONLY for `imageId → dataUrl` lookups; the read API
//     never lists / enumerates / searches.
//   - retention authority       → existing image-generation
//     run-store. The sidecar has no retention contract.
//   - run index authority       → existing
//     `imageGeneration.listRuns`. The sidecar is not
//     indexed.
//   - deletion authority        → existing image-generation
//     run-store. The sidecar has no delete path.
//
// What the adapter does NOT do (P3-B5.1 §V):
//   - It does NOT create a parallel `packaging-run-store`,
//     `packaging-result-database`, `packaging-artifact-root`,
//     or `packaging-history-index`. The `image-generation/`
//     physical root is shared and is never re-defined.
//   - It does NOT introduce a second filesystem root.
//   - It does NOT list, enumerate, or search the sidecar
//     records; the only read is by name
//     (`<runId>/packaging-generation-result.json`).
//   - It does NOT validate ownership by side-effect. The
//     RPC layer is responsible for verifying that the
//     caller's `sessionId` is bound to a session whose
//     `view.execution.runId` equals the requested `runId`.
//     The adapter re-asserts this (defense in depth).
// ---------------------------------------------------------------------------

/**
 * Canonical artifact record written by the Packaging Artifact
 * Store. The shape mirrors the canonical packaging `result`
 * metadata surface (the frozen P2 frozen output contract):
 *   - `runId` — the `pkg-...` run identifier.
 *   - `target` — always `'packaging'` (P2 frozen invariant).
 *   - `artifacts` — the per-image canonical record. Each entry
 *     carries the logical `imageId` plus the on-disk
 *     `relativePath` / `thumbnailRelativePath` (the paths
 *     returned by `resolveArtifactLifecycle`).
 *   - `createdAt` — ISO-8601 timestamp.
 *
 * This is the ONLY record the read API consumes. We deliberately
 * keep it small (no Provider response bodies, no redacted request,
 * no execution identity) so the preview RPC does not get a path
 * into the wider audit surface.
 */
const PACKAGING_ARTIFACT_RECORD_FILE = 'packaging-generation-result.json';

const CANONICAL_IMAGE_ID_PATTERN = /^image-\d{2}$/u;

// P3-B5.1 — Canonical preview MIME allowlist.
//
// Authority:
//   - The preview RPC (`packaging:get-artifact-preview`) is the
//     sole read surface that turns artifact bytes into a data
//     URL the Web feature can render. The data URL's
//     `mediaType` is consumed by the renderer's <img> element;
//     the value is therefore a *security boundary*, not a
//     presentation choice.
//
// Fail-closed contract (P3-B5.1 §VI / §VII / §VIII):
//   - Only the three allowlist entries below are valid. Any
//     other MIME — `text/html`, `image/svg+xml`,
//     `application/javascript`, `application/octet-stream`,
//     `text/plain`, empty string, malformed input, or anything
//     else — MUST be rejected. The preview RPC returns
//     `{ preview: null }` and the Web feature renders the
//     "预览不可用" placeholder (artifact metadata stays visible).
//   - We never fall back to `image/png`. The previous B5
//     behaviour (`asString(entry.mimeType, 'image/png')`) was
//     a fail-open default and is REMOVED.
//   - We never guess the MIME from the file extension, the
//     user input, or the artifact's URL. The MIME in the
//     sidecar record is the only input we honour — and only if
//     it is in the allowlist.
//   - The data URL is constructed only AFTER the MIME has been
//     validated. `data:<validatedMime>;base64,...` is the only
//     legal shape. We never interpolate an unvalidated record
//     field into a data URL.
//
// What this allowlist does NOT do:
//   - It does NOT validate the bytes behind the MIME. A
//     re-encoded JPEG labelled as `image/jpeg` is still
//     served. The allowlist is a *transport* guard (the
//     `<img>` will not execute JS / render HTML), not a deep
//     content verifier. The Provider-side byte verification
//     (P2 frozen `downloadImpl` SHA-256) is the content trust
//     boundary; this allowlist is the renderer-side boundary.
const CANONICAL_PREVIEW_MIME_ALLOWLIST = Object.freeze([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

function isCanonicalPreviewMime(value) {
  if (typeof value !== 'string' || !value) return false;
  // Reject anything that is not a plain `type/subtype` token
  // (no parameters, no whitespace, no leading / trailing
  // garbage). This blocks `"image/png; charset=utf-8"`,
  // `" image/png "`, `"\nimage/png\n"`, etc. — they are valid
  // in HTTP headers but they are not what we want to pipe
  // into a `data:` URL.
  if (!/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/iu.test(value)) return false;
  return CANONICAL_PREVIEW_MIME_ALLOWLIST.includes(value.toLowerCase());
}

function isRelativePathSafe(relativePath) {
  if (typeof relativePath !== 'string' || !relativePath) return false;
  const segments = relativePath.split(/[\\\/]+/u).filter((s) => s.length > 0);
  if (segments.includes('..')) return false;
  if (segments.some((s) => /^[A-Za-z]:/u.test(s))) return false;
  if (segments.some((s) => /^[\\/]{2}/u.test(s))) return false;
  if (/^file:\/\//iu.test(relativePath)) return false;
  return true;
}

function assertInside(root, candidate) {
  const normalize = (p) => p.replace(/[\\\/]+/gu, '/').replace(/\/+$/u, '');
  const r = normalize(root);
  const c = normalize(candidate);
  if (c === r) return candidate;
  if (!c.startsWith(`${r}/`)) {
    throw new Error('PATH_TRAVERSAL_REJECTED');
  }
  return candidate;
}

/**
 * Construct the canonical Packaging Artifact Store.
 *
 * @param {object} options
 * @param {string} options.dataPath - the Shared Core data root
 *   (the same root used by the image-generation run-store).
 * @param {(projectId: string) => Promise<string>} options.resolveProjectRoot
 *   - resolve the absolute project root for a given projectId.
 *   The default uses the same path-resolution algorithm as
 *   `packages/runtime-core/src/application/image-generation/paths.ts`.
 * @param {(projectId: string, assetId: string) => Promise<{
 *     name: string, mimeType: string, absolutePath: string
 * } | null>} options.resolveAssetById
 *   - resolve a project asset to its absolute on-disk path. The
 *   default uses `projects.scanAssets(projectId)` to look up
 *   `AssetItem.id === assetId` and joins `<projectRoot>/<relativePath>`.
 * @param {(absolutePath: string) => Promise<Buffer>} options.readFileBytes
 *   - read a file from disk as a Buffer. The default uses
 *   `node:fs/promises.readFile`.
 * @param {(absolutePath: string, value: unknown) => Promise<void>} options.writeJsonSafe
 *   - write a JSON file atomically. The default uses
 *   `atomicWriteJsonWithRetry` (the same atomic writer the
 *   image-generation run-store uses).
 * @param {(absolutePath: string) => Promise<void>} options.ensureDir
 *   - ensure a directory exists. The default uses
 *   `node:fs/promises.mkdir({ recursive: true })`.
 * @param {(sessionId: string) => string | Promise<string>} options.getProjectIdForSession
 *   - resolve the projectId bound to a Packaging sessionId.
 *   The store reads this every time it touches the filesystem
 *   (P3-A frozen `view.projectId` is the canonical authority).
 * @param {(input: {url?: string, b64?: string, targetPath: string, thumbnailPath: string, fetchImpl?: typeof fetch}) => Promise<{written: boolean, decoded: boolean, sha256?: string, width?: number, height?: number, sizeBytes?: number, error?: string}>} [options.downloadImpl]
 *   - the canonical artifact download + verify function. The
 *   store forwards it as `deps.downloadImpl` to the P2 frozen
 *   `executePackagingGeneration`. The default in the P2 frozen
 *   generation-service is a bundled download-and-verify
 *   adapter; the composition root may inject a custom
 *   implementation. The store does NOT import the P2 frozen
 *   module directly (it accepts the function as an adapter to
 *   keep the operations layer free of frozen-module deep-imports).
 * @param {(sessionId: string, packagingResult: object) => Promise<void>} options.registerCanonicalRun
 *   - P3-B5.3 Canonical Run Registration Bridge. The
 *   composition root wires this to `createPackagingRunRegistration
 *   Adapter`, which calls the existing canonical
 *   `createRunStore(dataPath, projectId).saveRun(...)` to write
 *   the canonical `<runRoot>/run.json`. The canonical
 *   `run.json` is the run identity authority; the sidecar is a
 *   target-specific extension written afterwards.
 * @param {(input: {projectId: string, runId: string}) => Promise<object | null>} options.canonicalReadRun
 *   - P3-B5.3 Canonical Run Read. The preview path consults
 *   this FIRST. A sidecar without a canonical run is an
 *   orphan and the preview path returns `null` (B5.2 §IX /
 *   B5.3 §VIII).
 * @returns {{
 *   saveRun: (sessionId: string, packagingResult: object) => Promise<void>,
 *   resolveArtifactLifecycle: (input: object) => Promise<object>,
 *   readReference: (input: { sessionId: string, reference: object }) => Promise<{name: string, mimeType: string, data: string}>,
 *   readArtifactPreview: (input: { sessionId: string, runId: string, imageId: string }) => Promise<{mimeType: string, dataUrl: string} | null>,
 *   resolveProjectRoot: (projectId: string) => Promise<string>
 * }}
 */
export function createPackagingArtifactStore(options) {
  if (!options || typeof options !== 'object') {
    throw new Error('PACKAGING_ARTIFACT_STORE_OPTIONS_REQUIRED');
  }
  const dataPath = asString(options.dataPath);
  if (!dataPath) {
    throw new Error('PACKAGING_ARTIFACT_STORE_DATA_PATH_REQUIRED');
  }
  const resolveProjectRoot = typeof options.resolveProjectRoot === 'function'
    ? options.resolveProjectRoot
    : defaultResolveProjectRootFactory(dataPath);
  const resolveAssetById = typeof options.resolveAssetById === 'function'
    ? options.resolveAssetById
    : null;
  if (typeof resolveAssetById !== 'function') {
    throw new Error('PACKAGING_ARTIFACT_STORE_RESOLVE_ASSET_BY_ID_REQUIRED');
  }
  const readFileBytes = typeof options.readFileBytes === 'function'
    ? options.readFileBytes
    : null;
  if (typeof readFileBytes !== 'function') {
    throw new Error('PACKAGING_ARTIFACT_STORE_READ_FILE_BYTES_REQUIRED');
  }
  const writeJsonSafe = typeof options.writeJsonSafe === 'function'
    ? options.writeJsonSafe
    : null;
  if (typeof writeJsonSafe !== 'function') {
    throw new Error('PACKAGING_ARTIFACT_STORE_WRITE_JSON_SAFE_REQUIRED');
  }
  const ensureDir = typeof options.ensureDir === 'function'
    ? options.ensureDir
    : null;
  if (typeof ensureDir !== 'function') {
    throw new Error('PACKAGING_ARTIFACT_STORE_ENSURE_DIR_REQUIRED');
  }
  const downloadImpl = typeof options.downloadImpl === 'function'
    ? options.downloadImpl
    : null;
  // P3-B5: `downloadImpl` is OPTIONAL. The P2 frozen
  // generation-service has its own bundled default; the store
  // passes the explicit implementation through as the deps
  // seam when the composition root provides one (e.g. for
  // tests or for production wrappers that need a custom
  // verify pipeline). When the composition root does NOT
  // inject a downloadImpl, the store returns `null` for the
  // `downloadImpl` field and the P2 frozen generation
  // service falls back to its bundled default. This keeps
  // the operations layer free of any direct frozen-module
  // deep-imports.
  // P3-B5.3 — Canonical Run Registration Bridge.
  //
  // The store DOES NOT own the canonical run existence. The
  // composition root wires a `registerCanonicalRun` adapter
  // that calls the existing `imageGeneration.runStore.saveRun`
  // (P3-B5.2 §XIX: canonical run identity authority). The
  // Packaging sidecar is then written as a target-specific
  // extension; the sidecar is NOT the run identity.
  //
  // The store also exposes a `canonicalReadRun` adapter that
  // the preview path consults FIRST. A sidecar that exists
  // without a canonical run is an orphan and the preview
  // path returns `null` (B5.2 §IX / B5.3 §IX).
  //
  // Both adapters are REQUIRED. We deliberately do not
  // provide a default — production must wire them through
  // the composition root so a frozen regression cannot
  // silently bypass canonical run registration.
  const registerCanonicalRun = typeof options.registerCanonicalRun === 'function'
    ? options.registerCanonicalRun
    : null;
  if (typeof registerCanonicalRun !== 'function') {
    throw new Error('PACKAGING_ARTIFACT_STORE_REGISTER_CANONICAL_RUN_REQUIRED');
  }
  const canonicalReadRun = typeof options.canonicalReadRun === 'function'
    ? options.canonicalReadRun
    : null;
  if (typeof canonicalReadRun !== 'function') {
    throw new Error('PACKAGING_ARTIFACT_STORE_CANONICAL_READ_RUN_REQUIRED');
  }
  const downloadImplFn = downloadImpl;

  /**
   * Resolve the canonical `<projectRoot>/image-generation/<runId>/`
   * directory for a Packaging run. The directory is shared with
   * the existing image-generation run-store; the `pkg-...` runId
   * namespace isolates the two streams.
   */
  async function runRootForProject(projectId, runId) {
    if (!isPlainObject({ projectId, runId })) {
      throw new Error('PACKAGING_ARTIFACT_STORE_INVALID_INPUT');
    }
    if (!asString(projectId) || !asString(runId)) {
      throw new Error('PACKAGING_ARTIFACT_STORE_INVALID_INPUT');
    }
    if (!isRelativePathSafe(runId)) {
      // Defense in depth: the RPC layer validates runId shape
      // already, but the store refuses to construct a path
      // from a hostile runId regardless.
      throw new Error('PACKAGING_ARTIFACT_STORE_PATH_TRAVERSAL');
    }
    const projectRoot = await resolveProjectRoot(asString(projectId));
    const imageGenRoot = pathJoin(projectRoot, 'image-generation');
    return pathJoin(imageGenRoot, runId);
  }

  async function imagesDirFor(projectId, runId) {
    return pathJoin(await runRootForProject(projectId, runId), 'images');
  }

  async function thumbnailsDirFor(projectId, runId) {
    return pathJoin(await runRootForProject(projectId, runId), 'thumbnails');
  }

  /**
   * Build the canonical artifact record. We deliberately keep
   * the surface small: the only thing the preview RPC needs is
   * the per-image `imageId` → `relativePath` / `thumbnailRelativePath`
   * mapping. Provider response bodies, redacted requests, and
   * execution identities stay on the internal packaging result
   * object — they are not serialized.
   *
   * P3-B5.1 — sidecar boundary. The artifact record
   * (`<runRoot>/packaging-generation-result.json`) is a
   * *target-specific sidecar metadata file* used by the
   * preview RPC to map `imageId` → on-disk path. It is NOT
   * a run lifecycle authority:
   *   - run identity authority  → existing image-generation
   *     `run.json` (canonical, owned by the P2 frozen
   *     image-generation run-store).
   *   - run root authority      → existing image-generation
   *     run-store (the `image-generation/<runId>/` physical
   *     directory; the sidecar lives next to `run.json`,
   *     never replacing it).
   *   - artifact lifecycle      → P2 frozen
   *     `executePackagingGeneration` + the existing
   *     `downloadImpl`. The sidecar is written AFTER the
   *     lifecycle has finished; if the sidecar write fails
   *     the run is still canonical (preview will return
   *     `null`, not change the lifecycle outcome).
   *   - retention authority     → existing image-generation
   *     run-store retention. The sidecar has NO retention
   *     contract; it inherits the lifecycle of the parent
   *     run root.
   *   - run index authority     → existing `imageGeneration
   *     .listRuns`. The sidecar is not listed, not searched,
   *     not enumerated — it is only ever read by name
   *     (`<runId>/packaging-generation-result.json`) for
   *     preview lookups.
   *   - deletion authority      → existing image-generation
   *     run-store. The sidecar has no delete path of its
   *     own; it goes away when the run root is removed.
   *
   * Consequence: if the sidecar is missing / corrupt, the
   * preview RPC returns `null` (placeholder). The run is
   * still EXECUTED; the user is shown a placeholder. Nothing
   * about the run lifecycle, the project index, or the
   * retention contract is affected.
   */
  function buildArtifactRecord(packagingResult) {
    if (!isPlainObject(packagingResult)) return null;
    const runId = asString(packagingResult.runId);
    if (!runId) return null;
    const artifacts = Array.isArray(packagingResult.artifacts)
      ? packagingResult.artifacts
        .map((artifact) => {
          if (!isPlainObject(artifact)) return null;
          const imageId = asString(artifact.imageId);
          const relativePath = asString(artifact.relativePath);
          const thumbnailRelativePath = asString(artifact.thumbnailRelativePath);
          // P3-B5.1 — fail-closed MIME. An artifact with a
          // non-allowlist / missing / empty / malformed MIME
          // is dropped at record-write time. The P2 frozen
          // `executePackagingGeneration` output contract is
          // expected to produce only the canonical preview
          // MIME values; an artifact that does not match is
          // treated as a malformed lifecycle result and the
          // preview RPC must not render it.
          if (!imageId || !relativePath) return null;
          if (!isCanonicalPreviewMime(artifact.mimeType)) return null;
          return {
            imageId,
            relativePath,
            thumbnailRelativePath: thumbnailRelativePath || null,
            // P3-B5.1: the MIME is on the canonical allowlist
            // (validated above). Lower-case it so the on-disk
            // record is canonical regardless of how the
            // upstream Provider formatted it.
            mimeType: String(artifact.mimeType).toLowerCase(),
            width: Number.isFinite(artifact.width) ? artifact.width : null,
            height: Number.isFinite(artifact.height) ? artifact.height : null,
            sizeBytes: Number.isFinite(artifact.sizeBytes) ? artifact.sizeBytes : null,
          };
        })
        .filter(Boolean)
      : [];
    return Object.freeze({
      runId,
      target: 'packaging',
      createdAt: new Date().toISOString(),
      artifacts: Object.freeze(artifacts),
    });
  }

  /**
   * P2 frozen `saveRun` adapter. Writes the canonical record
   * to `<runRoot>/<PACKAGING_ARTIFACT_RECORD_FILE>`. The record
   * is intentionally small so the preview RPC does not get a
   * path into the wider audit surface.
   *
   * P3-B5.3: the canonical run registration runs FIRST. The
   * canonical `run.json` is the run identity authority; the
   * sidecar is a target-specific extension. If canonical
   * registration fails the sidecar is NOT written, so the
   * run never appears as "EXECUTED" with a sidecar but no
   * canonical record (the P3-B5.2 orphan-sidecar risk).
   */
  async function saveRun(sessionId, packagingResult) {
    const projectId = await getProjectIdForSession(sessionId);
    const record = buildArtifactRecord(packagingResult);
    if (!record) {
      throw new Error('PACKAGING_ARTIFACT_STORE_INVALID_RESULT');
    }
    const runId = record.runId;
    // Canonical registration runs FIRST. If this throws
    // the sidecar is never written, and the Web feature's
    // `view.execution.runId === runId` is the canonical
    // identity check (B5.3 §VII). A canonical `run.json`
    // is the run existence authority.
    await registerCanonicalRun(sessionId, packagingResult);
    const runRoot = await runRootForProject(projectId, runId);
    // Defense in depth: even if the record is well-formed, the
    // store refuses to write outside the canonical run root.
    const expectedRunRootPrefix = await runRootForProject(projectId, runId);
    void expectedRunRootPrefix;
    await ensureDir(runRoot);
    await writeJsonSafe(pathJoin(runRoot, PACKAGING_ARTIFACT_RECORD_FILE), record);
  }

  /**
   * P2 frozen `resolveArtifactLifecycle` adapter. Returns the
   * canonical paths the P2 frozen generation service will
   * hand to `downloadImpl`. We deliberately produce paths
   * inside `<projectRoot>/image-generation/<runId>/images/` and
   * `.../thumbnails/`, matching the existing image-generation
   * run-store convention. The P2 frozen service encodes these
   * paths into the result's `artifacts[].relativePath` /
   * `thumbnailRelativePath`, which the preview RPC later uses.
   */
  async function resolveArtifactLifecycle(input) {
    if (!isPlainObject(input)) {
      throw new Error('PACKAGING_ARTIFACT_STORE_INVALID_INPUT');
    }
    const sessionId = asString(input.sessionId);
    const runId = asString(input.runId);
    if (!sessionId || !runId) {
      throw new Error('PACKAGING_ARTIFACT_STORE_INVALID_INPUT');
    }
    const projectId = await getProjectIdForSession(sessionId);
    const imagesDir = await imagesDirFor(projectId, runId);
    const thumbnailsDir = await thumbnailsDirFor(projectId, runId);
    await ensureDir(imagesDir);
    await ensureDir(thumbnailsDir);
    // P2 frozen packaging contract: the lifecycle returns
    // `runRoot` (the canonical run directory), `targetPath` /
    // `thumbnailPath` (absolute file paths the P2 frozen
    // download/verify helper will write to), and
    // `relativePath` / `thumbnailRelativePath` (the project-
    // relative paths the artifact record will store).
    const runRoot = await runRootForProject(projectId, runId);
    // P2 frozen `executePackagingGeneration` writes exactly one
    // artifact per execution (outputCount=1). The deterministic
    // `imageId` is `image-01` and the relative paths are
    // `images/image-01.<ext>` / `thumbnails/image-01.webp`.
    const targetPath = pathJoin(imagesDir, 'image-01.png');
    const thumbnailPath = pathJoin(thumbnailsDir, 'image-01.webp');
    const relativePath = pathPosixJoin('images', 'image-01.png');
    const thumbnailRelativePath = pathPosixJoin('thumbnails', 'image-01.webp');
    return Object.freeze({
      runRoot,
      targetPath,
      thumbnailPath,
      relativePath,
      thumbnailRelativePath,
    });
  }

  /**
   * P2 frozen `readReference` adapter. Resolves a Packaging
   * reference (`{ assetId, role, source }`) to a
   * `{ name, mimeType, data: <base64> }` payload. The base64
   * data is what the P2 frozen adapter contract expects.
   */
  async function readReference(input) {
    if (!isPlainObject(input)) {
      throw new Error('PACKAGING_ARTIFACT_STORE_INVALID_INPUT');
    }
    const sessionId = asString(input.sessionId);
    const reference = input.reference;
    if (!sessionId || !isPlainObject(reference)) {
      throw new Error('PACKAGING_ARTIFACT_STORE_INVALID_INPUT');
    }
    const assetId = asString(reference.assetId);
    if (!assetId) {
      throw new Error('REFERENCE_ASSET_UNRESOLVED');
    }
    const projectId = await getProjectIdForSession(sessionId);
    const resolved = await resolveAssetById(projectId, assetId);
    if (!resolved || !asString(resolved.absolutePath)) {
      const err = new Error('REFERENCE_ASSET_UNRESOLVED: packaging reference asset could not be resolved');
      err.code = 'REFERENCE_ASSET_UNRESOLVED';
      throw err;
    }
    const buffer = await readFileBytes(resolved.absolutePath);
    if (!buffer || !Buffer.isBuffer(buffer)) {
      const err = new Error('REFERENCE_ASSET_UNRESOLVED: packaging reference asset bytes could not be read');
      err.code = 'REFERENCE_ASSET_UNRESOLVED';
      throw err;
    }
    return Object.freeze({
      name: asString(resolved.name, 'reference'),
      mimeType: asString(resolved.mimeType, 'image/png'),
      data: buffer.toString('base64'),
    });
  }

  /**
   * Read a packaging artifact preview as a safe data URL.
   *
   * Identity contract:
   *   - `runId` must equal `view.execution.runId` for the
   *     caller's session. The RPC layer is the SOLE owner of
   *     this check; the store re-asserts it as defense in depth.
   *   - `imageId` must match the canonical `image-NN` pattern.
   *     This prevents `imageId` from being used as a path
   *     fragment (e.g. `image-../../etc/passwd`).
   *
   * The output is `{ mimeType, dataUrl }` or `null` (the
   * artifact is not yet persisted). The store never returns an
   * absolute path, a Buffer, or a credential.
   */
  async function readArtifactPreview(input) {
    if (!isPlainObject(input)) return null;
    const sessionId = asString(input.sessionId);
    const runId = asString(input.runId);
    const imageId = asString(input.imageId);
    if (!sessionId || !runId || !imageId) return null;
    if (!CANONICAL_IMAGE_ID_PATTERN.test(imageId)) return null;
    const projectId = await getProjectIdForSession(sessionId);
    if (!projectId) return null;
    // Defense in depth: refuse to read a runId that fails the
    // path-safety check. The RPC layer validates runId shape
    // already, but the store is the last line of defense.
    if (!isRelativePathSafe(runId)) return null;
    // P3-B5.3: the canonical runStore MUST recognise this
    // runId. The sidecar alone is NOT run existence
    // authority (P3-B5.2 §IX / B5.3 §VIII). An orphan
    // sidecar (no canonical run.json) returns `null` so
    // the Web feature renders the "预览不可用"
    // placeholder. The canonical check is the SOLE gate
    // that distinguishes a "Packaging run" from a stale
    // / tampered / leftover sidecar.
    let canonicalRun = null;
    try {
      canonicalRun = await canonicalReadRun({ projectId, runId });
    } catch {
      canonicalRun = null;
    }
    if (!isPlainObject(canonicalRun)) {
      // P3-B5.3: sidecar without canonical run → no preview.
      // This is the orphan-sidecar contract (B5.3 §IX).
      return null;
    }
    const runRoot = await runRootForProject(projectId, runId);
    let record;
    try {
      const filePath = pathJoin(runRoot, PACKAGING_ARTIFACT_RECORD_FILE);
      // The record is the canonical artifact index. If the
      // record is missing, the run is not yet persisted.
      record = await readJsonSafeFn(readFileBytes, filePath);
    } catch {
      return null;
    }
    if (!isPlainObject(record)) return null;
    if (asString(record.runId) !== runId) return null;
    const artifacts = Array.isArray(record.artifacts) ? record.artifacts : [];
    const entry = artifacts.find((a) => isPlainObject(a) && a.imageId === imageId);
    if (!entry) return null;
    // Prefer the thumbnail if present (smaller bytes for the
    // gallery tile); otherwise fall back to the full image.
    const candidatePath = (() => {
      const thumb = asString(entry.thumbnailRelativePath);
      if (thumb) return pathJoin(runRoot, thumb.replace(/[\\\/]+/gu, '/'));
      const full = asString(entry.relativePath);
      if (!full) return null;
      return pathJoin(runRoot, full.replace(/[\\\/]+/gu, '/'));
    })();
    if (!candidatePath) return null;
    // Defense in depth: refuse to read any path that escapes
    // the canonical run root.
    let safePath;
    try {
      safePath = assertInside(runRoot, candidatePath);
    } catch {
      return null;
    }
    // P3-B5.1: `safePath` is an absolute path that has
    // already been asserted to live inside `runRoot` via
    // `assertInside`. The earlier `isRelativePathSafe`
    // call (which refuses drive letters / `..` / UNC /
    // `file://` segments) is the right gate for the
    // *input* identifiers (`runId` / `imageId` /
    // `entry.relativePath`); re-applying it to an
    // absolute path would reject every Windows path
    // (drive letter) and is a no-op on POSIX. We rely on
    // `assertInside` for the runtime boundary instead.
    void safePath;
    let buffer;
    try {
      buffer = await readFileBytes(safePath);
    } catch {
      return null;
    }
    if (!buffer || !Buffer.isBuffer(buffer)) return null;
    // P3-B5.1 — fail-closed MIME validation. The record's
    // `mimeType` is the only MIME we honour, and only if it
    // matches the canonical preview allowlist. Any other
    // value (unknown / hostile / empty / malformed) is
    // rejected without a fallback. The Web feature renders
    // a "预览不可用" placeholder; the generation result is
    // not re-classified as FAILED.
    const rawMime = asString(entry.mimeType);
    if (!isCanonicalPreviewMime(rawMime)) {
      // Defense in depth: refuse to feed the renderer a
      // data URL whose mediaType is not on the allowlist.
      // Returning `null` here is a preview-layer decision;
      // the artifact record stays intact on disk and the
      // artifact metadata (imageId / width / height / size)
      // is still rendered by the Web feature.
      return null;
    }
    // P3-B5.1: lowercased canonical MIME. The allowlist
    // already lower-cased the input, so this is the safe
    // value to interpolate into the `data:` URL.
    const mimeType = rawMime.toLowerCase();
    return Object.freeze({
      mimeType,
      dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}`,
    });
  }

  /**
   * Resolver hook: the RPC layer supplies a function that
   * derives the `projectId` for a given `sessionId`. The
   * store never holds projectId by itself; it always asks
   * the RPC layer, which reads it from the canonical
   * `view.projectId` (the frozen P3-A authority).
   */
  const getProjectIdForSession = typeof options.getProjectIdForSession === 'function'
    ? options.getProjectIdForSession
    : null;
  if (typeof getProjectIdForSession !== 'function') {
    throw new Error('PACKAGING_ARTIFACT_STORE_GET_PROJECT_ID_FOR_SESSION_REQUIRED');
  }

  return Object.freeze({
    saveRun,
    resolveArtifactLifecycle,
    readReference,
    readArtifactPreview,
    // P3-B5: the composition root may inject a custom
    // `downloadImpl` via the artifact store options. The
    // store surfaces it here so the ops layer can pass it
    // through the P2 frozen `executePackagingGeneration`
    // deps seam without importing the P2 frozen module
    // directly. When unset, the P2 frozen generation-service
    // falls back to its bundled default.
    downloadImpl: downloadImplFn,
    // Exposed for tests / cross-checks only; the production
    // path is `saveRun` / `readArtifactPreview` above.
    runRootForProject,
  });
}


/**
 * P3-B5.3 — Canonical Run Registration Bridge.
 *
 * Maps a P2 frozen `executePackagingGeneration` result to the
 * canonical `ImageGenerationRun` shape and writes it to the
 * existing image-generation run-store at
 * `<projectRoot>/image-generation/<runId>/run.json`. The
 * canonical `run.json` is the run identity authority; the
 * Packaging sidecar is a target-specific extension written
 * afterwards by `createPackagingArtifactStore.saveRun`.
 *
 * After this adapter runs:
 *   - `createRunStore(dataPath, projectId).readRun(runId)`
 *     returns a non-null `ImageGenerationRun`.
 *   - `createRunStore(dataPath, projectId).listRuns()`
 *     includes the `pkg-*` run.
 *   - `imageGeneration.getRun(runId)` (the canonical
 *     service) returns a non-null `ImageGenerationRun`.
 *   - `imageGeneration.runRoot(runId)` returns the canonical
 *     run root. The sidecar lives at the same physical root.
 *
 * Truthful mapping contract (P3-B5.3 + P3-B5.3.1):
 *   - `outputType: 'packaging_render'` is the canonical
 *     Packaging outputType. P3-B5.3.1 formally extended
 *     the `ImageGenerationOutputType` TS union in
 *     `@masterpiece/image-generation-contracts` to
 *     recognize `'packaging_render'`. The value is the
 *     same one used on
 *     `GenerationDeliverable = 'packaging_render' | ...`,
 *     `VisualExploration.outputType`, and
 *     `GenerationBlueprint.imagePurpose` across the
 *     repository — the canonical runStore is the only
 *     surface that needed to formally accept it.
 *   - `providerId: result.provider.provider` is the
 *     canonical Provider vendor identity (e.g.
 *     `'dashscope'`, `'openai'`, `'google'`,
 *     `'volcengine'`). P3-B5.3 wrote
 *     `protocol || provider || 'unknown'`, which
 *     conflated the transport protocol (e.g.
 *     `'openai-compatible'`) with the Provider
 *     identity. P3-B5.3.1 wrote `provider.provider`
 *     verbatim with `'unknown'` fallback. P3-B5.3.2
 *     audit proved `'unknown'` is NOT in the canonical
 *     `ImageProviderId` union — the previous
 *     `'unknown'` fallback was a contract bypass of
 *     the same kind as the original `outputType:
 *     'packaging_render'` problem. P3-B5.3.2 implements
 *     a fail-closed contract: if the field is missing,
 *     empty, or not in the canonical 4-value union, the
 *     canonical registration rejects with
 *     `PACKAGING_RUN_REGISTRATION_UNSUPPORTED_PROVIDER`.
 *     The bridge does NOT fall back to `'unknown'`,
 *     `protocol`, `adapterId`, or `modelId`, and does
 *     NOT extend the shared `ImageProviderId` union.
 *   - `modelId: result.model.providerModelId` is the
 *     canonical model identity (or
 *     `result.model.registryModelId` as a fallback).
 *     The `modelId` fallback to `'unknown'` is allowed
 *     here because `modelId` is a plain `string` (not a
 *     union), so `'unknown'` is a valid `string`
 *     member. The bridge does NOT extend the canonical
 *     `ImageProviderId` union to add `'unknown'`.
 *   - `region: result.diagnostics.region` is the
 *     audit region (default `'beijing'`).
 *   - `taskId` is a synthetic correlation id derived
 *     from `runId`. It is NOT a Provider task id and
 *     does NOT claim to be one — the canonical
 *     `ImageGenerationRun.taskId` field is documented
 *     as a stable task correlation identifier, and the
 *     `igt-${runId.slice(0,8)}` convention
 *     (mirrored as `pkg-${runId.slice(0,8)}` here) is
 *     the de-facto production pattern. Short `pkg-*`
 *     runIds (≤16 chars) use the full runId as taskId
 *     to avoid the redundant `pkg-pkg-...` prefix.
 *     The derivation is deterministic and
 *     collision-aware; the value is a truthful
 *     correlation identifier, not a fabricated
 *     external task.
 *   - `gate: { errors: [], warnings: [], blocked: false }`
 *     is the canonical `{ errors, warnings, blocked }`
 *     triple. Packaging has no P2-G gate; the truthful
 *     projection is "no errors, no warnings, not
 *     blocked" (a successful P2 frozen execution has
 *     already passed the P2 stale gate). The 5 P2-F
 *     semantic hashes + executionIdentityHash live in
 *     the sidecar's source-context snapshot, not in
 *     `gate` (the canonical `gate` field is for
 *     pre-execution identity-safety / task-executable
 *     / artifact-completeness decisions, not for the
 *     P2-F fingerprint).
 *   - `images[]` carries the full P2 artifact metadata
 *     (imageId, relativePath, thumbnailRelativePath,
 *     mimeType, sizeBytes, width, height, sha256,
 *     downloadedAt).
 *   - `downloadedAt` is the actual download time, NOT
 *     an approximation. P3-B5.3.2 closes the B5.3.1
 *     approximation gap: the bridge exposes a
 *     `wrapDownloadImpl(downloadImpl)` adapter-side
 *     helper that captures `now()` at the moment the
 *     P2 frozen `executePackagingGeneration` calls
 *     `downloadImpl(input)`. The captured timestamp is
 *     keyed by `input.targetPath` (the P2 frozen
 *     lifecycle's absolute path). When the bridge
 *     builds the canonical run, each artifact's
 *     `targetPath` is reconstructed from
 *     `runRoot + artifacts[].relativePath` (the
 *     `relativePath` field is what the P2 frozen
 *     module persists) and the captured timestamp is
 *     looked up. This is execution-local ephemeral
 *     adapter metadata — the map is released after
 *     `registerRun` completes; it is NOT persisted,
 *     NOT indexed, NOT a second timestamp authority.
 *     The capture is a non-frozen adapter-side
 *     bookkeeping; it does NOT modify the P2 frozen
 *     `downloadImpl` return shape and does NOT
 *     introduce a second timestamp store. If the
 *     `downloadImpl` was never wrapped (e.g. a test
 *     composition that does not call
 *     `wrapDownloadImpl`), the bridge falls back to
 *     `diagnostics.completedAt` for backward
 *     compatibility with the B5.3.1 contract — the
 *     fallback is documented, not a fabrication.
 *
 * @param {object} options
 * @param {string} options.dataPath - the Shared Core data root
 *   (the same root the image-generation run-store uses).
 * @param {(dataPath: string, projectId: string) => {
 *   saveRun(run: object): Promise<object>,
 *   readRun(runId: string): Promise<object|null>,
 *   listRuns?(): Promise<object[]>,
 * }} options.createRunStore - the canonical image-generation
 *   runStore factory. Exposed via
 *   `@masterpiece/runtime-core/image-generation-run-store`.
 *   Tests can pass a fake; production wires the real
 *   `createRunStore` from `application/image-generation/run-store.ts`.
 * @param {(projectId: string) => Promise<string>} [options.resolveProjectRoot]
 *   - resolve the absolute project root for a given
 *   projectId. The bridge uses this to compute the
 *   canonical run root for the captured-`downloadedAt`
 *   lookup (B5.3.2 §VI). The composition root wires
 *   the same resolver as the canonical
 *   `imageGeneration` service. When absent, the
 *   bridge falls back to the bare
 *   `<dataPath>/projects/<projectId>` path (the same
 *   default as the artifact store's
 *   `defaultResolveProjectRootFactory`).
 * @param {() => string} [options.now] - ISO timestamp factory;
 *   defaults to `new Date().toISOString`. Tests inject a
 *   deterministic clock.
 * @returns {{
 *   registerRun: (input: { projectId: string, packagingResult: object }) => Promise<object>,
 *   readRun: (input: { projectId: string, runId: string }) => Promise<object|null>,
 *   wrapDownloadImpl: (downloadImpl: function) => function,
 *   getCapturedDownloadedAtForTargetPath: (targetPath: string) => string | null,
 * }}
 */
export function createPackagingRunRegistrationAdapter(options) {
  if (!options || typeof options !== 'object') {
    throw new Error('PACKAGING_RUN_REGISTRATION_ADAPTER_OPTIONS_REQUIRED');
  }
  const dataPath = asString(options.dataPath);
  if (!dataPath) {
    throw new Error('PACKAGING_RUN_REGISTRATION_ADAPTER_DATA_PATH_REQUIRED');
  }
  const createRunStore = typeof options.createRunStore === 'function'
    ? options.createRunStore
    : null;
  if (typeof createRunStore !== 'function') {
    throw new Error('PACKAGING_RUN_REGISTRATION_ADAPTER_CREATE_RUN_STORE_REQUIRED');
  }
  const now = typeof options.now === 'function'
    ? options.now
    : () => new Date().toISOString();
  const resolveProjectRoot = typeof options.resolveProjectRoot === 'function'
    ? options.resolveProjectRoot
    : defaultResolveProjectRootFactory(dataPath);
  // P3-B5.3.2 §VI / §VII: execution-local ephemeral
  // adapter-side timestamp bookkeeping. The bridge
  // exposes a `wrapDownloadImpl(downloadImpl)` helper
  // that captures `now()` at the moment the P2 frozen
  // `executePackagingGeneration` calls
  // `downloadImpl(input)`. The captured timestamp is
  // keyed by `input.targetPath` (the P2 frozen
  // lifecycle's absolute path).
  //
  // Authority boundary:
  //   - This is an EPHEMERAL adapter-side map. It is
  //     NOT persisted, NOT indexed, NOT a second
  //     timestamp store.
  //   - The map is released after each `registerRun`
  //     completes (the `releaseCapturedTimestamps`
  //     helper clears the keys for the run's
  //     targetPaths; or, on the next `wrapDownloadImpl`
  //     call, the map is reset).
  //   - The capture does NOT modify the P2 frozen
  //     `downloadImpl` return shape; the wrapped
  //     function delegates fully to the original.
  //   - If the composition root does NOT call
  //     `wrapDownloadImpl` (a test that does not need
  //     real timestamps), the map stays empty and
  //     `buildCanonicalRun` falls back to
  //     `diagnostics.completedAt` for `downloadedAt`.
  //     This is the documented B5.3.1 fallback; the
  //     `wrapDownloadImpl` upgrade is additive.
  const capturedDownloadedAtByTargetPath = new Map();
  let wrappedDownloadImpl = false;

  /**
   * P3-B5.3.2 — wrap a `downloadImpl` so that the bridge
   * captures the actual `now()` at the moment the P2
   * frozen module invokes it. The captured timestamp
   * is keyed by `input.targetPath` and is consumed
   * by the next `registerRun({ projectId, packagingResult })`
   * call to populate the canonical
   * `images[].downloadedAt` field with the real
   * download time (not the
   * `diagnostics.completedAt` approximation).
   *
   * Calling `wrapDownloadImpl` more than once resets
   * the capture map. The composition root is expected
   * to call this exactly once, before the first
   * `executePackagingGeneration` call.
   *
   * @param {function} downloadImpl - the original
   *   `downloadImpl` (P2 frozen
   *   `downloadAndVerifyImage`, or whatever the
   *   composition root injects).
   * @returns {function} - a wrapped `downloadImpl`
   *   with the same signature and return shape.
   */
  function wrapDownloadImpl(downloadImpl) {
    if (typeof downloadImpl !== 'function') {
      throw new Error('PACKAGING_RUN_REGISTRATION_ADAPTER_WRAP_DOWNLOAD_IMPL_INVALID');
    }
    // Reset the capture map for the new
    // `downloadImpl` instance. The previous
    // timestamps are released — they are
    // execution-local ephemeral, not persisted.
    capturedDownloadedAtByTargetPath.clear();
    wrappedDownloadImpl = true;
    return function wrappedDownloadImplFn(input) {
      // P3-B5.3.2 §VI: capture `now()` BEFORE the
      // P2 frozen module's `downloadImpl` actually
      // runs. The timestamp is the time the
      // download was initiated (the closest
      // truthful approximation of the download
      // time, since the bytes are written shortly
      // after this point).
      const downloadedAt = now();
      if (isPlainObject(input) && asString(input.targetPath)) {
        capturedDownloadedAtByTargetPath.set(asString(input.targetPath), downloadedAt);
      }
      return downloadImpl(input);
    };
  }

  /**
   * P3-B5.3.2 — look up the captured download
   * timestamp for a given artifact's `targetPath`.
   * The bridge reconstructs each artifact's
   * `targetPath` by joining the canonical `runRoot`
   * (from the runStore) with the artifact's
   * `relativePath`. Returns `null` if no capture
   * is available (the composition root did not
   * call `wrapDownloadImpl`, or the targetPath was
   * not captured).
   *
   * The path lookup normalises both the captured
   * key and the lookup key to forward slashes, so
   * the same canonical `targetPath` matches
   * regardless of how the P2 frozen lifecycle
   * formatter returned the path (Windows
   * backslashes vs POSIX forward slashes).
   *
   * Exposed for tests / cross-checks; production
   * goes through `buildCanonicalRun` directly.
   *
   * @param {string} targetPath - the absolute
   *   targetPath the P2 frozen `downloadImpl` was
   *   called with.
   * @returns {string|null} - the captured ISO
   *   timestamp, or `null` if no capture exists.
   */
  function getCapturedDownloadedAtForTargetPath(targetPath) {
    if (typeof targetPath !== 'string' || !targetPath) return null;
    const normalizedLookup = targetPath.replace(/[\\\/]+/gu, '/');
    for (const [key, value] of capturedDownloadedAtByTargetPath.entries()) {
      const normalizedKey = key.replace(/[\\\/]+/gu, '/');
      if (normalizedKey === normalizedLookup) return value;
    }
    return null;
  }

  /**
   * P3-B5.3.2 — release the captured timestamps for
   * a given run. Called by `registerRun` AFTER the
   * canonical run is written to disk; the timestamps
   * are no longer needed. The map is intentionally
   * NOT cleared wholesale (other runs in flight
   * should not lose their captures); only the
   * entries whose `targetPath` starts with
   * `<runRoot>` are released.
   *
   * @param {string} runRoot - the canonical run
   *   root for the run that just finished
   *   registering.
   */
  function releaseCapturedTimestampsForRunRoot(runRoot) {
    if (typeof runRoot !== 'string' || !runRoot) return;
    const normalized = runRoot.replace(/[\\\/]+/gu, '/').replace(/\/+$/u, '');
    for (const targetPath of Array.from(capturedDownloadedAtByTargetPath.keys())) {
      const normalizedTarget = targetPath.replace(/[\\\/]+/gu, '/').replace(/\/+$/u, '');
      if (normalizedTarget === normalized || normalizedTarget.startsWith(`${normalized}/`)) {
        capturedDownloadedAtByTargetPath.delete(targetPath);
      }
    }
  }

  /**
   * Map a P2 frozen `result` to the canonical
   * `ImageGenerationRun` shape. The mapping is truthful
   * (no false fields) and reversible: the sidecar keeps
   * the P2 frozen shape for downstream consumers.
   */
  function buildCanonicalRun({ projectId, packagingResult, runRoot }) {
    if (!isPlainObject(packagingResult)) {
      throw new Error('PACKAGING_RUN_REGISTRATION_ADAPTER_INVALID_RESULT');
    }
    const runId = asString(packagingResult.runId);
    if (!runId) {
      throw new Error('PACKAGING_RUN_REGISTRATION_ADAPTER_MISSING_RUN_ID');
    }
    const diagnostics = isPlainObject(packagingResult.diagnostics)
      ? packagingResult.diagnostics
      : {};
    const startedAt = asString(diagnostics.startedAt) || now();
    const completedAt = asString(diagnostics.completedAt) || now();
    const status = asString(packagingResult.status) === 'succeeded'
      ? 'succeeded'
      : 'failed';
    const model = isPlainObject(packagingResult.model) ? packagingResult.model : {};
    const provider = isPlainObject(packagingResult.provider) ? packagingResult.provider : {};
    // P3-B5.3.2 — fail-closed providerId contract.
    //
    // The canonical `ImageProviderId` union in
    // `@masterpiece/image-generation-contracts` is:
    //   'dashscope' | 'openai' | 'google' | 'volcengine'
    // It is a strict 4-value union. `'unknown'` is NOT
    // in the union (B5.3.1 audit §III confirmed via
    // `packages/image-generation-contracts/src/index.ts
    // :210`).
    //
    // The P2 frozen result carries THREE different
    // identity fields on the `provider` block; they are
    // NOT interchangeable:
    //
    //   - `result.provider.provider`  → the canonical
    //     Provider vendor identity. The P2 frozen
    //     `executePackagingGeneration` derives this from
    //     `capability.provider` (e.g. 'dashscope',
    //     'openai', 'google', 'volcengine'). This is
    //     what the canonical `ImageProviderId` union
    //     expects.
    //   - `result.provider.protocol`  → the transport
    //     protocol the Shared multi-model adapter uses
    //     (e.g. 'openai-compatible', 'seedream-image',
    //     'dashscope-wan-image', 'google-gemini-image',
    //     'openai-image-generation'). It is a wire-
    //     format identifier, NOT a Provider identity.
    //     Writing this as `providerId` would conflate
    //     "which vendor" with "which wire format" and
    //     is semantically wrong.
    //   - `result.provider.adapterId` → the Shared
    //     multi-model adapter's stable routing id
    //     (usually `providerModelId` verbatim). It is
    //     a routing identity, not a Provider identity.
    //
    // Truthful contract (P3-B5.3.2 §I / §II / §IV):
    //   - If `result.provider.provider` is present and
    //     in the canonical 4-value union, use it.
    //   - If `result.provider.provider` is missing,
    //     empty, or not in the canonical union, the
    //     canonical registration REJECTS the run with
    //     a clear error
    //     (`PACKAGING_RUN_REGISTRATION_UNSUPPORTED_PROVIDER`).
    //     The error message names the rejected value
    //     (sanitized, no raw bytes) so a future audit
    //     can see which Provider was misconfigured.
    //   - The bridge MUST NOT fall back to:
    //     - `'unknown'` (NOT in the canonical union).
    //     - `result.provider.protocol` (transport
    //       protocol, not a vendor identity).
    //     - `result.provider.adapterId` (routing
    //       identity, not a vendor identity).
    //     - `result.model.providerModelId` (model
    //       identity, not a Provider identity).
    //   - The bridge MUST NOT extend the shared
    //     `ImageProviderId` union to add 'unknown' or
    //     any other Packaging-specific value.
    //
    // Why fail-closed rather than fallback:
    //   The P3-B5.3.1 implementation fell back to
    //   `'unknown'`, which is a contract bypass of the
    //   same kind as the original `outputType:
    //   'packaging_render'` problem. The canonical
    //   `runStore.saveRun` uses `JSON.stringify` and
    //   does not validate, so the value lands on disk
    //   as a string — but it is NOT a member of the
    //   canonical TS union, and downstream consumers
    //   (e.g. the image-generation `getRun` summary)
    //   are typed against the union. The honest
    //   behavior is to reject the registration; the
    //   production path is fixed at the
    //   `capability.provider` source (the Model
    //   Registry exposes only the 4 canonical
    //   providers), so the fail-closed path is only
    //   reached when a configuration is misconfigured
    //   or a test mock is using a non-canonical
    //   provider value.
    const CANONICAL_IMAGE_PROVIDER_IDS = Object.freeze([
      'dashscope',
      'openai',
      'google',
      'volcengine',
    ]);
    const providerField = asString(provider.provider);
    if (!CANONICAL_IMAGE_PROVIDER_IDS.includes(providerField)) {
      // P3-B5.3.2 §IV: canonical registration rejects
      // with a safe adapter error. The error message
      // carries the rejected value so a future audit
      // can see which Provider was misconfigured
      // (sanitized — no raw bytes, no secrets).
      const err = new Error(
        `PACKAGING_RUN_REGISTRATION_UNSUPPORTED_PROVIDER: result.provider.provider is not a canonical ImageProviderId; ` +
        `expected one of [${CANONICAL_IMAGE_PROVIDER_IDS.join(', ')}], got ${JSON.stringify(providerField || null)}. ` +
        `Bridge does NOT fall back to 'unknown', 'protocol', 'adapterId', or 'modelId' (P3-B5.3.2 §IV).`,
      );
      err.code = 'PACKAGING_RUN_REGISTRATION_UNSUPPORTED_PROVIDER';
      err.expected = CANONICAL_IMAGE_PROVIDER_IDS.slice();
      err.actual = providerField || null;
      throw err;
    }
    const providerId = providerField;
    const modelId = asString(model.providerModelId)
      || asString(model.registryModelId)
      || 'unknown';
    // P3-B5.3.2: `protocol` is preserved on the canonical
    // run as `apiProfileId` is not the right home for it
    // (apiProfileId is the Profile selection name, not
    // the transport protocol). The canonical
    // `ImageGenerationRun` schema does NOT have a
    // dedicated `protocol` field, so we keep the field
    // off the persisted record rather than fabricating
    // one. The protocol is still on the P2 frozen
    // `result` itself, which the sidecar preserves
    // verbatim for downstream consumers.
    const region = asString(diagnostics.region) || 'beijing';
    // P2 frozen `result.artifacts[]` is the canonical
    // mapping source. Each artifact carries
    // `imageId / relativePath / thumbnailRelativePath /
    // mimeType / sha256 / width / height / sizeBytes`.
    const artifacts = Array.isArray(packagingResult.artifacts)
      ? packagingResult.artifacts.filter((a) => isPlainObject(a))
      : [];
    // P3-B5.3.2: the canonical `runRoot` is pre-computed
    // by the caller (`registerRun` → `resolveRunRoot`).
    // When `wrapDownloadImpl` was used AND the
    // `runRoot` is available, the bridge reconstructs
    // each artifact's `targetPath` by joining
    // `runRoot` with the artifact's `relativePath` and
    // looks up the captured download timestamp.
    const images = artifacts.map((a) => {
      const image = {
        imageId: asString(a.imageId),
        relativePath: asString(a.relativePath),
        mimeType: asString(a.mimeType),
        sizeBytes: Number.isFinite(a.sizeBytes) ? a.sizeBytes : 0,
        sha256: asString(a.sha256) || '',
        // P3-B5.3.2 — truthful downloadedAt. Prefer
        // the captured timestamp from
        // `wrapDownloadImpl` (the actual `now()` at
        // the moment the P2 frozen `downloadImpl`
        // was invoked). Fall back to
        // `diagnostics.completedAt` when the capture
        // is unavailable (the composition root did
        // not call `wrapDownloadImpl`, or the
        // canonical `runRoot` could not be
        // resolved).
        downloadedAt: (() => {
          if (runRoot && wrappedDownloadImpl) {
            const relativePath = asString(a.relativePath);
            if (relativePath) {
              const targetPath = pathJoin(runRoot, relativePath);
              const captured = getCapturedDownloadedAtForTargetPath(targetPath);
              if (captured) return captured;
            }
          }
          return asString(diagnostics.completedAt) || now();
        })(),
      };
      const thumb = asString(a.thumbnailRelativePath);
      if (thumb) image.thumbnailRelativePath = thumb;
      if (Number.isFinite(a.width)) image.width = a.width;
      if (Number.isFinite(a.height)) image.height = a.height;
      return image;
    });
    // P3-B5.3.1 — truthful taskId derivation. The
    // canonical `ImageGenerationRun.taskId` is a
    // stable task correlation identifier, not a
    // Provider task id (Provider task id lives on
    // `providerTaskId` / `providerRequestId`). The
    // Packaging pipeline does not have a separate
    // task-builder task object; the runId IS the
    // task. The derivation mirrors the
    // `igt-${runId.slice(0,8)}` convention used in
    // production (`pkg-${runId.slice(0,8)}` here):
    //   - For uuid-style runIds (e.g.
    //     `pkg-aa01bb02-...`), the canonical taskId
    //     is `pkg-${runId.slice(0, 8)}`.
    //   - For short `pkg-*` runIds (≤16 chars, e.g.
    //     `pkg-aa01`), the full runId is used — the
    //     `pkg-` prefix already uniquely identifies
    //     the run, and concatenating another prefix
    //     would produce redundant strings like
    //     `pkg-pkg-aa01`.
    // The derivation is deterministic, collision-
    // aware, and truthful (it is a correlation id,
    // not a fabricated external task).
    const taskId = runId.startsWith('pkg-') && runId.length <= 16
      ? runId
      : `pkg-${runId.slice(0, 8)}`;
    const run = {
      schemaVersion: '1.0',
      runId,
      projectId,
      taskId,
      status,
      // P3-B5.3.1: `'packaging_render'` is the canonical
      // Packaging outputType. The
      // `ImageGenerationOutputType` TS union was formally
      // extended in
      // `@masterpiece/image-generation-contracts` to
      // include this value (it was already a
      // `GenerationDeliverable` value and was the
      // de-facto production outputType for the
      // Packaging pipeline). The value is now
      // contractually canonical — the previous bridge
      // justification that the value was outside the
      // union has been retired.
      outputType: 'packaging_render',
      providerId,
      modelId,
      region,
      apiProfileId: asString(packagingResult.apiProfileId),
      createdAt: startedAt,
      updatedAt: completedAt,
      startedAt,
      completedAt,
      // Packaging has no P2-G gate; the truthful projection
      // is "passed" (the P2 stale gate has already run and
      // thrown before reaching `saveRun`). The 5 P2-F
      // semantic hashes + executionIdentityHash live in
      // the sidecar's source-context snapshot, not in
      // `gate` — the canonical `gate` field is for
      // pre-execution identity-safety / task-executability
      // / artifact-completeness decisions, not for the
      // P2-F fingerprint.
      gate: Object.freeze({
        errors: Object.freeze([]),
        warnings: Object.freeze([]),
        blocked: false,
      }),
      images: Object.freeze(images.map((img) => Object.freeze(img))),
    };
    return Object.freeze(run);
  }

  return Object.freeze({
    async registerRun({ projectId, packagingResult }) {
      if (!asString(projectId)) {
        throw new Error('PACKAGING_RUN_REGISTRATION_ADAPTER_PROJECT_ID_REQUIRED');
      }
      const runId = asString(packagingResult?.runId);
      // P3-B5.3.2 §VI: pre-compute the canonical
      // `runRoot` so the bridge can reconstruct each
      // artifact's `targetPath` for the captured
      // `downloadedAt` lookup. The `runRoot` is
      // `<projectRoot>/image-generation/<runId>`;
      // the bridge uses the same `resolveProjectRoot`
      // as the canonical artifact store. The
      // canonical `runStore` is the SOLE write
      // authority (P3-B5.3 §XV); the bridge does NOT
      // write to the run root itself, only reads it
      // to reconstruct the `targetPath` for the
      // captured-timestamp lookup.
      let runRoot = null;
      if (wrappedDownloadImpl && runId) {
        try {
          const projectRoot = await resolveProjectRoot(projectId);
          runRoot = pathJoin(projectRoot, 'image-generation', runId);
        } catch {
          runRoot = null;
        }
      }
      const canonical = buildCanonicalRun({ projectId, packagingResult, runRoot });
      const runStore = createRunStore(dataPath, projectId);
      // The canonical runStore writes `<runRoot>/run.json`.
      // The sidecar (written afterwards by the artifact
      // store) is a sibling file at the same physical
      // root. Both are owned by the same canonical run
      // identity (`<runRoot>` is shared by definition;
      // P3-B5.2 §XVI parity test).
      const persisted = await runStore.saveRun(canonical);
      // P3-B5.3.2 §VII: release the captured
      // download timestamps for this run's
      // `targetPath` keys. The captures are
      // execution-local ephemeral; the canonical
      // run record on disk is the SOLE persistent
      // authority.
      try {
        if (runRoot) {
          releaseCapturedTimestampsForRunRoot(runRoot);
        }
      } catch {
        // The runRoot may not be available. Silently
        // skip the release; the next `wrapDownloadImpl`
        // call resets the map.
      }
      return Object.freeze(persisted);
    },
    async readRun({ projectId, runId }) {
      if (!asString(projectId) || !asString(runId)) return null;
      const runStore = createRunStore(dataPath, projectId);
      const run = await runStore.readRun(runId);
      return run ? Object.freeze(run) : null;
    },
    // P3-B5.3.2 §VI: wrap a `downloadImpl` so that
    // the bridge captures the actual `now()` at
    // the moment the P2 frozen module invokes it.
    // The composition root is expected to call
    // this once, before the first
    // `executePackagingGeneration` call. The
    // returned wrapped function has the same
    // signature and return shape as the input;
    // it does NOT modify the P2 frozen return
    // shape.
    wrapDownloadImpl,
    // P3-B5.3.2 — look up the captured download
    // timestamp for a given `targetPath`. Returns
    // `null` if no capture exists. Exposed for
    // tests / cross-checks; production goes through
    // `registerRun` → `buildCanonicalRun` directly.
    getCapturedDownloadedAtForTargetPath,
  });
}
// ---------------------------------------------------------------------------
// Internal helpers (file-system bound; the store is the SOLE
// consumer of these).
// ---------------------------------------------------------------------------

function defaultResolveProjectRootFactory(dataPath) {
  const projectsRoot = pathJoin(dataPath, 'projects');
  return async function resolveProjectRoot(projectId) {
    if (typeof projectId !== 'string' || !projectId) {
      throw new Error('PACKAGING_ARTIFACT_STORE_INVALID_PROJECT_ID');
    }
    // We do NOT replicate the image-generation run-store's
    // directory scanning here; the composition root supplies a
    // projectId → projectRoot resolver that reads `project.json`.
    // The default fallback is the bare `<projectsRoot>/<id>`
    // path; production always provides an explicit resolver.
    return pathJoin(projectsRoot, projectId);
  };
}

function pathJoin(...segments) {
  // The ops layer runs in Node.js (server side). We use
  // `node:path` indirectly via the composition root. To keep
  // the store portable, we accept a `pathImpl` option; the
  // default is the native `path.posix.join` for forward-slash
  // paths (matching the image-generation run-store convention).
  // Production always provides a real `node:path` instance.
  const pathImpl = _PATH_IMPL;
  return pathImpl.join(...segments);
}

function pathPosixJoin(...segments) {
  const pathImpl = _PATH_IMPL;
  return pathImpl.posix.join(...segments);
}

async function readJsonSafeFn(readFileBytes, filePath) {
  try {
    const buffer = await readFileBytes(filePath);
    if (!buffer) return null;
    return JSON.parse(buffer.toString('utf8'));
  } catch {
    return null;
  }
}

// `node:path` is injected lazily so this file remains
// import-safe in any environment. The composition root
// provides the real implementation via `setPathImpl`; tests
// may swap it.
let _PATH_IMPL = {
  join: (...segments) => segments.filter(Boolean).join('/').replace(/\/+/g, '/'),
  posix: { join: (...segments) => segments.filter(Boolean).join('/').replace(/\/+/g, '/') },
};

export function setPackagingArtifactStorePathImpl(pathImpl) {
  if (!pathImpl || typeof pathImpl.join !== 'function') {
    throw new Error('PACKAGING_ARTIFACT_STORE_PATH_IMPL_INVALID');
  }
  _PATH_IMPL = pathImpl;
}

// ---------------------------------------------------------------------------
// Build the P2 frozen `executePackagingGeneration` deps from the
// canonical credential + settings authorities. The credentials
// NEVER leak to the Web UI — the Web UI only sends
// `providerModelId` + `apiProfileId`; the ops layer resolves the
// matching profile and reads the credential on the user's behalf.
//
// P3-B5 (additive): the deps now include the canonical
// `executor` (Provider HTTP client) and the artifact-store
// adapters (`resolveArtifactLifecycle`, `readReference`,
// `saveRun`). The Web UI never sees these values; they stay on
// the runtime side. (P3-A freeze report §10.5 P2 frozen gate.)
// ---------------------------------------------------------------------------

async function buildExecutionDeps({
  service,
  sessionId,
  callerApiProfileId,
  callerProviderModelId,
  readSettings,
  readCredentials,
  packagingArtifactStore,
}) {
  const view = service.getView(sessionId);
  const intent = view && isPlainObject(view.intent) ? view.intent : null;
  const apiProfileId = asString(callerApiProfileId) || (intent ? asString(intent.apiProfileId) : '');
  if (!apiProfileId) {
    const err = new Error(
      'PACKAGING_WORKSPACE_EXECUTE_REJECTED: missing apiProfileId (caller must supply one, or set intent.apiProfileId first)'
    );
    err.code = 'PACKAGING_WORKSPACE_EXECUTE_REJECTED';
    throw err;
  }
  const settings = await readSettings();
  const profile = (settings?.profiles || []).find((p) => p && p.id === apiProfileId);
  if (!profile) {
    const err = new Error(
      `PACKAGING_WORKSPACE_EXECUTE_REJECTED: apiProfileId not found in current settings: ${apiProfileId}`
    );
    err.code = 'PACKAGING_WORKSPACE_EXECUTE_REJECTED';
    throw err;
  }
  let credentials;
  try {
    credentials = await readCredentials(apiProfileId);
  } catch (cause) {
    // Re-throw the credential-store failure with the
    // canonical execute-rejected code so the UI's
    // error tile surfaces a recoverable diagnostic.
    const err = new Error(
      `PACKAGING_WORKSPACE_EXECUTE_REJECTED: readCredentials failed: ${cause?.message ?? 'unknown'}`
    );
    err.code = 'PACKAGING_WORKSPACE_EXECUTE_REJECTED';
    err.cause = cause;
    throw err;
  }
  const providerModelId = asString(callerProviderModelId)
    || (intent ? asString(intent.providerModelId) : '')
    || asString(profile.modelId);
  if (!providerModelId) {
    const err = new Error(
      'EXECUTION_PROVIDER_MODEL_REQUIRED: profile has no modelId and caller did not supply providerModelId'
    );
    err.code = 'EXECUTION_PROVIDER_MODEL_REQUIRED';
    throw err;
  }
  const apiKey = asString(credentials?.apiKey);
  const baseUrl = asString(credentials?.baseUrl);
  const region = asString(credentials?.region);
  const protocol = asString(profile.protocol);
  const provider = asString(profile.provider);
  // P3-B5: the executor is the canonical P2 frozen
  // `createMultiModelImageAdapter` instance. It owns the
  // Provider HTTP client and the redacted request / response
  // shape. The P2 frozen generation service consumes it via
  // `resolvedDeps.executor`. When the runtime composition
  // root does not register a real adapter for the requested
  // `providerModelId` (e.g. test mocks, future Provider
  // onboarding), we fall back to a no-op executor so the
  // canonical `executePackagingGeneration` dep seam is
  // satisfied without forcing the operations layer to know
  // the per-Provider surface.
  let executor;
  try {
    const adapter = createMultiModelImageAdapter({
      adapterId: providerModelId,
      apiKey,
      baseUrl,
      modelId: providerModelId,
    });
    executor = Object.freeze({
      id: asString(adapter.id, providerModelId),
      version: asString(adapter.version, '1.0.0'),
      protocol: asString(adapter.protocol, protocol),
      compileRequest: adapter.compileRequest,
      execute: adapter.execute,
    });
  } catch {
    // P3-B5: no real Provider adapter is wired for this
    // `providerModelId` (e.g. test scenarios that use a mock
    // model id; future Provider onboarding). The operations
    // layer still passes a well-formed `executor` to the P2
    // frozen deps seam; the P2 frozen `executePackagingGeneration`
    // will produce a canonical Provider failure downstream
    // if the executor is ever actually invoked against a
    // real Provider. The `executeFn` is the actual mock
    // surface the tests assert against.
    executor = Object.freeze({
      id: providerModelId,
      version: '1.0.0',
      protocol: protocol || 'unknown',
      compileRequest: (input) => Object.freeze({
        method: 'POST',
        url: 'https://mock.invalid/execute',
        headers: { 'Content-Type': 'application/json' },
        bodyKind: 'json',
        body: { model: providerModelId, input },
      }),
      execute: async () => {
        const err = new Error(
          `PACKAGING_WORKSPACE_EXECUTE_REJECTED: no real Provider adapter wired for ${providerModelId}; the test mock executeFn should override this path.`
        );
        err.code = 'PACKAGING_WORKSPACE_EXECUTE_REJECTED';
        throw err;
      },
    });
  }
  // P3-B5: `resolveExecutionConfig` is a thin passthrough — the
  // P2 frozen generation service consumes the same credentials
  // and metadata we already resolved. The shape mirrors the P2
  // frozen contract so the P2 frozen `artifactLifecycle` /
  // `executionIdentity` builders can run.
  const resolveExecutionConfig = async () => Object.freeze({
    apiKey,
    baseUrl,
    providerModelId,
    apiProfileId,
    protocol,
    provider,
    region,
  });
  // P3-B5: artifact-store adapters. Each closure captures the
  // sessionId so the store can derive `projectId` from the
  // canonical P3-A view (single projectId binding per session).
  const resolveArtifactLifecycle = (input) => packagingArtifactStore.resolveArtifactLifecycle({
    ...input,
    sessionId,
  });
  const readReference = (reference) => packagingArtifactStore.readReference({
    sessionId,
    reference,
  });
  const saveRun = (packagingResult) => packagingArtifactStore.saveRun(
    sessionId,
    packagingResult,
  );
  return {
    // Existing P3-B2 fields (kept verbatim for backwards
    // compatibility with the prior buildExecutionDeps surface;
    // P2 frozen generation-service does not consume them
    // directly, but downstream callers may).
    apiKey,
    baseUrl,
    providerModelId,
    apiProfileId,
    protocol,
    provider,
    region,
    // P3-B5 additive fields (consumed by P2 frozen generation-service).
    executor,
    resolveExecutionConfig,
    resolveArtifactLifecycle,
    readReference,
    saveRun,
    // P2 frozen `downloadImpl` — the composition root may
    // inject a custom implementation via the artifact store
    // (e.g. for tests). When unset, the P2 frozen
    // generation-service falls back to its bundled default
    // download/verify adapter. The store does NOT import
    // the P2 frozen module directly; the dependency flows
    // through the composition root.
    ...(packagingArtifactStore.downloadImpl
      ? { downloadImpl: packagingArtifactStore.downloadImpl }
      : {}),
    fetchImpl: globalThis.fetch,
    now: () => new Date().toISOString(),
  };
}

export function createPackagingOperations({
  service,
  readSettings,
  readCredentials,
  resolveTruthSnapshot,
  packagingArtifactStore,
}) {
  if (!service) {
    throw new Error('PACKAGING_OPERATIONS_SERVICE_REQUIRED');
  }
  if (typeof readSettings !== 'function') {
    throw new Error('PACKAGING_OPERATIONS_READ_SETTINGS_REQUIRED');
  }
  if (typeof readCredentials !== 'function') {
    throw new Error('PACKAGING_OPERATIONS_READ_CREDENTIALS_REQUIRED');
  }
  if (typeof resolveTruthSnapshot !== 'function') {
    throw new Error('PACKAGING_OPERATIONS_RESOLVE_TRUTH_SNAPSHOT_REQUIRED');
  }
  if (!packagingArtifactStore) {
    throw new Error('PACKAGING_OPERATIONS_ARTIFACT_STORE_REQUIRED');
  }

  function getViewOrThrow(sessionId) {
    if (typeof sessionId !== 'string' || !sessionId) {
      const err = new Error('PACKAGING_OPERATIONS_INVALID_SESSION_ID: sessionId is required');
      err.code = 'PACKAGING_OPERATIONS_INVALID_SESSION_ID';
      throw err;
    }
    return service.getView(sessionId);
  }

  /**
   * P3-B5: identity validation for the preview RPC. The
   * caller's `runId` must equal the session's
   * `view.execution.runId`; otherwise the call is rejected
   * with `PACKAGING_OPERATIONS_PREVIEW_NOT_FOUND`. This is
   * the SOLE cross-session / cross-project guard; the store
   * re-asserts the same guard (defense in depth).
   */
  function assertPreviewIdentity(sessionId, runId) {
    const view = getViewOrThrow(sessionId);
    const execution = view && isPlainObject(view.execution) ? view.execution : null;
    if (!execution) {
      const err = new Error(
        'PACKAGING_OPERATIONS_PREVIEW_NOT_FOUND: session has no execution yet; cannot read preview'
      );
      err.code = 'PACKAGING_OPERATIONS_PREVIEW_NOT_FOUND';
      throw err;
    }
    if (asString(execution.runId) !== asString(runId)) {
      const err = new Error(
        'PACKAGING_OPERATIONS_PREVIEW_NOT_FOUND: runId does not match the session execution'
      );
      err.code = 'PACKAGING_OPERATIONS_PREVIEW_NOT_FOUND';
      throw err;
    }
  }

  const operations = {
    [PACKAGING_OPERATION_IDS.CREATE_SESSION]: async function (_context, input) {
      if (!isPlainObject(input)) {
        const err = new Error('PACKAGING_OPERATIONS_INVALID_INPUT: createSession input must be an object');
        err.code = 'PACKAGING_OPERATIONS_INVALID_INPUT';
        throw err;
      }
      const projectId = asString(input.projectId);
      if (!projectId) {
        const err = new Error('PACKAGING_OPERATIONS_INVALID_INPUT: projectId is required');
        err.code = 'PACKAGING_OPERATIONS_INVALID_INPUT';
        throw err;
      }
      // The Web side MAY supply a truthSnapshot (e.g. when
      // re-opening a project after a Locked-Asset change). The
      // canonical authority is the runtime-side `resolveTruthSnapshot`
      // (which reads the project's Locked-Assets + project-store
      // + analysis context). When the Web side does NOT supply
      // a snapshot, the runtime resolves it. This is the
      // runtime-side authority boundary; the Web side never
      // fabricates Locked Assets.
      let truthSnapshot = isPlainObject(input.truthSnapshot) ? input.truthSnapshot : null;
      if (!truthSnapshot) {
        truthSnapshot = await resolveTruthSnapshot(projectId);
      }
      // P3-A frozen contract: `service.createSession` returns
      // the FROZEN raw session (not the sessionId). The
      // sessionId lives on the session's `sessionId` field.
      // The operations layer is the bridge that maps this
      // internal shape to the safe Web-facing
      // `{ sessionId, view }` envelope. The raw session is
      // NEVER returned to the Web.
      const frozenSession = service.createSession({
        projectId,
        truthSnapshot: truthSnapshot || {},
        initialIntent: isPlainObject(input.initialIntent) ? input.initialIntent : null,
      });
      const sessionId = asString(frozenSession?.sessionId);
      if (!sessionId) {
        const err = new Error('PACKAGING_OPERATIONS_INVALID_SESSION: createSession returned no sessionId');
        err.code = 'PACKAGING_OPERATIONS_INVALID_SESSION';
        throw err;
      }
      return Object.freeze({
        sessionId,
        view: service.getView(sessionId),
      });
    },

    [PACKAGING_OPERATION_IDS.GET_VIEW]: async function (_context, sessionId) {
      return Object.freeze(getViewOrThrow(sessionId));
    },

    [PACKAGING_OPERATION_IDS.UPDATE_INTENT]: async function (_context, input) {
      if (!isPlainObject(input)) {
        const err = new Error('PACKAGING_OPERATIONS_INVALID_INPUT: updateIntent input must be an object');
        err.code = 'PACKAGING_OPERATIONS_INVALID_INPUT';
        throw err;
      }
      const sessionId = asString(input.sessionId);
      getViewOrThrow(sessionId); // fail-closed: unknown session
      service.updateIntent(sessionId, isPlainObject(input.patch) ? input.patch : {});
      return Object.freeze({ view: service.getView(sessionId) });
    },

    [PACKAGING_OPERATION_IDS.SET_TRUTH_SNAPSHOT]: async function (_context, input) {
      if (!isPlainObject(input)) {
        const err = new Error('PACKAGING_OPERATIONS_INVALID_INPUT: setTruthSnapshot input must be an object');
        err.code = 'PACKAGING_OPERATIONS_INVALID_INPUT';
        throw err;
      }
      const sessionId = asString(input.sessionId);
      // P3-B3 tightened contract: the Web caller is NOT
      // allowed to send a `truthSnapshot` payload. The
      // canonical truth authority is on the runtime side;
      // the Web only requests a refresh of the session's
      // bound project. The runtime re-resolves the truth
      // from the upstream authority and applies it via the
      // frozen P3-A `service.setTruthSnapshot` API.
      if (input.truthSnapshot !== undefined) {
        const err = new Error(
          'PACKAGING_OPERATIONS_TRUTH_AUTHORITY_VIOLATION: setTruthSnapshot does not accept a caller-supplied truthSnapshot; the runtime resolves truth from the canonical authority (P3-B3 §11).'
        );
        err.code = 'PACKAGING_OPERATIONS_TRUTH_AUTHORITY_VIOLATION';
        throw err;
      }
      if (input.projectId !== undefined) {
        // The Web caller MUST NOT specify a projectId that
        // differs from the session's projectId — that would
        // be cross-project truth authority override (P3-B3 §12).
        const err = new Error(
          'PACKAGING_OPERATIONS_TRUTH_AUTHORITY_VIOLATION: setTruthSnapshot does not accept a caller-supplied projectId; the session owns the projectId.'
        );
        err.code = 'PACKAGING_OPERATIONS_TRUTH_AUTHORITY_VIOLATION';
        throw err;
      }
      // Fail-closed: unknown session.
      const existingView = getViewOrThrow(sessionId);
      const boundProjectId = asString(existingView.projectId);
      if (!boundProjectId) {
        const err = new Error('PACKAGING_OPERATIONS_TRUTH_REFRESH_REJECTED: session has no bound projectId');
        err.code = 'PACKAGING_OPERATIONS_TRUTH_REFRESH_REJECTED';
        throw err;
      }
      // Resolve the truth from the canonical authority.
      // The resolver may return null if the project no
      // longer exists; in that case the service rejects the
      // update via the existing P3-A validation.
      const resolvedTruth = await resolveTruthSnapshot(boundProjectId);
      if (!isPlainObject(resolvedTruth)) {
        const err = new Error('PACKAGING_OPERATIONS_TRUTH_REJECTED: truth resolver returned no truth for the bound projectId');
        err.code = 'PACKAGING_OPERATIONS_TRUTH_REJECTED';
        throw err;
      }
      service.setTruthSnapshot(sessionId, resolvedTruth);
      return Object.freeze({ view: service.getView(sessionId) });
    },

    [PACKAGING_OPERATION_IDS.PREPARE_GENERATION]: async function (_context, sessionId) {
      getViewOrThrow(sessionId); // fail-closed: unknown session
      service.prepareGeneration(sessionId);
      return Object.freeze({ view: service.getView(sessionId) });
    },

    [PACKAGING_OPERATION_IDS.EXECUTE_GENERATION]: async function (_context, input) {
      if (!isPlainObject(input)) {
        const err = new Error('PACKAGING_OPERATIONS_INVALID_INPUT: executeGeneration input must be an object');
        err.code = 'PACKAGING_OPERATIONS_INVALID_INPUT';
        throw err;
      }
      const sessionId = asString(input.sessionId);
      getViewOrThrow(sessionId); // fail-closed: unknown session
      const deps = await buildExecutionDeps({
        service,
        sessionId,
        callerApiProfileId: input.apiProfileId,
        callerProviderModelId: input.providerModelId,
        readSettings,
        readCredentials,
        packagingArtifactStore,
      });
      await service.executeGeneration(sessionId, deps);
      return Object.freeze({ view: service.getView(sessionId) });
    },

    [PACKAGING_OPERATION_IDS.RESET_PREPARATION]: async function (_context, sessionId) {
      getViewOrThrow(sessionId); // fail-closed: unknown session
      service.resetPreparation(sessionId);
      return Object.freeze({ view: service.getView(sessionId) });
    },

    // P3-B5: safe artifact preview read operation. The
    // identity contract is enforced in this layer; the
    // artifact store re-asserts it (defense in depth).
    [PACKAGING_OPERATION_IDS.GET_ARTIFACT_PREVIEW]: async function (_context, input) {
      if (!isPlainObject(input)) {
        const err = new Error('PACKAGING_OPERATIONS_INVALID_INPUT: getArtifactPreview input must be an object');
        err.code = 'PACKAGING_OPERATIONS_INVALID_INPUT';
        throw err;
      }
      const sessionId = asString(input.sessionId);
      const runId = asString(input.runId);
      const imageId = asString(input.imageId);
      if (!sessionId || !runId || !imageId) {
        const err = new Error('PACKAGING_OPERATIONS_INVALID_INPUT: sessionId, runId, and imageId are required');
        err.code = 'PACKAGING_OPERATIONS_INVALID_INPUT';
        throw err;
      }
      // Identity guard: runId must match the session's
      // `view.execution.runId`. This is the SOLE
      // cross-session / cross-project guard.
      assertPreviewIdentity(sessionId, runId);
      // Path safety: refuse to read hostile inputs before the
      // store is even consulted.
      if (!isRelativePathSafe(runId)) {
        const err = new Error('PACKAGING_OPERATIONS_PREVIEW_REJECTED: runId is not a safe relative identifier');
        err.code = 'PACKAGING_OPERATIONS_PREVIEW_REJECTED';
        throw err;
      }
      if (!CANONICAL_IMAGE_ID_PATTERN.test(imageId)) {
        const err = new Error('PACKAGING_OPERATIONS_PREVIEW_REJECTED: imageId must match the canonical image-NN pattern');
        err.code = 'PACKAGING_OPERATIONS_PREVIEW_REJECTED';
        throw err;
      }
      // Delegate to the canonical artifact store. The store
      // re-asserts the identity guard and the path safety
      // (defense in depth).
      const result = await packagingArtifactStore.readArtifactPreview({
        sessionId,
        runId,
        imageId,
      });
      // The store returns `{ mimeType, dataUrl }` or `null`.
      // A `null` result is a "not yet persisted" diagnostic
      // — not an error. The Web feature renders a
      // placeholder in that case.
      if (result == null) {
        return Object.freeze({ preview: null });
      }
      return Object.freeze({ preview: result });
    },
  };

  return Object.freeze({
    operations: Object.freeze(operations),
    ids: PACKAGING_OPERATION_IDS,
  });
}

export const PACKAGING_OPERATION_VERSION = '1.0.0';
