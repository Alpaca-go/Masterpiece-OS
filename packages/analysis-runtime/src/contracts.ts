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
