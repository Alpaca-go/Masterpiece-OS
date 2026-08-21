/**
 * CI-W1C.7.5-R1 — Structured Extraction Coverage diagnostic.
 *
 * Per spec PART C §12: a deterministic diagnostic that decides
 * whether the structured (regex-based) `extractClaimsFromChunk`
 * path alone is sufficient for a planning brief, or whether
 * the narrative (model-assisted) path is required.
 *
 * Project-agnostic (spec PART C §11). No hardcoded
 * project-specific thresholds. The diagnostic is a
 * project-independent quality check on the structured output
 * that the regex extractor produced.
 *
 * Trigger rule (heuristic, see spec PART C §11 + §12):
 *
 *   structured is insufficient when ANY of:
 *     - claimCount = 0 (no claims extracted at all)
 *     - claimCount < 5 AND characterCount > 4000
 *       (long doc + trivial claims is a sign of low coverage)
 *     - semanticTypeCount < 3
 *       (claims exist but cluster in too few key types)
 *     - sourceChunkCoverage < 0.20
 *       (only a small fraction of the document chunks yielded
 *       a claim; large portions unused)
 *
 *   structured is sufficient otherwise.
 *
 * The threshold values (5, 4000, 3, 0.20) are NOT
 * project-specific. They are derived from the planning brief
 * corpus being multi-paragraph narrative: a 4000-char document
 * typically contains 5+ planning anchors in the spec's
 * 16 PLANNING_CLAIM_KEYS. If a real document does not contain
 * 5 anchors (e.g., a very short brief), the structured path's
 * 2-3 claims are still semantically meaningful — the
 * threshold is a quality floor, not a target.
 *
 * For documents < 4000 chars, the structured path is allowed
 * to return 1-4 claims and the diagnostic may still report
 * "sufficient". This avoids false-positive triggers for
 * short structured briefs (e.g., a 1-paragraph project brief
 * with 2-3 explicit key: value claims).
 */

import type { PlanningStrategicClaim } from './planning-strategic-evidence.ts';

export interface StructuredExtractionCoverage {
  /** True iff the structured path alone is sufficient. */
  sufficient: boolean;
  /** Total claims produced by the structured path. */
  claimCount: number;
  /** Distinct PLANNING_CLAIM_KEYS covered. */
  semanticTypeCount: number;
  /** Distinct chunkIds referenced by the structured claims. */
  coveredChunkCount: number;
  /** Total chunks in the planning brief (post `prepareDocumentSet`). */
  totalChunkCount: number;
  /** `coveredChunkCount / totalChunkCount`, in [0, 1]. */
  sourceChunkCoverage: number;
  /** Character count of the planning brief's raw text. */
  characterCount: number;
  /** Why the diagnostic returned its verdict. */
  reason:
    | 'no_claims'
    | 'few_claims_for_long_doc'
    | 'low_semantic_diversity'
    | 'low_source_chunk_coverage'
    | 'sufficient';
}

/**
 * Compute the structured-extraction coverage diagnostic.
 *
 * @param claims     The claims produced by the structured path
 *                   (`extractClaimsFromChunk` over each chunk).
 * @param chunks     The chunks of the planning brief
 *                   (`prepareDocumentSet` output).
 * @param rawText    The full raw text of the planning brief
 *                   (post `parseStrategyDocument`).
 */
export function computeStructuredExtractionCoverage(args: {
  claims: readonly PlanningStrategicClaim[];
  chunks: readonly { chunkId: string }[];
  rawText: string;
}): StructuredExtractionCoverage {
  const { claims, chunks, rawText } = args;
  const claimCount = claims.length;
  const semanticTypes = new Set<string>();
  const coveredChunks = new Set<string>();
  for (const c of claims) {
    semanticTypes.add(c.key);
    for (const ref of c.chunkRefs ?? []) coveredChunks.add(ref);
  }
  const semanticTypeCount = semanticTypes.size;
  const totalChunkCount = chunks.length;
  const coveredChunkCount = Math.min(coveredChunks.size, totalChunkCount);
  const sourceChunkCoverage = totalChunkCount > 0 ? coveredChunkCount / totalChunkCount : 0;
  const characterCount = rawText.length;

  let sufficient = true;
  let reason: StructuredExtractionCoverage['reason'] = 'sufficient';

  if (claimCount === 0) {
    sufficient = false;
    reason = 'no_claims';
  } else if (claimCount < 5 && characterCount > 4000) {
    sufficient = false;
    reason = 'few_claims_for_long_doc';
  } else if (semanticTypeCount < 3) {
    sufficient = false;
    reason = 'low_semantic_diversity';
  } else if (sourceChunkCoverage < 0.20) {
    sufficient = false;
    reason = 'low_source_chunk_coverage';
  }

  return {
    sufficient,
    claimCount,
    semanticTypeCount,
    coveredChunkCount,
    totalChunkCount,
    sourceChunkCoverage,
    characterCount,
    reason
  };
}
