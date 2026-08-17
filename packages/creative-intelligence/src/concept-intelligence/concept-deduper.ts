/**
 * Concept dedupe and diversity validation (Spec #7, #51).
 *
 * Detect near-duplicate Concepts by:
 *   - same strategicMechanism / strategicPattern
 *   - near-identical thesis (normalized token overlap)
 *   - same opportunity combination
 *
 * Diversity means different strategic mechanism / different causal logic /
 * different creative thesis — NOT different color or mood.
 *
 * Deterministic. No embeddings. No model call.
 */

import type { ConceptCandidate, StrategicPattern } from './contracts.ts';

export interface DedupedConcept {
  concept: ConceptCandidate;
  /** Ids of concepts this was merged with. */
  mergedWith: string[];
  /** Why this concept is considered distinct. */
  distinctKey: string;
}

export interface DedupeResult {
  concepts: ConceptCandidate[];
  duplicates: { kept: string; removed: string; reason: string }[];
  diagnostics: string[];
}

/**
 * Build a normalized signature key for a concept that captures its
 * strategic identity for dedupe purposes.
 *
 * Uses: strategicPattern + sorted opportunityRefs + normalized thesis tokens.
 */
function buildDedupeKey(concept: ConceptCandidate): string {
  const oppKey = [...concept.opportunityRefs].sort().join(',');
  const patternKey = concept.strategicPattern;

  // Normalized thesis: lowercase, strip punctuation, take first 30 chars
  const thesisNorm = concept.thesis
    .toLowerCase()
    .replace(/[\s，。、；：''""【】（）()\[\],.;:!?！？\-—_/\\]/g, '')
    .slice(0, 40);

  return `${patternKey}|${oppKey}|${thesisNorm.slice(0, 20)}`;
}

/**
 * Jaccard-like simple token overlap ratio between two strings.
 * Deterministic and cheap. Good enough for detecting near-duplicate
 * concept theses in CI-5.
 */
function tokenOverlap(a: string, b: string): number {
  const tokensA = new Set(
    a.toLowerCase().replace(/[，。、；：''""【】（）()\[\],.;:!?！？\-—_/\\]/g, ' ').split(/\s+/).filter(Boolean),
  );
  const tokensB = new Set(
    b.toLowerCase().replace(/[，。、；：''""【】（）()\[\],.;:!?！？\-—_/\\]/g, ' ').split(/\s+/).filter(Boolean),
  );
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const t of tokensA) if (tokensB.has(t)) intersection++;
  return intersection / Math.min(tokensA.size, tokensB.size);
}

export function dedupeConcepts(concepts: ConceptCandidate[]): DedupeResult {
  const result: ConceptCandidate[] = [];
  const duplicates: { kept: string; removed: string; reason: string }[] = [];
  const diagnostics: string[] = [];

  const seenKeys = new Map<string, ConceptCandidate>();

  for (const concept of concepts) {
    const key = buildDedupeKey(concept);

    // Check exact dedupe key match first
    if (seenKeys.has(key)) {
      const existing = seenKeys.get(key)!;
      duplicates.push({
        kept: existing.id,
        removed: concept.id,
        reason: '完全相同的战略模式+机会点组合+主题核心',
      });
      continue;
    }

    // Check near-duplicate: same pattern, same opportunity set, high thesis overlap
    let isNearDuplicate = false;
    for (const existing of seenKeys.values()) {
      const samePattern = existing.strategicPattern === concept.strategicPattern;
      const sameOpps =
        existing.opportunityRefs.length === concept.opportunityRefs.length
        && existing.opportunityRefs.every((r) => concept.opportunityRefs.includes(r));

      if (samePattern && sameOpps) {
        const overlap = tokenOverlap(existing.thesis, concept.thesis);
        if (overlap >= 0.7) {
          duplicates.push({
            kept: existing.id,
            removed: concept.id,
            reason: `战略模式+机会点相同，主题重叠度 ${(overlap * 100).toFixed(0)}%`,
          });
          isNearDuplicate = true;
          break;
        }
      }
    }

    if (!isNearDuplicate) {
      seenKeys.set(key, concept);
      result.push(concept);
    }
  }

  if (duplicates.length > 0) {
    diagnostics.push(`DEDUPE_REMOVED: 去除了 ${duplicates.length} 个重复/近似重复概念`);
  }

  return { concepts: result, duplicates, diagnostics };
}

export interface DiversityAssessment {
  totalConcepts: number;
  validConcepts: number;
  distinctPatterns: number;
  distinctOpportunityCombinations: number;
  distinctThesisKeys: number;
  /** distinctStrategicMechanisms / validConcepts */
  diversityRatio: number;
  /** True if multi-opportunity scenario has >= 2 distinct valid concepts. */
  meetsMinimumDiversity: boolean;
}

export function assessDiversity(concepts: ConceptCandidate[]): DiversityAssessment {
  const validConcepts = concepts.filter((c) => c.status === 'grounded');
  const patterns = new Set(validConcepts.map((c) => c.strategicPattern));

  const oppCombos = new Set(
    validConcepts.map((c) => [...c.opportunityRefs].sort().join('|')),
  );

  const thesisKeys = new Set(
    validConcepts.map((c) => {
      const norm = c.thesis.toLowerCase()
        .replace(/[\s，。、；：''""【】（）()\[\],.;:!?！？\-—_/\\]/g, '');
      return norm.slice(0, 16);
    }),
  );

  const totalValid = validConcepts.length;
  const diversityRatio = totalValid > 0 ? patterns.size / totalValid : 0;

  // Multi-opportunity: count distinct opportunity sets
  const meetsMinimumDiversity = oppCombos.size >= 2 && totalValid >= 2;

  return {
    totalConcepts: concepts.length,
    validConcepts: totalValid,
    distinctPatterns: patterns.size,
    distinctOpportunityCombinations: oppCombos.size,
    distinctThesisKeys: thesisKeys.size,
    diversityRatio,
    meetsMinimumDiversity,
  };
}
