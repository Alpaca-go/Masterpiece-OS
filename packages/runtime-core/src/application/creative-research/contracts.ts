export const CREATIVE_RESEARCH_SESSION_STATUSES = [
  'INTAKE',
  'RESEARCH',
  'DIRECTION',
  'COMPLETED',
] as const;

export type CreativeResearchSessionStatus = typeof CREATIVE_RESEARCH_SESSION_STATUSES[number];

export interface CreativeResearchSession {
  id: string;
  projectId: string;
  status: CreativeResearchSessionStatus;
  sourceDocumentIds: string[];
  activeDesignBriefId?: string;
  activeDirectionBoardId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export type DesignBriefEvidenceLocatorKind = 'DOCUMENT_PAGE' | 'DOCUMENT_SECTION' | 'DOCUMENT_RANGE';

export interface DesignBriefEvidence {
  id: string;
  sourceDocumentId: string;
  normalizedSourceId?: string;
  locator: {
    kind: DesignBriefEvidenceLocatorKind;
    value: string;
  };
  excerpt?: string;
  createdAt: string;
}

export const SEARCH_KEYWORD_KINDS = ['CONCEPT', 'VISUAL', 'CATEGORY'] as const;
export const SEARCH_KEYWORD_SOURCES = ['AI', 'DESIGNER'] as const;

export type SearchKeywordKind = typeof SEARCH_KEYWORD_KINDS[number];
export type SearchKeywordSource = typeof SEARCH_KEYWORD_SOURCES[number];

export interface SearchKeyword {
  id: string;
  briefId: string;
  value: string;
  kind: SearchKeywordKind;
  source: SearchKeywordSource;
  enabled: boolean;
  rationale?: string;
  locale?: string;
  createdAt: string;
}

export interface DesignBrief {
  id: string;
  sessionId: string;
  revision: number;
  projectSummary: string;
  designTask: string;
  audience: string;
  scenarios: string[];
  coreMessages: string[];
  constraints: string[];
  conceptKeywords: string[];
  visualKeywords: string[];
  searchKeywords: SearchKeyword[];
  designerNotes: string[];
  evidence: DesignBriefEvidence[];
  fieldEvidence?: Partial<Record<DesignBriefField, string[]>>;
  warnings?: string[];
  createdAt: string;
  updatedAt: string;
}

export const DESIGN_BRIEF_FIELDS = [
  'projectSummary',
  'designTask',
  'audience',
  'scenarios',
  'coreMessages',
  'constraints',
  'conceptKeywords',
  'visualKeywords',
] as const;

export type DesignBriefField = typeof DESIGN_BRIEF_FIELDS[number];

export const SEARCH_QUERY_KINDS = ['CONCEPT', 'CATEGORY'] as const;
export const SEARCH_QUERY_STATUSES = ['PENDING', 'COMPLETED', 'FAILED'] as const;

export type SearchQueryKind = typeof SEARCH_QUERY_KINDS[number];
export type SearchQueryStatus = typeof SEARCH_QUERY_STATUSES[number];

export interface SearchQuery {
  id: string;
  sessionId: string;
  text: string;
  kind: SearchQueryKind;
  provider?: string;
  batch: string;
  status: SearchQueryStatus;
  cursor?: string;
  derivedFromKeywordIds: string[];
  createdAt: string;
  completedAt?: string;
  errorCode?: string;
  errorMessage?: string;
  resultCount?: number;
  providerCalls?: number;
}

export const REFERENCE_SOURCE_TYPES = [
  'WEB_REFERENCE',
  'USER_REFERENCE',
  'AI_EXPLORATION',
] as const;

export type ReferenceSourceType = typeof REFERENCE_SOURCE_TYPES[number];

export interface ReferenceThumbnail {
  url: string;
  width?: number;
  height?: number;
}

interface ReferenceItemBase {
  id: string;
  sessionId: string;
  sourceType: ReferenceSourceType;
  title?: string;
  thumbnail?: ReferenceThumbnail;
  tags: string[];
  createdAt: string;
}

export interface WebReferenceItem extends ReferenceItemBase {
  sourceType: 'WEB_REFERENCE';
  resourceType: 'IMAGE' | 'WEB';
  sourceUrl: string;
  canonicalUrl: string;
  remoteImageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  provider: string;
  publisherOrDomain: string;
  queryId: string;
  matchedQueryIds?: string[];
  resultRank: number;
  altText?: string;
  licenseOrUsageStatus?: string;
  attribution?: string;
  retrievedAt: string;
  contentHash?: string;
  localAssetId?: string;
}

export interface UserReferenceItem extends ReferenceItemBase {
  sourceType: 'USER_REFERENCE';
  assetId: string;
  originalFilename?: string;
  designerNote?: string;
}

export interface AiExplorationReferenceItem extends ReferenceItemBase {
  sourceType: 'AI_EXPLORATION';
  generationRunId: string;
  inputReferenceIds: string[];
  promptContextId?: string;
  generatedAt: string;
  assetId?: string;
}

export type ReferenceItem = WebReferenceItem | UserReferenceItem | AiExplorationReferenceItem;

export const REFERENCE_SELECTION_STATES = ['NONE', 'SELECTED', 'REJECTED'] as const;
export const REFERENCE_ATTRIBUTES = [
  'TYPOGRAPHY',
  'LAYOUT',
  'COLOR',
  'GRAPHIC',
  'MATERIAL',
  'PHOTOGRAPHY',
  'IMAGE_TREATMENT',
  'APPLICATION',
  'ATMOSPHERE',
] as const;

export type ReferenceSelectionState = typeof REFERENCE_SELECTION_STATES[number];
export type ReferenceAttribute = typeof REFERENCE_ATTRIBUTES[number];
export type DesignerEvidenceActor = 'DESIGNER';

export interface ReferenceSelection {
  referenceId: string;
  state: ReferenceSelectionState;
  selectedAttributes: ReferenceAttribute[];
  designerNote?: string;
  actor: DesignerEvidenceActor;
  createdAt: string;
  updatedAt: string;
}

export interface ReferenceRegion {
  id: string;
  referenceId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  coordinateSpace: 'NORMALIZED_0_1';
  sourceWidth?: number;
  sourceHeight?: number;
  selectedAttributes: ReferenceAttribute[];
  designerNote?: string;
  createdAt: string;
}

export const NEGATIVE_SIGNAL_TYPES = [
  'REJECT_REFERENCE',
  'REMOVE_KEYWORD',
  'DESIGNER_NOTE',
  'REANALYSIS_FEEDBACK',
] as const;
export const NEGATIVE_SIGNAL_SCOPES = ['SESSION', 'REFERENCE', 'KEYWORD', 'DIRECTION'] as const;

export type NegativeSignalType = typeof NEGATIVE_SIGNAL_TYPES[number];
export type NegativeSignalScope = typeof NEGATIVE_SIGNAL_SCOPES[number];

export interface NegativeSignal {
  id: string;
  sessionId: string;
  type: NegativeSignalType;
  value?: string;
  sourceReferenceId?: string;
  sourceKeywordId?: string;
  scope: NegativeSignalScope;
  reason?: string;
  actor: DesignerEvidenceActor;
  createdAt: string;
}

export type PreferenceInsightStatus = 'DRAFT' | 'FINALIZED';

export interface PreferenceInsight {
  id: string;
  sessionId: string;
  category: ReferenceAttribute;
  summary: string;
  status: PreferenceInsightStatus;
  confidence?: number;
  supportingReferenceIds: string[];
  supportingRegionIds: string[];
  supportingNegativeSignalIds: string[];
  designerOverride?: string;
  createdAt: string;
}

export interface DirectionBoard {
  id: string;
  sessionId: string;
  revision: number;
  summary: string;
  visualKeywords: string[];
  typography?: string;
  layout?: string;
  color?: string;
  graphic?: string;
  material?: string;
  photography?: string;
  referenceIds: string[];
  referenceRegionIds: string[];
  negativeSignalIds: string[];
  designerNotes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DirectionContextNegativeSignal {
  id: string;
  type: NegativeSignalType;
  scope: NegativeSignalScope;
  value?: string;
  reason?: string;
}

export interface CreativeDirectionContextProvenance {
  designBriefId: string;
  directionBoardId: string;
  sourceDocumentIds: string[];
  referenceIds: string[];
  referenceRegionIds: string[];
  negativeSignalIds: string[];
}

export interface CreativeDirectionContext {
  sessionId: string;
  projectId: string;
  briefRevision: number;
  directionBoardRevision: number;
  projectBrief: string;
  constraints: string[];
  visualKeywords: string[];
  selectedReferenceIds: string[];
  selectedReferenceRegionIds: string[];
  preferredAttributes: ReferenceAttribute[];
  negativeSignals: DirectionContextNegativeSignal[];
  designerNotes: string[];
  directionSummary: string;
  provenance: CreativeDirectionContextProvenance;
  createdAt: string;
}
