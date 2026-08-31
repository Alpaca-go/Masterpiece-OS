export type SharedFactAuthority = 'PROJECT_RECORD' | 'AUTHORITATIVE_DOCUMENT' | 'USER_CONFIRMED';

export interface SharedProjectFact {
  key: 'projectName' | 'brandName' | 'industry' | 'description' | 'lockedFact';
  value: string;
  authority: SharedFactAuthority;
  evidence: string[];
}

export interface SharedProjectContext {
  schemaVersion: 'shared-project-context-v0.1';
  projectId: string;
  revision: number;
  facts: SharedProjectFact[];
  confirmedByUser: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreativeDirectionSessionStatus =
  | 'CONTEXT_REVIEW'
  | 'IN_PROGRESS'
  | 'DRAFT_READY'
  | 'FINALIZED'
  | 'COMPILING_PRODUCTION'
  | 'PRODUCTION_READY'
  | 'PRODUCTION_FAILED';

export interface CreativeDirectionSession {
  schemaVersion: 'creative-direction-session-v0.1';
  id: string;
  projectId: string;
  projectName: string;
  sourceDocumentCount: number;
  sourceDocumentLabels: string[];
  contextRevision: number;
  strategyRunId: string | null;
  visualResearchSessionId: string | null;
  status: CreativeDirectionSessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreativeDirectionLane {
  kind: 'STRATEGY' | 'VISUAL_RESEARCH';
  linkedId: string | null;
  state: 'EMPTY' | 'IN_PROGRESS' | 'READY' | 'BLOCKED';
  summary: string;
}

export interface CreativeDirectionSourceCoverage {
  strategy: 'NOT_LINKED' | 'NOT_READY' | 'USED';
  visualResearch: 'NOT_LINKED' | 'NOT_READY' | 'USED';
  contextRevision: number;
}

export interface StrategyContribution {
  sourceRunId: string;
  sourceRevision?: number;
  sourceFingerprint?: string;
  directionTitle?: string;
  proposition?: string;
  strategicIntent: string[];
  opportunityStatements: string[];
  audienceNeeds: string[];
  brandPrinciples: string[];
  decisionRationales: string[];
  warnings: string[];
}

export interface VisualContribution {
  sourceSessionId: string;
  sourceRevision?: number;
  sourceFingerprint?: string;
  directionTitle?: string;
  directionSummary?: string;
  visualKeywords: string[];
  visualPrinciples: string[];
  visualTensions: string[];
  negativeSignals: string[];
  selectedReferenceSignals: string[];
  warnings: string[];
}

export interface CreativeDirectionSourceFingerprint {
  contextRevision: number;
  strategy?: {
    runId: string;
    revision?: number;
    fingerprint?: string;
  };
  visualResearch?: {
    sessionId: string;
    revision?: number;
    fingerprint?: string;
  };
  digest: string;
}

export interface FinalCreativeDirection {
  schemaVersion: 'final-creative-direction-v0.2';
  id: string;
  sessionId: string;
  revision: number;
  status: 'DRAFT' | 'FINALIZED';
  stale: boolean;
  title: string;
  proposition: string;
  strategicPrinciples: string[];
  visualPrinciples: string[];
  negativeConstraints: string[];
  risks: string[];
  conflictResolutions: string[];
  rationale: string[];
  evidence: string[];
  sourceCoverage: CreativeDirectionSourceCoverage;
  sourceFingerprint: CreativeDirectionSourceFingerprint;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string;
}

export type CreativeDirectionProductionHandoffStatus = 'PENDING' | 'COMPILING' | 'READY' | 'FAILED' | 'STALE';

export interface CreativeDirectionProductionHandoff {
  schemaVersion: 'creative-direction-production-handoff-v0.1';
  sessionId: string;
  finalDirectionId: string;
  finalDirectionRevision: number;
  projectId: string;
  status: CreativeDirectionProductionHandoffStatus;
  pendingReason?: 'VISUAL_RESEARCH_REQUIRED' | 'PRODUCTION_COMPILER_UNAVAILABLE';
  visualCanonId?: string;
  anchorContractId?: string;
  spaceTranslationId?: string;
  packagingTranslationId?: string;
  sourceFingerprint: CreativeDirectionSourceFingerprint;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreativeDirectionWorkspace {
  session: CreativeDirectionSession;
  context: SharedProjectContext;
  lanes: CreativeDirectionLane[];
  finalDirection: FinalCreativeDirection | null;
  productionHandoff: CreativeDirectionProductionHandoff | null;
}

export interface CreateCreativeDirectionSessionInput {
  projectId: string;
  projectName: string;
  brandName?: string;
  industry?: string;
  description?: string;
  lockedFacts?: string[];
  sourceDocumentIds: string[];
  sourceDocumentLabels: string[];
}

export interface UpdateSharedProjectContextInput {
  facts: SharedProjectFact[];
  confirm: boolean;
}

export interface UpdateFinalCreativeDirectionInput {
  title?: string;
  proposition?: string;
  strategicPrinciples?: string[];
  visualPrinciples?: string[];
  negativeConstraints?: string[];
  risks?: string[];
}
