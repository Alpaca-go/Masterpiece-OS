// P3-A2 — Packaging Workspace Reference Assignments → P2 Reference Policy.
//
// Capability boundary:
//   The Workspace intent carries `referenceAssignments` as
//   `{ assetId, role, source, includeReason?, displayName?, previewUri? }`
//   (P3-A spec §15). The P2 frozen Translation layer
//   (`createPackagingTranslation`) consumes a `referencePolicy` block
//   whose `references` field is `{ assetId, role, source, includeReason? }`
//   (P2-C). This module is the *only* place that performs the
//   mapping; no parallel authority.
//
// Architectural position (P3-A spec §5, §14, §51):
//   - The 6 canonical Reference roles are imported from the P2
//     frozen authority (`reference-policy.js`). The Workspace does
//     not redefine the role list.
//   - The UI-only fields (`displayName`, `previewUri`,
//     `selectionOrderUI`) are STRIPPED before the policy is
//     constructed; they MUST NEVER participate in fingerprint
//     (P3-A spec §15, §37).
//   - Reference role assignment is explicit; there is no
//     "system guesses role" path (P3-A spec §14).
//   - Reference-First mode with no references is fail-closed:
//     the Workspace layer returns `REFERENCE_REQUIRED`; the P2
//     frozen `validateReferencePolicy` is the ultimate gate.

import {
  PACKAGING_REFERENCE_ROLES,
  resolveReferencePolicy,
  validateReferencePolicy,
} from '@masterpiece/image-generation-runtime/packaging/reference-policy.js';

export { PACKAGING_REFERENCE_ROLES };

export const PACKAGING_WORKSPACE_REFERENCE_ASSIGNMENTS_VERSION = '1.0.0';

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asString(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

/**
 * Strip the UI-only fields from a reference assignment and
 * return a frozen P2-frozen-shape reference object.
 *
 * UI-only fields stripped (P3-A spec §15, §37):
 *   previewUri, displayName, thumbnail, selectionOrderUI
 */
function stripUiFields(assignment) {
  const raw = asObject(assignment);
  const ref = {
    assetId: asString(raw.assetId),
    role: asString(raw.role),
    source: asString(raw.source, 'user'),
  };
  const includeReason = asString(raw.includeReason);
  if (includeReason) ref.includeReason = includeReason;
  return ref;
}

/**
 * Project Workspace reference assignments into a P2 frozen
 * `referencePolicy` block.
 *
 * This is the ONLY place that performs the Workspace → P2 mapping.
 * The function returns the shape that `createPackagingTranslation`
 * expects under `input.referencePolicy`. It does NOT throw on
 * reference-role problems; it defers to the P2 frozen
 * `validateReferencePolicy` for the final fail-closed gate.
 *
 * @param {string} generationMode
 * @param {Array} assignments - Workspace reference assignments
 * @param {object} providerCapability - from the Provider Registry
 * @returns {{
 *   enabled: boolean,
 *   required: boolean,
 *   references: Array<{assetId, role, source, includeReason?}>,
 * }}
 */
export function projectReferenceAssignmentsToPolicy({ generationMode, assignments, providerCapability }) {
  const normalized = Array.isArray(assignments) ? assignments.map(stripUiFields) : [];
  const policyInput = {
    generationMode: asString(generationMode),
    referencePolicy: {
      references: normalized,
    },
    providerCapability: asObject(providerCapability),
  };
  const resolved = resolveReferencePolicy(policyInput);
  // We do NOT call validateReferencePolicy here. The Workspace
  // returns the resolved policy verbatim; the canonical
  // REFERENCE_REQUIRED / REFERENCE_ROLE_INVALID / etc. code is
  // produced by `preparePackagingWorkspaceGeneration` (which
  // forwards the P2 frozen translation error to the caller).
  return Object.freeze({
    enabled: resolved.enabled,
    required: resolved.required,
    references: Object.freeze(resolved.references.slice()),
  });
}

/**
 * Project a Workspace reference assignment into a UI-safe
 * summary for the future P3-B workspace surface.
 *
 * P3-A spec §14 / §15: the UI shows the assignment as
 * `{ assetId, role, source, displayName?, previewUri? }`.
 *
 * Semantic vs UI-only matrix (P3-A6):
 *   - assetId, role, source: SEMANTIC (participate in
 *     generation fingerprint; trigger STALE on change).
 *   - displayName, previewUri: UI-ONLY (preserved for
 *     display; never participate in fingerprint; never
 *     trigger STALE).
 *   - selectionOrderUI, thumbnail: UI-ONLY (dropped; the
 *     UI reorders / sources thumbnails from the upstream
 *     project assets surface, not the Workspace).
 *
 * The function returns only the 5 canonical view keys
 * (REFERENCE_VIEW_KEYS); the workspace view-model allows
 * future keys to leak in by accident.
 */
export const REFERENCE_VIEW_KEYS = Object.freeze([
  'assetId',
  'role',
  'source',
  'displayName',
  'previewUri',
]);

export function projectReferenceAssignmentForView(assignment) {
  const raw = asObject(assignment);
  return Object.freeze({
    assetId: asString(raw.assetId),
    role: asString(raw.role),
    source: asString(raw.source, 'user'),
    displayName: asString(raw.displayName) || undefined,
    previewUri: asString(raw.previewUri) || undefined,
  });
}

/**
 * Snapshot helper for tests: returns the structural
 * keys of the reference-assignment view projection so a
 * test can pin the canonical surface. (P3-A6 hardening
 * of P3-A4's canonical-keys allowlist pattern.)
 */
export function getPackagingReferenceAssignmentsViewKeys() {
  return REFERENCE_VIEW_KEYS.slice();
}

/**
 * Snapshot helper for tests: returns the structural
 * fingerprint of the assignments authority.
 */
export function getPackagingWorkspaceReferenceAssignmentsFingerprint() {
  return Object.freeze({
    schemaVersion: PACKAGING_WORKSPACE_REFERENCE_ASSIGNMENTS_VERSION,
    roleCount: PACKAGING_REFERENCE_ROLES.length,
    roles: PACKAGING_REFERENCE_ROLES.slice(),
  });
}
