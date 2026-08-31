import type {
  AiExplorationReferenceItem,
  CreativeDirectionContext,
  CreativeResearchClue,
  CreativeResearchTrackKind,
  CreativeResearchTrackPriority,
  DesignBriefEvidence,
  DesignBriefField,
  ReferenceAttribute,
  SearchQueryKind,
  SimilarSearchDimension,
  SearchKeywordKind,
  UserReferenceItem,
  WebReferenceItem,
} from './contracts.ts';

export interface ReferencePreferenceAnalysisInput {
  sessionId: string;
  profileId: string;
  brief: {
    projectSummary: string;
    designTask: string;
    audience: string;
    visualKeywords: string[];
  };
  selectedReferences: Array<{
    id: string;
    resourceType: 'IMAGE' | 'WEB';
    title: string;
    publisher: string;
    selectedAttributes: ReferenceAttribute[];
    designerNote?: string;
    remoteImageUrl?: string;
    localImageDataUrl?: string;
  }>;
  activeNegativeSignals: Array<{
    id: string;
    sourceReferenceId: string;
    reason?: string;
    referenceTitle?: string;
  }>;
}

export interface PreferenceInsightDraftMaterial {
  category: ReferenceAttribute;
  summary: string;
  confidence?: number;
  supportingReferenceIds: string[];
  supportingNegativeSignalIds: string[];
}

export interface ReferencePreferenceAnalysisAdapter {
  analyzePreferences(input: ReferencePreferenceAnalysisInput): Promise<PreferenceInsightDraftMaterial[]>;
}

export interface ReferenceSearchRefinementInput {
  sessionId: string;
  profileId: string;
  mode: 'REFRESH' | 'SIMILAR';
  enabledSearchKeywords: Array<{ id: string; value: string; kind: SearchKeywordKind }>;
  conceptKeywords: string[];
  visualKeywords: string[];
  recentQueries: Array<{ id: string; text: string; providerQueryText?: string; kind: SearchQueryKind; batch: string }>;
  selections: Array<{ referenceId: string; selectedAttributes: ReferenceAttribute[]; designerNote?: string }>;
  activeRejectionReasons: Array<{ sourceReferenceId: string; reason?: string }>;
  preferenceInsights: Array<{ id: string; category: ReferenceAttribute; text: string }>;
  similar?: {
    dimension?: SimilarSearchDimension;
    targetKind: SearchQueryKind;
    reference?: { id: string; title: string; publisher: string; remoteImageUrl?: string; selectedAttributes: ReferenceAttribute[]; designerNote?: string };
    preferenceInsight?: { id: string; category: ReferenceAttribute; text: string; supportingReferenceIds: string[] };
  };
}

export interface SearchRefinementQueryDraft {
  kind: SearchQueryKind;
  text: string;
  derivedFromKeywordIds: string[];
}

export interface ReferenceSearchRefinementAdapter {
  planQueries(input: ReferenceSearchRefinementInput): Promise<SearchRefinementQueryDraft[]>;
}

export interface DocumentIntakeMaterial {
  projectId: string;
  sourceDocumentIds: string[];
  documents?: Array<{
    documentId: string;
    filename: string;
    sourceType: 'pdf' | 'docx' | 'markdown' | 'text';
    title?: string;
    role: string;
    parseWarnings: string[];
  }>;
  evidence: DesignBriefEvidence[];
  warnings?: string[];
}

export interface DocumentIntakeAdapter {
  readEvidence(input: { projectId: string; sourceDocumentIds: string[] }): Promise<DocumentIntakeMaterial>;
}

export interface LinkedProjectBrief {
  projectId: string;
  planningBriefId: string;
  summary: string;
  constraints: string[];
  linkedAt: string;
}

export interface ProjectBriefLinkAdapter {
  readLinkedBrief(projectId: string): Promise<LinkedProjectBrief | null>;
}

export interface DesignBriefDraftMaterial {
  projectSummary: string;
  designTask: string;
  audience: string;
  scenarios: string[];
  coreMessages: string[];
  constraints: string[];
  conceptKeywords: string[];
  visualKeywords: string[];
  evidenceIds: string[];
  fieldEvidence?: Partial<Record<DesignBriefField, string[]>>;
  searchKeywordSuggestions?: Array<{
    value: string;
    kind: SearchKeywordKind;
    rationale?: string;
    locale?: string;
  }>;
  warnings?: string[];
}

export interface AnalysisModelAdapter {
  draftDesignBrief(input: DocumentIntakeMaterial & {
    profileId: string;
    designerNotes: string[];
    linkedProjectBrief?: LinkedProjectBrief | null;
  }): Promise<DesignBriefDraftMaterial>;
}

export interface CreativeResearchPlannerInput {
  sessionId: string;
  profileId: string;
  brief: {
    projectSummary: string;
    designTask: string;
    audience: string;
    conceptKeywords: string[];
    visualKeywords: string[];
    searchKeywords: Array<{ id: string; value: string; kind: SearchKeywordKind; enabled: boolean }>;
  };
  clues: CreativeResearchClue[];
}

export interface LegacyCreativeResearchPlanDraft {
  tracks: Array<{
    title: string;
    summary: string;
    clueValues: string[];
    kind: CreativeResearchTrackKind;
    priority: CreativeResearchTrackPriority;
    firstRoundEligible: boolean;
    rationale: string;
  }>;
  queries: Array<{
    trackTitle: string;
    query: string;
    rationale: string;
    intent: 'KNOWLEDGE' | 'VISUAL';
    locale: 'ZH' | 'EN';
  }>;
}

export interface VisualCreativeResearchPlanDraft {
  visualGroups: Array<{
    kind: 'INDUSTRY' | 'POSITIONING' | 'CROSS_CATEGORY';
    title: string;
    keywords: string[];
    rationale: string;
    priority: number;
  }>;
}

export type CreativeResearchPlanDraft = LegacyCreativeResearchPlanDraft | VisualCreativeResearchPlanDraft;

export interface CreativeResearchPlannerAdapter {
  createPlan(input: CreativeResearchPlannerInput): Promise<CreativeResearchPlanDraft>;
}

export interface DesignBriefReanalysisInput extends DocumentIntakeMaterial {
  sessionId: string;
  profileId: string;
  previousBrief: import('./contracts.ts').DesignBrief;
  recentSearchHistory: Array<{ id: string; text: string; kind: SearchQueryKind; origin: string; status: string }>;
  selections: Array<{ referenceId: string; state: string; selectedAttributes: ReferenceAttribute[]; designerNote?: string }>;
  activeNegativeSignals: Array<{ id: string; type: string; scope: string; reason?: string; value?: string }>;
  preferenceInsights: Array<{ id: string; category: ReferenceAttribute; text: string; status: string }>;
  feedback: string[];
}

export interface DesignBriefReanalysisAdapter {
  reanalyzeDesignBrief(input: DesignBriefReanalysisInput): Promise<DesignBriefDraftMaterial>;
}

export interface UserReferenceAdapter {
  resolveProjectAsset(input: {
    sessionId: string;
    projectId: string;
    assetId: string;
    designerNote?: string;
    createdAt: string;
  }): Promise<UserReferenceItem>;
}

export interface RemoteReferencePayload {
  mediaType: string;
  base64: string;
  contentHash: string;
}

export interface WebReferenceImportAdapter {
  importSelectedReference(input: {
    projectId: string;
    reference: WebReferenceItem;
    payload: RemoteReferencePayload;
  }): Promise<{ assetId: string; contentHash: string; importedAt: string }>;
}

export interface ExplorationGenerationAdapter {
  generateExploration(input: {
    sessionId: string;
    projectId: string;
    inputReferenceIds: string[];
    promptContextId?: string;
    preferredAttributes: ReferenceAttribute[];
  }): Promise<Pick<AiExplorationReferenceItem, 'generationRunId' | 'generatedAt' | 'assetId'>>;
}

export interface ReferenceFirstHandoffAdapter {
  handoff(context: CreativeDirectionContext): Promise<{
    handoffId: string;
    acceptedAt: string;
  }>;
}

export const CREATIVE_RESEARCH_ADAPTER_NAMES = [
  'DocumentIntakeAdapter',
  'ProjectBriefLinkAdapter',
  'AnalysisModelAdapter',
  'CreativeResearchPlannerAdapter',
  'ReferencePreferenceAnalysisAdapter',
  'ReferenceSearchRefinementAdapter',
  'DesignBriefReanalysisAdapter',
  'UserReferenceAdapter',
  'WebReferenceImportAdapter',
  'ExplorationGenerationAdapter',
  'ReferenceFirstHandoffAdapter',
] as const;
