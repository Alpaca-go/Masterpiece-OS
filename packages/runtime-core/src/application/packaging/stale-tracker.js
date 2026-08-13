// P3-A2 — Packaging Workspace Stale Tracker.
//
// Capability boundary:
//   Pure stale-detection logic. No I/O. No Provider call.
//   The tracker re-uses the P3-A2 intent-schema's `detectStaleChange`
//   helper; the canonical semantic edit signal is the difference
//   between the *current* intent and the *saved* intent at
//   prepare time, plus a truth-surface fingerprint comparison
//   (P3-A spec §10 + §30).
//
// Architectural position (P3-A spec §10, §11, §30):
//   - Generation Mode / Shot / Explicit Constraints / References /
//     Provider / API Profile all mark STALE on edit.
//   - UI-only fields (previewUri / displayName / selectionOrderUI
//     per spec §15 / §37) are NEVER part of the comparison.
//   - The truth surface (Locked Assets, Analysis Context) is
//     read-only on the Workspace side, but upstream changes
//     mark STALE (Project Restore Contract, P3-A spec §30).
//
// Stop conditions honoured (P3-A spec §55):
//   - STOP-P3-A-07: the tracker NEVER triggers a re-prepare; it
//     only reports. The Workspace service is the sole consumer
//     of the tracker and decides what to do next.

import { detectStaleChange } from './intent-schema.js';

export const PACKAGING_WORKSPACE_STALE_TRACKER_VERSION = '1.0.0';

// Stale reasons. Strings are stable across sessions and are
// safe to surface in the UI error envelope. Each reason
// corresponds to a P3-A spec §10 / §30 field.
export const STALE_REASON = Object.freeze({
  INTENT_CHANGED: 'intent_changed',
  TRUTH_SURFACE_CHANGED: 'truth_surface_changed',
});

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Compute the Workspace stale signal.
 *
 * @param {object} input
 * @param {object} input.currentIntent - the latest intent (post-update)
 * @param {object|null} input.prepared - the saved prepared snapshot (or null)
 * @param {object} input.truthSnapshot - the current truth surface
 * @returns {{
 *   stale: boolean,
 *   reasons: string[],
 *   reasonDetail: { intentChanged: boolean, truthChanged: boolean },
 * }}
 *
 * If `prepared` is null, the session has no preparation yet, so
 * the result is `{ stale: false, ... }`. The caller (the
 * Workspace service) decides whether to transition to STALE
 * based on the *previous* session status.
 */
export function computeStale({ currentIntent, prepared, truthSnapshot }) {
  if (!isPlainObject(prepared)) {
    return Object.freeze({
      stale: false,
      reasons: Object.freeze([]),
      reasonDetail: Object.freeze({ intentChanged: false, truthChanged: false }),
    });
  }
  const savedIntent = isPlainObject(prepared.intentAtPrepare) ? prepared.intentAtPrepare : null;
  const savedTruthFingerprint = typeof prepared.truthFingerprintAtPrepare === 'string'
    ? prepared.truthFingerprintAtPrepare
    : '';
  const detection = detectStaleChange({
    currentIntent,
    savedIntent,
    currentTruth: truthSnapshot,
    savedTruthFingerprint,
  });
  return Object.freeze({
    stale: detection.stale,
    reasons: detection.reasons,
    reasonDetail: Object.freeze({
      intentChanged: detection.reasons.includes(STALE_REASON.INTENT_CHANGED),
      truthChanged: detection.reasons.includes(STALE_REASON.TRUTH_SURFACE_CHANGED),
    }),
  });
}

/**
 * Snapshot helper for tests: returns the structural
 * fingerprint of the stale-tracker authority.
 */
export function getPackagingStaleTrackerFingerprint() {
  return Object.freeze({
    schemaVersion: PACKAGING_WORKSPACE_STALE_TRACKER_VERSION,
    reasons: Object.freeze(Object.values(STALE_REASON).slice()),
  });
}
