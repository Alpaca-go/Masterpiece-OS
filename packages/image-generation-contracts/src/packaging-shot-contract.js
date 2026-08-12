// @masterpiece/image-generation-contracts
// Packaging Shot Contract — V1 frozen set (per Packaging V1 P1 spec).
//
// V1 ships exactly 3 shot contracts; the spec explicitly caps the
// set ("P1 不扩第四种 shot") and lists out-of-V1 candidates as
// awareness only. This module is the canonical source of truth
// for the V1 set; production code reads through the
// `@masterpiece/image-generation-contracts` exports.
//
// Frozen at Packaging P1 (commit d1190a0 on
// codex/visual-analysis-a1-multi-provider).
// Schema versions are recorded in this file's source so that any
// future additive change increments the version constant and is
// treated as a new P1.x event (per the V1 freeze rule).
//
// This module is **evaluator-agnostic**: it does not encode the
// Jiuzhou Golden's framing / forbidden motifs / color baseline.
// The Golden is a separate concern; see
// `tests/fixtures/packaging/jiuzhou/` and
// `docs/packaging/golden-vs-production-boundary.md`.

export type PackagingShotContract =
  | 'PKG-HERO-SINGLE'
  | 'PKG-SERIES-GROUP'
  | 'PKG-GIFT-OPEN';

export const PACKAGING_SHOT_CONTRACT_VERSION = '1.0.0' as const;

export const PACKAGING_SHOT_CONTRACTS: ReadonlyArray<PackagingShotContract> =
  Object.freeze(['PKG-HERO-SINGLE', 'PKG-SERIES-GROUP', 'PKG-GIFT-OPEN']);

export const PACKAGING_SHOT_CONTRACT_LABELS: Readonly<Record<PackagingShotContract, string>> =
  Object.freeze({
    'PKG-HERO-SINGLE':  'Hero Render (Single SKU)',
    'PKG-SERIES-GROUP': 'Series Group Render (multi-SKU uniform display)',
    'PKG-GIFT-OPEN':    'Gift Box Open State (interior structure)',
  });

export function isPackagingShotContract(value: unknown): value is PackagingShotContract {
  return typeof value === 'string'
    && (PACKAGING_SHOT_CONTRACTS as ReadonlyArray<string>).includes(value);
}

// Failure codes are also frozen at P1 (see acceptance-rubric.md
// §3 and failure-taxonomy.md). They are listed here so that the
// canonical contract surface is in one place.
export type PackagingFailureCode =
  | 'PKG-F01' | 'PKG-F02' | 'PKG-F03' | 'PKG-F04'
  | 'PKG-F05' | 'PKG-F06' | 'PKG-F07' | 'PKG-F08'
  | 'PKG-F09' | 'PKG-F10' | 'PKG-F11' | 'PKG-F12';

export const PACKAGING_FAILURE_CODES_VERSION = '1.0.0' as const;

export const PACKAGING_FAILURE_CODES: ReadonlyArray<PackagingFailureCode> =
  Object.freeze([
    'PKG-F01', 'PKG-F02', 'PKG-F03', 'PKG-F04', 'PKG-F05', 'PKG-F06',
    'PKG-F07', 'PKG-F08', 'PKG-F09', 'PKG-F10', 'PKG-F11', 'PKG-F12',
  ]);

export const PACKAGING_AUTO_FAIL_CODES: ReadonlyArray<PackagingFailureCode> =
  Object.freeze(['PKG-F01', 'PKG-F02', 'PKG-F11']);

export function isPackagingFailureCode(value: unknown): value is PackagingFailureCode {
  return typeof value === 'string'
    && (PACKAGING_FAILURE_CODES as ReadonlyArray<string>).includes(value);
}
