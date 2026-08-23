import type {
  StrategicGroundTruthAnchor,
  StrategicSynthesisArtifact,
} from './contracts.ts';
import type { PlanningStrategicClaim } from './planning-strategic-evidence.ts';

export type GroundTruthAnchorGateCode =
  | 'ANCHOR_MAP_INVALID'
  | 'ANCHOR_RETENTION_CRITICAL_MISSING';

export interface GroundTruthAnchorRetentionReport {
  passed: boolean;
  blockedCodes: GroundTruthAnchorGateCode[];
  retainedAnchorIds: string[];
  missingCriticalAnchorIds: string[];
  missingImportantAnchorIds: string[];
  critical: { retained: number; total: number; ratio: number };
  important: { retained: number; total: number; ratio: number; target: number; targetMet: boolean };
  traceability: Array<{
    anchorId: string;
    sourceReference: string;
    planningClaimRefs: string[];
    retainedPlanningClaimRefs: string[];
  }>;
}

export function validateGroundTruthAnchorBindings(input: {
  groundTruthAnchors?: StrategicGroundTruthAnchor[];
  planningClaims?: PlanningStrategicClaim[];
}): { valid: boolean; errors: string[] } {
  const anchors = input.groundTruthAnchors ?? [];
  const claimIds = new Set((input.planningClaims ?? []).map((claim) => claim.claimId));
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const anchor of anchors) {
    if (!anchor.anchorId || seen.has(anchor.anchorId)) errors.push(`invalid or duplicate anchorId: ${anchor.anchorId || '(empty)'}`);
    seen.add(anchor.anchorId);
    if (!anchor.semanticMeaning) errors.push(`${anchor.anchorId}: semanticMeaning is required`);
    if (!anchor.sourceReference) errors.push(`${anchor.anchorId}: sourceReference is required`);
    if (anchor.importance !== 'CRITICAL' && anchor.importance !== 'IMPORTANT') errors.push(`${anchor.anchorId}: invalid importance`);
    if (anchor.planningClaimRefs.length === 0) errors.push(`${anchor.anchorId}: planningClaimRefs is empty`);
    for (const ref of anchor.planningClaimRefs) {
      if (!claimIds.has(ref)) errors.push(`${anchor.anchorId}: unresolved Planning claim ${ref}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Deterministic qualification-only retention gate. It does not inspect text
 * semantically: an anchor is retained only when Strategic cites at least one
 * runtime Planning claim explicitly mapped by the human-reviewed anchor.
 */
export function evaluateGroundTruthAnchorRetention(input: {
  artifact: StrategicSynthesisArtifact;
  groundTruthAnchors?: StrategicGroundTruthAnchor[];
  planningClaims?: PlanningStrategicClaim[];
}): GroundTruthAnchorRetentionReport {
  const anchors = input.groundTruthAnchors ?? [];
  const bindingValidation = validateGroundTruthAnchorBindings(input);
  const strategicClaimIds = new Set([
    ...input.artifact.projectUnderstanding.planningClaimRefs,
    ...input.artifact.tensions.flatMap((item) => item.planningClaimRefs),
    ...input.artifact.insights.flatMap((item) => item.planningClaimRefs),
    ...input.artifact.opportunities.flatMap((item) => item.planningClaimRefs),
  ]);

  const traceability = anchors.map((anchor) => ({
    anchorId: anchor.anchorId,
    sourceReference: anchor.sourceReference,
    planningClaimRefs: anchor.planningClaimRefs.slice(),
    retainedPlanningClaimRefs: anchor.planningClaimRefs.filter((claimId) => strategicClaimIds.has(claimId)),
  }));
  const retainedAnchorIds = traceability
    .filter((row) => row.retainedPlanningClaimRefs.length > 0)
    .map((row) => row.anchorId);
  const retainedSet = new Set(retainedAnchorIds);
  const criticalAnchors = anchors.filter((anchor) => anchor.importance === 'CRITICAL');
  const importantAnchors = anchors.filter((anchor) => anchor.importance === 'IMPORTANT');
  const missingCriticalAnchorIds = criticalAnchors.filter((anchor) => !retainedSet.has(anchor.anchorId)).map((anchor) => anchor.anchorId);
  const missingImportantAnchorIds = importantAnchors.filter((anchor) => !retainedSet.has(anchor.anchorId)).map((anchor) => anchor.anchorId);
  const ratio = (retained: number, total: number): number => total === 0 ? 1 : retained / total;
  const criticalRetained = criticalAnchors.length - missingCriticalAnchorIds.length;
  const importantRetained = importantAnchors.length - missingImportantAnchorIds.length;
  const blockedCodes: GroundTruthAnchorGateCode[] = [];
  if (!bindingValidation.valid) blockedCodes.push('ANCHOR_MAP_INVALID');
  if (missingCriticalAnchorIds.length > 0) blockedCodes.push('ANCHOR_RETENTION_CRITICAL_MISSING');

  return {
    passed: blockedCodes.length === 0,
    blockedCodes,
    retainedAnchorIds,
    missingCriticalAnchorIds,
    missingImportantAnchorIds,
    critical: { retained: criticalRetained, total: criticalAnchors.length, ratio: ratio(criticalRetained, criticalAnchors.length) },
    important: {
      retained: importantRetained,
      total: importantAnchors.length,
      ratio: ratio(importantRetained, importantAnchors.length),
      target: 0.8,
      targetMet: ratio(importantRetained, importantAnchors.length) >= 0.8,
    },
    traceability,
  };
}
