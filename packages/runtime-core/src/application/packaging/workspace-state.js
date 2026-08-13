// P3-A2 — Packaging Workspace State Machine.
//
// Capability boundary:
//   Pure state-machine primitives. No I/O. No Provider call. No
//   P2 frozen module import. The Workspace status is derived
//   from the (intent, truthSnapshot, prepared) triple and is the
//   only authoritative state surface for the Workspace layer.
//
// Architectural position (P3-A spec §9, §11):
//   - status names are capability-named, NOT phase-named
//     ('ready' / 'stale' / 'executing' / 'unprepared', never
//      'P3A_READY' / 'P3_PREPARED').
//   - status transitions are pure functions of (currentStatus,
//     event, frozen-prepared-snapshot). No I/O side effects.
//   - 'silent recompile' is structurally impossible: a 'dirty'
//     transition (intent edit after READY) lands the session in
//     'stale', not in a re-prepared state.
//
// Stop conditions honoured (P3-A spec §55):
//   - STOP-P3-A-07: Workspace execute cannot silent-recompile.
//     Execute is only allowed from 'ready' (or 'executed' for
//     a same-input retry). All other source statuses reject.

export const PACKAGING_WORKSPACE_STATE_MACHINE_VERSION = '1.0.0';

export const PACKAGING_WORKSPACE_STATUS = Object.freeze({
  // Session has been created; intent may or may not be set yet.
  // Intent edits are allowed; prepare is allowed.
  NEW: 'new',

  // Intent is set; no prepared snapshot exists.
  // Intent edits are allowed; prepare is allowed; execute is rejected.
  UNPREPARED: 'unprepared',

  // Prepare is in flight. Intent edits are rejected (no
  // mutation during async work); execute is rejected.
  PREPARING: 'preparing',

  // Prepared snapshot exists; current intent matches the
  // saved preparation intent (no semantic edit detected).
  // Intent edits transition READY → STALE.
  // Execute is allowed.
  READY: 'ready',

  // Prepared snapshot exists; current intent differs from the
  // saved preparation intent (semantic edit detected).
  // Intent edits stay in STALE. Prepare is allowed (resets to
  // PREPARING → READY). Execute is rejected (STOP-P3-A-07).
  STALE: 'stale',

  // Execute is in flight. Intent edits are rejected; prepare
  // is rejected; another execute is rejected.
  EXECUTING: 'executing',

  // Execute has produced a Generation Result. The prepared
  // snapshot is still available; re-execute (same semantic
  // request) is allowed, semantic edits transition to STALE.
  EXECUTED: 'executed',

  // Prepare or execute failed. The last error is on
  // `session.lastError`. Reset to UNPREPARED via
  // resetPackagingWorkspacePreparation.
  FAILED: 'failed',
});

const STATUS_SET = new Set(Object.values(PACKAGING_WORKSPACE_STATUS));

// Allowed transitions table. A transition not listed here is
// rejected. The state machine is intentionally narrow: the
// Workspace layer cannot silently jump from UNPREPARED to
// READY (that requires going through PREPARING), from
// READY to EXECUTING (that requires going through EXECUTING),
// etc.
const ALLOWED_TRANSITIONS = Object.freeze({
  new: Object.freeze(['unprepared', 'preparing', 'failed']),
  unprepared: Object.freeze(['preparing', 'failed']),
  preparing: Object.freeze(['ready', 'stale', 'failed']),
  ready: Object.freeze(['preparing', 'stale', 'executing', 'failed']),
  stale: Object.freeze(['preparing', 'failed']),
  executing: Object.freeze(['executed', 'failed']),
  executed: Object.freeze(['preparing', 'stale', 'executing', 'failed']),
  failed: Object.freeze(['preparing', 'unprepared', 'failed']),
});

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

/**
 * Build the initial Workspace session state.
 *
 * P3-A spec §8.1: the session is created from a `truthSnapshot`
 * (locked assets, analysis context) and an optional `initialIntent`.
 * Status starts at NEW; the first intent update (or first prepare)
 * transitions it to UNPREPARED → PREPARING → READY.
 *
 * The truth surface is read-only. The intent is mutable via
 * updatePackagingWorkspaceIntent (P3-A spec §8.2).
 */
export function createInitialSessionState({ sessionId, projectId, truthSnapshot, initialIntent }) {
  if (typeof sessionId !== 'string' || !sessionId) {
    throw new TypeError('sessionId must be a non-empty string');
  }
  if (typeof projectId !== 'string' || !projectId) {
    throw new TypeError('projectId must be a non-empty string');
  }
  const truth = isPlainObject(truthSnapshot) ? truthSnapshot : {};
  return Object.freeze({
    schemaVersion: PACKAGING_WORKSPACE_STATE_MACHINE_VERSION,
    sessionId,
    projectId,
    status: PACKAGING_WORKSPACE_STATUS.NEW,
    intent: initialIntent || null,
    truthSnapshot: Object.freeze({ ...truth }),
    prepared: null,
    lastExecution: null,
    lastError: null,
  });
}

// ---------------------------------------------------------------------------
// Transition guards
// ---------------------------------------------------------------------------

/**
 * Pure transition function. Given a current session state and
 * an event name, returns a new session state with the new
 * status applied, or throws if the transition is not allowed.
 *
 * This function is intentionally pure: it does not run prepare
 * or execute. The Workspace service composes it with the
 * actual P2 frozen prepare / execute calls.
 */
export function transitionSession(currentState, nextStatus) {
  if (!isPlainObject(currentState)) {
    throw new TypeError('currentState must be an object');
  }
  if (!STATUS_SET.has(nextStatus)) {
    throw new Error(`PACKAGING_WORKSPACE_INVALID_TRANSITION: unknown status: ${nextStatus}`);
  }
  const allowed = ALLOWED_TRANSITIONS[currentState.status] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(
      `PACKAGING_WORKSPACE_INVALID_TRANSITION: ${currentState.status} -> ${nextStatus}`,
    );
  }
  return Object.freeze({
    ...currentState,
    status: nextStatus,
  });
}

/**
 * Returns `true` if the given status permits
 * `executePackagingWorkspaceGeneration`. This is the
 * pre-execution stale gate (STOP-P3-A-07): only `ready` and
 * `executed` allow execute.
 */
export function isExecuteAllowed(status) {
  return status === PACKAGING_WORKSPACE_STATUS.READY
      || status === PACKAGING_WORKSPACE_STATUS.EXECUTED;
}

/**
 * Returns `true` if the given status permits an intent edit.
 * Per P3-A spec §11, no silent recompile: during async work
 * (PREPARING / EXECUTING), intent edits are rejected.
 */
export function isIntentEditAllowed(status) {
  return status === PACKAGING_WORKSPACE_STATUS.NEW
      || status === PACKAGING_WORKSPACE_STATUS.UNPREPARED
      || status === PACKAGING_WORKSPACE_STATUS.READY
      || status === PACKAGING_WORKSPACE_STATUS.STALE
      || status === PACKAGING_WORKSPACE_STATUS.EXECUTED
      || status === PACKAGING_WORKSPACE_STATUS.FAILED;
}

/**
 * Returns `true` if the given status permits
 * `preparePackagingWorkspaceGeneration`. Per P3-A spec §8.3,
 * prepare is allowed from any non-async state.
 */
export function isPrepareAllowed(status) {
  return status === PACKAGING_WORKSPACE_STATUS.NEW
      || status === PACKAGING_WORKSPACE_STATUS.UNPREPARED
      || status === PACKAGING_WORKSPACE_STATUS.READY
      || status === PACKAGING_WORKSPACE_STATUS.STALE
      || status === PACKAGING_WORKSPACE_STATUS.EXECUTED
      || status === PACKAGING_WORKSPACE_STATUS.FAILED;
}

/**
 * Returns `true` if the given status permits
 * `resetPackagingWorkspacePreparation`. The reset is always
 * allowed except during in-flight async work.
 */
export function isResetAllowed(status) {
  return status === PACKAGING_WORKSPACE_STATUS.NEW
      || status === PACKAGING_WORKSPACE_STATUS.UNPREPARED
      || status === PACKAGING_WORKSPACE_STATUS.READY
      || status === PACKAGING_WORKSPACE_STATUS.STALE
      || status === PACKAGING_WORKSPACE_STATUS.EXECUTED
      || status === PACKAGING_WORKSPACE_STATUS.FAILED;
}

/**
 * Status mirror for the UI. The mirror is the canonical
 * PACKAGING_WORKSPACE_STATUS list with localized labels for
 * the future P3-B workspace surface.
 */
export const PACKAGING_WORKSPACE_STATUS_LABELS = Object.freeze({
  new: '新建',
  unprepared: '未准备',
  preparing: '准备中',
  ready: '已准备',
  stale: '已过期',
  executing: '执行中',
  executed: '已生成',
  failed: '失败',
});

/**
 * Snapshot helper for tests: returns the structural
 * fingerprint of the state machine.
 */
export function getPackagingWorkspaceStateMachineFingerprint() {
  return Object.freeze({
    schemaVersion: PACKAGING_WORKSPACE_STATE_MACHINE_VERSION,
    statuses: Object.freeze(Object.values(PACKAGING_WORKSPACE_STATUS).slice()),
    allowedTransitions: Object.freeze(
      Object.fromEntries(
        Object.entries(ALLOWED_TRANSITIONS).map(([k, v]) => [k, v.slice()]),
      ),
    ),
  });
}
