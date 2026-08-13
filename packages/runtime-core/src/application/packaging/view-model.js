// P3-A2 — Packaging Workspace View Model.
//
// Capability boundary:
//   Pure UI-safe projection of the Workspace session state.
//   Strips credentials, raw Provider responses, absolute paths,
//   and other secret-bearing fields (P3-A spec §23, §46).
//
// Architectural position (P3-A spec §21, §45, §46):
//   The view model is the *only* shape the future P3-B UI sees.
//   The UI is NOT allowed to bind to the raw session state
//   (which may carry P2 frozen internal objects); the view
//   model is the seam.
//
// Secret-safe contract (P3-A spec §23, §46):
//   - no apiKey
//   - no Authorization / Bearer
//   - no signed-URL credentials
//   - no absolute local paths
//   - no raw provider request bodies
//   - no raw provider response payloads
//
// The view model intentionally DOES NOT include:
//   - sessionId-as-fingerprint (spec §38: workspaceSessionId !=
//     runId != compileFingerprint)
//   - The internal `prepared` object graph (P3-A spec §21
//     recommends `compiledPromptPreview?` only as a derived
//     read-only surface)
//   - The internal `intentAtPrepare` snapshot
//   - The internal `truthFingerprintAtPrepare`

import {
  PACKAGING_WORKSPACE_STATUS,
  PACKAGING_WORKSPACE_STATUS_LABELS,
  isExecuteAllowed,
  isIntentEditAllowed,
  isPrepareAllowed,
  isResetAllowed,
} from './workspace-state.js';
import { projectLockedAssetsForView } from './lock-assets-projection.js';
import { projectReferenceAssignmentForView } from './reference-assignments.js';

export const PACKAGING_WORKSPACE_VIEW_MODEL_VERSION = '1.0.0';

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function asString(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asArray(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.slice();
  return [value];
}

// ---------------------------------------------------------------------------
// Prepared-view projection (P3-A spec §21)
// ---------------------------------------------------------------------------

/**
 * Project a prepared snapshot into a UI-safe Prepared View.
 *
 * Inputs (from P2 frozen `preparePackagingGeneration`):
 *   - prepared.translation (full P2 frozen Translation)
 *   - prepared.compiled (deterministic 14-block Compiler output)
 *   - prepared.capability (Provider Capability)
 *   - prepared.payload (Provider Adapter Payload)
 *   - prepared.metadata (P2 frozen Generation Metadata + Compile
 *     Fingerprint, 5 hashes)
 *
 * UI-safe fields exposed (P3-A spec §21):
 *   - target, generationMode, shotContractId, readiness,
 *     referenceSummary, lockedAssetSummary, providerSummary,
 *     compiledPromptPreview?, metadataSummary, fingerprintSummary,
 *     warnings, blockers
 *
 * The view model does NOT expose the raw payload / raw compiled /
 * raw provider body / raw capability. The compiled prompt preview
 * is exposed read-only (P3-A spec §22); the fingerprint summary
 * is the 5 P2-F hash short ids (NOT the full input).
 */
function projectPreparedView(prepared) {
  if (!isPlainObject(prepared)) {
    return null;
  }
  const translation = isPlainObject(prepared.translation) ? prepared.translation : {};
  const metadata = isPlainObject(prepared.metadata) ? prepared.metadata : {};
  const compiled = isPlainObject(prepared.compiled) ? prepared.compiled : {};
  const capability = isPlainObject(prepared.capability) ? prepared.capability : {};
  const referencePolicy = isPlainObject(translation.referencePolicy)
    ? translation.referencePolicy
    : {};
  const lockedAssets = isPlainObject(translation.lockedAssets)
    ? translation.lockedAssets
    : {};
  const fingerprint = isPlainObject(metadata.compileFingerprint)
    ? metadata.compileFingerprint
    : {};

  // The compiled prompt preview is the canonical Prompt string
  // produced by the deterministic Compiler. P3-A spec §22
  // mandates it is exposed read-only. We do NOT split the
  // prompt by block; the UI may show the full string.
  const compiledPromptPreview = typeof compiled.prompt === 'string'
    ? compiled.prompt
    : (typeof compiled.compiledPrompt === 'string' ? compiled.compiledPrompt : null);

  return Object.freeze({
    target: asString(translation.target, 'packaging'),
    generationMode: asString(translation.generationMode),
    shotContractId: asString(translation.shotContract?.id),
    readiness: 'ready',
    referenceSummary: Object.freeze({
      enabled: Boolean(referencePolicy.enabled),
      required: Boolean(referencePolicy.required),
      count: Number.isFinite(referencePolicy.count) ? referencePolicy.count
        : (Array.isArray(referencePolicy.references) ? referencePolicy.references.length : 0),
      roles: Object.freeze(asArray(referencePolicy.references).map((r) => asString(r?.role))),
    }),
    lockedAssetSummary: projectLockedAssetsForView(lockedAssets),
    providerSummary: Object.freeze({
      registryModelId: asString(capability.modelId),
      provider: asString(capability.provider),
      protocol: asString(capability.protocol),
      referenceSupport: Boolean(capability.referenceSupport),
      maxReferenceImages: Number.isFinite(capability.maxReferenceImages)
        ? capability.maxReferenceImages
        : null,
    }),
    compiledPromptPreview,
    metadataSummary: Object.freeze({
      translationVersion: asString(metadata.translationVersion),
      compilerVersion: asString(metadata.compilerVersion),
      providerCapabilityVersion: asString(metadata.providerCapabilityVersion),
      metadataVersion: asString(metadata.metadataVersion),
    }),
    fingerprintSummary: Object.freeze({
      sourceBundleHash: shortId(fingerprint.sourceBundleHash),
      userIntentHash: shortId(fingerprint.userIntentHash),
      deliverableHash: shortId(fingerprint.deliverableHash),
      referencePlanHash: shortId(fingerprint.referencePlanHash),
      compiledPromptHash: shortId(fingerprint.compiledPromptHash),
      executionIdentityHash: shortId(fingerprint.executionIdentityHash),
      compiledAt: asString(fingerprint.compiledAt),
    }),
    warnings: Object.freeze(asArray(metadata.warnings ?? metadata.gate?.warnings).map(asString)),
    blockers: Object.freeze(asArray(metadata.blockers ?? metadata.gate?.blockers).map(asString)),
  });
}

function shortId(value) {
  if (typeof value !== 'string') return null;
  return value.length > 12 ? `${value.slice(0, 12)}…` : value;
}

// ---------------------------------------------------------------------------
// Execution projection
// ---------------------------------------------------------------------------

function projectExecutionView(lastExecution) {
  if (!isPlainObject(lastExecution)) return null;
  const artifacts = Array.isArray(lastExecution.artifacts) ? lastExecution.artifacts : [];
  return Object.freeze({
    runId: asString(lastExecution.runId),
    status: asString(lastExecution.status),
    generationMode: asString(lastExecution.generationMode),
    shotContractId: asString(lastExecution.shotContractId),
    provider: lastExecution.provider ? Object.freeze({
      adapterId: asString(lastExecution.provider.adapterId),
      protocol: asString(lastExecution.provider.protocol),
      provider: asString(lastExecution.provider.provider),
    }) : null,
    model: lastExecution.model ? Object.freeze({
      registryModelId: asString(lastExecution.model.registryModelId),
      providerModelId: asString(lastExecution.model.providerModelId),
    }) : null,
    apiProfileId: asString(lastExecution.apiProfileId),
    artifacts: Object.freeze(artifacts.map((a) => Object.freeze({
      imageId: asString(a.imageId),
      mimeType: asString(a.mimeType, 'image/png'),
      hasB64: Boolean(a.hasB64),
      hasUrl: Boolean(a.hasUrl),
      relativePath: asString(a.relativePath),
      thumbnailRelativePath: asString(a.thumbnailRelativePath),
      width: Number.isFinite(a.width) ? a.width : null,
      height: Number.isFinite(a.height) ? a.height : null,
      sizeBytes: Number.isFinite(a.sizeBytes) ? a.sizeBytes : null,
    }))),
    diagnostics: lastExecution.diagnostics ? Object.freeze({
      startedAt: asString(lastExecution.diagnostics.startedAt),
      completedAt: asString(lastExecution.diagnostics.completedAt),
      durationMs: Number.isFinite(lastExecution.diagnostics.durationMs)
        ? lastExecution.diagnostics.durationMs
        : null,
      referenceCount: Number.isFinite(lastExecution.diagnostics.referenceCount)
        ? lastExecution.diagnostics.referenceCount
        : null,
      imageCount: Number.isFinite(lastExecution.diagnostics.imageCount)
        ? lastExecution.diagnostics.imageCount
        : null,
      region: asString(lastExecution.diagnostics.region) || null,
    }) : null,
  });
}

// ---------------------------------------------------------------------------
// Error projection (P3-A spec §35)
//
// Canonical error surface for the future P3-B UI:
//   code        — preserved verbatim (P3-A spec §35 forbids rewriting
//                 the canonical source code)
//   severity    — 'blocking' default
//   title       — canonical code (no PII / no raw path)
//   userMessage — CANONICAL SAFE message keyed off the error
//                 code; we NEVER fall back to the raw `error.message`
//                 because it may carry absolute paths /
//                 credentials / provider response bodies.
//                 (P3-A spec §46 / P3-A2 audit.)
//   recoverable — best-effort retryable flag
//   suggestedAction — UI hint, not a command
//
// The raw `error.message` and `error.cause` are kept on the
// internal session state for diagnostics; the view model
// NEVER projects them.
// ---------------------------------------------------------------------------

const CANONICAL_ERROR_USER_MESSAGES = Object.freeze({
  GENERATION_PROVIDER_FAILED: '生成服务请求失败，请稍后重试。',
  GENERATION_PERSISTENCE_FAILED: '生成结果保存失败，请稍后重试。',
  REFERENCE_ASSET_UNRESOLVED: '参考图无法解析，请检查已分配角色的参考图。',
  ARTIFACT_LIFECYCLE_REQUIRED: '生成结果存储路径缺失，请重试或联系支持。',
  EXECUTION_PROVIDER_MODEL_REQUIRED: '生成模型未配置，请先在设置中选择。',
  GENERATION_EXECUTION_STALE: '执行上下文已变更，请重新准备后再执行。',
  PACKAGING_METADATA_INVALID: '生成元数据无效，请重新准备。',
  PACKAGING_TRANSLATION_INVALID: '生成输入无效，请检查模式 / 镜头 / 约束。',
  SHOT_CONTRACT_INVALID: '镜头合约 ID 无效。',
  PACKAGING_COMPILE_FAILED: '提示编译失败，请重新准备。',
  COMPILE_INPUT_STALE: '已重新准备后再执行。',
  REFERENCE_REQUIRED: '参考图优先模式至少需要 1 张已分配角色的参考图。',
  REFERENCE_ROLE_INVALID: '参考图角色无效，请使用 6 个 canonical 角色之一。',
  REFERENCE_UNSUPPORTED: '当前生成模型不支持参考图。',
  PROVIDER_CAPABILITY_MISMATCH: '当前模型能力不匹配，请选择其他模型。',
  PACKAGING_WORKSPACE_INTENT_EDIT_REJECTED: '正在生成中，无法编辑意图。',
  PACKAGING_WORKSPACE_PREPARE_REJECTED: '准备被拒绝，请检查当前状态。',
  PACKAGING_WORKSPACE_PREPARE_FAILED: '准备失败，请修改后重试。',
  PACKAGING_WORKSPACE_EXECUTE_REJECTED: '执行被拒绝（已过期或状态不允许）。',
  PACKAGING_WORKSPACE_EXECUTE_FAILED: '执行失败，请稍后重试。',
  PACKAGING_WORKSPACE_RESET_REJECTED: '正在生成中，无法重置。',
  PACKAGING_WORKSPACE_INVALID_TRANSITION: '状态转换被拒绝。',
  PACKAGING_WORKSPACE_INVALID_INPUT: '输入无效。',
  PACKAGING_WORKSPACE_INVALID_INTENT: '意图无效，请检查字段。',
  PACKAGING_WORKSPACE_INVALID_PATCH: '更新补丁无效。',
  PACKAGING_WORKSPACE_UNKNOWN_SESSION: '会话不存在或已失效。',
  PACKAGING_WORKSPACE_UNKNOWN_ERROR: '未知错误，请稍后重试。',
});

const DEFAULT_USER_MESSAGE = '操作失败，请稍后重试。';

function projectErrorView(lastError) {
  if (!isPlainObject(lastError)) return null;
  const code = asString(lastError.code);
  const userMessage = CANONICAL_ERROR_USER_MESSAGES[code] || DEFAULT_USER_MESSAGE;
  // P3-A4 hostile-input redaction. The error surface accepts
  // arbitrary strings from upstream errors (provider
  // exceptions, filesystem errors, etc.). We sanitize the
  // `title` and `suggestedAction` fields against:
  //   - absolute paths (Windows / Unix / file:// / UNC)
  //   - credential substrings (apiKey / Authorization / Bearer)
  //   - oversized strings (> 200 chars, treat as hostile)
  // If the upstream value is hostile, fall back to a safe
  // default. The canonical `code` is preserved verbatim
  // (P3-A spec §35 forbids rewriting the canonical source
  // code).
  return Object.freeze({
    code,
    severity: asString(lastError.severity, 'blocking'),
    title: sanitizeShortText(asString(lastError.title)) || code,
    userMessage,
    recoverable: Boolean(lastError.recoverable),
    suggestedAction: sanitizeShortText(asString(lastError.suggestedAction)) || null,
  });
}

// Strings matching any of these patterns are treated as
// hostile and replaced with the safe default. The patterns
// are conservative: any path-looking or credential-looking
// substring triggers redaction. This is defense-in-depth on
// top of the canonical-code userMessage lookup.
const HOSTILE_PATTERNS = [
  // Windows drive absolute
  /[A-Za-z]:[\\/]/,
  // Unix absolute
  /(^|[^A-Za-z0-9])\/(?:home|tmp|etc|var|usr|opt|Users|root)\//,
  // file:// scheme
  /file:\/\//i,
  // UNC path
  /\\\\[A-Za-z0-9_.$-]+\\[A-Za-z0-9_.$-]+/,
  // Credential substrings
  /api[_-]?key/i,
  /authorization/i,
  /bearer\s+[A-Za-z0-9._~+/=-]+/i,
  /access[_-]?token/i,
  /\bsecret\b/i,
  /\bpassword\b/i,
  /\bcredential\b/i,
  // Long base64 (>= 80 chars) is suspicious; data URIs
  /data:[^;,]+;base64,/i,
];

const MAX_SAFE_TEXT_LENGTH = 200;

function sanitizeShortText(value) {
  if (typeof value !== 'string' || !value) return value;
  if (value.length > MAX_SAFE_TEXT_LENGTH) return '';
  for (const pattern of HOSTILE_PATTERNS) {
    if (pattern.test(value)) return '';
  }
  return value;
}

// ---------------------------------------------------------------------------
// Read-only readiness (P3-A3 spec §13 / P3-A4 spec §11)
//
// The future P3-B UI reads status / canPrepare / canExecute /
// canReset / canEditIntent / isBusy / isStale / staleReasons /
// lastError from the view model without re-deriving the state
// machine. This is the SOLE projection authority the UI has.
//
// P3-A4 invariant (spec §5): the capability projection MUST
// delegate to workspace-state helpers so that changing the
// state machine semantics requires only one source of truth.
// We import `isExecuteAllowed` / `isIntentEditAllowed` /
// `isPrepareAllowed` / `isResetAllowed` rather than re-hardcoding
// the rules inline.
// ---------------------------------------------------------------------------

function isBusyStatus(status) {
  return status === PACKAGING_WORKSPACE_STATUS.PREPARING
      || status === PACKAGING_WORKSPACE_STATUS.EXECUTING;
}

function projectReadiness(session, preparedView) {
  const status = asString(session.status);
  const isBusy = isBusyStatus(status);
  // canEditIntent is the canonical "may the UI submit an intent
  // patch?" answer. The intent-edit gate is implemented in
  // workspace-state.js (`isIntentEditAllowed`); the UI must
  // NOT re-derive this. Per P3-A spec §11, no silent recompile:
  // during PREPARING / EXECUTING, intent edits are rejected.
  const canEditIntent = isIntentEditAllowed(status);
  // The capability helpers are the SOLE authority. The view
  // model MUST NOT maintain a parallel rule table. Any change
  // to workspace-state semantics automatically flows through.
  const canExecute = isExecuteAllowed(status);
  const canPrepare = isPrepareAllowed(status);
  const canReset = isResetAllowed(status);
  const isStale = status === PACKAGING_WORKSPACE_STATUS.STALE;
  // canRetry is a derived capability: re-execute is allowed
  // from READY (after a previous failure with the same
  // prepared snapshot) and from EXECUTED (P3-A spec §28.1).
  // All other statuses reject canRetry.
  const canRetry = status === PACKAGING_WORKSPACE_STATUS.READY
                || status === PACKAGING_WORKSPACE_STATUS.EXECUTED;
  // `stale` is the legacy alias for `isStale` (kept for
  // backward compatibility with the A2 view-model shape).
  const stale = isStale;
  // Blockers (UI-displayable): the canonical code that
  // currently blocks the action. The UI is allowed to render
  // these as a single-line list; the codes are the source of
  // truth (P3-A spec §35).
  let blockers = Object.freeze([]);
  if (status === PACKAGING_WORKSPACE_STATUS.STALE) {
    blockers = Object.freeze([asString(session.lastStaleReason) || 'intent_changed']);
  } else if (status === PACKAGING_WORKSPACE_STATUS.FAILED) {
    blockers = Object.freeze([asString(session.lastError?.code) || 'unknown_failure']);
  }
  return Object.freeze({
    canPrepare,
    canExecute,
    canRetry,
    canReset,
    canEditIntent,
    isBusy,
    isStale,
    stale,
    blockers,
    warnings: Object.freeze([]),
  });
}

// ---------------------------------------------------------------------------
// Top-level view model
// ---------------------------------------------------------------------------

/**
 * Project a session state into the UI-safe View Model.
 *
 * The future P3-B UI binds to this shape, NOT to the raw
 * session state. The view model is the only authority the
 * UI has for "is this session ready?" / "what is the prepared
 * prompt?" / "what was the last run?".
 */
export function projectPackagingWorkspaceView(session) {
  if (!isPlainObject(session)) {
    throw new TypeError('session must be an object');
  }
  const intent = isPlainObject(session.intent) ? session.intent : null;
  const truthSnapshot = isPlainObject(session.truthSnapshot) ? session.truthSnapshot : {};
  const prepared = isPlainObject(session.prepared) ? session.prepared : null;
  const lastExecution = isPlainObject(session.lastExecution) ? session.lastExecution : null;
  const lastError = isPlainObject(session.lastError) ? session.lastError : null;

  const preparedView = projectPreparedView(prepared?.preparedResult || null);
  const executionView = projectExecutionView(lastExecution);
  const errorView = projectErrorView(lastError);

  const readiness = projectReadiness(session, preparedView);
  return Object.freeze({
    schemaVersion: PACKAGING_WORKSPACE_VIEW_MODEL_VERSION,
    sessionId: asString(session.sessionId),
    projectId: asString(session.projectId),
    target: 'packaging',
    status: asString(session.status),
    statusLabel: asString(PACKAGING_WORKSPACE_STATUS_LABELS[session.status] ?? session.status),
    // Top-level capability flags (P3-A3 spec §13). The future
    // P3-B UI should bind to these directly; the
    // `readiness.*` block is the same surface under a
    // namespaced key.
    isBusy: readiness.isBusy,
    canEditIntent: readiness.canEditIntent,
    mode: intent ? asString(intent.generationMode) : null,
    shot: intent ? asString(intent.shotContractId) : null,
    references: intent
      ? Object.freeze(asArray(intent.referenceAssignments).map(projectReferenceAssignmentForView))
      : Object.freeze([]),
    lockedAssets: projectLockedAssetsForView(truthSnapshot.lockedAssets || {}),
    intent: intent
      ? Object.freeze({
          generationMode: asString(intent.generationMode),
          shotContractId: asString(intent.shotContractId),
          explicitUserConstraintsText: asString(intent.explicitUserConstraints?.text),
          referenceCount: Array.isArray(intent.referenceAssignments)
            ? intent.referenceAssignments.length
            : 0,
          providerModelId: asString(intent.providerModelId),
          apiProfileId: asString(intent.apiProfileId),
        })
      : null,
    readiness,
    prepared: preparedView,
    execution: executionView,
    error: errorView,
    staleReasons: Object.freeze(asArray(session.lastStaleReasons)),
  });
}

// ---------------------------------------------------------------------------
// Deterministic serialization
// ---------------------------------------------------------------------------

/**
 * Project a session state into a JSON string with a
 * deterministic key order. The output is byte-stable for the
 * same input (P3-A4 spec §19).
 *
 * The future P3-B UI may use this for cache keys, log
 * deduplication, or test snapshots. The view-model object
 * itself is already frozen (immutable), but `JSON.stringify`
 * has implementation-defined property iteration order;
 * `serializeWorkspaceView` enforces a stable order by
 * walking the canonical schema key list and emitting one
 * field at a time.
 */
function stableJsonStringify(value, indent = 2) {
  const seen = new WeakSet();
  const walk = (v) => {
    if (v === null) return 'null';
    if (typeof v === 'string') return JSON.stringify(v);
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (Array.isArray(v)) {
      if (seen.has(v)) return '"[Circular]"';
      seen.add(v);
      const items = v.map(walk).join(',');
      seen.delete(v);
      return `[${items}]`;
    }
    if (typeof v === 'object') {
      if (seen.has(v)) return '"[Circular]"';
      seen.add(v);
      const keys = Object.keys(v).sort();
      const members = keys
        .filter((k) => v[k] !== undefined)
        .map((k) => `${JSON.stringify(k)}:${walk(v[k])}`)
        .join(',');
      seen.delete(v);
      return `{${members}}`;
    }
    return JSON.stringify(String(v));
  };
  return walk(value);
}

/**
 * Serialize a view model with deterministic key order.
 * Useful for test snapshots, cache keys, and
 * deterministic logging.
 */
export function serializeWorkspaceView(view) {
  if (!isPlainObject(view)) {
    throw new TypeError('view must be an object');
  }
  return stableJsonStringify(view, 0);
}

// ---------------------------------------------------------------------------
// Schema / shape documentation
// ---------------------------------------------------------------------------

/**
 * Canonical allowlist of top-level view-model keys.
 * P3-A4 spec §16: prefer an allowlist over a copy-then-delete
 * approach so future fields cannot accidentally leak.
 */
const CANONICAL_VIEW_MODEL_KEYS = Object.freeze([
  'schemaVersion',
  'sessionId',
  'projectId',
  'target',
  'status',
  'statusLabel',
  'isBusy',
  'canEditIntent',
  'mode',
  'shot',
  'references',
  'lockedAssets',
  'intent',
  'readiness',
  'prepared',
  'execution',
  'error',
  'staleReasons',
]);

/**
 * Canonical allowlist of intent projection keys.
 * Each key is UI-safe; no credential, no absolute path,
 * no raw provider payload.
 */
const CANONICAL_INTENT_KEYS = Object.freeze([
  'generationMode',
  'shotContractId',
  'explicitUserConstraintsText',
  'referenceCount',
  'providerModelId',
  'apiProfileId',
]);

/**
 * Canonical allowlist of execution projection keys.
 */
const CANONICAL_EXECUTION_KEYS = Object.freeze([
  'runId',
  'status',
  'generationMode',
  'shotContractId',
  'provider',
  'model',
  'apiProfileId',
  'artifacts',
  'diagnostics',
]);

/**
 * Canonical allowlist of prepared projection keys.
 */
const CANONICAL_PREPARED_KEYS = Object.freeze([
  'target',
  'generationMode',
  'shotContractId',
  'readiness',
  'referenceSummary',
  'lockedAssetSummary',
  'providerSummary',
  'compiledPromptPreview',
  'metadataSummary',
  'fingerprintSummary',
  'warnings',
  'blockers',
]);

/**
 * Canonical allowlist of error projection keys.
 */
const CANONICAL_ERROR_KEYS = Object.freeze([
  'code',
  'severity',
  'title',
  'userMessage',
  'recoverable',
  'suggestedAction',
]);

/**
 * Return the canonical allowlist of top-level view-model
 * keys. The future P3-B UI may rely on this set to detect
 * schema additions.
 */
export function getPackagingWorkspaceViewModelKeys() {
  return CANONICAL_VIEW_MODEL_KEYS.slice();
}

export function getPackagingWorkspaceIntentKeys() {
  return CANONICAL_INTENT_KEYS.slice();
}

export function getPackagingWorkspaceExecutionKeys() {
  return CANONICAL_EXECUTION_KEYS.slice();
}

export function getPackagingWorkspacePreparedKeys() {
  return CANONICAL_PREPARED_KEYS.slice();
}

export function getPackagingWorkspaceErrorKeys() {
  return CANONICAL_ERROR_KEYS.slice();
}

/**
 * Snapshot helper for tests. Documents the canonical
 * view-model surface and the explicit safe-side / unsafe-side
 * allowlist.
 */
export function getPackagingWorkspaceViewModelFingerprint() {
  return Object.freeze({
    schemaVersion: PACKAGING_WORKSPACE_VIEW_MODEL_VERSION,
    includes: Object.freeze([
      'identity (sessionId, projectId)',
      'state (status, statusLabel, isBusy, canEditIntent)',
      'capabilities (readiness.{canPrepare, canExecute, canRetry, canReset, canEditIntent, isBusy, isStale, stale, blockers, warnings})',
      'intent (projection of 6 user-editable semantic fields; apiProfileId is an identifier, not a secret)',
      'references (UI-safe projection: assetId, role, source, displayName, previewUri; UI-only fields preserved)',
      'lockedAssets (projection: brand, logo, productIdentity, category, structure, mandatoryCopy, confirmedComponents; path / credential keys stripped)',
      'prepared (UI-safe Prepared View: target, generationMode, shotContractId, referenceSummary, lockedAssetSummary, providerSummary, compiledPromptPreview, metadataSummary, fingerprintSummary, warnings, blockers)',
      'execution (runId, status, provider, model, apiProfileId, artifacts, diagnostics; relativePath only)',
      'error (code, severity, title, userMessage keyed off canonical code, recoverable, suggestedAction)',
      'staleReasons (string list)',
    ]),
    excludes: Object.freeze([
      'apiKey',
      'Authorization',
      'Bearer <token>',
      'raw signed URL credentials',
      'absolute local path (Windows drive / Unix / file:// / UNC)',
      'raw provider request body',
      'raw provider response body',
      'raw error.message (view model uses canonical userMessage lookup)',
      'raw stack trace',
      'raw execution config',
      'raw payload object',
      'raw 14-block topology',
      'intentAtPrepare / truthFingerprintAtPrepare (internal application state, not UI surface)',
      'second generation fingerprint (any parallel fingerprint authority is forbidden)',
    ]),
    canonicalKeys: Object.freeze({
      topLevel: CANONICAL_VIEW_MODEL_KEYS.slice(),
      intent: CANONICAL_INTENT_KEYS.slice(),
      execution: CANONICAL_EXECUTION_KEYS.slice(),
      prepared: CANONICAL_PREPARED_KEYS.slice(),
      error: CANONICAL_ERROR_KEYS.slice(),
    }),
  });
}
