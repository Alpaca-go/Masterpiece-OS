// @masterpiece/image-generation-runtime/task-builder
// 编译入口：把上游上下文 + Provider 能力 + 参考图 编译为 ImageGenerationTask，
// 执行 Reference Selector → Prompt Compiler → 提交前三层 Gate（A+B）。
// 本函数即「dry-run」核心：产出全部制品与 Gate 结果，但不调用 Provider、不写磁盘。

import { selectReferences } from './reference-selector.js';
import { compilePrompt } from './prompt-compiler.js';
import { composePrompt } from './prompt/index.js';
import { evaluatePreSubmitGates } from './gates.js';
import { buildSourceContextSnapshot } from './context-snapshot.js';
import { resolveGenerationPolicy } from './policies.js';
import {
  buildDeliverableReferencePlan,
  materializeDeliverableReferences,
  compileDeliverablePrompt,
  createCompileFingerprint,
} from './deliverables/index.js';
import { evaluateDeliverableGate } from './gates/deliverable-gate.js';

const V3_TO_V2_PRESET = {
  visual_analysis: 'visual_extension',
  document_context: 'document_concept',
  reference_anchor: 'reference_preview',
  integrated_context: 'integrated_anchor',
};

const V2_TO_V3_PRESET = {
  visual_extension: 'visual_analysis',
  document_concept: 'document_context',
  reference_preview: 'reference_anchor',
  integrated_anchor: 'integrated_context',
};

const V2_DEFAULT_DELIVERABLE = {
  visual_extension: 'anchor_image',
  document_concept: 'free_concept',
  reference_preview: 'anchor_image',
  integrated_anchor: 'anchor_image',
};

function compactContextLines(value, prefix = '') {
  if (value == null) return [];
  if (typeof value !== 'object') return [`${prefix}${String(value)}`];
  if (Array.isArray(value)) return value.flatMap((item) => compactContextLines(item, prefix)).slice(0, 24);
  return Object.entries(value)
    .flatMap(([key, item]) => compactContextLines(item, `${prefix}${key}: `))
    .slice(0, 24);
}

function toV2Sources(sources) {
  return {
    ...sources,
    preset: V3_TO_V2_PRESET[sources.sourcePreset],
    userIntent: {
      ...sources.userIntent,
      outputDescription: sources.userIntent?.prompt,
    },
  };
}

function warningFor(code) {
  const messages = {
    REFERENCE_PLAN_AUTO_REDUCED: '参考图超过当前交付类型或 Provider 限制，已自动降级为仅分析。',
    NO_SPATIAL_REFERENCE: '空间类交付物缺少空间参考图，将主要依赖文字上下文。',
    VI_COLLECTIONS_MOVED_TO_ANALYSIS_ONLY: 'VI 物料合集已移出直接生成参考，仅用于分析。',
  };
  return { code, message: messages[code] ?? code };
}

function compileImageGenerationTaskV3(input) {
  const {
    sources,
    context,
    runId,
    taskId,
    capabilities,
    providerConfig,
    parameters = {},
    createdAt,
    contextSnapshotPath = 'source-context-snapshot.json',
  } = input;
  const referencePlan = buildDeliverableReferencePlan({
    deliverable: sources.deliverable,
    references: context?.references ?? [],
    capabilities,
  });
  const selected = materializeDeliverableReferences(referencePlan, context?.references ?? []);
  const legacySources = toV2Sources(sources);
  const selectedContext = { ...context, references: selected };
  const identity = compactContextLines(context?.resolvedContext?.identity ?? context?.visualContext?.identity);
  const lockedAssets = compactContextLines(context?.resolvedContext?.lockedAssets ?? context?.visualContext?.lockedAssets);
  const upstreamContext = [
    ...compactContextLines(context?.visualContext, 'visual.'),
    ...compactContextLines(context?.documentContext, 'document.'),
    ...compactContextLines(context?.referenceCapsule, 'reference.'),
  ].slice(0, 40);
  const compiled = compileDeliverablePrompt({
    sourcePreset: sources.sourcePreset,
    deliverable: sources.deliverable,
    userIntent: sources.userIntent,
    lockedAssets,
    identity,
    upstreamContext,
    references: selected,
    textSafety: ['不得臆造不可辨识的小字；品牌文字与标志只按已锁定资产呈现。'],
    outputSpec: [
      `画布尺寸：${parameters.size ?? ''}`,
      `宽高比：${sources.userIntent?.aspectRatio ?? '按画布尺寸'}`,
      '只输出一张图像。',
    ],
  });
  const compileFingerprint = createCompileFingerprint({
    sourceBundle: sources,
    userIntent: sources.userIntent,
    deliverable: sources.deliverable,
    referencePlan,
    compiledPrompt: compiled.compiledPromptMarkdown,
    compiledAt: createdAt,
  });
  const outputType = sources.deliverable === 'anchor_image' ? 'master_anchor_image' : 'concept_image';
  const projectId = sources.projectId ?? sources.visual?.projectId;
  const virtualProjectId = projectId ? undefined : `document-${sources.document?.documentRunId}`;
  const task = {
    schemaVersion: '3.0',
    taskId,
    runId,
    ...(projectId ? { projectId } : { virtualProjectId }),
    sourcePreset: sources.sourcePreset,
    deliverable: sources.deliverable,
    purpose: sources.purpose,
    sources: {
      visualRunId: context?.sourceMetadata?.visualRunId,
      documentRunId: context?.sourceMetadata?.documentRunId,
      referenceAnchorRunId: context?.sourceMetadata?.referenceAnchorRunId,
    },
    userIntent: {
      original: compiled.userIntentResolution.originalPrompt,
      normalized: compiled.userIntentResolution.normalizedPrompt,
    },
    references: selected,
    compiledPrompt: compiled.compiledPromptMarkdown,
    promptVersion: compiled.promptVersion,
    compileFingerprint,
    outputType,
    contextSnapshotPath,
    providerId: 'dashscope',
    modelId: capabilities?.modelId ?? providerConfig?.model ?? 'wan2.7-image-pro',
    region: parameters.region ?? 'beijing',
    parameters: {
      size: parameters.size ?? '',
      outputCount: 1,
      watermark: false,
      thinkingMode: parameters.thinkingMode,
    },
    createdAt,
  };
  const snapshot = {
    schemaVersion: '3.0',
    sourcePreset: sources.sourcePreset,
    deliverable: sources.deliverable,
    purpose: sources.purpose,
    sourcesUsed: {
      visual: Boolean(context?.visualContext),
      document: Boolean(context?.documentContext),
      reference: Boolean(context?.referenceCapsule),
      resolved: Boolean(context?.resolvedContext),
    },
    sourceIds: { projectId, ...context?.sourceMetadata },
    identity: context?.resolvedContext?.identity,
    lockedAssets: context?.resolvedContext?.lockedAssets,
    visualSummary: context?.visualContext,
    documentSummary: context?.documentContext,
    referenceSummary: context?.referenceCapsule,
    userIntent: sources.userIntent,
    warnings: context?.warnings ?? [],
    capturedAt: createdAt,
  };
  const legacyPolicy = resolveGenerationPolicy(legacySources.preset);
  const legacyGate = evaluatePreSubmitGates({
    policy: legacyPolicy,
    sources: legacySources,
    context: selectedContext,
    task,
    compiledPromptMarkdown: compiled.compiledPromptMarkdown,
    capabilities,
    providerConfig,
    parameters,
    warnings: [
      ...(context?.warnings ?? []),
      ...referencePlan.warnings.map(warningFor),
    ],
  });
  const deliverableErrors = evaluateDeliverableGate({
    deliverable: sources.deliverable,
    userIntentResolution: compiled.userIntentResolution,
    compiledPrompt: compiled.compiledPromptMarkdown,
    referencePlan,
  });
  const gate = {
    ...legacyGate,
    blocked: legacyGate.blocked || deliverableErrors.length > 0,
    errors: [...legacyGate.errors, ...deliverableErrors],
  };
  snapshot.warnings = gate.warnings;
  return {
    task,
    snapshot,
    compiledPromptMarkdown: compiled.compiledPromptMarkdown,
    providerPayloadPreview: {
      model: task.modelId,
      prompt: compiled.compiledPromptMarkdown,
      references: selected.map((reference) => ({
        assetId: reference.assetId,
        role: reference.generationRole,
        localPath: reference.localPath,
      })),
      parameters: task.parameters,
    },
    promptSourceMap: compiled.promptSourceMap,
    gate,
    selectedReferences: selected,
    droppedReferences: referencePlan.analysisOnly,
    deliverablePolicy: compiled.deliverablePolicy,
    userIntentResolution: compiled.userIntentResolution,
    referencePlan,
    compileFingerprint,
  };
}

function compileImageGenerationTaskV2(input) {
  const {
    sources,
    context,
    runId,
    taskId,
    capabilities,
    providerConfig,
    parameters = {},
    createdAt,
    contextSnapshotPath = 'source-context-snapshot.json',
  } = input;
  const policy = resolveGenerationPolicy(sources?.preset);
  const { selected, dropped, warnings: selectWarnings } = selectReferences(context?.references ?? [], capabilities);
  const selectedContext = { ...context, references: selected };
  const compiled = composePrompt({
    sources,
    context: selectedContext,
    capabilities,
    parameters,
    modelId: capabilities?.modelId ?? providerConfig?.model,
  });
  const outputType = sources.preset === 'integrated_anchor' ? 'master_anchor_image' : 'concept_image';
  const projectId = sources.projectId ?? sources.visual?.projectId;
  const virtualProjectId = projectId ? undefined : `document-${sources.document?.documentRunId}`;
  const task = {
    schemaVersion: '2.0',
    taskId,
    runId,
    ...(projectId ? { projectId } : { virtualProjectId }),
    preset: sources.preset,
    purpose: sources.purpose,
    sources: {
      visualRunId: context?.sourceMetadata?.visualRunId,
      documentRunId: context?.sourceMetadata?.documentRunId,
      referenceAnchorRunId: context?.sourceMetadata?.referenceAnchorRunId,
    },
    outputType,
    contextSnapshotPath,
    references: selected,
    compiledPrompt: compiled.compiledPromptMarkdown,
    promptVersion: compiled.promptVersion,
    providerId: 'dashscope',
    modelId: capabilities?.modelId ?? providerConfig?.model ?? 'wan2.7-image-pro',
    region: parameters.region ?? 'beijing',
    parameters: {
      size: parameters.size ?? '',
      outputCount: 1,
      watermark: false,
      thinkingMode: parameters.thinkingMode,
    },
    createdAt,
  };
  const snapshot = {
    schemaVersion: '2.0',
    preset: sources.preset,
    purpose: sources.purpose,
    sourcesUsed: {
      visual: Boolean(context?.visualContext),
      document: Boolean(context?.documentContext),
      reference: Boolean(context?.referenceCapsule),
      resolved: Boolean(context?.resolvedContext),
    },
    sourceIds: { projectId, ...context?.sourceMetadata },
    identity: context?.resolvedContext?.identity,
    lockedAssets: context?.resolvedContext?.lockedAssets,
    visualSummary: context?.visualContext,
    documentSummary: context?.documentContext,
    referenceSummary: context?.referenceCapsule,
    userIntent: sources.userIntent ?? {},
    warnings: context?.warnings ?? [],
    capturedAt: createdAt,
  };
  const gate = evaluatePreSubmitGates({
    policy,
    sources,
    context: selectedContext,
    task,
    compiledPromptMarkdown: compiled.compiledPromptMarkdown,
    capabilities,
    providerConfig,
    parameters,
    warnings: [...(context?.warnings ?? []), ...selectWarnings],
  });
  snapshot.warnings = gate.warnings;
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
  if (input?.sources?.schemaVersion === '3.0') return compileImageGenerationTaskV3(input);
  if (input?.sources) return compileImageGenerationTaskV2(input);
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

export function migrateImageGenerationTaskV1(task) {
  if (!task || task.schemaVersion !== '1.0') return task;
  return {
    ...task,
    schemaVersion: '2.0',
    preset: 'integrated_anchor',
    purpose: 'production',
    sources: {
      visualRunId: task.sourceVisualRunId,
      documentRunId: task.sourceDocumentRunId,
      referenceAnchorRunId: task.sourceReferenceAnchorRunId,
    },
    outputType: 'master_anchor_image',
  };
}

export function migrateImageGenerationSourcesV2(sources) {
  if (!sources || sources.schemaVersion === '3.0') return sources;
  return {
    schemaVersion: '3.0',
    sourcePreset: V2_TO_V3_PRESET[sources.preset] ?? 'integrated_context',
    deliverable: V2_DEFAULT_DELIVERABLE[sources.preset] ?? 'free_concept',
    purpose: sources.purpose ?? 'production',
    projectId: sources.projectId,
    visual: sources.visual,
    document: sources.document,
    reference: sources.reference,
    userIntent: {
      prompt: sources.userIntent?.prompt ?? sources.userIntent?.outputDescription ?? '',
      subject: sources.userIntent?.subject,
      aspectRatio: sources.userIntent?.aspectRatio,
    },
  };
}
