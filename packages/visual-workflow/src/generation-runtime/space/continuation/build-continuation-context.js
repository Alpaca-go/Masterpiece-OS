const CONTINUATION_CONTEXT_VERSION = "space-continuation-context@1.1.0";
const CONTINUATION_PRESERVE = Object.freeze([
  "brand world",
  "architecture language",
  "material palette",
  "lighting temperament",
  "boundary language",
  "spatial rhythm",
  "color roles",
  "visual DNA"
]);
const CONTINUATION_REGENERATE = Object.freeze([
  "functional program",
  "floor plan",
  "furniture layout",
  "circulation",
  "privacy level",
  "equipment",
  "room scale",
  "composition",
  "camera relationship",
  "operational objects"
]);
const CONTINUATION_REFERENCE_ROLE = "world_consistency";
const FORBIDDEN_REFERENCE_ROLES = /* @__PURE__ */ new Set([
  "composition_preservation",
  "layout_preservation",
  "scene_preservation",
  "exact_furniture_preservation",
  "exact_ceiling_preservation",
  "exact_reception_desk_preservation",
  "high_fidelity_visual_reference"
]);
function buildContinuationContext(contract = {}) {
  const targetProgram = contract.targetFunctionalProgram ?? {};
  return {
    continuation: {
      sourceAssetId: contract.confirmedSourceAssetId ?? null,
      sourceRunId: contract.sourceRunId ?? null,
      sourceScene: contract.sourceScene ?? "",
      targetScene: contract.targetScene ?? "",
      referenceRole: CONTINUATION_REFERENCE_ROLE,
      referenceSource: "confirmed_generated_output",
      preserve: [...CONTINUATION_PRESERVE],
      regenerate: [...CONTINUATION_REGENERATE],
      targetFunctionalProgramId: targetProgram.sceneId ?? null,
      targetFunctionalProgram: targetProgram
    },
    continuationBoundary: {
      preserve: [...CONTINUATION_PRESERVE],
      regenerate: [...CONTINUATION_REGENERATE]
    }
  };
}
function renderContinuationIntentBlock(contract = {}) {
  if (!contract || contract.generationBasis !== "continuation") return null;
  const sourceScene = contract.sourceScene;
  const targetScene = contract.targetScene;
  const targetLabel = contract.targetSceneLabel;
  if (!sourceScene || !targetScene) return null;
  const program = contract.targetFunctionalProgram ?? {};
  const drop = Array.isArray(program.sourceProgramElementsToDrop) ? program.sourceProgramElementsToDrop : [];
  const lines = [
    `# Continuation Intent`,
    `Continue the confirmed ${sourceScene} world into a **${targetLabel || targetScene}** scene.`,
    "Reference = WORLD-CONSISTENCY only (keep architecture language, materials, light, boundaries, rhythm, color, brand).",
    "REGENERATE for the new scene: program, layout, circulation, privacy, scale, furniture, composition."
  ];
  if (program.requiredFunctions?.length) {
    lines.push(`Target program: ${program.requiredFunctions.slice(0, 4).join("\uFF1B")}`);
  }
  if (drop.length) {
    lines.push(`Do not carry over: ${drop.slice(0, 4).join("\uFF1B")}`);
  }
  if (contract.userRequirement) lines.push(`Requirement: ${contract.userRequirement}`);
  return lines.join("\n");
}
function isForbiddenContinuationReferenceRole(role) {
  return FORBIDDEN_REFERENCE_ROLES.has(String(role ?? ""));
}
export {
  CONTINUATION_CONTEXT_VERSION,
  CONTINUATION_PRESERVE,
  CONTINUATION_REFERENCE_ROLE,
  CONTINUATION_REGENERATE,
  buildContinuationContext,
  isForbiddenContinuationReferenceRole,
  renderContinuationIntentBlock
};
