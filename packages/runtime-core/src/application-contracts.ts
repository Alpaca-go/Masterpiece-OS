// Provider is user-defined metadata. The Runtime accepts any OpenAI-compatible
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
} from '@masterpiece/project-contracts/index.ts';
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
} from '@masterpiece/project-contracts/index.ts';

export type ProviderKind = string;
export type ApiProtocol =
  | 'openai-chat-multimodal'
  | 'dashscope-wan-image'
  | 'openai-image-generation'
  | 'google-gemini-image'
  | 'seedream-image'
  | 'openai-video-generation';
export type ModelType = 'analysis' | 'image_generation' | 'video_generation';
export interface ProviderCredentials {
  profileId: string;
  provider: ProviderKind;
  protocol?: ApiProtocol;
  modelType?: ModelType;
  baseUrl: string;
  model: string;
  apiKey: string;
}
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
export type ImageGenerationPipelineMode = 'legacy' | 'vnext';
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
  | 'repairing-decisions'
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
  imageGenerationPipelineMode?: ImageGenerationPipelineMode;
  connectionStatus: 'untested' | 'connected' | 'failed';
}

export interface SaveSettingsInput {
  defaultDataPath: string;
  cacheEnabled: boolean;
  logLevel: 'error' | 'info' | 'debug';
  directionGenerationMode?: DirectionGenerationMode;
  analysisPipelineMode?: AnalysisPipelineMode;
  imageGenerationPipelineMode?: ImageGenerationPipelineMode;
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
  usage?: 'analysis_source' | 'generation_reference';
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
 * 搂2 鍙傝€冭韩浠芥薄鏌撶被鍨嬨€備换涓€闈?'none' 鐨勭被鍨嬮兘涓嶅緱杩涘叆 Style Carrier Ranking銆?
 * 鐢熶骇鍗忚淇濇寔椤圭洰鏃犲叧锛氭薄鏌撶敱鏁版嵁鏍囨敞椹卞姩锛屼笉寰楅潬鍏蜂綋鍝佺墝/琛屼笟璇嶇‖缂栫爜銆?
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

/** 搂2 杩涘叆 Ranking 鍓嶇殑 Style Carrier 鍊欓€夛紙鎼哄甫姹℃煋鏍囨敞锛夈€?*/
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
    /** 搂2 璇ヨ鍒欐惡甯︾殑鍙傝€冭韩浠芥薄鏌撶被鍨嬶紱浠讳竴闈?'none' 鑰呬笉寰楄繘鍏?Ranking銆?*/
    contaminationTypes?: ReferenceContaminationType[];
    /** 搂2 璇ヨ鍒欏叧鑱旂殑绂佹澶嶅埗鍙傝€冧笓灞炲浘褰?id锛涢潪绌鸿€呬笉寰楄繘鍏?Ranking銆?*/
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
  /** 鏄惁鎼哄甫鍙傝€冧笓灞炶韩浠斤紙鍙傝€冭韩浠姐€佹枃妗堛€佷笓灞炲浘褰級銆備竴鏃︿负 true 涓嶅緱杩涘叆浠讳綍 Style Carrier Ranking銆?*/
  containsReferenceIdentity?: boolean;
  /** 鍏宠仈鍒扮殑绂佹澶嶅埗鍙傝€冧笓灞炲浘褰?id 鍒楄〃銆備竴鏃﹂潪绌轰笉寰楄繘鍏?Ranking銆?*/
  referencesSignatureGraphicIds?: string[];
  /** 搂2 璇ヨ浇浣撴惡甯︾殑鍙傝€冭韩浠芥薄鏌撶被鍨嬶紙鍝佺墝鍚?/ Logo / 鏂囨绛夛級銆備换涓€闈?'none' 鑰呬笉寰楄繘鍏?Ranking銆?*/
  contaminationTypes?: ReferenceContaminationType[];
  /** 璇ヨ浇浣撳彲搴旂敤鐨勮緭鍑轰换鍔＄被鍨嬨€備负绌鸿〃绀烘湭澹版槑锛堟寜鍏ㄥ眬澶勭悊锛夈€?*/
  compatibleOutputTypes?: GenerationOutputType[];
  /** 搂3 璇ヨ浇浣撴槸鍚﹁姹傜湡瀹炴憚褰辫〃鐜帮紙鎽勫奖绫昏浇浣撲笉寰楄繘鍏ョ姝㈡憚褰辩殑浠诲姟锛夈€?*/
  requiresPhotography?: boolean;
  /** 搂3 璇ヨ浇浣撴槸鍚﹁姹傜┖闂?鍦烘櫙琛ㄧ幇銆?*/
  requiresSpace?: boolean;
  /** 搂3 璇ヨ浇浣撴槸鍚﹁姹傚姩鏁堣〃鐜般€?*/
  requiresMotion?: boolean;
  /** 搂3 璇ヨ浇浣撴槸鍚﹁姹傜湡瀹炲疄浣撹Е鐐癸紙鏉愯川/鍖呰绛夛級銆?*/
  requiresPhysicalTouchpoint?: boolean;
}

/** 搂3 缂栬瘧浠诲姟绾?Style Carrier 鏃剁殑浠诲姟绾︽潫绉嶅瓙锛堝喅瀹氭憚褰?绌洪棿/鍔ㄦ晥鏄惁鍏佽锛夈€?*/
export interface TaskDefinitionSeed {
  outputType?: GenerationOutputType;
  photographyAllowed?: boolean;
  spatialSceneAllowed?: boolean;
  motionAllowed?: boolean;
  physicalObjectAllowed?: boolean;
  typographyRequired?: boolean;
}

/** 鍏ㄥ眬 Style Carrier Ranking锛堜袱绾э細primary / secondary / optional锛夈€?*/
export interface GlobalStyleCarrierRanking {
  primary: StyleCarrier[];
  secondary: StyleCarrier[];
  optional: StyleCarrier[];
}

/** 鎸夊崟涓緭鍑轰换鍔＄瓫閫夊悗鐨?Style Carrier 闆嗗悎銆?*/
export interface TaskScopedStyleCarrierSet {
  outputType: GenerationOutputType;
  requiredPrimary: StyleCarrier[];
  supportingSecondary: StyleCarrier[];
  excludedForTask: Array<{ carrierId: string; reason: string }>;
}

/** Style Carrier 涓庤緭鍑轰换鍔＄殑鍏煎鎬ф弿杩般€?*/
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
  /** 鐪熷疄鐢熸垚鐨勫瓙闆嗕骇鐗╄矾寰勩€傜姝㈢敤鍥哄畾璺緞浼€狅紱鏈敓鎴愬垯涓虹┖銆?*/
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

/** 搂6.1 鍗曚釜璇锋眰鐨勭敓鎴愪换鍔°€?*/
export interface RequestedGenerationTask {
  outputType: GenerationOutputType;
  requestedBy: 'user' | 'system' | 'workflow';
  required: boolean;
}

/** 搂6.1 璇锋眰浠诲姟娓呭崟銆?*/
export interface RequestedGenerationTaskManifest {
  tasks: RequestedGenerationTask[];
}

/** 搂6.2 Task Subset 瀹屾暣鎬ф竻鍗曘€?*/
export interface TaskReferenceSubsetManifest {
  subsets: TaskReferenceSubset[];
}

/** 搂5.5 浠诲姟绾?Style Carrier 鏍￠獙缁撴灉銆?*/
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
  /** 搂3.4 鍙傝€冧笓灞炲浘褰㈡硠婕忔牎楠屻€?*/
  signatureGraphicLeakValidation?: SignatureGraphicLeakValidation;
  /** 搂5.5 浠诲姟绾?Style Carrier 鏍￠獙锛堟寜璇锋眰浠诲姟锛夈€?*/
  taskStyleCarrierValidations?: TaskStyleCarrierValidation[];
  /** 搂7 Generation Context Manifest锛氬璁℃姤鍛婁笌 Brief 鍏辩敤銆?*/
  generationContextManifest?: GenerationContextManifest;
  /** 搂6 璇锋眰浠诲姟娓呭崟锛堢敤浜庡瓙闆嗚鐩栨牎楠岋級銆?*/
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
  visualContextVNextFilename?: string | null;
  visualContextVNextStatus?: 'missing' | 'ready' | 'failed';
  visualContextVNextVersion?: number | null;
  visualContextVNextLastBuiltAt?: string | null;
}

// 鈹€鈹€ 鍏变韩濂戠害绫诲瀷宸茶縼绉昏嚦 packages/project-contracts锛坮epository-slimming-v2 Phase 1锛夆攢鈹€
export type {
  PackagingStructureStatus,
  ProjectVisualContextStatus,
  ProjectVisualContext,
  ProjectVisualContextShortChain,
  DocumentVisualContextEvidence,
  DocumentVisualContext,
  ReferenceAssetSelectionItem,
  ReferenceAssetSelection,
  AnchorAspectRatio,
  NormalizedProjectFacts,
  ReferenceStyleCapsule,
  ContextConflict,
  ResolvedProjectContext
} from '@masterpiece/project-contracts/index.ts';
import type {
  ProjectVisualContext,
  ProjectVisualContextShortChain,
  DocumentVisualContext,
  DocumentVisualContextEvidence,
  ReferenceAssetSelection,
  ReferenceAssetSelectionItem,
  AnchorAspectRatio,
  NormalizedProjectFacts,
  ReferenceStyleCapsule,
  ContextConflict,
  ResolvedProjectContext
} from '@masterpiece/project-contracts/index.ts';

// 鈹€鈹€ 鐢熷浘鍔熻兘 V1 濂戠害绫诲瀷宸茶縼绉昏嚦 packages/image-generation-contracts锛堢敓鍥?V1 Phase 1锛夆攢鈹€
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
  ImageGenerationRunSummary,
  ShortChainTaskContract,
  ShortChainLogoUsageMode,
  ShortChainShotSource,
  ShortChainReferenceSceneRelation,
  ShortChainAdapterCapability,
  ShortChainAdapterReferenceCapability,
  ShortChainAdapterStrengthControlCapability,
  ShortChainCompiledPrompt,
  ShortChainModelPromptPayload,
  ShortChainCreativeSession,
  ShortChainProjectPromptAsset,
  ShortChainConfirmedGeneratedOutput,
  ShortChainDeliverableValidation,
  ShortChainGenerationFlowState,
  ShortChainValidatedGenerationImageRef,
  ShortChainValidatedGenerationResult,
  ShortChainSimilarityAuditResult,
  ShortChainSimilarityAuditScores,
  ShortChainSimilarityAuditPassFlags
} from '@masterpiece/image-generation-contracts/index.ts';
import type {
  ImageGenerationRun,
  ImageGenerationRunSummary,
  ShortChainTaskContract,
  ShortChainCompiledPrompt,
  ShortChainShotSource,
  ShortChainReferenceSceneRelation,
  ShortChainAdapterCapability,
  ShortChainAdapterReferenceCapability,
  ShortChainAdapterStrengthControlCapability,
  ShortChainModelPromptPayload,
  ShortChainCreativeSession,
  ShortChainConfirmedGeneratedOutput,
  ShortChainProjectPromptAsset,
  ShortChainDeliverableValidation,
  ShortChainValidatedGenerationResult,
  ShortChainSimilarityAuditResult,
  ShortChainSimilarityAuditScores,
  ShortChainSimilarityAuditPassFlags,
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
} from '@masterpiece/image-generation-contracts/index.ts';

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
  usage: NonNullable<ProjectAsset['usage']>;
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
  duplicates: Array<{ id: string; name: string }>;
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
  provider: string;
  requestInterface:
    | 'chat_completions'
    | 'image_generation'
    | 'image_generation_native_probe'
    | 'video_generation';
  httpStatus?: number;
  upstreamErrorCode?: string;
  upstreamErrorMessage?: string;
  requestId?: string;
  responseBody?: string;
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


// 鈹€鈹€ Document Context Extraction锛圥hase 2锛氭枃妗ｅ垎鏋愪笂涓嬫枃鎻愬彇鍣級鈹€鈹€
// 榛樿娴佺▼锛氭枃妗ｈВ鏋?鈫?瑙嗚鐩稿叧浜嬪疄鎻愬彇锛? 娆℃ā鍨嬭皟鐢?+ 鏈€澶?1 娆?Repair锛?
// 鈫?纭畾鎬у綊涓€鍖?鈫?浜哄伐纭 鈫?鏈湴绠€鎶ョ紪璇戙€傞粯璁や笉鑱旂綉鍋?Benchmark銆?
// 涓嶇敓鎴愪笁涓柟鍚戙€佷笉鑷姩鎺ㄨ崘銆佷笉鐢熸垚鎶€鏈璁°€?

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

// DocumentVisualContextEvidence / DocumentVisualContext 宸茶縼绉昏嚦 packages/project-contracts銆?

// 闈為樆鏂鍛婏紙DOCUMENT_ROLE_UNKNOWN / TARGET_AUDIENCE_UNKNOWN / ...锛?
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

// 鈹€鈹€ Reference-Led Visual Direction锛圧eference Translation Profile锛夆攢鈹€
// 绂荤嚎纭畾鎬у紩鎿庯細浠庡弬鑰冮」鐩瑙夊垎鏋愪腑鎻愬彇鍙縼绉绘満鍒讹紝
// 鍦ㄤ笉澶嶅埗绛惧悕璧勪骇鐨勫墠鎻愪笅鏄犲皠鍒板綋鍓嶉」鐩€傞浂妯″瀷璋冪敤銆?

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

/** 搂4.3 Anchor 鍐茬獊鏍￠獙缁撴灉銆?*/
export interface AnchorContradictionValidation {
  projectAnchorRoleConflict: boolean;
  closedOpenConflict: boolean;
  badgeConstraintConflict: boolean;
  signatureSimilarityConflict: boolean;
  conflictingSourceFields: string[];
  passed: boolean;
}

/** 搂4.1 Reference-First 鍗曚竴鏉ユ簮 Anchor 妯″瀷銆?*/
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

/** 搂3.4 鍙傝€冧笓灞炲浘褰㈡硠婕忔牎楠岀粨鏋溿€?*/
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
  /** 搂14 鐢熶骇閾捐矾 Generation Readiness 闂幆缁撴灉锛屼緵妗岄潰 UI 灞曠ず闃绘柇鍘熷洜銆?*/
  generationReadiness?: GenerationReadinessGate;
  /** 搂ValidationIssue 鑱氬悎涓?Readiness 鍗曚竴浜嬪疄婧愶細鎵€鏈夋姤鍛?UI 鍏辩敤鐨勬牴鍥犱笌娲剧敓鐥囩姸銆?*/
  generationReadinessResult?: GenerationReadinessResult;
  /** 搂15 Resolved Project Facts 鍗曚竴鏉ユ簮锛堝璁℃姤鍛?/ Runtime Fact Validator / UI 椤圭洰鎽樿鍏辩敤锛夈€?*/
  resolvedProjectFacts?: ResolvedProjectFacts;
  validation: ReconstructionQualityValidation;
}

/**
 * 搂缁熶竴 ValidationIssue锛堝弬鑰冧紭鍏?Readiness 鍩燂級銆?
 * 娉ㄦ剰锛氫笌 model-schema/validation-issues.ts 鐨?schema 鏍￠獙鐢?ValidationIssue 鏄笉鍚屾蹇碉紝
 * 姝ゅ鍛藉悕涓?ReadinessValidationIssue 浠ラ伩鍏嶈法妯″潡鍚屽悕鍐茬獊銆?
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
  /** 澶辫触瀛楁璺緞锛圝SON 璺緞鎴栧瓧娈靛悕锛夈€?*/
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

/** 搂3 Validator Registry锛氱粺涓€鐨?Validator 闃舵鏋氫妇銆?*/
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

/** 搂3.2 Validator Registry 鎵ц缂栨帓浜у嚭鐨勫畬鏁?ValidatorResult銆?*/
export interface ReferenceFirstValidatorResult extends ReadinessValidatorResult {
  stage: ReferenceFirstValidatorStage;
  skipped: boolean;
  startedAt: string;
  completedAt: string;
  artifactPaths: string[];
}

/** 搂7 Validator 鎵ц瀹¤娓呭崟锛坮uns/<job-id>/validation/validator-execution-manifest.json锛夈€?*/
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

/** 搂15 Resolved Project Facts锛氬崟涓€鏉ユ簮鐨勯」鐩簨瀹炪€?*/
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

/** 搂15 runs/<job-id>/runtime/resolved-project-facts.json 鈥斺€?瀹¤鎶ュ憡 / Runtime Fact Validator / Brief / UI 鍏辩敤銆?*/
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

/** 搂9 Generation Readiness 鍗曚竴浜嬪疄婧愪骇鐗╋紙runs/<job-id>/validation/generation-readiness-result.json锛夈€?*/
export interface GenerationReadinessResult {
  jobId: string;
  outputType: GenerationOutputType;
  status: 'ready' | 'needs_review' | 'blocked';
  rootIssues: ReadinessValidationIssue[];
  derivedIssues: ReadinessValidationIssue[];
  warnings: ReadinessValidationIssue[];
  /** 搂11 Validator 鎵ц瀹屾暣鎬э紙鍗曚竴浜嬪疄婧愬繀椤诲彲瑙侊級銆?*/
  validatorExecution: {
    expected: number;
    executed: number;
    complete: boolean;
  };
  referenceSelectionStatus: 'passed' | 'needs_review' | 'blocked';
  generationContextStatus: 'ready' | 'needs_review' | 'blocked';
  generatedAt: string;
}


// 鈹€鈹€ Phase 3锛氬弬鑰冭瑙夎浆鎹?Anchor 宸ヤ綔娴?鈹€鈹€
// 鍙傝€冮鏍艰兌鍥?鈫?Anchor Generation Brief 鈫?Anchor 浜哄伐纭銆?
// 涓嶅啀榛樿鐢熸垚闈㈠悜鐢ㄦ埛鐨勯暱绡囪浆璇戠煩闃碉紱鏃?referenceTranslation 娴佺▼淇濈暀涓哄紑鍙戣€呮ā寮忋€?

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

// AnchorAspectRatio / NormalizedProjectFacts 宸茶縼绉昏嚦 packages/project-contracts銆?

/** v5.3.1 搂4/搂5 鍙傝€冨厓绱犱笁灞傝浆璇戞ā寮忋€?*/
export type ReferenceElementTransferMode = 'mechanism_only' | 'reinterpret' | 'prohibited';

/** v5.3.1 搂5 鍙傝€冩満鍒舵娊璞′腑闂寸粨鏋勶細鍙繚鐣欒繍琛屾柟娉曪紝琛ㄥ眰涓撳睘鍏冪礌杩涘叆 prohibitedSurfaceElements銆?*/
export interface ReferenceMechanismRule {
  id: string;
  category: 'color' | 'layout_typography' | 'graphic_organization' | 'material_photography' | 'extension';
  sourceDescription: string;
  abstractMechanism: string;
  transferMode: ReferenceElementTransferMode;
  prohibitedSurfaceElements: string[];
}

// ReferenceStyleCapsule 宸茶縼绉昏嚦 packages/project-contracts銆?

/** 搂11 Reference Workflow 鍐呴儴鍙鍚堝苟瑙嗗浘锛堟枃妗ｄ笂涓嬫枃涓嶅緱瑕嗙洊褰撳墠椤圭洰韬唤锛夈€?*/
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
  /** 鍙€夛細鍔犺浇 Phase 2 鏂囨。涓婁笅鏂囦换鍔＄殑杈撳嚭銆?*/
  documentRunId?: string;
  /** 鐢ㄦ埛甯屾湜缁ф壙鐨勫唴瀹广€?*/
  preference?: string;
  /** 鐢ㄦ埛鏄庣‘涓嶈缁ф壙鐨勫唴瀹广€?*/
  avoidance?: string[];
  /** v5.3.1 搂10 杈撳嚭姣斾緥锛堝崟鍊硷級锛涚己鐪佹椂浣跨敤绯荤粺榛樿 16:9銆?*/
  aspectRatio?: AnchorAspectRatio;
}

export interface ReferenceAnchorResult {
  run: ReferenceAnchorRun;
  capsule: ReferenceStyleCapsule;
  capsuleMarkdown: string;
  briefMarkdown: string;
}

// 鈹€鈹€ Phase 4 涓夊ぇ鍔熻兘杞婚噺鏁村悎锛歊esolved Project Context 鈹€鈹€

// ContextConflict / ResolvedProjectContext 宸茶縼绉昏嚦 packages/project-contracts銆?

/** 搂8 瑙嗚椤圭洰涓庢枃妗?Context 鐨勬湰鍦板叧鑱旇褰曪紙涓€涓枃妗?Context 鍙澶氫釜瑙嗚椤圭洰寮曠敤锛夈€?*/
export interface ProjectDocumentContextLink {
  projectId: string;
  documentContextRunId: string;
  linkedAt: string;
  lastResolvedAt?: string;
}

/** 搂9 鍐茬獊纭杈撳叆銆?*/
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

// 鈹€鈹€ 鐢熷浘鍔熻兘 V1锛欴esktop 涓撳睘杈撳叆 / 杩涘害绫诲瀷 鈹€鈹€

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

/** 搂13 閲嶈瘯杈撳叆銆?*/
export interface RetryImageGenerationInput {
  runId: string;
  mode: ImageGenerationRetryMode;
  /** edited_prompt 妯″紡涓嬬殑鏂?Prompt銆?*/
  editedPrompt?: string;
  apiProfileId?: string;
}

/** 搂16.3 杩愯浜嬩欢骞挎挱杞借嵎锛坕mage-generation:run-updated锛夈€?*/
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

/** compile 杩斿洖锛氱紪璇戜骇鐗╅瑙堬紙涓嶆彁浜?Provider锛夈€?*/
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

export interface CompileShortChainGenerationInput {
  projectId: string;
  model?: string;
  task: Omit<ShortChainTaskContract, 'schemaVersion' | 'taskId' | 'projectId' | 'createdAt'> & {
    taskId?: string;
  };
}

// r2.0 §4.11 / Phase C-3: UI preflight types. The renderer passes a project
// + a set of asset IDs the user is considering as references; the main
// process runs the resolver and returns a per-ID status. The renderer
// surfaces failures as a badge + disables the "use as reference" action.
//
// The status union mirrors ReferenceResolutionResult but is plain
// serialisable JSON (no class instances / functions) so it can pass
// through the Web RPC structured-clone-compatible transport without loss.
export type ReferenceResolutionFailureCode =
  | 'REFERENCE_ASSET_NOT_FOUND'
  | 'REFERENCE_ASSET_NOT_READY'
  | 'REFERENCE_ASSET_FORMAT_UNSUPPORTED'
  | 'REFERENCE_ASSET_PATH_INVALID'
  | 'REFERENCE_ASSET_FILE_UNREADABLE'
  | 'REFERENCE_ASSET_FILE_TOO_LARGE'
  | 'REFERENCE_ASSET_SHA_MISMATCH';

export interface PreflightResolvedRecord {
  assetId: string;
  role: string;
  relativePath: string;
  absolutePath: string;
  mime: string;
  sizeBytes: number;
  sha256: string;
}

export interface PreflightFailureRecord {
  assetId: string;
  code: ReferenceResolutionFailureCode;
  message: string;
  relativePath?: string;
  declaredMime?: string;
  mime?: string;
  sizeBytes?: number;
  declaredSha256?: string;
  actualSha256?: string;
}

export type PreflightReferenceAssetsResultEntry =
  | { status: 'resolved'; assetId: string; record: PreflightResolvedRecord }
  | { status: 'failed'; assetId: string; failure: PreflightFailureRecord };

export interface PreflightReferenceAssetsInput {
  projectId: string;
  assetIds: string[];
}

export interface CompileShortChainGenerationResult {
  taskContract: ShortChainTaskContract;
  compiledPrompt: ShortChainCompiledPrompt;
  payload: ShortChainModelPromptPayload;
  artifactDirectory: string;
}

export interface StartShortChainGenerationInput {
  projectId: string;
  taskId: string;
  apiProfileId?: string;
  editedPrompt?: string;
  dryRun?: boolean;
}

export interface StartValidatedShortChainGenerationInput extends StartShortChainGenerationInput {
  validatorProfileId?: string;
}

export interface PostCompositeShortChainLogoInput {
  projectId: string;
  runId: string;
  imageId: string;
  logoAssetId: string;
  confirmedByUser: true;
  sourceCrop: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  placement: {
    x: number;
    y: number;
    width: number;
  };
  removeBackground?: {
    enabled: boolean;
    tolerance?: number;
  };
}

export interface SaveShortChainProjectPromptAssetInput {
  projectId: string;
  deliverableFamily: ShortChainTaskContract['deliverableFamily'];
  name: string;
  promptFragments: string[];
  negativeConstraints?: string[];
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
  evaluationLoop?: {
    schemaVersion: '1.0.0';
    trace: {
      projectId: string;
      benchmarkId: string;
      visualCanonId: string;
      visualCanonVersion: string;
      promptSnapshotId: string;
      generationRunId: string;
      imageId: string;
    };
  };
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

export interface RuntimeApi {
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
    chooseFiles(kind: 'assets' | 'logo' | 'brief' | 'reference'): Promise<string[]>;
    chooseFolder(): Promise<string[]>;
    importFiles(projectId: string, paths: string[], kind: 'assets' | 'logo' | 'brief' | 'reference'): Promise<ImportResult>;
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
    /** 搂16 鑾峰彇 Provider 鑳藉姏锛堢敤浜?UI 灞曠ず涓?Prompt 缂栬瘧绾︽潫锛夈€?*/
    getCapabilities(apiProfileId?: string): Promise<ImageProviderCapabilities>;
    getPresetCapabilities(): Promise<ImageGenerationPresetCapability[]>;
    getSourcePreview(input: StartImageGenerationInput): Promise<ImageGenerationSourcePreview>;
    /** 搂16 缂栬瘧 Prompt 骞舵墽琛屼笁灞?Gate锛堜笉鎻愪氦 Provider锛夈€?*/
    compile(input: StartImageGenerationInput): Promise<ImageGenerationCompileResult>;
    compileShortChain(input: CompileShortChainGenerationInput): Promise<CompileShortChainGenerationResult>;
    /**
     * r2.0 §4.11 / Phase C-3: UI preflight for reference assets. Runs the
     * same resolver as start(), but in a fail-soft mode that returns a
     * per-ID result map. The renderer uses this to badge assets and to
     * disable the "use as reference" action for failed ones.
     */
    preflightReferenceAssets(
      input: PreflightReferenceAssetsInput
    ): Promise<{ projectId: string; results: PreflightReferenceAssetsResultEntry[] }>;
    getShortChainOptions(): Promise<Record<string, { subtypes: string[]; shots: string[] }>>;
    startShortChain(input: StartShortChainGenerationInput): Promise<ImageGenerationRun>;
    startValidatedShortChain(
      input: StartValidatedShortChainGenerationInput
    ): Promise<ShortChainValidatedGenerationResult>;
    getShortChainSession(projectId: string): Promise<ShortChainCreativeSession>;
    confirmShortChainDirection(projectId: string, runId: string, imageId: string): Promise<ShortChainCreativeSession>;
    confirmShortChainGeneratedOutput(
      projectId: string,
      runId: string,
      imageId: string
    ): Promise<ShortChainConfirmedGeneratedOutput>;
    revokeShortChainGeneratedOutput(
      projectId: string,
      assetId: string
    ): Promise<ShortChainConfirmedGeneratedOutput>;
    getShortChainConfirmedGeneratedOutputs(
      projectId: string
    ): Promise<Record<string, ShortChainConfirmedGeneratedOutput>>;
    continueShortChainSameType(
      projectId: string,
      currentInstruction: string,
      apiProfileId?: string,
      dryRun?: boolean
    ): Promise<ImageGenerationRun>;
    saveShortChainProjectPromptAsset(
      input: SaveShortChainProjectPromptAssetInput
    ): Promise<ShortChainProjectPromptAsset>;
    postCompositeShortChainLogo(
      input: PostCompositeShortChainLogoInput
    ): Promise<Record<string, unknown>>;
    /** 搂16 缂栬瘧 + Gate 閫氳繃鍚庢彁浜ょ敓鍥句换鍔°€?*/
    start(input: StartImageGenerationInput): Promise<ImageGenerationRun>;
    getRun(runId: string): Promise<ImageGenerationRun>;
    listRuns(projectId?: string): Promise<ImageGenerationRunSummary[]>;
    cancel(runId: string): Promise<boolean>;
    /** 搂13 鎵嬪姩閲嶈瘯锛屽垱寤烘柊 runId 骞朵繚鐣?parentRunId銆?*/
    retry(input: RetryImageGenerationInput): Promise<ImageGenerationRun>;
    saveReview(review: ImageGenerationReview): Promise<ImageGenerationRun>;
    openFolder(runId: string): Promise<void>;
    /** 璇诲彇宸茬敓鎴愬浘鐗囩殑 data URL锛堜富杩涚▼璇荤洏锛屾覆鏌撳眰涓嶇洿鎺ユ帴瑙︽湰鍦版枃浠讹級銆?*/
    getImageDataUrl(runId: string, imageId: string): Promise<{ mimeType: string; dataUrl: string } | null>;
    /** 搂16.3 杩愯鐘舵€佸箍鎾€?*/
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
    getShortChain(projectId: string): Promise<ProjectVisualContextShortChain>;
    rebuildShortChain(projectId: string): Promise<ProjectVisualContextShortChain>;
    /**
     * r2.0 / r10.4 UX: unified predicate that decides whether the
     * *persisted* project state has the minimum data needed to start
     * a vnext image generation. The full LLM analysis report is no
     * longer a hard product gate for entering image generation; the
     * Project Context is. `reasons` is empty when ready; when not
     * ready, it lists every missing field so the UI can surface a
     * precise "what's blocking" message instead of forcing a fresh
     * analysis blind.
     */
    getGenerationReadiness(projectId: string): Promise<GenerationContextReadiness>;
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
    /** 搂8 鍒犻櫎琚紩鐢ㄧ殑鏂囨。 Context 鍓嶆鏌ュ紩鐢ㄥ叧绯汇€?*/
    isDocumentContextReferenced(runId: string): Promise<boolean>;
  };
}

// r2.0 / r10.4 UX: shape returned by `projectContext.getGenerationReadiness`.
// The renderer asks this on the project page to decide whether to show
// the "继续创作 / 直接创作" entry that bypasses the analysis report
// page. `ready=true` means the persisted Project + Visual Context
// satisfy every precondition `vnext-service.compile` checks on the
// way in (legacy visual context ready + schema present + vnext context
// ready + filename recorded + on-disk file readable + passes the
// `validateProjectVisualContext` shape check). `reasons` is empty
// when ready; when not ready, every entry names one missing condition
// in human-readable form so the UI can show a precise "what's
// blocking" message.
export interface GenerationContextReadiness {
  ready: boolean;
  reasons: string[];
  vnextSchemaVersion: number | null;
  vnextBuiltAt: string | null;
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

/** 搂8.4 缁撴瀯绛栫暐鏍￠獙缁撴灉銆?*/
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

/** 搂9.2 娲剧敓韬唤璧勪骇锛圠ogo 瑁佸垏 / 瀛楁爣瑁侊拷锟?/ 鐙珛鍥惧舰绛夛級銆?*/
export interface DerivedIdentityAsset {
  id: string;
  sourceAssetId: string;
  usage: GenerationIdentityUsage;
  cropRegion?: { x: number; y: number; width: number; height: number };
  normalizedFilePath?: string;
  containsLegacyStyle: boolean;
  confidence: number;
}

/** 搂9.4 Identity Pack 绮掑害鏍￠獙缁撴灉銆?*/
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
  /** 搂3 褰撳墠浠诲姟蹇呴渶鐨?Style Rules锛堟潵鑷?Task-Scoped Primary锛岃瑙夎鍒欙紝涓嶆槸鐢婚潰蹇呴渶瀵硅薄锛夈€?*/
  requiredStyleRules?: string[];
  /** 搂3 褰撳墠浠诲姟鐨勮緟鍔?Style Rules锛堟潵鑷?Task-Scoped Secondary锛夈€?*/
  supportingStyleRules?: string[];
  compositionRules: string[];
  typographyRules: string[];
  materialRules: string[];
  photographyRules: string[];
  logoUsageRules: string[];
  forbiddenOutputPatterns: string[];
}

/** 搂7 Generation Context Manifest锛氫袱浠芥姤鍛婂叡鐢ㄥ悓涓€浠诲姟涓婁笅鏂囥€?*/
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

/** 搂12 璺ㄦ姤鍛婁竴鑷存€ф牎楠岀粨鏋溿€?*/
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

