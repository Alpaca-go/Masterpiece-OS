const SPACE_PHASE9B_SOURCE_INSUFFICIENT = "SPACE_PHASE9B_SOURCE_INSUFFICIENT";
import {
  compileSpatialMechanisms,
  classifyPhrase,
  sanitizeBrandManifestation,
  sanitizeMaterials,
  sanitizeLighting,
  sanitizeDifferentiators,
  SEMANTIC_CLASS,
  MECHANISM_PROVENANCE_VERSION,
  demoteDecorativeObjectFromFunctionalLayer,
  resolveSpatialColorRole
} from "./semantic/index.js";
import { applyContinuationProgramOverride } from "./continuation/apply-continuation-program-override.js";
import {
  resolveTargetFunctionalProgram,
  viewStrategyForScene
} from "./continuation/target-functional-programs.js";
import {
  buildTargetSceneProjection,
  isKnownTargetScene,
  projectBrandManifestationToTargetScene,
  resolveTargetViewStrategy
} from "./scene-projection/target-scene-projection.js";
function cleanList(...values) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  const visit = (v) => {
    if (Array.isArray(v)) {
      v.forEach(visit);
      return;
    }
    if (typeof v !== "string") return;
    const c = v.trim().replace(/\s+/gu, " ");
    const k = c.toLocaleLowerCase();
    if (c && !seen.has(k)) {
      seen.add(k);
      out.push(c);
    }
  };
  values.forEach(visit);
  return out;
}
function firstString(...values) {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}
function isSpaceSourceInsufficient(err) {
  return Boolean(err && err.code === SPACE_PHASE9B_SOURCE_INSUFFICIENT);
}
function adaptSpaceSource({ packet, taskContract, projectContext }) {
  if (!packet || packet.schemaVersion !== "1.0") {
    throw Object.assign(
      new Error(`${SPACE_PHASE9B_SOURCE_INSUFFICIENT}: V5 VisualDecisionPacket (schema 1.0) is required`),
      { code: SPACE_PHASE9B_SOURCE_INSUFFICIENT, missing: ["visualDecisionPacket"] }
    );
  }
  if (packet.validation?.hardFactStatus !== "pass" || packet.validation?.executionDataStatus !== "ready") {
    throw Object.assign(
      new Error(`${SPACE_PHASE9B_SOURCE_INSUFFICIENT}: packet validation not ready (hardFacts=${packet.validation?.hardFactStatus}, execution=${packet.validation?.executionDataStatus})`),
      { code: SPACE_PHASE9B_SOURCE_INSUFFICIENT, missing: ["packet.validation"] }
    );
  }
  const spatial = packet.mediaTranslations?.spatial || {};
  const projectFacts = packet.projectFacts || {};
  const creativeDecision = packet.creativeDecision || {};
  const colorSystem = packet.colorSystem || {};
  const materialSystem = Array.isArray(packet.materialSystem) ? packet.materialSystem : [];
  const lightingSystem = packet.lightingSystem || {};
  const semantic = compileSpatialMechanisms(packet);
  const MECHANIC_EXCLUDED_FIELDS = /* @__PURE__ */ new Set([
    "uniqueUpgradeThesis",
    "targetWorldview"
  ]);
  for (const m of semantic.architectureSemantics) {
    if (MECHANIC_EXCLUDED_FIELDS.has(m.sourceField)) {
      semantic.brandMotifSemantics.push({
        text: m.text,
        sourceField: m.sourceField,
        reason: "excluded_field",
        mechanismId: m.mechanismId
      });
    }
  }
  semantic.architectureSemantics = semantic.architectureSemantics.filter(
    (m) => !MECHANIC_EXCLUDED_FIELDS.has(m.sourceField)
  );
  const rawFunctionalNetwork = cleanList(spatial.functionalNetwork);
  const rawSceneProgram = cleanList(spatial.sceneProgram);
  const rawMustBeVisible = cleanList(spatial.mustBeVisible);
  const { safe: compositionMustBeVisible, brand: brandMustBeVisible } = splitMustBeVisible(rawMustBeVisible);
  const missing = [];
  // Persisted packets can carry a stale ready flag from before validation.
  for (const field of ["signatureSpatialMechanism", "functionalNetwork", "functionalRelationships"]) {
    if (!cleanList(spatial[field]).length) missing.push(`spatial.${field}`);
  }
  const rawExperienceGoal = firstString(
    spatial.spatialConcept,
    creativeDecision.uniqueUpgradeThesis,
    ...cleanList(creativeDecision.targetWorldview)
  );
  const experienceGoal = normalizeConceptPrimary(rawExperienceGoal) || rawExperienceGoal;
  const spatialStrategy = semantic.architectureStrategy.slice(0, 6);
  if (!experienceGoal) missing.push("spatial.spatialConcept | creativeDecision.uniqueUpgradeThesis");
  if (spatialStrategy.length < 1) {
    missing.push("semantic.architectureStrategy (no spatial signal detected in V5 spatial fields)");
  }
  const spatialPrinciples = semantic.architectureStrategy.slice(0, 8);
  const architecturalCharacteristics = semantic.architectureForm.slice(0, 10);
  const materialDirection = sanitizeMaterials(materialSystem.map((m) => ({
    material: m.material,
    behavior: cleanList(m.behavior),
    brandRole: m.brandRole,
    forbidden: cleanList(m.forbidden)
  })).filter((m) => m.material && m.behavior.length));
  const lightDirection = sanitizeLighting({
    source: cleanList(lightingSystem.source),
    contrast: lightingSystem.contrast,
    interactionWithMaterials: cleanList(lightingSystem.interactionWithMaterials),
    forbidden: cleanList(lightingSystem.forbidden)
  });
  const spatialOrganization = semantic.architectureOrganization.slice(0, 8);
  if (spatialPrinciples.length < 1) missing.push("semantic.architectureStrategy");
  if (architecturalCharacteristics.length < 1) missing.push("semantic.architectureForm");
  const commercialPurpose = firstString(
    projectFacts.brandRole?.value,
    projectFacts.brandRole,
    creativeDecision.uniqueUpgradeThesis
  );
  const spatialTranslation = demoteFunctionalList(
    cleanList(spatial.brandRoleManifestation, rawFunctionalNetwork),
    "functionalRelationships"
  );
  const operationConstraints = demoteFunctionalList(
    cleanList(spatial.functionalRelationships),
    "functionalRelationships"
  );
  const humanExperience = demoteFunctionalList(
    cleanList(spatial.peopleBehavior, spatial.brandIntegration),
    "functionalRelationships"
  );
  const commercialReality = demoteFunctionalList(
    cleanList(spatial.positiveDifferentiators),
    "functionalRelationships"
  );
  const conceptDriftGuards = cleanList(
    (packet.diagnosis?.brandMisreadRisks || []).filter((r) => r.status === "confirmed").map((r) => r.description || r.target),
    creativeDecision.strategicNegatives
  );
  if (!commercialPurpose) missing.push("projectFacts.brandRole | creativeDecision.uniqueUpgradeThesis");
  if (spatialTranslation.length < 1) missing.push("spatial.brandRoleManifestation | functionalNetwork");
  if (!demoteFunctionalList(rawFunctionalNetwork, "functionalNetwork").length) missing.push("spatial.functionalNetwork (after semantic cleanup)");
  if (!operationConstraints.length) missing.push("spatial.functionalRelationships (after semantic cleanup)");
  const conceptPrimary = firstString(spatial.spatialConcept, creativeDecision.uniqueUpgradeThesis);
  const conceptPrimaryNormalized = normalizeConceptPrimary(conceptPrimary);
  const architecturalConcept = {
    primary: conceptPrimaryNormalized || conceptPrimary,
    structureLanguage: semantic.architectureStrategy.slice(0, 4)
  };
  if (!architecturalConcept.primary) missing.push("spatial.spatialConcept");
  const materials = materialDirection;
  let lighting = lightDirection;
  const withSpatialRole = (items, sourceRole) => (Array.isArray(items) ? items : []).map((item) => ({
    ...typeof item === "object" && item ? item : { name: String(item) },
    sourceRole,
    spatialUsage: resolveSpatialColorRole({
      ...typeof item === "object" && item ? item : { name: String(item) },
      role: typeof item === "object" && item ? item.role : undefined
    })
  }));
  const color = {
    primary: withSpatialRole(colorSystem.primary, "primary"),
    secondary: withSpatialRole(colorSystem.secondary, "secondary"),
    accent: withSpatialRole(colorSystem.accent, "accent"),
    forbidden: cleanList(colorSystem.forbidden)
  };
  // Compilation-local evidence only. Packet containers are model decisions,
  // not independently verified material facts or user approval.
  const decisionTrace = {
    color: ["primary", "secondary", "accent"].flatMap(group => color[group].map((item, index) => ({
      sourcePath: `colorSystem.${group}[${index}]`,
      evidenceClass: "model_proposal", source: colorSystem[group][index],
      spatialUsage: item.spatialUsage,
      unresolved: item.spatialUsage === "unspecified" || item.spatialUsage === "unresolved_conflict"
    }))),
    materials: materialSystem.flatMap((source, index) => source.material && cleanList(source.behavior).length ? [{
      sourcePath: `materialSystem[${index}]`, evidenceClass: "model_proposal",
      source, compiled: sanitizeMaterials([{material:source.material,behavior:cleanList(source.behavior),brandRole:source.brandRole,forbidden:cleanList(source.forbidden)}])[0]
    }] : []),
    mechanisms: semantic.architectureRewrite.items.map(item => ({
      sourcePath: item.sourcePath, mechanismId: item.mechanismId,
      evidenceClass: "system_inference", sourceText: item.text,
      actions: {strategy:item.strategy, form:item.form, organization:item.organization},
      dropped: item.dropped, dropReason: item.dropReason
    })),
    unknown: ["Unprovided color area ratios and material optical parameters remain unspecified; no historical image inference is authorized."],
    conflicts: []
  };
  for (const entry of decisionTrace.color) {
    if (entry.spatialUsage === "unresolved_conflict") decisionTrace.conflicts.push(`${entry.sourcePath}: multiple spatial scopes; preserve the supplied wording without inventing allocation.`);
  }
  const composition = {
    aspectRatio: taskContract?.aspectRatio,
    scene: taskContract?.scene,
    mustBeVisible: compositionMustBeVisible,
    positiveDifferentiators: sanitizeDifferentiators(cleanList(spatial.positiveDifferentiators))
  };
  const negatives = cleanList(
    taskContract?.mustAvoid,
    (packet.diagnosis?.brandMisreadRisks || []).filter((r) => r.status === "confirmed").map((r) => r.description || r.target),
    materialSystem.flatMap((m) => m.forbidden || []),
    lightingSystem.forbidden,
    colorSystem.forbidden
  );
  const brandSanitized = sanitizeBrandManifestation([
    ...semantic.brandMotifSemantics.map((m) => m.text),
    ...brandMustBeVisible,
    ...cleanList(spatial.brandRoleManifestation)
  ]);
  if (missing.length) {
    throw Object.assign(
      new Error(`${SPACE_PHASE9B_SOURCE_INSUFFICIENT}: ${missing.join("; ")}`),
      { code: SPACE_PHASE9B_SOURCE_INSUFFICIENT, missing }
    );
  }
  let continuationOverride = null;
  let targetSceneProjection = null;
  let targetViewStrategy = null;
  let shotSource = "legacy_project_default";
  let bridgeLayers = {
    commercialPurpose,
    spatialTranslation,
    operationConstraints,
    humanExperience,
    commercialReality,
    conceptDriftGuards
  };
  let compositionLayers = composition;
  let functionalRaw = {
    sceneProgram: demoteFunctionalList(rawSceneProgram, "functionalNetwork"),
    functionalNetwork: demoteFunctionalList(rawFunctionalNetwork, "functionalNetwork"),
    positiveDifferentiators: sanitizeDifferentiators(cleanList(spatial.positiveDifferentiators))
  };
  const continuationIntent = taskContract?.continuation;
  const targetProgram = continuationIntent?.targetFunctionalProgram;
  const knownTarget = isKnownTargetScene(taskContract?.subtype);
  if (taskContract?.generationBasis === "continuation" && targetProgram) {
    const override = applyContinuationProgramOverride({
      targetProgram,
      sourceBridge: {
        commercialPurpose,
        spatialTranslation,
        operationConstraints,
        humanExperience,
        commercialReality
      },
      sourceScene: continuationIntent.sourceScene || taskContract?.scene || ""
    });
    bridgeLayers = override.architectureFunctionBridge;
    compositionLayers = {
      ...composition,
      viewStrategy: targetProgram.viewStrategy || viewStrategyForScene(targetProgram.sceneId),
      scene: targetProgram.sceneLabel || targetProgram.sceneId,
      mustBeVisible: override.functionalRequirement.mustBeVisible,
      positiveDifferentiators: override.functionalRequirement.positiveDifferentiators
    };
    functionalRaw = {
      sceneProgram: override.functionalRequirement.sceneProgram,
      functionalNetwork: override.functionalRequirement.functionalNetwork,
      positiveDifferentiators: override.functionalRequirement.positiveDifferentiators
    };
    targetViewStrategy = targetProgram.viewStrategy || viewStrategyForScene(targetProgram.sceneId);
    shotSource = "target_scene_default";
    continuationOverride = {
      referenceRole: "world_consistency",
      targetScene: continuationIntent.targetScene,
      targetViewStrategy,
      sourceProgramDropTags: targetProgram.sourceProgramDropTags ?? [],
      sourceProgramElementsToDrop: targetProgram.sourceProgramElementsToDrop ?? []
    };
    targetSceneProjection = {
      targetScene: targetProgram.sceneId,
      targetProgramId: targetProgram.sceneId,
      functionalBlockSource: "target_scene_projection",
      architectureBridgeSource: "target_scene_projection",
      operationConstraintsSource: "target_scene_projection",
      viewStrategySource: shotSource
    };
  } else if (taskContract?.generationBasis === "reference_first" && knownTarget) {
    const sceneProgram = resolveTargetFunctionalProgram(taskContract.subtype);
    const view = resolveTargetViewStrategy({
      scene: taskContract.subtype,
      shot: taskContract.shot,
      shotSource: taskContract.shotSource
    });
    shotSource = view.shotSource;
    targetViewStrategy = view.viewStrategy || sceneProgram.viewStrategy;
    const projection = buildTargetSceneProjection({
      targetProgram: sceneProgram,
      projectBridge: {
        commercialPurpose,
        spatialTranslation,
        operationConstraints,
        humanExperience,
        commercialReality
      },
      projectConstraints: operationConstraints
    });
    bridgeLayers = projection.architectureFunctionBridge;
    compositionLayers = {
      ...composition,
      viewStrategy: targetViewStrategy,
      scene: projection.composition.scene,
      mustBeVisible: projection.functionalRequirement.mustBeVisible,
      positiveDifferentiators: projection.functionalRequirement.positiveDifferentiators
    };
    functionalRaw = {
      sceneProgram: projection.functionalRequirement.sceneProgram,
      functionalNetwork: projection.functionalRequirement.functionalNetwork,
      positiveDifferentiators: projection.functionalRequirement.positiveDifferentiators
    };
    if (projection.lightingFunctionalIntent.length) {
      lighting = {
        ...lighting,
        source: [
          ...projection.lightingFunctionalIntent,
          ...(lighting.source ?? []).filter((item) => !/底部发光|前台|接待区.*治疗区/iu.test(item))
        ]
      };
      if (projection.lightingContrast) lighting = { ...lighting, contrast: projection.lightingContrast };
    }
    targetSceneProjection = {
      targetScene: sceneProgram.sceneId,
      targetProgramId: sceneProgram.sceneId,
      functionalBlockSource: "target_scene_projection",
      architectureBridgeSource: "target_scene_projection",
      operationConstraintsSource: "target_scene_projection",
      viewStrategySource: shotSource
    };
  } else if (knownTarget) {
    const sceneProgram = resolveTargetFunctionalProgram(taskContract.subtype);
    const view = resolveTargetViewStrategy({
      scene: taskContract.subtype,
      shot: taskContract.shot,
      shotSource: taskContract.shotSource
    });
    shotSource = view.shotSource;
    targetViewStrategy = view.viewStrategy || sceneProgram.viewStrategy;
    targetSceneProjection = {
      targetScene: sceneProgram.sceneId,
      targetProgramId: sceneProgram.sceneId,
      functionalBlockSource: "project_wide",
      architectureBridgeSource: "project_wide",
      operationConstraintsSource: "project_wide",
      viewStrategySource: shotSource
    };
  }
  let projectedBrandManifestation = brandSanitized.lines;
  if (knownTarget) {
    const brandProjection = projectBrandManifestationToTargetScene({
      brandManifestation: brandSanitized.lines,
      mechanismEvidence: cleanList(
        spatial.signatureSpatialMechanism,
        spatial.structureLanguage,
        materialSystem.flatMap((item) => item && typeof item === "object" ? [item.material, item.brandRole, ...Array.isArray(item.behavior) ? item.behavior : []] : [item]),
        lightingSystem.source,
        lightingSystem.interactionWithMaterials
      ),
      targetScene: taskContract.subtype
    });
    projectedBrandManifestation = brandProjection.sceneManifestations;
    targetSceneProjection = {
      ...targetSceneProjection,
      brandManifestationSource: "target_scene_projection",
      preservedMechanisms: brandProjection.preservedMechanisms,
      replacedSceneObjects: brandProjection.replacedSceneObjects,
      operationConstraints: bridgeLayers.operationConstraints ?? [],
      brandManifestation: {
        mechanismsToPreserve: brandProjection.preservedMechanisms,
        sceneManifestations: brandProjection.sceneManifestations,
        sourceSceneObjectsDropped: brandProjection.sourceSceneObjectsDropped
      }
    };
  }
  return {
    projectIdentity: {
      brandName: projectFacts.brandName?.value || projectContext?.brandCore?.name || "",
      industry: projectFacts.industry?.value || projectContext?.brandCore?.industry || "",
      brandRole: projectFacts.brandRole?.value || projectFacts.brandRole || "",
      audience: cleanList(projectContext?.brandCore?.audience)
    },
    task: {
      deliverableFamily: taskContract?.deliverableFamily,
      subtype: taskContract?.subtype,
      shot: taskContract?.shot,
      currentInstruction: taskContract?.currentInstruction,
      aspectRatio: taskContract?.aspectRatio
    },
    spatialIntent: { experienceGoal, spatialStrategy },
    architectureLanguage: {
      spatialPrinciples,
      architecturalCharacteristics,
      materialDirection,
      lightDirection,
      spatialOrganization
    },
    architectureFunctionBridge: bridgeLayers,
    architecturalConcept,
    materials,
    lighting,
    color,
    decisionTrace,
    composition: compositionLayers,
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
        version: MECHANISM_PROVENANCE_VERSION
      }
    },
    // Raw pass-through for trace / audit and for blocks that legitimately
    // render functional/program content (functional_requirement, brand).
    // Architecture block rendering no longer reads these lists.
    //
    // Brand translation block: motif-bearing items + identity items extracted
    // from mustBeVisible + raw brand-role sentences are SANITIZED first (R8.5
    // redirected): in-scene identity (post-composite), long creative prose,
    // people/ops items, and color-as-geometry are dropped or demoted; motif
    // literals are normalized into surface behavior. The model must not receive
    // raw motif nouns / colored-geometry instructions in the positive prompt.
    _raw: {
      functionalNetwork: functionalRaw.functionalNetwork,
      sceneProgram: functionalRaw.sceneProgram,
      brandRoleManifestation: projectedBrandManifestation,
      signatureSpatialMechanism: cleanList(spatial.signatureSpatialMechanism),
      mustBeVisible: rawMustBeVisible,
      positiveDifferentiators: functionalRaw.positiveDifferentiators
    },
    // Sanitization audit for trace (which brand items were kept/normalized/
    // dropped and why).
    brandSanitization: {
      stats: brandSanitized.stats,
      records: brandSanitized.records
    },
    // R11.2.3 Target Scene Authority: the resolved view strategy (the scene
    // owns the view unless the user explicitly chose the shot), the shot
    // source, and the target-scene block provenance.
    viewStrategy: targetViewStrategy,
    shotSource,
    ...targetSceneProjection ? { targetSceneProjection } : {},
    ...continuationOverride ? { continuationOverride } : {}
  };
}
function splitMustBeVisible(items) {
  const safe = [];
  const brand = [];
  const identityRe = /logo|wordmark|logotype|slogan|发光字|标识|标志|徽章|吉祥物|艺术字|\blogo\b/iu;
  for (const item of items) {
    const text = String(item || "").trim();
    if (!text) continue;
    const analysis = classifyPhrase(text, "mustBeVisible");
    if (analysis.classification === SEMANTIC_CLASS.DECORATIVE_IDENTITY || analysis.classification === SEMANTIC_CLASS.BRAND_MOTIF || analysis.classification === SEMANTIC_CLASS.COLOR_GEOMETRY || analysis.classification === SEMANTIC_CLASS.COLOR_ACCENT || analysis.classification === SEMANTIC_CLASS.AMBIGUOUS || analysis.motifHits.length > 0 || identityRe.test(text)) {
      brand.push(text);
    } else {
      safe.push(text);
    }
  }
  return { safe, brand };
}
function keepFunctionalItem(item) {
  const text = String(item || "").trim();
  if (!text) return false;
  const analysis = classifyPhrase(text, "functionalNetwork");
  if (analysis.classification === SEMANTIC_CLASS.BRAND_MOTIF || analysis.classification === SEMANTIC_CLASS.DECORATIVE_IDENTITY || analysis.classification === SEMANTIC_CLASS.COLOR_GEOMETRY || analysis.classification === SEMANTIC_CLASS.COLOR_ACCENT || analysis.classification === SEMANTIC_CLASS.AMBIGUOUS) {
    return false;
  }
  if (analysis.motifHits && analysis.motifHits.length > 0) return false;
  return true;
}
function demoteFunctionalList(items, field) {
  const out = [];
  for (const item of cleanList(items)) {
    const demoted = demoteDecorativeObjectFromFunctionalLayer(item, field);
    if (demoted === null) continue;
    if (!out.includes(demoted)) out.push(demoted);
  }
  return out;
}
function normalizeConceptPrimary(s) {
  if (typeof s !== "string") return "";
  let t = s.trim();
  t = t.replace(/[（(][^）)]*[）)]/gu, "").trim();
  const sep = t.search(/\s*(?:-{1,2}|—|：|:)\s*/u);
  if (sep > 0) {
    const head = t.slice(0, sep).trim();
    const tail = t.slice(sep).replace(/^\s*(?:-{1,2}|—|：|:)\s*/u, "").trim();
    const motifRe = /[\u7fce\u7fbd\u6bdb\u96c0\u82b1\u7fbd\u83b2]/u;
    if (head.length <= 16 && motifRe.test(head) && tail && tail.length >= 2) return tail;
  }
  return t;
}
const SPACE_QUALITY_SOURCE_ADAPTER_VERSION = "1.4.0";
export {
  SPACE_QUALITY_SOURCE_ADAPTER_VERSION,
  adaptSpaceSource,
  isSpaceSourceInsufficient
};
