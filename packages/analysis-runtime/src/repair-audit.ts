import type {
  AnalysisRepairAudit,
  AnalysisRepairAuditField,
  ClarificationQuestion,
  MissingFieldIssue,
  RepairFieldMetadata,
  RepairStrategy,
} from './contracts.ts';

export interface RepairAuditAccumulator {
  repaired: Map<string, RepairFieldMetadata>;
  defaulted: Set<string>;
  ignored: Set<string>;
  unresolved: Map<string, MissingFieldIssue>;
  conflicts: string[];
  errors: AnalysisRepairAudit['errors'];
}

export function createRepairAuditAccumulator(): RepairAuditAccumulator {
  return {
    repaired: new Map(),
    defaulted: new Set(),
    ignored: new Set(),
    unresolved: new Map(),
    conflicts: [],
    errors: [],
  };
}

function auditField(
  path: string,
  strategy: RepairStrategy,
  metadata?: RepairFieldMetadata,
): AnalysisRepairAuditField {
  return {
    path,
    strategy,
    previousState: 'missing',
    ...(metadata ? {
      newStatus: metadata.status,
      confidence: metadata.confidence,
      evidenceRefs: [...metadata.evidenceRefs],
    } : {}),
  };
}

export function buildAnalysisRepairAudit(input: {
  runId: string;
  status: AnalysisRepairAudit['status'];
  attempts: number;
  modelCallCount: number;
  sourceFingerprint: string;
  startedAt: string;
  completedAt: string;
  accumulator: RepairAuditAccumulator;
  clarificationQuestions: ClarificationQuestion[];
}): AnalysisRepairAudit {
  return {
    schemaVersion: '1.0',
    repairVersion: '1.0',
    runId: input.runId,
    status: input.status,
    attempts: input.attempts,
    modelCallCount: input.modelCallCount,
    sourceFingerprint: input.sourceFingerprint,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    repairedFields: [...input.accumulator.repaired.entries()]
      .map(([path, metadata]) => auditField(path, 'ai_from_evidence', metadata)),
    defaultedFields: [...input.accumulator.defaulted]
      .map((path) => auditField(path, 'system_default')),
    ignoredFields: [...input.accumulator.ignored]
      .map((path) => auditField(path, 'ignore_for_current_task')),
    unresolvedFields: [...input.accumulator.unresolved.values()]
      .map((issue) => auditField(issue.path, issue.repairStrategy)),
    conflicts: [...new Set(input.accumulator.conflicts)],
    clarificationQuestions: structuredClone(input.clarificationQuestions),
    errors: structuredClone(input.accumulator.errors),
  };
}
