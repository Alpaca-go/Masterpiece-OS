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
  | 'SESSION_CREATED'
  | 'CREATIVE_DECISION_COMPLETED'
  | 'STYLE_PROFILE_COMPILING'
  | 'STYLE_PROFILE_CREATED'
  | 'PRIMARY_ANCHOR_READY'
  | 'PRIMARY_ANCHOR_GENERATING'
  | 'PRIMARY_ANCHOR_PENDING_REVIEW'
  | 'PRIMARY_ANCHOR_CONFIRMED'
  | 'CANON_BUILDING'
  | 'VISUAL_CANON_CONFIRMED'
  | 'GENERATION_READY'
  | 'GENERATING'
  | 'REVIEWING_OUTPUTS'
  | 'REVISION_IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

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
  entityType?: 'creative_decision' | 'style_profile' | 'visual_canon' | 'generation_series' | 'decision';
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
  messages: CreativeSessionMessage[];
  generationRunIds: string[];
  lockedAssetIds: string[];
  decisions: CreativeSessionDecision[];
  activeStyleProfileId?: string;
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
