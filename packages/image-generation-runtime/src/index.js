// @masterpiece/image-generation-runtime
// 确定性生图运行时（Phase 2 部分）：上下文快照、Reference Selector、Prompt Compiler、三层 Gate、dry-run。
// Provider 调用、下载与持久化在 Phase 3/4 接入，不属于本 barrel 的编译逻辑。

export {
  REFERENCE_ROLE_ORDER,
  CURRENT_PROJECT_ROLES,
  orderReferences,
  selectReferences,
  hasCurrentProjectReference,
} from './reference-selector.js';

export { TEXT_SAFETY_RULES, compilePrompt } from './prompt-compiler.js';
export { composePrompt, DEFAULT_INTENTS } from './prompt/index.js';
export {
  IMAGE_GENERATION_PIPELINE_MODES,
  resolveImageGenerationPipelineMode,
} from './pipeline-mode.js';

export {
  evaluateIdentityGate,
  evaluateTaskGate,
  evaluateArtifactGate,
  evaluatePreSubmitGates,
  evaluateSourceGate,
  resolvePresetWarnings,
} from './gates.js';

export { buildSourceContextSnapshot } from './context-snapshot.js';
export {
  IMAGE_GENERATION_POLICIES,
  IMAGE_GENERATION_PRESET_CAPABILITIES,
  resolveGenerationPolicy,
} from './policies.js';

export {
  compileImageGenerationTask,
  migrateImageGenerationTaskV1,
  migrateImageGenerationSourcesV2,
} from './task-builder.js';

export { downloadAndVerifyImage } from './download-verify.js';

export { redactProviderRequest, redactProviderResponse } from './redact.js';

export * from './creative-director/index.js';
export * from './reference-plan/index.js';
export * from './deliverables/index.js';
export {
  DELIVERABLE_TEMPLATE_VERSION,
  getDeliverablePromptTemplate,
  compileDeliverableGenerationBlueprint,
  validateDeliverableGenerationBlueprint,
} from './prompt-templates/deliverable-template-system.js';
export {
  PROMPT_TEMPLATE_COMPILER_VERSION,
  compilePromptTemplate,
  verifyPromptTemplateFingerprint,
} from './prompt-templates/prompt-template-compiler.js';
export {
  compileImageEvaluation,
  compileEvaluationPromptAdjustment,
} from './evaluation.js';
export { evaluateDeliverableGate } from './gates/deliverable-gate.js';
