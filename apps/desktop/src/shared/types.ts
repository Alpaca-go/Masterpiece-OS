// Provider is user-defined metadata. Desktop accepts any OpenAI-compatible
// multimodal endpoint instead of restricting profiles to a vendor allow-list.
import type {
  AnchorCandidate,
  AnchorCandidateEvaluation,
  CreativeDirection,
  CreativeSession,
  CreativeUnderstanding,
  GenerationOutput,
  GenerationPromptSnapshot,
  GenerationSeries,
  LockedAsset as CreativeLockedAsset,
  ReferencePack,
  StyleProfile,
  VisualMemory,
  VisualExploration,
  VisualCanon
} from '../../../../packages/project-contracts/src/index';
export type {
  AnchorCandidate,
  AnchorCandidateEvaluation,
  CreativeDirection,
  CreativeSession,
  CreativeUnderstanding,
  GenerationOutput,
  GenerationSeries,
  ReferencePack,
  StyleProfile,
  VisualMemory,
  VisualExploration,
  VisualCanon
} from '../../../../packages/project-contracts/src/index';

export type ProviderKind = string;
export type ApiProtocol =
  | 'openai-chat-multimodal'
  | 'dashscope-wan-image'
  | 'openai-image-generation'
  | 'google-gemini-image'
  | 'seedream-image';
export type ModelType = 'analysis' | 'image_generation';
export interface ModelRegistryEntry {
  id: string;
  name: string;
  type: ModelType;
  provider: string;
  protocol: ApiProtocol;
  capabilities: string[];
  referenceSupport: boolean;
  enabledByDefault: boolean;
  legacyCompatible?: boolean;
}
export type OutputLanguage = 'zh-CN' | 'en';
export type AnalysisProfile = 'fusion-enhanced';
export type ProjectStatus = 'draft' | 'ready' | 'running' | 'completed' | 'failed' | 'cancelled';
export type ProjectNameSource =
  | 'visual-content'
  | 'logo-or-guideline'
  | 'pdf-content'
  | 'uploaded-archive-name'
  | 'uploaded-folder-name'
  | 'common-file-prefix'
  | 'fallback-datetime';

export type AnalysisStage =
  | 'preparing-assets'
  | 'extracting-project-facts'
  | 'building-contact-sheet'
  | 'building-prompt'
  | 'reasoning'
  | 'generating-report'
  | 'validating-output'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface AnalysisProgress {
  projectId: string;
  stage: AnalysisStage;
  message: string;
  startedAt: string;
  elapsedMs?: number;
  assetCount?: number;
  model?: string;
  failedAtStage?: Exclude<AnalysisStage, 'failed' | 'cancelled' | 'completed'>;
  cacheStatus?: 'checking' | 'hit' | 'miss' | 'forced';
}

export interface ApiProfile {
  id: string;
  displayName: string;
  provider: ProviderKind;
  protocol?: ApiProtocol;
  modelType?: ModelType;
  registryModelId?: string;
  capabilities?: string[];
  referenceSupport?: boolean;
  modelId: string;
  baseUrl: string;
  credentialKey: string;
  hasApiKey: boolean;
  isDefault: boolean;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastTestedAt?: string;
  lastTestStatus?: 'success' | 'failed';
}

export interface SaveApiProfileInput {
  id?: string;
  displayName: string;
  provider: ProviderKind;
  protocol: ApiProtocol;
  modelType: ModelType;
  registryModelId?: string;
  modelId: string;
  baseUrl: string;
  apiKey?: string;
  isDefault: boolean;
  isEnabled: boolean;
}

export interface PublicSettings {
  profiles: ApiProfile[];
  modelRegistry?: ModelRegistryEntry[];
  defaultProfileId: string | null;
  provider: ProviderKind;
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
  defaultDataPath: string;
  cacheEnabled: boolean;
  logLevel: 'error' | 'info' | 'debug';
  directionGenerationMode?: DirectionGenerationMode;
  analysisPipelineMode?: AnalysisPipelineMode;
  connectionStatus: 'untested' | 'connected' | 'failed';
}

export interface SaveSettingsInput {
  defaultDataPath: string;
  cacheEnabled: boolean;
  logLevel: 'error' | 'info' | 'debug';
  directionGenerationMode?: DirectionGenerationMode;
  analysisPipelineMode?: AnalysisPipelineMode;
}

export interface ProjectAsset {
  id: string;
  batchId: string;
  sourceType: 'file' | 'folder' | 'archive-extracted';
  originalName: string;
  relativePath: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  status: 'ready' | 'ignored' | 'deleted' | 'failed';
  archiveSourceName?: string;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type CurrentProjectAssetRole =
  | 'brand_identity_evidence'
  | 'logo_evidence'
  | 'logo_typography_evidence'
  | 'service_fact_evidence'
  | 'confirmed_structure_evidence'
  | 'observed_copy'
  | 'legacy_visual_only'
  | 'stock_mockup'
  | 'third_party_mockup'
  | 'reference_only'
  | 'brand_name_evidence'
  | 'product_fact_evidence'
  | 'packaging_structure_evidence'
  | 'product_structure_evidence'
  | 'touchpoint_evidence'
  | 'locked_asset_evidence'
  | 'brand_copy_evidence'
  | 'spatial_structure_evidence'
  | 'legacy_visual_style_only'
  | 'duplicate'
  | 'irrelevant'
  | 'uncertain';

export interface CurrentProjectAssetDecision {
  assetId: string;
  filename: string;
  role: CurrentProjectAssetRole;
  roles?: CurrentProjectAssetRole[];
  keepInCorePack: boolean;
  includeInAnalysisEvidencePack?: boolean;
  includeInGenerationIdentityPack?: boolean;
  authenticity?: AssetAuthenticity;
  generationUsage?: 'identity' | 'product' | 'product_or_service' | 'structure_only' | 'locked_asset' | 'exclude';
  canProveIdentity?: boolean;
  canProveProductFact?: boolean;
  canProveStructure?: boolean;
  canInfluenceGenerationStyle?: boolean;
  keepReason: string;
  extractedFacts: string[];
  lockedEvidence: string[];
  containsLegacyStyle: boolean;
  legacyStyleShouldInfluenceOutput: false;
  confidence: number;
  requiresHumanReview: boolean;
}

export interface PackagingStructureEvidence {
  assetId: string;
  description: string;
  confidence: number;
}

export interface LockedAssetEvidence {
  name: string;
  assetIds: string[];
  reason: string;
}

export interface CurrentProjectCorePack {
  projectId: string;
  brandName: string;
  industry: string;
  productFacts: string[];
  targetAudience?: string[];
  brandPositioning?: string;
  logoAssetIds: string[];
  logoTypographyAssetIds: string[];
  packagingStructures: PackagingStructureEvidence[];
  productAssets: string[];
  touchpoints: ProjectTouchpointInventory;
  confirmedBrandCopy: string[];
  lockedAssets: LockedAssetEvidence[];
  excludedLegacyStyleAssetIds: string[];
  uncertainAssetIds: string[];
  sourceAssetIds: string[];
  schemaVersion: 'current-project-core-pack-v1';
}

export interface CurrentProjectCorePackValidation {
  hasBrandName: boolean;
  hasLogoEvidence: boolean;
  hasLogoTypographyEvidence: boolean;
  hasProductFactEvidence: boolean;
  hasRequiredStructureEvidence: boolean;
  hasLockedAssetEvidence: boolean;
  excludesLegacyStyleOnlyAssets: boolean;
  excludesDuplicateAssets: boolean;
  noReferenceAssetsMixedIn: boolean;
  unresolvedUncertainAssets: string[];
  passed: boolean;
  warnings: string[];
}

export type ReferenceAssetRole =
  | 'system_overview'
  | 'brand_identity'
  | 'packaging'
  | 'packaging_detail'
  | 'product'
  | 'poster'
  | 'vi_application'
  | 'material_detail'
  | 'typography_detail'
  | 'graphic_detail'
  | 'spatial'
  | 'display_layout'
  | 'interface'
  | 'publication'
  | 'photography_style'
  | 'motion'
  | 'brand_strategy_text'
  | 'pure_text_slide'
  | 'duplicate'
  | 'irrelevant'
  | 'uncertain';

export type AssetAuthenticity =
  | 'brand_original'
  | 'user_confirmed_real'
  | 'user_confirmed_locked'
  | 'stock_mockup'
  | 'third_party_mockup'
  | 'design_concept_only'
  | 'reference_only'
  | 'unknown';

export interface AssetAuthenticityDecision {
  assetId: string;
  authenticity: AssetAuthenticity;
  confidence: number;
  reason: string;
  canProveIdentity: boolean;
  canProveProductFact: boolean;
  canProveStructure: boolean;
  canProveLockedAsset: boolean;
  includeInAnalysisEvidencePack: boolean;
  includeInGenerationIdentityPack: boolean;
  requiresHumanReview: boolean;
}

export type GenerationOutputType =
  | 'anchor_vi_system'
  | 'packaging_single'
  | 'packaging_series'
  | 'brand_poster'
  | 'product_poster'
  | 'vi_application'
  | 'spatial_scene'
  | 'digital_campaign';

export type StyleCarrierCategory =
  | 'color'
  | 'layout'
  | 'typography'
  | 'graphic'
  | 'material'
  | 'photography'
  | 'display'
  | 'spatial';

/**
 * §2 参考身份污染类型。任一非 'none' 的类型都不得进入 Style Carrier Ranking。
 * 生产协议保持项目无关：污染由数据标注驱动，不得靠具体品牌/行业词硬编码。
 */
export type ReferenceContaminationType =
  | 'brand_name'
  | 'brand_logo'
  | 'brand_wordmark'
  | 'product_name'
  | 'slogan'
  | 'signature_graphic'
  | 'proprietary_pattern'
  | 'proprietary_character'
  | 'none';

/** §2 进入 Ranking 前的 Style Carrier 候选（携带污染标注）。 */
export interface StyleCarrierCandidate {
  id: string;
  readableRule: string;
  category: StyleCarrierCategory;
  supportingAssetIds: string[];
  contaminationTypes: ReferenceContaminationType[];
  signatureGraphicIds: string[];
  compatibleOutputTypes: GenerationOutputType[];
  confidence?: number;
}

export interface ReferenceAssetDecision {
  assetId: string;
  filename: string;
  role: ReferenceAssetRole;
  primaryRole?: ReferenceAssetRole;
  secondaryRoles?: ReferenceAssetRole[];
  styleCarrierStrength: ConfidenceLevel;
  includeInMasterSet: boolean;
  eligibleOutputTypes: GenerationOutputType[];
  representedStyleCarriers: StyleCarrierCategory[];
  styleCarrierRules?: Array<{
    category: StyleCarrierCategory;
    readableRule: string;
    confidence: number;
    /** §2 该规则携带的参考身份污染类型；任一非 'none' 者不得进入 Ranking。 */
    contaminationTypes?: ReferenceContaminationType[];
    /** §2 该规则关联的禁止复制参考专属图形 id；非空者不得进入 Ranking。 */
    signatureGraphicIds?: string[];
  }>;
  duplicationGroupId?: string;
  confidence: number;
  reason: string;
  requiresHumanReview: boolean;
}

export interface StyleCarrier {
  id: string;
  category: StyleCarrierCategory;
  description: string;
  internalLabel?: string;
  readableRule?: string;
  priority: 'primary' | 'secondary' | 'optional';
  supportingAssetIds: string[];
  mustBeVisibleInOutput: boolean;
  confidence: number;
  /** 是否携带参考专属身份（参考身份、文案、专属图形）。一旦为 true 不得进入任何 Style Carrier Ranking。 */
  containsReferenceIdentity?: boolean;
  /** 关联到的禁止复制参考专属图形 id 列表。一旦非空不得进入 Ranking。 */
  referencesSignatureGraphicIds?: string[];
  /** §2 该载体携带的参考身份污染类型（品牌名 / Logo / 文案等）。任一非 'none' 者不得进入 Ranking。 */
  contaminationTypes?: ReferenceContaminationType[];
  /** 该载体可应用的输出任务类型。为空表示未声明（按全局处理）。 */
  compatibleOutputTypes?: GenerationOutputType[];
  /** §3 该载体是否要求真实摄影表现（摄影类载体不得进入禁止摄影的任务）。 */
  requiresPhotography?: boolean;
  /** §3 该载体是否要求空间/场景表现。 */
  requiresSpace?: boolean;
  /** §3 该载体是否要求动效表现。 */
  requiresMotion?: boolean;
  /** §3 该载体是否要求真实实体触点（材质/包装等）。 */
  requiresPhysicalTouchpoint?: boolean;
}

/** §3 编译任务级 Style Carrier 时的任务约束种子（决定摄影/空间/动效是否允许）。 */
export interface TaskDefinitionSeed {
  outputType?: GenerationOutputType;
  photographyAllowed?: boolean;
  spatialSceneAllowed?: boolean;
  motionAllowed?: boolean;
  physicalObjectAllowed?: boolean;
  typographyRequired?: boolean;
}

/** 全局 Style Carrier Ranking（两级：primary / secondary / optional）。 */
export interface GlobalStyleCarrierRanking {
  primary: StyleCarrier[];
  secondary: StyleCarrier[];
  optional: StyleCarrier[];
}

/** 按单个输出任务筛选后的 Style Carrier 集合。 */
export interface TaskScopedStyleCarrierSet {
  outputType: GenerationOutputType;
  requiredPrimary: StyleCarrier[];
  supportingSecondary: StyleCarrier[];
  excludedForTask: Array<{ carrierId: string; reason: string }>;
}

/** Style Carrier 与输出任务的兼容性描述。 */
export interface StyleCarrierTaskCompatibility {
  carrierId: string;
  compatibleOutputTypes: GenerationOutputType[];
  incompatibleOutputTypes: GenerationOutputType[];
  requiresPhotography: boolean;
  requiresSpace: boolean;
  requiresMotion: boolean;
  requiresPhysicalTouchpoint: boolean;
}

export interface ReferenceMasterSet {
  assetIds: string[];
  decisions: ReferenceAssetDecision[];
  styleCarriers: StyleCarrier[];
  schemaVersion: 'reference-master-set-v1';
}

export interface ReferenceMasterSetValidation {
  hasSystemOverview: boolean;
  hasCrossTouchpointCoverage: boolean;
  hasPrimaryStyleCarrierEvidence: boolean;
  hasPackagingEvidence: boolean;
  hasPosterOrLayoutEvidence: boolean;
  hasMaterialOrDetailEvidence: boolean;
  excludesPureTextSlides: boolean;
  excludesBusinessAnalysisPages: boolean;
  excludesNearDuplicates: boolean;
  missingCoverageRoles: ReferenceAssetRole[];
  passed: boolean;
  warnings: string[];
}

export interface TaskReferenceSubset {
  outputType: GenerationOutputType;
  selectedAssetIds: string[];
  primaryReferenceAssetId: string;
  supportingReferenceAssetIds: string[];
  coveredPrimaryStyleCarrierIds: string[];
  missingStyleCarrierIds: string[];
  selectionReason: string;
  confidence: number;
  matchLevel?: 'exact' | 'compatible' | 'inferred' | 'insufficient';
  requiresHumanReview?: boolean;
  coveredStyleCarrierIds?: string[];
  missingEvidence?: string[];
  /** 真实生成的子集产物路径。禁止用固定路径伪造；未生成则为空。 */
  artifactPath?: string;
}

export interface TaskSubsetValidation {
  matchesOutputType: boolean;
  hasHighStrengthPrimaryReference: boolean;
  coversPrimaryStyleCarriers: boolean;
  avoidsCrossTypeNoise: boolean;
  avoidsNearDuplicates: boolean;
  assetCountValid: boolean;
  passed: boolean;
}

/** §6.1 单个请求的生成任务。 */
export interface RequestedGenerationTask {
  outputType: GenerationOutputType;
  requestedBy: 'user' | 'system' | 'workflow';
  required: boolean;
}

/** §6.1 请求任务清单。 */
export interface RequestedGenerationTaskManifest {
  tasks: RequestedGenerationTask[];
}

/** §6.2 Task Subset 完整性清单。 */
export interface TaskReferenceSubsetManifest {
  subsets: TaskReferenceSubset[];
}

/** §5.5 任务级 Style Carrier 校验结果。 */
export interface TaskStyleCarrierValidation {
  outputType: GenerationOutputType;
  incompatibleCarrierIds: string[];
  missingDominantCategories: string[];
  primaryCountValid: boolean;
  passed: boolean;
}

export interface AssetSelectionProtocolResult {
  currentProjectAssetDecisions: CurrentProjectAssetDecision[];
  currentProjectCorePack: CurrentProjectCorePack;
  currentCorePackValidation: CurrentProjectCorePackValidation;
  referenceAssetDecisions: ReferenceAssetDecision[];
  referenceMasterSet: ReferenceMasterSet;
  referenceMasterSetValidation: ReferenceMasterSetValidation;
  taskReferenceSubsets: TaskReferenceSubset[];
  taskSubsetValidations: TaskSubsetValidation[];
  requiresHumanConfirmation: boolean;
  schemaVersion: 'asset-selection-protocol-v1';
  /** §3.4 参考专属图形泄漏校验。 */
  signatureGraphicLeakValidation?: SignatureGraphicLeakValidation;
  /** §5.5 任务级 Style Carrier 校验（按请求任务）。 */
  taskStyleCarrierValidations?: TaskStyleCarrierValidation[];
  /** §7 Generation Context Manifest：审计报告与 Brief 共用。 */
  generationContextManifest?: GenerationContextManifest;
  /** §6 请求任务清单（用于子集覆盖校验）。 */
  requestedTasks?: RequestedGenerationTask[];
}

export interface ProjectRecord {
  id: string;
  projectName: string;
  detectedProjectName: string;
  projectNameSource: ProjectNameSource;
  projectNameConfidence: number;
  brandName: string;
  industry: string;
  detectedBrandName: string;
  detectedIndustry: string;
  factConfidence: {
    brandName: number;
    industry: number;
  };
  description: string;
  logoLocked: boolean;
  lockedFacts: string[];
  outputLanguage: OutputLanguage;
  provider: ProviderKind;
  model: string;
  apiProfileId: string | null;
  analysisProfile: AnalysisProfile;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  lastRunAt: string | null;
  lastDurationMs: number | null;
  assetCount: number;
  imageCount: number;
  lastReportFilename: string | null;
  lastError: string | null;
  logoFiles: string[];
  briefFiles: string[];
  assets: ProjectAsset[];
  visualContextFilename?: string | null;
  visualContextStatus?: 'missing' | 'ready' | 'failed';
  visualContextSchemaVersion?: string | null;
  visualContextLastBuiltAt?: string | null;
}

// ── 共享契约类型已迁移至 packages/project-contracts（repository-slimming-v2 Phase 1）──
export type {
  PackagingStructureStatus,
  ProjectVisualContextStatus,
  ProjectVisualContext,
  DocumentVisualContextEvidence,
  DocumentVisualContext,
  ReferenceAssetSelectionItem,
  ReferenceAssetSelection,
  AnchorAspectRatio,
  NormalizedProjectFacts,
  ReferenceStyleCapsule,
  ContextConflict,
  ResolvedProjectContext
} from '../../../../packages/project-contracts/src/index';
import type {
  ProjectVisualContext,
  DocumentVisualContext,
  DocumentVisualContextEvidence,
  ReferenceAssetSelection,
  ReferenceAssetSelectionItem,
  AnchorAspectRatio,
  NormalizedProjectFacts,
  ReferenceStyleCapsule,
  ContextConflict,
  ResolvedProjectContext
} from '../../../../packages/project-contracts/src/index';

// ── 生图功能 V1 契约类型已迁移至 packages/image-generation-contracts（生图 V1 Phase 1）──
export type {
  ImageGenerationOutputType,
  ImageGenerationPreset,
  ImageGenerationPurpose,
  ImageGenerationSourceBundle,
  ImageGenerationSourceBundleV3,
  GenerationSourcePreset,
  GenerationDeliverable,
  UserIntentResolution,
  ImageGenerationCompileFingerprint,
  GenerationSourceContext,
  ImageGenerationPolicy,
  ImageGenerationPresetCapability,
  ImageProviderRegion,
  ImageProviderId,
  ImageProviderCapabilities,
  ImageReferenceRole,
  ImageReferenceSource,
  ImageGenerationReference,
  ImageGenerationTaskParameters,
  ImageGenerationTask,
  SourceContextSnapshot,
  ImageGenerationContextSnapshotV2,
  ImageGenerationRunStatus,
  GateAErrorCode,
  GateBErrorCode,
  GateCErrorCode,
  ImageGenerationBlockingCode,
  ImageGenerationGate,
  ImageGenerationWarningCode,
  ImageGenerationBlockingError,
  ImageGenerationWarning,
  ImageGenerationGateResult,
  ProviderTaskState,
  ProviderResultImage,
  ProviderTaskStatus,
  ImageGenerationSubmitResult,
  ImageGenerationProvider,
  GeneratedImage,
  ImageReviewDecision,
  ImageGenerationReview,
  ImageGenerationRetryMode,
  ImageGenerationRetryRecord,
  ImageGenerationMetrics,
  ImageGenerationRun,
  ImageGenerationRunSummary
} from '../../../../packages/image-generation-contracts/src/index';
import type {
  ImageGenerationRun,
  ImageGenerationRunSummary,
  ImageGenerationRunStatus,
  ImageGenerationGateResult,
  ImageGenerationReview,
  ImageGenerationRetryMode,
  ImageProviderCapabilities,
  ImageGenerationOutputType,
  ImageGenerationSourceBundle,
  ImageGenerationSourceBundleV3,
  ImageGenerationPurpose,
  GenerationSourcePreset,
  GenerationDeliverable,
  UserIntentResolution,
  ImageGenerationCompileFingerprint,
  GenerationSourceContext,
  ImageGenerationContextSnapshotV2,
  ImageGenerationWarning,
  ImageGenerationPresetCapability,
  ImageProviderRegion
} from '../../../../packages/image-generation-contracts/src/index';

export interface CreateProjectInput {
  sourcePaths: string[];
  apiProfileId: string;
}

export interface AssetItem {
  id: string;
  batchId: string;
  sourceType: ProjectAsset['sourceType'];
  relativePath: string;
  name: string;
  extension: string;
  bytes: number;
  kind: 'image' | 'pdf' | 'unsupported';
  sha256: string;
  archiveSourceName?: string;
  thumbnailDataUrl?: string;
  warning?: string;
}

export interface AssetSummary {
  totalFiles: number;
  totalBytes: number;
  imageCount: number;
  pdfCount: number;
  logoDetected: boolean;
  unreadableFiles: string[];
  items: AssetItem[];
}

export interface ImportResult {
  imported: string[];
  extracted: string[];
  skipped: string[];
  summary: AssetSummary;
}

export interface AnalysisResult {
  project: ProjectRecord;
  reportFilename: string;
  reportPath: string;
  runtimeReportPath: string;
  apiProfileId: string;
  provider: string;
  model: string;
  durationMs: number;
  assetCount: number;
  imageCount: number;
  reasoningCacheHit: boolean;
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
  model: string;
  supportsImages: boolean;
  elapsedMs: number;
}

export interface DocumentSection {
  heading?: string;
  level?: number;
  content: string;
  page?: number;
}

export interface DocumentTable {
  rows: string[][];
  markdown: string;
}

export interface NormalizedDocument {
  id: string;
  filename: string;
  mimeType: string;
  sourceType: 'pdf' | 'docx' | 'markdown' | 'text';
  title?: string;
  rawText: string;
  sections: DocumentSection[];
  tables: DocumentTable[];
  pageCount?: number;
  characterCount: number;
  parseWarnings: string[];
  documentRole?: 'brand-strategy' | 'creative-brief' | 'visual-guideline' | 'product-information' | 'market-research' | 'reference' | 'unknown';
}

export interface VisualStrategyCorpus {
  documents: NormalizedDocument[];
  sourceIndex: Array<{
    documentId: string;
    filename: string;
    section: string;
    page?: number;
    characterCount: number;
  }>;
  mergedText: string;
  warnings: string[];
}

export type DirectionGenerationMode = 'execution_oriented_v2' | 'conceptual_v1';
export type AnalysisPipelineMode =
  | 'retrieval_first'
  | 'visual_fact_first_legacy'
  | 'deep_analysis_legacy'
  | 'visual_fact_first'
  | 'legacy_deep_analysis';


export interface VisualTranslationDocumentSummary {
  path: string;
  filename: string;
  sourceType: NormalizedDocument['sourceType'];
  title?: string;
  characterCount: number;
  pageCount?: number;
  warnings: string[];
}


// ── Document Context Extraction（Phase 2：文档分析上下文提取器）──
// 默认流程：文档解析 → 视觉相关事实提取（1 次模型调用 + 最多 1 次 Repair）
// → 确定性归一化 → 人工确认 → 本地简报编译。默认不联网做 Benchmark、
// 不生成三个方向、不自动推荐、不生成技术审计。

export type DocumentAnalysisMode = 'context_extraction' | 'legacy_three_directions';

export type DocumentContextRunStatus =
  | 'pending'
  | 'parsing'
  | 'extracting'
  | 'repairing'
  | 'awaiting_confirmation'
  | 'compiling'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type DocumentContextStage =
  | '00-document-preparation'
  | '01-document-role-index'
  | '02-visual-context-extraction'
  | '03-local-normalization'
  | '04-human-confirmation'
  | '05-local-brief-compiler';

// DocumentVisualContextEvidence / DocumentVisualContext 已迁移至 packages/project-contracts。

// 非阻断警告（DOCUMENT_ROLE_UNKNOWN / TARGET_AUDIENCE_UNKNOWN / ...）
export interface DocumentContextWarning {
  code: string;
  message: string;
  field?: string;
}

export interface DocumentContextRun {
  id: string;
  mode: DocumentAnalysisMode;
  projectName: string;
  status: DocumentContextRunStatus;
  apiProfileId: string;
  provider: string;
  model: string;
  documentCount: number;
  documentNames: string[];
  createdAt: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  currentStage?: DocumentContextStage;
  modelCallCount?: number;
  repairCount?: number;
  warnings?: DocumentContextWarning[];
  errorCode?: string | null;
  lastError?: string | null;
  briefFilename?: string | null;
}

export interface DocumentVisualContextResult {
  run: DocumentContextRun;
  context: DocumentVisualContext;
  briefMarkdown: string;
}

export interface DocumentContextProgress {
  runId: string;
  projectName: string;
  stage: DocumentContextStage;
  status: DocumentContextRunStatus;
  message: string;
  startedAt: string;
  elapsedMs: number;
  model: string;
}

// ── Reference-Led Visual Direction（Reference Translation Profile）──
// 离线确定性引擎：从参考项目视觉分析中提取可迁移机制，
// 在不复制签名资产的前提下映射到当前项目。零模型调用。

export interface ReferenceTranslationRule {
  name: string;
  evidence: string[];
  mechanism: string;
  function: string;
  confidence: number;
}

export interface ReferenceTransferabilityItem {
  item_id: string;
  name: string;
  source_rule: string;
  reason: string;
  evidence: string[];
  confidence: number;
}

export interface ReferenceTranslationMatrixItem {
  translation_id: string;
  referenceMechanism: string;
  referenceFunction: string;
  projectCondition: string;
  translatedMechanism: string;
  retainedProperties: string[];
  changedProperties: string[];
  prohibitedElements: string[];
  confidence: number;
}

export interface ReferenceTranslationProfile {
  schema_version: string;
  source_role: string;
  referenceIdentity: {
    detectedIndustry?: string;
    touchpoints: string[];
    assetCount: number;
    completeness: 'low' | 'medium' | 'high';
    consistency: 'low' | 'medium' | 'high';
    missingEvidence: string[];
  };
  referenceVisualDNA: Record<string, ReferenceTranslationRule[]>;
  transferability: {
    directlyTransferable: ReferenceTransferabilityItem[];
    requiresReinterpretation: ReferenceTransferabilityItem[];
    prohibitedToCopy: ReferenceTransferabilityItem[];
  };
  sourceRisks: {
    signatureAssets: string[];
    recognizableCombinations: string[];
    similarityWarnings: string[];
  };
  projectTranslationMatrix: ReferenceTranslationMatrixItem[];
}


export interface CurrentProjectProfile {
  schemaVersion: string;
  projectId: string;
  projectName: string;
  brandName: string;
  industry: string;
  coreProducts: string[];
  targetAudience: string[];
  targetAudienceDetails?: AudienceFact[];
  pricePositioning?: string;
  brandPositioning: string;
  usageScenarios: string[];
  businessTouchpoints: string[];
  lockedAssets: string[];
  packagingStructures: string[];
  confirmedFacts: string[];
  sourceArtifactIds: string[];
  currentVisualAssets?: string[];
  existingBrandCopy?: string[];
  visualSources: CurrentProjectVisualSources;
  touchpointInventory: ProjectTouchpointInventory;
}

export type FactSourceType =
  | 'user_input'
  | 'project_metadata'
  | 'document'
  | 'visual_asset'
  | 'locked_config'
  | 'human_confirmation';

export type FactStatus = 'confirmed' | 'inferred' | 'unverified';

export interface FactSource {
  type: FactSourceType;
  sourceId?: string;
  confidence?: number;
}

export interface AudienceFact {
  label: string;
  status: FactStatus;
  sources: FactSource[];
  confidence: number;
}

export interface CurrentProjectVisualSources {
  productForms: string[];
  cookingActions: string[];
  sensorySignals: string[];
  consumptionActions: string[];
  brandNameSemantics: string[];
  spatialObjects: string[];
}

export interface ProjectTouchpointInventory {
  primaryPackaging: string[];
  secondaryPackaging: string[];
  serviceMaterials: string[];
  viApplications: string[];
  spatialTouchpoints: string[];
  digitalTouchpoints: string[];
}

export type ReferenceInheritanceLevel = 'principle' | 'relationship' | 'surface';

export interface ReferenceInheritanceRule {
  level: ReferenceInheritanceLevel;
  weight: number;
  rule: string;
}

export type ExecutionDetailLevel = 'gpt_visual' | 'design_guideline' | 'production_spec';

export interface VisualAnchor {
  name: string;
  sourceElements: string[];
  transformationLogic: string;
  visualForm: string;
  extensionTouchpoints: string[];
  referenceSurfaceSimilarityRisk: 'low' | 'medium' | 'high';
}

export interface FlexibleColorSystem {
  identityColorRole: string;
  backgroundOptions: string[];
  textAndStructureColors: string[];
  accentOptions: string[];
  saturationGuideline: string;
  touchpointVariations: string[];
}

export interface FlexibleCompositionSystem {
  fixedPrinciples: string[];
  allowedVariations: string[];
  seriesConsistencyRules: string[];
  prohibitedLayouts: string[];
}

export interface ReferenceStyleRule {
  rule: string;
  inheritanceLevel?: ReferenceInheritanceLevel;
  evidence: string[];
  designEffect: string;
  confidence: number;
}

export type VisualAnalysisPurpose = 'current_project_audit' | 'reference_style';

export interface ReferenceStyleProfile {
  schemaVersion: string;
  overallTemperament: ReferenceStyleRule[];
  colorSystem: ReferenceStyleRule[];
  compositionSystem: ReferenceStyleRule[];
  graphicLanguage: ReferenceStyleRule[];
  typographySystem: ReferenceStyleRule[];
  materialSystem: ReferenceStyleRule[];
  lightingSystem: ReferenceStyleRule[];
  photographySystem: ReferenceStyleRule[];
  packagingPresentation: ReferenceStyleRule[];
  posterPresentation: ReferenceStyleRule[];
  viExtensionSystem: ReferenceStyleRule[];
  excludedIdentityTerms: string[];
  sourceAssetIds: string[];
  portfolioPresentation?: ReferenceStyleRule[];
}

export interface StyleApplicationPlan {
  retainedProjectIdentity: string[];
  currentVisualElementsToRetain: string[];
  currentVisualElementsToRedesign: string[];
  referenceStyleToApply: Array<{
    referenceRule: string;
    applicationToCurrentProject: string;
    affectedTouchpoints: string[];
  }>;
  projectSpecificReinterpretation: Array<{
    sourceVisualFunction: string;
    projectSpecificSource: string;
    reconstructionRule: string;
  }>;
  touchpointStrategy: Record<string, string[]>;
  prohibitedActions: string[];
}

export interface VisualReconstructionDirection {
  directionName: string;
  coreProposition: string;
  visualAnchor: string;
  visualAnchorDefinition: VisualAnchor;
  executionDetailLevel: ExecutionDetailLevel;
  referenceInheritance: ReferenceInheritanceRule[];
  flexibleColorSystem: FlexibleColorSystem;
  flexibleCompositionSystem: FlexibleCompositionSystem;
  currentProjectIdentityToRetain: string[];
  currentVisualElementsToRedesign: string[];
  compositionSystem: string[];
  graphicSystem: string[];
  colorSystem: string[];
  typographySystem: string[];
  materialSystem: string[];
  lightingSystem: string[];
  photographySystem: string[];
  touchpointRules: {
    packaging: string[];
    poster: string[];
    vi: string[];
    space?: string[];
  };
  prohibitedActions: string[];
}

export type ReconstructionPermission =
  | 'locked'
  | 'retained_by_user'
  | 'replaceable'
  | 'adopt_from_reference'
  | 'reconstruct_from_reference'
  | 'forbidden';

export interface ReferenceFirstPermissionMatrix {
  currentProject: {
    brandName: 'locked';
    logoGraphic: 'locked';
    logoTypography: 'locked';
    industry: 'locked';
    productFacts: 'locked';
    packagingStructures: 'locked';
    confirmedBrandCopy: 'retained_by_user';
    colorSystem: 'replaceable';
    layoutSystem: 'replaceable';
    typographySystem: 'replaceable';
    graphicSystem: 'replaceable';
    materialSystem: 'replaceable';
    photographySystem: 'replaceable';
    lightingSystem: 'replaceable';
    spatialSystem: 'replaceable';
    displaySystem: 'replaceable';
  };
  referenceProject: {
    brandName: 'forbidden';
    logoGraphic: 'forbidden';
    logoTypography: 'forbidden';
    slogan: 'forbidden';
    productNames: 'forbidden';
    signatureSymbols: 'forbidden';
    colorSystem: 'adopt_from_reference';
    layoutSystem: 'adopt_from_reference';
    typographySystem: 'adopt_from_reference';
    materialSystem: 'adopt_from_reference';
    photographySystem: 'adopt_from_reference';
    displaySystem: 'adopt_from_reference';
    graphicSystem: 'reconstruct_from_reference';
  };
}

export interface CurrentProjectVisualPermissions {
  lockedAssets: string[];
  replaceableLegacyVisuals: string[];
  userRetainedAssets: string[];
}

export interface ReferenceIdentityBoundary {
  forbiddenBrandNames: string[];
  forbiddenLogos: string[];
  forbiddenCopy: string[];
  forbiddenProductNames: string[];
  forbiddenSignatureGraphics: string[];
}

export interface AdoptedVisualRule {
  description: string;
  supportingAssetIds: string[];
  priority: 'primary' | 'secondary' | 'optional';
  mustBeVisibleInOutput: boolean;
}

export interface ReferenceFirstAdoption {
  colorSystem: AdoptedVisualRule[];
  layoutSystem: AdoptedVisualRule[];
  typographySystem: AdoptedVisualRule[];
  materialSystem: AdoptedVisualRule[];
  photographySystem: AdoptedVisualRule[];
  displaySystem: AdoptedVisualRule[];
  graphicStructure: AdoptedVisualRule[];
}

export interface SystemAnchor {
  colorRelationship: string;
  layoutGrammar: string;
  typographyHierarchy: string;
  materialLanguage: string;
  crossTouchpointConsistency: string;
  primaryStyleCarrierIds: string[];
}

export interface ProjectGraphicAnchor {
  sourceElements: string[];
  reconstructedForm: string;
  usageRole: 'primary' | 'secondary';
  extensionTouchpoints: string[];
  formDescription?: string;
  role?: 'primary' | 'secondary';
  isClosed?: boolean;
  isBadgeLike?: boolean;
  resemblesReferenceSignatureGraphic?: boolean;
  supportingFactIds?: string[];
}

/** §4.3 Anchor 冲突校验结果。 */
export interface AnchorContradictionValidation {
  projectAnchorRoleConflict: boolean;
  closedOpenConflict: boolean;
  badgeConstraintConflict: boolean;
  signatureSimilarityConflict: boolean;
  conflictingSourceFields: string[];
  passed: boolean;
}

/** §4.1 Reference-First 单一来源 Anchor 模型。 */
export interface ReferenceFirstAnchorModel {
  systemAnchor: SystemAnchor;
  projectGraphicAnchor?: ProjectGraphicAnchor;
  referenceSignatureGraphics: ReferenceSignatureGraphic[];
}

export interface AnchorImageDefinition {
  outputType: GenerationOutputType;
  primaryVisualSubject: string;
  referenceAssetIds: string[];
  forbiddenOutputPatterns: string[];
}

export interface UserReadableAssetReference {
  assetId: string;
  filename: string;
  thumbnailPath?: string;
  role: string;
  styleCarrierStrength?: ConfidenceLevel;
  selectedAs: 'core_pack' | 'master_set' | 'task_primary' | 'task_supporting';
  selectionReason: string;
  confidence: number;
}

export interface TaskReferenceConfidence {
  outputType: GenerationOutputType;
  hasDirectTypeMatch: boolean;
  inferredFromOtherTypes: boolean;
  confidence: number;
  requiresHumanReview: boolean;
  warning?: string;
}

export interface EvidenceBoundFact {
  id?: string;
  key?: string;
  value: string;
  sourceAssetIds: string[];
  sources?: FactEvidenceSource[];
  evidenceAssetIds?: string[];
  evidenceRegions?: Array<{
    assetId: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  classification?: 'identity_fact' | 'product_fact' | 'product_or_service_fact' | 'structure_fact' | 'touchpoint_fact'
    | 'observed_copy' | 'legacy_visual_observation';
  confidence: number;
  status: 'confirmed' | 'inferred' | 'unverified';
  entersGenerationIdentityPack?: boolean;
  influencesGenerationStyle?: boolean;
}

export interface ReferenceFirstGenerationContext {
  currentProjectCorePackId?: string;
  executionBriefId?: string;
  generationIdentityPackId: string;
  generationBriefId: string;
  taskReferenceSubsetId: string;
  approvedAnchorContextId?: string;
  outputType: GenerationOutputType;
  prompt: string;
}

export interface LegacyVisualSuppressionValidation {
  oldColorSystemSuppressed: boolean;
  oldLayoutSuppressed: boolean;
  oldTypographySuppressed: boolean;
  oldGraphicSystemSuppressed: boolean;
  oldPhotographySuppressed: boolean;
  oldMaterialSystemSuppressed: boolean;
}

export interface ReferenceFirstReportValidation {
  hasMinimumIdentityCore: boolean;
  hasReplaceableLegacyVisuals: boolean;
  hasReferenceStyleCarriers: boolean;
  hasPermissionMatrix: boolean;
  hasSystemAnchor: boolean;
  hasProjectGraphicAnchor: boolean;
  hasDefinedAnchorImageType: boolean;
  hasReadableAssetReferences: boolean;
  hasTaskReferenceSubsets: boolean;
  hasGenerationContextInstructions: boolean;
  hasLegacyStyleSuppression: boolean;
  passed: boolean;
  issues: string[];
}

export interface ReferenceFirstStrategy {
  permissionMatrix: ReferenceFirstPermissionMatrix;
  currentProjectVisualPermissions: CurrentProjectVisualPermissions;
  referenceIdentityBoundary: ReferenceIdentityBoundary;
  adoption: ReferenceFirstAdoption;
  systemAnchor: SystemAnchor;
  projectGraphicAnchor: ProjectGraphicAnchor;
  anchorImage: AnchorImageDefinition;
  currentProjectReadableAssets: UserReadableAssetReference[];
  referenceReadableAssets: UserReadableAssetReference[];
  taskReferenceConfidence: TaskReferenceConfidence[];
  evidenceBoundFacts: EvidenceBoundFact[];
  generationContexts: ReferenceFirstGenerationContext[];
  legacyVisualSuppression: LegacyVisualSuppressionValidation;
  reportValidation: ReferenceFirstReportValidation;
  betaClosure: ReferenceFirstBetaClosure;
  schemaVersion: 'reference-first-strategy-v1';
}

export interface AssetFilename {
  originalName: string;
  normalizedName: string;
  displayName: string;
}

export interface StructureOnlyAsset {
  sourceAssetId: string;
  usage: 'structure_only';
  cropRegion?: { x: number; y: number; width: number; height: number };
  maskLegacyVisual?: boolean;
  textualStructureDescription?: string;
}

export interface CurrentProjectAnalysisEvidencePack {
  id: string;
  assetIds: string[];
  purpose: 'analysis_only';
  schemaVersion: 'current-project-analysis-evidence-pack-v1';
}

export interface CurrentProjectGenerationIdentityPack {
  id: string;
  brandName: string;
  identityAssetIds: string[];
  productAssetIds: string[];
  structureOnlyAssets: StructureOnlyAsset[];
  lockedAssetIds: string[];
  retainedCopy: string[];
  assetIds: string[];
  schemaVersion: 'current-project-generation-identity-pack-v1';
}

export interface GenerationIdentityPackValidation {
  hasLogo: boolean;
  hasLogoTypography: boolean;
  hasProductEvidence: boolean;
  hasRequiredStructureEvidence: boolean;
  hasLockedAssets: boolean;
  excludesLegacyPosters: boolean;
  excludesLegacyColorBoards: boolean;
  excludesLegacyGraphicSystems: boolean;
  excludesLegacySpatialStyle: boolean;
  passed: boolean;
  errors: Array<'GENERATION_IDENTITY_PACK_CONTAMINATED' | 'GENERATION_IDENTITY_PACK_INCOMPLETE'>;
}

export interface BrandCopyRecord {
  text: string;
  status: 'observed' | 'replaceable' | 'user_retained' | 'locked';
  evidenceAssetIds: string[];
  sources?: FactEvidenceSource[];
  useInGeneration: boolean;
}

export interface ReferenceGraphicStructure {
  structuralRole: string;
  layoutPosition: string;
  repetitionLogic: string;
  density: string;
  crossTouchpointUsage: string[];
}

export interface ReferenceSignatureGraphic {
  id?: string;
  description: string;
  forbiddenToCopy: boolean;
  evidenceAssetIds: string[];
  semanticFingerprint?: string[];
}

/** §3.4 参考专属图形泄漏校验结果。 */
export interface SignatureGraphicLeakValidation {
  primaryStyleCarrierLeakIds: string[];
  secondaryStyleCarrierLeakIds: string[];
  systemAnchorLeakIds: string[];
  projectGraphicAnchorLeakIds: string[];
  generationBriefLeakIds: string[];
  passed: boolean;
}

export interface GraphicReconstructionOutput {
  reconstructedGraphic: string;
  sourceElements: string[];
  structuralSimilarity: string;
  identitySimilarityRisk: 'low' | 'medium' | 'high';
}

export interface OutputStyleCarrierRequirement {
  outputType: GenerationOutputType;
  requiredPrimaryCarrierIds: string[];
  optionalSecondaryCarrierIds: string[];
}

export interface TouchpointVisualRule {
  outputType: GenerationOutputType;
  primarySubjectType: 'typography' | 'graphic_system' | 'material_system' | 'product' | 'space';
  productPhotographyAllowed: boolean;
  productPhotographyMayDominate: boolean;
}

export interface ReferenceFirstBetaFinalValidation {
  analysisAndGenerationPacksSeparated: boolean;
  generationIdentityPackHasNoLegacyStylePollution: boolean;
  factsHavePreciseEvidence: boolean;
  observedCopyNotAutoRetained: boolean;
  primaryStyleCarrierCountValid: boolean;
  referenceSignatureGraphicsExcluded: boolean;
  projectGraphicAnchorIsNonBadge: boolean;
  taskReferenceMatchTextConsistent: boolean;
  referenceAssetsSupportMultipleRoles: boolean;
  brandAndProductPosterRulesSeparated: boolean;
  auditAndGenerationDocsSeparated: boolean;
  generationBriefWithinLengthLimit: boolean;
  filenamesReadable: boolean;
  passed: boolean;
  errors: string[];
}

export interface ReferenceFirstBetaClosure {
  currentProjectAssetDecisions: Array<{
    assetId: string;
    filename: AssetFilename;
    roles: CurrentProjectAssetRole[];
    includeInAnalysisEvidencePack: boolean;
    includeInGenerationIdentityPack: boolean;
    generationUsage: 'identity' | 'product' | 'structure_only' | 'locked_asset' | 'exclude';
    reason: string;
    confidence: number;
  }>;
  analysisEvidencePack: CurrentProjectAnalysisEvidencePack;
  generationIdentityPack: CurrentProjectGenerationIdentityPack;
  generationIdentityPackValidation: GenerationIdentityPackValidation;
  observedCopy: BrandCopyRecord[];
  legacyVisualObservations: EvidenceBoundFact[];
  referenceGraphicStructures: ReferenceGraphicStructure[];
  referenceSignatureGraphics: ReferenceSignatureGraphic[];
  graphicReconstruction: GraphicReconstructionOutput;
  styleCarrierRanking: StyleCarrier[];
  outputStyleCarrierRequirements: OutputStyleCarrierRequirement[];
  touchpointVisualRules: TouchpointVisualRule[];
  analysisAuditMarkdown: string;
  generationBriefMarkdown: string;
  finalValidation: ReferenceFirstBetaFinalValidation;
}

export interface BetaContentValidation {
  visualAnchorUsesCurrentProjectSources: boolean;
  noGenericTraditionalSymbolStacking: boolean;
  noSurfaceStyleOverCopying: boolean;
  colorRulesAreFlexible: boolean;
  compositionAllowsVariation: boolean;
  noUnnecessaryProductionParameters: boolean;
  packagingAndTouchpointsSeparated: boolean;
  touchpointRulesAreDistinct: boolean;
  directionNameIsSpecific: boolean;
  gptExecutionReady: boolean;
}

export interface ReconstructionQualityValidation extends BetaContentValidation {
  currentProjectContextComplete: boolean;
  lockedAssetsPresent: boolean;
  referenceStyleProfilePresent: boolean;
  noReferenceBrandPollution: boolean;
  noInternalSystemTerms: boolean;
  noMarkdownFragments: boolean;
  styleApplicationIsProjectSpecific: boolean;
  visualDirectionIsExecutable: boolean;
  touchpointRulesPresent: boolean;
  gptExecutionConstraintsPresent: boolean;
  projectProfileClean?: boolean;
  outputNotDuplicated?: boolean;
  visualDirectionSpecific?: boolean;
  passed: boolean;
  issues: string[];
}

export interface ReferenceStyleReconstruction {
  currentProjectProfile: CurrentProjectProfile;
  referenceStyleProfile: ReferenceStyleProfile;
  styleApplicationPlan?: StyleApplicationPlan;
  visualReconstructionDirection: VisualReconstructionDirection;
  assetSelectionProtocol?: AssetSelectionProtocolResult;
  referenceFirstStrategy?: ReferenceFirstStrategy;
  /** §14 生产链路 Generation Readiness 闭环结果，供桌面 UI 展示阻断原因。 */
  generationReadiness?: GenerationReadinessGate;
  /** §ValidationIssue 聚合与 Readiness 单一事实源：所有报告/UI 共用的根因与派生症状。 */
  generationReadinessResult?: GenerationReadinessResult;
  /** §15 Resolved Project Facts 单一来源（审计报告 / Runtime Fact Validator / UI 项目摘要共用）。 */
  resolvedProjectFacts?: ResolvedProjectFacts;
  validation: ReconstructionQualityValidation;
}

/**
 * §统一 ValidationIssue（参考优先 Readiness 域）。
 * 注意：与 model-schema/validation-issues.ts 的 schema 校验用 ValidationIssue 是不同概念，
 * 此处命名为 ReadinessValidationIssue 以避免跨模块同名冲突。
 */
export type ReadinessValidationIssueSeverity = 'warning' | 'error' | 'blocking';

export type ReadinessValidationIssueCategory =
  | 'reference_sanitization'
  | 'task_reference'
  | 'task_style_carrier'
  | 'structure_policy'
  | 'identity_pack'
  | 'runtime_fact'
  | 'anchor'
  | 'cross_artifact'
  | 'brief_compilation'
  | 'readiness';

export interface ReadinessValidationIssue {
  code: string;
  category: ReadinessValidationIssueCategory;
  severity: ReadinessValidationIssueSeverity;
  /** 失败字段路径（JSON 路径或字段名）。 */
  path: string;
  receivedValue?: unknown;
  message: string;
  repairInstruction: string;
  artifactPath?: string;
  sourceValidator: string;
  dependsOnIssueCodes?: string[];
  causedByIssueCodes?: string[];
  autoRepairable: boolean;
  requiresHumanReview: boolean;
}

export interface ReadinessValidatorResult {
  validatorId: string;
  passed: boolean;
  issues: ReadinessValidationIssue[];
}

/** §3 Validator Registry：统一的 Validator 阶段枚举。 */
export type ReferenceFirstValidatorStage =
  | 'reference_sanitization'
  | 'task_reference'
  | 'task_style_carrier'
  | 'structure_policy'
  | 'identity_pack'
  | 'runtime_fact'
  | 'anchor'
  | 'cross_artifact'
  | 'brief_compilation';

/** §3.2 Validator Registry 执行编排产出的完整 ValidatorResult。 */
export interface ReferenceFirstValidatorResult extends ReadinessValidatorResult {
  stage: ReferenceFirstValidatorStage;
  skipped: boolean;
  startedAt: string;
  completedAt: string;
  artifactPaths: string[];
}

/** §7 Validator 执行审计清单（runs/<job-id>/validation/validator-execution-manifest.json）。 */
export interface ValidatorExecutionManifest {
  jobId: string;
  registeredValidatorIds: string[];
  executedValidatorIds: string[];
  skippedValidatorIds: string[];
  failedValidatorIds: string[];
  expectedValidatorCount: number;
  executedValidatorCount: number;
  complete: boolean;
}

/** §15 Resolved Project Facts：单一来源的项目事实。 */
export type ResolvedFactSource =
  | 'user_input'
  | 'project_metadata'
  | 'model_analysis';

export type ResolvedFactStatus = 'confirmed' | 'inferred' | 'unverified';

export interface ResolvedFact<T> {
  value: T;
  source: ResolvedFactSource;
  status: ResolvedFactStatus;
}

/** §15 runs/<job-id>/runtime/resolved-project-facts.json —— 审计报告 / Runtime Fact Validator / Brief / UI 共用。 */
export interface ResolvedProjectFacts {
  brandName?: ResolvedFact<string>;
  industry?: ResolvedFact<string>;
  products?: ResolvedFact<string[]>;
  targetAudience?: ResolvedFact<string[]>;
  positioning?: ResolvedFact<string>;
  resolvedAt: string;
}

export interface ReadinessValidationAggregation {
  allIssues: ReadinessValidationIssue[];
  rootIssues: ReadinessValidationIssue[];
  derivedIssues: ReadinessValidationIssue[];
  warnings: ReadinessValidationIssue[];
  status: 'ready' | 'needs_review' | 'blocked';
}

/** §9 Generation Readiness 单一事实源产物（runs/<job-id>/validation/generation-readiness-result.json）。 */
export interface GenerationReadinessResult {
  jobId: string;
  outputType: GenerationOutputType;
  status: 'ready' | 'needs_review' | 'blocked';
  rootIssues: ReadinessValidationIssue[];
  derivedIssues: ReadinessValidationIssue[];
  warnings: ReadinessValidationIssue[];
  /** §11 Validator 执行完整性（单一事实源必须可见）。 */
  validatorExecution: {
    expected: number;
    executed: number;
    complete: boolean;
  };
  referenceSelectionStatus: 'passed' | 'needs_review' | 'blocked';
  generationContextStatus: 'ready' | 'needs_review' | 'blocked';
  generatedAt: string;
}


// ── Phase 3：参考视觉转换 Anchor 工作流 ──
// 参考风格胶囊 → Anchor Generation Brief → Anchor 人工确认。
// 不再默认生成面向用户的长篇转译矩阵；旧 referenceTranslation 流程保留为开发者模式。

export type AnchorDecision = 'pending' | 'approved' | 'retry' | 'rejected';

export type ReferenceAnchorRunStatus =
  | 'pending'
  | 'preparing'
  | 'analyzing_reference'
  | 'compiling_capsule'
  | 'compiling_brief'
  | 'awaiting_decision'
  | 'completed'
  | 'rejected'
  | 'failed'
  | 'cancelled';

export type ReferenceAnchorStage =
  | '00-load-current-project'
  | '01-reference-analysis'
  | '02-style-capsule'
  | '03-anchor-brief'
  | '04-anchor-decision';

// AnchorAspectRatio / NormalizedProjectFacts 已迁移至 packages/project-contracts。

/** v5.3.1 §4/§5 参考元素三层转译模式。 */
export type ReferenceElementTransferMode = 'mechanism_only' | 'reinterpret' | 'prohibited';

/** v5.3.1 §5 参考机制抽象中间结构：只保留运行方法，表层专属元素进入 prohibitedSurfaceElements。 */
export interface ReferenceMechanismRule {
  id: string;
  category: 'color' | 'layout_typography' | 'graphic_organization' | 'material_photography' | 'extension';
  sourceDescription: string;
  abstractMechanism: string;
  transferMode: ReferenceElementTransferMode;
  prohibitedSurfaceElements: string[];
}

// ReferenceStyleCapsule 已迁移至 packages/project-contracts。

/** §11 Reference Workflow 内部只读合并视图（文档上下文不得覆盖当前项目身份）。 */
export interface ReferenceCurrentProjectContext {
  visual: ProjectVisualContext;
  document?: DocumentVisualContext;
}

export interface ReferenceAnchorWarning {
  code: string;
  message: string;
}

export interface ReferenceAnchorRun {
  id: string;
  projectId: string;
  projectName: string;
  status: ReferenceAnchorRunStatus;
  decision: AnchorDecision;
  decisionNote?: string | null;
  decidedAt?: string | null;
  apiProfileId: string;
  provider: string;
  model: string;
  referenceAssetCount: number;
  referenceAssetNames: string[];
  documentRunId?: string | null;
  preference: string | null;
  avoidance: string[];
  createdAt: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  currentStage?: ReferenceAnchorStage;
  modelCallCount?: number;
  retryCount?: number;
  warnings?: ReferenceAnchorWarning[];
  errorCode?: string | null;
  lastError?: string | null;
  briefFilename?: string | null;
}

export interface StartReferenceAnchorInput {
  currentProjectId: string;
  referenceAssetPaths: string[];
  apiProfileId?: string;
  /** 可选：加载 Phase 2 文档上下文任务的输出。 */
  documentRunId?: string;
  /** 用户希望继承的内容。 */
  preference?: string;
  /** 用户明确不要继承的内容。 */
  avoidance?: string[];
  /** v5.3.1 §10 输出比例（单值）；缺省时使用系统默认 16:9。 */
  aspectRatio?: AnchorAspectRatio;
}

export interface ReferenceAnchorResult {
  run: ReferenceAnchorRun;
  capsule: ReferenceStyleCapsule;
  capsuleMarkdown: string;
  briefMarkdown: string;
}

// ── Phase 4 三大功能轻量整合：Resolved Project Context ──

// ContextConflict / ResolvedProjectContext 已迁移至 packages/project-contracts。

/** §8 视觉项目与文档 Context 的本地关联记录（一个文档 Context 可被多个视觉项目引用）。 */
export interface ProjectDocumentContextLink {
  projectId: string;
  documentContextRunId: string;
  linkedAt: string;
  lastResolvedAt?: string;
}

/** §9 冲突确认输入。 */
export interface ConflictResolutionInput {
  field: string;
  resolution: ContextConflict['resolution'];
  value?: unknown;
}

export interface ReferenceAnchorProgress {
  runId: string;
  projectName: string;
  stage: ReferenceAnchorStage;
  status: ReferenceAnchorRunStatus;
  message: string;
  startedAt: string;
  elapsedMs: number;
  model: string;
}

// ── 生图功能 V1：Desktop 专属输入 / 进度类型 ──

export interface LegacyStartImageGenerationInput {
  projectId: string;
  referenceAnchorRunId: string;
  outputType?: ImageGenerationOutputType;
  apiProfileId?: string;
  size?: string;
  region?: ImageProviderRegion;
}

export type StartImageGenerationInput = {
  sources: ImageGenerationSourceBundle | ImageGenerationSourceBundleV3;
  compileRunId?: string;
  apiProfileId?: string;
  size?: string;
  region?: ImageProviderRegion;
  modelId?: string;
  dryRun?: boolean;
} | LegacyStartImageGenerationInput;

export interface ImageGenerationSourcePreview {
  preset: ImageGenerationSourceBundle['preset'] | GenerationSourcePreset;
  sourcePreset?: GenerationSourcePreset;
  deliverable?: GenerationDeliverable;
  purpose: ImageGenerationPurpose;
  sourcesUsed: { visual: boolean; document: boolean; reference: boolean; resolved: boolean };
  sourcesNotUsed: string[];
  referenceCount: number;
  identityBound: boolean;
  referenceStatus?: string;
  warnings: ImageGenerationWarning[];
  gate: ImageGenerationGateResult;
}

/** §13 重试输入。 */
export interface RetryImageGenerationInput {
  runId: string;
  mode: ImageGenerationRetryMode;
  /** edited_prompt 模式下的新 Prompt。 */
  editedPrompt?: string;
  apiProfileId?: string;
}

/** §16.3 运行事件广播载荷（image-generation:run-updated）。 */
export interface ImageGenerationProgress {
  runId: string;
  projectId: string;
  status: ImageGenerationRunStatus;
  message: string;
  startedAt: string;
  elapsedMs: number;
  providerId: string;
  modelId: string;
  providerTaskId?: string;
}

/** compile 返回：编译产物预览（不提交 Provider）。 */
export interface ImageGenerationCompileResult {
  runId: string;
  compiledPrompt: string;
  promptVersion: number;
  gate: ImageGenerationGateResult;
  providerPayloadPreview: Record<string, unknown>;
  promptSourceMap: Record<string, unknown>;
  sourcePreset?: GenerationSourcePreset;
  deliverable?: GenerationDeliverable;
  deliverablePolicy?: Record<string, unknown>;
  userIntentResolution?: UserIntentResolution;
  referencePlan?: Record<string, unknown>;
  compileFingerprint?: ImageGenerationCompileFingerprint;
}

export interface ModelBenchmarkScoreSet {
  brandAlignment: number;
  visualQuality: number;
  referenceCompliance: number;
  commercialUsability: number;
}

export interface ModelBenchmarkEvaluation {
  mode: 'human';
  runId: string;
  imageId: string;
  scores: ModelBenchmarkScoreSet;
  notes: string;
  evaluatedAt: string;
}

export interface ModelBenchmark {
  schemaVersion: '1.0.0';
  benchmarkId: string;
  projectId: string;
  status: 'ready' | 'running' | 'completed' | 'completed_with_failures';
  frozenInput: {
    visualCanonId: string;
    visualCanonVersion: string;
    promptSnapshotId: string;
    promptFingerprint?: string;
    promptTemplateId?: string;
    promptTemplateVersion?: string;
    prompt: string;
  };
  tasks: Array<{
    apiProfileId: string;
    status: string;
    runId?: string;
    providerId?: string;
    modelId?: string;
    imageId?: string;
  }>;
  evaluations: ModelBenchmarkEvaluation[];
  createdAt: string;
  updatedAt: string;
}

export interface StartModelBenchmarkInput {
  userRequest: string;
  apiProfileIds: string[];
  outputType?: GenerationPromptSnapshot['outputType'];
  dryRun?: boolean;
}

export interface SaveModelBenchmarkEvaluationInput {
  runId: string;
  scores: ModelBenchmarkScoreSet;
  notes?: string;
}

export interface DesktopApi {
  settings: {
    get(): Promise<PublicSettings>;
    save(input: SaveSettingsInput): Promise<PublicSettings>;
    saveProfile(input: SaveApiProfileInput): Promise<PublicSettings>;
    deleteProfile(profileId: string): Promise<PublicSettings>;
    setDefaultProfile(profileId: string): Promise<PublicSettings>;
    setProfileEnabled(profileId: string, enabled: boolean): Promise<PublicSettings>;
    testProfile(input: SaveApiProfileInput): Promise<ConnectionTestResult>;
  };
  projects: {
    list(): Promise<ProjectRecord[]>;
    create(input: CreateProjectInput): Promise<ProjectRecord>;
    get(projectId: string): Promise<ProjectRecord>;
    remove(projectId: string): Promise<void>;
    chooseFiles(kind: 'assets' | 'logo' | 'brief'): Promise<string[]>;
    chooseFolder(): Promise<string[]>;
    importFiles(projectId: string, paths: string[], kind: 'assets' | 'logo' | 'brief'): Promise<ImportResult>;
    scanAssets(projectId: string): Promise<AssetSummary>;
    removeAsset(projectId: string, assetId: string): Promise<AssetSummary>;
    removeBatch(projectId: string, batchId: string): Promise<AssetSummary>;
    clearAssets(projectId: string): Promise<AssetSummary>;
  };
  analysis: {
    start(projectId: string, forceReasoning: boolean, apiProfileId?: string): Promise<AnalysisResult>;
    cancel(projectId: string): Promise<boolean>;
    onProgress(callback: (progress: AnalysisProgress) => void): () => void;
  };
  report: {
    read(projectId: string): Promise<string>;
    rename(projectId: string, filename: string): Promise<ProjectRecord>;
    export(projectId: string): Promise<string | null>;
    openFolder(projectId: string): Promise<void>;
  };
  documentContext: {
    chooseDocuments(): Promise<string[]>;
    inspectDocuments(paths: string[]): Promise<VisualTranslationDocumentSummary[]>;
    listRuns(): Promise<DocumentContextRun[]>;
    getRun(runId: string): Promise<DocumentContextRun>;
    start(paths: string[], profileId: string): Promise<DocumentContextRun>;
    getExtracted(runId: string): Promise<DocumentVisualContext>;
    confirm(runId: string, context: DocumentVisualContext): Promise<DocumentContextRun>;
    compile(runId: string): Promise<DocumentVisualContextResult>;
    resume(runId: string, apiProfileId?: string): Promise<DocumentContextRun>;
    cancel(runId: string): Promise<boolean>;
    remove(runId: string): Promise<void>;
    readBrief(runId: string): Promise<string>;
    export(runId: string): Promise<string | null>;
    adaptLegacyRun(runId: string): Promise<DocumentVisualContext>;
    openFolder(runId: string): Promise<void>;
    onProgress(callback: (progress: DocumentContextProgress) => void): () => void;
  };
  referenceAnchor: {
    chooseReferenceAssets(): Promise<string[]>;
    inspectAssets(paths: string[]): Promise<ReferenceAssetSelection>;
    listRuns(): Promise<ReferenceAnchorRun[]>;
    getRun(runId: string): Promise<ReferenceAnchorRun>;
    start(input: StartReferenceAnchorInput): Promise<ReferenceAnchorResult>;
    getCapsule(runId: string): Promise<ReferenceStyleCapsule>;
    getBrief(runId: string): Promise<string>;
    getCapsuleMarkdown(runId: string): Promise<string>;
    updatePreference(runId: string, preference: string, avoidance: string[]): Promise<ReferenceAnchorResult>;
    retryBrief(runId: string, editedBrief?: string): Promise<ReferenceAnchorResult>;
    setDecision(runId: string, decision: AnchorDecision, note?: string): Promise<ReferenceAnchorRun>;
    adaptLegacyRun(runId: string): Promise<ReferenceStyleCapsule>;
    cancel(runId: string): Promise<boolean>;
    remove(runId: string): Promise<void>;
    export(runId: string): Promise<string | null>;
    openFolder(runId: string): Promise<void>;
    onProgress(callback: (progress: ReferenceAnchorProgress) => void): () => void;
  };
  imageGeneration: {
    /** §16 获取 Provider 能力（用于 UI 展示与 Prompt 编译约束）。 */
    getCapabilities(apiProfileId?: string): Promise<ImageProviderCapabilities>;
    getPresetCapabilities(): Promise<ImageGenerationPresetCapability[]>;
    getSourcePreview(input: StartImageGenerationInput): Promise<ImageGenerationSourcePreview>;
    /** §16 编译 Prompt 并执行三层 Gate（不提交 Provider）。 */
    compile(input: StartImageGenerationInput): Promise<ImageGenerationCompileResult>;
    /** §16 编译 + Gate 通过后提交生图任务。 */
    start(input: StartImageGenerationInput): Promise<ImageGenerationRun>;
    getRun(runId: string): Promise<ImageGenerationRun>;
    listRuns(projectId?: string): Promise<ImageGenerationRunSummary[]>;
    cancel(runId: string): Promise<boolean>;
    /** §13 手动重试，创建新 runId 并保留 parentRunId。 */
    retry(input: RetryImageGenerationInput): Promise<ImageGenerationRun>;
    saveReview(review: ImageGenerationReview): Promise<ImageGenerationRun>;
    openFolder(runId: string): Promise<void>;
    /** 读取已生成图片的 data URL（主进程读盘，渲染层不直接接触本地文件）。 */
    getImageDataUrl(runId: string, imageId: string): Promise<{ mimeType: string; dataUrl: string } | null>;
    /** §16.3 运行状态广播。 */
    onRunUpdated(callback: (progress: ImageGenerationProgress) => void): () => void;
  };
  creativeSession: {
    get(projectId: string): Promise<CreativeSession | null>;
    create(projectId: string): Promise<CreativeSession>;
      getWorkspace(projectId: string): Promise<{
        session: CreativeSession;
        creativeDirection: CreativeDirection | null;
        styleProfile: StyleProfile | null;
      visualCanon: VisualCanon | null;
      runs: ImageGenerationRunSummary[];
    }>;
      read(projectId: string, apiProfileId?: string): Promise<{
        understanding: CreativeUnderstanding;
        direction: CreativeDirection;
        provider: string;
        model: string;
        modelCallCount: number;
        readingModelCallCount: number;
        directionModelCallCount: number;
        outputRoot: string;
    }>;
    generate(projectId: string, input: {
      userRequest: string;
      apiProfileId?: string;
      size?: string;
      dryRun?: boolean;
      outputType?: GenerationPromptSnapshot['outputType'];
    }): Promise<ImageGenerationRun>;
    retrySame(projectId: string, runId: string, apiProfileId?: string): Promise<ImageGenerationRun>;
    regenerateInstruction(projectId: string, runId: string, apiProfileId?: string): Promise<ImageGenerationRun>;
    evaluate(projectId: string, runId: string, input: {
      brandAlignment: { score: number; notes: string };
      visualConsistency: { score: number; notes: string };
      assetUsability: { score: number; notes: string };
      deviationDetection: { severity: 'none' | 'minor' | 'major'; findings: string[] };
    }): Promise<ImageGenerationRun>;
    regenerateFromEvaluation(
      projectId: string,
      runId: string,
      apiProfileId?: string
    ): Promise<ImageGenerationRun>;
    startBenchmark(projectId: string, input: StartModelBenchmarkInput): Promise<ModelBenchmark>;
    listBenchmarks(projectId: string): Promise<ModelBenchmark[]>;
    saveBenchmarkEvaluation(
      projectId: string,
      benchmarkId: string,
      input: SaveModelBenchmarkEvaluationInput
    ): Promise<ModelBenchmark>;
    appendFeedback(projectId: string, content: string): Promise<CreativeSession>;
    getRun(runId: string): Promise<ImageGenerationRun | null>;
    getImageDataUrl(runId: string, imageId: string): Promise<{ mimeType: string; dataUrl: string } | null>;
  };
  creativeProduction: {
    prepare(projectId: string): Promise<{
      session: CreativeSession;
      styleProfile: StyleProfile;
      lockedAssets: CreativeLockedAsset[];
    }>;
      regenerateContext(projectId: string, input: {
        directionBrief: string;
      }): Promise<{
        session: CreativeSession;
        creativeDirection: CreativeDirection;
        styleProfile: StyleProfile;
      lockedAssets: CreativeLockedAsset[];
      invalidated: {
        anchorCandidates: true;
        visualCanon: true;
        generationSeries: true;
      };
    }>;
    quickExtractStyle(projectId: string, referenceAnchorRunId: string): Promise<{
      session: CreativeSession;
      styleProfile: StyleProfile;
      lockedAssets: CreativeLockedAsset[];
      sourceRunId: string;
    }>;
    listLockedAssets(projectId: string): Promise<CreativeLockedAsset[]>;
    listAnchorCandidates(projectId: string): Promise<AnchorCandidate[]>;
    listVisualExplorations(projectId: string): Promise<VisualExploration[]>;
    generateVisualExploration(projectId: string, input: {
      conceptCount?: number;
      apiProfileId?: string;
      dryRun?: boolean;
    }): Promise<VisualExploration>;
    selectVisualConcept(
      projectId: string,
      explorationId: string,
      conceptId: string,
      rationale: string
    ): Promise<VisualExploration>;
    confirmStyleProfile(projectId: string, profileId: string): Promise<StyleProfile>;
    generateAnchor(projectId: string, input: {
      purpose?: string;
      aspectRatio?: '16:9' | '4:5' | '3:4' | '1:1';
      apiProfileId?: string;
      dryRun?: boolean;
    }): Promise<{ candidate: AnchorCandidate; run: ImageGenerationRun }>;
    generateAnchorSet(projectId: string, input: {
      purpose?: string;
      aspectRatio?: '16:9' | '4:5' | '3:4' | '1:1';
      candidateCount?: number;
      apiProfileId?: string;
      dryRun?: boolean;
    }): Promise<{
      candidateSetId: string;
      results: Array<{ candidate: AnchorCandidate; run: ImageGenerationRun }>;
    }>;
    retryAnchor(projectId: string, candidateId: string, input: {
      apiProfileId?: string;
      dryRun?: boolean;
    }): Promise<{ candidate: AnchorCandidate; run: ImageGenerationRun }>;
    reviewAnchor(projectId: string, candidateId: string, input: {
      action: 'accept_primary' | 'minor_adjustment' | 'retry' | 'modify_style_profile' | 'reject';
      feedback: string;
      evaluation: AnchorCandidateEvaluation;
    }): Promise<AnchorCandidate>;
    listStyleProfiles(projectId: string): Promise<StyleProfile[]>;
    listVisualCanons(projectId: string): Promise<VisualCanon[]>;
    buildVisualCanon(projectId: string, input: {
      primaryCandidateId: string;
      primary?: Record<string, unknown>;
      supporting?: Array<{
        candidateId: string;
        type?: string;
        role?: string;
        observations?: unknown;
      }>;
      sharedRules?: string[];
      variationRules?: string[];
    }): Promise<VisualCanon>;
    buildVisualCanonFromExploration(
      projectId: string,
      explorationId: string,
      input: {
        sharedRules?: string[];
        variationRules?: string[];
      }
    ): Promise<VisualCanon>;
    confirmVisualCanon(projectId: string, canonId: string): Promise<VisualCanon>;
    getSeries(projectId: string, seriesId: string): Promise<GenerationSeries | null>;
    listSeries(projectId: string): Promise<GenerationSeries[]>;
    createSeries(projectId: string, input: {
      name: string;
      tasks: Array<{
        taskType: 'canon_candidate' | 'packaging_render' | 'poster' | 'vi_application';
        title: string;
        responsibility: string;
        subject?: string;
        scene?: string;
        composition?: string;
        camera?: string;
        aspectRatio?: '16:9' | '4:5' | '3:4' | '1:1';
        preserve?: string[];
        change?: string[];
        forbidden?: string[];
      }>;
    }): Promise<GenerationSeries>;
    createRevision(projectId: string, seriesId: string, input: {
      parentTaskId: string;
      baseImageId: string;
      mode: 'edit' | 'variant';
      title?: string;
      preserve: string[];
      change: string[];
    }): Promise<GenerationSeries>;
    pauseSeries(projectId: string, seriesId: string): Promise<GenerationSeries>;
    resumeSeries(projectId: string, seriesId: string): Promise<GenerationSeries>;
    cancelSeries(projectId: string, seriesId: string): Promise<GenerationSeries>;
    runSeriesTask(
      projectId: string,
      seriesId: string,
      taskId: string,
      apiProfileId?: string
    ): Promise<GenerationSeries>;
    runSeries(projectId: string, seriesId: string, apiProfileId?: string): Promise<GenerationSeries>;
    listFormalAssets(projectId: string, seriesId: string): Promise<GenerationOutput[]>;
    reviewFormalAsset(
      projectId: string,
      seriesId: string,
      outputId: string,
      input: {
        action: 'accept_formal' | 'reject' | 'promote_supporting_canon';
        humanConfirmed?: boolean;
        note?: string;
        failureReason?: string;
      }
    ): Promise<GenerationOutput>;
    getRunPrompt(runId: string): Promise<string | null>;
    getRunMetadata(projectId: string, runId: string): Promise<{
      outputType: GenerationPromptSnapshot['outputType'];
      promptVersion: string;
      templateId?: GenerationPromptSnapshot['deliverableTemplateId'];
      templateVersion?: string;
    } | null>;
  };
  files: {
    getPathForFile(file: File): string;
  };
  projectContext: {
    get(projectId: string): Promise<ProjectVisualContext>;
    rebuild(projectId: string): Promise<ProjectVisualContext>;
    export(projectId: string): Promise<string | null>;
  };
  visualMemory: {
    get(projectId: string): Promise<VisualMemory | null>;
    compile(projectId: string): Promise<VisualMemory>;
    getReferencePack(projectId: string): Promise<ReferencePack | null>;
    buildReferencePack(projectId: string): Promise<ReferencePack>;
  };
  contextIntegration: {
    linkDocumentContext(projectId: string, runId: string): Promise<ProjectDocumentContextLink>;
    unlinkDocumentContext(projectId: string): Promise<void>;
    getLink(projectId: string): Promise<ProjectDocumentContextLink | null>;
    getVisualStatus(projectId: string): Promise<{ status: 'missing' | 'ready' | 'failed'; schemaVersion?: string | null }>;
    getResolved(projectId: string): Promise<ResolvedProjectContext | null>;
    resolve(projectId: string, userOverrides?: Record<string, unknown>): Promise<ResolvedProjectContext>;
    listConflicts(projectId: string): Promise<ContextConflict[]>;
    applyConflictResolution(projectId: string, resolutions: ConflictResolutionInput[]): Promise<ResolvedProjectContext>;
    migrate(projectId: string): Promise<{ visualContextStatus: string; resolvedGeneratedAt?: string | null }>;
    export(projectId: string): Promise<string | null>;
    /** §8 删除被引用的文档 Context 前检查引用关系。 */
    isDocumentContextReferenced(runId: string): Promise<boolean>;
  };
}

export type EvidenceSourceType =
  | 'visual_asset'
  | 'user_input'
  | 'project_metadata'
  | 'locked_config'
  | 'human_confirmation';

export interface FactEvidenceSource {
  type: EvidenceSourceType;
  sourceId?: string;
  value: string;
  confidence: number;
}

export interface UserLockedAsset {
  assetId: string;
  reason: string;
}

export interface UserRetainedCopy {
  text: string;
  sourceId?: string;
}

export interface ProjectRuntimeContext {
  projectId: string;
  brandName?: string;
  industry?: string;
  productFacts?: string[];
  userLockedAssets: UserLockedAsset[];
  userRetainedCopy: UserRetainedCopy[];
  userConfirmedRealAssets: string[];
  outputTasks: GenerationOutputType[];
  referenceAssetIds: string[];
  projectMetadata: Record<string, unknown>;
}

export interface EvidenceCoverage {
  identity: boolean;
  productOrService: boolean;
  structure: boolean;
  lockedAssets: boolean;
  copy: boolean;
}

export interface AnalysisEvidencePack {
  assetIds: string[];
  evidenceCoverage: EvidenceCoverage;
  uncertainAssetIds: string[];
}

export type StructureStatus =
  | 'locked'
  | 'user_confirmed'
  | 'real_structure_detected'
  | 'open_for_redesign'
  | 'not_applicable';

export interface StructurePolicy {
  domain: 'packaging' | 'product' | 'space' | 'interface' | 'publication' | 'other';
  status: StructureStatus;
  confirmedAssetIds: string[];
  inferredStructureObservations?: string[];
  excludedUnverifiedAssetIds: string[];
  redesignAllowed: boolean;
  requiresHumanConfirmation: boolean;
}

/** §8.4 结构策略校验结果。 */
export interface StructurePolicyValidation {
  inferredStructureEnteredLockedInfo: boolean;
  inferredStructureEnteredIdentityPack: boolean;
  promptStructureStatementMatchesPolicy: boolean;
  passed: boolean;
}

export interface UserStructureDecision {
  domain?: StructurePolicy['domain'];
  locked?: boolean;
  confirmed?: boolean;
  notApplicable?: boolean;
  confirmedAssetIds?: string[];
}

export type GenerationIdentityUsage =
  | 'brand_name'
  | 'logo_graphic'
  | 'logo_wordmark'
  | 'product_or_service_fact'
  | 'confirmed_structure'
  | 'user_locked_asset'
  | 'retained_copy';

export interface GenerationIdentityAsset {
  assetId: string;
  usage: GenerationIdentityUsage;
  reason: string;
  containsLegacyStyle?: boolean;
  confidence?: number;
}

/** §9.2 派生身份资产（Logo 裁切 / 字标裁�� / 独立图形等）。 */
export interface DerivedIdentityAsset {
  id: string;
  sourceAssetId: string;
  usage: GenerationIdentityUsage;
  cropRegion?: { x: number; y: number; width: number; height: number };
  normalizedFilePath?: string;
  containsLegacyStyle: boolean;
  confidence: number;
}

/** §9.4 Identity Pack 粒度校验结果。 */
export interface IdentityPackGranularityValidation {
  fullPageAssetIds: string[];
  broadLockedAssetIds: string[];
  legacyStyleContaminatedAssetIds: string[];
  missingRequiredIdentityUsages: string[];
  passed: boolean;
}

export interface LockedAsset {
  assetId: string;
  reason: string;
}

export interface GenerationIdentityPack {
  identityFacts: EvidenceBoundFact[];
  productOrServiceFacts: EvidenceBoundFact[];
  logoAssets: GenerationIdentityAsset[];
  logoTypographyAssets: GenerationIdentityAsset[];
  confirmedStructureAssets: GenerationIdentityAsset[];
  lockedAssets: LockedAsset[];
  retainedCopy: BrandCopyRecord[];
  structurePolicy: StructurePolicy;
  assets: GenerationIdentityAsset[];
  derivedAssets?: DerivedIdentityAsset[];
}

export interface GenerationTaskDefinition {
  outputType: GenerationOutputType;
  taskPurpose: string;
  primarySubjectTypes: string[];
  requiredObjects: string[];
  optionalObjects: string[];
  /** §3 当前任务必需的 Style Rules（来自 Task-Scoped Primary，视觉规则，不是画面必需对象）。 */
  requiredStyleRules?: string[];
  /** §3 当前任务的辅助 Style Rules（来自 Task-Scoped Secondary）。 */
  supportingStyleRules?: string[];
  compositionRules: string[];
  typographyRules: string[];
  materialRules: string[];
  photographyRules: string[];
  logoUsageRules: string[];
  forbiddenOutputPatterns: string[];
}

/** §7 Generation Context Manifest：两份报告共用同一任务上下文。 */
export interface GenerationContextManifest {
  jobId: string;
  outputType: GenerationOutputType;
  identityPackArtifactId: string;
  generationBriefArtifactId: string;
  taskReferenceSubsetArtifactId: string;
  approvedAnchorArtifactId?: string;
  taskScopedStyleCarrierIds: string[];
  systemAnchorId: string;
  projectGraphicAnchorId?: string;
  structurePolicyId: string;
  validationStatus: 'ready' | 'needs_review' | 'blocked';
}

/** §12 跨报告一致性校验结果。 */
export interface CrossArtifactConsistencyValidation {
  outputTypeMatches: boolean;
  taskSubsetMatches: boolean;
  styleCarrierIdsMatch: boolean;
  systemAnchorMatches: boolean;
  projectGraphicAnchorMatches: boolean;
  structurePolicyMatches: boolean;
  identityPackMatches: boolean;
  taskDefinitionMatches: boolean;
  contradictions: string[];
  passed: boolean;
}

export interface GenerationReadinessGate {
  identityPackReady: boolean;
  identityPackGranularityReady: boolean;
  structurePolicyResolved: boolean;
  referenceSignatureGraphicsIsolated: boolean;
  anchorSingleSourceReady: boolean;
  requestedTaskSubsetReady: boolean;
  taskScopedStyleCarriersReady: boolean;
  generationTaskDefinitionReady: boolean;
  auditBriefConsistencyReady: boolean;
  styleCarriersReady: boolean;
  taskReferenceReady: boolean;
  anchorDefinitionReady: boolean;
  noSignatureGraphicLeak: boolean;
  noUnverifiedAssetLeak: boolean;
  generationBriefReady: boolean;
  optionalAudienceContextAvailable?: boolean;
  status: 'ready' | 'needs_review' | 'blocked';
  blockingReasons: string[];
  warnings?: string[];
}

export type ReferenceFirstProtocolErrorCode =
  | 'GENERATION_IDENTITY_PACK_EMPTY'
  | 'GENERATION_IDENTITY_PACK_MISSING_REQUIRED_IDENTITY'
  | 'UNVERIFIED_ASSET_ENTERED_GENERATION_PACK'
  | 'UNVERIFIED_ASSET_USED_AS_STRUCTURE_EVIDENCE'
  | 'STRUCTURE_STATUS_UNRESOLVED'
  | 'FACT_EVIDENCE_BROADCAST_DETECTED'
  | 'STYLE_CARRIER_PLACEHOLDER_LEAK'
  | 'STYLE_CARRIER_PRIORITY_INVALID'
  | 'REFERENCE_SIGNATURE_GRAPHIC_LEAK'
  | 'TASK_REFERENCE_MATCH_CONTRADICTION'
  | 'GENERATION_BRIEF_MISSING_TASK_DETAILS';

export interface ProtocolHardcodeScanResult {
  projectNames: string[];
  brandNames: string[];
  industryTerms: string[];
  productTerms: string[];
  concreteTouchpointTerms: string[];
  passed: boolean;
}
