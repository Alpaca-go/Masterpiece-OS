/**
 * CI-W1C.7 — Visual Direction Exploration Report contracts.
 *
 * The report compiler consumes:
 *   - Validated `StrategicSynthesisArtifact` (CI-4B)
 *   - Validated `ModelAssistedConceptSet` (CI-5B)
 *   - Validated `ModelAssistedDirectionSet` (CI-6B)
 *   - Existing CI-7 evaluation summary (re-evaluated)
 *
 * It produces:
 *   - `visual-direction-exploration-report.json` — machine-readable
 *   - `visual-direction-exploration-report.md` — human-readable
 *
 * Hard rules (spec §6 / §11):
 *   - Report contains Project Understanding, >=3 Insights, >=3
 *     Opportunities, 3-5 Concepts, 3-4 Directions.
 *   - Each Direction has `whyThisProject` and
 *     `differenceFromOtherDirections`.
 *   - Source trace IDs are present.
 *   - Recommendation is NOT auto-promoted to Selection.
 *   - No legacy visual descriptors injected from excluded source.
 */

import type { StrategicSynthesisArtifact } from '../strategic-synthesis/contracts.ts';
import type { ModelAssistedConceptSet } from '../model-assisted/contracts.ts';
import type { ModelAssistedDirectionSet } from '../model-assisted/contracts.ts';

export const VISUAL_DIRECTION_REPORT_SCHEMA_VERSION = '0.1' as const;

export interface VisualDirectionRecommendationSummary {
  recommendedDirectionId: string;
  recommendedDirectionTitle: string;
  rationale: string;
  /**
   * CRITICAL: `isAutoSelected` is always `false`. The user must
   * explicitly select a Direction. The report's recommendation is
   * advisory only (frozen CI-7: Recommendation != Selection).
   */
  isAutoSelected: false;
}

export interface VisualDirectionExplorationReport {
  schemaVersion: typeof VISUAL_DIRECTION_REPORT_SCHEMA_VERSION;
  projectId: string;
  generatedAt: string;
  sourceMap: {
    strategicSynthesisRef: string;
    conceptSetRef: string;
    directionSetRef: string;
  };
  projectUnderstanding: StrategicSynthesisArtifact['projectUnderstanding'];
  tensions: StrategicSynthesisArtifact['tensions'];
  insights: StrategicSynthesisArtifact['insights'];
  opportunities: StrategicSynthesisArtifact['opportunities'];
  concepts: ModelAssistedConceptSet['candidates'];
  directions: ModelAssistedDirectionSet['directions'];
  recommendation: VisualDirectionRecommendationSummary;
  /**
   * Image provider call count. Always 0 in CI-W1C.7 (no image
   * provider call; only text reasoning).
   */
  imageProviderCallCount: 0;
  /**
   * CI-7 frozen surface: selectionRevision is preserved on the
   * active selection; the report does NOT mutate selection state.
   */
  selectionFrozenNotice: 'selection is unchanged by this report';
}
