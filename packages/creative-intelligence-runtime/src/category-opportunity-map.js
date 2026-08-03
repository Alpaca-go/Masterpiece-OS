import { stableFingerprint } from './evidence-ledger.js';

function opportunity(kind, content, evidenceRefs, rationale) {
  return {
    id: `OP-${stableFingerprint({ kind, content }).slice(0, 14)}`,
    content,
    rationale,
    evidenceRefs: [...new Set(evidenceRefs)]
  };
}

function claimsMatching(truthModel, section, pathPattern) {
  return (truthModel[section] || []).filter((claim) => pathPattern.test(claim.subjectPath));
}

function uniqueOpportunities(items) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

export function buildCategoryOpportunityMap({ truthModel, touchpointRegistry, gapAnalysis, visualAudit }) {
  const categoryContext = claimsMatching(truthModel, 'brandFacts', /\.industry(\.|$)/).map((claim) => ({
    content: claim.content,
    evidenceRefs: claim.evidenceRefs,
    confidence: claim.confidence
  }));
  const mustKeepClaims = claimsMatching(truthModel, 'constraints', /\.(lockedFacts|mustPreserve|confirmedColors|packageStructures)(\.|$)/);
  const reconstructClaims = (truthModel.currentVisualPatterns || []).filter((claim) =>
    !mustKeepClaims.some((locked) => locked.content.toLocaleLowerCase('en-US') === claim.content.toLocaleLowerCase('en-US'))
  );
  const avoidClaims = claimsMatching(truthModel, 'constraints', /\.(prohibitedDirections|mustAvoid|visualProblems)(\.|$)/);
  const ownClaims = [
    ...(truthModel.confirmedUserIntent || []),
    ...claimsMatching(truthModel, 'brandFacts', /\.(personality|visualPreferences)(\.|$)/)
  ];
  const mustKeep = uniqueOpportunities(mustKeepClaims.map((claim) => opportunity(
    'mustKeep', claim.content, claim.evidenceRefs,
    'Confirmed continuity, identity, color, or structural constraint.'
  )));
  const canReconstruct = uniqueOpportunities(reconstructClaims.map((claim) => opportunity(
    'canReconstruct', claim.content, claim.evidenceRefs,
    'Observed current-system behavior without a confirmed preservation lock.'
  )));
  const shouldAvoid = uniqueOpportunities([
    ...avoidClaims.map((claim) => opportunity(
      'shouldAvoid', claim.content, claim.evidenceRefs,
      'Explicitly prohibited or recorded as a current visual problem.'
    )),
    ...(gapAnalysis.misaligned || []).map((gap) => opportunity(
      'shouldAvoid', gap.currentExpression || gap.rationale, gap.evidenceRefs,
      'Intent–visual analysis identifies a misaligned expression.'
    )),
    ...(gapAnalysis.overExpressed || []).map((gap) => opportunity(
      'shouldAvoid', gap.currentExpression || gap.rationale, gap.evidenceRefs,
      'Intent–visual analysis identifies an over-expressed signal.'
    ))
  ]);
  const canOwn = uniqueOpportunities(ownClaims.map((claim) => opportunity(
    'canOwn', claim.content, claim.evidenceRefs,
    'Confirmed intent or documented brand characteristic can seed long-term recognition.'
  )));
  const primaryTouchpoints = touchpointRegistry.touchpoints;
  const evidenceRefs = [...new Set([
    ...mustKeep.flatMap((item) => item.evidenceRefs),
    ...canReconstruct.flatMap((item) => item.evidenceRefs),
    ...shouldAvoid.flatMap((item) => item.evidenceRefs),
    ...canOwn.flatMap((item) => item.evidenceRefs),
    ...primaryTouchpoints.flatMap((item) => item.evidenceRefs)
  ])];
  const evidenceConfidence = evidenceRefs.length
    ? (truthModel.confidence?.overall || 0) * Math.min(1, evidenceRefs.length / 8)
    : 0;
  return {
    schemaVersion: '1.0',
    projectId: truthModel.projectId,
    categoryContext,
    mustKeep,
    canReconstruct,
    shouldAvoid,
    canOwn,
    primaryTouchpoints,
    evidenceRefs: [...new Set([...evidenceRefs, ...categoryContext.flatMap((item) => item.evidenceRefs)])],
    confidence: Number(evidenceConfidence.toFixed(3)),
    visualAuditSummary: visualAudit.summary,
    negativeRuleCandidates: shouldAvoid.map((item) => ({ content: item.content, evidenceRefs: item.evidenceRefs }))
  };
}
