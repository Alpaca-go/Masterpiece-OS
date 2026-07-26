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

export {
  evaluateIdentityGate,
  evaluateTaskGate,
  evaluateArtifactGate,
  evaluatePreSubmitGates,
} from './gates.js';

export { buildSourceContextSnapshot } from './context-snapshot.js';

export { compileImageGenerationTask } from './task-builder.js';
