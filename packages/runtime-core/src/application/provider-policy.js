// A3-A Provider Policy Authority
//
// Per A3 spec Section 5 / 6 / 7, the Visual Analysis Provider Policy
// is the single source of truth for the default / alternative
// provider, the fallback classification, and the manual-override
// precedence. It lives in Runtime / Settings authority (not in
// React UI), and is consumed by both the Node Runtime Host and
// the CLI.
//
// Frozen by A3-Phase-2 (Visual Analysis Phase A2 was
// VISUAL_ANALYSIS_A2_PASS at commit 295f83f). Any change to
// this file is a new A3.x phase.
//
// Per A3 spec Section 2 / 41: A3 does not remove Qwen; A3 does
// not remove Volcengine. The policy preserves both as registered
// providers.
//
// Module format: this is plain JavaScript (with JSDoc type
// annotations) so that both the Web Runtime Host (tsx loader)
// and the headless CLI (raw Node) can import it without a build
// step. JSDoc is the single source of typings; the `*.ts` type
// surface is reconstructed by readers from the JSDoc.

/**
 * @typedef {'volcengine' | 'qwen' | string} ProviderId
 * @typedef {string} ModelId
 *
 * @typedef {Object} ProviderPolicy
 * @property {'1.0.0'} version
 * @property {{ readonly provider: ProviderId, readonly model: ModelId }} default
 * @property {ReadonlyArray<{ readonly provider: ProviderId, readonly model: ModelId }>} alternative
 * @property {{
 *   readonly eligibleCategories: ReadonlyArray<string>,
 *   readonly excludedCategories: ReadonlyArray<string>,
 *   readonly maxAttempts: number,
 * }} fallback
 * @property {{
 *   readonly precedence: ReadonlyArray<'explicit-run' | 'user-profile' | 'system-default'>,
 *   readonly unknownProvider: 'error',
 * }} manualOverride
 */

// A3-A initial policy (per A3 spec Section 6)
// Default = Volcengine / doubao-seed-2.1-turbo (canonical id)
// Actual API alias: doubao-seed-2-1-turbo-260628 (per A2 spec Section 107)
// Alternative = Qwen / qwen3.6-plus (preserved per A2-H Section 11)
const POLICY = Object.freeze({
  version: '1.0.0',
  default: Object.freeze({ provider: 'volcengine', model: 'doubao-seed-2.1-turbo' }),
  alternative: Object.freeze([
    Object.freeze({ provider: 'qwen', model: 'qwen3.6-plus' }),
  ]),
  fallback: Object.freeze({
    eligibleCategories: Object.freeze([
      'TEMPORARY_PROVIDER_UNAVAILABLE',
      'RATE_LIMIT',
      'TRANSPORT_FAILURE',
      'TIMEOUT',
    ]),
    excludedCategories: Object.freeze([
      'AUTH_ERROR',
      'MODEL_NOT_FOUND',
      'REQUEST_INVALID',
      'RESPONSE_INVALID',
      'CONTRACT_VALIDATION_FAILED',
      'USER_CANCELLED',
    ]),
    maxAttempts: 2,  // original + at most 1 fallback
  }),
  manualOverride: Object.freeze({
    precedence: Object.freeze(['explicit-run', 'user-profile', 'system-default']),
    unknownProvider: 'error',  // never silently map to Qwen or Volcengine
  }),
});

/**
 * Returns the current Provider Policy. This is the single source
 * of truth for the Visual Analysis default / alternative /
 * fallback / manual-override semantics. Consumers MUST go through
 * this function rather than hardcoding defaults.
 *
 * @returns {ProviderPolicy}
 */
export function getCurrentProviderPolicy() {
  return POLICY;
}

// A3-B: Fallback classification
//
// Maps the existing reasoner error codes to the A3-B eligible /
// excluded categories. This is an honest mapping: it does not
// invent new reasoner error codes; it classifies what already
// exists. The reasoner layer is responsible for setting the
// `code` field on the thrown error (existing behavior, per A2-H
// contract).
//
// Mapping table:
//   A3 eligible category            | existing reasoner error code
//   ---------------------------------+---------------------------------
//   TEMPORARY_PROVIDER_UNAVAILABLE   | MODEL_UNAVAILABLE (network) --
//                                     note: A3 also allows this
//                                     category to be raised by the
//                                     registry wrapper for 5xx
//                                     upstream errors
//   RATE_LIMIT                       | RATE_LIMITED
//   TRANSPORT_FAILURE                | REQUEST_FAILED with network
//                                     indicators (status >= 500 or
//                                     ECONNREFUSED / ETIMEDOUT / etc.)
//   TIMEOUT                          | TIMEOUT
//
//   A3 excluded category             | existing reasoner error code
//   ---------------------------------+---------------------------------
//   AUTH_ERROR                       | AUTHENTICATION_FAILED
//   MODEL_NOT_FOUND                  | MODEL_UNAVAILABLE (when
//                                     message indicates 404 model
//                                     not found)
//   REQUEST_INVALID                  | REQUEST_FAILED (when no
//                                     network indicator; payload
//                                     is the suspect)
//   RESPONSE_INVALID                 | MALFORMED_RESPONSE
//   CONTRACT_VALIDATION_FAILED       | MALFORMED_RESPONSE (assertion
//                                     failure path)
//   USER_CANCELLED                   | (no existing code; AbortError
//                                     propagates as REQUEST_FAILED
//                                     with user-cancel semantics)

const FALLBACK_ELIGIBLE_ERROR_CODES = new Set([
  'TIMEOUT',
  'RATE_LIMITED',
  'MODEL_UNAVAILABLE',  // A3 TEMPORARY_PROVIDER_UNAVAILABLE equivalent
]);

const FALLBACK_ELIGIBLE_HTTP_STATUS = new Set([
  500, 502, 503, 504,  // TRANSPORT_FAILURE
  429,                   // RATE_LIMIT
]);

const NETWORK_ERROR_INDICATORS = Object.freeze([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'fetch failed',
  'socket hang up',
  'network',
]);

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function isFallbackEligible(error) {
  if (!error) return false;

  // Direct code match
  const code = String(error?.code || '').toUpperCase();
  if (FALLBACK_ELIGIBLE_ERROR_CODES.has(code)) return true;

  // HTTP status-based match (some upstreams carry status in the
  // error or in the cause chain)
  const status = error?.status
    ?? error?.cause?.status;
  if (typeof status === 'number' && FALLBACK_ELIGIBLE_HTTP_STATUS.has(status)) return true;

  // Network error indicator match
  const message = String(error?.message || '').toLowerCase();
  if (NETWORK_ERROR_INDICATORS.some((needle) => message.includes(needle.toLowerCase()))) return true;

  return false;
}

/**
 * Classifies an error into one of the A3-B eligible categories.
 * Returns 'UNKNOWN' if the error does not match any eligible
 * category (in which case `isFallbackEligible` returns false).
 *
 * @param {unknown} error
 * @returns {string}
 */
export function classifyFallbackReason(error) {
  if (!error) return 'UNKNOWN';
  const code = String(error?.code || '').toUpperCase();
  if (code === 'TIMEOUT') return 'TIMEOUT';
  if (code === 'RATE_LIMITED') return 'RATE_LIMIT';
  if (code === 'MODEL_UNAVAILABLE') return 'TEMPORARY_PROVIDER_UNAVAILABLE';

  const status = error?.status
    ?? error?.cause?.status;
  if (typeof status === 'number') {
    if (status === 429) return 'RATE_LIMIT';
    if (status >= 500) return 'TRANSPORT_FAILURE';
  }

  const message = String(error?.message || '').toLowerCase();
  if (NETWORK_ERROR_INDICATORS.some((needle) => message.includes(needle.toLowerCase()))) {
    return 'TRANSPORT_FAILURE';
  }

  return 'UNKNOWN';
}
