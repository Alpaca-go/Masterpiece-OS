import { CreativeIntelligenceValidationError } from './contracts.js';
import { stableFingerprint } from './evidence-ledger.js';

function unique(values) {
  return [...new Set(values.map((item) => String(item || '').trim()).filter(Boolean))];
}

function findClaim(truthModel, section, path) {
  return (truthModel[section] || []).find((claim) => claim.subjectPath === path)?.content || '';
}

export function validateCreativeDecisionV2(decision) {
  const issues = [];
  if (decision?.schemaVersion !== '2.0') issues.push('schemaVersion must be 2.0');
  for (const field of ['projectId', 'decisionId', 'version', 'generatedAt']) {
    if (!String(decision?.[field] || '').trim()) issues.push(`${field} is required`);
  }
  for (const field of ['brandPerceptionGoal', 'visualPriorities', 'allowedVariations', 'prohibitedExpressions', 'touchpointPriorities', 'evidenceRefs']) {
    if (!Array.isArray(decision?.[field]) || !decision[field].length) issues.push(`${field} requires at least one item`);
  }
  if (decision?.decisionStatus !== 'confirmed') issues.push('decisionStatus must be confirmed');
  if (decision?.decisionSource?.mode !== 'guided_direction' || !decision.decisionSource.selectedDirectionId) issues.push('guided direction source is incomplete');
  if (decision?.coreVisualMechanism?.validationStatus !== 'direction_confirmed_anchor_pending') issues.push('new direction must remain Anchor-pending');
  return issues;
}

export function compileCreativeDecisionV2({
  directionSet, directionValidation, userDecision, projectTruthModel, categoryOpportunityMap,
  generatedAt = userDecision?.confirmedAt || new Date().toISOString()
}) {
  if (directionValidation?.status !== 'passed') {
    throw new CreativeIntelligenceValidationError('DIRECTION_VALIDATION_REQUIRED', 'Creative Decision requires a direction set that passed diversity validation');
  }
  if (userDecision?.status !== 'confirmed' || !userDecision.confirmedAt) {
    throw new CreativeIntelligenceValidationError('USER_DIRECTION_CONFIRMATION_REQUIRED', 'Formal Creative Decision cannot be compiled before user confirmation');
  }
  const selected = directionSet.directions.find((item) => item.id === userDecision.selectedDirectionId);
  if (!selected) throw new CreativeIntelligenceValidationError('USER_DIRECTION_SELECTION_INVALID', 'Confirmed selected direction is missing from the direction set');
  const touchpoints = categoryOpportunityMap.primaryTouchpoints || [];
  if (!touchpoints.length) {
    throw new CreativeIntelligenceValidationError('TOUCHPOINT_CONFIRMATION_REQUIRED', 'Formal Creative Decision requires at least one real business touchpoint');
  }
  const merged = new Map(userDecision.mergedElements.map((item) => [item.elementType, item.content]));
  const evidenceRefs = unique([
    ...selected.evidenceRefs,
    ...selected.sourceMechanisms.flatMap((item) => item.evidenceRefs),
    ...categoryOpportunityMap.evidenceRefs
  ]);
  const brandRole = findClaim(projectTruthModel, 'brandFacts', 'brandFacts.role')
    || findClaim(projectTruthModel, 'brandFacts', 'brandFacts.industry');
  if (!brandRole) throw new CreativeIntelligenceValidationError('BRAND_ROLE_REQUIRED', 'Creative Decision requires an evidence-backed brand role or category');
  const decisionId = `CD2-${stableFingerprint({ projectId: directionSet.projectId, selected: selected.id, confirmedAt: userDecision.confirmedAt }).slice(0, 16)}`;
  const decision = {
    schemaVersion: '2.0', projectId: directionSet.projectId, decisionId, version: '2.0.0',
    strategicDirection: {
      proposition: merged.get('strategicProposition') || selected.strategicProposition,
      rationale: userDecision.userRationale,
      brandRole
    },
    brandPerceptionGoal: unique([merged.get('perceptionOutcome') || selected.perceptionOutcome]),
    coreVisualMechanism: {
      concept: merged.get('coreMetaphor') || selected.coreMetaphor,
      sourceMechanisms: unique(selected.sourceMechanisms.map((item) => `${item.type}: ${item.mechanism}`)),
      languageNail: merged.get('languageNail') || selected.languageNail,
      visualHammer: merged.get('visualHammer') || selected.visualHammer,
      generationLogic: merged.get('visualGenerationMechanism') || selected.visualGenerationMechanism,
      validationStatus: 'direction_confirmed_anchor_pending'
    },
    visualPriorities: unique([
      `composition: ${merged.get('compositionLogic') || selected.compositionLogic}`,
      `color: ${merged.get('colorLogic') || selected.colorLogic}`,
      `typography: ${merged.get('typographyLogic') || selected.typographyLogic}`,
      `image_material: ${merged.get('imageMaterialLogic') || selected.imageMaterialLogic}`
    ]),
    lockedAssetDecisions: categoryOpportunityMap.mustKeep.map((item) => ({
      assetId: item.id, decision: 'locked', rationale: item.content, evidenceRefs: item.evidenceRefs
    })),
    allowedVariations: unique([
      ...userDecision.acceptedElements,
      'Composition and scale may adapt to each confirmed business touchpoint while preserving the selected core mechanism.'
    ]),
    prohibitedExpressions: unique([
      ...categoryOpportunityMap.shouldAvoid.map((item) => item.content),
      ...userDecision.rejectedElements
    ]),
    touchpointPriorities: unique(touchpoints.map((item) => item.label)),
    knownRisks: unique(selected.risks),
    decisionSource: {
      mode: 'guided_direction', selectedDirectionId: selected.id,
      userDecisionRef: 'user-direction-decision.json', traceAvailability: 'complete'
    },
    decisionStatus: 'confirmed', evidenceRefs, generatedAt
  };
  const issues = validateCreativeDecisionV2(decision);
  if (issues.length) {
    throw new CreativeIntelligenceValidationError('CREATIVE_DECISION_V2_INVALID', `Creative Decision V2 is invalid: ${issues.join('; ')}`, issues);
  }
  return decision;
}

export function buildDecisionTrace({ evidenceLedger, categoryOpportunityMap, directionSet, userDecision, creativeDecision }) {
  if (creativeDecision?.decisionStatus !== 'confirmed') throw new Error('Decision trace requires a confirmed Creative Decision');
  const selected = directionSet.directions.find((item) => item.id === userDecision.selectedDirectionId);
  return {
    schemaVersion: '1.0', projectId: creativeDecision.projectId, decisionId: creativeDecision.decisionId,
    stages: {
      evidence: creativeDecision.evidenceRefs.map((ref) => ({ ref, exists: evidenceLedger.evidence.some((item) => item.id === ref) })),
      opportunities: [...categoryOpportunityMap.mustKeep, ...categoryOpportunityMap.canReconstruct, ...categoryOpportunityMap.shouldAvoid, ...categoryOpportunityMap.canOwn]
        .filter((item) => item.evidenceRefs.some((ref) => creativeDecision.evidenceRefs.includes(ref))).map((item) => item.id),
      direction: selected.id,
      userDecision: { status: userDecision.status, selectedDirectionId: userDecision.selectedDirectionId, confirmedAt: userDecision.confirmedAt },
      creativeDecision: creativeDecision.decisionId
    },
    complete: creativeDecision.evidenceRefs.every((ref) => evidenceLedger.evidence.some((item) => item.id === ref))
  };
}
