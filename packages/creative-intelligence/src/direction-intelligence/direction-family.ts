/**
 * Direction Family Difference Evaluator (CI-6 Step 7, 8, 17, 18, 30).
 *
 * Hard rule: at least 2 structural dimensions differ for meaningfully distinct.
 * Color-only / material-only / mood-only differences do NOT count.
 *
 * Fake-diversity fixture: same mechanism + different colors → must FAIL.
 *
 * Structural dimensions checked:
 *   1. directionFamily
 *   2. visualMechanism
 *   3. systemHypothesis
 *   4. compositionLogic
 *   5. crossMediaBehavior
 */

import type {
  CreativeDirectionCandidate,
  DirectionPairDifference,
  DirectionFamilyDifferenceResult,
} from './contracts.ts';

/** Normalize text for comparison: lower, strip punctuation, collapse whitespace. */
function normalize(text: string | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\s，。、；：''""【】（）()\[\],.;:!?！？\-—_/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(text: string): Set<string> {
  return new Set(normalize(text).split(' ').filter(Boolean));
}

function tokenOverlap(a: string, b: string): number {
  const aTokens = tokenSet(a);
  const bTokens = tokenSet(b);
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  let intersection = 0;
  for (const t of aTokens) if (bTokens.has(t)) intersection++;
  return intersection / Math.min(aTokens.size, bTokens.size);
}

/**
 * Check whether two directions differ only on cosmetic dimensions
 * (color / material / mood / surface).
 */
function isCosmeticOnlyDifference(
  a: CreativeDirectionCandidate,
  b: CreativeDirectionCandidate,
): boolean {
  // If family is the same AND visualMechanism is highly overlapping,
  // the only meaningful difference is likely cosmetic.
  if (a.directionFamily !== b.directionFamily) return false;
  const mechanismOverlap = tokenOverlap(a.visualMechanism, b.visualMechanism);
  const hypothesisOverlap = tokenOverlap(a.systemHypothesis, b.systemHypothesis);
  if (mechanismOverlap >= 0.7 && hypothesisOverlap >= 0.7) {
    return true;
  }
  return false;
}

function computePairDifference(
  a: CreativeDirectionCandidate,
  b: CreativeDirectionCandidate,
): DirectionPairDifference {
  const differentVisualMechanism = normalize(a.visualMechanism) !== normalize(b.visualMechanism)
    && tokenOverlap(a.visualMechanism, b.visualMechanism) < 0.6;
  const differentSystemHypothesis = normalize(a.systemHypothesis) !== normalize(b.systemHypothesis)
    && tokenOverlap(a.systemHypothesis, b.systemHypothesis) < 0.6;
  const differentFamily = a.directionFamily !== b.directionFamily;
  const differentCompositionLogic = normalize(a.compositionLogic) !== normalize(b.compositionLogic)
    && (a.compositionLogic || b.compositionLogic); // at least one has a logic
  const differentCrossMediaBehavior = (() => {
    const aSet = new Set(a.crossMediaBehavior);
    const bSet = new Set(b.crossMediaBehavior);
    if (aSet.size !== bSet.size) return true;
    for (const t of aSet) if (!bSet.has(t)) return true;
    return false;
  })();

  const isFakeDiversity = isCosmeticOnlyDifference(a, b);

  const structuralDifferenceScore = [
    differentVisualMechanism,
    differentSystemHypothesis,
    differentFamily,
    differentCompositionLogic,
    differentCrossMediaBehavior,
  ].filter(Boolean).length;

  // Meaningful distinction requires:
  //   - different family
  //   - AND at least 2 structural dimensions differ
  //   - AND not cosmetic-only
  const isMeaningfullyDistinct = differentFamily
    && structuralDifferenceScore >= 2
    && !isFakeDiversity;

  return {
    directionA: a.id,
    directionB: b.id,
    differentVisualMechanism,
    differentSystemHypothesis,
    differentFamily,
    differentCompositionLogic,
    differentCrossMediaBehavior,
    structuralDifferenceScore,
    isMeaningfullyDistinct,
    isFakeDiversity,
  };
}

export function evaluateDirectionFamilyDifference(
  directions: CreativeDirectionCandidate[],
): DirectionFamilyDifferenceResult {
  const diagnostics: string[] = [];
  const pairs: DirectionPairDifference[] = [];

  for (let i = 0; i < directions.length; i++) {
    for (let j = i + 1; j < directions.length; j++) {
      pairs.push(computePairDifference(directions[i], directions[j]));
    }
  }

  // If 0 or 1 directions, trivially "all meaningfully distinct" (no conflict to check)
  if (directions.length < 2) {
    return { pairs, allMeaningfullyDistinct: true, hasFakeDiversity: false, diagnostics };
  }

  const allMeaningfullyDistinct = pairs.every((p) => p.isMeaningfullyDistinct);
  const hasFakeDiversity = pairs.some((p) => p.isFakeDiversity);

  if (hasFakeDiversity) {
    diagnostics.push(`FAKE_DIVERSITY_DETECTED: ${pairs.filter((p) => p.isFakeDiversity).length} 对方向仅为表面差异`);
  }
  if (!allMeaningfullyDistinct) {
    const underDistinguished = pairs.filter((p) => !p.isMeaningfullyDistinct);
    diagnostics.push(`UNDER_DISTINGUISHED: ${underDistinguished.length} 对方向未达到结构性差异标准`);
  }

  return { pairs, allMeaningfullyDistinct, hasFakeDiversity, diagnostics };
}
