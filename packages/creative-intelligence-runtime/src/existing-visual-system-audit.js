const DIMENSIONS = Object.freeze([
  'identity', 'color', 'typography', 'graphic', 'packaging', 'material',
  'photography', 'composition', 'lighting', 'spatial', 'seriesConsistency'
]);

const PATH_DIMENSIONS = Object.freeze({
  tone: 'identity',
  colorBehavior: 'color',
  primaryColors: 'color',
  supportingColors: 'color',
  typographySignals: 'typography',
  graphicBehavior: 'graphic',
  graphicAssets: 'graphic',
  materialBehavior: 'material',
  materialSignals: 'material',
  photographySignals: 'photography',
  compositionBehavior: 'composition',
  lightingBehavior: 'lighting',
  packageStructures: 'packaging'
});

function dimensionFor(claim) {
  const tail = claim.subjectPath.split('.').at(-1);
  if (PATH_DIMENSIONS[tail]) return PATH_DIMENSIONS[tail];
  if (claim.subjectPath.startsWith('observedVisualAssets.logo')) return 'identity';
  if (claim.subjectPath.includes('package')) return 'packaging';
  return null;
}

export function auditExistingVisualSystem(truthModel, { judgments = [] } = {}) {
  const byDimension = Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, []]));
  for (const claim of [
    ...(truthModel.currentVisualPatterns || []),
    ...(truthModel.observedVisualAssets || []),
    ...(truthModel.constraints || [])
  ]) {
    const dimension = dimensionFor(claim);
    if (dimension) byDimension[dimension].push(claim);
  }
  const judgmentByDimension = new Map(judgments.map((judgment) => [judgment.dimension, judgment]));
  const dimensions = DIMENSIONS.map((dimension) => {
    const observations = byDimension[dimension];
    const judgment = judgmentByDimension.get(dimension);
    if (judgment && !['effective', 'problem', 'missing', 'mixed'].includes(judgment.status)) {
      throw new Error(`Unsupported visual audit status for ${dimension}`);
    }
    const status = judgment?.status || (observations.length ? 'observed' : 'missing');
    return {
      dimension,
      status,
      observations: observations.map((claim) => claim.content),
      effectiveItems: judgment?.effectiveItems || [],
      problems: judgment?.problems || [],
      missing: judgment?.missing || (observations.length ? [] : [`No ${dimension} evidence supplied`]),
      retention: judgment?.retention || (observations.length ? 'unresolved' : 'not_applicable'),
      evidenceRefs: [...new Set([
        ...observations.flatMap((claim) => claim.evidenceRefs),
        ...(judgment?.evidenceRefs || [])
      ])],
      confidence: judgment?.confidence ?? (observations.length ? Math.max(...observations.map((claim) => claim.confidence)) : 0)
    };
  });
  return {
    schemaVersion: '1.0',
    projectId: truthModel.projectId,
    dimensions,
    summary: {
      observed: dimensions.filter((item) => item.status === 'observed').length,
      effective: dimensions.filter((item) => item.status === 'effective').length,
      problem: dimensions.filter((item) => item.status === 'problem').length,
      missing: dimensions.filter((item) => item.status === 'missing').length,
      humanJudgmentRequired: dimensions.some((item) => item.status === 'observed')
    }
  };
}
