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
    "**Spatial Strategy**: source-scoped decisions are stated once in Architecture Language."
  ].join("\n");
  return block("spatial_intent", "Spatial Intent", body);
}
function renderArchitectureLanguage(layers) {
  const decisions = [...new Set(layers.decisionTrace.architectureDecisions.filter(entry=>entry.sceneScope !== "off_frame_dependency").map(entry=>entry.sceneScope === "unresolved" ? entry.text : entry.currentShotText ?? entry.text).filter(Boolean))];
  const body = [
    layers.decisionTrace.confirmedFields.includes("mediaTranslations.spatial")
      ? "> User-confirmed spatial design intent: preserve the supplied subjects, carriers and action scopes. Construction details remain unverified; do not invent hardware."
      : "> Preserve the supplied subjects, carriers and action scopes. These are project proposals; do not add walls, ceilings or lighting hardware from generic action words.",
    "",
    "**Source-scoped architectural decisions (each stated once)**:",
    bullet(decisions)
  ].join("\n");
  return block("architecture_language", "Architecture Language", body);
}
function renderArchitectureFunctionBridge(layers) {
  const b = layers.architectureFunctionBridge;
  const body = [
    "> Artistic character and commercial operations are simultaneous requirements. Industry constrains use, access and privacy; it does not dictate an architectural style.",
    "",
    `**Commercial Purpose**: ${b.commercialPurpose}`,
    "",
    "**Spatial Translation (architecture \u2192 commercial action)**:",
    "Current-shot nodes and relationships are stated in Functional & Commercial Requirement.",
    "",
    "**Operation Constraints (hard, must hold)**:",
    bullet(b.operationConstraints),
    "",
    "**Human Experience (path + rhythm)**:",
    bullet(b.humanExperience),
    "",
    "**Commercial Reality (compatible with project artistic character)**:",
    "Preserve the supplied differentiators in Functional & Commercial Requirement together with the artistic focus in Composition.",
    "",
    "**Concept Drift Guards (must avoid)**:",
    bullet(b.conceptDriftGuards, "- (none)"),
    "", "**Cross-zone operational constraints (current-shot boundary only; other interiors remain off frame)**:",
    bullet(b.crossSceneConstraints, "- No additional cross-zone relationship is established by the supplied sources.")
    ,"", "Off-frame program dependencies are retained in the source trace. Preserve access and privacy boundaries without exposing the interiors of other program areas."
  ].join("\n");
  return block("architecture_function_bridge", "Architecture-Function Bridge", body);
}
function renderArchitecturalConcept(layers) {
  const body = [
    "Use the experience goal in Spatial Intent and the source-scoped decisions in Architecture Language together with the artistic hierarchy in Composition.",
    "User instructions take priority over model proposals and optional examples. Do not make a generic building template displace the project's artistic expression."
  ].join("\n");
  return block("architectural_concept", "Architectural Concept", body);
}
function renderArchitectureDna(layers) {
  const body = [
    "**Decision relationships**: Architecture Language owns architectural actions; Spatial Color Roles owns color scope; Material System owns optical behavior; Composition owns focal hierarchy.",
    "Keep buildable junctions, readable circulation and human scale. Complex curves, restrained geometry, strong color and gallery-like character remain available when supported by project intent. No industry-wide aesthetic is imposed."
  ].join("\n");
  return block("architecture_dna", "Architecture DNA", body);
}
function renderBrandTranslation(layers, logoUsageMode = "post_composite") {
  const p = layers.projectIdentity;
  const inImage = logoUsageMode === "in_image";
  const architectureSources = new Set(layers.decisionTrace.canonicalOwners.filter(entry=>entry.blockId==="architecture_language").map(entry=>entry.text));
  const ownedBrandLines = new Set(layers.brandSanitization.records.filter(entry=>architectureSources.has(entry.raw)).map(entry=>entry.text));
  const body = [
    "> Preserve project identity and artistic expression together with the functional program. The artistic focus is stated in Composition.",
    inImage
      ? `> Brand identity is rendered in-scene. Use the exact Chinese brand name "${p.brandName || ""}" on real signage or menu surfaces. Do not invent slogans, translations, extra names or pseudo-text.`
      : "> Brand identity (logo, wordmark, signage text) is composited AFTER generation; do NOT render it in-scene.",
    "",
    `**Brand**: ${p.brandName} | **Industry**: ${p.industry}`,
    "**Brand Role**: see the Commercial Purpose in Architecture-Function Bridge.",
    p.audience.length ? `**Audience**: ${p.audience.join("\u3001")}` : "",
    "",
    "**Brand Role Manifestation in Space**:",
    bullet(layers._raw.brandRoleManifestation.filter(text=>!layers.composition.artisticFocus?.some(entry=>entry.text===text) && !ownedBrandLines.has(text) && !layers._raw.positiveDifferentiators.includes(text)))
  ].filter(Boolean).join("\n");
  return block("brand_translation", "Brand Translation", body);
}
function renderFunctionalRequirement(layers) {
  const raw = layers._raw;
  const body = [
    "**Current-shot Program Nodes (source-scoped; other areas remain off frame)**:",
    bullet(raw.sceneProgram),
    "",
    "**Functional Network**:",
    bullet(raw.functionalNetwork),
    "",
    "**Visible hierarchy**: see Composition; an artistic focus does not replace operational facilities.",
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
    layers.decisionTrace.confirmedFields.includes("colorSystem")
      ? "Palette identity rank does not determine interior area. Entries below are user-confirmed design intent, not verified material facts. Execute the explicit supplied surface scopes; leave unspecified ratios unknown."
      : "Palette identity rank does not determine interior area. Entries below are existing model proposals, not user-confirmed facts.",
    "Proposed scopes and ratios retain their source meaning for review. Do not execute an unconfirmed dominant field or area allocation as a mandatory instruction. Area authority remains pending unless explicitly supplied by the current user instruction; that instruction takes priority.",
    "Unknown ratios stay unknown. Neither a color name, a palette rank, a gradient nor a proposed role independently authorizes geometry or whole-room color coverage."
  ];
  for (const group of ["primary", "secondary", "accent"]) {
    for (const item of layers.color[group]) {
      const authority = layers.decisionTrace.confirmedFields.includes("colorSystem") ? "user_confirmed_design_intent" : "proposal_only";
      lines.push(`- ${item.name || "(unnamed)"} | palette: ${group} | proposed spatial scope: ${item.spatialUsage} | execution authority: ${authority}`);
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
    "**Project Artistic Focus (separate from operational facilities)**:",
    ...c.artisticFocus?.length ? c.artisticFocus.map(entry=>`- [${entry.evidenceClass}; ${entry.priority}] ${entry.text}`) : ["- No artistic installation is required by the supplied sources."],
    "Do not demote a supplied core artwork to background texture. Its mounting, dimensions and optical construction remain unspecified unless supplied; do not invent them.",
    "",
    "**Operational Elements (remain usable alongside the artistic focus)**:",
    bullet(c.mustBeVisible),
    ...c.userRequirements?.length ? ['**User-confirmed composition relationships**:',bullet(c.userRequirements)] : [],
    "",
    "**Positive Differentiators**:",
    "Use the differentiators in Functional & Commercial Requirement without repeating them as additional demands.",
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
const STYLE_LABELS = Object.freeze({
  lighting: {
    bright: "bright, even illumination; no dark pools",
    warm_dim: "warm low ambient, retain shadow, keep the scene readable",
    natural: "daylight-led with soft shadows"
  },
  density: {
    sparse: "sparse, generous spacing",
    balanced: "balanced spacing",
    dense: "compact and lively, circulation still readable"
  },
  materials: {
    brick_wood: "brick, aged wood, terracotta and copper",
    metal: "metal, glass and acrylic",
    stone: "stone and mineral surfaces",
    plaster: "plaster and paint",
    mixed: "mixed materials with one dominant family"
  },
  brandColorArea: {
    accent: "brand colour only as an accent",
    half: "brand colour on roughly half of the surfaces",
    dominant: "brand colour dominant and deliberate"
  },
  tradition: {
    modern: "modern, no traditional motifs",
    balanced: "modern with restrained traditional references",
    traditional: "traditional references as structure, not costume"
  },
  props: {
    none: "no props; do not invent objects, characters or brand story",
    lived_in: "only props supported by the project materials; do not invent brand story"
  },
  shot: {
    entrance: "storefront or entrance view",
    interior: "interior view",
    detail: "detail view"
  },
  textDensity: {
    minimal: "at most one text panel per view; no menu walls or dense copy",
    moderate: "a few text panels, balanced with the space",
    rich: "text-rich menu walls are allowed, but keep them readable"
  }
});
function renderStyleControls(styleControls) {
  if (!styleControls) return null;
  const lines = [];
  if (styleControls.priceDisplay === "none") lines.push("- price display: none. Do not render numerals, prices, currency symbols or invented menu numbers anywhere.");
  if (styleControls.priceDisplay === "real_menu") lines.push("- price display: real menu only. Reproduce only prices supplied in the project materials.");
  if (styleControls.priceDisplay === "placeholder") lines.push("- price display: placeholder. Menu boards stay blank or clearly non-numeric.");
  for (const axis of ["lighting", "density", "materials", "brandColorArea", "tradition", "props", "shot", "textDensity"]) {
    const value = styleControls[axis];
    if (!value || value === "designer_choice") continue;
    const text = STYLE_LABELS[axis]?.[value];
    if (text) lines.push(`- ${axis}: ${text}`);
  }
  const body = [
    "Explicit user controls. They override conflicting analysis proposals and optional examples.",
    ...lines
  ].join("\n");
  return block("style_controls", "Style Controls (explicit)", body);
}
const BASE_NEGATIVES = Object.freeze([
  "no rendered brand name, wordmark, logotype, signage text, or illuminated letters in the scene",
  "no generic AI clinic look, no stock-photo medical aesthetic template"
]);
function renderNegatives(layers, logoUsageMode = "post_composite", styleControls = null) {
  const base = logoUsageMode === "in_image"
    ? [
      "no invented, garbled, misspelled or duplicated brand text beyond the supplied brand name",
      "no generic AI clinic look, no stock-photo medical aesthetic template"
    ]
    : BASE_NEGATIVES;
  const price = styleControls?.priceDisplay === "none"
    ? ["no numerals, prices, currency symbols or invented menu numbers"]
    : [];
  const text = styleControls?.textDensity === "minimal"
    ? ["no wall of text panels, menu walls or long copy"]
    : [];
  const merged = [...base, ...price, ...text, ...layers.negatives];
  const body = [
    "The following MUST NOT appear in the generated image:",
    bullet(merged)
  ].join("\n");
  return block("negative_constraints", "Prohibited (fail-closed)", body);
}
// Advisory precedents from accepted projects. They may shape judgment but never
// grant brand assets, props or narrative that this project did not supply.
function renderKnowledgeContext(knowledge) {
  if (!Array.isArray(knowledge) || !knowledge.length) return null;
  const body = [
    "These precedents come from previously accepted projects. Treat them as judgment aids, not hard requirements.",
    "Do not copy their specific materials, symbols, props, mascots or brand stories.",
    "Do not invent props, characters, signage text or brand assets that this project's materials do not contain.",
    "",
    ...knowledge.map((item) => `- [${item.source}${item.id ? " / " + item.id : ""}] ${item.text}`)
  ].join("\n");
  return block("knowledge_context", "Experience Reference (advisory)", body);
}
function compileSpacePrompt(input) {
  const layers = adaptSpaceSource(input);
  let anchors = [];
  let contextBlock = null;
  if (input.brandKey) {
    const criteria = {...deriveAnchorCriteria(layers, input.taskContract),...input.anchorCriteria};
    criteria.sceneType = input.taskContract?.subtype;
    criteria.mechanismEvidence = layers.decisionTrace.architectureDecisions.filter(item=>item.sceneScope !== "off_frame_dependency").map(item=>item.text);
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
  if (!contextBlock) contextBlock = block("architecture_context", "Architecture Context", [
    "No optional architecture examples have been selected for this request. Brand name and industry do not grant example authority.",
    "Use project decisions and the current user instruction. Artistic focus may coexist with practical reception, waiting, access and privacy requirements; examples cannot replace either dimension.",
    "Do not infer construction details from historical accepted images or from an industry's customary appearance. Preserve explicitly requested complex architecture without importing unrelated scene mechanisms."
  ].join("\n"));
  const referenceImages = anchors.map((a) => ({ anchorId: a.id, imagePath: resolveArchitectureAnchorImagePath(a) })).filter((r) => r.imagePath);
  const continuationIntentText = renderContinuationIntentBlock(input.taskContract?.continuation);
  const continuationBlock = continuationIntentText ? { id: "continuation_intent", title: "Continuation Intent", text: continuationIntentText } : null;
  const knowledgeBlock = renderKnowledgeContext(input.taskContract?.knowledgeContext);
  const styleBlock = renderStyleControls(input.taskContract?.styleControls);
  const ordered = [
    renderTask(layers),
    ...styleBlock ? [styleBlock] : [],
    ...continuationBlock ? [continuationBlock] : [],
    renderSpatialIntent(layers),
    renderArchitectureLanguage(layers),
    ...contextBlock ? [contextBlock] : [],
    ...knowledgeBlock ? [knowledgeBlock] : [],
    renderArchitectureFunctionBridge(layers),
    renderArchitecturalConcept(layers),
    renderArchitectureDna(layers),
    renderBrandTranslation(layers, input.taskContract?.logoUsageMode),
    renderFunctionalRequirement(layers),
    renderColor(layers),
    renderMaterial(layers),
    renderLighting(layers),
    renderComposition(layers),
    renderRendering(),
    renderNegatives(layers, input.taskContract?.logoUsageMode, input.taskContract?.styleControls)
  ];
  const blocksById = Object.fromEntries(ordered.map((b) => [b.id, b]));
  const referenceBoundaryText = renderReferenceBoundary({
    taskContract: input.taskContract,
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
  const authorityGate = input.taskContract?.generationBasis === 'art_direction_reference' || layers.targetSceneProjection?.functionalBlockSource === "target_scene_projection" ? validateTargetSceneAuthority({
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
    blockSources: Object.fromEntries(ordered.map((b) => [b.id, blockSource(b.id,layers)])),
    anchors: anchors.map((a) => ({ id: a.id, role: a.role, imagePath: a.imagePath })),
    referencePolicy: input.referencePolicy || null,
    adapter: input.adapter,
    extra: {
      brandKey: input.brandKey || null,
      anchorCriteria: input.anchorCriteria || null,
      architectureContextIncluded: anchors.length > 0,
      blockIds: presentIds,
      decisionTrace: layers.decisionTrace,
      blockSources: Object.fromEntries(ordered.map(b=>[b.id,blockSource(b.id,layers)])),
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
function blockSource(id,layers) {
  const map = {
    task: ["taskContract", "projectFacts.brandName", "projectFacts.industry"],
    spatial_intent: ["spatial.spatialConcept (normalized)", "semantic.architectureStrategy"],
    architecture_language: ["semantic.architectureStrategy", "semantic.architectureForm", "semantic.architectureOrganization", "materialSystem", "lightingSystem"],
    architecture_context: ["architecture-anchors/registry.json"],
    knowledge_context: ["taskContract.knowledgeContext (advisory precedents)"],
    style_controls: ["taskContract.styleControls (explicit user controls)"],
    architecture_function_bridge: ["projectFacts.brandRole", "spatial.functionalRelationships", "spatial.sceneProgram", "spatial.brandRoleManifestation", "diagnosis.brandMisreadRisks"],
    architectural_concept: ["spatial.spatialConcept (normalized)", "semantic.architectureForm", "semantic.architectureStrategy"],
    architecture_dna: ["semantic.architectureStrategy", "semantic.architectureForm", "semantic.architectureOrganization"],
    brand_translation: ["projectFacts", "semantic.brandMotifSemantics", "semantic.decorativeIdentitySemantics", "semantic.colorAccentSemantics", "spatial.brandRoleManifestation", "_raw.mustBeVisible (identity items only)"],
    functional_requirement: ["spatial.sceneProgram", "spatial.functionalNetwork", "composition.mustBeVisible (spatial items only)", "spatial.positiveDifferentiators"],
    material: ["materialSystem[].material|behavior|forbidden"],
    color: ["colorSystem.primary|secondary|accent (role, spatialUsage, ratio, surfaceApplicability)"],
    lighting: ["lightingSystem.source|contrast|interactionWithMaterials|forbidden"],
    composition: ["taskContract.aspectRatio|scene", "composition.mustBeVisible (spatial items only)", "spatial.positiveDifferentiators", ...layers.composition.userRequirements?.length ? ['mediaTranslations.spatial.compositionRequirements'] : []],
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
