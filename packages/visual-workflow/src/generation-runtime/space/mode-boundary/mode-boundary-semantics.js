import { artDirectionReferencePolicy, ART_DIRECTION_ROLE } from '../../../art-direction-contract.js';
const SPACE_MODE_BOUNDARY_VERSION = "space-mode-boundary@1.0.0";
const SPACE_GENERATION_MODES = Object.freeze({
  standard: Object.freeze({
    label: "\u6807\u51C6\u751F\u6210",
    generationBasis: "standard",
    referenceMode: "text_only",
    referenceCount: 0,
    semantic: "\u6839\u636E\u9879\u76EE\u5206\u6790\u4E0E\u7A7A\u95F4\u89C4\u5219\u4ECE\u96F6\u751F\u6210"
  }),
  art_direction_reference: Object.freeze({generationBasis:'art_direction_reference',referenceMode:'reference_assisted',referenceRole:ART_DIRECTION_ROLE,semantic:'Explicit project-authorized attribute references; target function and confirmed direction remain authoritative'}),
  reference_first: Object.freeze({
    label: "\u53C2\u8003\u4F18\u5148",
    generationBasis: "reference_first",
    referenceMode: "reference_assisted",
    referenceRole: "high_fidelity_visual_reference",
    referenceSource: "user_explicit",
    semantic: "\u9AD8\u4FDD\u771F\u7EE7\u627F\u7528\u6237\u660E\u786E\u9009\u62E9\u7684\u53C2\u8003\u56FE"
  }),
  continuation: Object.freeze({
    label: "\u7A7A\u95F4\u5EF6\u5C55",
    generationBasis: "continuation",
    referenceMode: "reference_assisted",
    referenceRole: "world_consistency",
    referenceSource: "confirmed_generated_output",
    semantic: "\u4FDD\u6301\u5DF2\u786E\u8BA4\u7A7A\u95F4\u7684\u8BBE\u8BA1\u4E16\u754C\uFF0C\u4E3A\u53E6\u4E00\u4E2A\u529F\u80FD\u573A\u666F\u91CD\u65B0\u8BBE\u8BA1"
  })
});
const LEGACY_CORE_REFERENCE_ROLE = "core_reference";
const CONTINUATION_COMPOSITION_PRESERVATION_PATTERNS = Object.freeze([
  /preserve the requested shot/iu,
  /preserve the requested composition/iu,
  /preserve requested shot\/composition/iu
]);
function evaluateSpaceModeBoundary({
  currentMode = "standard",
  sourceAssetOrigin,
  sourceScene,
  targetScene
} = {}) {
  const sourceKnown = Boolean(sourceAssetOrigin) && sourceAssetOrigin === "generated_output" && Boolean(sourceScene);
  const targetKnown = Boolean(targetScene);
  const crossSceneKnown = sourceKnown && targetKnown && String(sourceScene) !== String(targetScene);
  const advisory = currentMode === "reference_first" && crossSceneKnown ? { code: "SPACE_REFERENCE_FIRST_CROSS_SCENE_ADVISORY", severity: "info" } : null;
  return {
    currentMode,
    sourceAssetOrigin: sourceAssetOrigin ?? null,
    sourceScene: sourceScene ?? null,
    targetScene: targetScene ?? null,
    crossSceneKnown,
    advisory,
    recommendedMode: advisory ? "continuation" : void 0
  };
}
function isHighFidelityReferenceRole(role) {
  return String(role ?? "") === "high_fidelity_visual_reference";
}
function detectCompositionPreservationLeak(prompt) {
  const text = String(prompt ?? "");
  return CONTINUATION_COMPOSITION_PRESERVATION_PATTERNS.some((pattern) => pattern.test(text));
}
function validateSpaceGenerationModeSemantics(input = {}) {
  const generationBasis = input.generationBasis;
  const referenceSources = Array.isArray(input.referenceSources) ? input.referenceSources : [];
  const referenceCount = Number(input.referenceCount ?? 0);
  const referenceRole = String(input.referenceRole ?? "");
  if (generationBasis === 'art_direction_reference') {
    if (referenceRole !== ART_DIRECTION_ROLE || !artDirectionReferencePolicy(input.taskContract,referenceCount,'reference_assisted',referenceSources)) throw new Error('ART_DIRECTION_MODE_INVALID');
    return {status:'pass',advisory:null,mode:SPACE_GENERATION_MODES.art_direction_reference};
  }
  if (generationBasis === "standard") {
    if (referenceCount !== 0) {
      throw Object.assign(new Error("Standard space generation must remain text-only."), {
        code: "SPACE_STANDARD_REFERENCE_NOT_ALLOWED"
      });
    }
    return { status: "pass", advisory: null, mode: SPACE_GENERATION_MODES.standard };
  }
  if (generationBasis === "reference_first") {
    const modeSemantics = evaluateSpaceModeBoundary({
      currentMode: "reference_first",
      sourceAssetOrigin: input.sourceAssetOrigin,
      sourceScene: input.sourceScene,
      targetScene: input.targetScene
    });
    return {
      status: "pass",
      advisory: modeSemantics.advisory,
      mode: SPACE_GENERATION_MODES.reference_first
    };
  }
  if (generationBasis === "continuation") {
    if (isHighFidelityReferenceRole(referenceRole)) {
      throw Object.assign(
        new Error("SPACE_CONTINUATION_REFERENCE_SEMANTIC_MISMATCH: Continuation must not carry a high-fidelity reference role."),
        { code: "SPACE_CONTINUATION_REFERENCE_SEMANTIC_MISMATCH" }
      );
    }
    if (detectCompositionPreservationLeak(input.finalPrompt)) {
      throw Object.assign(
        new Error("SPACE_CONTINUATION_COMPOSITION_PRESERVATION_LEAK: Continuation prompt must not preserve the source shot/composition."),
        { code: "SPACE_CONTINUATION_COMPOSITION_PRESERVATION_LEAK" }
      );
    }
    if (referenceRole !== "world_consistency" && referenceRole !== LEGACY_CORE_REFERENCE_ROLE) {
      throw Object.assign(
        new Error("SPACE_CONTINUATION_REFERENCE_SEMANTIC_MISMATCH: Continuation requires the world_consistency reference role."),
        { code: "SPACE_CONTINUATION_REFERENCE_SEMANTIC_MISMATCH" }
      );
    }
    if (referenceSources.length !== 1 || referenceSources[0] !== "confirmed_generated_output") {
      throw Object.assign(
        new Error("SPACE_CONTINUATION_REFERENCE_REQUIRED: Continuation requires exactly one confirmed generated output reference."),
        { code: "SPACE_CONTINUATION_REFERENCE_REQUIRED" }
      );
    }
    return { status: "pass", advisory: null, mode: SPACE_GENERATION_MODES.continuation };
  }
  throw Object.assign(new Error(`SPACE_GENERATION_MODE_BOUNDARY_AMBIGUITY: unknown generationBasis ${generationBasis}`), {
    code: "SPACE_GENERATION_MODE_BOUNDARY_AMBIGUITY"
  });
}
export {
  CONTINUATION_COMPOSITION_PRESERVATION_PATTERNS,
  LEGACY_CORE_REFERENCE_ROLE,
  SPACE_GENERATION_MODES,
  SPACE_MODE_BOUNDARY_VERSION,
  detectCompositionPreservationLeak,
  evaluateSpaceModeBoundary,
  isHighFidelityReferenceRole,
  validateSpaceGenerationModeSemantics
};
