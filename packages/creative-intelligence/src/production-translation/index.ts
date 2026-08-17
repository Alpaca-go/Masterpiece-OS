/**
 * Production Translation Bridge — CI-9.
 *
 * Translate the user-selected Visual Canon into media-specific execution
 * contracts for the existing Space and Packaging production chains.
 *
 * CI-9 is a TRANSLATION layer:
 *   - Reads VisualCanon + AnchorContract + SelectedDirectionSnapshot
 *   - Produces SpaceTranslationContract + PackagingTranslationContract
 *   - Validates cross-media consistency
 *   - Detects reference/canon conflict
 *   - Surfaces drift (new mechanism, new family, hard DNA loss, etc.)
 *   - Compares against current production input
 *   - Shadow-only. Does NOT switch production consumers.
 *
 * Hard rules:
 *   - No model call. No provider change. No prompt generation.
 *   - No consumer switch. Shadow / comparison mode only.
 *   - Canon is read-only. Translation is downstream-only.
 */

export * from './contracts.ts';
export {
  buildProductionTranslationContext,
  buildSharedHardDNA,
  buildSharedHardGrammar,
} from './production-translation-context.ts';
export {
  detectProductionPromptLeakage,
  detectForbiddenField,
  buildTranslationTrace,
  buildTranslationVersion,
  buildTranslationFingerprint,
  validateMediaContract,
  detectReferenceCanonConflict,
} from './translation-boundary.ts';
export { buildSpaceTranslation } from './space-canon-translation.ts';
export { buildPackagingTranslation } from './packaging-canon-translation.ts';
export {
  validateCrossMediaConsistency,
  buildSharedHardDNA as buildSharedHardDNAFromCanon,
  buildSharedHardGrammar as buildSharedHardGrammarFromCanon,
} from './cross-media-consistency.ts';
export { detectTranslationDrift, detectUngroundedMediaRules } from './translation-drift.ts';
export { buildTranslationComparison } from './translation-comparison.ts';
export { diffTranslation, translationVersion } from './translation-diff.ts';
export { PRODUCTION_TRANSLATION_DIAGNOSTIC_CODES } from './diagnostics.ts';

export type {
  BuildSpaceTranslationInput,
  BuildSpaceTranslationResult,
} from './space-canon-translation.ts';
export type {
  BuildPackagingTranslationInput,
  BuildPackagingTranslationResult,
} from './packaging-canon-translation.ts';
export type {
  BuildComparisonInput,
  CurrentInputSnapshot,
} from './translation-comparison.ts';
