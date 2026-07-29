// @masterpiece/project-contracts
// 正式产品共享契约类型（单一事实来源）。
// ProjectVisualContext / DocumentVisualContext / ReferenceStyleCapsule / ResolvedProjectContext
// 实验（labs）专属类型不得写入本包。

export type CreativeSessionStatus = 'active' | 'archived' | 'failed';

export type CreativeWorkflowState =
  | 'CREATED'
  | 'FILES_IMPORTED'
  | 'ANALYZING'
  | 'ANALYSIS_COMPLETED'
  | 'VISUAL_ANALYSIS_COMPLETED'
  | 'SESSION_CREATED'
  | 'DIRECTION_GENERATING'
  | 'CREATIVE_DIRECTION_GENERATING'
  | 'DIRECTION_READY'
  | 'CREATIVE_DIRECTION_READY'
  | 'BLUEPRINT_GENERATING'
  | 'BLUEPRINT_READY'
  | 'CREATIVE_DECISION_COMPLETED'
  | 'STYLE_PROFILE_COMPILING'
  | 'STYLE_PROFILE_CREATED'
  | 'VISUAL_EXPLORATION_GENERATING'
  | 'VISUAL_EXPLORATION_READY'
  | 'VISUAL_DIRECTION_SELECTED'
  | 'PRIMARY_ANCHOR_READY'
  | 'PRIMARY_ANCHOR_GENERATING'
  | 'PRIMARY_ANCHOR_PENDING_REVIEW'
  | 'PRIMARY_ANCHOR_CONFIRMED'
  | 'CANON_BUILDING'
  | 'VISUAL_CANON_CONFIRMED'
  | 'GENERATION_READY'
  | 'GENERATING'
  | 'IMAGE_GENERATING'
  | 'REVIEWING_OUTPUTS'
  | 'REVISION_IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type VisualConceptType =
  | 'space'
  | 'packaging'
  | 'product_scene'
  | 'graphic'
  | 'material';

export interface VisualExplorationConcept {
  id: string;
  index: number;
  type: VisualConceptType;
  title: string;
  objective: string;
  outputType: 'interior_scene' | 'packaging_render' | 'brand_poster';
  aspectRatio: '16:9' | '4:5' | '1:1';
  status: 'planned' | 'generating' | 'prepared' | 'generated' | 'failed';
  selectionStatus?: 'selected' | 'not_selected';
  generationRunId?: string;
  imagePath?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VisualExploration {
  schemaVersion: '1.0';
  id: string;
  projectId: string;
  creativeDirectionId: string;
  creativeDirectionVersion: string;
  styleProfileId: string;
  styleProfileVersion: string;
  status: 'planned' | 'generating' | 'prepared' | 'ready' | 'partially_ready' | 'selected' | 'failed';
  conceptCount: number;
  concepts: VisualExplorationConcept[];
  selectedConceptId?: string;
  selection?: {
    conceptId: string;
    rationale: string;
    selectedBy: 'designer';
    selectedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreativeSessionDecision {
  id: string;
  type: string;
  summary: string;
  rationale?: string;
  outcome: 'confirmed' | 'rejected' | 'superseded';
  source: 'user' | 'analysis' | 'migration' | 'system';
  createdAt: string;
}

export interface CreativeSessionHistoryEntry {
  id: string;
  event: string;
  fromState?: CreativeWorkflowState;
  toState?: CreativeWorkflowState;
  summary: string;
  entityType?: 'creative_direction' | 'generation_blueprint' | 'creative_decision' | 'style_profile' | 'visual_canon' | 'generation_series' | 'decision';
  entityId?: string;
  version?: string;
  createdAt: string;
}

export interface CreativeUnderstanding {
  schemaVersion: '1.0';
  projectIdentity: {
    brandName?: string;
    industry?: string;
    products?: string[];
  };
  identityLocks: string[];
  valuableAssets: string[];
  currentProblems: string[];
  upgradePrinciples: string[];
  oldPatternsToAvoid: string[];
  creativeFreedom: string[];
  assetReadingSummary: Array<{
    assetId: string;
    summary: string;
    recommendedUsage: 'identity_reference' | 'structure_reference' | 'reading_only' | 'exclude';
  }>;
  generatedAt: string;
}

/**
 * v18.1 Creative Director 的持久化决策实体。
 * 原始视觉仅负责 Reading；本实体只由 Creative Understanding 与视觉分析报告生成。
 */
export interface CreativeDirection {
  schemaVersion: '1.0';
  id: string;
  projectId: string;
  sessionId: string;
  version: string;
  status: 'ready' | 'superseded';
  /** Visual Upgrade Engine v1：品牌由旧方案转向何种商业定位。 */
  brandReposition: string;
  /** Visual Upgrade Engine v1：贯穿所有触点的核心创意概念。 */
  creativeConcept: string;
  /** 新系统所处的感官、空间与叙事世界。 */
  visualWorld: string;
  /** 可跨海报、空间、包装复用的识别机制。 */
  visualMechanism: string;
  keepAssets: string[];
  removeAssets: string[];
  transformAssets: string[];
  projectTransformation: string;
  oldVisualProblems: string[];
  designStrategy: string;
  primaryConcept: string;
  visualKeywords: string[];
  visualDirections: Array<{
    name: string;
    summary: string;
    rationale: string;
    recommended: boolean;
  }>;
  thingsToRemove: string[];
  thingsToKeep: string[];
  colorStrategy: string;
  materialStrategy: string;
  compositionStrategy: string;
  photographyStrategy: string;
  spaceStrategy?: string;
  packagingStrategy?: string;
  posterStrategy?: string;
  generationRules: string[];
  source: {
    understandingGeneratedAt: string;
    reportPath: string;
    runtimeVersion: string;
  };
  generatedAt: string;
}

export interface CreativeDecision {
  schema_version: '1.0';
  project_id: string;
  direction_id: string;
  direction_version: string;
  brand_strategy: string;
  visual_direction: {
    recommended: string;
    rationale: string;
    alternatives: string[];
  };
  keep_assets: string[];
  avoid_assets: string[];
  color_system: string[];
  material_system: string[];
  composition_rule: string[];
  generation_goal: string[];
  generated_at: string;
}

/**
 * Visual Upgrade Engine v1 的图片执行契约。
 * Creative Direction 决定“设计什么”，Blueprint 仅负责“这一张图如何执行”。
 */
export interface GenerationBlueprint {
  schemaVersion: '1.0';
  id: string;
  projectId: string;
  sessionId: string;
  creativeDirectionId: string;
  creativeDirectionVersion: string;
  creativeDirectionSummary: string[];
  creativeDecisionId: string;
  creativeDecisionVersion: string;
  creativeDecisionSummary: string[];
  creativeDecisionSourcePath: 'outputs/creative_decision.json';
  imagePurpose:
    | 'interior_scene'
    | 'storefront_scene'
    | 'packaging_render'
    | 'brand_poster'
    | 'vi_application'
    | 'illustration';
  sceneDescription: string;
  camera: string;
  composition: string;
  materials: string[];
  lighting: string;
  colorDirection: string;
  brandAssetRules: string[];
  avoid: string[];
  compilerVersion: string;
  generatedAt: string;
}

export type VisualMemoryReferenceRole =
  | 'keep_reference'
  | 'style_reference'
  | 'ignore_reference'
  | 'anchor_reference';

export interface VisualMemoryReferenceCandidate {
  asset_id: string;
  source_kind: 'original_asset' | 'generated_anchor';
  source_path: string;
  role: VisualMemoryReferenceRole;
  rationale: string;
  signals: string[];
  score: number;
}

/**
 * Visual Memory Engine v1：分析阶段的全集信息被压缩为生成阶段可执行的视觉记忆。
 * 字段名遵循需求文档，持久化文件固定为 visual-memory.json。
 */
export interface VisualMemory {
  schema_version: '1.0';
  id: string;
  project_id: string;
  brand_core: {
    industry: string;
    positioning: string;
    mood: string[];
    core_temperament: string[];
  };
  locked_assets: Array<{
    locked_asset_id: string;
    type: LockedAssetType;
    name: string;
    rule: string;
    source_asset_id?: string;
  }>;
  visual_dna: {
    colors: string[];
    materials: string[];
    photography: string[];
    composition: string[];
    graphic_language: string[];
  };
  visual_problems: string[];
  visual_opportunities: string[];
  reference_strategy: {
    pack_size: { min: 3; max: 5 };
    provider_reference_limit: 2;
    candidates: VisualMemoryReferenceCandidate[];
  };
  generation_rules: {
    preserve: string[];
    transform: string[];
    avoid: string[];
  };
  source: {
    visual_context_generated_at: string;
    creative_understanding_generated_at: string;
    creative_direction_id: string;
    creative_direction_version: string;
    compiler_version: string;
  };
  generated_at: string;
}

export type ReferencePackRole = 'locked' | 'style' | 'anchor';

export interface ReferencePackItem {
  asset_id: string;
  source_kind: 'original_asset' | 'generated_anchor';
  role: ReferencePackRole;
  source_path: string;
  pack_path: string;
  rationale: string;
  signals: string[];
  score: number;
}

export interface ReferencePack {
  schema_version: '1.0';
  id: string;
  project_id: string;
  visual_memory_id: string;
  selection: {
    input_count: number;
    eligible_count: number;
    selected_count: number;
    target_min: 3;
    target_max: 5;
    status: 'ready' | 'insufficient_eligible_assets';
  };
  items: ReferencePackItem[];
  excluded: Array<{
    asset_id: string;
    source_path: string;
    reason: string;
  }>;
  created_at: string;
}

export interface CreativeSessionMessage {
  messageId: string;
  role: 'system' | 'user' | 'assistant';
  type:
    | 'reading_instruction'
    | 'reading_result'
    | 'generation_request'
    | 'generation_result'
    | 'user_feedback'
    | 'system_event';
  /** 只保存会话文本或摘要；完整 Final Prompt 必须保存在 generation run snapshot。 */
  content: string;
  generationRunId?: string;
  createdAt: string;
}

/** V6 Creative Session 仅保存持续上下文和实体引用，禁止持有最终 Prompt。 */
export interface CreativeSession {
  schemaVersion: '6.0';
  id: string;
  projectId: string;
  status: CreativeSessionStatus;
  workflowState: CreativeWorkflowState;
  projectContext: {
    brandName: string;
    industry: string;
    projectType: string;
    goals: string[];
    constraints: string[];
  };
  inputs: {
    originalAssetIds: string[];
    referenceAssetIds: string[];
    documentIds: string[];
  };
  analysis: {
    brandUnderstandingVersion?: string;
    referenceAnalysisVersion?: string;
    creativeDecisionVersion?: string;
  };
  sourceVisualRunId?: string;
  sourceReportPath?: string;
  understanding?: CreativeUnderstanding;
  activeCreativeDirectionId?: string;
  activeGenerationBlueprintId?: string;
  messages: CreativeSessionMessage[];
  generationRunIds: string[];
  lockedAssetIds: string[];
  decisions: CreativeSessionDecision[];
  activeStyleProfileId?: string;
  activeVisualExplorationId?: string;
  activeVisualCanonId?: string;
  activeSeriesId?: string;
  history: CreativeSessionHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export type LockedAssetType =
  | 'brand_name'
  | 'logo'
  | 'product_category'
  | 'packaging_structure'
  | 'packaging_artwork'
  | 'product_color'
  | 'product_arrangement'
  | 'core_symbol'
  | 'required_visual_element'
  | 'forbidden_reference_content';

export type LockedAssetPriority = 'critical' | 'high' | 'medium' | 'low';

export interface LockedAsset {
  schemaVersion: '6.0';
  id: string;
  projectId: string;
  type: LockedAssetType;
  name: string;
  sourceAssetId?: string;
  /** 项目 input 目录下的相对路径；不得保存工作区外绝对路径。 */
  sourceFile?: string;
  /** 项目内生成的缩略图相对路径。 */
  thumbnail?: string;
  rule: string;
  priority: LockedAssetPriority;
  allowedChanges: string[];
  forbiddenChanges: string[];
  evidence: {
    source: 'project_visual_context' | 'creative_understanding' | 'user_confirmed';
    description: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type AnchorCandidateStatus =
  | 'not_created'
  | 'task_ready'
  | 'generating'
  | 'generation_failed'
  | 'pending_review'
  | 'accepted'
  | 'rejected'
  | 'superseded'
  | 'revision_required';

export type AnchorEvaluationDimension =
  | 'color'
  | 'composition'
  | 'material'
  | 'lighting'
  | 'graphic_language'
  | 'brand_assets'
  | 'overall_tone';

export interface AnchorCandidateEvaluationItem {
  score: 1 | 2 | 3 | 4 | 5;
  notes: string;
}

export interface AnchorCandidateEvaluation {
  color: AnchorCandidateEvaluationItem;
  composition: AnchorCandidateEvaluationItem;
  material: AnchorCandidateEvaluationItem;
  lighting: AnchorCandidateEvaluationItem;
  graphic_language: AnchorCandidateEvaluationItem;
  brand_assets: AnchorCandidateEvaluationItem;
  overall_tone: AnchorCandidateEvaluationItem;
  evaluatedAt: string;
}

export interface AnchorCandidate {
  schemaVersion: '6.0';
  id: string;
  projectId: string;
  status: AnchorCandidateStatus;
  revision: number;
  parentCandidateId?: string;
  candidateSetId?: string;
  candidateIndex?: number;
  candidateCount?: number;
  styleProfileId: string;
  styleProfileVersion: string;
  lockedAssetIds: string[];
  task: {
    type: 'brand_hero';
    purpose: string;
    aspectRatio: '16:9' | '4:5' | '3:4' | '1:1';
    outputCount: 1;
  };
  source?: 'generated' | 'uploaded';
  generationRunId?: string;
  imagePath?: string;
  thumbnailPath?: string;
  generationFailure?: {
    errorCode: string;
    errorMessage: string;
    failedAt: string;
  };
  evaluation?: AnchorCandidateEvaluation;
  reviewHistory: Array<{
    action: 'accept_primary' | 'minor_adjustment' | 'retry' | 'modify_style_profile' | 'reject' | 'supersede';
    feedback: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export type CanonImageType =
  | 'brand_hero'
  | 'packaging'
  | 'poster_graphic'
  | 'vi_application'
  | 'spatial'
  | 'illustration';

export interface VisualCanonConflict {
  dimension: 'color' | 'material' | 'lighting' | 'graphic_language' | 'composition_density' | 'locked_assets';
  severity: 'warning' | 'blocking';
  message: string;
  canonImageIds: string[];
}

export interface VisualCanon {
  schemaVersion: '6.0';
  id: string;
  projectId: string;
  name: string;
  version: string;
  status: 'draft' | 'confirmed' | 'superseded';
  styleProfileId: string;
  styleProfileVersion: string;
  primaryCanonImageId: string;
  sourceExplorationId?: string;
  selectedConceptId?: string;
  canonImages: Array<{
    id: string;
    type: CanonImageType;
    role: string;
    imagePath: string;
    sourceKind: 'anchor' | 'visual_concept';
    sourceAnchorId?: string;
    sourceConceptId?: string;
    sourceExplorationId?: string;
    priority: 'primary' | 'supporting';
    observations: {
      colors: string[];
      materials: string[];
      lighting: string[];
      graphicLanguage: string[];
      compositionDensity?: string;
      spatialStructure?: string;
      displayStrategy?: string;
      preservedLockedAssetIds: string[];
    };
  }>;
  visualDNA: {
    brandKeywords: string[];
    moodAttributes: string[];
    industryAttributes: string[];
    coreVisualMetaphor: string;
  };
  colorSystem: {
    primary: string[];
    secondary: string[];
    accent: string[];
    forbidden: string[];
  };
  materialSystem: {
    materialLanguage: string[];
    surfaceTextures: string[];
    craftRules: string[];
  };
  lightingSystem: {
    direction: string[];
    contrast: string[];
    photographyAtmosphere: string[];
  };
  compositionSystem: {
    compositionMethods: string[];
    gridRules: string[];
    negativeSpaceRules: string[];
  };
  spatialSystem: {
    structureRules: string[];
    displayRules: string[];
    negativeSpaceRules: string[];
  };
  sharedRules: string[];
  variationRules: string[];
  conflicts: VisualCanonConflict[];
  createdAt: string;
  updatedAt: string;
}

export interface FinalGenerationInstruction {
  schemaVersion: '1.0';
  task: string;
  outputResponsibility: string;
  preserve: string[];
  avoid: string[];
  sceneDescription: string;
  composition: string;
  materialAndLighting: string;
  typographyAndGraphicUse: string;
  referenceAssetIds: string[];
  finalPrompt: string;
  generatedAt: string;
}

export interface GenerationPromptSnapshot {
  schemaVersion: '6.0';
  id: string;
  projectId: string;
  sessionId: string;
  requestId: string;
  userRequest: string;
  creativeDirectionId: string;
  creativeDirectionVersion: string;
  generationBlueprintId?: string;
  visualMemoryId?: string;
  referencePackId?: string;
  /** Run Store 自包含快照；重试不得重新读取后来被替换的 active 实体。 */
  creativeDirectionSnapshot?: CreativeDirection;
  generationBlueprint?: GenerationBlueprint;
  visualMemory?: VisualMemory;
  referencePack?: ReferencePack;
  deliverableTemplateId?: 'interior' | 'packaging' | 'poster' | 'product_scene' | 'ip_scene';
  deliverableTemplateVersion?: string;
  deliverableTemplateBlueprint?: Record<string, unknown>;
  templateCompiledPrompt?: string;
  promptVersion?: string;
  promptFingerprint?: string;
  promptSourceMap?: Record<string, unknown>;
  outputType: 'interior_scene' | 'storefront_scene' | 'packaging_render' | 'brand_poster' | 'vi_application' | 'illustration';
  styleProfileId: string;
  styleProfileVersion: string;
  visualCanonId: string;
  visualCanonVersion: string;
  anchorReferencePolicy?: {
    mode: 'visual_rules_only';
    ruleSources: Array<'visual_memory' | 'visual_canon'>;
    providerImageReferenceAllowed: false;
    forbiddenInheritance: Array<
      'logo' | 'brand_text' | 'title_typography' | 'poster_copy' | 'concrete_layout'
    >;
  };
  lockedAssetIds: string[];
  selectedReferences: Array<{
    id: string;
    role: 'identity_reference' | 'structure_reference' | 'core_reference';
    projectRelativePath: string;
  }>;
  instruction: FinalGenerationInstruction;
  negativePrompt: string;
  compilerVersion: string;
  createdAt: string;
}

export type GenerationTaskType = 'canon_candidate' | 'packaging_render' | 'poster' | 'vi_application';
export type GenerationTaskStatus = 'ready' | 'queued' | 'running' | 'paused' | 'succeeded' | 'failed' | 'cancelled';

export interface GenerationTask {
  schemaVersion: '6.0';
  id: string;
  projectId: string;
  seriesId: string;
  taskCode: string;
  taskType: GenerationTaskType;
  title: string;
  responsibility: string;
  subject: string;
  scene: string;
  composition: string;
  camera: string;
  aspectRatio: '16:9' | '4:5' | '3:4' | '1:1';
  outputCount: 1;
  styleProfileId: string;
  styleProfileVersion: string;
  visualCanonId: string;
  visualCanonVersion: string;
  preferredCanonImageTypes: CanonImageType[];
  lockedAssetIds: string[];
  referenceAssetIds: string[];
  preserve: string[];
  change: string[];
  forbidden: string[];
  status: GenerationTaskStatus;
  promptCompilerVersion: string;
  generationRunIds: string[];
  outputIds: string[];
  attemptCount: number;
  mode?: 'original' | 'edit' | 'variant';
  parentTaskId?: string;
  baseImageId?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationOutput {
  schemaVersion: '6.0';
  id: string;
  projectId: string;
  seriesId: string;
  taskId: string;
  generationRunId: string;
  imagePath: string;
  version: number;
  parentOutputId?: string;
  status: 'candidate' | 'formal' | 'rejected' | 'supporting_canon';
  reviewNote?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationSeries {
  schemaVersion: '6.0';
  id: string;
  projectId: string;
  name: string;
  status: 'draft' | 'ready' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  styleProfileId: string;
  styleProfileVersion: string;
  visualCanonId: string;
  visualCanonVersion: string;
  lockedAssetIds: string[];
  promptCompilerVersion: string;
  modelAdapterVersion: string;
  tasks: GenerationTask[];
  createdAt: string;
  updatedAt: string;
}

export interface CreativeDecision {
  schemaVersion: '6.0';
  id: string;
  projectId: string;
  version: string;
  brandCoreJudgment: string[];
  currentVisualProblems: string[];
  retainedAssets: string[];
  reconstructableAssets: string[];
  inheritedReferenceMechanisms: string[];
  prohibitedReferenceContent: string[];
  visualUpgradeThesis: string;
  primaryDirection: {
    name: string;
    summary: string;
    keywords: string[];
    mood: string[];
  };
  styleBoundaries: {
    allowed: string[];
    forbidden: string[];
  };
  outputPriorities: string[];
  risks: string[];
  createdAt: string;
}

export type StyleProfileStatus = 'draft' | 'confirmed' | 'superseded';

export interface StyleProfile {
  schemaVersion: '6.0';
  id: string;
  projectId: string;
  name: string;
  version: string;
  status: StyleProfileStatus;
  styleEssence: {
    summary: string;
    keywords: string[];
    mood: string[];
    visualPositioning: string;
  };
  colorSystem: {
    primary: string[];
    secondary: string[];
    neutral: string[];
    accent: string[];
    distributionRules: string[];
    forbiddenColors: string[];
  };
  shapeLanguage: {
    geometry: string[];
    silhouetteRules: string[];
    proportionRules: string[];
  };
  graphicLanguage: {
    coreMotifs: string[];
    patternRules: string[];
    lineRules: string[];
    illustrationRules: string[];
    layoutRhythm: string[];
  };
  compositionSystem: {
    hierarchy: string[];
    density: string;
    negativeSpace: string;
    focalPointRules: string[];
    cameraRules: string[];
    croppingRules: string[];
  };
  materialAndTexture: {
    materials: string[];
    surfaceRules: string[];
    printFeeling: string[];
    renderingRules: string[];
    forbiddenTextures: string[];
  };
  lightingSystem: {
    type: string;
    contrast: string;
    shadow: string;
    temperature: string;
  };
  typographyCompatibility: string[];
  allowedVariations: string[];
  forbiddenVariations: string[];
  promptComponents: {
    required: string[];
    positive: string[];
    negative: string[];
  };
  source: {
    creativeDecisionId: string;
    creativeDecisionVersion: string;
    compilerVersion: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type PackagingStructureStatus = 'confirmed' | 'legacy_observed' | 'unknown';

export type ProjectVisualContextStatus = 'missing' | 'ready' | 'failed';

export interface ProjectVisualContext {
  schemaVersion: '1.0';
  projectId: string;
  sourceRunId: string;
  generatedAt: string;
  identity: {
    projectName: string;
    brandName: string;
    industry: string;
  };
  confidence: {
    projectName: number;
    brandName: number;
    industry: number;
  };
  lockedAssets: {
    logoLocked: boolean;
    logoAssetIds: string[];
    lockedAssetIds: string[];
    lockedFacts: string[];
  };
  products: {
    coreProducts: string[];
    secondaryProducts: string[];
  };
  currentVisualSystem: {
    existingVisualAssets: string[];
    primaryColors: string[];
    supportingColors: string[];
    graphicAssets: string[];
    typographySignals: string[];
    materialSignals: string[];
    photographySignals: string[];
  };
  packaging: {
    structures: string[];
    status: PackagingStructureStatus;
    evidenceSources: string[];
  };
  businessTouchpoints: {
    packaging: string[];
    viApplications: string[];
    spatial: string[];
    digital: string[];
  };
  evaluation: {
    visualStrengths: string[];
    visualProblems: string[];
    modifiableAssets: string[];
  };
  uncertainties: string[];
  source: {
    reportPath: string;
    runtimeReportPath: string;
    assetCount: number;
    imageCount: number;
    provider: string;
    model: string;
  };
}

/**
 * Execution-only project context for the vNext image-generation pipeline.
 *
 * This is intentionally a sibling of the human-readable analysis report. It
 * may only contain facts from the project record, original assets, structured
 * analysis output, or explicit user decisions. Report markdown is not a valid
 * source.
 */
export interface ProjectVisualContextVNext {
  schemaVersion: '2.0';
  projectId: string;
  version: number;
  generatedAt: string;
  brandCore: {
    name: string;
    industry: string;
    brandRole: string | null;
    audience: string[];
  };
  lockedAssets: {
    logoAssetIds: string[];
    brandNameLocked: boolean;
    confirmedColors: string[];
    packageStructures: string[];
    productAssetIds: string[];
    lockedAssetIds: string[];
    mustPreserve: string[];
  };
  visualIdentity: {
    tone: string[];
    colorBehavior: string[];
    graphicBehavior: string[];
    materialBehavior: string[];
    compositionBehavior: string[];
    lightingBehavior: string[];
  };
  styleBoundaries: {
    mustAvoid: string[];
    uncertainItems: string[];
  };
  confirmedDecisions: Array<{
    id: string;
    value: string;
    source: 'project_record' | 'structured_analysis' | 'user_confirmation';
    confirmedAt?: string;
  }>;
  sourceAssetRefs: Array<{
    assetId: string;
    name: string;
    relativePath: string;
    role: 'logo' | 'product' | 'package_structure' | 'visual_reference' | 'source';
  }>;
  provenance: {
    builderId: string;
    builderVersion: string;
    sourceKinds: Array<'project_record' | 'original_asset' | 'structured_analysis' | 'user_confirmation'>;
    structuredAnalysisRunId?: string;
    sourceFingerprint: string;
  };
  /**
   * Project-specific generation evidence. This is additive so persisted 2.0
   * contexts remain readable and can be upgraded without reading a report.
   */
  promptSourceObject?: PromptSourceObject;
}

export type PromptSourceLogoUsageMode = 'reference' | 'blank_area' | 'post_composite';

export interface PromptSourceToneBoundary {
  target: string;
  avoid: string[];
}

export interface PromptSourceVisualTransformation {
  sourceAsset: string;
  abstractProperties: string[];
  newExpression: string[];
  forbiddenLiteralUse: string[];
}

export interface PromptSourceColorUsage {
  name: string;
  ratio?: number;
  role: string;
}

export interface PromptSourceColorBehavior {
  primary: PromptSourceColorUsage[];
  secondary: PromptSourceColorUsage[];
  accent: PromptSourceColorUsage[];
  forbidden: string[];
}

export interface PromptSourceMaterialBehavior {
  material: string;
  behavior: string[];
  brandRole: string;
  forbidden: string[];
}

export interface PromptSourceLightingBehavior {
  source: string[];
  contrast: string;
  interactionWithMaterials: string[];
  forbidden: string[];
}

/**
 * Project-level source object consumed by the image Prompt Compiler.
 *
 * The current generation task intentionally lives outside this structure:
 * binding one shot/subtype here would make later tasks inherit stale intent.
 */
export interface PromptSourceObject {
  schemaVersion: '1.0';
  projectId: string;
  generatedAt: string;
  projectFacts: {
    brandName: string;
    industry: string;
    brandRole: string;
    businessModel: string | null;
    primaryOfferings: string[];
  };
  lockedAssets: {
    logoAssetIds: string[];
    preferredLogoAssetId: string | null;
    logoUsageMode: PromptSourceLogoUsageMode;
    confirmedColors: string[];
    mustPreserve: string[];
    immutableStructures: string[];
  };
  sourceVisualState: {
    valuableAssets: string[];
    overusedElements: string[];
    outdatedExpressions: string[];
    genericIndustryCliches: string[];
    brandMisreadRisks: string[];
  };
  upgradeTranslation: {
    preserve: string[];
    weaken: string[];
    remove: string[];
    targetWorldview: string[];
    toneBoundaries: PromptSourceToneBoundary[];
    transformations: PromptSourceVisualTransformation[];
  };
  renderLanguage: {
    colorBehavior: PromptSourceColorBehavior;
    materialBehavior: PromptSourceMaterialBehavior[];
    lightingBehavior: PromptSourceLightingBehavior;
    graphicBehavior: string[];
  };
  negativeRules: {
    project: string[];
    model: string[];
  };
  confidence: {
    projectFacts: number;
    lockedAssets: number;
    sourceVisualState: number;
    upgradeTranslation: number;
  };
  provenance: {
    sourceKinds: Array<'project_record' | 'original_asset' | 'structured_analysis' | 'user_confirmation' | 'legacy_migration'>;
    structuredAnalysisRunId?: string;
    sourceFingerprint: string;
  };
}

export interface DocumentVisualContextEvidence {
  field: string;
  documentId: string;
  filename: string;
  section?: string;
  page?: number;
  summary: string;
}

export interface DocumentVisualContext {
  schemaVersion: '1.0';
  sourceRunId: string;
  generatedAt: string;

  brandName: string;
  industry: string;

  products: string[];
  services: string[];
  targetAudience: string[];

  pricePositioning: string | null;
  businessModel: string | null;

  brandPersonality: string[];
  visualPreferences: string[];

  requiredTouchpoints: string[];
  lockedFacts: string[];
  prohibitedDirections: string[];

  unknownFields: string[];

  evidence: DocumentVisualContextEvidence[];

  sourceDocuments: Array<{
    documentId: string;
    filename: string;
    sourceType: 'pdf' | 'docx' | 'markdown' | 'text';
    title?: string;
    characterCount: number;
    pageCount?: number;
  }>;
}

export interface ReferenceAssetSelectionItem {
  sourcePath: string;
  name: string;
  extension: string;
  sizeBytes: number;
  fingerprint: string;
  thumbnailDataUrl?: string;
}

export interface ReferenceAssetSelection {
  items: ReferenceAssetSelectionItem[];
  skipped: string[];
  duplicateCount: number;
}

/** §10 Anchor 输出比例（单值，不得输出「3:4 或 1:1」这类不确定表述）。 */
export type AnchorAspectRatio = '16:9' | '4:5' | '3:4' | '1:1';

/** v5.3.1 §3 当前项目事实分类：核心产品与业务触点、设计建议严格分离。 */
export interface NormalizedProjectFacts {
  coreProducts: string[];
  services: string[];
  touchpoints: {
    packaging: string[];
    viApplications: string[];
    serviceMaterials: string[];
    spatial: string[];
    digital: string[];
  };
  designAdvice: string[];
  uncertainties: string[];
}

/** §7 参考风格胶囊：每类规则最多 3–5 条，禁止输出几十条碎片规则。 */
export interface ReferenceStyleCapsule {
  schemaVersion: '1.0';
  sourceRunId: string;
  currentProjectId: string;
  generatedAt: string;

  currentProject: {
    brandName: string;
    industry: string;
    logoLocked: boolean;
    logoAssetIds: string[];
    lockedFacts: string[];
    coreProducts: string[];
    businessTouchpoints: string[];
  };

  /** v5.3.1 §3 分类后的当前项目事实（核心产品 / 触点 / 设计建议分离）。 */
  projectFacts: NormalizedProjectFacts;

  inheritedStyle: {
    color: string[];
    layoutAndTypography: string[];
    graphicLanguage: string[];
    materialAndPhotography: string[];
    extensionMechanism: string[];
  };

  userPreference: string | null;
  userAvoidance: string[];

  prohibitedReferenceIdentity: {
    brandNames: string[];
    logos: string[];
    slogans: string[];
    signatureGraphics: string[];
    proprietaryPatterns: string[];
  };

  anchorGoal: string;
  /** v5.3.1 §10 输出比例单值。 */
  aspectRatio: AnchorAspectRatio;
  /** v5.3.1 §7 人工注意事项（Warning Compiler 汇总，存在风险时不得为空）。 */
  humanNotes: string[];
  uncertainties: string[];
}

/** §3 / §9 上下文合并冲突记录。所有冲突可追溯；§4.3 字段冲突 resolution=unresolved 时阻断参考视觉转换。 */
export interface ContextConflict {
  field: string;
  visualValue: unknown;
  documentValue: unknown;
  resolution: 'visual_wins' | 'document_wins' | 'user_confirmed' | 'unresolved';
  note?: string;
}

/** §3 Resolved Project Context：视觉事实主源 + 文档业务补充的只读合并结果。 */
export interface ResolvedProjectContext {
  schemaVersion: '1.0';
  projectId: string;
  generatedAt: string;
  identity: {
    projectName: string;
    brandName: string;
    industry: string;
  };
  lockedAssets: {
    logoLocked: boolean;
    logoAssetIds: string[];
    lockedFacts: string[];
  };
  products: string[];
  services: string[];
  targetAudience: string[];
  pricePositioning: string | null;
  businessModel: string | null;
  brandPersonality: string[];
  visualPreferences: string[];
  currentVisualSystem: ProjectVisualContext['currentVisualSystem'];
  packaging: ProjectVisualContext['packaging'];
  businessTouchpoints: ProjectVisualContext['businessTouchpoints'];
  prohibitedDirections: string[];
  uncertainties: string[];
  conflicts: ContextConflict[];
  sourceVersions: {
    projectVisualContext?: string;
    documentVisualContext?: string;
    resolverVersion: string;
  };
  /** §10 缓存失效指纹：合并时所依赖的视觉/文档上下文生成时间，用于判断 Resolved Context 是否过期。 */
  sourceFingerprint?: {
    visualGeneratedAt?: string;
    documentGeneratedAt?: string;
  };
}
