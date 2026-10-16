const REFERENCE_BOUNDARY_VERSION = "space-reference-boundary@1.0.0";
const PRESERVE_DESIGN_LANGUAGE = [
  "architectural language",
  "material combination",
  "lighting temperament",
  "color relationships",
  "surface behavior",
  "form rhythm"
];
const TARGET_SCENE_AUTHORITATIVE = [
  "function",
  "furniture",
  "privacy",
  "room scale",
  "circulation",
  "scene-specific composition"
];
function renderReferenceBoundary({
  generationBasis,
  referenceSceneRelation = "unknown",
  targetSceneLabel = "",
  adapterCapability = null
} = {}) {
  if (generationBasis !== "reference_first") return null;
  const strengthSupported = Boolean(
    adapterCapability?.reference?.referenceStrengthControl?.supported
  );
  const strengthParameter = adapterCapability?.reference?.referenceStrengthControl?.controlParameter;
  const preserve = PRESERVE_DESIGN_LANGUAGE.map((item) => `- ${item}`).join("\n");
  const targetAuthoritative = TARGET_SCENE_AUTHORITATIVE.map((item) => `- ${item}`).join("\n");
  const sameScene = referenceSceneRelation === "same_scene";
  const crossScene = referenceSceneRelation === "cross_scene";
  const intentLine = crossScene ? "The target scene is a different functional class from the reference; inherit design language only." : sameScene ? "The target scene shares the same functional class as the reference; keep the same design language but allow for legitimate variation within the scene." : "Whether the target scene shares the reference scene class is not declared; inherit design language only and let the target scene function drive the spatial program.";
  const sceneSuffix = targetSceneLabel ? `
Target scene: ${targetSceneLabel}.` : "";
  const strengthNote = strengthSupported && strengthParameter ? `
Provider weight parameter "${strengthParameter}" is available and SHOULD be used: high for same_scene, low for cross_scene.` : "\nProvider weight / role controls are not available for this model. The text above is the only boundary; do not invent or assume additional controls.";
  return [
    "REFERENCE BOUNDARY (high-priority instruction):",
    "",
    intentLine,
    sceneSuffix,
    "",
    "Preserve from the reference image:",
    preserve,
    "",
    "Target scene is authoritative for:",
    targetAuthoritative,
    "",
    "Reorganize spatial elements as needed for the target scene.",
    "Preserve design language, not exact placement.",
    strengthNote
  ].filter(Boolean).join("\n");
}
function resolveProviderStrengthControlLabel(adapterCapability) {
  if (!adapterCapability) return "unsupported";
  return adapterCapability.reference?.referenceStrengthControl?.supported ? "supported" : "unsupported";
}
export {
  REFERENCE_BOUNDARY_VERSION,
  renderReferenceBoundary,
  resolveProviderStrengthControlLabel
};
