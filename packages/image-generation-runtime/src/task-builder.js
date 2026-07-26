// @masterpiece/image-generation-runtime/task-builder
// 编译入口：把上游上下文 + Provider 能力 + 参考图 编译为 ImageGenerationTask，
// 执行 Reference Selector → Prompt Compiler → 提交前三层 Gate（A+B）。
// 本函数即「dry-run」核心：产出全部制品与 Gate 结果，但不调用 Provider、不写磁盘。

import { selectReferences } from './reference-selector.js';
import { compilePrompt } from './prompt-compiler.js';
import { evaluatePreSubmitGates } from './gates.js';
import { buildSourceContextSnapshot } from './context-snapshot.js';

/**
 * @param {object} input
 * @param {string} input.projectId
 * @param {string} input.runId
 * @param {string} input.taskId
 * @param {string} input.referenceAnchorRunId
 * @param {boolean} input.anchorApproved
 * @param {import('@masterpiece/project-contracts').ResolvedProjectContext} input.resolvedContext
 * @param {import('@masterpiece/project-contracts').ReferenceStyleCapsule} input.capsule
 * @param {string} input.anchorBriefMarkdown
 * @param {import('@masterpiece/image-generation-contracts').ImageGenerationReference[]} input.references
 * @param {import('@masterpiece/image-generation-contracts').ImageProviderCapabilities} input.capabilities
 * @param {{ apiKey?: string, baseUrl?: string, model?: string }} input.providerConfig
 * @param {{ size: string, region?: string, aspectRatio?: string, thinkingMode?: boolean }} input.parameters
 * @param {string} input.createdAt  ISO（调用方注入，确定性）
 * @param {string} [input.contextSnapshotPath]
 * @param {string} [input.anchorBriefPath]
 * @param {string} [input.visualRunId]
 * @param {string} [input.documentRunId]
 * @param {Record<string,string>} [input.upstreamFileHashes]
 */
export function compileImageGenerationTask(input) {
  const {
    projectId,
    runId,
    taskId,
    referenceAnchorRunId,
    anchorApproved,
    resolvedContext,
    capsule,
    anchorBriefMarkdown,
    references = [],
    capabilities,
    providerConfig,
    parameters,
    createdAt,
    contextSnapshotPath = 'source-context-snapshot.json',
    anchorBriefPath = 'Anchor-Generation-Brief.md',
    visualRunId,
    documentRunId,
    upstreamFileHashes = {},
  } = input ?? {};

  const modelId = capabilities?.modelId ?? providerConfig?.model ?? 'wan2.7-image-pro';
  const region = parameters?.region ?? 'beijing';

  // 1. Reference Selector（§8.4）
  const { selected, dropped, warnings: selectWarnings } = selectReferences(references, capabilities);

  // 2. Prompt Compiler（§8）
  const compiled = compilePrompt({
    resolvedContext,
    capsule,
    anchorBriefMarkdown,
    references: selected,
    capabilities,
    parameters,
    modelId,
  });

  // 3. 上下文快照（§7.3）
  const snapshot = buildSourceContextSnapshot({
    resolvedContext,
    capsule,
    referenceAnchorRunId,
    visualRunId,
    documentRunId,
    upstreamFileHashes,
    capturedAt: createdAt,
  });

  // 4. 组装 ImageGenerationTask（§6.3）
  const task = {
    schemaVersion: '1.0',
    taskId,
    projectId,
    runId,
    outputType: 'master_anchor_image',
    sourceVisualRunId: visualRunId,
    sourceDocumentRunId: documentRunId,
    sourceReferenceAnchorRunId: referenceAnchorRunId,
    contextSnapshotPath,
    anchorBriefPath,
    references: selected,
    compiledPrompt: compiled.compiledPromptMarkdown,
    promptVersion: compiled.promptVersion,
    providerId: 'dashscope',
    modelId,
    region,
    parameters: {
      size: parameters?.size ?? '',
      outputCount: 1,
      watermark: false,
      thinkingMode: parameters?.thinkingMode,
    },
    createdAt,
  };

  // 5. 提交前 Gate A + B（§9.1 / §9.2），并汇入 Selector 的降级 Warning
  const gate = evaluatePreSubmitGates({
    resolvedContext,
    anchorApproved,
    capsule,
    compiledPromptMarkdown: compiled.compiledPromptMarkdown,
    anchorBriefMarkdown,
    task,
    references: selected,
    capabilities,
    providerConfig,
    parameters,
    warnings: selectWarnings,
  });

  return {
    task,
    snapshot,
    compiledPromptMarkdown: compiled.compiledPromptMarkdown,
    providerPayloadPreview: compiled.providerPayloadPreview,
    promptSourceMap: compiled.promptSourceMap,
    gate,
    selectedReferences: selected,
    droppedReferences: dropped,
  };
}
