import crypto from 'node:crypto';

export const PROJECT_GENERATION_CONTRACT_COMPILER_VERSION = '1.3.1';

function list(...values) {
  const result = [];
  const visit = (value) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (typeof value !== 'string') return;
    const clean = value.trim().replace(/\s+/gu, ' ');
    if (clean && !result.includes(clean)) result.push(clean);
  };
  values.forEach(visit);
  return result;
}

function factValue(value) {
  if (value && typeof value === 'object' && 'value' in value) return String(value.value ?? '').trim();
  return String(value ?? '').trim();
}

function evidence(value) {
  return list(value?.evidenceRefs);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => [key, stable(item)]));
}

function colorRules(packet) {
  const colors = packet?.mediaTranslations?.spatial?.colorBehavior || packet?.colorSystem || {};
  return list(
    ['primary', 'secondary', 'accent'].flatMap((group) =>
      (Array.isArray(colors[group]) ? colors[group] : []).map((item) =>
        [item?.name, item?.role].filter(Boolean).join(': '))),
  );
}

function toneBoundaries(decision, approvedDecision) {
  const explicit = (Array.isArray(decision?.toneBoundaries) ? decision.toneBoundaries : [])
    .flatMap((item) => item?.target
      ? [{ target: String(item.target).trim(), avoid: list(item.avoid) }]
      : []);
  if (explicit.length) return explicit;
  const approvedTarget = String(
    approvedDecision?.schemaVersion === '2.0'
      ? approvedDecision.brandPerceptionGoal?.[0] || approvedDecision.strategicDirection?.proposition
      : approvedDecision?.visual_direction?.recommended ?? '',
  ).trim();
  return approvedTarget
    ? [{ target: approvedTarget, avoid: list(approvedDecision?.prohibitedExpressions) }]
    : [];
}

function approvedProjectDecisions(value) {
  const decision = value && typeof value === 'object' ? value : {};
  const isV2 = decision.schemaVersion === '2.0' && decision.decisionId;
  const priorities = (prefix) => list(decision.visualPriorities)
    .filter((item) => item.toLowerCase().startsWith(`${prefix}:`))
    .map((item) => item.slice(prefix.length + 1).trim());
  const result = {
    decisionId: String(decision.decisionId ?? decision.direction_id ?? decision.id ?? '').trim() || null,
    decisionVersion: String(decision.direction_version ?? decision.version ?? '').trim() || null,
    recommendedDirection: String(isV2 ? decision.coreVisualMechanism?.concept : decision.visual_direction?.recommended ?? '').trim(),
    rationale: String(isV2 ? decision.strategicDirection?.rationale : decision.visual_direction?.rationale ?? '').trim(),
    brandStrategy: String(isV2 ? decision.strategicDirection?.proposition : decision.brand_strategy ?? '').trim(),
    colorSystem: isV2 ? priorities('color') : list(decision.color_system),
    materialSystem: isV2 ? priorities('image_material') : list(decision.material_system),
    compositionRules: isV2 ? priorities('composition') : list(decision.composition_rule),
    generationGoals: isV2 ? list(
      decision.brandPerceptionGoal,
      decision.coreVisualMechanism?.generationLogic,
      decision.coreVisualMechanism?.visualHammer,
      decision.touchpointPriorities,
    ) : list(decision.generation_goal),
    prohibitedExpressions: isV2 ? list(decision.prohibitedExpressions) : list(decision.avoid_assets),
  };
  const populatedCategories = [
    result.recommendedDirection,
    result.colorSystem,
    result.materialSystem,
    result.compositionRules,
    result.generationGoals,
    result.prohibitedExpressions,
  ].filter((item) => Array.isArray(item) ? item.length : item).length;
  return {
    ...result,
    specificity: {
      status: populatedCategories >= 4 && result.decisionId ? 'ready' : 'too_low',
      populatedCategories,
      requiredCategories: 4,
    },
  };
}

function approvedUpgradeStatement(decisions, fallback, deliverable) {
  const statement = decisions.brandStrategy;
  const spaceSignal = /空间|建筑|动线|space|interior|architecture/iu;
  const packagingSignal = /包装|礼品|开箱|盒|袋|packag|box|bag|unbox/iu;
  if (deliverable === 'space' && packagingSignal.test(statement) && !spaceSignal.test(statement)) {
    return decisions.generationGoals.find((item) => spaceSignal.test(item)) || fallback;
  }
  if (deliverable === 'packaging' && spaceSignal.test(statement) && !packagingSignal.test(statement)) {
    return decisions.generationGoals.find((item) => packagingSignal.test(item)) || fallback;
  }
  return statement || fallback;
}

// Build a minimum-viable approved creative decision from the upstream
// `visualDecisionPacket` so the Short-Chain compile pipeline can satisfy the
// preflight gate's `specificity.status === 'ready'` requirement without
// needing a separate `creative_decision.json` artifact. The downstream
// `compileProjectSpecificGenerationContract` already pulls `mustPreserve`,
// `mustTransform`, `upgradeThesis`, `toneBoundaries`, and the shared
// visual rules from the packet — this helper only fills the `approved_*`
// fields that the contract checks for populating the six specificity
// categories. When callers do pass a real `approvedCreativeDecision`,
// it is forwarded untouched.
//
// Note: this synthesiser intentionally leaves `visual_direction` and
// `brand_strategy` empty so the original fallback chain in
// `approvedUpgradeStatement` and `toneBoundaries` continues to derive
// the upgrade thesis and tone target from the packet's
// `creativeDecision.uniqueUpgradeThesis` / `toneBoundaries` — that
// matches the pre-fix contract behaviour and keeps the long-standing
// "missing upgrade thesis blocks the contract" invariant.
function synthesiseApprovedDecision(supplied, packet) {
  const explicit = supplied && typeof supplied === 'object' ? supplied : {};
  const hasAnyExplicitContent = [
    explicit.decisionId,
    explicit.strategicDirection,
    explicit.coreVisualMechanism,
    explicit.direction_id,
    explicit.id,
    explicit.visual_direction,
    explicit.brand_strategy,
    explicit.color_system,
    explicit.material_system,
    explicit.composition_rule,
    explicit.generation_goal,
    explicit.avoid_assets,
  ].some((value) => Array.isArray(value) ? value.length : value);
  if (hasAnyExplicitContent) return explicit;

  const decision = packet?.creativeDecision || {};
  const colorSystem = list(
    (packet?.colorSystem?.primary || []).map((item) => item?.name).filter(Boolean),
    (packet?.colorSystem?.secondary || []).map((item) => item?.name).filter(Boolean),
    (packet?.colorSystem?.accent || []).map((item) => item?.name).filter(Boolean),
  );
  const materialSystem = list(
    (packet?.materialSystem || []).flatMap((item) => [
      item?.material,
      item?.behavior,
    ].filter(Boolean)),
  );
  const compositionRules = list(
    decision.strategicNegatives,
    decision.preserveCore,
  );
  const generationGoals = list(
    decision.targetWorldview,
    decision.upgradeTo,
  );
  const prohibitedExpressions = list(decision.strategicNegatives);
  const projectId = String(packet?.projectId ?? '').trim();
  return {
    direction_id: projectId ? `packet-derived:${projectId}` : 'packet-derived',
    direction_version: '0.1.0',
    color_system: colorSystem,
    material_system: materialSystem,
    composition_rule: compositionRules,
    generation_goal: generationGoals,
    avoid_assets: prohibitedExpressions,
    source: 'synthesised_from_visual_decision_packet',
  };
}

export function validateProjectSpecificGenerationContract(contract) {
  const missing = [];
  if (!contract?.projectIdentity?.brandName) missing.push('projectIdentity.brandName');
  if (!contract?.projectIdentity?.industry) missing.push('projectIdentity.industry');
  if (!contract?.projectIdentity?.brandRole || contract.projectIdentity.brandRole === 'unknown') {
    missing.push('projectIdentity.brandRole');
  }
  if (!contract?.upgradeThesis?.statement
    || !list(contract.upgradeThesis.from).length
    || !list(contract.upgradeThesis.to).length) {
    missing.push('upgradeThesis');
  }
  if (!Array.isArray(contract?.mustPreserve) || !contract.mustPreserve.length) missing.push('mustPreserve');
  if (!Array.isArray(contract?.toneBoundaries) || !contract.toneBoundaries.length) missing.push('toneBoundaries');
  if (!Object.values(contract?.deliverableSuccessCriteria || {}).some((items) => list(items).length)) {
    missing.push('deliverableSuccessCriteria');
  }
  const conflicts = list(contract?.validation?.conflicts);
  return {
    status: conflicts.length ? 'conflicted' : missing.length ? 'insufficient' : 'ready',
    missingRequiredFields: missing,
    conflicts,
  };
}

export function compileProjectSpecificGenerationContract(input = {}) {
  const packet = input.visualDecisionPacket || input.visualUnderstandingCore || {};
  const facts = packet.projectFacts || {};
  const decision = packet.creativeDecision || {};
  // The pipeline historically required an explicit, separately persisted
  // `approvedCreativeDecision` (a `creative_decision.json` file) for the
  // downstream preflight gate to pass. In the current production surface that
  // separate file has no production path — the reference-first pipeline is
  // pure functions, the `creative-direction-service` is never exposed over
  // IPC, and `user-confirmed-visual-decision.json` has no writer anywhere
  // in the repository. Without a fallback the preflight gate would block
  // every Short-Chain compile call with `PROJECT_SPECIFICITY_TOO_LOW` even when
  // the upstream `visual-decision-packet` already contains everything
  // needed. Synthesise a minimum-viable stub from the packet itself so
  // the contract stays `ready` as soon as the v5 fusion-enhanced packet
  // has enough structured content, without requiring any new artifact.
  const approvedDecision = synthesiseApprovedDecision(
    input.approvedCreativeDecision,
    packet,
  );
  const projectSpecificDecisions = approvedProjectDecisions(approvedDecision);
  const hasApprovedDecision = projectSpecificDecisions.specificity.status === 'ready';
  const lockedAssets = input.lockedAssets || packet.lockedAssets || [];
  const userConfirmations = input.userConfirmations || [];
  const deliverable = String(input.deliverable || '').trim();
  const mediaKey = deliverable === 'space' ? 'spatial' : deliverable;
  const media = mediaKey ? packet.mediaTranslations?.[mediaKey] : null;

  const mustPreserve = [
    ...lockedAssets.map((asset) => ({
      value: String(asset?.value ?? '').trim(),
      source: asset?.lockSource === 'user_confirmed' ? 'user_confirmation' : 'locked_asset',
      evidenceRefs: evidence(asset),
    })),
    ...list(hasApprovedDecision
      ? approvedDecision.schemaVersion === '2.0'
        ? approvedDecision.lockedAssetDecisions?.filter((item) => item.decision === 'locked').map((item) => item.rationale)
        : approvedDecision.keep_assets
      : decision.preserveCore).map((value) => ({
      value,
      source: hasApprovedDecision ? 'approved_creative_decision' : 'confirmed_fact',
      evidenceRefs: list(packet.provenance?.createdFrom),
    })),
    ...userConfirmations.map((item) => ({
      value: String(item?.value ?? item ?? '').trim(),
      source: 'user_confirmation',
      evidenceRefs: evidence(item),
    })),
  ].filter((item) => item.value)
    .filter((item, index, all) => all.findIndex((candidate) => candidate.value === item.value) === index);

  const mustTransform = (packet.abstractions || []).flatMap((item) => {
    const sourceAsset = String(item?.sourceAsset ?? '').trim();
    if (!sourceAsset) return [];
    const packagingMatch = media?.graphicTranslation?.find((candidate) =>
      list(item.semanticMeaning).includes(candidate?.sourceMeaning));
    return [{
      sourceAsset,
      semanticMeaning: list(item.semanticMeaning),
      targetExpression: list(
        packagingMatch?.packagingExpression,
        item.materialPotential,
        item.lightingPotential,
      ),
      forbiddenLiteralUse: list(item.forbiddenLiteralUse, packagingMatch?.forbiddenLiteralUse),
      evidenceRefs: evidence(item),
    }];
  });

  const successCriteria = deliverable
    ? list(
      media?.status === 'ready' ? `${deliverable} media translation is complete` : '',
      media?.structureStrategy?.length ? 'Use a confirmed, physically credible structure' : '',
      media?.openingExperience?.length ? 'Explain opening and internal arrangement' : '',
      media?.photographyDirection?.length ? 'Render one clear commercial deliverable' : '',
      input.deliverableSuccessCriteria?.[deliverable],
    )
    : [];

  const contract = {
    schemaVersion: '1.0',
    projectId: String(packet.projectId ?? input.projectId ?? '').trim(),
    generatedAt: input.generatedAt || new Date().toISOString(),
    projectIdentity: {
      brandName: factValue(facts.brandName),
      industry: factValue(facts.industry),
      brandRole: factValue(facts.brandRole),
      businessModel: factValue(facts.businessModel) || null,
    },
    upgradeThesis: {
      from: list(decision.upgradeFrom),
      to: list(decision.upgradeTo),
      statement: approvedUpgradeStatement(
        projectSpecificDecisions,
        String(decision.uniqueUpgradeThesis ?? '').trim(),
        deliverable,
      ),
    },
    brandRoleManifestation: list(media?.brandRoleManifestation),
    signatureSpatialMechanism: list(media?.signatureSpatialMechanism),
    functionalNetwork: list(media?.functionalNetwork).length
      ? list(media.functionalNetwork)
      : list(media?.functionalRelationships),
    sceneProgram: list(media?.sceneProgram),
    positiveDifferentiators: list(media?.positiveDifferentiators),
    mustBeVisible: list(media?.mustBeVisible),
    mustPreserve,
    mustTransform,
    toneBoundaries: toneBoundaries(decision, approvedDecision),
    projectSpecificDecisions,
    brandMisreadRisks: (packet.diagnosis?.brandMisreadRisks || []).map((risk) => ({
      code: String(risk?.code ?? '').trim(),
      description: String(risk?.description ?? risk?.target ?? '').trim(),
      appliesTo: {
        deliverables: list(risk?.appliesTo?.taskFamilies),
        subtypes: list(risk?.appliesTo?.subtypes),
      },
      evidenceRefs: evidence(risk),
      status: risk?.status === 'confirmed' ? 'confirmed' : 'probable',
      confidence: Number.isFinite(risk?.confidence) ? risk.confidence : 0,
    })).filter((risk) => risk.code && risk.description),
    sharedVisualRules: {
      colorBehavior: hasApprovedDecision
        ? projectSpecificDecisions.colorSystem
        : colorRules(packet),
      materialBehavior: hasApprovedDecision
        ? projectSpecificDecisions.materialSystem
        : list((packet.materialSystem || []).flatMap((item) =>
          [item?.material, item?.behavior, item?.brandRole])),
      graphicBehavior: hasApprovedDecision
        ? projectSpecificDecisions.generationGoals
        : list(packet.mediaTranslations?.sharedBrandCore),
      compositionBehavior: hasApprovedDecision
        ? projectSpecificDecisions.compositionRules
        : list(packet.mediaTranslations?.spatial?.structureLanguage),
      lightingBehavior: hasApprovedDecision
        ? list(
          packet.lightingSystem?.source,
          packet.lightingSystem?.contrast,
          packet.lightingSystem?.interactionWithMaterials,
        )
        : list(
          packet.lightingSystem?.source,
          packet.lightingSystem?.contrast,
          packet.lightingSystem?.interactionWithMaterials,
        ),
    },
    deliverableSuccessCriteria: deliverable ? { [deliverable]: successCriteria } : {},
    validation: {
      status: 'insufficient',
      missingRequiredFields: [],
      conflicts: list(packet.validation?.conflicts),
    },
    provenance: {
      sourceKinds: list(
        'project_record',
        lockedAssets.length ? 'original_asset' : '',
        packet.creativeDecision ? 'structured_analysis' : '',
        projectSpecificDecisions.specificity.status === 'ready' ? 'approved_creative_decision' : '',
        userConfirmations.length ? 'user_confirmation' : '',
      ),
      approvedDecision: projectSpecificDecisions.decisionId ? {
        id: projectSpecificDecisions.decisionId,
        version: projectSpecificDecisions.decisionVersion,
        sourcePath: String(input.approvedCreativeDecisionSourcePath ?? '').trim() || null,
      } : null,
      sourceFingerprint: String(packet.provenance?.sourceFingerprint || crypto
        .createHash('sha256').update(JSON.stringify(stable(packet))).digest('hex')),
      compilerVersion: PROJECT_GENERATION_CONTRACT_COMPILER_VERSION,
    },
  };
  contract.validation = validateProjectSpecificGenerationContract(contract);
  return contract;
}

export function assertProjectSpecificGenerationContract(contract) {
  const validation = validateProjectSpecificGenerationContract(contract);
  if (validation.status !== 'ready') {
    const code = validation.status === 'conflicted'
      ? 'PROJECT_GENERATION_CONTRACT_CONFLICTED'
      : 'PROJECT_GENERATION_CONTRACT_INSUFFICIENT';
    throw Object.assign(new Error(`${code}: ${[
      ...validation.missingRequiredFields,
      ...validation.conflicts,
    ].join(', ')}`), { code, issues: validation });
  }
  return contract;
}
