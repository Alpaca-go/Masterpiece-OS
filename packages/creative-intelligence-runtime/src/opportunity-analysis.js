import { buildCategoryOpportunityMap } from './category-opportunity-map.js';
import { auditExistingVisualSystem } from './existing-visual-system-audit.js';
import { analyzeIntentVisualGap } from './intent-visual-gap.js';
import { buildCreativeIntelligenceShadow } from './shadow-mode.js';
import { resolvePrimaryTouchpoints } from './touchpoint-registry.js';

export function buildCreativeIntelligenceOpportunityAnalysis(input) {
  const shadow = buildCreativeIntelligenceShadow(input);
  const truthModel = shadow.artifacts.projectTruthModel;
  const existingVisualSystemAudit = auditExistingVisualSystem(truthModel, {
    judgments: input.visualAuditJudgments || []
  });
  const intentVisualGapAnalysis = analyzeIntentVisualGap(truthModel, {
    judgments: input.gapJudgments || []
  });
  const primaryTouchpointRegistry = resolvePrimaryTouchpoints(truthModel, {
    registry: input.touchpointRegistry
  });
  const categoryOpportunityMap = buildCategoryOpportunityMap({
    truthModel,
    touchpointRegistry: primaryTouchpointRegistry,
    gapAnalysis: intentVisualGapAnalysis,
    visualAudit: existingVisualSystemAudit
  });
  return {
    ...shadow,
    artifacts: {
      ...shadow.artifacts,
      existingVisualSystemAudit,
      intentVisualGapAnalysis,
      primaryTouchpointRegistry,
      categoryOpportunityMap
    }
  };
}
