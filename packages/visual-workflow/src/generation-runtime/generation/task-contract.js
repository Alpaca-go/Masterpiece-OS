import crypto from "node:crypto";
import { assertArtDirectionSnapshot } from '../../art-direction-contract.js';
const FAMILIES = /* @__PURE__ */ new Set(["space", "packaging", "vi", "poster"]);
const RATIOS = /* @__PURE__ */ new Set(["1:1", "4:3", "3:4", "16:9", "9:16"]);
const LOGO_USAGE_MODES = /* @__PURE__ */ new Set(["reference", "blank_area", "post_composite", "in_image"]);
// Explicit, coarse controls. Every axis has a designer-choice default; unknown
// values fall back to it instead of failing the task.
const STYLE_AXES = Object.freeze({
  lighting: ["bright", "warm_dim", "natural", "designer_choice"],
  density: ["sparse", "balanced", "dense", "designer_choice"],
  materials: ["brick_wood", "metal", "stone", "plaster", "mixed", "designer_choice"],
  brandColorArea: ["accent", "half", "dominant", "designer_choice"],
  tradition: ["modern", "balanced", "traditional", "designer_choice"],
  props: ["none", "lived_in", "designer_choice"],
  shot: ["entrance", "interior", "detail", "designer_choice"],
  priceDisplay: ["none", "real_menu", "placeholder"]
});
const STYLE_DEFAULTS = Object.freeze({
  lighting: "designer_choice",
  density: "designer_choice",
  materials: "designer_choice",
  brandColorArea: "designer_choice",
  tradition: "designer_choice",
  props: "designer_choice",
  shot: "designer_choice",
  // Policy A: no numeric prices in generated images unless a real menu is supplied.
  priceDisplay: "none"
});
function cleanStyleControls(value) {
  const source = value && typeof value === "object" ? value : {};
  const out = {};
  for (const [axis, allowed] of Object.entries(STYLE_AXES)) {
    const candidate = String(source[axis] ?? "").trim();
    out[axis] = allowed.includes(candidate) ? candidate : STYLE_DEFAULTS[axis];
  }
  return out;
}
function cleanList(value) {
  return [...new Set((Array.isArray(value) ? value : []).filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean))];
}
function createShortChainTaskContract(input, options = {}) {
  const family = String(input?.deliverableFamily ?? "").trim();
  const subtype = String(input?.subtype ?? "").trim();
  const scene = String(input?.scene ?? "").trim();
  const shot = String(input?.shot ?? "").trim();
  const currentInstruction = String(input?.currentInstruction ?? "").trim();
  const requestedReferenceAssetIds = cleanList(input?.referenceAssetIds);
  const rawBasis = input?.generationBasis;
  const generationBasis = rawBasis === 'art_direction_reference' ? rawBasis : rawBasis === "continuation" ? "continuation" : rawBasis === "reference_first" ? "reference_first" : rawBasis === "standard" ? "standard" : requestedReferenceAssetIds.length ? "reference_first" : "standard";
  const continuation = input?.continuation ?? null;
  const count = Number(input?.count ?? 1);
  const aspectRatio = String(input?.aspectRatio ?? "16:9");
  const logoUsageMode = String(input?.logoUsageMode ?? "blank_area");
  const shotSource = input?.shotSource === "user_explicit" ? "user_explicit" : input?.shotSource === "target_scene_default" ? "target_scene_default" : "legacy_project_default";
  const referenceSceneRelation = generationBasis === "reference_first" ? input?.referenceSceneRelation === "same_scene" ? "same_scene" : input?.referenceSceneRelation === "cross_scene" ? "cross_scene" : "unknown" : void 0;
  if (!input?.projectId) throw new Error("projectId is required");
  if (!FAMILIES.has(family)) throw new Error(`Unsupported deliverable family: ${family || "(empty)"}`);
  if (!subtype) throw new Error("subtype is required");
  if (!shot) throw new Error("shot is required");
  if (!currentInstruction) throw new Error("currentInstruction is required");
  if (count !== 1 && count !== 2) throw new Error("count must be 1 or 2");
  if (!RATIOS.has(aspectRatio)) throw new Error(`Unsupported aspect ratio: ${aspectRatio}`);
  if (!LOGO_USAGE_MODES.has(logoUsageMode)) {
    throw new Error(`Unsupported logo usage mode: ${logoUsageMode}`);
  }
  if (family === "vi" && subtype === "unspecified") {
    throw new Error("VI generation requires a concrete material subtype");
  }
  const referenceAssetIds = requestedReferenceAssetIds;
  if (generationBasis === 'art_direction_reference') {
    if (family !== 'space' || input.referenceAssetIds?.length !== referenceAssetIds.length) throw new Error('ART_DIRECTION_SELECTION_INVALID');
    assertArtDirectionSnapshot(input.artDirection,input.projectId,referenceAssetIds);
  }
  if (family === "space" && generationBasis === "standard" && referenceAssetIds.length) {
    throw Object.assign(new Error("Standard space generation cannot include provider references."), {
      code: "SPACE_STANDARD_REFERENCE_NOT_ALLOWED"
    });
  }
  if (family === "space" && generationBasis === "reference_first" && !referenceAssetIds.length) {
    throw Object.assign(new Error("Reference-First space generation requires an explicit reference."), {
      code: "SPACE_REFERENCE_FIRST_REFERENCE_REQUIRED"
    });
  }
  if (family === "space" && generationBasis === "continuation") {
    if (!continuation) {
      throw Object.assign(new Error("Continuation space generation requires a continuation intent."), {
        code: "SPACE_CONTINUATION_INTENT_REQUIRED"
      });
    }
    if (referenceAssetIds.length !== 1) {
      throw Object.assign(new Error("Continuation requires exactly one confirmed generated output reference."), {
        code: "SPACE_CONTINUATION_REFERENCE_REQUIRED"
      });
    }
  }
  // Advisory precedents from accepted projects. Never a hard requirement and
  // never a source of brand props or assets that the project did not supply.
  const knowledgeContext = Array.isArray(input?.knowledgeContext)
    ? input.knowledgeContext
      .filter((item) => item && typeof item.text === "string" && item.text.trim())
      .slice(0, 7)
      .map((item) => ({
        id: String(item.id || "").trim().slice(0, 80),
        source: String(item.source || "case-library").trim().slice(0, 120),
        text: item.text.trim().slice(0, 1200)
      }))
    : [];
  // Only an explicitly supplied object activates style controls, so legacy
  // standard requests keep their byte-identical prompt bodies.
  const hasStyleControls = Boolean(input?.styleControls) && typeof input.styleControls === "object";
  const styleControls = hasStyleControls ? cleanStyleControls(input.styleControls) : null;
  return {
    schemaVersion: "1.0",
    taskId: input.taskId || `vnext-task-${crypto.randomUUID()}`,
    projectId: input.projectId,
    deliverableFamily: family,
    subtype,
    ...scene ? { scene } : {},
    shot,
    count,
    aspectRatio,
    currentInstruction,
    generationBasis,
    ...generationBasis === 'art_direction_reference' ? {artDirection:structuredClone(input.artDirection)} : {},
    mustInclude: cleanList(input.mustInclude),
    mustAvoid: cleanList(input.mustAvoid),
    ...knowledgeContext.length ? { knowledgeContext } : {},
    ...styleControls ? { styleControls } : {},
    referenceAssetIds,
    logoUsageMode,
    ...continuation ? { continuation } : {},
    shotSource,
    ...referenceSceneRelation ? { referenceSceneRelation } : {},
    createdAt: options.now || (/* @__PURE__ */ new Date()).toISOString()
  };
}
function validateShortChainTaskContract(task) {
  try {
    createShortChainTaskContract(task, { now: task?.createdAt });
    return { valid: true, errors: [] };
  } catch (error) {
    return { valid: false, errors: [error instanceof Error ? error.message : String(error)] };
  }
}
export {
  createShortChainTaskContract,
  validateShortChainTaskContract
};
