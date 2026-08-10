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
// vNext short-pipeline contracts
// ---------------------------------------------------------------------------

export type VNextDeliverableFamily = 'space' | 'packaging' | 'vi' | 'poster';
export type VNextAspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16';
export type VNextLogoUsageMode = 'reference' | 'blank_area' | 'post_composite';
// R11.1: continuation is a product-level basis — the SAME frozen r8_6_golden
// compiler runs reference_assisted with a confirmed generated output as the
// single source reference. It is NOT a new compiler.
export type VNextGenerationBasis = 'standard' | 'reference_first' | 'continuation';

// R11.2.3: where the task's shot came from. The target scene owns the view
// unless the user explicitly chose a shot (user_explicit > target_scene_default
// > legacy_project_default).
export type VNextShotSource = 'user_explicit' | 'target_scene_default' | 'legacy_project_default';

// r2.0 §4.9: auxiliary metadata describing how the reference image's scene
// relates to the target scene. NEVER replaces Target Scene Functional
// Authority. Used for UI advisory, Reference boundary strength, Trace,
// and Provider prompt nuance. Default 'unknown' when the relation cannot
// be determined from the available asset metadata. Not applicable when
// generationBasis is 'standard' or 'continuation'.
export type VNextReferenceSceneRelation = 'same_scene' | 'cross_scene' | 'unknown';

// r2.0 §4.10 Path A: the adapter declares its reference-image capability
// honestly. Any strength / role / type control MUST be reported as
// unsupported until the adapter author has verified it end to end. The
// compiler / Reference Boundary (B-3) reads this; Path A can only run if
// referenceStrengthControl.supported or referenceRoleControl.supported is
// true. Otherwise the trace MUST mark providerStrengthControl = "unsupported"
// and the text block alone is sent (B-3), or Paths B / C are explored.
export interface VNextAdapterStrengthControlCapability {
  /** Whether the adapter actually supports an official strength / weight parameter for references. */
  supported: boolean;
  /** The provider-side parameter name, e.g. "ref_strength" or "image_strength". Null when unsupported. */
  controlParameter: string | null;
  /**
   * Free-form honest note. When supported=false this MUST explain what was
   * checked and why it is being reported as unsupported. When supported=true
   * it SHOULD cite the range / default the adapter author verified.
   */
  note: string;
}

export interface VNextAdapterReferenceCapability {
  /**
   * Maximum number of reference images the adapter can accept in a single
   * call. Combined with Product Policy via min(...) at runtime. The current
   * production value for Seedream 5.0 Pro is 2; bumping it requires
   * updating this declaration AND verifying the model actually accepts the
   * higher count end to end.
   */
  maxReferenceImages: number;
  referenceStrengthControl: VNextAdapterStrengthControlCapability;
  referenceRoleControl: VNextAdapterStrengthControlCapability;
}

export interface VNextAdapterCapability {
  /** The adapter id (matches VNextCompiledPrompt.trace.adapterId). */
  adapterId: string;
  /** The adapter version (matches VNextCompiledPrompt.trace.adapterVersion). */
  adapterVersion: string;
  /** Reference-image capability. */
  reference: VNextAdapterReferenceCapability;
}

// R11.1 continuation confirmation state for a generated space output.
// append-only metadata; never changes the image / run / evaluation.
export type ContinuationConfirmationState = 'unconfirmed' | 'confirmed' | 'revoked';

export interface VNextContinuationIntent {
  sourceAssetId: string;
  sourceRunId: string;
  sourceScene: string;
  targetScene: string;
  targetSceneLabel?: string;
  userRequirement?: string;
  confirmedAt: string;
  confirmationSource: 'user_explicit';
  referenceSource: 'confirmed_generated_output';
  /** R11.1: the target functional program overriding the source program. */
  targetFunctionalProgram?: {
    sceneId: string;
    sceneLabel?: string;
    viewStrategy?: string;
    requiredFunctions?: string[];
    requiredSpatialElements?: string[];
    sourceProgramElementsToDrop?: string[];
  };
  /** R11.1: what the continuation preserves vs regenerates. */
  continuationBoundary?: {
    preserve?: string[];
    regenerate?: string[];
  };
  referenceRole?: 'world_consistency';
}

export interface VNextTaskContract {
  schemaVersion: '1.0';
  taskId: string;
  projectId: string;
  deliverableFamily: VNextDeliverableFamily;
  subtype: string;
  scene?: string;
  shot: string;
  count: 1 | 2;
  aspectRatio: VNextAspectRatio;
  currentInstruction: string;
  generationBasis?: VNextGenerationBasis;
  mustInclude: string[];
  mustAvoid: string[];
  referenceAssetIds: string[];
  logoUsageMode?: VNextLogoUsageMode;
  /** R11.2.3: provenance of the shot value (target scene owns the view unless the user explicitly chose it). */
  shotSource?: VNextShotSource;
  /** r2.0 §4.9: auxiliary metadata — reference scene vs target scene relation. */
  referenceSceneRelation?: VNextReferenceSceneRelation;
  createdAt: string;
  /** R11.1: present only when generationBasis === 'continuation'. */
  continuation?: VNextContinuationIntent;
}

export interface VNextPromptTemplate {
  id: string;
  version: string;
  kind: 'family' | 'subtype' | 'shot';
  deliverableFamily: VNextDeliverableFamily;
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

export interface VNextTemplateRoute {
  familyTemplateId: string;
  subtypeTemplateId: string;
  shotTemplateId: string;
  templateVersions: Record<string, string>;
}

export interface VNextCompiledPrompt {
  schemaVersion: '1.0';
  taskContract: VNextTaskContract;
  projectContextVersion: number;
  route: VNextTemplateRoute;
  blocks: Array<{
    id: string;
    title: string;
    items: string[];
    sources: string[];
  }>;
  sourceMap: Record<string, string[]>;
  effectiveVisualDecisionPacket?: unknown;
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
  logoUsageMode: VNextLogoUsageMode;
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
    compileDurationMs?: number;
  };
}

export interface VNextModelPromptPayload {
  adapterId: string;
  adapterVersion: string;
  model: string;
  prompt: string;
  size: '2K';
  aspectRatio: VNextAspectRatio;
  count: 1 | 2;
  referenceAssetIds: string[];
}

export interface VNextProjectPromptAsset {
  schemaVersion: '1.0';
  id: string;
  projectId: string;
  deliverableFamily: VNextDeliverableFamily;
  name: string;
  version: number;
  promptFragments: string[];
  negativeConstraints: string[];
  source: 'user_saved' | 'confirmed_result' | 'migration';
  createdAt: string;
  updatedAt: string;
}

export interface VNextImplicitAnchor {
  deliverableFamily: VNextDeliverableFamily;
  runId: string;
  imageId: string;
  projectRelativePath: string;
  promptFingerprint: string;
  confirmedAt: string;
}

// R11.1 confirmed generated output — the continuation source. Append-only
// metadata; never modifies the image / run / evaluation. confirmationSource is
// always user_explicit; confirmationState is one of unconfirmed/confirmed/
// revoked. An asset in 'confirmed' state is the only valid continuation source.
export interface VNextConfirmedGeneratedOutput {
  assetId: string;
  projectId: string;
  // R11.2.1 asset identity: this is a generated space output, never a generic
  // project asset / uploaded image. confirmation is a STATE, not a file origin.
  assetOrigin: 'generated_output';
  deliverableFamily: 'space';
  generationRole: 'continuation_source' | 'none';
  sourceRunId: string;
  sourceTaskId?: string;
  sourceScene: string;
  confirmationState: 'unconfirmed' | 'confirmed' | 'revoked';
  confirmedAt: string;
  confirmationSource: 'user_explicit';
  imageSha256?: string;
  compilerId?: string;
  baselineId?: string;
}

export interface VNextSessionHistoryEntry {
  id: string;
  type: 'compiled' | 'generated' | 'direction_confirmed' | 'prompt_asset_saved';
  taskId: string;
  deliverableFamily: VNextDeliverableFamily;
  subtype: string;
  shot: string;
  promptFingerprint: string;
  runId?: string;
  imageId?: string;
  createdAt: string;
  /** R11.2.2: the generation mode that produced this entry. */
  generationBasis?: VNextGenerationBasis;
  /** R11.2.2: continuation lineage (source scene -> target scene). */
  continuationLineage?: {
    sourceScene: string;
    targetScene: string;
    sourceRunId: string;
  };
}

export interface VNextCreativeSession {
  schemaVersion: '1.0';
  projectId: string;
  currentTask: VNextTaskContract | null;
  history: VNextSessionHistoryEntry[];
  implicitAnchors: Partial<Record<VNextDeliverableFamily, VNextImplicitAnchor>>;
  projectPromptAssets: Partial<Record<VNextDeliverableFamily, string>>;
  /** R11.1: confirmed generated outputs (continuation sources), keyed by assetId. */
  confirmedGeneratedOutputs?: Record<string, VNextConfirmedGeneratedOutput>;
  createdAt: string;
  updatedAt: string;
}

export type VNextDeliverableMismatchType =
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

export interface VNextDeliverableValidation {
  schemaVersion: '1.0';
  projectId: string;
  taskId: string;
  runId: string;
  imageId: string;
  status: 'passed' | 'failed' | 'unverified';
  detectedFamily: VNextDeliverableFamily | 'unknown';
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
  mismatchTypes: VNextDeliverableMismatchType[];
  retryRecommended: boolean;
  validatorId: string;
  validatorVersion: string;
  validatedAt: string;
}

export interface VNextValidatedGenerationResult {
  initialRun: ImageGenerationRun;
  initialValidation: VNextDeliverableValidation;
  correctionRun?: ImageGenerationRun;
  correctionValidation?: VNextDeliverableValidation;
  terminalStatus: 'passed' | 'failed' | 'unverified';
  automaticRetryCount: 0 | 1;
  // r2.0 §4.13 / Phase E: the 5-state UI model. Derived from the
  // initial + optional correction pair; the renderer surfaces it
  // verbatim so the user always knows which step the flow is in.
  flowState: VNextGenerationFlowState;
  // r2.0 §4.13: first-image preservation. When the initial Provider
  // call succeeded, this is the FIRST image that reached the model.
  // The UI keeps it visible across correction retries and validation
  // failures so the user always has the "first attempt" to look at.
  // Undefined when the initial run never produced an image.
  firstImage?: VNextValidatedGenerationImageRef;
}

// r2.0 §4.13 / Phase E: image reference with the minimal metadata the
// UI needs to display the first image without re-querying the run.
export interface VNextValidatedGenerationImageRef {
  runId: string;
  imageId: string;
  relativePath: string;
  mimeType: string;
  sha256: string;
  sizeBytes: number;
}

// r2.0 §4.13 / Phase E: the 5-state machine. The UI uses this single
// enum to drive its banner + first-image preservation behavior. The
// `terminalStatus` on VNextValidatedGenerationResult is the LEGACY
// three-state (passed/failed/unverified) summary; the new `flowState`
// is a strictly richer encoding that distinguishes every step the
// user actually sees.
export type VNextGenerationFlowState =
  | 'initial_failed'              // state 1: initial Provider call never produced an image
  | 'awaiting_validation'         // state 2: initial Provider succeeded, waiting for / receiving validation
  | 'correcting'                  // state 3: initial validation failed, correction prompt issued
  | 'correction_start_failed'     // state 4: correction Provider call itself failed
  | 'correction_still_failed'     // state 5: correction Provider succeeded but validation still failed
  | 'passed';                     // terminal: validation passed (initial or correction)

// r2.0 §4.13 / Phase E: input shape for the 5-state derivation. The
// helper takes the COMPONENTS of a result (not the full result, which
// is what we're computing flowState for) so the caller can build the
// full result without a circular type.
export interface VNextGenerationFlowInput {
  initialRun: ImageGenerationRun;
  initialValidation?: VNextDeliverableValidation;
  correctionRun?: ImageGenerationRun;
  correctionValidation?: VNextDeliverableValidation;
}

// r2.0 §6.7 / Phase F: the multimodal similarity audit. The audit
// must use a real multimodal LLM to look at the generated image
// (and any reference images) and score 6 dimensions. File-hash /
// perceptual-hash only is explicitly disallowed by the r2.0 plan:
// "不**仅**使用文件哈希 / 感知哈希判断复制。**必须**结合多模态 LLM 看图审计".
//
// Each dimension is an integer 1..5. The first 5 must be >= 4 to
// pass; Near-copy Risk is INVERTED (lower is better) and must be
// <= 2.5 to pass. The overall pass requires all 6 dimensions to
// pass individually.
export interface VNextSimilarityAuditScores {
  /** Visual World Fidelity — does the image carry the reference image's design language (material / light / color / surface / form rhythm)? */
  visualWorldFidelity: number;
  /** Scene Accuracy — does the image's functional program / spatial type match the requested target scene? */
  sceneAccuracy: number;
  /** Functional Realism — is the spatial program credible / human-scale / usable? */
  functionalRealism: number;
  /** Target Scene Authority — does the image treat the target scene as the function layer authority (not a re-cast of the reference's scene)? */
  targetSceneAuthority: number;
  /** Reference Alignment — does the image retain enough reference identity to be recognizably related, without being 1:1 copied? */
  referenceAlignment: number;
  /** Near-copy Risk — INVERTED: 1 = clearly different from reference, 5 = essentially a 1:1 copy. Must be <= 2.5. */
  nearCopyRisk: number;
}

// r2.0 §6.7 / Phase F: the v2.0 thresholds. Centralized here so the
// helper, the audit runner, the UI badge, and the smoke runner all
// agree on the same numbers.
export const VNEXT_SIMILARITY_AUDIT_THRESHOLDS = Object.freeze({
  /** The first 5 dimensions must meet this minimum. */
  minScore: 4,
  /** The near-copy risk must stay at or below this maximum (lower is better). */
  maxNearCopyRisk: 2.5,
  /** Auditor version, for trace compatibility. */
  auditorVersion: 'space-similarity-audit@1.0.0',
});

// r2.0 §6.7 / Phase F: per-dimension pass flags. Computed from the
// scores + the v2.0 thresholds.
export interface VNextSimilarityAuditPassFlags {
  visualWorldFidelity: boolean;
  sceneAccuracy: boolean;
  functionalRealism: boolean;
  targetSceneAuthority: boolean;
  referenceAlignment: boolean;
  nearCopyRisk: boolean;
  overall: boolean;
}

// r2.0 §6.7 / Phase F: the audit result. The shape is JSON-serialisable
// so it can be persisted as a run-evidence file (`similarity-audit.json`).
export interface VNextSimilarityAuditResult {
  scores: VNextSimilarityAuditScores;
  pass: VNextSimilarityAuditPassFlags;
  // Free-form rationale from the multimodal LLM. Stored as opaque
  // text so the contracts package does not depend on a specific
  // reasoner shape.
  rationale: string;
  metadata: {
    auditId: string;
    projectId: string;
    runId: string;
    modelUsed: string;
    auditedAt: string;
  };
  // Total cost: the number of multimodal-LLM calls made. The audit
  // is a single round-trip; if the runner retries, the count grows.
  // UI / smoke can use this to budget.
  llmCallCount: number;
}

// r2.0 §6.7 / Phase F: input shape for the helper. Pure function —
// given 6 raw scores (1..5 each), returns the pass flags + the
// per-dimension verdict text. Throws on invalid scores (out of
// range / non-integer) so the contracts layer never silently
// produces a result the UI cannot trust.
export function assertVNextSimilarityAudit(
  scores: VNextSimilarityAuditScores,
  thresholds: {
    minScore: number;
    maxNearCopyRisk: number;
  } = VNEXT_SIMILARITY_AUDIT_THRESHOLDS,
): VNextSimilarityAuditPassFlags {
  const min = thresholds.minScore;
  const maxRisk = thresholds.maxNearCopyRisk;
  for (const [key, value] of Object.entries(scores) as [keyof VNextSimilarityAuditScores, number][]) {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1 || value > 5) {
      throw new Error(`VNextSimilarityAudit: dimension "${key}" must be an integer in 1..5, got ${value}`);
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
    overall: visualWorldFidelity
      && sceneAccuracy
      && functionalRealism
      && targetSceneAuthority
      && referenceAlignment
      && nearCopyRisk,
  };
}

/**
 * r2.0 §4.13 / Phase E: derive the 5-state flow state from the
 * initial / optional correction pair. The result's firstImage /
 * terminalStatus / automaticRetryCount fields are NOT inspected here
 * (terminalStatus is the legacy three-state summary; firstImage is
 * present iff initialRun.status === 'succeeded' and is not the
 * deciding factor for any of the 5 states). The check priority:
 *
 *   1. initialRun.status !== 'succeeded'                 → 'initial_failed'
 *   2. !initialValidation (still pending)               → 'awaiting_validation'
 *   3. initialValidation.status !== 'failed'             → 'passed'
 *   4. initialValidation.retryRecommended !== true      → 'passed'
 *      (validator said "do not retry", so we stop here)
 *   5. !correctionRun (no correction was issued)         → 'correcting'
 *      (in practice the caller chose not to retry; the UI treats
 *      this as "correction skipped")
 *   6. correctionRun.status !== 'succeeded'             → 'correction_start_failed'
 *   7. !correctionValidation (still pending)             → 'correcting'
 *   8. correctionValidation.status === 'failed'          → 'correction_still_failed'
 *   9. otherwise                                          → 'passed'
 *
 * @param {VNextGenerationFlowInput} input
 * @returns {VNextGenerationFlowState}
 */
export function deriveGenerationFlowState(
  input: VNextGenerationFlowInput,
): VNextGenerationFlowState {
  if (input.initialRun.status !== 'succeeded') return 'initial_failed';
  if (!input.initialValidation) return 'awaiting_validation';
  if (input.initialValidation.status !== 'failed') return 'passed';
  if (input.initialValidation.retryRecommended !== true) return 'passed';
  if (!input.correctionRun) return 'correcting';
  if (input.correctionRun.status !== 'succeeded') return 'correction_start_failed';
  if (!input.correctionValidation) return 'correcting';
  if (input.correctionValidation.status === 'failed') return 'correction_still_failed';
  return 'passed';
}

// r2.0 §8 / Phase F-1: the run evidence checkpoint. The vNext
// compile + start + validate pipeline is expected to persist a
// defined set of evidence files under the compile artifact
// directory + the run directory. The checkpoint enumerates the
// REQUIRED files, runs a cheap existence + shape check on each, and
// returns a single pass/fail verdict. The smoke runner and the
// desktop UI use this as the run-evidence hard gate.
//
// Required evidence (per r2.0 §8):
//   - task-contract.json
//   - target-scene-projection.json  (Phase A1, optional for non-space)
//   - prompt-source-map.json       (Phase A1, optional for non-space)
//   - reference-trace.json
//   - provider-payload.redacted.json
//   - trace.json
//   - run.json
//   - output.png (the first image, the "preserved first" from Phase E)
//   - validations/<taskId>.summary.json (when the validated flow ran)
export type VNextEvidenceFileName =
  | 'task-contract.json'
  | 'target-scene-projection.json'
  | 'prompt-source-map.json'
  | 'reference-trace.json'
  | 'provider-payload.redacted.json'
  | 'trace.json'
  | 'run.json'
  | 'output.png'
  | 'validations/summary.json';

export interface VNextEvidenceFileStatus {
  path: string;
  exists: boolean;
  sizeBytes: number;
  // For JSON files, the parsed top-level type. For output.png this
  // is 'image' so the UI can render it. Null when the file is
  // missing or unreadable.
  kind: 'json-object' | 'json-array' | 'image' | 'text' | null;
}

export interface VNextEvidenceCheckpoint {
  projectId: string;
  taskId: string;
  // Per-file status. Required files missing a record here mean
  // the checkpoint never even tried them (caller passed a partial
  // list).
  files: VNextEvidenceFileStatus[];
  // Set of required files that are missing OR unreadable.
  missingRequired: VNextEvidenceFileName[];
  pass: boolean;
  checkedAt: string;
}
