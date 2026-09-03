import {
  resolveImageReferenceCapability,
} from '@masterpiece/model-registry';
import type { VisualMigrationCanonService } from './visual-migration-canon-service.ts';
import type { VisualMigrationReferencePackService } from './visual-migration-reference-pack-service.ts';
import type { VisualMigrationReferencePolicyService } from './visual-migration-reference-policy-service.ts';
import type { VisualMigrationReferenceExecutionService } from './visual-migration-reference-execution-service.ts';
import type { RunStore } from './image-generation/run-store.ts';
import { serializeRunJsonArtifact } from './image-generation/run-store.ts';
import {
  buildGenerationEvidenceArtifactRef,
  buildVisualMigrationGenerationEvidenceSnapshot,
} from './visual-migration-generation-evidence-builder.ts';
import type { VisualMigrationGenerationEvidenceSnapshotV1 } from './visual-migration-generation-evidence-contract.ts';
import {
  assertGenerationEvidenceSafePayload,
  GENERATION_EVIDENCE_ARTIFACT_FILENAMES,
  GENERATION_EVIDENCE_ARTIFACT_TAMPERED,
  GENERATION_EVIDENCE_AUTHORITY_MISMATCH,
  GENERATION_EVIDENCE_CAPABILITY_MISMATCH,
  GENERATION_EVIDENCE_FINGERPRINT_MISMATCH,
  generationEvidenceError,
  validateVisualMigrationGenerationEvidenceSnapshotV1,
} from './visual-migration-generation-evidence-contract.ts';

interface RunEvidenceRecord {
  runId: string;
  projectId: string;
  taskId: string;
  createdAt: string;
  parentRunId?: string;
  sourcePreset?: string;
  deliverable?: string;
  outputType?: string;
}

interface ProviderRequestEvidence {
  providerRequest: unknown;
  redactedProviderRequest: unknown;
}

interface PrepareGenerationEvidenceInput {
  projectId: string;
  runId: string;
  policyId: string;
  registryModelId: string;
  provider?: string;
  protocol?: string;
  taskReferenceLocators?: Record<string, string>;
  buildProviderRequest: (input: {
    capability: ReturnType<typeof resolveImageReferenceCapability>;
    references: Array<Record<string, unknown>>;
  }) => ProviderRequestEvidence | Promise<ProviderRequestEvidence>;
}

interface EvidenceServiceDependencies {
  visualMigrationCanons: VisualMigrationCanonService;
  referencePacks: VisualMigrationReferencePackService;
  referencePolicies: VisualMigrationReferencePolicyService;
  referenceExecution: VisualMigrationReferenceExecutionService;
  imageGenerationRunStoreResolver: (projectId: string) => RunStore;
  /** Deterministic test seam. Production composition always omits it. */
  capabilityResolver?: typeof resolveImageReferenceCapability;
  now?: () => string;
}

async function requireArtifact(
  store: RunStore,
  runId: string,
  filename: string,
  optional = false,
) {
  const bytes = await store.readRunArtifact(runId, filename);
  if (!bytes) {
    if (optional) return undefined;
    throw generationEvidenceError(
      GENERATION_EVIDENCE_ARTIFACT_TAMPERED,
      `Required run artifact is missing: ${filename}.`,
    );
  }
  return buildGenerationEvidenceArtifactRef(filename, bytes);
}

function assertAuthorityLinkage(
  snapshot: VisualMigrationGenerationEvidenceSnapshotV1,
  policy: Awaited<ReturnType<VisualMigrationReferencePolicyService['resolve']>>,
  canonResolution: Awaited<ReturnType<VisualMigrationCanonService['resolve']>>,
  packResolution: Awaited<ReturnType<VisualMigrationReferencePackService['resolve']>>,
): void {
  const canon = canonResolution.canon;
  const pack = packResolution.manifest;
  if (snapshot.projectId !== policy.projectId
    || snapshot.authority.policy.policyId !== policy.policyId
    || snapshot.authority.policy.policyFingerprint !== policy.policyFingerprint
    || snapshot.authority.policy.sourceFingerprint !== policy.sourceFingerprint
    || snapshot.authority.policy.taskFingerprint !== policy.task.taskFingerprint
    || snapshot.authority.policy.candidateSetFingerprint !== policy.trace.candidateSetFingerprint
    || snapshot.authority.canon.canonId !== canon.canonId
    || snapshot.authority.canon.canonFingerprint !== canon.canonFingerprint
    || snapshot.authority.canon.canonSourceFingerprint !== canon.sourceFingerprint
    || snapshot.authority.canon.projectIdentityFingerprint !== canon.source.projectIdentityFingerprint
    || snapshot.authority.canon.lockedAssetFingerprint !== canon.source.lockedAssetFingerprint
    || snapshot.authority.referencePack.referencePackId !== pack.referencePackId
    || snapshot.authority.referencePack.manifestFingerprint !== pack.manifestFingerprint) {
    throw generationEvidenceError(
      GENERATION_EVIDENCE_AUTHORITY_MISMATCH,
      'Generation Evidence authority linkage no longer matches persisted Canon, Policy or Pack evidence.',
    );
  }
}

export function createVisualMigrationGenerationEvidenceService(
  dependencies: EvidenceServiceDependencies,
) {
  const resolveCapability = dependencies.capabilityResolver ?? resolveImageReferenceCapability;
  const now = dependencies.now ?? (() => new Date().toISOString());

  async function resolveAuthorities(projectId: string, policyId: string) {
    try {
      const policy = await dependencies.referencePolicies.resolve(projectId, policyId);
      const canonResolution = await dependencies.visualMigrationCanons.resolve(
        projectId,
        policy.canon.canonId,
      );
      const packResolution = await dependencies.referencePacks.resolve(
        projectId,
        policy.referencePack.referencePackId,
      );
      return { policy, canonResolution, packResolution };
    } catch (error) {
      if (String((error as { code?: unknown }).code ?? '').startsWith('GENERATION_EVIDENCE_')) {
        throw error;
      }
      throw generationEvidenceError(
        GENERATION_EVIDENCE_AUTHORITY_MISMATCH,
        `Generation Evidence authority resolution failed: ${(error as Error).message}`,
        { causeCode: String((error as { code?: unknown }).code ?? 'UNKNOWN') },
      );
    }
  }

  async function verifyArtifacts(
    store: RunStore,
    snapshot: VisualMigrationGenerationEvidenceSnapshotV1,
  ): Promise<void> {
    for (const artifact of Object.values(snapshot.artifacts)) {
      if (!artifact) continue;
      const current = await requireArtifact(store, snapshot.runId, artifact.filename);
      if (!current || current.sha256 !== artifact.sha256 || current.byteSize !== artifact.byteSize) {
        throw generationEvidenceError(
          GENERATION_EVIDENCE_ARTIFACT_TAMPERED,
          `Run artifact changed after Snapshot freeze: ${artifact.filename}.`,
          { filename: artifact.filename },
        );
      }
    }
  }

  async function getGenerationEvidenceSnapshot(input: {
    projectId: string;
    runId: string;
    verifyArtifacts?: boolean;
  }): Promise<VisualMigrationGenerationEvidenceSnapshotV1> {
    const store = dependencies.imageGenerationRunStoreResolver(input.projectId);
    const raw = await store.readGenerationEvidenceSnapshot(input.runId);
    if (!raw) {
      throw generationEvidenceError(
        GENERATION_EVIDENCE_FINGERPRINT_MISMATCH,
        `Generation Evidence Snapshot does not exist for run ${input.runId}.`,
      );
    }
    const snapshot = validateVisualMigrationGenerationEvidenceSnapshotV1(raw);
    if (snapshot.projectId !== input.projectId || snapshot.runId !== input.runId) {
      throw generationEvidenceError(
        GENERATION_EVIDENCE_AUTHORITY_MISMATCH,
        'Generation Evidence Snapshot run binding is inconsistent.',
      );
    }
    const { policy, canonResolution, packResolution } = await resolveAuthorities(
      input.projectId,
      snapshot.authority.policy.policyId,
    );
    assertAuthorityLinkage(snapshot, policy, canonResolution, packResolution);
    const capability = resolveCapability({
      registryModelId: snapshot.capability.registryModelId,
      provider: snapshot.capability.provider,
      protocol: snapshot.capability.protocol,
    });
    if (capability.capabilityFingerprint !== snapshot.capability.capabilityFingerprint) {
      throw generationEvidenceError(
        GENERATION_EVIDENCE_CAPABILITY_MISMATCH,
        'Current Registry capability differs from the frozen generation evidence.',
      );
    }
    if (input.verifyArtifacts) await verifyArtifacts(store, snapshot);
    return snapshot;
  }

  async function prepareAndPersist(input: PrepareGenerationEvidenceInput) {
    const store = dependencies.imageGenerationRunStoreResolver(input.projectId);
    const run = await store.readRun(input.runId) as RunEvidenceRecord | null;
    if (!run || run.runId !== input.runId || run.projectId !== input.projectId || !run.taskId) {
      throw generationEvidenceError(
        GENERATION_EVIDENCE_AUTHORITY_MISMATCH,
        'Generation run binding is missing or inconsistent.',
      );
    }
    const existingRaw = await store.readGenerationEvidenceSnapshot(input.runId);
    const existing = existingRaw
      ? validateVisualMigrationGenerationEvidenceSnapshotV1(existingRaw)
      : null;
    const [authorities, task, sourceContextSnapshot, compiledPrompt, promptSourceMap, compileFingerprint] = await Promise.all([
      resolveAuthorities(input.projectId, input.policyId),
      requireArtifact(store, input.runId, GENERATION_EVIDENCE_ARTIFACT_FILENAMES.task),
      requireArtifact(store, input.runId, GENERATION_EVIDENCE_ARTIFACT_FILENAMES.sourceContextSnapshot),
      requireArtifact(store, input.runId, GENERATION_EVIDENCE_ARTIFACT_FILENAMES.compiledPrompt),
      requireArtifact(store, input.runId, GENERATION_EVIDENCE_ARTIFACT_FILENAMES.promptSourceMap),
      requireArtifact(store, input.runId, GENERATION_EVIDENCE_ARTIFACT_FILENAMES.compileFingerprint, true),
    ]);
    const requestEvidenceHolder: { current?: ProviderRequestEvidence } = {};
    const execution = await dependencies.referenceExecution.prepare({
      projectId: input.projectId,
      policyId: input.policyId,
      registryModelId: input.registryModelId,
      provider: input.provider,
      protocol: input.protocol,
      locators: { taskReferences: input.taskReferenceLocators ?? {} },
      buildProviderRequest: async (requestInput) => {
        const builtEvidence = await input.buildProviderRequest({
          capability: requestInput.capability,
          references: requestInput.references as unknown as Array<Record<string, unknown>>,
        });
        if (!builtEvidence || !('providerRequest' in builtEvidence)
          || !('redactedProviderRequest' in builtEvidence)) {
          throw generationEvidenceError(
            GENERATION_EVIDENCE_ARTIFACT_TAMPERED,
            'Provider request builder did not return raw and redacted evidence.',
          );
        }
        assertGenerationEvidenceSafePayload(builtEvidence.redactedProviderRequest);
        requestEvidenceHolder.current = builtEvidence;
        return builtEvidence.providerRequest;
      },
    });
    const requestEvidence = requestEvidenceHolder.current;
    if (!requestEvidence) {
      throw generationEvidenceError(
        GENERATION_EVIDENCE_ARTIFACT_TAMPERED,
        'Provider request evidence was not built.',
      );
    }
    const registryCapability = resolveCapability({
      registryModelId: input.registryModelId,
      provider: input.provider,
      protocol: input.protocol,
    });
    if (registryCapability.capabilityFingerprint !== execution.capability.capabilityFingerprint) {
      throw generationEvidenceError(
        GENERATION_EVIDENCE_CAPABILITY_MISMATCH,
        'VM-4 execution capability differs from the current Registry authority.',
      );
    }
    const providerRequestBytes = serializeRunJsonArtifact(requestEvidence.redactedProviderRequest);
    const providerRequestRedacted = buildGenerationEvidenceArtifactRef(
      GENERATION_EVIDENCE_ARTIFACT_FILENAMES.providerRequestRedacted,
      providerRequestBytes,
    );
    const artifacts = {
      task: task!,
      sourceContextSnapshot: sourceContextSnapshot!,
      compiledPrompt: compiledPrompt!,
      promptSourceMap: promptSourceMap!,
      ...(compileFingerprint ? { compileFingerprint } : {}),
      providerRequestRedacted,
    };
    const snapshot = buildVisualMigrationGenerationEvidenceSnapshot({
      projectId: input.projectId,
      runId: input.runId,
      taskId: run.taskId,
      createdAt: existing?.createdAt ?? now(),
      runBinding: {
        ...(run.parentRunId ? { parentRunId: run.parentRunId } : {}),
        ...(run.sourcePreset ? { sourcePreset: run.sourcePreset } : {}),
        ...(run.deliverable ? { deliverable: run.deliverable } : {}),
        ...(run.outputType ? { outputType: run.outputType } : {}),
      },
      policy: authorities.policy,
      canon: authorities.canonResolution.canon,
      referencePack: authorities.packResolution.manifest,
      execution: execution as never,
      artifacts,
    });
    const persistence = await store.writeGenerationEvidenceSnapshotCreateOnce(input.runId, snapshot);
    const validated = await getGenerationEvidenceSnapshot({
      projectId: input.projectId,
      runId: input.runId,
      verifyArtifacts: false,
    });
    if (validated.snapshotFingerprint !== snapshot.snapshotFingerprint) {
      throw generationEvidenceError(
        GENERATION_EVIDENCE_FINGERPRINT_MISMATCH,
        'Generation Evidence Snapshot read-back validation differs from prepared evidence.',
      );
    }
    await store.writeProviderRequest(input.runId, requestEvidence.redactedProviderRequest);
    const persistedRequest = await requireArtifact(
      store,
      input.runId,
      GENERATION_EVIDENCE_ARTIFACT_FILENAMES.providerRequestRedacted,
    );
    if (!persistedRequest || persistedRequest.sha256 !== providerRequestRedacted.sha256
      || persistedRequest.byteSize !== providerRequestRedacted.byteSize) {
      throw generationEvidenceError(
        GENERATION_EVIDENCE_ARTIFACT_TAMPERED,
        'Persisted redacted Provider request differs from the frozen Snapshot evidence.',
      );
    }
    await store.appendEvent(
      input.runId,
      persistence.created
        ? 'VISUAL_MIGRATION_GENERATION_EVIDENCE_CREATED'
        : 'VISUAL_MIGRATION_GENERATION_EVIDENCE_REUSED',
      {
        snapshotId: snapshot.snapshotId,
        snapshotFingerprint: snapshot.snapshotFingerprint,
        reproducibilityFingerprint: snapshot.reproducibilityFingerprint,
        policyId: snapshot.authority.policy.policyId,
        capabilityFingerprint: snapshot.capability.capabilityFingerprint,
      },
    );
    return {
      snapshot,
      snapshotCreated: persistence.created,
      execution,
      providerRequest: requestEvidence.providerRequest,
    };
  }

  async function runPreSubmit<T>(
    input: PrepareGenerationEvidenceInput,
    submitProviderRequest: (providerRequest: unknown) => Promise<T> | T,
  ) {
    const prepared = await prepareAndPersist(input);
    const providerResult = await submitProviderRequest(prepared.providerRequest);
    return { ...prepared, providerResult };
  }

  return { prepareAndPersist, getGenerationEvidenceSnapshot, runPreSubmit };
}

export type VisualMigrationGenerationEvidenceService = ReturnType<
  typeof createVisualMigrationGenerationEvidenceService
>;
