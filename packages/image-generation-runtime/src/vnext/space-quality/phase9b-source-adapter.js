// Phase 9B Source Adapter.
//
// Translates the current V5 VisualDecisionPacket (Analysis Intelligence) into
// the spatial layers the Phase 9B-quality compiler needs to emit a building-led
// prompt (Generation Intelligence). The adapter NEVER re-creates facts: it only
// reads structured V5 fields and shapes them into Phase 9B block inputs.
//
// Mapping (recovery doc §6):
//   spatialConcept + targetWorldview + uniqueUpgradeThesis + brandRoleManifestation
//     -> spatialIntent { experienceGoal, spatialStrategy[] }
//   structureLanguage + signatureSpatialMechanism + materialLanguage direction
//   + lightingLanguage + functionalNetwork
//     -> architectureLanguage { spatialPrinciples, architecturalCharacteristics,
//        materialDirection, lightDirection, spatialOrganization }
//   brandRoleManifestation + functionalRelationships + functionalNetwork
//   + sceneProgram + peopleBehavior + mustBeVisible + positiveDifferentiators
//     -> architectureFunctionBridge { commercialPurpose, spatialTranslation,
//        operationConstraints, humanExperience, commercialReality, conceptDriftGuards }
//   spatialConcept + signatureSpatialMechanism + structureLanguage
//   + functionalNetwork + sceneProgram
//     -> architecturalConcept / architectureDna
//
// It is fail-closed: if a required layer cannot be built from real V5 fields,
// it throws SPACE_PHASE9B_SOURCE_INSUFFICIENT with the missing fields, instead
// of emitting a generic ("premium / modern / professional") fallback.

const SPACE_PHASE9B_SOURCE_INSUFFICIENT = 'SPACE_PHASE9B_SOURCE_INSUFFICIENT';

function cleanList(...values) {
  const out = [];
  const seen = new Set();
  const visit = (v) => {
    if (Array.isArray(v)) { v.forEach(visit); return; }
    if (typeof v !== 'string') return;
    const c = v.trim().replace(/\s+/gu, ' ');
    const k = c.toLocaleLowerCase();
    if (c && !seen.has(k)) { seen.add(k); out.push(c); }
  };
  values.forEach(visit);
  return out;
}

function firstString(...values) {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

export function isSpacePhase9bInsufficient(err) {
  return Boolean(err && err.code === SPACE_PHASE9B_SOURCE_INSUFFICIENT);
}

/**
 * Adapt a V5 VisualDecisionPacket (+ task contract + project facts) into the
 * Phase 9B spatial layers.
 *
 * @param {object} input
 * @param {object} input.packet            V5 VisualDecisionPacket (schema 1.0)
 * @param {object} input.taskContract      vNext task contract
 * @param {object} [input.projectContext]  Project Visual Context 2.0 (fallback facts)
 * @returns {object} layers consumed by phase9b-space-compiler
 */
export function adaptPhase9bSource({ packet, taskContract, projectContext }) {
  if (!packet || packet.schemaVersion !== '1.0') {
    throw Object.assign(
      new Error(`${SPACE_PHASE9B_SOURCE_INSUFFICIENT}: V5 VisualDecisionPacket (schema 1.0) is required`),
      { code: SPACE_PHASE9B_SOURCE_INSUFFICIENT, missing: ['visualDecisionPacket'] },
    );
  }
  if (packet.validation?.hardFactStatus !== 'pass'
    || packet.validation?.executionDataStatus !== 'ready') {
    throw Object.assign(
      new Error(`${SPACE_PHASE9B_SOURCE_INSUFFICIENT}: packet validation not ready (hardFacts=${packet.validation?.hardFactStatus}, execution=${packet.validation?.executionDataStatus})`),
      { code: SPACE_PHASE9B_SOURCE_INSUFFICIENT, missing: ['packet.validation'] },
    );
  }

  const spatial = packet.mediaTranslations?.spatial || {};
  const projectFacts = packet.projectFacts || {};
  const creativeDecision = packet.creativeDecision || {};
  const colorSystem = packet.colorSystem || {};
  const materialSystem = Array.isArray(packet.materialSystem) ? packet.materialSystem : [];
  const lightingSystem = packet.lightingSystem || {};

  const missing = [];

  // ---- Spatial Intent ----
  const experienceGoal = firstString(
    spatial.spatialConcept,
    creativeDecision.uniqueUpgradeThesis,
    ...cleanList(creativeDecision.targetWorldview),
  );
  const spatialStrategy = cleanList(
    spatial.signatureSpatialMechanism,
    spatial.brandRoleManifestation,
    creativeDecision.targetWorldview,
  );
  if (!experienceGoal) missing.push('spatial.spatialConcept | creativeDecision.uniqueUpgradeThesis');
  if (spatialStrategy.length < 1) missing.push('spatial.signatureSpatialMechanism | spatial.brandRoleManifestation');

  // ---- Architecture Language ----
  const spatialPrinciples = cleanList(spatial.structureLanguage);
  const architecturalCharacteristics = cleanList(spatial.signatureSpatialMechanism);
  const materialDirection = materialSystem.map((m) => ({
    material: m.material,
    behavior: cleanList(m.behavior),
    brandRole: m.brandRole,
    forbidden: cleanList(m.forbidden),
  })).filter((m) => m.material && m.behavior.length);
  const lightDirection = {
    source: cleanList(lightingSystem.source),
    contrast: lightingSystem.contrast,
    interactionWithMaterials: cleanList(lightingSystem.interactionWithMaterials),
    forbidden: cleanList(lightingSystem.forbidden),
  };
  const spatialOrganization = cleanList(spatial.functionalNetwork, spatial.sceneProgram);
  if (spatialPrinciples.length < 1) missing.push('spatial.structureLanguage');
  if (spatialOrganization.length < 3) missing.push('spatial.functionalNetwork (>=3) | spatial.sceneProgram');

  // ---- Architecture Function Bridge ----
  const commercialPurpose = firstString(
    projectFacts.brandRole?.value,
    projectFacts.brandRole,
    creativeDecision.uniqueUpgradeThesis,
  );
  const spatialTranslation = cleanList(
    spatial.brandRoleManifestation,
    spatial.functionalNetwork,
  );
  const operationConstraints = cleanList(
    spatial.functionalRelationships,
    spatial.sceneProgram,
  );
  const humanExperience = cleanList(
    spatial.peopleBehavior,
    spatial.brandIntegration,
  );
  const commercialReality = cleanList(
    spatial.sceneProgram,
    spatial.mustBeVisible,
  );
  const conceptDriftGuards = cleanList(
    (packet.diagnosis?.brandMisreadRisks || [])
      .filter((r) => r.status === 'confirmed')
      .map((r) => r.description || r.target),
    creativeDecision.strategicNegatives,
  );
  if (!commercialPurpose) missing.push('projectFacts.brandRole | creativeDecision.uniqueUpgradeThesis');
  if (spatialTranslation.length < 1) missing.push('spatial.brandRoleManifestation | functionalNetwork');

  // ---- Architectural Concept / DNA ----
  const architecturalConcept = {
    primary: firstString(spatial.spatialConcept, creativeDecision.uniqueUpgradeThesis),
    signatureMechanisms: cleanList(spatial.signatureSpatialMechanism),
    structureLanguage: cleanList(spatial.structureLanguage),
  };
  if (!architecturalConcept.primary) missing.push('spatial.spatialConcept');

  // ---- Material / Lighting / Color (V5 systems) ----
  const materials = materialDirection;
  const lighting = lightDirection;
  const color = {
    primary: Array.isArray(colorSystem.primary) ? colorSystem.primary : [],
    secondary: Array.isArray(colorSystem.secondary) ? colorSystem.secondary : [],
    accent: Array.isArray(colorSystem.accent) ? colorSystem.accent : [],
    forbidden: cleanList(colorSystem.forbidden),
  };

  // ---- Composition / rendering guidance (task contract + locked behavior) ----
  const composition = {
    aspectRatio: taskContract?.aspectRatio,
    scene: taskContract?.scene,
    mustBeVisible: cleanList(spatial.mustBeVisible),
    positiveDifferentiators: cleanList(spatial.positiveDifferentiators),
  };

  // ---- Negatives ----
  const negatives = cleanList(
    taskContract?.mustAvoid,
    (packet.diagnosis?.brandMisreadRisks || [])
      .filter((r) => r.status === 'confirmed')
      .map((r) => r.description || r.target),
    materialSystem.flatMap((m) => m.forbidden || []),
    lightingSystem.forbidden,
    colorSystem.forbidden,
  );

  if (missing.length) {
    throw Object.assign(
      new Error(`${SPACE_PHASE9B_SOURCE_INSUFFICIENT}: ${missing.join('; ')}`),
      { code: SPACE_PHASE9B_SOURCE_INSUFFICIENT, missing },
    );
  }

  return {
    projectIdentity: {
      brandName: projectFacts.brandName?.value || projectContext?.brandCore?.name || '',
      industry: projectFacts.industry?.value || projectContext?.brandCore?.industry || '',
      brandRole: projectFacts.brandRole?.value || projectFacts.brandRole || '',
      audience: cleanList(projectContext?.brandCore?.audience),
    },
    task: {
      deliverableFamily: taskContract?.deliverableFamily,
      subtype: taskContract?.subtype,
      shot: taskContract?.shot,
      currentInstruction: taskContract?.currentInstruction,
      aspectRatio: taskContract?.aspectRatio,
    },
    spatialIntent: { experienceGoal, spatialStrategy },
    architectureLanguage: {
      spatialPrinciples,
      architecturalCharacteristics,
      materialDirection,
      lightDirection,
      spatialOrganization,
    },
    architectureFunctionBridge: {
      commercialPurpose,
      spatialTranslation,
      operationConstraints,
      humanExperience,
      commercialReality,
      conceptDriftGuards,
    },
    architecturalConcept,
    materials,
    lighting,
    color,
    composition,
    negatives,
    // Raw pass-through for trace / optional use.
    _raw: {
      functionalNetwork: cleanList(spatial.functionalNetwork),
      sceneProgram: cleanList(spatial.sceneProgram),
      brandRoleManifestation: cleanList(spatial.brandRoleManifestation),
      signatureSpatialMechanism: cleanList(spatial.signatureSpatialMechanism),
      mustBeVisible: cleanList(spatial.mustBeVisible),
      positiveDifferentiators: cleanList(spatial.positiveDifferentiators),
    },
  };
}

export const SPACE_QUALITY_SOURCE_ADAPTER_VERSION = '1.0.0';
