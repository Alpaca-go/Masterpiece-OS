import crypto from 'node:crypto';
import type {
  AnalysisCompletionOutcome,
  AnalysisCompletionPersistence,
  AnalysisDeliverable,
  AnalysisRepairResult,
  DeliverableExecutionContext,
  MissingFieldIssue,
  RepairFieldMetadata,
  StructuredRepairModel,
} from './contracts.ts';
import { MAX_REPAIR_ATTEMPTS } from './contracts.ts';
import { buildClarificationQuestions } from './clarification-builder.ts';
import {
  applyDeterministicRepairs,
  applySystemDefaults,
} from './deterministic-repair.ts';
import { evaluateDeliverableSufficiency } from './deliverable-sufficiency.ts';
import { evidenceSafeMerge } from './evidence-safe-merge.ts';
import {
  isRecord,
  valueAtPath,
} from './path-utils.ts';
import {
  buildAnalysisRepairAudit,
  createRepairAuditAccumulator,
} from './repair-audit.ts';
import { createRepairPlan } from './repair-planner.ts';
import { migrateAnalysisPacket } from './schema-migrations.ts';
import {
  markStaleRepairMetadata,
} from './source-fingerprint.ts';
import { runStructuredRepair } from './structured-repair-runner.ts';

function safeError(error: unknown, attempt?: number): {
  code: string;
  message: string;
  attempt?: number;
} {
  const candidate = error as { code?: unknown; message?: unknown };
  const code = typeof candidate?.code === 'string'
    ? candidate.code
    : 'REPAIR_RESPONSE_INVALID';
  const messages: Record<string, string> = {
    REPAIR_RESPONSE_INVALID: 'Repair model returned invalid structured output.',
    REPAIR_EVIDENCE_UNAVAILABLE: 'Current project evidence is insufficient for automatic repair.',
    REPAIR_ATTEMPTS_EXHAUSTED: 'Automatic repair attempts were exhausted.',
  };
  return {
    code,
    message: messages[code] ?? 'Structured repair failed.',
    ...(attempt ? { attempt } : {}),
  };
}

function sourceFingerprintFrom(packet: unknown, explicit?: string): string {
  const current = valueAtPath(packet, 'provenance.sourceFingerprint');
  const value = explicit?.trim() || (typeof current === 'string' ? current.trim() : '');
  if (!value) {
    throw Object.assign(new Error('Analysis source fingerprint is missing.'), {
      code: 'SOURCE_FINGERPRINT_MISSING',
    });
  }
  return value;
}

function repairMetadataFrom(packet: Record<string, unknown>): Record<string, RepairFieldMetadata> {
  const metadata = packet.repairMetadata;
  if (!isRecord(metadata) || !isRecord(metadata.fields)) return {};
  return structuredClone(metadata.fields) as Record<string, RepairFieldMetadata>;
}

async function persist(
  persistence: AnalysisCompletionPersistence | undefined,
  action: (store: AnalysisCompletionPersistence) => Promise<void>,
): Promise<void> {
  if (!persistence) return;
  try {
    await action(persistence);
  } catch {
    throw Object.assign(new Error('Failed to persist analysis repair artifacts.'), {
      code: 'PROJECT_CONTEXT_WRITE_FAILED',
    });
  }
}

export async function completeStructuredAnalysis(input: {
  packet: unknown;
  deliverable: AnalysisDeliverable;
  execution?: DeliverableExecutionContext;
  model: StructuredRepairModel;
  sourceFingerprint?: string;
  projectLanguage?: string;
  lockedPaths?: string[];
  confirmedPaths?: string[];
  persistence?: AnalysisCompletionPersistence;
  runId?: string;
  now?: () => string;
  onProgress?: (stage:
    | 'validation'
    | 'repairing'
    | 'merging'
    | 'revalidation'
  ) => void;
  validateFinalPacket?: (packet: Record<string, unknown>) => {
    status: 'pass' | 'block';
    findings: unknown[];
  };
  repairInvalidFinalPacket?: (input: {
    packet: Record<string, unknown>;
    findings: unknown[];
  }) => Promise<Record<string, unknown>>;
}): Promise<AnalysisCompletionOutcome> {
  const now = input.now ?? (() => new Date().toISOString());
  const startedAt = now();
  const runId = input.runId ?? `repair-run-${crypto.randomUUID()}`;
  const accumulator = createRepairAuditAccumulator();
  let modelCallCount = 0;
  let attempts = 0;
  let execution = structuredClone(input.execution ?? {});

  await persist(input.persistence, (store) => store.saveInitial(input.packet));
  const migration = migrateAnalysisPacket(input.packet, startedAt);
  let packet = migration.packet;
  const sourceFingerprint = sourceFingerprintFrom(packet, input.sourceFingerprint);
  const stale = markStaleRepairMetadata({
    metadata: repairMetadataFrom(packet),
    sourceFingerprint,
  });
  if (stale.staleFields.length) {
    packet.repairMetadata = {
      schemaVersion: '1.0',
      fields: stale.metadata,
    };
  }

  const runtimePrompts: string[] = [];
  const runtimeResponses: unknown[] = [];
  const runtimeMerges: unknown[] = [];
  let finalIssues: MissingFieldIssue[] = [];
  let finalStatus: AnalysisRepairResult['status'] = 'failed';

  input.onProgress?.('validation');
  const initialSufficiency = evaluateDeliverableSufficiency({
    packet,
    deliverable: input.deliverable,
    execution,
  });
  await persist(input.persistence, (store) => store.saveRuntimeArtifact(
    'initial-validation.json',
    initialSufficiency,
  ));
  finalIssues = initialSufficiency.issues;
  const initialActionable = initialSufficiency.issues.some((issue) => (
    issue.severity === 'repairable'
    || issue.severity === 'defaultable'
    || issue.repairStrategy === 'deterministic'
  ));
  if (initialSufficiency.status === 'ready') {
    finalStatus = 'ready';
  } else if (initialSufficiency.status === 'ready_with_warnings') {
    finalStatus = 'ready_with_warnings';
  } else if (initialSufficiency.status === 'failed') {
    finalStatus = 'failed';
  } else if (!initialActionable && initialSufficiency.status === 'requires_confirmation') {
    finalStatus = 'requires_confirmation';
  }

  for (
    let attempt = 1;
    initialActionable && attempt <= MAX_REPAIR_ATTEMPTS;
    attempt += 1
  ) {
    attempts = attempt;
    input.onProgress?.('validation');
    let sufficiency = evaluateDeliverableSufficiency({
      packet,
      deliverable: input.deliverable,
      execution,
    });
    const plan = createRepairPlan({
      deliverable: input.deliverable,
      attempt,
      issues: sufficiency.issues,
    });
    await persist(input.persistence, (store) => store.saveRuntimeArtifact(
      'repair-plan.json',
      plan,
    ));
    plan.ignored.forEach((issue) => accumulator.ignored.add(issue.path));
    plan.fatal.forEach((issue) => accumulator.unresolved.set(issue.path, issue));

    if (plan.fatal.length) {
      finalIssues = sufficiency.issues;
      finalStatus = 'failed';
      break;
    }

    const deterministic = applyDeterministicRepairs({
      packet,
      issues: plan.deterministic,
      now: now(),
    });
    packet = deterministic.packet;
    const defaults = applySystemDefaults({
      deliverable: input.deliverable,
      execution,
      issues: plan.systemDefaults,
      sourceFingerprint,
      projectLanguage: input.projectLanguage,
    });
    execution = defaults.execution;
    Object.keys(defaults.defaulted).forEach((path) => accumulator.defaulted.add(path));

    if (plan.aiBatches.length) input.onProgress?.('repairing');
    let attemptApplied = false;
    for (const batch of plan.aiBatches) {
      try {
        const result = await runStructuredRepair({
          batch,
          packet,
          attempt,
          sourceFingerprint,
          model: async (request) => {
            modelCallCount += 1;
            return input.model(request);
          },
        });
        runtimePrompts.push(result.promptRedacted);
        runtimeResponses.push(result.responseRedacted);
        input.onProgress?.('merging');
        const merged = evidenceSafeMerge({
          packet,
          patches: result.patches,
          sourceFingerprint,
          repairedAt: now(),
          lockedPaths: input.lockedPaths,
          confirmedPaths: input.confirmedPaths,
          repairablePaths: batch.fieldPaths,
        });
        packet = merged.packet;
        merged.applied.forEach((path) => {
          const metadata = merged.metadata[path];
          if (metadata) accumulator.repaired.set(path, metadata);
        });
        accumulator.conflicts.push(...merged.conflicts);
        runtimeMerges.push({
          attempt,
          batchId: batch.id,
          applied: merged.applied,
          unchanged: merged.unchanged,
          rejected: merged.rejected,
          conflicts: merged.conflicts,
        });
        attemptApplied = attemptApplied || merged.applied.length > 0;
      } catch (error) {
        accumulator.errors.push(safeError(error, attempt));
      }
    }

    await persist(input.persistence, (store) => store.saveAttempt(attempt, packet));
    input.onProgress?.('revalidation');
    sufficiency = evaluateDeliverableSufficiency({
      packet,
      deliverable: input.deliverable,
      execution,
    });
    finalIssues = sufficiency.issues;

    const confirmationIssues = sufficiency.issues.filter((issue) => (
      issue.severity === 'requires_confirmation'
    ));
    const repairableIssues = sufficiency.issues.filter((issue) => (
      issue.severity === 'repairable' || issue.severity === 'defaultable'
    ));
    if (!repairableIssues.length && !confirmationIssues.length) {
      finalStatus = sufficiency.issues.length ? 'ready_with_warnings' : 'ready';
      break;
    }
    if (!repairableIssues.length && confirmationIssues.length) {
      finalStatus = 'requires_confirmation';
      break;
    }
    if (!attemptApplied && attempt === MAX_REPAIR_ATTEMPTS) {
      finalStatus = confirmationIssues.length ? 'requires_confirmation' : 'failed';
      break;
    }
  }

  if (
    input.deliverable === 'space'
    && (finalStatus === 'ready' || finalStatus === 'ready_with_warnings')
    && input.validateFinalPacket
  ) {
    let semanticValidation = input.validateFinalPacket(packet);
    await persist(input.persistence, (store) => store.saveRuntimeArtifact(
      'spatial-semantic-validation.initial.json',
      semanticValidation,
    ));
    if (semanticValidation.status === 'block' && input.repairInvalidFinalPacket) {
      input.onProgress?.('repairing');
      try {
        modelCallCount += 1;
        packet = await input.repairInvalidFinalPacket({
          packet,
          findings: semanticValidation.findings,
        });
        semanticValidation = input.validateFinalPacket(packet);
        await persist(input.persistence, (store) => store.saveRuntimeArtifact(
          'spatial-semantic-validation.repaired.json',
          semanticValidation,
        ));
      } catch (error) {
        accumulator.errors.push(safeError(Object.assign(
          error instanceof Error ? error : new Error(String(error)),
          { code: 'ANALYSIS_SPATIAL_SEMANTICS_INVALID' },
        )));
        semanticValidation = { status: 'block', findings: semanticValidation.findings };
      }
    }
    if (semanticValidation.status === 'block') {
      finalStatus = 'failed';
      accumulator.errors.push({
        code: 'ANALYSIS_SPATIAL_SEMANTICS_INVALID',
        message: 'Spatial functional semantics remained invalid after targeted repair.',
      });
    }
  }

  finalIssues.forEach((issue) => {
    if (
      issue.severity === 'requires_confirmation'
      || issue.severity === 'fatal'
      || issue.severity === 'repairable'
    ) {
      accumulator.unresolved.set(issue.path, issue);
    }
  });
  const clarificationQuestions = buildClarificationQuestions(finalIssues);
  const completedAt = now();
  const audit = buildAnalysisRepairAudit({
    runId,
    status: finalStatus,
    attempts,
    modelCallCount,
    sourceFingerprint,
    startedAt,
    completedAt,
    accumulator,
    clarificationQuestions,
  });
  await persist(input.persistence, async (store) => {
    await store.saveRuntimeArtifact(
      'repair-prompt.redacted.md',
      runtimePrompts.join('\n\n---\n\n'),
    );
    await store.saveRuntimeArtifact('repair-response.redacted.json', runtimeResponses);
    await store.saveRuntimeArtifact('merge-report.json', runtimeMerges);
    await store.saveRuntimeArtifact('final-validation.json', {
      status: finalStatus,
      issues: finalIssues,
    });
    await store.saveFinal(packet);
    await store.saveAudit(audit);
  });

  return {
    runId,
    packet,
    execution,
    status: finalStatus,
    attempts,
    modelCallCount,
    repairedFields: [...accumulator.repaired.keys()],
    defaultedFields: [...accumulator.defaulted],
    ignoredFields: [...accumulator.ignored],
    unresolvedFields: [...accumulator.unresolved.keys()],
    conflicts: [...new Set(accumulator.conflicts)],
    clarificationQuestions,
    audit,
  };
}
