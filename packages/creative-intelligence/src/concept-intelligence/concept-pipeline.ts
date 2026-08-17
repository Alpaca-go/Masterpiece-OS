/**
 * Top-level Concept Intelligence pipeline.
 *
 * Combines:
 *   1. Generate Concepts (deterministic, opportunity-led)
 *   2. Dedupe + diversity
 *   3. Run all 8 gates
 *   4. Build ConceptSet
 *
 * Pure function. No IO. No model call.
 *
 * Input: understanding context + opportunity map
 * Output: ConceptSet with gate results + diagnostics
 */

import type { ProjectTruthModel, ProjectTruthConflict } from '../truth/contracts.ts';
import type { EvidenceLedgerSnapshot } from '../evidence/contracts.ts';
import type { NeedItem } from '../need-intelligence/contracts.ts';
import type { InsightItem } from '../insight-intelligence/contracts.ts';
import type { OpportunityMap } from '../opportunity/contracts.ts';
import type { ConceptSet, ConceptCandidate, ConceptGateResult } from './contracts.ts';
import { CONCEPT_TRACE_VERSION } from './contracts.ts';
import { generateConcepts } from './generate-concepts.ts';
import { dedupeConcepts, assessDiversity } from './concept-deduper.ts';
import { runConceptGatesForSet } from './concept-gates.ts';
import { detectConceptLeakage } from './concept-leakage.ts';

export interface ConceptPipelineInput {
  projectId: string;
  truth: ProjectTruthModel;
  evidence: EvidenceLedgerSnapshot;
  needs: NeedItem[];
  insights: InsightItem[];
  opportunityMap: OpportunityMap;
  maxConcepts?: number;
  maxPerOpportunity?: number;
  generatedAt?: string;
  expectedBrandName?: string;
  expectedBrandRole?: string;
}

export interface ConceptPipelineResult {
  conceptSet: ConceptSet;
  /** Leakage check at the whole set level. */
  leakage: { field: string | null; text: string | null };
  /** Diversity assessment. */
  diversity: ReturnType<typeof assessDiversity>;
  /** Dedupe diagnostics. */
  dedupe: { removedCount: number };
  /** Gate summary. */
  gateSummary: ReturnType<typeof runConceptGatesForSet>;
}

export function runConceptPipeline(input: ConceptPipelineInput): ConceptPipelineResult {
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  // 1. Generate
  const { concepts: rawConcepts, diagnostics: genDiagnostics } = generateConcepts({
    projectId: input.projectId,
    opportunityMap: input.opportunityMap,
    insights: input.insights,
    needs: input.needs,
    facts: input.truth.facts,
    evidence: input.evidence.entries,
    maxConcepts: input.maxConcepts,
    maxPerOpportunity: input.maxPerOpportunity,
    generatedAt,
  });

  // 2. Dedupe
  const { concepts: dedupedConcepts, duplicates, diagnostics: dedupeDiagnostics } = dedupeConcepts(rawConcepts);

  // 3. Run gates
  const conflicts: ProjectTruthConflict[] = input.truth.conflicts ?? [];
  const gateSummary = runConceptGatesForSet(dedupedConcepts, {
    opportunities: input.opportunityMap.opportunities,
    insights: input.insights,
    needs: input.needs,
    facts: input.truth.facts,
    evidence: input.evidence.entries,
    conflicts,
    expectedBrandName: input.expectedBrandName,
    expectedBrandRole: input.expectedBrandRole,
  });

  // Determine blocked concept ids from gate results
  const blockedConceptIds = Object.entries(gateSummary.perConcept)
    .filter(([, status]) => status === 'blocked')
    .map(([id]) => id);

  // Build diagnostics
  const allDiagnostics = [
    ...genDiagnostics,
    ...dedupeDiagnostics,
  ];

  // 4. Build ConceptSet
  const conceptSet: ConceptSet = {
    schemaVersion: '0.1',
    projectId: input.projectId,
    concepts: dedupedConcepts,
    gateResults: gateSummary.allResults,
    blockedConceptIds,
    diagnostics: allDiagnostics,
    provenance: {
      opportunityMapVersion: input.opportunityMap.schemaVersion,
      truthSchemaVersion: input.truth.schemaVersion,
      generatedAt,
      mode: 'shadow',
    },
  };

  // 5. Leakage check (defense-in-depth — gates already check, but at set level too)
  const leakage = detectConceptLeakage(conceptSet);

  // 6. Diversity assessment
  const diversity = assessDiversity(dedupedConcepts);

  return {
    conceptSet,
    leakage,
    diversity,
    dedupe: { removedCount: duplicates.length },
    gateSummary,
  };
}

export { CONCEPT_TRACE_VERSION };
