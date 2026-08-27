import type {
  CreativeResearchSession,
  DesignBrief,
  DirectionBoard,
  NegativeSignal,
  PreferenceInsight,
  ReferenceItem,
  ReferenceRegion,
  ReferenceSelection,
  SearchQuery,
  SearchQueryKind,
  WebReferenceItem,
} from './contracts.ts';

export interface CreativeResearchSessionRepository {
  create(session: CreativeResearchSession): Promise<CreativeResearchSession>;
  get(id: string): Promise<CreativeResearchSession | null>;
  save(session: CreativeResearchSession): Promise<CreativeResearchSession>;
  listByProject(projectId: string): Promise<CreativeResearchSession[]>;
}

export interface DesignBriefRepository {
  saveRevision(brief: DesignBrief): Promise<DesignBrief>;
  getActiveRevision(sessionId: string): Promise<DesignBrief | null>;
  listRevisions(sessionId: string): Promise<DesignBrief[]>;
}

export interface SearchHistoryRepository {
  appendQuery(query: SearchQuery): Promise<SearchQuery>;
  recordQueryProgress(sessionId: string, queryId: string, update: {
    status: SearchQuery['status'];
    provider?: string;
    cursor?: string;
    completedAt?: string;
    providerQueryText?: string;
    errorCode?: string;
    errorMessage?: string;
    resultCount?: number;
    providerCalls?: number;
  }): Promise<SearchQuery>;
  listSessionSearchHistory(sessionId: string): Promise<SearchQuery[]>;
}

export interface ReferenceResearchRepository {
  storeReference(reference: ReferenceItem): Promise<ReferenceItem>;
  getReference(sessionId: string, referenceId: string): Promise<ReferenceItem | null>;
  listSessionReferences(sessionId: string): Promise<ReferenceItem[]>;
  saveSelection(selection: ReferenceSelection): Promise<ReferenceSelection>;
  listSelections(sessionId: string): Promise<ReferenceSelection[]>;
  saveRegion(region: ReferenceRegion): Promise<ReferenceRegion>;
  listRegions(sessionId: string): Promise<ReferenceRegion[]>;
  saveNegativeSignal(signal: NegativeSignal): Promise<NegativeSignal>;
  listNegativeSignals(sessionId: string): Promise<NegativeSignal[]>;
}

export interface PreferenceEvidenceRepository {
  saveInsight(insight: PreferenceInsight): Promise<PreferenceInsight>;
  listInsights(sessionId: string): Promise<PreferenceInsight[]>;
  storeDesignerOverride(sessionId: string, insightId: string, designerOverride: string): Promise<PreferenceInsight>;
}

export interface DirectionBoardRepository {
  saveRevision(board: DirectionBoard): Promise<DirectionBoard>;
  getCurrent(sessionId: string): Promise<DirectionBoard | null>;
  listRevisionHistory(sessionId: string): Promise<DirectionBoard[]>;
}

export interface ReferenceSearchExclusions {
  referenceIds?: string[];
  domains?: string[];
  urls?: string[];
}

export interface ReferenceSearchInput {
  sessionId: string;
  queryId: string;
  query: string;
  kind: SearchQueryKind;
  cursor?: string;
  limit?: number;
  exclusions?: ReferenceSearchExclusions;
}

export interface SearchResultPage {
  items: WebReferenceItem[];
  nextCursor?: string;
  provider: string;
  query: string;
  providerQueryText?: string;
  providerCalls?: number;
}

export interface ReferenceSearchGateway {
  search(input: ReferenceSearchInput): Promise<SearchResultPage>;
}

export const CREATIVE_RESEARCH_PORT_NAMES = [
  'CreativeResearchSessionRepository',
  'DesignBriefRepository',
  'SearchHistoryRepository',
  'ReferenceResearchRepository',
  'PreferenceEvidenceRepository',
  'DirectionBoardRepository',
  'ReferenceSearchGateway',
] as const;
