import crypto from 'node:crypto';

export const PROJECT_GENERATION_CONTRACT_COMPILER_VERSION = '1.0.0';

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
    colors.forbidden,
  );
}

function toneBoundaries(decision) {
  const explicit = (Array.isArray(decision?.toneBoundaries) ? decision.toneBoundaries : [])
    .flatMap((item) => item?.target
      ? [{ target: String(item.target).trim(), avoid: list(item.avoid) }]
      : []);
  if (explicit.length) return explicit;

  const avoid = list(decision?.strategicNegatives, decision?.upgradeFrom);
  return list(decision?.targetWorldview).map((target) => ({ target, avoid }));
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
  const lockedAssets = input.lockedAssets || packet.lockedAssets || [];
  const userConfirmations = input.userConfirmations || [];
  const deliverable = String(input.deliverable || '').trim();
  const media = deliverable ? packet.mediaTranslations?.[deliverable] : null;

  const mustPreserve = [
    ...lockedAssets.map((asset) => ({
      value: String(asset?.value ?? '').trim(),
      source: asset?.lockSource === 'user_confirmed' ? 'user_confirmation' : 'locked_asset',
      evidenceRefs: evidence(asset),
    })),
    ...list(decision.preserveCore).map((value) => ({
      value,
      source: 'confirmed_fact',
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
      statement: String(decision.uniqueUpgradeThesis ?? '').trim(),
    },
    mustPreserve,
    mustTransform,
    toneBoundaries: toneBoundaries(decision),
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
      colorBehavior: colorRules(packet),
      materialBehavior: list((packet.materialSystem || []).flatMap((item) =>
        [item?.material, item?.behavior, item?.brandRole])),
      graphicBehavior: list(packet.mediaTranslations?.sharedBrandCore),
      compositionBehavior: list(packet.mediaTranslations?.spatial?.structureLanguage),
      lightingBehavior: list(
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
        userConfirmations.length ? 'user_confirmation' : '',
      ),
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
