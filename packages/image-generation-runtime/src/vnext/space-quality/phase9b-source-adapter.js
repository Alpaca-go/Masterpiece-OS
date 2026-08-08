// Phase 9B Source Adapter.
//
// Translates the current V5 VisualDecisionPacket (Analysis Intelligence) into
// the spatial layers the Phase 9B-quality compiler needs to emit a building-led
// prompt (Generation Intelligence). The adapter NEVER re-creates facts: it only
// reads structured V5 fields and shapes them into Phase 9B block inputs.
//
// R8.5 redirected (post-R8.4 archaeology): architecture blocks now consume
// the action-verb IR (strategy / form / organization) produced by the
// semantic rewrite pass, NOT raw V5 Chinese prose. This restores the
// P9B-B register that reached 5/5 Expressiveness:
//   - Spatial Strategy          -> short English direction keywords
//   - Architectural Characteristics -> English construction sentences
//   - Spatial Organization      -> English circulation / privacy phrases
//
// Mapping (recovery doc §6):
//   spatialConcept + targetWorldview + uniqueUpgradeThesis + brandRoleManifestation
//     -> spatialIntent { experienceGoal, spatialStrategy[] }
//   semantic.architectureStrategy / architectureForm / architectureOrganization
//     -> architectureLanguage { spatialPrinciples, architecturalCharacteristics,
//        materialDirection, lightDirection, spatialOrganization }
//   brandRoleManifestation + functionalRelationships + functionalNetwork
//   + sceneProgram + peopleBehavior + mustBeVisible + positiveDifferentiators
//     -> architectureFunctionBridge { commercialPurpose, spatialTranslation,
//        operationConstraints, humanExperience, commercialReality, conceptDriftGuards }
//   spatialConcept + semantic.architectureForm
//     -> architecturalConcept / architectureDna
//
// It is fail-closed: if a required layer cannot be built from real V5 fields,
// it throws SPACE_PHASE9B_SOURCE_INSUFFICIENT with the missing fields, instead
// of emitting a generic ("premium / modern / professional") fallback.

const SPACE_PHASE9B_SOURCE_INSUFFICIENT = 'SPACE_PHASE9B_SOURCE_INSUFFICIENT';

import { compileSpatialMechanisms, classifyPhrase, SEMANTIC_CLASS } from './semantic/index.js';

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

  // ---- R8.5.1 + R8.5 redirected semantic pipeline ----
  // classify -> motif-strip -> action-verb rewrite (strategy/form/organization).
  const semantic = compileSpatialMechanisms(packet);

  // Field-level exclusion: a few V5 fields are always brand expression and
  // must never enter architectureMechanisms regardless of their internal shape.
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

  // ---- Build clean functional / program lists (R8.5: no motif leakage) ----
  // functionalNetwork and sceneProgram are FUNCTIONAL content — they describe
  // zones and flow, not building form. They must NEVER be rendered into
  // architecture blocks. We keep them for the functional blocks only, and
  // strip any items that carry brand-motif / identity / color-geometry content.
  const rawFunctionalNetwork = cleanList(spatial.functionalNetwork);
  const rawSceneProgram = cleanList(spatial.sceneProgram);

  // mustBeVisible is a composition/focal-hierarchy field. In R8.4 it leaked
  // motif sentences (abstract motif-textured wall) and in-scene identity
  // (illuminated logo) directly into the prompt. We split it:
  //   - identity-bearing items (logo / wordmark / slogan) -> BRAND translation
  //     only (they are composited post-generation, never drawn by the model)
  //   - motif-bearing items -> brand translation only
  //   - genuine spatial focal items (reception desk relationship, glass entry
  //     visual penetration) -> composition mustBeVisible
  const rawMustBeVisible = cleanList(spatial.mustBeVisible);
  const { safe: compositionMustBeVisible, brand: brandMustBeVisible } = splitMustBeVisible(rawMustBeVisible);

  const missing = [];

  // ---- Spatial Intent ----
  // Experience goal: spatial concept with motif prefix stripped.
  // Spatial Strategy: English direction keywords from the action-verb IR,
  // NOT raw V5 Chinese prose. targetWorldview items are brand expression and
  // are routed to brand, not strategy.
  const rawExperienceGoal = firstString(
    spatial.spatialConcept,
    creativeDecision.uniqueUpgradeThesis,
    ...cleanList(creativeDecision.targetWorldview),
  );
  const experienceGoal = normalizeConceptPrimary(rawExperienceGoal) || rawExperienceGoal;
  const spatialStrategy = semantic.architectureStrategy.slice(0, 6);
  if (!experienceGoal) missing.push('spatial.spatialConcept | creativeDecision.uniqueUpgradeThesis');
  if (spatialStrategy.length < 1) {
    missing.push('semantic.architectureStrategy (no spatial signal detected in V5 spatial fields)');
  }

  // ---- Architecture Language ----
  // All three lists come from the action-verb IR, not raw V5 fields.
  // spatialPrinciples = strategy keywords (high-level direction)
  // architecturalCharacteristics = form sentences (construction language)
  // spatialOrganization = organization phrases (circulation / privacy)
  const spatialPrinciples = semantic.architectureStrategy.slice(0, 8);
  const architecturalCharacteristics = semantic.architectureForm.slice(0, 10);
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
  const spatialOrganization = semantic.architectureOrganization.slice(0, 8);
  if (spatialPrinciples.length < 1) missing.push('semantic.architectureStrategy');
  if (architecturalCharacteristics.length < 1) missing.push('semantic.architectureForm');

  // ---- Architecture Function Bridge ----
  // This block translates architecture -> commercial action. We filter every
  // list through keepFunctionalItem() so that motif sentences, in-scene
  // identity (logo/slogan), and color-geometry coupling do not leak into
  // functional blocks. Those items route to brand translation instead.
  const commercialPurpose = firstString(
    projectFacts.brandRole?.value,
    projectFacts.brandRole,
    creativeDecision.uniqueUpgradeThesis,
  );
  const spatialTranslation = cleanList(
    spatial.brandRoleManifestation,
    rawFunctionalNetwork,
  ).filter(keepFunctionalItem);
  // Operation constraints are HARD spatial/operational relationships
  // (functionalRelationships), NOT the scene-program node list — program
  // nodes already render once under functional_requirement. Copying short
  // node labels ("迎宾", "美学咨询") here duplicated them across blocks.
  const operationConstraints = cleanList(
    spatial.functionalRelationships,
  ).filter(keepFunctionalItem);
  const humanExperience = cleanList(
    spatial.peopleBehavior,
    spatial.brandIntegration,
  ).filter(keepFunctionalItem);
  // Commercial reality is the differentiator/atmosphere statements, not the
  // program node list (same dedup rationale as operationConstraints).
  const commercialReality = cleanList(
    spatial.positiveDifferentiators,
  ).filter(keepFunctionalItem);
  const conceptDriftGuards = cleanList(
    (packet.diagnosis?.brandMisreadRisks || [])
      .filter((r) => r.status === 'confirmed')
      .map((r) => r.description || r.target),
    creativeDecision.strategicNegatives,
  );
  if (!commercialPurpose) missing.push('projectFacts.brandRole | creativeDecision.uniqueUpgradeThesis');
  if (spatialTranslation.length < 1) missing.push('spatial.brandRoleManifestation | functionalNetwork');

  // ---- Architectural Concept / DNA ----
  // primary: normalized spatial concept (motif title stripped).
  // R8.5 redirected: each architecture block uses a DISTINCT register so the
  // same action-verb IR is not copied across blocks (R8.4 found one sentence
  // rendered up to 4x). The Architecture Language block owns the full
  // strategy/form/organization lists; the Concept block is the short
  // headline + strategy-tag distillation; DNA is the 4-line summary.
  const conceptPrimary = firstString(spatial.spatialConcept, creativeDecision.uniqueUpgradeThesis);
  const conceptPrimaryNormalized = normalizeConceptPrimary(conceptPrimary);
  const architecturalConcept = {
    primary: conceptPrimaryNormalized || conceptPrimary,
    structureLanguage: semantic.architectureStrategy.slice(0, 4),
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

  // ---- Composition / rendering guidance ----
  // mustBeVisible is now split: only genuine spatial focal items survive;
  // logo/wordmark/motif items are routed to brand translation (post-composite).
  const composition = {
    aspectRatio: taskContract?.aspectRatio,
    scene: taskContract?.scene,
    mustBeVisible: compositionMustBeVisible,
    positiveDifferentiators: cleanList(spatial.positiveDifferentiators),
  };

  // ---- Negatives ----
  // R8.5 redirected: trim the negative block. We keep only V5-sourced
  // negatives (material/lighting/color forbidden + confirmed misread risks +
  // task mustAvoid). The universal BASE_NEGATIVES in the compiler handle
  // brand-identity-in-scene and motif-as-architecture guards.
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
    // ---- R8.5 semantic IR (architecture / brand split + action verbs) ----
    semantic: {
      architectureSemantics: semantic.architectureSemantics,
      architectureActions: semantic.architectureActions,
      architectureStrategy: semantic.architectureStrategy,
      architectureForm: semantic.architectureForm,
      architectureOrganization: semantic.architectureOrganization,
      architectureRewrite: semantic.architectureRewrite,
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
    // Raw pass-through for trace / audit and for blocks that legitimately
    // render functional/program content (functional_requirement, brand).
    // Architecture block rendering no longer reads these lists.
    _raw: {
      functionalNetwork: rawFunctionalNetwork.filter(keepFunctionalItem),
      sceneProgram: rawSceneProgram.filter(keepFunctionalItem),
      // Brand translation block: motif-bearing items + identity items
      // extracted from mustBeVisible + raw brand-role sentences. Deduped.
      brandRoleManifestation: dedupeStrings([
        ...semantic.brandMotifSemantics.map((m) => m.text),
        ...brandMustBeVisible,
        ...cleanList(spatial.brandRoleManifestation),
      ]),
      signatureSpatialMechanism: cleanList(spatial.signatureSpatialMechanism),
      mustBeVisible: rawMustBeVisible,
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

// splitMustBeVisible: separate genuine spatial focal requirements (reception
// desk, glass entry visual penetration) from brand-identity / motif items
// (illuminated logo, slogan text, motif wall). Identity/motif items route to
// brand translation only — they are composited post-generation or expressed as
// mechanism, never drawn in-scene by the model.
function splitMustBeVisible(items) {
  const safe = [];
  const brand = [];
  const identityRe = /logo|wordmark|logotype|slogan|发光字|标识|标志|徽章|吉祥物|艺术字|\blogo\b/iu;
  for (const item of items) {
    const text = String(item || '').trim();
    if (!text) continue;
    const analysis = classifyPhrase(text, 'mustBeVisible');
    // mustBeVisible is a composition/focal-hierarchy field. Any item that
    // carries brand identity, a motif literal, a color-geometry coupling,
    // or is AMBIGUOUS (motif + architecture mixed) must route to brand
    // translation only — it is a brand-visibility requirement, not a
    // building mechanism the model should construct. The motif-to-mechanism
    // translation happens in the Brand Translation block.
    if (analysis.classification === SEMANTIC_CLASS.DECORATIVE_IDENTITY
        || analysis.classification === SEMANTIC_CLASS.BRAND_MOTIF
        || analysis.classification === SEMANTIC_CLASS.COLOR_GEOMETRY
        || analysis.classification === SEMANTIC_CLASS.COLOR_ACCENT
        || analysis.classification === SEMANTIC_CLASS.AMBIGUOUS
        || analysis.motifHits.length > 0
        || identityRe.test(text)) {
      brand.push(text);
    } else {
      safe.push(text);
    }
  }
  return { safe, brand };
}

// keepFunctionalItem: filter for functional / commercial-reality blocks
// (spatialTranslation, operationConstraints, humanExperience, commercialReality,
// functional_requirement). Returns true for items that describe operational,
// program, or human-experience content; false for motif literals, in-scene
// identity, color-geometry coupling, or ambiguous motif+architecture phrases
// (those belong in brand translation, not functional blocks).
function keepFunctionalItem(item) {
  const text = String(item || '').trim();
  if (!text) return false;
  const analysis = classifyPhrase(text, 'functionalNetwork');
  // Functional blocks describe operations, program, and human experience.
  // They must NOT contain motif literals, in-scene identity, color-geometry
  // coupling, ambiguous motif+architecture phrases, or standalone color
  // accents (those are brand-decoration content, not operational reality).
  if (analysis.classification === SEMANTIC_CLASS.BRAND_MOTIF
      || analysis.classification === SEMANTIC_CLASS.DECORATIVE_IDENTITY
      || analysis.classification === SEMANTIC_CLASS.COLOR_GEOMETRY
      || analysis.classification === SEMANTIC_CLASS.COLOR_ACCENT
      || analysis.classification === SEMANTIC_CLASS.AMBIGUOUS) {
    return false;
  }
  if (analysis.motifHits && analysis.motifHits.length > 0) return false;
  return true;
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
  t = t.replace(/[（(][^）)]*[）)]/gu, '').trim();
  const sep = t.search(/\s*(?:-{1,2}|—|：|:)\s*/u);
  if (sep > 0) {
    const head = t.slice(0, sep).trim();
    const tail = t.slice(sep).replace(/^\s*(?:-{1,2}|—|：|:)\s*/u, '').trim();
    const motifRe = /[\u7fce\u7fbd\u6bdb\u96c0\u82b1\u7fbd\u83b2]/u;
    if (head.length <= 16 && motifRe.test(head) && tail && tail.length >= 2) return tail;
  }
  return t;
}

export const SPACE_QUALITY_SOURCE_ADAPTER_VERSION = '1.2.1';
