// P3-A2 — Packaging Workspace Locked Assets Projection.
//
// Capability boundary:
//   Pure read-only projection over an upstream Locked-Assets
//   block. The Workspace layer does NOT own Locked Assets; the
//   production authority is the P2 frozen Translation / P3-A6
//   Locked-Asset chain. This module is a *projection* only —
//   it normalises the upstream shape into a UI-safe summary
//   and computes a stable fingerprint for change detection
//   (P3-A spec §18, §19, §30).
//
// Architectural position (P3-A spec §3, §18, §19, §30):
//   - The truth surface (Locked Assets + Analysis Context) is
//     accepted at session creation and is NEVER editable via
//     `updatePackagingWorkspaceIntent`.
//   - Re-opening a project: if the upstream Locked Assets have
//     changed, the prepared snapshot is marked STALE.
//   - The projection strips raw absolute paths / file shapes
//     that may have leaked in from the upstream authority; only
//     the canonical Locked-Asset fields (brand / logo /
//     productIdentity / category / structure / mandatoryCopy /
//     confirmedComponents) are surfaced.
//
// Stop conditions honoured (P3-A spec §55):
//   - STOP-P3-A-08: the projection MUST NOT surface absolute
//     paths or credentials. We strip the `sourcePath` /
//     `rawPath` / `file` / `path` keys defensively.

export const PACKAGING_WORKSPACE_LOCK_ASSETS_PROJECTION_VERSION = '1.0.0';

const CANONICAL_LOCKED_FIELDS = Object.freeze([
  'brand',
  'logo',
  'productIdentity',
  'category',
  'structure',
  'mandatoryCopy',
  'confirmedComponents',
]);

const STRIPPED_KEYS = Object.freeze([
  'sourcePath', 'rawPath', 'file', 'path', 'absolutePath',
  'tmpPath', 'tempPath', 'localPath', 'fsPath',
  'apiKey', 'authorization', 'credential', 'secret',
]);

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asString(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asArray(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.slice();
  return [value];
}

function stripPathFields(obj) {
  const out = {};
  for (const key of Object.keys(obj)) {
    if (STRIPPED_KEYS.includes(key)) continue;
    out[key] = obj[key];
  }
  return out;
}

/**
 * Project a single Locked-Asset field block to a UI-safe
 * summary.
 *
 * The 7 canonical fields map to:
 *   brand                → { name, locked: true }
 *   logo                 → { present, usageMode, locked: true }
 *   productIdentity      → { name, locked: true }
 *   category             → { name, locked: true }
 *   structure            → { formFactor, locked: true }
 *   mandatoryCopy        → { items, locked: true }
 *   confirmedComponents  → { items, locked: true }
 */
function projectLockedField(name, value) {
  const raw = asObject(value);
  switch (name) {
    case 'brand':
      return Object.freeze({ name: asString(raw.name), locked: true });
    case 'logo':
      return Object.freeze({
        present: Boolean(raw.present),
        usageMode: ['reserved', 'rendered'].includes(raw.usageMode) ? raw.usageMode : 'reserved',
        locked: true,
      });
    case 'productIdentity':
      return Object.freeze({ name: asString(raw.name), locked: true });
    case 'category':
      return Object.freeze({ name: asString(raw.name), locked: true });
    case 'structure':
      return Object.freeze({ formFactor: asString(raw.formFactor), locked: true });
    case 'mandatoryCopy':
      return Object.freeze({ items: Object.freeze(asArray(raw.items)), locked: true });
    case 'confirmedComponents':
      return Object.freeze({ items: Object.freeze(asArray(raw.items)), locked: true });
    default:
      return Object.freeze({ ...stripPathFields(raw), locked: true });
  }
}

/**
 * Project the upstream Locked-Assets block into a UI-safe
 * canonical shape.
 *
 * Each canonical field is locked (P3-A spec §18). The function
 * does NOT throw on missing fields; missing fields are
 * rendered as empty canonical values.
 */
export function projectLockedAssetsForView(lockedAssets) {
  const raw = asObject(lockedAssets);
  const projected = {};
  for (const field of CANONICAL_LOCKED_FIELDS) {
    projected[field] = projectLockedField(field, raw[field]);
  }
  return Object.freeze({
    schemaVersion: PACKAGING_WORKSPACE_LOCK_ASSETS_PROJECTION_VERSION,
    fields: Object.freeze(projected),
    allLocked: true,
  });
}

/**
 * Compute a stable fingerprint of the Locked-Assets block for
 * cross-process / cross-session change detection (P3-A spec
 * §30). The fingerprint uses structural equality + a stable
 * JSON serialization (no second hash algorithm).
 */
export function computeLockedAssetsFingerprint(lockedAssets) {
  const projection = projectLockedAssetsForView(lockedAssets);
  return stableStringify(projection);
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

/**
 * Snapshot helper for tests.
 */
export function getPackagingWorkspaceLockedAssetsProjectionFingerprint() {
  return Object.freeze({
    schemaVersion: PACKAGING_WORKSPACE_LOCK_ASSETS_PROJECTION_VERSION,
    canonicalFields: CANONICAL_LOCKED_FIELDS.slice(),
    strippedKeys: STRIPPED_KEYS.slice(),
  });
}

/**
 * Public surface accessor (P3-A6 hardening of the
 * canonical-keys allowlist pattern, mirroring P3-A4's
 * view-model keys accessors).
 *
 * Returns the top-level keys of the locked-assets
 * projection that the future P3-B UI may consume.
 * Future fields cannot accidentally leak into the UI
 * surface unless they are added to this allowlist.
 */
export function getPackagingLockedAssetsProjectionKeys() {
  return Object.freeze(['schemaVersion', 'fields', 'allLocked']);
}

/**
 * Public surface accessor: the redaction key list
 * (absolute paths, credentials, raw locator keys) that
 * `projectLockedAssetsForView` defensively strips from
 * non-canonical fields. The 7 canonical fields are
 * always projected under explicit shape rules; this
 * list is the *defense in depth* strip list.
 */
export function getPackagingLockedAssetsRedactedKeys() {
  return STRIPPED_KEYS.slice();
}
