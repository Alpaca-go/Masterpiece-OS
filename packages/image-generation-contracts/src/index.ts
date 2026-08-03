// @masterpiece/image-generation-contracts
// 生图功能共享契约类型（单一事实来源）。
//
// 职责（文档 §5.1）：任务类型 / 运行状态 / Provider 能力 / 参考图片角色 /
// 运行结果 / 错误与 Warning / 人工评价 / JSON Schema 对应的 TS 类型。
// 不得负责：文件写入、API 请求、Prompt 编译、Electron IPC。
//
// 本包仅导出类型与常量枚举值数组，禁止引入 Electron / Node 副作用依赖。

// ---------------------------------------------------------------------------
// §3 输出类型与规格
// ---------------------------------------------------------------------------

/** §3.1 P0 唯一正式输出类型。 */
export type ImageGenerationOutputType = 'concept_image' | 'master_anchor_image';

export type ImageGenerationPreset =
  | 'visual_extension'
  | 'document_concept'
  | 'reference_preview'
  | 'integrated_anchor';

export type GenerationSourcePreset = 'visual_analysis' | 'document_context' | 'reference_anchor' | 'integrated_context';
export type GenerationDeliverable = 'anchor_image' | 'brand_poster' | 'packaging_render' | 'vi_application' | 'interior_scene' | 'storefront_scene' | 'free_concept';
export const GENERATION_DELIVERABLE_LABELS: Record<GenerationDeliverable, string> = {
  anchor_image: 'Anchor Image', brand_poster: '品牌海报', packaging_render: '包装渲染图', vi_application: 'VI 应用图', interior_scene: '店内空间效果图', storefront_scene: '店面 / 门头效果图', free_concept: '自由概念图'
};
export interface ImageGenerationCompileFingerprint { sourceBundleHash: string; userIntentHash: string; deliverableHash: string; referencePlanHash: string; compiledPromptHash: string; compiledAt: string; }
export interface UserIntentResolution {
  originalPrompt: string;
  normalizedPrompt: string;
  detectedDeliverable?: GenerationDeliverable;
  conflicts: Array<{
    code: 'DELIVERABLE_USER_INTENT_CONFLICT';
    selectedDeliverable: GenerationDeliverable;
    detectedDeliverable: GenerationDeliverable;
    message: string;
  }>;
}
export interface ImageGenerationSourceBundleV3 {
  schemaVersion: '3.0';
  sourcePreset: GenerationSourcePreset;
  deliverable: GenerationDeliverable;
  purpose: ImageGenerationPurpose;
  projectId?: string;
  visual?: { projectId: string; visualRunId?: string; selectedAssetIds?: string[] };
  document?: { documentRunId: string };
  reference?: { referenceAnchorRunId: string };
  userIntent: { prompt: string; subject?: string; locationType?: string; aspectRatio?: string };
}

export interface PromptSourceMapV3 {
  schemaVersion: '3.0';
  sourcePreset: GenerationSourcePreset;
  deliverable: GenerationDeliverable;
  priorityOrder: [
    'deliverable',
    'userIntent',
    'lockedAssets',
    'identity',
    'upstreamContext',
    'references',
    'defaults'
  ];
  sections: Array<{ id: string; source: string[]; priority: number }>;
}

export type ImageGenerationPurpose = 'exploration' | 'production';

/** Creative authority used when generating a visual direction from analysis. */
export type VisualGenerationMode = 'extend' | 'upgrade' | 'rebuild';

export type GenerationImageRole =
  | 'identity_reference'
  | 'structure_reference'
  | 'style_reference'
  | 'spatial_reference'
  | 'analysis_only'
  | 'excluded';

export interface GenerationTransformationBrief {
  schemaVersion: '1.0';
  projectId: string;
  mode: VisualGenerationMode;
  outputTask: { type: 'anchor_image'; responsibility: string; aspectRatio: string };
  preserve: { identity: string[]; visualAssets: string[]; structures: string[] };
  mustChange: {
    composition: string[]; graphicLanguage: string[]; hierarchy: string[];
    material: string[]; photography: string[]; applicationStrategy: string[];
  };
  prohibitedCarryover: string[];
  newDirection: {
    visualAnchor: string; sceneMechanism: string; compositionStrategy: string[];
    colorRelationship: string[]; materialAndLighting: string[];
    typographyRelationship: string[]; informationHierarchy: string[];
  };
  imageReferencePlan: Record<GenerationImageRole, string[]>;
  creativeDifferenceTarget: { level: 'low' | 'medium' | 'high'; explanation: string };
  warnings: string[];
  generatedAt: string;
}

export type CreativeDirectorRunStatus =
  | 'created' | 'compiling' | 'repairing' | 'validating' | 'awaiting_confirmation'
  | 'approved' | 'rejected' | 'failed' | 'cancelled';

export interface CreativeDirectorRun {
  schemaVersion: '1.0'; runId: string; projectId: string; visualGenerationMode: VisualGenerationMode;
  status: CreativeDirectorRunStatus; modelId: string; apiProfileId: string;
  sourceVisualRunId?: string; sourceReportPath: string;
  transformationBriefPath?: string; transformationBriefMarkdownPath?: string;
  createdAt: string; updatedAt: string; completedAt?: string;
  errorCode?: string; errorMessage?: string;
}

export interface ImageGenerationSourceBundle {
  preset: ImageGenerationPreset;
  purpose: ImageGenerationPurpose;
  projectId?: string;
  visual?: {
    projectId: string;
    visualRunId?: string;
    selectedAssetIds?: string[];
  };
  document?: { documentRunId: string };
  reference?: { referenceAnchorRunId: string };
  userIntent: {
    prompt?: string;
    outputDescription?: string;
    subject?: string;
    aspectRatio?: string;
  };
}

export interface GenerationSourceContext {
  preset: ImageGenerationPreset;
  purpose: ImageGenerationPurpose;
  projectId?: string;
  visualContext?: unknown;
  documentContext?: unknown;
  resolvedContext?: unknown;
  referenceCapsule?: unknown;
  anchorBriefMarkdown?: string;
  referenceDecision?: { status: string; decision?: string };
  references: ImageGenerationReference[];
  warnings: ImageGenerationWarning[];
  sourceMetadata: {
    visualRunId?: string;
    documentRunId?: string;
    referenceAnchorRunId?: string;
  };
}

export interface ImageGenerationPolicy {
  preset: ImageGenerationPreset;
  requireVisualContext: boolean;
  requireDocumentContext: boolean;
  requireResolvedContext: boolean;
  requireReferenceContext: boolean;
  requireReferenceApproval: boolean;
  requireCurrentIdentity: boolean;
  requireCurrentIdentityImage: boolean;
  requireReferenceImage: boolean;
  allowTextOnlyGeneration: boolean;
  allowUnapprovedReferencePreview: boolean;
}

export interface ImageGenerationPresetCapability {
  preset: ImageGenerationPreset;
  displayName: string;
  description: string;
  purpose: ImageGenerationPurpose;
  requiredSources: string[];
  optionalSources: string[];
  warnings: string[];
}

/** §10.5 显式配置区域。 */
export type ImageProviderRegion = 'beijing' | 'singapore';

/** §3.1 P0 Provider 标识。 */
export type ImageProviderId = 'dashscope' | 'openai' | 'google' | 'volcengine';

// ---------------------------------------------------------------------------
// §6.1 Provider Capability
// ---------------------------------------------------------------------------

export interface ImageProviderCapabilities {
  providerId: string;
  modelId: string;

  supportsTextToImage: boolean;
  supportsMultiImageReference: boolean;
  supportsNegativePrompt: boolean;
  supportsRemoteCancel: boolean;

  maxReferenceImages: number;
  maxOutputCount: number;
  supportedSizes: string[];
  outputMimeTypes: string[];
}

export interface ImageGenerationAdapterInput {
  prompt: string;
  promptVersion: string;
  references: ImageGenerationReference[];
  model: string;
  ratio: '1:1' | '16:9' | '9:16' | string;
  count: 1;
}

export interface ImageGenerationAdapterResult {
  images: ProviderResultImage[];
  model: string;
  promptVersion: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// §6.2 参考图片
// ---------------------------------------------------------------------------

/**
 * §8.4 参考图顺序对应的角色。
 * Provider Payload 排序：
 * current_project_logo → current_project_product → current_project_identity → reference_style
 */
export type ImageReferenceRole =
  | 'current_project_logo'
  | 'current_project_product'
  | 'current_project_identity'
  | 'reference_style';

export type ImageReferenceSource =
  | 'project_visual_context'
  | 'reference_anchor_run'
  | 'user_selected';

export interface ImageGenerationReference {
  assetId: string;
  role: ImageReferenceRole;
  localPath: string;
  sha256: string;

  source: ImageReferenceSource;

  includeReason: string;
  generationRole?: GenerationImageRole;
  exclusionNotes?: string[];
}

// ---------------------------------------------------------------------------
// §6.3 生图任务
// ---------------------------------------------------------------------------

export interface ImageGenerationTaskParameters {
  size: string;
  outputCount: 1;
  watermark: false;
  thinkingMode?: boolean;
}

export interface ImageGenerationTask {
  schemaVersion: '1.0' | '2.0' | '3.0';

  taskId: string;
  projectId?: string;
  virtualProjectId?: string;
  runId: string;

  outputType: ImageGenerationOutputType;
  preset?: ImageGenerationPreset;
  purpose?: ImageGenerationPurpose;
  sourcePreset?: GenerationSourcePreset;
  deliverable?: GenerationDeliverable;
  compileFingerprint?: ImageGenerationCompileFingerprint;
  sources?: {
    visualRunId?: string;
    documentRunId?: string;
    referenceAnchorRunId?: string;
  };

  sourceVisualRunId?: string;
  sourceDocumentRunId?: string;
  sourceReferenceAnchorRunId?: string;

  contextSnapshotPath: string;
  anchorBriefPath?: string;

  references: ImageGenerationReference[];

  visualGenerationMode?: VisualGenerationMode;
  creativeDirectorRunId?: string;
  transformationBriefPath?: string;
  referencePlan?: Array<{ assetId: string; role: GenerationImageRole }>;
  creativeDifferenceTarget?: { level: 'low' | 'medium' | 'high'; explanation: string };

  compiledPrompt: string;
  promptVersion: number | string;
  /** Creative Session v2 traceability fields. */
  assetType?: string;
  visualCanon?: { id: string; version: string };
  promptSnapshot?: {
    id: string;
    templateId?: string;
    templateVersion?: string;
    fingerprint?: string;
  };

  providerId: ImageProviderId;
  modelId: string;
  region: ImageProviderRegion;

  parameters: ImageGenerationTaskParameters;

  createdAt: string;
}

export interface ImageGenerationTaskV3 {
  schemaVersion: '3.0';
  taskId: string;
  runId: string;
  sourcePreset: GenerationSourcePreset;
  deliverable: GenerationDeliverable;
  purpose: ImageGenerationPurpose;
  projectId?: string;
  virtualProjectId?: string;
  sources: {
    visualRunId?: string;
    documentRunId?: string;
    referenceAnchorRunId?: string;
  };
  userIntent: { original: string; normalized: string };
  references: ImageGenerationReference[];
  compiledPrompt: string;
  promptVersion: 3;
  compileFingerprint: ImageGenerationCompileFingerprint;
  outputType?: ImageGenerationOutputType;
  contextSnapshotPath?: string;
  providerId: ImageProviderId;
  modelId: string;
  region: ImageProviderRegion;
  parameters: ImageGenerationTaskParameters;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// §7.3 上下文快照（source-context-snapshot.json）
// ---------------------------------------------------------------------------

export interface SourceContextSnapshot {
  schemaVersion: '1.0';
  capturedAt: string;

  brandName: string;
  industry: string;
  productsOrServices: string[];

  lockedAssets: string[];
  allowedChanges: string[];
  prohibitedChanges: string[];

  approvedReferenceDirection: string;
  inheritedPreferences: string[];
  userAvoidance: string[];

  upstreamRunIds: {
    visualRunId?: string;
    documentRunId?: string;
    referenceAnchorRunId: string;
  };

  upstreamFileHashes: Record<string, string>;
}

export interface ImageGenerationContextSnapshotV2 {
  schemaVersion: '2.0';
  preset: ImageGenerationPreset;
  purpose: ImageGenerationPurpose;
  sourcesUsed: {
    visual: boolean;
    document: boolean;
    reference: boolean;
    resolved: boolean;
  };
  sourceIds: {
    projectId?: string;
    visualRunId?: string;
    documentRunId?: string;
    referenceAnchorRunId?: string;
  };
  identity?: unknown;
  lockedAssets?: unknown;
  visualSummary?: unknown;
  documentSummary?: unknown;
  referenceSummary?: unknown;
  userIntent: ImageGenerationSourceBundle['userIntent'];
  warnings: ImageGenerationWarning[];
  capturedAt: string;
}

// ---------------------------------------------------------------------------
// §6.4 运行状态
// ---------------------------------------------------------------------------

export type ImageGenerationRunStatus =
  | 'created'
  | 'validating'
  | 'blocked'
  | 'ready'
  | 'submitting'
  | 'queued'
  | 'running'
  | 'downloading'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

/** 运行时中「执行中」状态集合，用于应用重启僵尸任务恢复（§12.3）。 */
export const EXECUTING_IMAGE_RUN_STATUSES: readonly ImageGenerationRunStatus[] = [
  'submitting',
  'queued',
  'running',
  'downloading',
] as const;

// ---------------------------------------------------------------------------
// §9 三层 Gate 错误码与 Warning
// ---------------------------------------------------------------------------

/** §9.1 Gate A：Identity Safety 硬阻断码。 */
export type GateAErrorCode =
  | 'CURRENT_PROJECT_CONTEXT_MISSING'
  | 'CURRENT_PROJECT_IDENTITY_MISSING'
  | 'REFERENCE_ANCHOR_NOT_APPROVED'
  | 'LOCKED_ASSET_CONFLICT_UNRESOLVED'
  | 'REFERENCE_BRAND_IDENTITY_LEAK'
  | 'REFERENCE_LOGO_DIRECT_COPY'
  | 'REFERENCE_SLOGAN_LEAK'
  | 'REFERENCE_SIGNATURE_GRAPHIC_DIRECT_COPY'
  | 'GENERATION_PRESET_MISSING'
  | 'GENERATION_PRESET_UNSUPPORTED'
  | 'VISUAL_CONTEXT_REQUIRED'
  | 'DOCUMENT_CONTEXT_REQUIRED'
  | 'RESOLVED_CONTEXT_REQUIRED'
  | 'REFERENCE_CONTEXT_REQUIRED'
  | 'CURRENT_IDENTITY_IMAGE_REQUIRED'
  | 'REFERENCE_RUN_REJECTED'
  | 'REFERENCE_RUN_NOT_READY'
  | 'SOURCE_BUNDLE_INVALID';

/** §9.2 Gate B：Task Executability 硬阻断码。 */
export type GateBErrorCode =
  | 'ANCHOR_GENERATION_BRIEF_MISSING'
  | 'IMAGE_GENERATION_TASK_INVALID'
  | 'TASK_PROMPT_EMPTY'
  | 'OUTPUT_TYPE_UNSUPPORTED'
  | 'ASPECT_OR_SIZE_UNSUPPORTED'
  | 'REFERENCE_IMAGE_MISSING'
  | 'REFERENCE_IMAGE_LIMIT_EXCEEDED'
  | 'PROVIDER_CONFIG_MISSING'
  | 'PROVIDER_MODEL_UNAVAILABLE'
  | 'REFERENCE_IMAGE_REQUIRED'
  | 'GENERATION_INTENT_MISSING'
  | 'PROMPT_FRAGMENT_EMPTY'
  | 'PROMPT_COMPOSITION_FAILED'
  | 'DELIVERABLE_MISSING'
  | 'DELIVERABLE_UNSUPPORTED'
  | 'DELIVERABLE_USER_INTENT_CONFLICT'
  | 'DELIVERABLE_PROMPT_INCOMPLETE'
  | 'DELIVERABLE_REFERENCE_MISMATCH'
  | 'INTERIOR_SCENE_SPATIAL_REQUIREMENTS_MISSING'
  | 'INTERIOR_SCENE_FLATLAY_CONFLICT'
  | 'STOREFRONT_SCENE_REQUIREMENTS_MISSING'
  | 'PACKAGING_STRUCTURE_REFERENCE_MISSING'
  | 'COMPILE_INPUT_STALE';

/** §9.3 Gate C：Artifact Completeness 硬阻断/失败码。 */
export type GateCErrorCode =
  | 'PROVIDER_TASK_ID_MISSING'
  | 'PROVIDER_RESULT_MISSING'
  | 'IMAGE_RESULT_URL_MISSING'
  | 'IMAGE_DOWNLOAD_FAILED'
  | 'IMAGE_MIME_INVALID'
  | 'IMAGE_FILE_EMPTY'
  | 'IMAGE_HASH_FAILED'
  | 'OUTPUT_WRITE_FAILED';

export type ImageGenerationBlockingCode = GateAErrorCode | GateBErrorCode | GateCErrorCode;

export type ImageGenerationGate = 'identity_safety' | 'task_executability' | 'artifact_completeness';

/** §9.4 非阻断 Warning 码。 */
export type ImageGenerationWarningCode =
  | 'LOGO_RENDERING_MAY_BE_INACCURATE'
  | 'GENERATED_TEXT_MAY_BE_UNSAFE'
  | 'GRAPHIC_ANCHOR_MAY_BE_GENERIC'
  | 'COLOR_BALANCE_MAY_BE_SUBOPTIMAL'
  | 'VISUAL_DIRECTION_MAY_BE_WEAK'
  | 'PACKAGING_STRUCTURE_UNCONFIRMED'
  | 'REFERENCE_IMAGES_REDUCED'
  | 'INFORMATION_DENSITY_MAY_BE_HIGH'
  | 'CONCEPT_ONLY'
  | 'BRAND_IDENTITY_NOT_FULLY_BOUND'
  | 'CURRENT_IDENTITY_NOT_BOUND'
  | 'LOGO_RENDERING_NOT_GUARANTEED'
  | 'PACKAGING_STRUCTURE_NOT_GUARANTEED'
  | 'DOCUMENT_CONTEXT_NOT_USED'
  | 'REFERENCE_STYLE_NOT_USED'
  | 'VISUAL_CONTEXT_NOT_USED'
  | 'UNAPPROVED_REFERENCE_PREVIEW'
  | 'LIMITED_VISUAL_EVIDENCE'
  | 'LIMITED_DOCUMENT_EVIDENCE'
  | 'USER_INTENT_EMPTY'
  | 'NO_NEW_STYLE_REFERENCE'
  | 'ORIGINAL_STYLE_REFERENCE_REDUCED'
  | 'CREATIVE_DIFFERENCE_MAY_BE_LOW'
  | 'ANCHOR_FIRST_ONLY'
  | 'REFERENCE_PLAN_AUTO_REDUCED'
  | 'NO_SPATIAL_REFERENCE'
  | 'VI_COLLECTIONS_MOVED_TO_ANALYSIS_ONLY';

export interface ImageGenerationBlockingError {
  code: ImageGenerationBlockingCode;
  gate: ImageGenerationGate;
  message: string;
  detail?: Record<string, unknown>;
}

export interface ImageGenerationWarning {
  code: ImageGenerationWarningCode;
  message: string;
  detail?: Record<string, unknown>;
}

/** 三层 Gate 汇总结果：blocked 为 true 时禁止提交 Provider。 */
export interface ImageGenerationGateResult {
  blocked: boolean;
  errors: ImageGenerationBlockingError[];
  warnings: ImageGenerationWarning[];
}

// ---------------------------------------------------------------------------
// §10 Provider 接口
// ---------------------------------------------------------------------------

/**
 * Provider 异步任务状态（§10.1 / §10.3 / §10.4）。
 * 文档未给出完整定义，此处按异步轮询模型归一化：
 * pending → running → succeeded / failed / cancelled。
 */
export type ProviderTaskState = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface ProviderResultImage {
  /** 临时可下载 URL；不得作为历史记录的长期来源（§11.1）。 */
  url?: string;
  /** 若 Provider 直接返回 base64。 */
  b64?: string;
  mimeType?: string;
  width?: number;
  height?: number;
}

export interface ProviderTaskStatus {
  providerTaskId: string;
  requestId?: string;
  state: ProviderTaskState;

  /** state === 'succeeded' 时应存在的结果图片列表。 */
  images?: ProviderResultImage[];

  /** Provider 原始 usage（图像模型不一定按 Token 返回，§14.2）。 */
  usage?: Record<string, unknown>;

  /** state === 'failed' 时的归一化错误。 */
  error?: {
    code: string;
    message: string;
    /** 鉴权/参数错误不可自动重试（§10.4）。 */
    retryable: boolean;
  };
}

export interface ImageGenerationSubmitResult {
  providerTaskId: string;
  requestId?: string;
  executionMode?: 'synchronous' | 'asynchronous';
  /** 同步调用会直接返回终态，调用方无需再查询任务接口。 */
  initialStatus?: ProviderTaskStatus;
}

export interface ImageGenerationProvider {
  getCapabilities(): Promise<ImageProviderCapabilities>;

  submit(task: ImageGenerationTask, signal?: AbortSignal): Promise<ImageGenerationSubmitResult>;

  getStatus(providerTaskId: string): Promise<ProviderTaskStatus>;

  cancel?(providerTaskId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// §11 运行结果（本地持久化后的图片）
// ---------------------------------------------------------------------------

export interface GeneratedImage {
  imageId: string;
  /** 相对 run 目录的图片路径，例如 images/image-01.png。 */
  relativePath: string;
  /** 缩略图相对路径，例如 thumbnails/image-01.webp。 */
  thumbnailRelativePath?: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  sha256: string;
  downloadedAt: string;
}

// ---------------------------------------------------------------------------
// §6.5 人工评价
// ---------------------------------------------------------------------------

export type ImageReviewDecision =
  | 'selected'
  | 'usable_after_edit'
  | 'reference_only'
  | 'rejected';

export interface ImageGenerationEvaluation {
  schemaVersion: '1.0';
  brandAlignment: { score: 1 | 2 | 3 | 4 | 5; notes: string };
  visualConsistency: { score: 1 | 2 | 3 | 4 | 5; notes: string };
  assetUsability: { score: 1 | 2 | 3 | 4 | 5; notes: string };
  deviationDetection: {
    severity: 'none' | 'minor' | 'major';
    findings: string[];
  };
  overallScore: number;
  promptAdjustments: string[];
  evaluatedAgainst: {
    visualCanonId: string;
    visualCanonVersion: string;
    generationRunId: string;
    imageId: string;
    promptSnapshotId: string;
  };
}

export interface ImageGenerationReview {
  runId: string;
  imageId: string;

  decision: ImageReviewDecision;
  score?: 1 | 2 | 3 | 4 | 5;

  directionCorrect?: boolean;
  brandIdentityCorrect?: boolean;
  referenceUsageCorrect?: boolean;
  compositionUseful?: boolean;

  notes?: string;
  evaluation?: ImageGenerationEvaluation;
  reviewedAt: string;
}

// ---------------------------------------------------------------------------
// §13 重试
// ---------------------------------------------------------------------------

export type ImageGenerationRetryMode = 'same_prompt' | 'edited_prompt';

export interface ImageGenerationRetryRecord {
  retryRunId: string;
  parentRunId: string;
  mode: ImageGenerationRetryMode;
  createdAt: string;
  /** edited_prompt 模式下记录 Prompt 差异摘要（§13.2）。 */
  promptDiffSummary?: string;
}

// ---------------------------------------------------------------------------
// §14 Metrics
// ---------------------------------------------------------------------------

export interface ImageGenerationMetrics {
  providerId: string;
  modelId: string;
  region: string;

  startedAt: string;
  completedAt?: string;
  durationMs?: number;

  providerRequestCount: number;
  providerPollCount: number;
  retryCount: number;

  outputImageCount: number;
  outputSize?: string;

  providerUsage?: Record<string, unknown>;
  billingUnit?: string;
  estimatedCost?: number;

  errorCode?: string;
}

// ---------------------------------------------------------------------------
// 运行记录（run.json）—— 聚合上述结构的顶层持久化对象
// ---------------------------------------------------------------------------

export interface ImageGenerationRun {
  schemaVersion: '1.0' | '2.0' | '3.0';

  runId: string;
  projectId: string;
  virtualProjectId?: string;
  preset?: ImageGenerationPreset;
  sourcePreset?: GenerationSourcePreset;
  deliverable?: GenerationDeliverable;
  purpose?: ImageGenerationPurpose;
  sources?: ImageGenerationSourceBundle | ImageGenerationSourceBundleV3;
  taskId: string;

  status: ImageGenerationRunStatus;

  outputType: ImageGenerationOutputType;
  providerId: ImageProviderId;
  modelId: string;
  region: ImageProviderRegion;
  /** 生成时实际使用的 API Profile，供重试与恢复继续使用同一配置。 */
  apiProfileId?: string;
  providerExecutionMode?: 'synchronous' | 'asynchronous';

  /** §13 重试链：根运行为 undefined。 */
  parentRunId?: string;
  retryMode?: ImageGenerationRetryMode;

  providerTaskId?: string;
  providerRequestId?: string;

  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;

  /** 三层 Gate 结果（blocked 时 status 为 blocked）。 */
  gate: ImageGenerationGateResult;

  images: GeneratedImage[];

  review?: ImageGenerationReview;

  /** 失败时的归一化错误码（对应 §9 Gate C 或 Provider 错误）。 */
  errorCode?: string;
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Run Summary（IPC 返回给 Renderer 的可展示摘要，§16 / §17）
// ---------------------------------------------------------------------------

export interface ImageGenerationRunSummary {
  runId: string;
  projectId: string;
  status: ImageGenerationRunStatus;
  createdAt: string;
  updatedAt: string;
  providerId: ImageProviderId;
  modelId: string;
  imageCount: number;
  hasBlockingErrors: boolean;
  warningCount: number;
  reviewDecision?: ImageReviewDecision;
  parentRunId?: string;
}

// ---------------------------------------------------------------------------
// 常量：便于运行时与测试引用（对应 §3.2 默认规格）
// ---------------------------------------------------------------------------

export const IMAGE_GENERATION_SCHEMA_VERSION = '1.0' as const;
export const DEFAULT_IMAGE_PROVIDER_ID: ImageProviderId = 'dashscope';
export const DEFAULT_IMAGE_MODEL_ID = 'wan2.7-image-pro';
export const DEFAULT_IMAGE_OUTPUT_TYPE: ImageGenerationOutputType = 'master_anchor_image';
export const DEFAULT_IMAGE_OUTPUT_COUNT = 1 as const;

// ---------------------------------------------------------------------------
// Short-Chain short-pipeline contracts
// ---------------------------------------------------------------------------

export type ShortChainDeliverableFamily = 'space' | 'packaging' | 'vi' | 'poster';
export type PackagingShotId = 'PKG-HERO-SINGLE' | 'PKG-SERIES-GROUP' | 'PKG-GIFT-OPEN';
export type PackagingLockedAssetRole =
  | 'package_surface_identity'
  | 'package_surface_graphic'
  | 'package_structure'
  | 'product_identity'
  | 'product_arrangement'
  | 'exclusion';

export interface PackagingLockedAssetBinding {
  assetId: string;
  type: string;
  role: PackagingLockedAssetRole;
  lockLevel: 'hard' | 'structural';
  evidenceRefs: string[];
  mayAffectScene: false;
}
export type ShortChainAspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16';
/** @deprecated Persisted v1 compatibility only. New tasks use brandMarkRenderMode. */
export type ShortChainLogoUsageMode = 'reference' | 'blank_area' | 'post_composite';
export type LockedAssetRenderMode =
  | 'locked_asset_render'
  | 'no_logo_preview'
  | 'creative_logo_interpretation';
export type LockedAssetMaterialMode =
  | 'auto'
  | 'front_lit_acrylic'
  | 'halo_lit_metal'
  | 'acrylic_dimensional'
  | 'pvc_dimensional'
  | 'metal_dimensional'
  | 'neon'
  | 'wall_engraving'
  | 'lightbox'
  | 'screen_print'
  | 'frosted_glass'
  | 'flat_print';
export type LockedAssetBrandIntensity = 'subtle' | 'balanced' | 'expressive';
export type LockedAssetLockLevel = 'hard' | 'structural' | 'style';
export type LockedAssetFallbackMode = 'none' | 'perspective_composite' | 'flat_overlay';
export type SpatialLockedAssetType =
  | 'logo'
  | 'brand_wordmark'
  | 'ip_character'
  | 'icon'
  | 'pattern'
  | 'packaging_front'
  | 'illustration'
  | 'other';

export interface SpatialLockedAssetRenderPolicy {
  schemaVersion: '1.0';
  assetId: string;
  projectId: string;
  type: SpatialLockedAssetType;
  name: string;
  canonicalVariantId: string;
  lockLevel: LockedAssetLockLevel;
  immutable: {
    geometry: boolean;
    textContent: boolean;
    aspectRatio: boolean;
    composition: boolean;
    primaryColors: boolean;
  };
  allowedTransforms: {
    perspective: boolean;
    scale: boolean;
    crop: boolean;
    monochrome: boolean;
    reverseWhite: boolean;
    materialization: boolean;
    extrusion: boolean;
    glow: boolean;
    partialOcclusion: boolean;
    decomposition: boolean;
  };
  usageRules: {
    minVisibleSizePx: number;
    maxOccurrencesPerImage: number;
    preferredZones: string[];
    forbiddenZones: string[];
    priority: number;
  };
  validation: {
    ocrExpectedText?: string[];
    contourThreshold?: number;
    aspectRatioTolerance?: number;
    colorToleranceDeltaE?: number;
  };
}

export type LockedAssetPlacementZone =
  | 'central_feature_wall'
  | 'reception_back_wall'
  | 'entrance_brand_wall'
  | 'left_supporting_wall'
  | 'right_supporting_zone';

export type LockedAssetPlacementMaterial = LockedAssetMaterialMode
  | 'fiberglass_sculpture'
  | 'vinyl_graphics'
  | 'painted_mural';

export type LockedAssetSurfaceMode =
  | 'planar_wall'
  | 'glass'
  | 'storefront'
  | 'reflective_metal'
  | 'curved_wall'
  | 'partial_occlusion'
  | 'distant_wayfinding';

export type LockedAssetProjectionStrategy =
  | 'planar_homography'
  | 'alpha_glass_projection'
  | 'segmented_curve_projection'
  | 'reflective_surface_projection'
  | 'occlusion_aware_render'
  | 'distant_deterministic_composite';

export interface LockedAssetPlacementPlan {
  schemaVersion: '1.0';
  sceneId: string;
  brandIntensity: LockedAssetBrandIntensity;
  mvpEligible: boolean;
  limitations: string[];
  placements: Array<{
    assetId: string;
    assetType: SpatialLockedAssetType;
    role: 'primary_signage' | 'hero_installation' | 'secondary_wayfinding' | 'supporting_graphic';
    zone: LockedAssetPlacementZone;
    material: LockedAssetPlacementMaterial;
    importance: number;
    targetSize: 'large' | 'medium' | 'small';
    mustBeLegible: boolean;
    maxOccurrences: 1;
    normalizedBounds: { x: number; y: number; width: number };
    surfaceMode?: LockedAssetSurfaceMode;
    projectionStrategy?: LockedAssetProjectionStrategy;
    targetQuad?: [
      { x: number; y: number },
      { x: number; y: number },
      { x: number; y: number },
      { x: number; y: number },
    ];
    occlusionPolicy?: 'none' | 'preserve_foreground_occluders' | 'fallback_not_safe';
    seriesConsistencyKey?: string;
  }>;
  styleInheritance: {
    palette: true;
    shapeLanguage: true;
    patternRhythm: true;
    logoRepetition: false;
  };
}

export interface ShortChainTaskContract {
  schemaVersion: '1.0';
  taskId: string;
  projectId: string;
  deliverableFamily: ShortChainDeliverableFamily;
  subtype: string;
  scene?: string;
  shot: string;
  count: 1 | 2;
  aspectRatio: ShortChainAspectRatio;
  currentInstruction: string;
  mustInclude: string[];
  mustAvoid: string[];
  referenceAssetIds: string[];
  brandMarkRenderMode?: LockedAssetRenderMode;
  materialMode?: LockedAssetMaterialMode;
  brandIntensity?: LockedAssetBrandIntensity;
  /** @deprecated Persisted v1 compatibility only. */
  logoUsageMode?: ShortChainLogoUsageMode;
  createdAt: string;
}

export interface ShortChainPromptTemplate {
  id: string;
  version: string;
  kind: 'family' | 'subtype' | 'shot';
  deliverableFamily: ShortChainDeliverableFamily;
  appliesTo: {
    subtypes?: string[];
    shots?: string[];
    models: string[];
  };
  requiredFields: string[];
  forbiddenInheritanceFields: string[];
  sections: {
    definition?: string[];
    professionalRequirements?: string[];
    composition?: string[];
    realism?: string[];
    negative?: string[];
  };
}

export interface ShortChainTemplateRoute {
  familyTemplateId: string;
  subtypeTemplateId: string;
  shotTemplateId: string;
  templateVersions: Record<string, string>;
}

export interface ShortChainCompiledPrompt {
  schemaVersion: '1.0';
  taskContract: ShortChainTaskContract;
  projectContextVersion: number;
  route: ShortChainTemplateRoute;
  blocks: Array<{
    id: string;
    title: string;
    items: string[];
    sources: string[];
  }>;
  sourceMap: Record<string, string[]>;
  effectiveVisualDecisionPacket?: unknown;
  lockedAssetPlacementPlan?: LockedAssetPlacementPlan | null;
  userConfirmedVisualDecision?: {
    id: string;
    sourceDocument?: string;
    sourceFingerprint: string;
  } | null;
  completeness: {
    complete: boolean;
    requiredBlockIds: string[];
    missingBlockIds: string[];
    conflictCount: number;
  };
  finalPrompt: string;
  editablePrompt: string;
  negativeConstraints: string[];
  referenceAssetIds: string[];
  logoUsageMode: ShortChainLogoUsageMode;
  compiledAt: string;
  trace: {
    compilerId: string;
    compilerVersion: string;
    adapterId: string;
    adapterVersion: string;
    sourceFingerprint: string;
    projectPromptAssetId?: string;
    projectPromptAssetVersion?: number;
    promptCharacters?: number;
    maxPromptCharacters?: number;
    compileDurationMs?: number;
  };
}

export interface ShortChainModelPromptPayload {
  adapterId: string;
  adapterVersion: string;
  model: string;
  prompt: string;
  size: '2K';
  aspectRatio: ShortChainAspectRatio;
  count: 1 | 2;
  referenceAssetIds: string[];
}

export interface ShortChainProjectPromptAsset {
  schemaVersion: '1.0';
  id: string;
  projectId: string;
  deliverableFamily: ShortChainDeliverableFamily;
  name: string;
  version: number;
  promptFragments: string[];
  negativeConstraints: string[];
  source: 'user_saved' | 'confirmed_result' | 'migration';
  createdAt: string;
  updatedAt: string;
}

export interface ShortChainImplicitAnchor {
  deliverableFamily: ShortChainDeliverableFamily;
  runId: string;
  imageId: string;
  projectRelativePath: string;
  promptFingerprint: string;
  confirmedAt: string;
}

export interface ShortChainSessionHistoryEntry {
  id: string;
  type: 'compiled' | 'generated' | 'direction_confirmed' | 'prompt_asset_saved';
  taskId: string;
  deliverableFamily: ShortChainDeliverableFamily;
  subtype: string;
  shot: string;
  promptFingerprint: string;
  runId?: string;
  imageId?: string;
  createdAt: string;
}

export interface ShortChainCreativeSession {
  schemaVersion: '1.0';
  projectId: string;
  currentTask: ShortChainTaskContract | null;
  history: ShortChainSessionHistoryEntry[];
  implicitAnchors: Partial<Record<ShortChainDeliverableFamily, ShortChainImplicitAnchor>>;
  projectPromptAssets: Partial<Record<ShortChainDeliverableFamily, string>>;
  createdAt: string;
  updatedAt: string;
}

export type ShortChainDeliverableMismatchType =
  | 'wrong_family'
  | 'wrong_subtype'
  | 'missing_required_structure'
  | 'locked_asset_violation'
  | 'forbidden_content'
  | 'brand_mismatch'
  | 'brand_tone_mismatch'
  | 'scene_incomplete'
  | 'logo_text_error'
  | 'quality_issue';

export type LockedAssetQAError =
  | 'missing_asset'
  | 'wrong_text'
  | 'contour_deformation'
  | 'aspect_ratio_error'
  | 'duplicate_asset'
  | 'unexpected_logo'
  | 'material_failure'
  | 'low_legibility'
  | 'wrong_placement'
  | 'identity_deformation'
  | 'character_proportion_error'
  | 'primary_color_error'
  | 'surface_integration_error'
  | 'occlusion_error'
  | 'series_consistency_error';

export interface LockedAssetQAResult {
  assetId: string;
  assetType?: SpatialLockedAssetType;
  passed: boolean;
  occurrenceCount: number;
  scores: {
    contourSimilarity?: number;
    aspectRatioDeviation?: number;
    ocrConfidence?: number;
    materialConfidence?: number;
    visibleWidthPx?: number;
    identitySimilarity?: number;
  };
  errors: LockedAssetQAError[];
  repairRecommended: boolean;
  fallbackRecommended: boolean;
}

export interface LockedAssetRenderDebug {
  schemaVersion: '1.0';
  sceneId: string;
  selectedAssets: string[];
  placementPlan: LockedAssetPlacementPlan | null;
  modelAdapter: string;
  modelCapabilities: string[];
  passes: Array<{
    type: 'base_scene' | 'asset_projection' | 'material_render' | 'local_repair' | 'fallback_composite';
    durationMs: number;
    inputFiles: string[];
    outputFile: string;
  }>;
  qaResults: LockedAssetQAResult[];
  selfHealingDecision?: {
    schemaVersion: '1.0';
    errors: string[];
    coveredErrors: string[];
    action: 'none' | 'local_asset_projection' | 'local_material_repair' | 'regenerate_scene';
    reason: string;
    maxRepairAttempts: 2;
    fallback: 'none' | 'deterministic_composite' | 'fail_closed';
  } | null;
  finalStatus: 'passed_first_render' | 'passed_after_repair' | 'passed_with_fallback' | 'failed';
  createdAt: string;
}

export interface ShortChainDeliverableValidation {
  schemaVersion: '1.0';
  projectId: string;
  taskId: string;
  runId: string;
  imageId: string;
  status: 'passed' | 'failed' | 'unverified';
  detectedFamily: ShortChainDeliverableFamily | 'unknown';
  detectedSubtype: string | 'unknown';
  visibleEvidence: string[];
  missingRequiredItems: string[];
  forbiddenItemsFound: string[];
  lockedAssetViolations: string[];
  brandMatch: 'matched' | 'mismatched' | 'uncertain';
  brandToneMatch: 'matched' | 'mismatched' | 'uncertain';
  sceneCompleteness: 'complete' | 'incomplete' | 'uncertain';
  logoTextStatus: 'correct' | 'incorrect' | 'absent' | 'uncertain' | 'not_required';
  qualityIssues: string[];
  lockedAssetQaResults?: LockedAssetQAResult[];
  mismatchTypes: ShortChainDeliverableMismatchType[];
  retryRecommended: boolean;
  validatorId: string;
  validatorVersion: string;
  validatedAt: string;
}

export interface ShortChainValidatedGenerationResult {
  initialRun: ImageGenerationRun;
  initialValidation: ShortChainDeliverableValidation;
  correctionRun?: ImageGenerationRun;
  correctionValidation?: ShortChainDeliverableValidation;
  terminalStatus: 'passed' | 'failed' | 'unverified';
  automaticRetryCount: 0 | 1;
  localRepairApplied?: boolean;
  localRepairAttempts?: 1 | 2;
  fallbackApplied?: boolean;
}
