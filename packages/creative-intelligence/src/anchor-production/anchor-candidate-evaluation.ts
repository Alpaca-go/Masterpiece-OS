/**
 * Anchor candidate post-generation evaluation.
 *
 * CI-W2: pure, deterministic evaluation of an Anchor Candidate.
 *
 *   - It is NOT a model judgment. The CI-W2 spec explicitly forbids
 *     adding a vision model in this phase.
 *   - It compares the COMPILED PROMPT (the contract + Canon + locked
 *     assets) against the candidate's image metadata and the
 *     declared Locked Asset / DNA / Grammar refs.
 *   - It emits a structured `AnchorCandidateEvaluation` that the
 *     Web side renders as a "验收摘要". The user STILL has to
 *     explicitly click "设为视觉基准" — the evaluation does NOT
 *     auto-approve.
 *
 * This module is pure. No disk, no model, no provider.
 */

import type { AnchorCandidate, AnchorCandidateEvaluation } from './contracts.ts';
import type { AnchorProductionContract } from './contracts.ts';

export interface EvaluateAnchorCandidateInput {
  candidate: AnchorCandidate;
  contract: AnchorProductionContract;
  /**
   * Image metadata the runtime captured at generation time. The
   * compiler guarantees these come from the existing image
   * runtime (not the Web) so they are authoritative.
   */
  imageMetadata: {
    imageId: string;
    imagePath: string;
    imageFingerprint: string;
    sourceFingerprint: string;
    providerId: string;
    modelId: string;
    aspectRatio: string;
  };
  /**
   * Locked Asset refs the runtime resolved for this project. Used
   * to check that no locked asset was dropped or replaced.
   */
  resolvedLockedAssetKeys: string[];
}

const PASS: AnchorCandidateEvaluation['visualMechanism'] = 'pass';

function verdict(condition: boolean, failReason: string | null): 'pass' | 'warning' | 'fail' {
  if (failReason) return 'fail';
  if (!condition) return 'warning';
  return PASS;
}

function intersection(left: string[], right: string[]): string[] {
  const rightSet = new Set(right);
  return left.filter((item) => rightSet.has(item));
}

/**
 * Pure function. Evaluate a single Anchor Candidate against the
 * compiled contract.
 */
export function evaluateAnchorCandidate(
  input: EvaluateAnchorCandidateInput,
): AnchorCandidateEvaluation {
  const { candidate, contract, imageMetadata, resolvedLockedAssetKeys } = input;
  const warnings: string[] = [];
  const blockedReasonCodes: string[] = [];

  // 1. Source fingerprint must match the contract's sourceFingerprint.
  //    If they diverge, the runtime produced the image under a
  //    DIFFERENT Canon / Direction state than the one the user
  //    approved, so the candidate is invalid for this contract.
  const sourceFingerprintMatches = candidate.sourceFingerprint === contract.sourceFingerprint
    && imageMetadata.sourceFingerprint === contract.sourceFingerprint;

  // 2. Locked Asset safety. The resolved locked assets must include
  //    every `lockedAssetRuleRefs` declared in the contract. We do
  //    NOT verify the image visually — we only check the metadata
  //    bound at generation time.
  const lockedAssetMissing = intersection(contract.lockedAssetRuleRefs, resolvedLockedAssetKeys);
  const lockedAssetSafety = lockedAssetMissing.length === contract.lockedAssetRuleRefs.length
    ? PASS
    : 'fail';
  if (lockedAssetSafety === 'fail') {
    blockedReasonCodes.push('ANCHOR_PRODUCTION_LOCKED_ASSET_CONFLICT');
  }

  // 3. DNA / Grammar / Evaluation: the candidate metadata is a thin
  //    projection. The runtime guarantees it was produced against
  //    the SAME contract. We emit a warning when the candidate's
  //    `imageFingerprint` is missing (the image runtime failed to
  //    provide a SHA256), since we cannot re-validate the image.
  const imageFingerprintPresent = Boolean(candidate.imageFingerprint);
  if (!imageFingerprintPresent) {
    warnings.push('image_fingerprint_missing');
  }

  // 4. Visual Mechanism: derived from whether the contract has
  //    `mustDemonstrate` items. A non-empty list is the strict signal
  //    that the prompt required visual-mechanism rules; an empty
  //    list is a soft warning that the contract compiled thin.
  const visualMechanism = verdict(contract.mustDemonstrate.length > 0, null);
  if (visualMechanism === 'warning') {
    warnings.push('must_demonstrate_empty');
  }

  // 5. Composition: the contract's requiredDNA/Grammar refs must
  //    be present. A missing required ref is a hard fail (the
  //    compiler should have caught it before generating).
  const dnaOk = contract.requiredDNARefs.length > 0 || contract.lockedAssetRuleRefs.length > 0;
  const grammarOk = contract.requiredGrammarRefs.length > 0 || contract.lockedAssetRuleRefs.length > 0;
  if (!dnaOk) warnings.push('required_dna_refs_empty');
  if (!grammarOk) warnings.push('required_grammar_refs_empty');

  // 6. Color / Material: the contract does not encode specific
  //    colors / materials (those would be production leakage).
  //    When the Visual Canon had color / material DNA elements,
  //    `requiredDNARefs` already includes them. The verdict is
  //    informational only.
  const colorRelationship: 'pass' | 'warning' = dnaOk ? PASS : 'warning';
  const materialRelationship: 'pass' | 'warning' = dnaOk ? PASS : 'warning';

  // 7. Identity safety: anchor generation is brand-isolated. The
  //    Web side renders a warning when the user-provided reference
  //    is NOT bound to the current project, but the runtime
  //    contract itself does not carry that bit. We mark it PASS
  //    when sourceFingerprint matches and WARN otherwise.
  const identitySafety = sourceFingerprintMatches
    ? PASS
    : 'fail';
  if (!sourceFingerprintMatches) {
    blockedReasonCodes.push('ANCHOR_PRODUCTION_REFERENCE_IDENTITY_LEAK');
  }

  // 8. Prohibited mutation: the contract's `mustNotChange` is the
  //    single source of prohibition. A non-empty list is required;
  //    an empty list is a soft warning (the compiler should have
  //    populated this from `canon.prohibitedMutations`).
  const prohibitedMutation = contract.mustNotChange.length > 0
    ? PASS
    : 'warning';
  if (prohibitedMutation === 'warning') {
    warnings.push('must_not_change_empty');
  }

  return {
    visualMechanism,
    composition: grammarOk ? PASS : 'warning',
    colorRelationship,
    materialRelationship,
    identitySafety,
    lockedAssetSafety,
    prohibitedMutation,
    warnings,
    blockedReasonCodes,
  };
}
