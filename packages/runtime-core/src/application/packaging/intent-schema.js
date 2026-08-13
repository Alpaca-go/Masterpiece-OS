// P3-A2 — Packaging Workspace Intent Schema.
//
// Capability boundary:
//   The Workspace intent is the *only* user-editable application state
//   the P3 Packaging Workspace Application API accepts. It is a thin
//   projection over the canonical P2 frozen Translation input shape;
//   the Workspace layer is NOT a second authority for the canonical
//   fields (no second generationMode / shotContract / reference role
//   authority, no second fingerprint algorithm).
//
//   The intent is structured (not free-form). It carries exactly the
//   user-editable fields listed in P3-A spec §8.2. Locked-Asset /
//   truth surface is accepted on session creation but never on intent
//   update (P3-A spec §18, §19).
//
// Architectural position (P3-A spec §3, §5, §43):
//   UI / controller
//     ↓
//   workspace-service  (this file is the *data* half of the service)
//     ↓
//   P2 frozen packaging/generation-service
//     ↓
//   Shared Core
//
// Stop conditions honoured (P3-A spec §55):
//   - STOP-P3-A-04: no P2 frozen semantic contract modification.
//   - STOP-P3-A-05: no second Reference role mapping authority.
//   - STOP-P3-A-06: no second precedence engine.

import { PACKAGING_GENERATION_MODES } from '@masterpiece/image-generation-runtime/packaging/translation.js';
import { PACKAGING_SHOT_CONTRACT_IDS } from '@masterpiece/image-generation-runtime/packaging/contracts.js';
import { PACKAGING_REFERENCE_ROLES } from '@masterpiece/image-generation-runtime/packaging/reference-policy.js';

export const PACKAGING_WORKSPACE_INTENT_VERSION = '1.0.0';

// The 7 user-editable semantic fields (P3-A spec §8.2 + §10).
// Any change to one of these marks the preparation stale.
// UI-only fields (previewUri, displayName, selectionOrderUI,
// thumbnail) are NOT in this list; per P3-A spec §15, §37 they
// must NEVER participate in fingerprinting.
export const PACKAGING_WORKSPACE_INTENT_FIELDS = Object.freeze([
  'generationMode',
  'shotContractId',
  'explicitUserConstraints',
  'referenceAssignments',
  'providerModelId',
  'apiProfileId',
]);

// The 6 reference roles are the canonical P2 frozen authority
// (P2 spec §14, P2-C). The Workspace does not introduce a parallel
// role list. We re-export the frozen canonical roles for the
// Workspace layer to consume.
export { PACKAGING_REFERENCE_ROLES, PACKAGING_SHOT_CONTRACT_IDS, PACKAGING_GENERATION_MODES };

// The frozen single-source-of-truth role set is exposed as a
// `Set` for O(1) `has(role)` checks. Constructed from the same
// frozen array; not a parallel authority.
const REFERENCE_ROLE_SET = new Set(PACKAGING_REFERENCE_ROLES);
const GENERATION_MODE_SET = new Set(PACKAGING_GENERATION_MODES);
const SHOT_CONTRACT_ID_SET = new Set(PACKAGING_SHOT_CONTRACT_IDS);

function asArray(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.slice();
  return [value];
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asString(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate a Workspace reference assignment.
 *
 * P3-A spec §15 mandates that the Workspace must produce
 * `{assetId, role, source}` per assignment. The canonical 6
 * roles are imported from the P2 frozen authority.
 *
 * Returns `{ valid: true, normalized }` or `{ valid: false, code, issues }`.
 * The Workspace layer throws a structured error upstream; this
 * helper returns the structured result so the service can attach
 * the canonical error code on the session state.
 */
export function validateReferenceAssignment(assignment, indexHint) {
  const raw = asObject(assignment);
  const assetId = asString(raw.assetId);
  if (!assetId) {
    return {
      valid: false,
      code: 'REFERENCE_ROLE_INVALID',
      issues: [`reference_asset_id_missing:at_index_${indexHint}`],
    };
  }
  const role = asString(raw.role);
  if (!role) {
    return {
      valid: false,
      code: 'REFERENCE_ROLE_INVALID',
      issues: [`reference_role_missing:asset_${assetId}`],
    };
  }
  if (!REFERENCE_ROLE_SET.has(role)) {
    return {
      valid: false,
      code: 'REFERENCE_ROLE_INVALID',
      issues: [`reference_role_invalid:asset_${assetId}_role_${role}`],
    };
  }
  return {
    valid: true,
    normalized: Object.freeze({
      assetId,
      role,
      source: asString(raw.source, 'user'),
      includeReason: asString(raw.includeReason) || undefined,
    }),
  };
}

/**
 * Validate a full Workspace intent.
 *
 * P3-A spec §8.2 enumerates the editable fields. This function
 * enforces:
 *   - generationMode ∈ P2 frozen canonical modes
 *   - shotContractId ∈ P2 frozen canonical shot ids
 *   - referenceAssignments[i] ∈ valid role + has assetId
 *   - explicitUserConstraints.text is a string (any non-empty / empty)
 *   - providerModelId and apiProfileId are strings
 *
 * Returns `{ valid: true, intent }` (frozen) or
 * `{ valid: false, code, issues }` with the canonical P2 error
 * code (SHOT_CONTRACT_INVALID, REFERENCE_ROLE_INVALID, etc.).
 */
export function validatePackagingIntent(intent) {
  const raw = asObject(intent);
  const generationMode = asString(raw.generationMode);
  if (!GENERATION_MODE_SET.has(generationMode)) {
    return {
      valid: false,
      code: 'PACKAGING_TRANSLATION_INVALID',
      issues: [`unsupported_generation_mode:${generationMode || 'empty'}`],
    };
  }
  const shotContractId = asString(raw.shotContractId);
  if (!SHOT_CONTRACT_ID_SET.has(shotContractId)) {
    return {
      valid: false,
      code: 'SHOT_CONTRACT_INVALID',
      issues: [`unknown_shot_contract_id:${shotContractId || 'empty'}`],
    };
  }
  const explicit = asObject(raw.explicitUserConstraints);
  const explicitUserConstraints = Object.freeze({
    text: typeof explicit.text === 'string' ? explicit.text : '',
  });
  const rawAssignments = Array.isArray(raw.referenceAssignments) ? raw.referenceAssignments : [];
  const seenAssetIds = new Set();
  const referenceAssignments = [];
  for (let idx = 0; idx < rawAssignments.length; idx += 1) {
    const validated = validateReferenceAssignment(rawAssignments[idx], idx);
    if (!validated.valid) {
      return validated;
    }
    const normalized = validated.normalized;
    if (seenAssetIds.has(normalized.assetId)) {
      return {
        valid: false,
        code: 'REFERENCE_ROLE_INVALID',
        issues: [`reference_asset_id_duplicate:${normalized.assetId}`],
      };
    }
    seenAssetIds.add(normalized.assetId);
    referenceAssignments.push(normalized);
  }
  return {
    valid: true,
    intent: Object.freeze({
      schemaVersion: PACKAGING_WORKSPACE_INTENT_VERSION,
      generationMode,
      shotContractId,
      explicitUserConstraints,
      referenceAssignments: Object.freeze(referenceAssignments),
      providerModelId: typeof raw.providerModelId === 'string' ? raw.providerModelId : '',
      apiProfileId: typeof raw.apiProfileId === 'string' ? raw.apiProfileId : '',
    }),
  };
}

/**
 * Create a default empty Workspace intent.
 *
 * Used by `createPackagingWorkspaceSession` when the caller
 * does not pass an `initialIntent`. Defaults are capability-
 * neutral (analysis_led, HERO, empty constraints, no references).
 */
export function createDefaultPackagingIntent() {
  return Object.freeze({
    schemaVersion: PACKAGING_WORKSPACE_INTENT_VERSION,
    generationMode: 'analysis_led',
    shotContractId: 'PKG-HERO-SINGLE',
    explicitUserConstraints: Object.freeze({ text: '' }),
    referenceAssignments: Object.freeze([]),
    providerModelId: '',
    apiProfileId: '',
  });
}

// ---------------------------------------------------------------------------
// Equality / fingerprint
// ---------------------------------------------------------------------------

function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

/**
 * Structural equality for two Workspace intents.
 *
 * Used for in-process stale detection. P3-A spec §10 mandates
 * that any change to a semantic intent field marks the
 * preparation stale; this function is the canonical comparison.
 */
export function packagingIntentsEqual(a, b) {
  if (a === b) return true;
  if (!isPlainObject(a) || !isPlainObject(b)) return false;
  return deepEqual(a, b);
}

// ---------------------------------------------------------------------------
// Stale check (semantic edit detection)
//
// P3-A spec §10:
//   generationMode / shotContractId / explicit user constraints /
//   reference assignments / provider model / api profile → stale
//
// The truth surface (lockedAssets) is accepted at session creation
// and may also change upstream between prepare and execute; the
// session's `lastTruthFingerprint` is recomputed on every intent
// update. If it changes while status is READY/EXECUTED, that also
// marks stale (P3-A spec §30 — Project Restore Contract).
// ---------------------------------------------------------------------------

function stableStringify(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function truthFingerprint(truthSnapshot) {
  if (!isPlainObject(truthSnapshot)) return '';
  // Stable deep JSON serialization (sorted keys at every level)
  // — no second hash algorithm; structural equality is the
  // sole authority.
  return stableStringify(truthSnapshot);
}

export { truthFingerprint as computeTruthFingerprint };

/**
 * Compare a current intent + truth snapshot to a saved intent +
 * truth fingerprint. Returns `{ stale: boolean, reasons: string[] }`.
 *
 * P3-A spec §10 + §30: any change to a semantic field, or to the
 * upstream truth surface (locked assets), marks the preparation
 * stale.
 */
export function detectStaleChange({ currentIntent, savedIntent, currentTruth, savedTruthFingerprint }) {
  const reasons = [];
  if (!packagingIntentsEqual(currentIntent, savedIntent)) {
    reasons.push('intent_changed');
  }
  const currentTruthFp = truthFingerprint(currentTruth);
  if (savedTruthFingerprint && currentTruthFp !== savedTruthFingerprint) {
    reasons.push('truth_surface_changed');
  } else if (!savedTruthFingerprint && currentTruth) {
    // First observation of a non-empty truth after a prepare with
    // an empty truth: treat as a change so the caller re-prepares.
    reasons.push('truth_surface_changed');
  }
  return { stale: reasons.length > 0, reasons: Object.freeze(reasons) };
}
