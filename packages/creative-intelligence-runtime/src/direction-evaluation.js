const CRITERIA = Object.freeze(['strategyFit', 'differentiation', 'memoryPotential', 'categoryTrust', 'extensionPotential']);

export function evaluateCreativeDirections(directionSet, scoreInputs) {
  const byId = new Map((Array.isArray(scoreInputs) ? scoreInputs : []).map((item) => [item.directionId, item]));
  const knownEvidence = new Set(directionSet.directions.flatMap((direction) => direction.evidenceRefs));
  const scores = directionSet.directions.map((direction) => {
    const input = byId.get(direction.id);
    if (!input) throw new Error(`Missing concept pre-evaluation for ${direction.id}`);
    const result = { directionId: direction.id };
    for (const criterion of CRITERIA) {
      const value = Number(input[criterion]);
      if (!Number.isFinite(value) || value < 0 || value > 10) throw new Error(`${direction.id}.${criterion} must be between 0 and 10`);
      result[criterion] = value;
    }
    result.total = Number((CRITERIA.reduce((sum, key) => sum + result[key], 0) / CRITERIA.length).toFixed(2));
    result.evidenceRefs = [...new Set(input.evidenceRefs || direction.evidenceRefs)];
    if (result.evidenceRefs.some((ref) => !knownEvidence.has(ref))) throw new Error(`${direction.id} concept score cites unknown evidence`);
    return result;
  });
  const ranked = [...scores].sort((a, b) => b.total - a.total || a.directionId.localeCompare(b.directionId));
  const hasUniqueLeader = ranked[0].total > ranked[1].total;
  const recommendation = hasUniqueLeader ? ranked[0].directionId : '';
  const recommendedDirection = directionSet.directions.find((item) => item.id === recommendation);
  return {
    schemaVersion: '1.0', projectId: directionSet.projectId,
    evaluationType: 'concept_pre_evaluation', anchorValidationRequired: true,
    scores, recommendation,
    recommendationReasons: recommendation ? [`Highest non-binding concept score: ${ranked[0].total}`] : ['Top concept scores are tied; user judgment is required.'],
    largestRisk: recommendedDirection?.risks?.[0] || ranked.map((item) => directionSet.directions.find((direction) => direction.id === item.directionId)?.risks?.[0]).find(Boolean) || ''
  };
}
