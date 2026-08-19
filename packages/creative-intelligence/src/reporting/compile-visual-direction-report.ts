/**
 * CI-W1C.7 — Visual Direction Exploration Report compiler.
 *
 * Pure function: same inputs → same outputs. No IO, no model call.
 * The runtime writes the report to:
 *   <runRoot>/deliverables/visual-direction-exploration-report.json
 *   <runRoot>/deliverables/visual-direction-exploration-report.md
 *
 * The recommendation is **advisory only** (CI-7 frozen: Recommendation
 * != Selection). The user must still explicitly select a Direction.
 */

import type {
  VisualDirectionExplorationReport,
  VisualDirectionRecommendationSummary,
} from './contracts.ts';
import { VISUAL_DIRECTION_REPORT_SCHEMA_VERSION } from './contracts.ts';
import type { StrategicSynthesisArtifact } from '../strategic-synthesis/contracts.ts';
import type { ModelAssistedConceptSet, ModelAssistedDirectionSet } from '../model-assisted/contracts.ts';

export interface CompileVisualDirectionReportInput {
  projectId: string;
  synthesis: StrategicSynthesisArtifact;
  conceptSet: ModelAssistedConceptSet;
  directionSet: ModelAssistedDirectionSet;
}

function buildRecommendation(input: CompileVisualDirectionReportInput): VisualDirectionRecommendationSummary {
  // Heuristic recommendation: the direction that has the most
  // resolved trace refs is the most "grounded". Tie-break by
  // direction id alphabetical for determinism.
  const scored = input.directionSet.directions.map((d) => {
    const score = d.opportunityRefs.length
      + d.insightRefs.length
      + d.factRefs.length
      + d.conceptRefs.length;
    return { id: d.id, title: d.title, score };
  });
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.id.localeCompare(b.id);
  });
  const top = scored[0];
  if (!top) {
    return {
      recommendedDirectionId: 'none',
      recommendedDirectionTitle: 'none',
      rationale: 'no directions available; cannot recommend',
      isAutoSelected: false,
    };
  }
  return {
    recommendedDirectionId: top.id,
    recommendedDirectionTitle: top.title,
    rationale: 'Highest grounded-trace score; the user must still explicitly select a direction.',
    isAutoSelected: false,
  };
}

export function compileVisualDirectionReport(
  input: CompileVisualDirectionReportInput,
): VisualDirectionExplorationReport {
  return {
    schemaVersion: VISUAL_DIRECTION_REPORT_SCHEMA_VERSION,
    projectId: input.projectId,
    generatedAt: new Date().toISOString(),
    sourceMap: {
      strategicSynthesisRef: `synthesis/${input.synthesis.generatedAt}`,
      conceptSetRef: `concepts/${input.conceptSet.generatedAt}`,
      directionSetRef: `directions/${input.directionSet.generatedAt}`,
    },
    projectUnderstanding: input.synthesis.projectUnderstanding,
    tensions: input.synthesis.tensions,
    insights: input.synthesis.insights,
    opportunities: input.synthesis.opportunities,
    concepts: input.conceptSet.candidates,
    directions: input.directionSet.directions,
    recommendation: buildRecommendation(input),
    imageProviderCallCount: 0,
    selectionFrozenNotice: 'selection is unchanged by this report',
  };
}
