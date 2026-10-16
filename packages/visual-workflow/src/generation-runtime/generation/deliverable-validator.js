const SHORT_CHAIN_DELIVERABLE_VALIDATOR_ID = "short-chain-deliverable-validator";
const SHORT_CHAIN_DELIVERABLE_VALIDATOR_VERSION = "short-chain-deliverable-validator@2.0.0";
const FAMILIES = /* @__PURE__ */ new Set(["space", "packaging", "vi", "poster"]);
function list(value) {
  return [...new Set((Array.isArray(value) ? value : []).filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean))];
}
function validateShortChainDeliverableEvidence({
  projectId,
  taskContract,
  runId,
  imageId,
  evidence,
  validatedAt = (/* @__PURE__ */ new Date()).toISOString()
}) {
  const detectedFamily = FAMILIES.has(evidence?.detectedFamily) ? evidence.detectedFamily : "unknown";
  const detectedSubtype = typeof evidence?.detectedSubtype === "string" && evidence.detectedSubtype.trim() ? evidence.detectedSubtype.trim() : "unknown";
  const visibleEvidence = list(evidence?.visibleEvidence);
  const missingRequiredItems = list(taskContract.logoUsageMode === "post_composite" ? evidence?.missingRequiredStructures : evidence?.missingRequiredItems);
  const forbiddenItemsFound = list(taskContract.logoUsageMode === "post_composite" ? evidence?.forbiddenNonIdentityItems : evidence?.forbiddenItemsFound);
  // Legacy observations mix identity absence with other asset violations.
  const postComposite = taskContract.logoUsageMode === "post_composite";
  const deferredIdentityFindings = postComposite ? list(evidence?.lockedAssetViolations) : [];
  const legacyUnscopedFindings = postComposite ? [...list(evidence?.missingRequiredItems), ...list(evidence?.forbiddenItemsFound)] : [];
  const lockedAssetViolations = postComposite
    ? list(evidence?.nonIdentityLockedAssetViolations)
    : list(evidence?.lockedAssetViolations);
  const generatedIdentityEvidence = list(evidence?.generatedIdentityEvidence);
  const brandMatch = ["matched", "mismatched", "uncertain"].includes(evidence?.brandMatch) ? evidence.brandMatch : "uncertain";
  const brandToneMatch = ["matched", "mismatched", "uncertain"].includes(evidence?.brandToneMatch) ? evidence.brandToneMatch : "uncertain";
  const sceneCompleteness = ["complete", "incomplete", "uncertain"].includes(evidence?.sceneCompleteness) ? evidence.sceneCompleteness : "uncertain";
  const logoTextStatus = ["correct", "incorrect", "absent", "uncertain", "not_required"].includes(evidence?.logoTextStatus) ? evidence.logoTextStatus : "uncertain";
  const qualityIssues = list(evidence?.qualityIssues);
  const mismatchTypes = [];
  if (detectedFamily !== "unknown" && detectedFamily !== taskContract.deliverableFamily) {
    mismatchTypes.push("wrong_family");
  }
  if (detectedFamily === taskContract.deliverableFamily && detectedSubtype !== "unknown" && detectedSubtype !== taskContract.subtype) {
    mismatchTypes.push("wrong_subtype");
  }
  if (missingRequiredItems.length) mismatchTypes.push("missing_required_structure");
  if (lockedAssetViolations.length) mismatchTypes.push("locked_asset_violation");
  if (forbiddenItemsFound.length) mismatchTypes.push("forbidden_content");
  if (brandMatch === "mismatched") mismatchTypes.push("brand_mismatch");
  if (brandToneMatch === "mismatched") mismatchTypes.push("brand_tone_mismatch");
  if (sceneCompleteness === "incomplete") mismatchTypes.push("scene_incomplete");
  if (logoTextStatus === "incorrect" && (!postComposite || generatedIdentityEvidence.length)) mismatchTypes.push("logo_text_error");
  if (qualityIssues.length) mismatchTypes.push("quality_issue");
  const blockingTypes = new Set(["wrong_family", "wrong_subtype", "missing_required_structure",
    "locked_asset_violation", "forbidden_content", "scene_incomplete", "logo_text_error"]);
  const blockingFindings = mismatchTypes.filter(type => blockingTypes.has(type)).map(type => ({
    type,
    evidence: type === "missing_required_structure" ? missingRequiredItems
      : type === "locked_asset_violation" ? lockedAssetViolations
      : type === "forbidden_content" ? forbiddenItemsFound
      : type === "logo_text_error" && postComposite ? generatedIdentityEvidence : visibleEvidence,
    source: "model_observation_requires_review"
  })).filter(finding => finding.evidence.length);
  const advisoryFindings = mismatchTypes.filter(type => !blockingFindings.some(finding => finding.type === type));
  const unverified = detectedFamily === "unknown" || visibleEvidence.length === 0 ||
    detectedSubtype === "unknown" || brandMatch === "uncertain" || brandToneMatch === "uncertain" ||
    sceneCompleteness === "uncertain" || logoTextStatus === "uncertain" ||
    (postComposite && logoTextStatus === "incorrect" && !generatedIdentityEvidence.length) ||
    deferredIdentityFindings.length > 0 || legacyUnscopedFindings.length > 0;
  const status = blockingFindings.length ? "failed" : unverified || advisoryFindings.length ? "unverified" : "passed";
  return {
    schemaVersion: "1.0",
    projectId,
    taskId: taskContract.taskId,
    runId,
    imageId,
    status,
    detectedFamily,
    detectedSubtype,
    visibleEvidence,
    missingRequiredItems,
    forbiddenItemsFound,
    lockedAssetViolations,
    deferredIdentityFindings,
    legacyUnscopedFindings,
    generatedIdentityEvidence,
    logoIntegrity: postComposite ? "pending_post_composite" : "requires_identity_review",
    validationStage: "generation",
    blockingFindings,
    advisoryFindings,
    brandMatch,
    brandToneMatch,
    sceneCompleteness,
    logoTextStatus,
    qualityIssues,
    mismatchTypes,
    retryRecommended: false,
    humanReviewRequired: status !== "passed" || postComposite,
    validatorId: SHORT_CHAIN_DELIVERABLE_VALIDATOR_ID,
    validatorVersion: SHORT_CHAIN_DELIVERABLE_VALIDATOR_VERSION,
    validatedAt
  };
}
function compileShortChainCorrectionPrompt({
  originalPrompt,
  taskContract,
  validation
}) {
  if (validation.status !== "failed") {
    throw new Error("A correction prompt requires a failed deliverable validation");
  }
  const mismatch = [
    validation.mismatchTypes.includes("wrong_family") ? `The previous image was detected as ${validation.detectedFamily}; it must be ${taskContract.deliverableFamily}.` : "",
    validation.mismatchTypes.includes("wrong_subtype") ? `The previous subtype was ${validation.detectedSubtype}; it must be ${taskContract.subtype}.` : "",
    ...validation.missingRequiredItems.map((item) => `Missing required structure: ${item}.`),
    ...validation.lockedAssetViolations.map((item) => `Restore locked requirement: ${item}.`),
    ...validation.forbiddenItemsFound.map((item) => `Do not show: ${item}.`),
    validation.mismatchTypes.includes("brand_tone_mismatch") ? "Restore the confirmed project tone and remove generic category styling." : "",
    validation.mismatchTypes.includes("scene_incomplete") ? "Rebuild a complete, continuous and functionally legible scene." : "",
    validation.mismatchTypes.includes("logo_text_error") ? taskContract.logoUsageMode === "reference" ? "Use only the supplied identity reference; do not invent or repeat logos or text." : "Remove every logo, letter, word and pseudo-text; keep only a clean placement area." : "",
    ...list(validation.qualityIssues).map((item) => `Repair visible quality issue: ${item}.`)
  ].filter(Boolean);
  return [
    originalPrompt.trim(),
    "",
    "Text-only regeneration candidate; the previous image is not supplied. Scene content preservation is not guaranteed.",
    `Regenerate exactly one ${taskContract.deliverableFamily} / ${taskContract.subtype} result.`,
    ...mismatch.map((item) => `- ${item}`),
    `- Request the shot/composition: ${taskContract.shot}; this does not preserve pixels or objects from the previous image.`,
    "- Produce a formal finished deliverable, not an analysis board, moodboard, or collection of unrelated mockups."
  ].join("\n");
}
export {
  SHORT_CHAIN_DELIVERABLE_VALIDATOR_ID,
  SHORT_CHAIN_DELIVERABLE_VALIDATOR_VERSION,
  compileShortChainCorrectionPrompt,
  validateShortChainDeliverableEvidence
};
