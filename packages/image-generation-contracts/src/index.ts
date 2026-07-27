// @masterpiece/image-generation-contracts
// 生图功能 V1 共享契约类型（单一事实来源）。
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

export type ImageGenerationPurpose = 'exploration' | 'production';

/** Creative authority used when generating a visual direction from analysis. */
export type VisualGenerationMode = 'extend' | 'upgrade' | 'rebuild';

export type GenerationImageRole =
  | 'identity_reference'
  | 'structure_reference'
  | 'style_reference'
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
export type ImageProviderId = 'dashscope';

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
  schemaVersion: '1.0' | '2.0';

  taskId: string;
  projectId?: string;
  virtualProjectId?: string;
  runId: string;

  outputType: ImageGenerationOutputType;
  preset?: ImageGenerationPreset;
  purpose?: ImageGenerationPurpose;
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
  promptVersion: number;

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
  | 'PROMPT_COMPOSITION_FAILED';

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
  | 'USER_INTENT_EMPTY';

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
  schemaVersion: '1.0' | '2.0';

  runId: string;
  projectId: string;
  virtualProjectId?: string;
  preset?: ImageGenerationPreset;
  purpose?: ImageGenerationPurpose;
  sources?: ImageGenerationSourceBundle;
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
