export type AnalysisDeliverable = 'space' | 'packaging' | 'poster' | 'vi';

export type DecisionStatus =
  | 'confirmed'
  | 'source_fact'
  | 'inferred'
  | 'proposed'
  | 'system_default'
  | 'unknown'
  | 'conflicted'
  | 'stale';

export type RepairSeverity =
  | 'repairable'
  | 'defaultable'
  | 'optional'
  | 'requires_confirmation'
  | 'fatal';

export type RepairStrategy =
  | 'deterministic'
  | 'ai_from_evidence'
  | 'system_default'
  | 'ignore_for_current_task'
  | 'ask_user'
  | 'none';

export type RepairGeneratedBy =
  | 'user'
  | 'source_parser'
  | 'analysis_model'
  | 'repair_model'
  | 'deterministic_rule'
  | 'system_default';

export interface SchemaValidationIssue {
  path: string;
  code: string;
  kind: 'missing' | 'invalid' | 'conflict';
  message: string;
  availableEvidenceRefs?: string[];
}

export interface FieldRepairPolicy {
  path: string;
  code: string;
  severity: RepairSeverity;
  repairStrategy: RepairStrategy;
  appliesTo: AnalysisDeliverable[];
  requiredEvidencePaths: string[];
}

export interface MissingFieldIssue {
  path: string;
  code: string;
  severity: RepairSeverity;
  repairStrategy: RepairStrategy;
  appliesTo: AnalysisDeliverable[];
  requiredEvidencePaths: string[];
  availableEvidenceRefs: string[];
  message: string;
}

export interface EvidenceBackedValue<T> {
  value: T;
  status: DecisionStatus;
  confidence: number;
  evidenceRefs: string[];
  generatedBy: RepairGeneratedBy;
  sourceFingerprint: string;
  schemaVersion: string;
  repairVersion?: string;
}

export interface ClarificationQuestion {
  code: string;
  fieldPaths: string[];
  question: string;
  options?: Array<{
    id: string;
    label: string;
    description?: string;
  }>;
}

export interface AnalysisRepairResult {
  status: 'ready' | 'ready_with_warnings' | 'requires_confirmation' | 'failed';
  attempts: number;
  repairedFields: string[];
  defaultedFields: string[];
  ignoredFields: string[];
  unresolvedFields: string[];
  conflicts: string[];
  clarificationQuestions: ClarificationQuestion[];
}

export interface DeliverableExecutionContext {
  camera?: {
    focalLength?: string;
  };
  outputLanguage?: string;
  aspectRatio?: string;
}

export interface DeliverableSufficiencyResult {
  deliverable: AnalysisDeliverable;
  status: 'ready' | 'ready_with_warnings' | 'repairable' | 'requires_confirmation' | 'failed';
  issues: MissingFieldIssue[];
}

export const MAX_REPAIR_ATTEMPTS = 2;

export interface RepairPlanBatch {
  id: string;
  strategy: Extract<RepairStrategy, 'ai_from_evidence'>;
  fieldPaths: string[];
  evidencePaths: string[];
  evidenceRefs: string[];
}

export interface RepairPlan {
  deliverable: AnalysisDeliverable;
  attempt: number;
  deterministic: MissingFieldIssue[];
  aiBatches: RepairPlanBatch[];
  systemDefaults: MissingFieldIssue[];
  ignored: MissingFieldIssue[];
  requiresConfirmation: MissingFieldIssue[];
  fatal: MissingFieldIssue[];
}

export interface RepairFieldPatch {
  path: string;
  value: EvidenceBackedValue<unknown>;
}

export interface RepairFieldMetadata {
  status: DecisionStatus;
  confidence: number;
  evidenceRefs: string[];
  generatedBy: RepairGeneratedBy;
  sourceFingerprint: string;
  schemaVersion: string;
  repairVersion?: string;
  repairedAt: string;
}

export interface EvidenceSafeMergeReport {
  packet: Record<string, unknown>;
  applied: string[];
  unchanged: string[];
  rejected: string[];
  conflicts: string[];
  metadata: Record<string, RepairFieldMetadata>;
}

export interface SystemDefaultResult {
  execution: DeliverableExecutionContext;
  defaulted: Record<string, EvidenceBackedValue<unknown>>;
}

export interface SchemaMigrationResult {
  packet: Record<string, unknown>;
  fromVersion: string;
  toVersion: string;
  migrated: boolean;
  changes: string[];
  requiresRepair: string[];
}

export interface StructuredRepairModelRequest {
  prompt: string;
  attempt: number;
  batchId: string;
  targetFields: string[];
  responseSchema: Record<string, unknown>;
}

export type StructuredRepairModel = (
  request: StructuredRepairModelRequest,
) => Promise<unknown>;

export interface StructuredRepairRunResult {
  batchId: string;
  attempt: number;
  patches: RepairFieldPatch[];
  promptRedacted: string;
  responseRedacted: {
    repairs: Array<{
      path: string;
      value: unknown;
      status: 'inferred' | 'proposed';
      confidence: number;
      evidenceRefs: string[];
    }>;
  };
}

export interface AnalysisRepairAuditField {
  path: string;
  strategy: RepairStrategy;
  previousState: 'missing' | 'invalid' | 'stale';
  newStatus?: DecisionStatus;
  confidence?: number;
  evidenceRefs?: string[];
}

export interface AnalysisRepairAudit {
  schemaVersion: '1.0';
  repairVersion: '1.0';
  runId: string;
  status: AnalysisRepairResult['status'];
  attempts: number;
  modelCallCount: number;
  sourceFingerprint: string;
  startedAt: string;
  completedAt: string;
  repairedFields: AnalysisRepairAuditField[];
  defaultedFields: AnalysisRepairAuditField[];
  ignoredFields: AnalysisRepairAuditField[];
  unresolvedFields: AnalysisRepairAuditField[];
  conflicts: string[];
  clarificationQuestions: ClarificationQuestion[];
  errors: Array<{
    code: string;
    message: string;
    attempt?: number;
  }>;
}

export interface AnalysisCompletionPersistence {
  saveInitial(packet: unknown): Promise<void>;
  saveAttempt(attempt: number, packet: unknown): Promise<void>;
  saveFinal(packet: unknown): Promise<void>;
  saveAudit(audit: AnalysisRepairAudit): Promise<void>;
  saveRuntimeArtifact(filename: string, value: unknown): Promise<void>;
}

export interface AnalysisCompletionOutcome extends AnalysisRepairResult {
  runId: string;
  packet: Record<string, unknown>;
  execution: DeliverableExecutionContext;
  modelCallCount: number;
  audit: AnalysisRepairAudit;
}
