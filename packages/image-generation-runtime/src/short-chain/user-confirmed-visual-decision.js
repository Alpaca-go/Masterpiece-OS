import crypto from 'node:crypto';

function list(value) {
  return [...new Set((Array.isArray(value) ? value : [])
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim().replace(/\s+/gu, ' '))
    .filter(Boolean))];
}

function record(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function assertSpatial(value) {
  const spatial = record(value);
  const missing = [
    !String(spatial.spatialConcept ?? '').trim() && 'spatialConcept',
    !list(spatial.structureLanguage).length && 'structureLanguage',
    !Array.isArray(spatial.materialLanguage) && 'materialLanguage',
    !list(spatial.lightingLanguage?.source).length && 'lightingLanguage.source',
    !list(spatial.sceneProgram).length && 'sceneProgram',
    !list(spatial.functionalRelationships).length && 'functionalRelationships',
    !list(spatial.brandRoleManifestation).length && 'brandRoleManifestation',
    !list(spatial.signatureSpatialMechanism).length && 'signatureSpatialMechanism',
    !list(spatial.functionalNetwork).length && 'functionalNetwork',
    !list(spatial.positiveDifferentiators).length && 'positiveDifferentiators',
    !list(spatial.mustBeVisible).length && 'mustBeVisible',
  ].filter(Boolean);
  if (missing.length) {
    throw Object.assign(new Error(
      `USER_CONFIRMED_VISUAL_DECISION_INVALID: ${missing.join(', ')}`,
    ), { code: 'USER_CONFIRMED_VISUAL_DECISION_INVALID', issues: missing });
  }
  return spatial;
}

export function applyUserConfirmedVisualDecision(packet, confirmation, projectId, deliverableFamily = 'space') {
  if (!confirmation) return { packet, approvedCreativeDecision: null, confirmation: null };
  if (confirmation.schemaVersion !== '1.0'
    || confirmation.status !== 'confirmed'
    || confirmation.projectId !== projectId) {
    throw Object.assign(new Error(
      'USER_CONFIRMED_VISUAL_DECISION_INVALID: project/schema/status mismatch',
    ), { code: 'USER_CONFIRMED_VISUAL_DECISION_INVALID' });
  }
  const families = list(confirmation.appliesTo?.deliverableFamilies);
  if (families.length && !families.includes(deliverableFamily)) {
    return { packet, approvedCreativeDecision: null, confirmation: null };
  }
  const creativeDecision = record(confirmation.creativeDecision);
  const spatial = assertSpatial(confirmation.spatialTranslation);
  const abstractions = Array.isArray(confirmation.abstractions)
    ? confirmation.abstractions : packet.abstractions;
  const risks = Array.isArray(confirmation.brandMisreadRisks)
    ? confirmation.brandMisreadRisks : [];
  const sourceFingerprint = crypto.createHash('sha256')
    .update(JSON.stringify({
      packet: packet.provenance?.sourceFingerprint,
      confirmation,
    }))
    .digest('hex');
  const effectivePacket = {
    ...packet,
    projectFacts: {
      ...packet.projectFacts,
      brandRole: confirmation.projectIdentity?.brandRole ? {
        value: confirmation.projectIdentity.brandRole,
        source: 'user_confirmation',
        evidenceRefs: list(confirmation.evidenceRefs),
        confidence: 1,
        status: 'confirmed',
      } : packet.projectFacts?.brandRole,
    },
    diagnosis: {
      ...packet.diagnosis,
      brandMisreadRisks: [
        ...(packet.diagnosis?.brandMisreadRisks || []),
        ...risks,
      ],
    },
    creativeDecision: {
      ...packet.creativeDecision,
      ...creativeDecision,
      toneBoundaries: Array.isArray(creativeDecision.toneBoundaries)
        ? creativeDecision.toneBoundaries
        : packet.creativeDecision?.toneBoundaries,
    },
    abstractions,
    mediaTranslations: {
      ...packet.mediaTranslations,
      spatial: {
        ...spatial,
        status: 'ready',
      },
    },
    colorSystem: spatial.colorBehavior,
    materialSystem: spatial.materialLanguage,
    lightingSystem: spatial.lightingLanguage,
    provenance: {
      ...packet.provenance,
      createdFrom: list(packet.provenance?.createdFrom, confirmation.evidenceRefs),
      userConfirmationId: confirmation.id,
      userConfirmationSource: confirmation.sourceDocument,
      sourceFingerprint,
    },
  };
  return {
    packet: effectivePacket,
    approvedCreativeDecision: confirmation.approvedCreativeDecision || null,
    confirmation: {
      id: confirmation.id,
      sourceDocument: confirmation.sourceDocument,
      sourceFingerprint,
    },
  };
}
