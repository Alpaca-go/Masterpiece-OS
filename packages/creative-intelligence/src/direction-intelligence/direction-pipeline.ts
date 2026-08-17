/**
 * Top-level Direction Intelligence pipeline.
 *
 * Combines:
 *   1. Generate Directions (deterministic, Concept-led)
 *   2. Dedupe
 *   3. Family Difference evaluation
 *   4. Run all 11 gates
 *   5. Build DirectionSet
 *
 * Pure function. No IO. No model call.
 */

import type { ProjectTruthModel, ProjectTruthConflict } from '../truth/contracts.ts';
import type { EvidenceLedgerSnapshot } from '../evidence/contracts.ts';
import type { NeedItem } from '../need-intelligence/contracts.ts';
import type { InsightItem } from '../insight-intelligence/contracts.ts';
import type { OpportunityMap } from '../opportunity/contracts.ts';
import type { ConceptSet } from '../concept-intelligence/contracts.ts';
import type {
  DirectionSet,
  DirectionEvaluationResult,
  DirectionGateResult,
  DirectionFamilyDifferenceResult,
  CreativeDirectionCandidate,
} from './contracts.ts';
import { DIRECTION_TRACE_VERSION } from './contracts.ts';
import { generateDirections } from './generate-directions.ts';
import { dedupeDirections } from './direction-deduper.ts';
import { runDirectionGatesForSet } from './direction-gates.ts';
import type { FullDirectionGateSummary } from './direction-gates.ts';
import { evaluateDirectionFamilyDifference } from './direction-family.ts';
import { detectDirectionLeakage } from './direction-leakage.ts';

export interface DirectionPipelineInput {
  projectId: string;
  truth: ProjectTruthModel;
  evidence: EvidenceLedgerSnapshot;
  needs: NeedItem[];
  insights: InsightItem[];
  opportunityMap: OpportunityMap;
  /** Validated ConceptSet (post gate). */
  conceptSet: ConceptSet;
  maxDirections?: number;
  maxPerConcept?: number;
  generatedAt?: string;
  expectedBrandName?: string;
  expectedBrandRole?: string;
}

export interface DirectionPipelineResult {
  directionSet: DirectionSet;
  familyDifference: DirectionFamilyDifferenceResult;
  leakage: { field: string | null; text: string | null };
  gateSummary: FullDirectionGateSummary;
  evaluations: DirectionEvaluationResult[];
  dedupe: { removedCount: number };
  diagnostics: string[];
}

function buildEvaluation(
  direction: CreativeDirectionCandidate,
  allResults: DirectionGateResult[],
): DirectionEvaluationResult {
  const results = allResults.filter((r) => r.directionId === direction.id);
  const issues = results.flatMap((r) => r.issues);
  let status: 'pass' | 'pass_with_warnings' | 'blocked' = 'pass';
  if (results.some((r) => r.status === 'blocked')) status = 'blocked';
  else if (results.some((r) => r.status === 'pass_with_warnings')) status = 'pass_with_warnings';
  return { directionId: direction.id, status, gateResults: results, issues };
}

export function runDirectionPipeline(input: DirectionPipelineInput): DirectionPipelineResult {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const conflicts: ProjectTruthConflict[] = input.truth.conflicts ?? [];

  // Use only valid (non-blocked) concepts as input
  const validConcepts = input.conceptSet.concepts.filter((c) => c.status !== 'blocked');

  // 1. Generate
  const { directions: rawDirections, diagnostics: genDiagnostics } = generateDirections({
    projectId: input.projectId,
    concepts: validConcepts,
    opportunityMap: input.opportunityMap,
    insights: input.insights,
    needs: input.needs,
    facts: input.truth.facts,
    evidence: input.evidence.entries,
    conflicts,
    maxDirections: input.maxDirections,
    maxPerConcept: input.maxPerConcept,
    generatedAt,
  });

  // 2. Dedupe
  const { directions: dedupedDirections, duplicates, diagnostics: dedupeDiagnostics } =
    dedupeDirections(rawDirections);

  // 3. Family difference
  const familyDifference = evaluateDirectionFamilyDifference(dedupedDirections);

  // 4. Run gates
  const gateSummary = runDirectionGatesForSet(dedupedDirections, {
    concepts: validConcepts,
    opportunities: input.opportunityMap.opportunities,
    insights: input.insights,
    needs: input.needs,
    facts: input.truth.facts,
    evidence: input.evidence.entries,
    conflicts,
    siblingDirections: dedupedDirections,
    expectedBrandName: input.expectedBrandName,
    expectedBrandRole: input.expectedBrandRole,
  });

  // 5. Evaluations
  const evaluations = dedupedDirections.map((d) => buildEvaluation(d, gateSummary.allResults));

  // 6. Build DirectionSet
  const blockedDirectionIds = Object.entries(gateSummary.perDirection)
    .filter(([, status]) => status === 'blocked')
    .map(([id]) => id);

  const allDiagnostics = [
    ...genDiagnostics,
    ...dedupeDiagnostics,
    ...familyDifference.diagnostics,
  ];

  const directionSet: DirectionSet = {
    schemaVersion: '0.1',
    projectId: input.projectId,
    directions: dedupedDirections,
    evaluations,
    familyDifference,
    blockedDirectionIds,
    diagnostics: allDiagnostics,
    provenance: {
      conceptSetVersion: input.conceptSet.schemaVersion,
      truthSchemaVersion: input.truth.schemaVersion,
      generatedAt,
      mode: 'shadow',
    },
  };

  // Leakage at the whole set level
  const leakage = detectDirectionLeakage(directionSet);

  return {
    directionSet,
    familyDifference,
    leakage,
    gateSummary,
    evaluations,
    dedupe: { removedCount: duplicates.length },
    diagnostics: allDiagnostics,
  };
}

export { DIRECTION_TRACE_VERSION };
