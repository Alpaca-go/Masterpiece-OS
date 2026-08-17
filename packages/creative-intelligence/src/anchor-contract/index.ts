/**
 * Anchor Contract — CI-8.
 *
 * Acceptance contract for an eventual Anchor.
 * NOT a prompt. NOT a production input.
 */

export * from './contracts.ts';
export { buildAnchorContract } from './build-anchor-contract.ts';
export { validateAnchor } from './anchor-validator.ts';
export {
  detectAnchorLeakage,
  containsAnchorForbiddenField,
  containsAnchorForbiddenText,
} from './anchor-boundary.ts';
export { ANCHOR_DIAGNOSTIC_CODES } from './diagnostics.ts';
export type { BuildAnchorInput, BuildAnchorResult } from './build-anchor-contract.ts';
export type { AnchorValidationContext } from './anchor-validator.ts';
