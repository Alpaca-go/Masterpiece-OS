// A3-F Provider Health
//
// Per A3 spec Section 20 / 21, a lightweight per-provider health
// state is exposed to consumers. Health checks MUST be manual /
// opt-in, or low-frequency runtime checks. A3-F does NOT build a
// monitoring platform; it exposes the cached state from the last
// manual / low-frequency probe.
//
// Health states (per A3-observability-report.md §3.1):
//   'configured'   — provider is registered; user has saved credentials
//   'available'    — configured AND a recent health probe returned success
//   'degraded'     — configured AND recent probe returned 4xx / 5xx in the last 24h
//   'unavailable'  — not configured OR recent probe returned a hard error
//   'unknown'      — no probe has been recorded yet (initial state)
//
// This module is in-memory only. The cached state is process-local
// and not persisted. Consumers that need cross-process state can
// layer a persistent store on top of `setProviderHealth`.
//
// Per A3 spec §21: the actual probe lives in a separate
// `scripts/probe-analysis-provider-health.mjs` (manual / opt-in, runs in
// `.codex-smoke/`). This module is consumed by the Web and CLI to
// read the cached state.

import { getCurrentProviderPolicy } from '@masterpiece/runtime-core/application/provider-policy.js';

const VALID_STATES = Object.freeze([
  'configured',
  'available',
  'degraded',
  'unavailable',
  'unknown',
]);

// Process-local cache: Map<providerId, { state, lastCheckedAt, lastError }>
const CACHE = new Map();

/**
 * @param {string} providerId
 * @returns {boolean}
 */
function isRegisteredProvider(providerId) {
  const policy = getCurrentProviderPolicy();
  if (policy.default.provider === providerId) return true;
  return policy.alternative.some((entry) => entry.provider === providerId);
}

/**
 * @param {string} providerId
 * @returns {{
 *   provider: string,
 *   state: 'configured' | 'available' | 'degraded' | 'unavailable' | 'unknown',
 *   registered: boolean,
 *   lastCheckedAt: string | null,
 *   lastError: string | null,
 * }}
 */
export function getProviderHealth(providerId) {
  const id = String(providerId || '').trim();
  if (!id) {
    throw new TypeError('providerId is required');
  }
  const cached = CACHE.get(id);
  if (!cached) {
    return Object.freeze({
      provider: id,
      state: isRegisteredProvider(id) ? 'unknown' : 'unavailable',
      registered: isRegisteredProvider(id),
      lastCheckedAt: null,
      lastError: null,
    });
  }
  return Object.freeze({ provider: id, registered: isRegisteredProvider(id), ...cached });
}

/**
 * @param {string} providerId
 * @param {'configured' | 'available' | 'degraded' | 'unavailable'} state
 * @param {{ error?: string, checkedAt?: string }} [options]
 * @returns {void}
 */
export function setProviderHealth(providerId, state, options = {}) {
  const id = String(providerId || '').trim();
  if (!id) throw new TypeError('providerId is required');
  if (!VALID_STATES.includes(state)) {
    throw new TypeError(`Invalid health state: ${state}. Expected one of: ${VALID_STATES.join(', ')}`);
  }
  if (state === 'unknown') {
    throw new TypeError("'unknown' is the initial state; use clearProviderHealth() to reset.");
  }
  const checkedAt = String(options.checkedAt || new Date().toISOString());
  const lastError = options.error ? String(options.error) : null;
  CACHE.set(id, Object.freeze({ state, lastCheckedAt: checkedAt, lastError }));
}

/**
 * @param {string} providerId
 * @returns {void}
 */
export function clearProviderHealth(providerId) {
  const id = String(providerId || '').trim();
  if (!id) throw new TypeError('providerId is required');
  CACHE.delete(id);
}

/**
 * @returns {ReadonlyArray<{
 *   provider: string,
 *   state: string,
 *   registered: boolean,
 *   lastCheckedAt: string | null,
 *   lastError: string | null,
 * }>}
 */
export function listProviderHealth() {
  return [...CACHE.entries()].map(([id, cached]) => getProviderHealth(id));
}

export const PROVIDER_HEALTH_STATES = Object.freeze([...VALID_STATES]);
