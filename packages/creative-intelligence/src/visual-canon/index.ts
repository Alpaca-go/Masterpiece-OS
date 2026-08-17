/**
 * Visual Canon — CI-8.
 *
 * Visual Canon, Visual DNA, Visual Grammar, Cross-Media Canon,
 * LockedAssetCanonRule, Canon Diff.
 *
 * Source: SelectedDirectionSnapshot ONLY. Recommendation is advisory.
 *
 * Shadow-only. No production consumer.
 */

export * from './contracts.ts';
export {
  buildSelectedDirectionSnapshot,
  validateSnapshotEntry,
  computeDirectionFingerprint,
  buildCanonTraceFromSnapshot,
} from './selected-direction-snapshot.ts';
export { buildVisualCanon } from './build-visual-canon.ts';
export { extractVisualDNA } from './visual-dna.ts';
export { extractVisualGrammar } from './visual-grammar.ts';
export { buildCrossMediaCanon } from './cross-media-canon.ts';
export { validateCanon } from './canon-validator.ts';
export { diffCanon, canonVersion } from './canon-diff.ts';
export { CANON_DIAGNOSTIC_CODES } from './diagnostics.ts';
export type { BuildCanonInput, BuildCanonResult } from './build-visual-canon.ts';
export type { SnapshotInput, SnapshotResult } from './selected-direction-snapshot.ts';
export type { DNAInput } from './visual-dna.ts';
export type { GrammarInput } from './visual-grammar.ts';
export type { CrossMediaInput } from './cross-media-canon.ts';
export type { ValidationContext } from './canon-validator.ts';
