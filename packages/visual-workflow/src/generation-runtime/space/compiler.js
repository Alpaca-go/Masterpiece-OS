import { adaptSpaceSource, SPACE_QUALITY_SOURCE_ADAPTER_VERSION } from "./source-adapter.js";
import {
  selectArchitectureAnchors,
  renderArchitectureContextBlock,
  resolveArchitectureAnchorImagePath,
  normalizeAnchorIndustry
} from "./architecture-context.js";
import { measurePromptBudget } from "./prompt-budget.js";
import { buildTrace } from "./trace.js";
import { validateSpatialSemantics } from "./semantic/validate-spatial-semantics.js";
import { renderContinuationIntentBlock } from "./continuation/build-continuation-context.js";
import { enforceNoSourceProgramLeakage } from "./continuation/source-program-leakage-gate.js";
import {
  validateTargetSceneAuthority,
  TARGET_SCENE_AUTHORITY_CHECKED_BLOCKS,
  TARGET_SCENE_AUTHORITY_GATE_VERSION
} from "./scene-projection/target-scene-projection.js";
import {
  renderReferenceBoundary,
  REFERENCE_BOUNDARY_VERSION,
  resolveProviderStrengthControlLabel
} from "./reference-boundary.js";
const SPACE_PROMPT_COMPILER_ID = "phase9b-quality-compiler";
const SPACE_PROMPT_COMPILER_VERSION = "1.1.0";
const PHASE9B_BLOCK_IDS = Object.freeze([
  "task",
  "spatial_intent",
  "architecture_language",
  "architecture_context",
  "architecture_function_bridge",
  "architectural_concept",
  "architecture_dna",
  "brand_translation",
  "functional_requirement",
  "material",
  "lighting",
  "composition",
  "rendering",
  "negative_constraints"
]);
function bullet(items, fallback = "") {
  const list = (Array.isArray(items) ? items : [items]).map((s) => typeof s === "string" ? s.trim() : "").filter(Boolean);
  if (list.length === 0) return fallback;
  return list.map((s) => `- ${s}`).join("\n");
}
function block(id, title, body) {
  return { id, title, text: `# ${title}

${body.replace(/\s+$/u, "")}` };
}
function renderTask(layers) {
  const t = layers.task;
  const p = layers.projectIdentity;
  const lines = [
    `Generate a single premium-grade space image for **${p.brandName}** (${p.industry}).`
  ];
  if (t.subtype) {
    const view = layers.viewStrategy || layers.continuationOverride?.targetViewStrategy || t.shot;
    lines.push(`Scene: \`${t.subtype}\`${view ? ` / ${view}` : ""}.`);
  }
  if (t.currentInstruction) lines.push(`Task: ${t.currentInstruction}`);
  if (t.aspectRatio) lines.push(`Aspect ratio: ${t.aspectRatio}.`);
  return block("task", "Task", lines.join("\n"));
}
function renderSpatialIntent(layers) {
  const si = layers.spatialIntent;
  const body = [
    "> The experience goal and spatial strategy set the tone before any building mechanism.",
    "",
    `**Experience Goal**: ${si.experienceGoal}`,
    "",
    "**Spatial Strategy**:",
    bullet(si.spatialStrategy)
  ].join("\n");
  return block("spatial_intent", "Spatial Intent", body);
}
function renderArchitectureLanguage(layers) {
  const al = layers.architectureLanguage;
  const body = [
    "> Building language: how space is organized before brand is applied.",
    "",
    "**Spatial Principles**:",
    bullet(al.spatialPrinciples),
    "",
    "**Architectural Characteristics**:",
    bullet(al.architecturalCharacteristics),
    "",
    "**Spatial Organization (functional network + program)**:",
    bullet(al.spatialOrganization)
  ].join("\n");
  return block("architecture_language", "Architecture Language", body);
}
function renderArchitectureFunctionBridge(layers) {
  const b = layers.architectureFunctionBridge;
  const body = [
    "> Building language serves commercial reality. Translate architecture into functional action (Phase 8B.1).",
    "",
    `**Commercial Purpose**: ${b.commercialPurpose}`,
    "",
    "**Spatial Translation (architecture \u2192 commercial action)**:",
    bullet(b.spatialTranslation),
    "",
    "**Operation Constraints (hard, must hold)**:",
    bullet(b.operationConstraints),
    "",
    "**Human Experience (path + rhythm)**:",
    bullet(b.humanExperience),
    "",
    "**Commercial Reality (do not turn the space into a gallery)**:",
    bullet(b.commercialReality),
    "",
    "**Concept Drift Guards (must avoid)**:",
    bullet(b.conceptDriftGuards, "- (none)")
  ].join("\n");
  return block("architecture_function_bridge", "Architecture-Function Bridge", body);
}
function renderArchitecturalConcept(layers) {
  const c = layers.architecturalConcept;
  const body = [
    "\u7A7A\u95F4\u6982\u5FF5 / \u5EFA\u7B51\u673A\u5236\u5FC5\u987B\u5148\u4E8E\u54C1\u724C\u5143\u7D20\u88AB\u5EFA\u7ACB\u3002\u54C1\u724C\u9644\u7740\u4E8E\u5EFA\u7B51\u8BED\u8A00\u4E4B\u4E0A\uFF0C\u800C\u4E0D\u662F\u53CD\u8FC7\u6765\u3002",
    "",
    `**Primary Spatial Concept**: ${c.primary}`,
    "",
    "**Structure Language**:",
    bullet(c.structureLanguage)
  ].join("\n");
  return block("architectural_concept", "Architectural Concept", body);
}
function renderArchitectureDna(layers) {
  const org = layers.architectureLanguage.spatialOrganization;
  const form = layers.architectureLanguage.architecturalCharacteristics;
  const strategy = layers.architectureLanguage.spatialPrinciples;
  const body = [
    "**Building DNA**:",
    `- Spatial strategy: ${strategy.slice(0, 4).join("; ") || "n/a"}`,
    `- Form mechanisms: ${form.slice(0, 4).join("; ") || "n/a"}`,
    `- Spatial organization: ${org.slice(0, 4).join("; ") || "n/a"}`,
    "",
    "Maintain continuous wall\u2194ceiling\u2194floor relationships and a legible circulation hierarchy."
  ].join("\n");
  return block("architecture_dna", "Architecture DNA", body);
}
function renderBrandTranslation(layers) {
  const p = layers.projectIdentity;
  const body = [
    "> Brand is translated into mechanism, rhythm and surface behavior \u2014 never pasted as decoration.",
    "> Brand identity (logo, wordmark, signage text) is composited AFTER generation; do NOT render it in-scene.",
    "",
    `**Brand**: ${p.brandName} | **Industry**: ${p.industry}`,
    `**Brand Role**: ${p.brandRole || "n/a"}`,
    p.audience.length ? `**Audience**: ${p.audience.join("\u3001")}` : "",
    "",
    "**Brand Role Manifestation in Space**:",
    bullet(layers._raw.brandRoleManifestation)
  ].filter(Boolean).join("\n");
  return block("brand_translation", "Brand Translation", body);
}
function renderFunctionalRequirement(layers) {
  const raw = layers._raw;
  const body = [
    "**Required Program Nodes (must be legible in one image)**:",
    bullet(raw.sceneProgram),
    "",
    "**Functional Network**:",
    bullet(raw.functionalNetwork),
    "",
    "**Must Be Visible (spatial focal hierarchy; brand identity is post-composited)**:",
    bullet(layers.composition.mustBeVisible, "- (none)"),
    "",
    "**Positive Differentiators**:",
    bullet(raw.positiveDifferentiators, "- (none)")
  ].join("\n");
  return block("functional_requirement", "Functional & Commercial Requirement", body);
}
function renderMaterial(layers) {
  const mats = layers.materials;
  const body = mats.map((m) => {
    const parts = [`- **${m.material}**: ${m.behavior.join("\uFF1B") || "\u771F\u5B9E\u7269\u7406\u5C5E\u6027"}`];
    if (m.brandRole) parts.push(`  brand role: ${m.brandRole}`);
    if (m.forbidden.length) parts.push(`  avoid: ${m.forbidden.join("\uFF1B")}`);
    return parts.join("\n");
  });
  if (!body.length) body.push("- Materials, joints and surfaces must be physically credible and buildable.");
  return block("material", "Material System", body.join("\n"));
}
function renderColor(layers) {
  const lines = [
    "Palette identity rank does not determine interior area. Entries below are existing model proposals, not user-confirmed facts.",
    "Preserve each supplied carrier and scope. Unknown ratios stay unknown; color alone does not authorize geometry."
  ];
  for (const group of ["primary", "secondary", "accent"]) {
    for (const item of layers.color[group]) {
      lines.push(`- ${item.name || "(unnamed)"} | palette: ${group} | spatial scope: ${item.spatialUsage}`);
      for (const key of ["role", "semanticMeaning", "surfaceApplicability", "ratio"]) {
        if (item[key] !== undefined && item[key] !== "") lines.push(`  ${key}: ${typeof item[key] === "string" ? item[key] : JSON.stringify(item[key])}`);
      }
      if (item.ratio === undefined) lines.push("  area ratio: unknown");
    }
  }
  lines.push(...layers.decisionTrace.conflicts.map(text => `- UNRESOLVED: ${text}`));
  return block("color", "Spatial Color Roles", lines.join("\n"));
}
function renderLighting(layers) {
  const l = layers.lighting;
  const body = [
    `**Primary Strategy**: ${l.source.join("\u3001") || "layered ambient + accent"}`,
    l.contrast ? `**Contrast**: ${l.contrast}` : "",
    "",
    "**Light / Material Behavior**:",
    bullet(l.interactionWithMaterials),
    "",
    "**Lighting Prohibitions**:",
    bullet(l.forbidden, "- (none)")
  ].filter(Boolean).join("\n");
  return block("lighting", "Lighting System", body);
}
function renderComposition(layers) {
  const c = layers.composition;
  const body = [
    c.aspectRatio ? `**Output Ratio**: ${c.aspectRatio}` : "",
    c.scene ? `**Scene**: ${c.scene}` : "",
    "",
    "**Must Be Visible (focal hierarchy)**:",
    bullet(c.mustBeVisible),
    "",
    "**Positive Differentiators**:",
    bullet(c.positiveDifferentiators, "- (none)"),
    "",
    "Use a credible commercial architectural camera: controlled perspective, depth, hierarchy and human scale."
  ].filter(Boolean).join("\n");
  return block("composition", "Composition & Photography", body);
}
function renderRendering() {
  const body = [
    "- High-end architectural visualization, photoreal, physically based materials.",
    "- Balanced exposure, accurate white balance, readable texture and shadow detail.",
    "- No blown highlights; clean, resolved, professionally finished."
  ].join("\n");
  return block("rendering", "Rendering Requirements", body);
}
const BASE_NEGATIVES = Object.freeze([
  "no rendered brand name, wordmark, logotype, signage text, or illuminated letters in the scene",
  "no generic AI clinic look, no stock-photo medical aesthetic template"
]);
function renderNegatives(layers) {
  const merged = [...BASE_NEGATIVES, ...layers.negatives];
  const body = [
    "The following MUST NOT appear in the generated image:",
    bullet(merged)
  ].join("\n");
  return block("negative_constraints", "Prohibited (fail-closed)", body);
}
function compileSpacePrompt(input) {
  const layers = adaptSpaceSource(input);
  let anchors = [];
  let contextBlock = null;
  if (input.brandKey) {
    const criteria = input.anchorCriteria || deriveAnchorCriteria(layers, input.taskContract);
    const selected = selectArchitectureAnchors(input.brandKey, criteria, input.anchorMaxCount ?? 3);
    anchors = selected.map((s) => s.anchor);
    if (anchors.length) {
      contextBlock = {
        id: "architecture_context",
        title: "Architecture Context",
        text: renderArchitectureContextBlock(anchors)
      };
    }
  }
  const referenceImages = anchors.map((a) => ({ anchorId: a.id, imagePath: resolveArchitectureAnchorImagePath(a) })).filter((r) => r.imagePath);
  const continuationIntentText = renderContinuationIntentBlock(input.taskContract?.continuation);
  const continuationBlock = continuationIntentText ? { id: "continuation_intent", title: "Continuation Intent", text: continuationIntentText } : null;
  const ordered = [
    renderTask(layers),
    ...continuationBlock ? [continuationBlock] : [],
    renderSpatialIntent(layers),
    renderArchitectureLanguage(layers),
    ...contextBlock ? [contextBlock] : [],
    renderArchitectureFunctionBridge(layers),
    renderArchitecturalConcept(layers),
    renderArchitectureDna(layers),
    renderBrandTranslation(layers),
    renderFunctionalRequirement(layers),
    renderColor(layers),
    renderMaterial(layers),
    renderLighting(layers),
    renderComposition(layers),
    renderRendering(),
    renderNegatives(layers)
  ];
  const blocksById = Object.fromEntries(ordered.map((b) => [b.id, b]));
  const referenceBoundaryText = renderReferenceBoundary({
    generationBasis: input.taskContract?.generationBasis,
    referenceSceneRelation: input.taskContract?.referenceSceneRelation ?? "unknown",
    targetSceneLabel: input.taskContract?.subtype ?? "",
    adapterCapability: input.adapter?.capability
  });
  const baseFinalPrompt = ordered.map((b) => b.text).join("\n\n");
  const finalPrompt = referenceBoundaryText ? `${baseFinalPrompt}

${referenceBoundaryText}` : baseFinalPrompt;
  const baseBlockTextsByName = Object.fromEntries(ordered.map((b) => [b.id, b.text]));
  const blockTextsByName = referenceBoundaryText ? { ...baseBlockTextsByName, reference_boundary: referenceBoundaryText } : baseBlockTextsByName;
  const budget = measurePromptBudget(finalPrompt, blockTextsByName, {
    providerCapability: input.adapter?.capability
  });
  const presentIds = ordered.map((b) => b.id);
  const required = PHASE9B_BLOCK_IDS.filter((id) => id !== "architecture_context");
  const missing = required.filter((id) => !presentIds.includes(id));
  if (missing.length) {
    throw new Error(`PHASE9B_COMPILER_INCOMPLETE: missing blocks ${missing.join(", ")}`);
  }
  const functionalGate = validateSpatialSemantics({
    functionalNetwork: layers._raw?.functionalNetwork ?? [],
    functionalRelationships: layers.architectureFunctionBridge?.operationConstraints ?? [],
    mustBeVisible: layers.composition?.mustBeVisible ?? []
  });
  if (functionalGate.status === "block") {
    const codes = [...new Set(functionalGate.findings.map((f) => f.code))].join(", ");
    throw Object.assign(
      new Error(`SPACE_DECORATIVE_OBJECT_SEMANTIC_LEAK: ${codes}`),
      { code: "SPACE_DECORATIVE_OBJECT_SEMANTIC_LEAK", findings: functionalGate.findings }
    );
  }
  if (input.taskContract?.generationBasis === "continuation" && input.taskContract?.continuation) {
    enforceNoSourceProgramLeakage({
      contract: input.taskContract.continuation,
      finalPrompt
    });
  }
  const authorityGate = layers.targetSceneProjection?.functionalBlockSource === "target_scene_projection" ? validateTargetSceneAuthority({
    targetScene: input.taskContract?.subtype,
    targetProgram: input.taskContract?.continuation?.targetFunctionalProgram ?? { sceneId: input.taskContract?.subtype },
    blocksById,
    operationConstraints: layers.architectureFunctionBridge?.operationConstraints,
    mustBeVisible: layers.composition?.mustBeVisible,
    brandRoleManifestation: layers._raw?.brandRoleManifestation,
    userRequirement: input.taskContract?.continuation?.userRequirement ?? input.taskContract?.currentInstruction
  }) : { status: "pass", findings: [] };
  if (authorityGate.status !== "pass") {
    throw Object.assign(
      new Error(`SPACE_TARGET_SCENE_AUTHORITY_VIOLATION: ${authorityGate.findings.map((f) => `${f.blockId}:${f.marker}`).join(", ")}`),
      { code: "SPACE_TARGET_SCENE_AUTHORITY_VIOLATION", findings: authorityGate.findings }
    );
  }
  const trace = buildTrace({
    compilerId: SPACE_PROMPT_COMPILER_ID,
    compilerVersion: SPACE_PROMPT_COMPILER_VERSION,
    packetFingerprint: void 0,
    blockSources: Object.fromEntries(ordered.map((b) => [b.id, blockSource(b.id)])),
    anchors: anchors.map((a) => ({ id: a.id, role: a.role, imagePath: a.imagePath })),
    referencePolicy: input.referencePolicy || null,
    adapter: input.adapter,
    extra: {
      brandKey: input.brandKey || null,
      anchorCriteria: input.anchorCriteria || null,
      architectureContextIncluded: Boolean(contextBlock),
      blockIds: presentIds,
      decisionTrace: layers.decisionTrace,
      // r2.0 §4.10 / B-3: record whether the Reference Boundary text block
      // was appended to the prompt. Mirrors the v1 seedream-adapter
      // referenceBoundary trace shape so downstream consumers (audit,
      // evidence, F-4) read one shape regardless of compile path.
      referenceBoundary: {
        applied: Boolean(referenceBoundaryText),
        version: referenceBoundaryText ? REFERENCE_BOUNDARY_VERSION : null,
        providerStrengthControl: resolveProviderStrengthControlLabel(input.adapter?.capability),
        promptCharacters: referenceBoundaryText ? [...referenceBoundaryText].length : 0
      },
      budget: {
        chars: budget.chars,
        positiveRatio: budget.positiveRatio,
        negativeRatio: budget.negativeRatio,
        providerLimit: budget.providerLimit,
        qualityBudgetExceeded: budget.qualityBudgetExceeded
      },
      semantic: layers.semantic ? {
        architectureSemanticsCount: layers.semantic.architectureSemantics.length,
        brandMotifSemanticsCount: layers.semantic.brandMotifSemantics.length,
        colorAccentSemanticsCount: layers.semantic.colorAccentSemantics.length,
        functionalSemanticsCount: layers.semantic.functionalSemantics.length,
        decorativeIdentitySemanticsCount: layers.semantic.decorativeIdentitySemantics.length,
        colorGeometryCouplingRisk: layers.semantic.colorGeometryCouplingRisk,
        sourceAdapterVersion: layers.sourceAdapterVersion
      } : null,
      // R11.2.3 Target Scene Authority preflight + block provenance.
      targetSceneAuthority: layers.targetSceneProjection ? {
        ...layers.targetSceneProjection,
        viewStrategy: layers.viewStrategy ?? null,
        shotSource: layers.shotSource ?? "legacy_project_default",
        gate: authorityGate.status,
        gateVersion: TARGET_SCENE_AUTHORITY_GATE_VERSION,
        authorityGate: {
          status: authorityGate.status,
          checkedBlocks: TARGET_SCENE_AUTHORITY_CHECKED_BLOCKS
        }
      } : null
    }
  });
  return {
    schemaVersion: "1.0",
    compilerId: SPACE_PROMPT_COMPILER_ID,
    compilerVersion: SPACE_PROMPT_COMPILER_VERSION,
    sourceAdapterVersion: SPACE_QUALITY_SOURCE_ADAPTER_VERSION,
    blocks: ordered,
    blocksById,
    blockIds: presentIds,
    finalPrompt,
    editablePrompt: finalPrompt,
    anchors,
    referenceImages,
    layers,
    budget,
    trace
  };
}
function deriveAnchorCriteria(layers, taskContract) {
  const industry = normalizeAnchorIndustry(layers.projectIdentity.industry);
  const sceneType = taskContract?.subtype || void 0;
  return { industry, sceneType };
}
function blockSource(id) {
  const map = {
    task: ["taskContract", "projectFacts.brandName", "projectFacts.industry"],
    spatial_intent: ["spatial.spatialConcept (normalized)", "semantic.architectureStrategy"],
    architecture_language: ["semantic.architectureStrategy", "semantic.architectureForm", "semantic.architectureOrganization", "materialSystem", "lightingSystem"],
    architecture_context: ["architecture-anchors/registry.json"],
    architecture_function_bridge: ["projectFacts.brandRole", "spatial.functionalRelationships", "spatial.sceneProgram", "spatial.brandRoleManifestation", "diagnosis.brandMisreadRisks"],
    architectural_concept: ["spatial.spatialConcept (normalized)", "semantic.architectureForm", "semantic.architectureStrategy"],
    architecture_dna: ["semantic.architectureStrategy", "semantic.architectureForm", "semantic.architectureOrganization"],
    brand_translation: ["projectFacts", "semantic.brandMotifSemantics", "semantic.decorativeIdentitySemantics", "semantic.colorAccentSemantics", "spatial.brandRoleManifestation", "_raw.mustBeVisible (identity items only)"],
    functional_requirement: ["spatial.sceneProgram", "spatial.functionalNetwork", "composition.mustBeVisible (spatial items only)", "spatial.positiveDifferentiators"],
    material: ["materialSystem[].material|behavior|forbidden"],
    color: ["colorSystem.primary|secondary|accent (role, spatialUsage, ratio, surfaceApplicability)"],
    lighting: ["lightingSystem.source|contrast|interactionWithMaterials|forbidden"],
    composition: ["taskContract.aspectRatio|scene", "composition.mustBeVisible (spatial items only)", "spatial.positiveDifferentiators"],
    rendering: ["(deterministic rendering standard)"],
    negative_constraints: ["taskContract.mustAvoid", "diagnosis.brandMisreadRisks", "materialSystem[].forbidden", "lightingSystem.forbidden", "colorSystem.forbidden", "BASE_NEGATIVES (2 universal guards)"],
    continuation_intent: ["taskContract.continuation (source/target scene, preserve grammar, change program) \u2014 R11.1, no brand re-analysis"]
  };
  return map[id] || [];
}
export {
  SPACE_PROMPT_COMPILER_ID,
  SPACE_PROMPT_COMPILER_VERSION,
  compileSpacePrompt
};
