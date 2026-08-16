/**
 * Truth normalization utilities.
 *
 * Spec #25: unknown is a legitimate output.
 * Spec #26: reuse existing sourceFingerprint semantics for staleness.
 * Spec #19: deterministic dedup helpers.
 *
 * Pure functions only. No IO, no mutation, no models.
 */

export function isMeaningful(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }
  return true;
}

export function isEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length === 0;
}

export function isUnknown(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim().length === 0) return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

export function stableKey(...parts: string[]): string {
  return parts
    .map((p) => p.replace(/[^a-zA-Z0-9_:.-]/g, '_'))
    .filter((p) => p.length > 0)
    .join(':');
}

/**
 * Stable fact id: `<sourceType>:<sourceId>:<key>`.
 * All three components are required for traceability.
 */
export function factId(sourceType: string, sourceId: string, key: string): string {
  return stableKey(sourceType, sourceId, key);
}

/**
 * Stable evidence id per spec #18 conventions:
 *   doc:<documentId>:section:<sectionId>
 *   asset:<assetId>
 *   locked:<lockedAssetId>
 *   user:<sourceId>
 *   model:<runId>:<fieldPath>
 */
export function evidenceId(
  type: 'doc' | 'asset' | 'locked' | 'user' | 'model' | 'project' | 'system' | 'reference',
  ...parts: string[]
): string {
  return stableKey(type, ...parts);
}

/**
 * Staleness check — reuses carrier-provided sourceFingerprint.
 * If a fact carries a sourceFingerprint and a downstream carrier says
 * the fingerprint has changed, mark the fact stale.
 */
export function isStale(
  factSourceFingerprint: string | undefined,
  currentFingerprints: Record<string, string>,
  carrierType: string,
): boolean {
  if (!factSourceFingerprint) return false;
  const current = currentFingerprints[carrierType];
  if (!current) return false;
  return current !== factSourceFingerprint;
}
