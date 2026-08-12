// @masterpiece/image-generation-contracts
// Packaging Shot Contract — V1 frozen set (per Packaging V1 P1 spec).
//
// V1 ships exactly 3 shot contracts; the spec explicitly caps the
// set ("P1 不扩第四种 shot") and lists out-of-V1 candidates as
// awareness only. This module is the canonical source of truth
// for the V1 set; production code reads through the
// `@masterpiece/image-generation-contracts` exports.
//
// Frozen at Packaging P1 (commit ddde335 on
// codex/visual-analysis-a1-multi-provider). Plain JavaScript
// (with JSDoc types) so that both the Web Runtime Host via
// `tsx` and raw-Node test runners can consume the same source.
//
// This module is **evaluator-agnostic**: it does not encode the
// Jiuzhou Golden's framing / forbidden motifs / color baseline.
// The Golden is a separate concern; see
// `tests/fixtures/packaging/jiuzhou/` and
// `docs/packaging/golden-vs-production-boundary.md`.

/**
 * @typedef {'PKG-HERO-SINGLE' | 'PKG-SERIES-GROUP' | 'PKG-GIFT-OPEN'} PackagingShotContract
 */

/** @type {'1.0.0' as const} */
export const PACKAGING_SHOT_CONTRACT_VERSION = '1.0.0';

/** @type {ReadonlyArray<PackagingShotContract>} */
export const PACKAGING_SHOT_CONTRACTS = Object.freeze([
  'PKG-HERO-SINGLE',
  'PKG-SERIES-GROUP',
  'PKG-GIFT-OPEN',
]);

/** @type {Readonly<Record<PackagingShotContract, string>>} */
export const PACKAGING_SHOT_CONTRACT_LABELS = Object.freeze({
  'PKG-HERO-SINGLE':  'Hero Render (Single SKU)',
  'PKG-SERIES-GROUP': 'Series Group Render (multi-SKU uniform display)',
  'PKG-GIFT-OPEN':    'Gift Box Open State (interior structure)',
});

/**
 * @param {unknown} value
 * @returns {value is PackagingShotContract}
 */
export function isPackagingShotContract(value) {
  return typeof value === 'string'
    && PACKAGING_SHOT_CONTRACTS.includes(/** @type {PackagingShotContract} */ (value));
}

/**
 * @typedef {(
 *   | 'PKG-F01' | 'PKG-F02' | 'PKG-F03' | 'PKG-F04'
 *   | 'PKG-F05' | 'PKG-F06' | 'PKG-F07' | 'PKG-F08'
 *   | 'PKG-F09' | 'PKG-F10' | 'PKG-F11' | 'PKG-F12'
 * )} PackagingFailureCode
 */

/** @type {'1.0.0' as const} */
export const PACKAGING_FAILURE_CODES_VERSION = '1.0.0';

/** @type {ReadonlyArray<PackagingFailureCode>} */
export const PACKAGING_FAILURE_CODES = Object.freeze([
  'PKG-F01', 'PKG-F02', 'PKG-F03', 'PKG-F04', 'PKG-F05', 'PKG-F06',
  'PKG-F07', 'PKG-F08', 'PKG-F09', 'PKG-F10', 'PKG-F11', 'PKG-F12',
]);

/** @type {ReadonlyArray<PackagingFailureCode>} */
export const PACKAGING_AUTO_FAIL_CODES = Object.freeze([
  'PKG-F01', 'PKG-F02', 'PKG-F11',
]);

/**
 * @param {unknown} value
 * @returns {value is PackagingFailureCode}
 */
export function isPackagingFailureCode(value) {
  return typeof value === 'string'
    && PACKAGING_FAILURE_CODES.includes(/** @type {PackagingFailureCode} */ (value));
}
