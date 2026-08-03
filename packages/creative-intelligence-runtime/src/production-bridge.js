import { CreativeIntelligenceValidationError } from './contracts.js';
import { stableFingerprint } from './evidence-ledger.js';
import { validateCreativeDecisionV2 } from './creative-decision-v2.js';

function unique(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((item) => String(item || '').trim()).filter(Boolean))];
}

function priorityValues(decision, prefix) {
  const marker = `${prefix}:`;
  return unique(decision.visualPriorities
    .filter((item) => String(item).toLowerCase().startsWith(marker))
    .map((item) => String(item).slice(marker.length).trim()));
}

function evidenceIndex(ledger) {
  return new Map((ledger?.evidence || []).map((item) => [item.id, item]));
}

export function compileCreativeDecisionProductionBridge({
  creativeDecision,
  userDecision,
  evidenceLedger,
  generatedAt = new Date().toISOString()
}) {
  const issues = validateCreativeDecisionV2(creativeDecision);
  if (issues.length) {
    throw new CreativeIntelligenceValidationError(
      'CREATIVE_DECISION_V2_INVALID',
      `Production bridge requires a valid confirmed Creative Decision V2: ${issues.join('; ')}`,
      issues
    );
  }
  if (userDecision?.status !== 'confirmed') {
    throw new CreativeIntelligenceValidationError(
      'USER_DIRECTION_CONFIRMATION_REQUIRED',
      'Production bridge cannot promote an unconfirmed direction decision'
    );
  }
  const byEvidenceId = evidenceIndex(evidenceLedger);
  const candidates = creativeDecision.lockedAssetDecisions.map((item) => ({
    candidateId: item.assetId,
    decision: item.decision,
    rationale: item.rationale,
    evidenceRefs: unique(item.evidenceRefs),
    stage: 'candidate'
  }));
  const confirmed = candidates.filter((item) => item.decision === 'locked'
    && item.evidenceRefs.length
    && item.evidenceRefs.every((ref) => ['confirmed', 'observed'].includes(byEvidenceId.get(ref)?.status))
  ).map((item) => ({ ...item, stage: 'confirmed', confirmedByDecisionId: creativeDecision.decisionId }));

  const acceptedMechanisms = unique([
    creativeDecision.strategicDirection.proposition,
    creativeDecision.coreVisualMechanism.concept,
    creativeDecision.coreVisualMechanism.generationLogic,
    creativeDecision.coreVisualMechanism.visualHammer,
    ...creativeDecision.coreVisualMechanism.sourceMechanisms,
    ...userDecision.acceptedElements,
    ...(userDecision.mergedElements || []).map((item) => item.content)
  ]);
  const rejectedMechanisms = unique([
    ...creativeDecision.prohibitedExpressions,
    ...userDecision.rejectedElements
  ]);
  const targetStyleProfile = {
    schemaVersion: '2.0',
    projectId: creativeDecision.projectId,
    decisionId: creativeDecision.decisionId,
    status: 'provisional',
    anchorValidationStatus: 'pending',
    strategicProposition: creativeDecision.strategicDirection.proposition,
    perceptionGoals: unique(creativeDecision.brandPerceptionGoal),
    compositionLogic: priorityValues(creativeDecision, 'composition'),
    colorLogic: priorityValues(creativeDecision, 'color'),
    typographyLogic: priorityValues(creativeDecision, 'typography'),
    imageMaterialLogic: priorityValues(creativeDecision, 'image_material'),
    allowedVariations: unique(creativeDecision.allowedVariations),
    prohibitedExpressions: rejectedMechanisms,
    generatedAt
  };
  const anchorBriefInheritance = {
    schemaVersion: '1.0',
    projectId: creativeDecision.projectId,
    decisionId: creativeDecision.decisionId,
    selectedDirectionId: creativeDecision.decisionSource.selectedDirectionId,
    acceptedMechanisms,
    rejectedMechanisms,
    lockedAssetCandidateIds: candidates.map((item) => item.candidateId),
    confirmedLockedAssetIds: confirmed.map((item) => item.candidateId),
    touchpointPriorities: unique(creativeDecision.touchpointPriorities),
    anchorValidationStatus: 'pending',
    generatedAt
  };
  return {
    schemaVersion: '1.0',
    projectId: creativeDecision.projectId,
    decisionId: creativeDecision.decisionId,
    sourceFingerprint: stableFingerprint({ creativeDecision, userDecision }),
    targetStyleProfile,
    lockedAssets: { candidates, confirmed },
    anchorBriefInheritance,
    runtime: {
      generationRuntime: 'short-chain',
      promptCompiler: 'existing_short_chain_prompt_compiler',
      directionRegenerationRequired: false
    },
    generatedAt
  };
}

export function lockedAssetOverridesFromProductionBridge(bridge) {
  return bridge.lockedAssets.confirmed.map((item) => ({
    type: 'required_visual_element',
    name: item.rationale,
    rule: item.rationale,
    priority: 'high',
    allowedChanges: [],
    forbiddenChanges: [`Do not remove or materially alter: ${item.rationale}`],
    evidence: {
      source: 'user_confirmed',
      description: `Confirmed by Creative Decision ${bridge.decisionId}; evidence ${item.evidenceRefs.join(', ')}`
    }
  }));
}
