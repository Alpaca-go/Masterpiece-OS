/** Preserve the decisions and their reasons without duplicating full Analysis. */
export function buildDesignDecisions(analysis, brief) {
  return {
    status: analysis.approval?.status || 'Not Approved',
    creativeDecision: {
      statement: analysis.creativeDecision.statement,
      reasons: analysis.creativeDecision.rationale,
      rejectedDirections: analysis.creativeDecision.tradeoffs
    },
    approvedBrandDNA: analysis.approvedBrandDNA,
    creativePrinciples: {
      statement: brief.creativePrinciples.statement,
      principles: brief.creativePrinciples.principles,
      reasons: analysis.reasoning.designLanguage.rationale
    },
    mustKeep: brief.mustKeep,
    canExplore: brief.canExplore,
    avoidRules: brief.creativePrinciples.avoidRules,
    approval: analysis.approval,
    sourcePolicy: analysis.sourcePolicy
  };
}
