import type { ImageGenerationService, ImageGenerationPreSubmitEvidence } from './image-generation/service.ts';
import type { RunStore } from './image-generation/run-store.ts';
import type { VisualMigrationAuditService } from './visual-migration-audit-service.ts';
import type { VisualMigrationGenerationEvidenceService } from './visual-migration-generation-evidence-service.ts';
import type { VisualMigrationCanonService } from './visual-migration-canon-service.ts';
import {
  buildVisualMigrationCorrectiveRetryPlan,
  validateVisualMigrationCorrectiveRetryPlanV1,
  VISUAL_MIGRATION_CORRECTIVE_AUTHORITY_CHANGED,
  VISUAL_MIGRATION_CORRECTIVE_CAPABILITY_CHANGED,
  VISUAL_MIGRATION_CORRECTIVE_NOT_ELIGIBLE,
  VISUAL_MIGRATION_CORRECTIVE_PRE_SUBMIT_FAILED,
  VISUAL_MIGRATION_CORRECTIVE_REFERENCE_SET_CHANGED,
  VISUAL_MIGRATION_CORRECTIVE_RETRY_LIMIT_REACHED,
  type VisualMigrationCorrectiveRetryPlanV1,
} from './visual-migration-corrective-retry-contract.ts';

interface Dependencies {
  imageGeneration: ImageGenerationService;
  audits: VisualMigrationAuditService;
  generationEvidence: VisualMigrationGenerationEvidenceService;
  visualMigrationCanons: VisualMigrationCanonService;
  runStoreResolver: (projectId: string) => RunStore;
  now?: () => string;
}

function failure(code: string, message: string): Error { return Object.assign(new Error(message), { code }); }
function same(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function createVisualMigrationCorrectiveRetryService(deps: Dependencies) {
  const now = deps.now ?? (() => new Date().toISOString());

  async function prepare(input: { projectId: string; sourceRunId: string; sourceAuditId: string }): Promise<VisualMigrationCorrectiveRetryPlanV1> {
    const [audit, snapshot, run] = await Promise.all([
      deps.audits.get({ projectId: input.projectId, runId: input.sourceRunId, auditId: input.sourceAuditId }),
      deps.generationEvidence.getGenerationEvidenceSnapshot({ projectId: input.projectId, runId: input.sourceRunId, verifyArtifacts: true }),
      deps.runStoreResolver(input.projectId).readRun(input.sourceRunId),
    ]);
    if (!run || audit.runId !== snapshot.runId || audit.generationEvidence.snapshotFingerprint !== snapshot.snapshotFingerprint
      || audit.decision.disposition !== 'corrective_retry_required' || !audit.decision.retryEligibility) {
      throw failure(VISUAL_MIGRATION_CORRECTIVE_NOT_ELIGIBLE, 'The source Audit is not eligible for corrective retry.');
    }
    if ((run.automaticCorrectiveRetryDepth ?? 0) >= 1) {
      throw failure(VISUAL_MIGRATION_CORRECTIVE_RETRY_LIMIT_REACHED, 'Automatic corrective retry depth is already 1.');
    }
    const canon = (await deps.visualMigrationCanons.resolve(input.projectId, snapshot.authority.canon.canonId)).canon;
    if (canon.canonFingerprint !== snapshot.authority.canon.canonFingerprint) {
      throw failure(VISUAL_MIGRATION_CORRECTIVE_AUTHORITY_CHANGED, 'Canon authority changed after the parent Snapshot.');
    }
    const taskBytes = await deps.runStoreResolver(input.projectId).readRunArtifact(input.sourceRunId, snapshot.artifacts.task.filename);
    let task: { userIntent?: { original?: string; normalized?: string }; compiledPrompt?: string } = {};
    try { task = taskBytes ? JSON.parse(taskBytes.toString('utf8')) : {}; } catch { /* handled by empty rules */ }
    const plan = buildVisualMigrationCorrectiveRetryPlan({
      projectId: input.projectId, sourceRunId: input.sourceRunId, sourceAuditId: input.sourceAuditId,
      parentSnapshotId: snapshot.snapshotId, parentSnapshotFingerprint: snapshot.snapshotFingerprint,
      policyId: snapshot.authority.policy.policyId, canon, capabilityFingerprint: snapshot.capability.capabilityFingerprint,
      selectedCandidateIds: [...snapshot.referenceDecision.selectedCandidateIds], failureClasses: [...audit.decision.failureClasses],
      targetContentRules: [task.userIntent?.normalized ?? task.userIntent?.original ?? ''].filter(Boolean),
      structureRules: canon.projectIdentity.requiredIdentityRules.filter((rule) => rule.dimension !== 'identity').map((rule) => rule.statement),
      createdAt: now(),
    });
    const store = deps.runStoreResolver(input.projectId);
    const existing = await store.readVisualMigrationCorrectionPlan(input.sourceRunId, plan.correctionPlanId);
    if (existing) return validateVisualMigrationCorrectiveRetryPlanV1(existing);
    await store.writeVisualMigrationCorrectionPlanCreateOnce(input.sourceRunId, plan.correctionPlanId, plan);
    return validateVisualMigrationCorrectiveRetryPlanV1(await store.readVisualMigrationCorrectionPlan(input.sourceRunId, plan.correctionPlanId));
  }

  async function execute(input: { projectId: string; sourceRunId: string; sourceAuditId: string; apiProfileId?: string; apiKey?: string; dryRun?: boolean }) {
    const plan = await prepare(input);
    const store = deps.runStoreResolver(input.projectId);
    const parentSnapshot = await deps.generationEvidence.getGenerationEvidenceSnapshot({ projectId: input.projectId, runId: input.sourceRunId, verifyArtifacts: true });
    const promptBytes = await store.readRunArtifact(input.sourceRunId, parentSnapshot.artifacts.compiledPrompt.filename);
    if (!promptBytes) throw failure(VISUAL_MIGRATION_CORRECTIVE_AUTHORITY_CHANGED, 'Parent compiled prompt is unavailable.');
    const editedPrompt = `${promptBytes.toString('utf8').trimEnd()}\n\n---\n\n${plan.promptOverlay}\n`;

    const beforeProviderSubmit = async (evidence: ImageGenerationPreSubmitEvidence) => {
      try {
        if (evidence.run.parentRunId !== input.sourceRunId) throw failure(VISUAL_MIGRATION_CORRECTIVE_PRE_SUBMIT_FAILED, 'Corrective child parent binding is invalid.');
        const childStore = deps.runStoreResolver(input.projectId);
        await childStore.saveRun({ ...evidence.run, sourceAuditId: plan.sourceAuditId, correctionPlanId: plan.correctionPlanId, automaticCorrectiveRetryDepth: 1 });
        const sourceMapBytes = await childStore.readRunArtifact(evidence.run.runId, 'prompt-source-map.json');
        let sourceMap: Record<string, unknown> = {};
        try { sourceMap = sourceMapBytes ? JSON.parse(sourceMapBytes.toString('utf8')) : {}; } catch { /* replace invalid artifact */ }
        await childStore.writePromptSourceMap(evidence.run.runId, { ...sourceMap, visualMigrationCorrection: {
          correctionPlanId: plan.correctionPlanId, sourceAuditId: plan.sourceAuditId,
          failureClasses: plan.failureClasses, canonId: plan.canonId, correctionActions: plan.correctionActions,
        } });
        const frozenRefs = parentSnapshot.referenceDecision.materializedReferences;
        const actualHashes = evidence.references.map((item) => item.sha256 ?? '');
        if (actualHashes.some((hash) => !hash) || !same(actualHashes, parentSnapshot.providerEnvelope.evidenceSha256s)) {
          throw failure(VISUAL_MIGRATION_CORRECTIVE_REFERENCE_SET_CHANGED, 'Actual child Provider references differ from the parent evidence order.');
        }
        const taskReferenceLocators: Record<string, string> = {};
        for (const frozen of frozenRefs.filter((item) => item.sourceKind === 'task_reference')) {
          const match = evidence.references.find((item) => item.sha256 === frozen.sha256);
          if (!match) throw failure(VISUAL_MIGRATION_CORRECTIVE_REFERENCE_SET_CHANGED, `Task reference changed: ${frozen.candidateId}.`);
          taskReferenceLocators[frozen.candidateId] = match.assetId;
        }
        const prepared = await deps.generationEvidence.prepareAndPersist({
          projectId: input.projectId, runId: evidence.run.runId, policyId: plan.policyId,
          registryModelId: parentSnapshot.capability.registryModelId,
          provider: parentSnapshot.capability.provider, protocol: parentSnapshot.capability.protocol,
          taskReferenceLocators,
          buildProviderRequest: ({ references }) => {
            const ids = references.map((item) => String(item.candidateId));
            const hashes = references.map((item) => String(item.sha256));
            if (!same(ids, plan.selectedCandidateIds) || !same(hashes, parentSnapshot.providerEnvelope.evidenceSha256s)) {
              throw failure(VISUAL_MIGRATION_CORRECTIVE_REFERENCE_SET_CHANGED, 'Child VM-4 evidence differs from the parent selected set.');
            }
            return { providerRequest: evidence.providerRequest, redactedProviderRequest: evidence.redactedProviderRequest };
          },
        });
        const child = prepared.snapshot;
        if (child.authority.policy.policyId !== plan.policyId || child.authority.canon.canonId !== plan.canonId
          || child.authority.referencePack.referencePackId !== parentSnapshot.authority.referencePack.referencePackId) {
          throw failure(VISUAL_MIGRATION_CORRECTIVE_AUTHORITY_CHANGED, 'Corrective authority changed before Provider submit.');
        }
        if (child.capability.capabilityFingerprint !== plan.capabilityFingerprint) {
          throw failure(VISUAL_MIGRATION_CORRECTIVE_CAPABILITY_CHANGED, 'Corrective capability changed before Provider submit.');
        }
        if (!same(child.referenceDecision.selectedCandidateIds, plan.selectedCandidateIds)) {
          throw failure(VISUAL_MIGRATION_CORRECTIVE_REFERENCE_SET_CHANGED, 'Corrective selected reference set changed.');
        }
        if (child.snapshotId === parentSnapshot.snapshotId || child.reproducibilityFingerprint === parentSnapshot.reproducibilityFingerprint) {
          throw failure(VISUAL_MIGRATION_CORRECTIVE_PRE_SUBMIT_FAILED, 'Corrective child did not create distinct prompt-bound VM-5 evidence.');
        }
      } catch (error) {
        if (String((error as { code?: string }).code ?? '').startsWith('VISUAL_MIGRATION_CORRECTIVE_')) throw error;
        throw failure(VISUAL_MIGRATION_CORRECTIVE_PRE_SUBMIT_FAILED, `Corrective pre-submit guard failed: ${(error as Error).message}`);
      }
    };

    const run = await deps.imageGeneration.retryWithPreSubmitGuard({
      runId: input.sourceRunId, mode: 'edited_prompt', editedPrompt,
      apiProfileId: input.apiProfileId, apiKey: input.apiKey, dryRun: input.dryRun,
    }, beforeProviderSubmit);
    return { plan, run };
  }

  async function getPlan(input: { projectId: string; sourceRunId: string; correctionPlanId: string }) {
    return validateVisualMigrationCorrectiveRetryPlanV1(await deps.runStoreResolver(input.projectId).readVisualMigrationCorrectionPlan(input.sourceRunId, input.correctionPlanId));
  }
  return { prepare, execute, getPlan };
}

export type VisualMigrationCorrectiveRetryService = ReturnType<typeof createVisualMigrationCorrectiveRetryService>;
