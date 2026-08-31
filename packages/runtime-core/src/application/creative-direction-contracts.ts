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

export type CreativeDirectionSessionStatus = 'CONTEXT_REVIEW' | 'IN_PROGRESS' | 'DRAFT_READY' | 'FINALIZED';

export interface CreativeDirectionSession {
  schemaVersion: 'creative-direction-session-v0.1';
  id: string;
  projectId: string;
  projectName: string;
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

export interface FinalCreativeDirection {
  schemaVersion: 'final-creative-direction-v0.1';
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
  evidence: string[];
  sourceCoverage: CreativeDirectionSourceCoverage;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string;
}

export interface CreativeDirectionWorkspace {
  session: CreativeDirectionSession;
  context: SharedProjectContext;
  lanes: CreativeDirectionLane[];
  finalDirection: FinalCreativeDirection | null;
}

export interface CreateCreativeDirectionSessionInput {
  projectId: string;
  projectName: string;
  brandName?: string;
  industry?: string;
  description?: string;
  lockedFacts?: string[];
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
