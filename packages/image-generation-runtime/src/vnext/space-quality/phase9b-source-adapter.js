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

import { compileSpatialMechanisms, SEMANTIC_CLASS } from './semantic/index.js';

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

  // ---- R8.5.1 Semantic Separation (compiler-time IR only) ----
  // The architecture-side lists below are derived from the spatial compiler,
  // which strips literal brand motifs and color-geometry coupling while
  // preserving the abstract spatial property. Brand motifs and color terms
  // route separately to brandMotifSemantics / colorAccentSemantics. The
  // original raw V5 fields remain in `_raw` for trace/audit only and are no
  // longer used to render architecture blocks.
  const semantic = compileSpatialMechanisms(packet);

  // Field-level exclusion: a few V5 fields are always brand expression and
  // must never enter architectureMechanisms regardless of their internal
  // shape. uniqueUpgradeThesis is a long brand-narrative paragraph; the
  // spatial compiler can mistake its architectural vocabulary for
  // architectural content.
  const MECHANIC_EXCLUDED_FIELDS = new Set([
    'uniqueUpgradeThesis',
    'targetWorldview',
  ]);
  for (const m of semantic.architectureSemantics) {
    if (MECHANIC_EXCLUDED_FIELDS.has(m.sourceField)) {
      semantic.brandMotifSemantics.push({
        text: m.text,
        sourceField: m.sourceField,
        reason: 'excluded_field',
        mechanismId: m.mechanismId,
      });
    }
  }
  semantic.architectureSemantics = semantic.architectureSemantics.filter(
    (m) => !MECHANIC_EXCLUDED_FIELDS.has(m.sourceField),
  );

  const missing = [];

  // ---- Spatial Intent ----
  // Experience goal is the spatial concept, but the motif prefix is stripped
  // (R8.5.1) so the experience direction does not re-introduce the literal
  // brand symbol. The strategy is now architecture-side mechanisms only.
  const rawExperienceGoal = firstString(
    spatial.spatialConcept,
    creativeDecision.uniqueUpgradeThesis,
    ...cleanList(creativeDecision.targetWorldview),
  );
  const experienceGoal = normalizeConceptPrimary(rawExperienceGoal) || rawExperienceGoal;
  const spatialStrategy = [
    ...semantic.architectureSemantics.map((m) => m.text),
    ...cleanList(creativeDecision.targetWorldview),
  ];
  if (!experienceGoal) missing.push('spatial.spatialConcept | creativeDecision.uniqueUpgradeThesis');
  if (spatialStrategy.length < 1) {
    missing.push('semantic.architectureSemantics | creativeDecision.targetWorldview');
  }

  // ---- Architecture Language ----
  // spatialPrinciples: still derived from structureLanguage (always
  // architectural), but with a brand-motif filter as a safety net.
  const spatialPrinciples = cleanList(spatial.structureLanguage);
  const architecturalCharacteristics = semantic.architectureSemantics.map((m) => m.text);
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
  // primary: still the spatial concept (stripped to its non-motif essence via
  //   the normalizer so a brand-symbol title like "\u7fce\u7fbd\u4e4b\u5883" doesn't become the
  //   architecture concept's identity). signatureMechanisms: ONLY architecture
  //   mechanisms from the semantic compiler.
  const conceptPrimary = firstString(spatial.spatialConcept, creativeDecision.uniqueUpgradeThesis);
  const conceptPrimaryNormalized = normalizeConceptPrimary(conceptPrimary);
  const architecturalConcept = {
    primary: conceptPrimaryNormalized || conceptPrimary,
    signatureMechanisms: semantic.architectureSemantics.map((m) => m.text),
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
    // ---- R8.5.1 semantic IR (architecture / brand split) ----
    semantic: {
      architectureSemantics: semantic.architectureSemantics,
      brandMotifSemantics: semantic.brandMotifSemantics,
      colorAccentSemantics: semantic.colorAccentSemantics,
      functionalSemantics: semantic.functionalSemantics,
      decorativeIdentitySemantics: semantic.decorativeIdentitySemantics,
      colorGeometryCouplingRisk: semantic.colorGeometryCouplingRisk,
      provenance: {
        records: semantic.provenance.records,
        summary: semantic.provenance.summary,
        version: semantic.provenance.provenanceVersion,
      },
    },
    // Raw pass-through for trace / audit. Architecture block rendering no
    // longer reads these lists directly — they are kept for the brand block
    // and for human-facing evaluation only.
    _raw: {
      functionalNetwork: cleanList(spatial.functionalNetwork),
      sceneProgram: cleanList(spatial.sceneProgram),
      // Brand translation block: motif-bearing items plus raw brand-role
      // sentences. We dedupe (case-insensitive) to avoid double-rendering.
      brandRoleManifestation: dedupeStrings([
        ...semantic.brandMotifSemantics.map((m) => m.text),
        ...cleanList(spatial.brandRoleManifestation),
      ]),
      signatureSpatialMechanism: cleanList(spatial.signatureSpatialMechanism),
      mustBeVisible: cleanList(spatial.mustBeVisible),
      positiveDifferentiators: cleanList(spatial.positiveDifferentiators),
    },
  };
}

function dedupeStrings(list) {
  const seen = new Set();
  const out = [];
  for (const t of list) {
    const k = String(t || '').toLocaleLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

// normalizeConceptPrimary: the V5 `spatialConcept` is often a brand-poetic
// title (e.g. "<motif-title> (Realm of <motif>) - 沉浸式美学空间"). When used
// as the architecture concept's PRIMARY identity, it would re-introduce the
// motif as the headline. We strip the leading motif title (and any
// parenthetical brand-poetic English names) so the concept reads as an
// architectural direction without the brand symbol at the top.
function normalizeConceptPrimary(s) {
  if (typeof s !== 'string') return '';
  let t = s.trim();
  // Drop parentheticals anywhere in the lead (e.g. "(Realm of Feathers)").
  t = t.replace(/[（(][^）)]*[）)]/gu, '').trim();
  // If the first segment (before " - " / " — " / " ： " / " : ") is itself
  // a brand-poetic title (contains motif chars, ≤16 chars), prefer the
  // longer architectural/experiential tail.
  const sep = t.search(/\s*(?:-{1,2}|—|：|:)\s*/u);
  if (sep > 0) {
    const head = t.slice(0, sep).trim();
    const tail = t.slice(sep).replace(/^\s*(?:-{1,2}|—|：|:)\s*/u, '').trim();
    const motifRe = /[\u7fce\u7fbd\u6bdb\u96c0\u82b1\u7fbd\u83b2]/u;
    if (head.length <= 16 && motifRe.test(head) && tail && tail.length >= 2) return tail;
  }
  return t;
}

export const SPACE_QUALITY_SOURCE_ADAPTER_VERSION = '1.1.0';
