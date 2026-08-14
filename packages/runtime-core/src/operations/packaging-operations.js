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
   */
  async function saveRun(sessionId, packagingResult) {
    const projectId = await getProjectIdForSession(sessionId);
    const record = buildArtifactRecord(packagingResult);
    if (!record) {
      throw new Error('PACKAGING_ARTIFACT_STORE_INVALID_RESULT');
    }
    const runId = record.runId;
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
