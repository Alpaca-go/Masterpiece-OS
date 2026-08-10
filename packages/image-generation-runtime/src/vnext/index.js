export {
  SHORT_CHAIN_TEMPLATE_REGISTRY_VERSION,
  getVNextTemplate,
  listVNextTemplates,
  listVNextTemplateOptions,
} from './template-registry.js';
export {
  assertVNextProjectPromptAsset,
  validateVNextProjectPromptAsset,
} from './project-prompt-asset.js';
export { createVNextTaskContract, validateVNextTaskContract } from './task-contract.js';
export { SHORT_CHAIN_TEMPLATE_ROUTER_VERSION, routeVNextTemplates } from './template-router.js';
export {
  SHORT_CHAIN_PROMPT_COMPILER_ID,
  SHORT_CHAIN_PROMPT_COMPILER_VERSION,
  compileVNextPrompt,
} from './prompt-compiler.js';
export {
  SEEDREAM_SHORT_CHAIN_ADAPTER_ID,
  SEEDREAM_SHORT_CHAIN_ADAPTER_VERSION,
  createSeedreamVNextAdapter,
} from './seedream-adapter.js';
export { compileVNextImageGeneration } from './compile.js';
export {
  generateGoldenBacktraceAudit,
  renderGoldenBacktraceAuditMarkdown,
} from './golden-backtrace-audit.js';
export { applyUserConfirmedVisualDecision } from './user-confirmed-visual-decision.js';
export {
  SHORT_CHAIN_DELIVERABLE_VALIDATOR_ID,
  SHORT_CHAIN_DELIVERABLE_VALIDATOR_VERSION,
  compileVNextCorrectionPrompt,
  validateVNextDeliverableEvidence,
} from './deliverable-validator.js';
// r2.0 §4.13 / Phase E: re-export the 5-state derivation so the desktop
// service can call it without reaching into the contracts package for
// runtime helpers. The runtime helpers (function values) are
// re-exported via .js-compatible syntax; the type-only exports are
// declared separately for .js callers (Node would reject `type`
// keywords in plain .js files).
export { deriveGenerationFlowState } from '@masterpiece/image-generation-contracts/index.ts';
