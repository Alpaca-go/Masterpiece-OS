const GENERATION_DELIVERABLE_LABELS = {
  anchor_image: "Anchor Image",
  brand_poster: "\u54C1\u724C\u6D77\u62A5",
  packaging_render: "\u5305\u88C5\u6E32\u67D3\u56FE",
  vi_application: "VI \u5E94\u7528\u56FE",
  interior_scene: "\u5E97\u5185\u7A7A\u95F4\u6548\u679C\u56FE",
  storefront_scene: "\u5E97\u9762 / \u95E8\u5934\u6548\u679C\u56FE",
  free_concept: "\u81EA\u7531\u6982\u5FF5\u56FE"
};
const EXECUTING_IMAGE_RUN_STATUSES = [
  "submitting",
  "queued",
  "running",
  "downloading"
];
const IMAGE_GENERATION_SCHEMA_VERSION = "1.0";
const DEFAULT_IMAGE_PROVIDER_ID = "dashscope";
const DEFAULT_IMAGE_MODEL_ID = "wan2.7-image-pro";
const DEFAULT_IMAGE_OUTPUT_TYPE = "master_anchor_image";
const DEFAULT_IMAGE_OUTPUT_COUNT = 1;
const VNEXT_SIMILARITY_AUDIT_THRESHOLDS = Object.freeze({
  /** The first 5 dimensions must meet this minimum. */
  minScore: 4,
  /** The near-copy risk must stay at or below this maximum (lower is better). */
  maxNearCopyRisk: 2.5,
  /** Auditor version, for trace compatibility. */
  auditorVersion: "space-similarity-audit@1.0.0"
});
function assertShortChainSimilarityAudit(scores, thresholds = VNEXT_SIMILARITY_AUDIT_THRESHOLDS) {
  const min = thresholds.minScore;
  const maxRisk = thresholds.maxNearCopyRisk;
  for (const [key, value] of Object.entries(scores)) {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1 || value > 5) {
      throw new Error(`ShortChainSimilarityAudit: dimension "${key}" must be an integer in 1..5, got ${value}`);
    }
  }
  const visualWorldFidelity = scores.visualWorldFidelity >= min;
  const sceneAccuracy = scores.sceneAccuracy >= min;
  const functionalRealism = scores.functionalRealism >= min;
  const targetSceneAuthority = scores.targetSceneAuthority >= min;
  const referenceAlignment = scores.referenceAlignment >= min;
  const nearCopyRisk = scores.nearCopyRisk <= maxRisk;
  return {
    visualWorldFidelity,
    sceneAccuracy,
    functionalRealism,
    targetSceneAuthority,
    referenceAlignment,
    nearCopyRisk,
    overall: visualWorldFidelity && sceneAccuracy && functionalRealism && targetSceneAuthority && referenceAlignment && nearCopyRisk
  };
}
function deriveGenerationFlowState(input) {
  if (input.initialRun.status !== "succeeded") return "initial_failed";
  if (!input.initialValidation) return "awaiting_validation";
  // Validation is not an image ranking and never authorizes paid work.
  if (input.correctionRun) return "awaiting_human_review";
  if (input.initialValidation.status !== "passed") return "awaiting_human_review";
  return "passed";
}
import {
  PACKAGING_SHOT_CONTRACT_VERSION,
  PACKAGING_SHOT_CONTRACTS,
  PACKAGING_SHOT_CONTRACT_LABELS,
  isPackagingShotContract,
  PACKAGING_FAILURE_CODES_VERSION,
  PACKAGING_FAILURE_CODES,
  PACKAGING_AUTO_FAIL_CODES,
  isPackagingFailureCode
} from "./packaging-shot-contract.js";
export {
  DEFAULT_IMAGE_MODEL_ID,
  DEFAULT_IMAGE_OUTPUT_COUNT,
  DEFAULT_IMAGE_OUTPUT_TYPE,
  DEFAULT_IMAGE_PROVIDER_ID,
  EXECUTING_IMAGE_RUN_STATUSES,
  GENERATION_DELIVERABLE_LABELS,
  IMAGE_GENERATION_SCHEMA_VERSION,
  PACKAGING_AUTO_FAIL_CODES,
  PACKAGING_FAILURE_CODES,
  PACKAGING_FAILURE_CODES_VERSION,
  PACKAGING_SHOT_CONTRACTS,
  PACKAGING_SHOT_CONTRACT_LABELS,
  PACKAGING_SHOT_CONTRACT_VERSION,
  VNEXT_SIMILARITY_AUDIT_THRESHOLDS,
  assertShortChainSimilarityAudit,
  deriveGenerationFlowState,
  isPackagingFailureCode,
  isPackagingShotContract
};
