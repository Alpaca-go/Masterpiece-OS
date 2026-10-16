const SPACE_REFERENCE_POLICY_VERSION = "space-reference-policy@2.0.0";
const NON_REFERENCE_ROLES = /* @__PURE__ */ new Set(["logo", "package_structure", "dieline", "icon"]);
function isUsableSpaceReference(asset) {
  if (!asset) return false;
  if (NON_REFERENCE_ROLES.has(asset.role)) return false;
  if (typeof asset.relativePath === "string" && /\.(pdf)$/iu.test(asset.relativePath)) return false;
  return true;
}
function resolveSpaceReferences({
  generationBasis = "standard",
  explicitAssets = [],
  implicitAnchor = null,
  architectureAnchorImages = [],
  continuationReferenceSource = "confirmed_generated_output",
  maxReferences = 2
} = {}) {
  const referenceAssisted = generationBasis === "reference_first" || generationBasis === "continuation";
  const trace = {
    referencePolicyVersion: SPACE_REFERENCE_POLICY_VERSION,
    generationBasis,
    referenceMode: referenceAssisted ? "reference_assisted" : "text_only",
    explicitAssetIds: explicitAssets.map((a) => a.assetId),
    implicitAnchorId: implicitAnchor?.imageId ?? null,
    architectureAnchorIds: architectureAnchorImages.map((a) => a.anchorId),
    providerReferences: []
  };
  const references = [];
  const add = (ref, source) => {
    if (references.length >= maxReferences) return;
    if (references.some((r) => r.id === ref.id)) return;
    references.push({ ...ref, source });
    trace.providerReferences.push({
      id: ref.id,
      role: ref.role,
      semanticRole: ref.semanticRole ?? null,
      source,
      projectRelativePath: ref.projectRelativePath
    });
  };
  if (generationBasis === "standard") {
    trace.providerReferenceCount = 0;
    return { references, trace };
  }
  for (const asset of explicitAssets) {
    if (!isUsableSpaceReference(asset)) continue;
    const isContinuation = generationBasis === "continuation";
    add({
      id: asset.assetId,
      role: "core_reference",
      semanticRole: isContinuation ? "world_consistency" : "high_fidelity_visual_reference",
      referenceRole: isContinuation ? "world_consistency" : "high_fidelity_visual_reference",
      projectRelativePath: asset.usage === "generation_reference" ? asset.relativePath : `input/${asset.relativePath}`
    }, isContinuation ? continuationReferenceSource : "user_explicit");
  }
  trace.providerReferenceCount = references.length;
  return { references, trace };
}
function assertSpaceReferenceAvailable(references, { generationBasis = "standard" } = {}) {
  if (generationBasis === "standard") {
    if (references?.length) {
      throw Object.assign(new Error("Standard space generation must remain text-only."), {
        code: "SPACE_STANDARD_REFERENCE_NOT_ALLOWED"
      });
    }
    return;
  }
  if ((generationBasis === "reference_first" || generationBasis === "continuation") && (!references || references.length === 0)) {
    throw Object.assign(
      new Error(generationBasis === "continuation" ? "SPACE_CONTINUATION_REFERENCE_REQUIRED: Continuation requires a confirmed generated output reference." : "SPACE_REFERENCE_FIRST_REFERENCE_REQUIRED: Reference-First requires an explicit user-selected reference."),
      { code: generationBasis === "continuation" ? "SPACE_CONTINUATION_REFERENCE_REQUIRED" : "SPACE_REFERENCE_FIRST_REFERENCE_REQUIRED" }
    );
  }
}
export {
  SPACE_REFERENCE_POLICY_VERSION,
  assertSpaceReferenceAvailable,
  resolveSpaceReferences
};
