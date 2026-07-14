/**
 * Build the complete, traceable analysis record used by the v3.3 pipeline.
 * This layer preserves evidence and reasoning; it is never handed directly to
 * GPT for image generation.
 */
export function buildAnalysis({ inventory, brandLock, benchmarks, brandDnaDecision, creativeReasoning }) {
  return {
    originalIntent: brandDnaDecision.originalIntent,
    industryBenchmark: brandDnaDecision.industryBenchmark,
    competitorAnalysis: (benchmarks.cases || []).map((item) => ({
      name: item.name,
      url: item.url || '',
      relevance: item.reason || ''
    })),
    evidence: {
      assets: {
        totalFiles: inventory.totalFiles,
        imageCount: inventory.imageCount,
        inspectedImageCount: creativeReasoning.visualInspection.inspectedImageCount,
        inspectedImages: creativeReasoning.visualInspection.inspectedImages,
        visualInspectionVerified: creativeReasoning.visualInspection.verified,
        findings: creativeReasoning.visualInspection.findings
      },
      brandLock
    },
    reasoning: {
      brandIdentity: creativeReasoning.brandIdentity,
      brandPositioning: creativeReasoning.brandPositioning,
      designLanguage: creativeReasoning.designLanguage,
      emotionalDirection: creativeReasoning.emotionalDirection,
      photographyDirection: creativeReasoning.photographyDirection,
      designGoal: creativeReasoning.designGoal
    },
    creativeDecision: brandDnaDecision.creativeDecision,
    approvedBrandDNA: brandDnaDecision.approvedBrandDNA,
    approval: brandDnaDecision.approval,
    designRisks: creativeReasoning.designRisks,
    mustKeep: creativeReasoning.mustKeep,
    canExplore: creativeReasoning.canExplore,
    sourcePolicy: brandDnaDecision.sourcePolicy
  };
}
