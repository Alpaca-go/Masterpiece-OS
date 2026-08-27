import type {
  AiExplorationReferenceItem,
  CreativeDirectionContext,
  DesignBriefEvidence,
  ReferenceAttribute,
  UserReferenceItem,
  WebReferenceItem,
} from './contracts.ts';

export interface DocumentIntakeMaterial {
  projectId: string;
  sourceDocumentIds: string[];
  evidence: DesignBriefEvidence[];
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
}

export interface AnalysisModelAdapter {
  draftDesignBrief(input: DocumentIntakeMaterial & { designerNotes: string[] }): Promise<DesignBriefDraftMaterial>;
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
  'UserReferenceAdapter',
  'WebReferenceImportAdapter',
  'ExplorationGenerationAdapter',
  'ReferenceFirstHandoffAdapter',
] as const;
