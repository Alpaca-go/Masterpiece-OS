import type { VisualMigrationAuditEvidenceResolver } from './visual-migration-audit-evidence-resolver.ts';
import type { VisualMigrationAuditObserver } from './visual-migration-audit-observer.ts';
import type { RunStore } from './image-generation/run-store.ts';
import {
  buildVisualMigrationAuditId,
  computeVisualMigrationAuditFingerprint,
  computeVisualMigrationAuditInputFingerprint,
  VISUAL_MIGRATION_AUDIT_DECISION_RULE_VERSION,
  VISUAL_MIGRATION_AUDIT_CONFLICT,
  VISUAL_MIGRATION_REFERENCE_AUDIT_PROMPT_VERSION,
  VISUAL_MIGRATION_SOURCE_AUDIT_PROMPT_VERSION,
  visualMigrationAuditError,
  validateVisualMigrationAuditV1,
  type VisualMigrationAuditV1,
} from './visual-migration-audit-contract.ts';
import { decideVisualMigrationAudit } from './visual-migration-audit-decision-engine.ts';

interface Dependencies {
  evidenceResolver: VisualMigrationAuditEvidenceResolver;
  observer: VisualMigrationAuditObserver;
  runStoreResolver: (projectId: string) => RunStore;
  now?: () => string;
}

export function createVisualMigrationAuditService(deps: Dependencies) {
  const now = deps.now ?? (() => new Date().toISOString());
  async function audit(input: { projectId: string; runId: string; imageId?: string; auditProfileId?: string }): Promise<VisualMigrationAuditV1> {
    const evidence = await deps.evidenceResolver.resolve(input);
    const auditor = await deps.observer.resolveAuditor(input.auditProfileId);
    const auditInputFingerprint = computeVisualMigrationAuditInputFingerprint({
      snapshotFingerprint: evidence.snapshot.snapshotFingerprint, outputSha256: evidence.output.sha256,
      sourceAuditEvidence: evidence.source.map((item) => ({ candidateId: item.candidateId, sha256: item.sha256 })),
      referenceAuditEvidence: evidence.reference.map((item) => ({ candidateId: item.candidateId, sha256: item.sha256 })),
      sourcePromptVersion: VISUAL_MIGRATION_SOURCE_AUDIT_PROMPT_VERSION,
      referencePromptVersion: VISUAL_MIGRATION_REFERENCE_AUDIT_PROMPT_VERSION,
      decisionRuleVersion: VISUAL_MIGRATION_AUDIT_DECISION_RULE_VERSION,
      auditorProvider: auditor.provider, auditorModel: auditor.model,
    });
    const auditId = buildVisualMigrationAuditId(auditInputFingerprint);
    const store = deps.runStoreResolver(input.projectId);
    const existing = await store.readVisualMigrationAudit(input.runId, auditId);
    if (existing) return validateVisualMigrationAuditV1(existing);
    const observed = await deps.observer.observe({ evidence, auditProfileId: input.auditProfileId, resolvedAuditor: auditor });
    const withoutFingerprint: Omit<VisualMigrationAuditV1, 'auditFingerprint'> = {
      schemaVersion: 'visual-migration-audit/v1', auditId, auditInputFingerprint,
      projectId: input.projectId, runId: input.runId,
      generationEvidence: { snapshotId: evidence.snapshot.snapshotId, snapshotFingerprint: evidence.snapshot.snapshotFingerprint, reproducibilityFingerprint: evidence.snapshot.reproducibilityFingerprint },
      outputEvidence: { imageId: evidence.output.candidateId, mimeType: evidence.output.mimeType, sha256: evidence.output.sha256, byteSize: evidence.output.byteSize },
      auditor: { sourcePromptVersion: observed.sourcePromptVersion, referencePromptVersion: observed.referencePromptVersion,
        decisionRuleVersion: VISUAL_MIGRATION_AUDIT_DECISION_RULE_VERSION, provider: observed.provider, model: observed.model,
        sourceObservationRunId: observed.sourceObservationRunId, referenceObservationRunId: observed.referenceObservationRunId },
      auditEvidence: { sourceCandidateIds: evidence.source.map((item) => item.candidateId), referenceCandidateIds: evidence.reference.map((item) => item.candidateId), evidenceSha256s: [...evidence.source, ...evidence.reference].map((item) => item.sha256) },
      observations: { source: observed.source, reference: observed.reference },
      decision: decideVisualMigrationAudit({ source: observed.source, reference: observed.reference, exactCopyDetected: evidence.exactCopyDetected }), createdAt: now(),
    };
    const record = validateVisualMigrationAuditV1({ ...withoutFingerprint, auditFingerprint: computeVisualMigrationAuditFingerprint(withoutFingerprint) });
    await store.writeVisualMigrationAuditCreateOnce(input.runId, record.auditId, record);
    const restored = await get({ projectId: input.projectId, runId: input.runId, auditId: record.auditId });
    return restored;
  }
  async function get(input: { projectId: string; runId: string; auditId: string }): Promise<VisualMigrationAuditV1> {
    const value = await deps.runStoreResolver(input.projectId).readVisualMigrationAudit(input.runId, input.auditId);
    const validated = validateVisualMigrationAuditV1(value);
    if (validated.projectId !== input.projectId || validated.runId !== input.runId || validated.auditId !== input.auditId) {
      throw visualMigrationAuditError(
        VISUAL_MIGRATION_AUDIT_CONFLICT,
        'Audit binding does not match requested project/run/audit authority.',
      );
    }
    return validated;
  }
  return { audit, get };
}

export type VisualMigrationAuditService = ReturnType<typeof createVisualMigrationAuditService>;
