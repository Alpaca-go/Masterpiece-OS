import crypto from 'node:crypto';
import type {
  TaskAwareReferencePolicyV1,
  VisualMigrationCanonV1,
  VisualMigrationReferencePackV1,
} from '@masterpiece/project-contracts/index.ts';
import type { VisualMigrationGenerationEvidenceSnapshotV1 } from './visual-migration-generation-evidence-contract.ts';
import {
  buildGenerationEvidenceSnapshotId,
  computeGenerationEvidenceReproducibilityFingerprint,
  computeGenerationEvidenceSnapshotFingerprint,
  generationEvidenceError,
  GENERATION_EVIDENCE_AUTHORITY_MISMATCH,
  GENERATION_EVIDENCE_CAPABILITY_MISMATCH,
  GENERATION_EVIDENCE_REFERENCE_SET_MISMATCH,
  validateVisualMigrationGenerationEvidenceSnapshotV1,
  VISUAL_MIGRATION_GENERATION_EVIDENCE_SCHEMA,
} from './visual-migration-generation-evidence-contract.ts';
import type { GenerationEvidenceArtifactRef } from './visual-migration-generation-evidence-contract.ts';

interface Vm4ExecutionEvidence {
  policyId: string;
  policyFingerprint: string;
  canonId: string;
  capability: VisualMigrationGenerationEvidenceSnapshotV1['capability'];
  allocation: {
    minimumRequiredReferences: number;
    selectedCandidateIds: string[];
    droppedCandidateIds: string[];
    reserved: { identity?: string; structure?: string; style?: string };
    dropReasons: Array<{ candidateId: string; reason: string }>;
  };
  references: Array<{
    candidateId: string;
    role: VisualMigrationGenerationEvidenceSnapshotV1['referenceDecision']['materializedReferences'][number]['role'];
    providerRole: string;
    sourceKind: VisualMigrationGenerationEvidenceSnapshotV1['referenceDecision']['materializedReferences'][number]['sourceKind'];
    sourceId: string;
    mimeType: string;
    sha256: string;
    byteSize: number;
  }>;
  providerEnvelope: {
    schema: 'visual-migration-provider-reference-envelope/v1';
    capabilityFingerprint: string;
    references: Array<{
      candidateId: string;
      providerRole: string;
      sha256: string;
    }>;
  };
}

export interface BuildVisualMigrationGenerationEvidenceInput {
  projectId: string;
  runId: string;
  taskId: string;
  createdAt: string;
  runBinding?: VisualMigrationGenerationEvidenceSnapshotV1['runBinding'];
  policy: TaskAwareReferencePolicyV1;
  canon: VisualMigrationCanonV1;
  referencePack: VisualMigrationReferencePackV1;
  execution: Vm4ExecutionEvidence;
  artifacts: VisualMigrationGenerationEvidenceSnapshotV1['artifacts'];
}

function exact(expected: string[], actual: string[], label: string): void {
  if (expected.length !== actual.length || expected.some((id, index) => id !== actual[index])) {
    throw generationEvidenceError(
      GENERATION_EVIDENCE_REFERENCE_SET_MISMATCH,
      `${label} does not match the frozen VM-4 allocation.`,
      { expectedCandidateIds: [...expected], actualCandidateIds: [...actual] },
    );
  }
}

export function buildGenerationEvidenceArtifactRef(
  filename: string,
  bytes: Buffer,
): GenerationEvidenceArtifactRef {
  return {
    filename,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    byteSize: bytes.byteLength,
  };
}

export function buildVisualMigrationGenerationEvidenceSnapshot(
  input: BuildVisualMigrationGenerationEvidenceInput,
): VisualMigrationGenerationEvidenceSnapshotV1 {
  const { policy, canon, referencePack, execution } = input;
  if (policy.projectId !== input.projectId || canon.projectId !== input.projectId
    || referencePack.projectId !== input.projectId
    || execution.policyId !== policy.policyId
    || execution.policyFingerprint !== policy.policyFingerprint
    || execution.canonId !== canon.canonId
    || policy.canon.canonId !== canon.canonId
    || policy.canon.canonFingerprint !== canon.canonFingerprint
    || policy.canon.canonSourceFingerprint !== canon.sourceFingerprint
    || policy.referencePack.referencePackId !== referencePack.referencePackId
    || policy.referencePack.manifestFingerprint !== referencePack.manifestFingerprint
    || canon.source.referencePackId !== referencePack.referencePackId
    || canon.source.referencePackManifestFingerprint !== referencePack.manifestFingerprint) {
    throw generationEvidenceError(
      GENERATION_EVIDENCE_AUTHORITY_MISMATCH,
      'Canon, Policy and Reference Pack authority linkage is inconsistent.',
    );
  }
  if (execution.providerEnvelope.capabilityFingerprint !== execution.capability.capabilityFingerprint) {
    throw generationEvidenceError(
      GENERATION_EVIDENCE_CAPABILITY_MISMATCH,
      'VM-4 capability and Provider Envelope fingerprints differ.',
    );
  }
  const selected = [...execution.allocation.selectedCandidateIds];
  const dropped = [...execution.allocation.droppedCandidateIds];
  exact(selected, execution.references.map((reference) => reference.candidateId), 'Materialized evidence');
  exact(selected, execution.providerEnvelope.references.map((reference) => reference.candidateId), 'Provider envelope');
  exact(dropped, execution.allocation.dropReasons.map((reason) => reason.candidateId), 'Drop reasons');
  if (execution.allocation.dropReasons.some((item) =>
    !['non_materializable', 'capacity_surplus'].includes(item.reason))) {
    throw generationEvidenceError(
      GENERATION_EVIDENCE_REFERENCE_SET_MISMATCH,
      'VM-4 allocation contains an unsupported drop reason.',
    );
  }

  const referenceDecision: VisualMigrationGenerationEvidenceSnapshotV1['referenceDecision'] = {
    minimumRequiredReferences: execution.allocation.minimumRequiredReferences,
    reserved: { ...execution.allocation.reserved },
    requestedCandidates: policy.candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      role: candidate.role,
      sourceKind: candidate.sourceKind,
      sourceId: candidate.sourceId,
      retention: candidate.retention,
      ...(candidate.requiredGroup ? { requiredGroup: candidate.requiredGroup } : {}),
      sourceOrder: candidate.sourceOrder,
    })),
    selectedCandidateIds: selected,
    droppedCandidateIds: dropped,
    dropReasons: execution.allocation.dropReasons.map((item) => ({
      candidateId: item.candidateId,
      reason: item.reason as 'non_materializable' | 'capacity_surplus',
    })),
    materializedReferences: execution.references.map((reference) => ({
      candidateId: reference.candidateId,
      role: reference.role,
      providerRole: reference.providerRole,
      sourceKind: reference.sourceKind,
      sourceId: reference.sourceId,
      mimeType: reference.mimeType,
      sha256: reference.sha256,
      byteSize: reference.byteSize,
    })),
  };
  const providerEnvelope: VisualMigrationGenerationEvidenceSnapshotV1['providerEnvelope'] = {
    schema: execution.providerEnvelope.schema,
    capabilityFingerprint: execution.providerEnvelope.capabilityFingerprint,
    candidateIds: execution.providerEnvelope.references.map((reference) => reference.candidateId),
    providerRoles: execution.providerEnvelope.references.map((reference) => reference.providerRole),
    evidenceSha256s: execution.providerEnvelope.references.map((reference) => reference.sha256),
  };
  const authority: VisualMigrationGenerationEvidenceSnapshotV1['authority'] = {
    canon: {
      canonId: canon.canonId,
      canonFingerprint: canon.canonFingerprint,
      canonSourceFingerprint: canon.sourceFingerprint,
      projectIdentityFingerprint: canon.source.projectIdentityFingerprint,
      lockedAssetFingerprint: canon.source.lockedAssetFingerprint,
    },
    referencePack: {
      referencePackId: referencePack.referencePackId,
      manifestFingerprint: referencePack.manifestFingerprint,
    },
    policy: {
      policyId: policy.policyId,
      policyFingerprint: policy.policyFingerprint,
      sourceFingerprint: policy.sourceFingerprint,
      taskFingerprint: policy.task.taskFingerprint,
      candidateSetFingerprint: policy.trace.candidateSetFingerprint,
    },
  };
  const reproducibilityFingerprint = computeGenerationEvidenceReproducibilityFingerprint({
    authority,
    capability: execution.capability,
    referenceDecision,
    providerEnvelope,
    artifacts: input.artifacts,
  });
  const withoutFingerprint: Omit<VisualMigrationGenerationEvidenceSnapshotV1, 'snapshotFingerprint'> = {
    schemaVersion: VISUAL_MIGRATION_GENERATION_EVIDENCE_SCHEMA,
    snapshotId: buildGenerationEvidenceSnapshotId(input.projectId, input.runId, reproducibilityFingerprint),
    reproducibilityFingerprint,
    projectId: input.projectId,
    runId: input.runId,
    taskId: input.taskId,
    createdAt: input.createdAt,
    runBinding: { ...(input.runBinding ?? {}) },
    authority,
    capability: {
      schema: execution.capability.schema,
      registryVersion: execution.capability.registryVersion,
      capabilityVersion: execution.capability.capabilityVersion,
      capabilityFingerprint: execution.capability.capabilityFingerprint,
      registryModelId: execution.capability.registryModelId,
      provider: execution.capability.provider,
      protocol: execution.capability.protocol,
      referenceSupport: true,
      supportsMultipleReferences: execution.capability.supportsMultipleReferences,
      maxReferenceImages: execution.capability.maxReferenceImages,
      supportedReferenceMimeTypes: [...execution.capability.supportedReferenceMimeTypes],
    },
    referenceDecision,
    providerEnvelope,
    artifacts: input.artifacts,
  };
  const snapshot: VisualMigrationGenerationEvidenceSnapshotV1 = {
    ...withoutFingerprint,
    snapshotFingerprint: computeGenerationEvidenceSnapshotFingerprint(withoutFingerprint),
  };
  return validateVisualMigrationGenerationEvidenceSnapshotV1(snapshot);
}
