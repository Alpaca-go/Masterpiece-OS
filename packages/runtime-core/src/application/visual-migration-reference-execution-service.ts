import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  LockedAsset,
  ReferencePolicyCandidateV1,
  TaskAwareReferencePolicyV1,
} from '@masterpiece/project-contracts/index.ts';
import {
  PROVIDER_CAPABILITY_CONTRACT_MISMATCH,
  resolveImageReferenceCapability,
} from '@masterpiece/model-registry';
import {
  detectMimeByFileSignature,
  resolveReferenceAsset,
  sha256OfFile,
} from '@masterpiece/image-generation-runtime/reference-engine/reference-asset-resolver.ts';
import type { ProjectStore } from './project-store.ts';
import { allocateVisualMigrationReferencePolicy } from './visual-migration-reference-policy-allocator.ts';
import type { VisualMigrationReferencePackService } from './visual-migration-reference-pack-service.ts';
import type { VisualMigrationReferencePolicyService } from './visual-migration-reference-policy-service.ts';

export const VISUAL_MIGRATION_REFERENCE_MATERIALIZATION_SCHEMA =
  'visual-migration-reference-materialization/v1' as const;
export const VISUAL_MIGRATION_PROVIDER_REFERENCE_ENVELOPE_SCHEMA =
  'visual-migration-provider-reference-envelope/v1' as const;

export const REFERENCE_MATERIALIZATION_SOURCE_NOT_FOUND =
  'REFERENCE_MATERIALIZATION_SOURCE_NOT_FOUND';
export const REFERENCE_MATERIALIZATION_PROJECT_MISMATCH =
  'REFERENCE_MATERIALIZATION_PROJECT_MISMATCH';
export const REFERENCE_MATERIALIZATION_PATH_UNSAFE =
  'REFERENCE_MATERIALIZATION_PATH_UNSAFE';
export const REFERENCE_MATERIALIZATION_MIME_UNSUPPORTED =
  'REFERENCE_MATERIALIZATION_MIME_UNSUPPORTED';
export const REFERENCE_EVIDENCE_INTEGRITY_FAILED = 'REFERENCE_EVIDENCE_INTEGRITY_FAILED';
export const REFERENCE_MATERIALIZATION_SET_MISMATCH =
  'REFERENCE_MATERIALIZATION_SET_MISMATCH';
export const TASK_REFERENCE_LOCATOR_MISSING = 'TASK_REFERENCE_LOCATOR_MISSING';

type CapabilitySnapshot = ReturnType<typeof resolveImageReferenceCapability>;
type Allocation = ReturnType<typeof allocateVisualMigrationReferencePolicy>;

export interface VisualMigrationExecutionLocators {
  taskReferences: Record<string, string>;
}

export interface MaterializedVisualMigrationReference {
  candidateId: string;
  role: ReferencePolicyCandidateV1['role'];
  providerRole: 'current_project_identity' | 'current_project_product' | 'reference_style';
  sourceKind: ReferencePolicyCandidateV1['sourceKind'];
  sourceId: string;
  mimeType: string;
  sha256: string;
  byteSize: number;
  runtimeLocator: { kind: 'project_file'; absolutePath: string };
  bytes: Buffer;
}

interface LockedAssetReader {
  get(projectId: string, assetId: string): Promise<LockedAsset | null>;
}

interface PrepareVisualMigrationReferenceExecutionInput {
  projectId: string;
  policyId: string;
  registryModelId: string;
  provider?: string;
  protocol?: string;
  locators?: VisualMigrationExecutionLocators;
  buildProviderRequest?: (input: {
    capability: CapabilitySnapshot;
    references: ProviderReferenceEnvelopeItem[];
  }) => unknown | Promise<unknown>;
}

export interface ProviderReferenceEnvelopeItem {
  candidateId: string;
  role: MaterializedVisualMigrationReference['role'];
  providerRole: MaterializedVisualMigrationReference['providerRole'];
  sourceKind: MaterializedVisualMigrationReference['sourceKind'];
  sourceId: string;
  mimeType: string;
  sha256: string;
  byteSize: number;
  data: string;
}

function runtimeError(code: string, message: string, details: Record<string, unknown> = {}): Error {
  return Object.assign(new Error(message), { code, ...details });
}

function providerRole(role: ReferencePolicyCandidateV1['role']):
MaterializedVisualMigrationReference['providerRole'] {
  if (role === 'identity_reference') return 'current_project_identity';
  if (role === 'structure_reference') return 'current_project_product';
  if (role === 'style_reference') return 'reference_style';
  throw runtimeError(
    REFERENCE_MATERIALIZATION_SET_MISMATCH,
    `Non-materializable role reached VM-4 materialization: ${role}.`,
  );
}

function assertExactOrderedSet(
  expected: string[],
  actual: string[],
  stage: 'materialization' | 'provider-envelope',
): void {
  if (expected.length !== actual.length
    || expected.some((candidateId, index) => candidateId !== actual[index])) {
    throw runtimeError(
      REFERENCE_MATERIALIZATION_SET_MISMATCH,
      `VM-4 ${stage} candidate order does not match the frozen allocation.`,
      { expectedCandidateIds: [...expected], actualCandidateIds: [...actual] },
    );
  }
}

async function assertSafeRegularFile(projectRoot: string, filename: string): Promise<string> {
  const root = await fs.realpath(projectRoot).catch(() => null);
  const actual = await fs.realpath(filename).catch(() => null);
  if (!root || !actual) {
    throw runtimeError(REFERENCE_MATERIALIZATION_PATH_UNSAFE, 'Reference file cannot be resolved.');
  }
  const relative = path.relative(root, actual);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw runtimeError(REFERENCE_MATERIALIZATION_PATH_UNSAFE, 'Reference file escapes the project root.');
  }
  const stat = await fs.stat(actual).catch(() => null);
  if (!stat?.isFile()) {
    throw runtimeError(REFERENCE_MATERIALIZATION_PATH_UNSAFE, 'Reference evidence is not a regular file.');
  }
  return actual;
}

function assertMime(capability: CapabilitySnapshot, mimeType: string, candidateId: string): void {
  if (!capability.supportedReferenceMimeTypes.includes(mimeType.toLowerCase())) {
    throw runtimeError(
      REFERENCE_MATERIALIZATION_MIME_UNSUPPORTED,
      `Reference ${candidateId} MIME ${mimeType} is unsupported by ${capability.registryModelId}.`,
      { candidateId, mimeType },
    );
  }
}

function mapProjectAssetFailure(candidateId: string, failure: { code: string; message: string }): Error {
  if (failure.code === 'REFERENCE_ASSET_PATH_INVALID'
    || failure.code === 'REFERENCE_ASSET_FILE_UNREADABLE') {
    return runtimeError(REFERENCE_MATERIALIZATION_PATH_UNSAFE, failure.message, { candidateId });
  }
  if (failure.code === 'REFERENCE_ASSET_FORMAT_UNSUPPORTED') {
    return runtimeError(REFERENCE_MATERIALIZATION_MIME_UNSUPPORTED, failure.message, { candidateId });
  }
  if (failure.code === 'REFERENCE_ASSET_SHA_MISMATCH') {
    return runtimeError(REFERENCE_EVIDENCE_INTEGRITY_FAILED, failure.message, { candidateId });
  }
  return runtimeError(REFERENCE_MATERIALIZATION_SOURCE_NOT_FOUND, failure.message, { candidateId });
}

export function buildAllocationBoundProviderReferenceEnvelope(
  capability: CapabilitySnapshot,
  allocation: Allocation,
  references: MaterializedVisualMigrationReference[],
) {
  assertExactOrderedSet(
    allocation.selectedCandidateIds,
    references.map((reference) => reference.candidateId),
    'provider-envelope',
  );
  if (references.length > capability.maxReferenceImages) {
    throw runtimeError(
      PROVIDER_CAPABILITY_CONTRACT_MISMATCH,
      'Materialized references exceed the resolved Provider capability.',
    );
  }
  const envelopeReferences: ProviderReferenceEnvelopeItem[] = references.map((reference) => ({
    candidateId: reference.candidateId,
    role: reference.role,
    providerRole: reference.providerRole,
    sourceKind: reference.sourceKind,
    sourceId: reference.sourceId,
    mimeType: reference.mimeType,
    sha256: reference.sha256,
    byteSize: reference.byteSize,
    data: reference.bytes.toString('base64'),
  }));
  return Object.freeze({
    schema: VISUAL_MIGRATION_PROVIDER_REFERENCE_ENVELOPE_SCHEMA,
    policyId: allocation.policyId,
    capabilityFingerprint: capability.capabilityFingerprint,
    references: Object.freeze(envelopeReferences.map((reference) => Object.freeze(reference))),
  });
}

export function createVisualMigrationReferenceExecutionService(dependencies: {
  projects: ProjectStore;
  referencePolicies: VisualMigrationReferencePolicyService;
  referencePacks: VisualMigrationReferencePackService;
  lockedAssets: LockedAssetReader;
  /** Synthetic resolver seam for contract tests; production composition omits it. */
  capabilityResolver?: typeof resolveImageReferenceCapability;
}) {
  const { projects, referencePolicies, referencePacks, lockedAssets } = dependencies;
  const resolveCapability = dependencies.capabilityResolver ?? resolveImageReferenceCapability;

  async function materializeProjectAsset(
    projectId: string,
    project: Awaited<ReturnType<ProjectStore['get']>>,
    projectRoot: string,
    candidate: ReferencePolicyCandidateV1,
    assetId: string,
    capability: CapabilitySnapshot,
  ): Promise<MaterializedVisualMigrationReference> {
    if (project.id !== projectId) {
      throw runtimeError(
        REFERENCE_MATERIALIZATION_PROJECT_MISMATCH,
        `Project Store returned evidence for a different project: ${project.id}.`,
      );
    }
    const resolution = await resolveReferenceAsset(assetId, { projectRoot }, project.assets);
    if (resolution.status === 'failed') throw mapProjectAssetFailure(candidate.candidateId, resolution.failure);
    const actualPath = await assertSafeRegularFile(projectRoot, resolution.record.absolutePath);
    assertMime(capability, resolution.record.mime, candidate.candidateId);
    const bytes = await fs.readFile(actualPath);
    return {
      candidateId: candidate.candidateId,
      role: candidate.role,
      providerRole: providerRole(candidate.role),
      sourceKind: candidate.sourceKind,
      sourceId: candidate.sourceId,
      mimeType: resolution.record.mime,
      sha256: resolution.record.sha256,
      byteSize: resolution.record.sizeBytes,
      runtimeLocator: { kind: 'project_file', absolutePath: actualPath },
      bytes,
    };
  }

  async function materializeSelected(
    projectId: string,
    policy: TaskAwareReferencePolicyV1,
    capability: CapabilitySnapshot,
    allocation: Allocation,
    locators: VisualMigrationExecutionLocators,
  ): Promise<MaterializedVisualMigrationReference[]> {
    const project = await projects.get(projectId);
    const projectRoot = (await projects.paths(projectId)).root;
    let resolvedPack: Awaited<ReturnType<VisualMigrationReferencePackService['resolve']>> | null = null;
    const candidates = new Map(policy.candidates.map((candidate) => [candidate.candidateId, candidate]));
    const references: MaterializedVisualMigrationReference[] = [];

    for (const candidateId of allocation.selectedCandidateIds) {
      const candidate = candidates.get(candidateId);
      if (!candidate || candidate.role === 'analysis_only') {
        throw runtimeError(
          REFERENCE_MATERIALIZATION_SET_MISMATCH,
          `Selected candidate ${candidateId} is missing or non-materializable.`,
        );
      }
      if (candidate.sourceKind === 'visual_migration_reference_pack') {
        resolvedPack ??= await referencePacks.resolve(
          projectId,
          policy.referencePack.referencePackId,
        ).catch((error: unknown) => {
          const causeCode = String((error as { code?: unknown }).code ?? '');
          const mappedCode = causeCode.includes('PROJECT_MISMATCH')
            ? REFERENCE_MATERIALIZATION_PROJECT_MISMATCH
            : causeCode.includes('PATH_INVALID')
              ? REFERENCE_MATERIALIZATION_PATH_UNSAFE
              : causeCode.includes('INTEGRITY')
                ? REFERENCE_EVIDENCE_INTEGRITY_FAILED
                : REFERENCE_MATERIALIZATION_SOURCE_NOT_FOUND;
          throw runtimeError(
            mappedCode,
            `Reference Pack resolution failed: ${(error as Error).message}`,
            { causeCode },
          );
        });
        if (resolvedPack.manifest.projectId !== projectId
          || resolvedPack.manifest.manifestFingerprint !== policy.referencePack.manifestFingerprint) {
          throw runtimeError(
            REFERENCE_MATERIALIZATION_PROJECT_MISMATCH,
            'Reference Pack does not match the frozen policy or project.',
          );
        }
        const packed = resolvedPack.references.find((reference) => reference.referenceId === candidate.sourceId);
        if (!packed) {
          throw runtimeError(
            REFERENCE_MATERIALIZATION_SOURCE_NOT_FOUND,
            `Reference Pack evidence is missing: ${candidate.sourceId}.`,
          );
        }
        const actualPath = await assertSafeRegularFile(projectRoot, packed.absolutePath);
        const [mimeType, sha256, bytes] = await Promise.all([
          detectMimeByFileSignature(actualPath),
          sha256OfFile(actualPath),
          fs.readFile(actualPath),
        ]);
        if (!mimeType || mimeType !== packed.mimeType.toLowerCase()) {
          throw runtimeError(
            REFERENCE_MATERIALIZATION_MIME_UNSUPPORTED,
            `Reference Pack MIME evidence is invalid: ${candidate.sourceId}.`,
          );
        }
        if (sha256 !== packed.sha256 || bytes.byteLength !== packed.byteSize) {
          throw runtimeError(
            REFERENCE_EVIDENCE_INTEGRITY_FAILED,
            `Reference Pack integrity changed during materialization: ${candidate.sourceId}.`,
          );
        }
        assertMime(capability, mimeType, candidate.candidateId);
        references.push({
          candidateId: candidate.candidateId,
          role: candidate.role,
          providerRole: providerRole(candidate.role),
          sourceKind: candidate.sourceKind,
          sourceId: candidate.sourceId,
          mimeType,
          sha256,
          byteSize: bytes.byteLength,
          runtimeLocator: { kind: 'project_file', absolutePath: actualPath },
          bytes,
        });
        continue;
      }

      let assetId: string;
      if (candidate.sourceKind === 'locked_asset') {
        const locked = await lockedAssets.get(projectId, candidate.sourceId);
        if (!locked) {
          throw runtimeError(
            REFERENCE_MATERIALIZATION_SOURCE_NOT_FOUND,
            `Locked Asset is missing: ${candidate.sourceId}.`,
          );
        }
        if (locked.projectId !== projectId) {
          throw runtimeError(
            REFERENCE_MATERIALIZATION_PROJECT_MISMATCH,
            `Locked Asset belongs to another project: ${candidate.sourceId}.`,
          );
        }
        if (!locked.sourceAssetId) {
          throw runtimeError(
            REFERENCE_MATERIALIZATION_SOURCE_NOT_FOUND,
            `Locked Asset has no Project Store source: ${candidate.sourceId}.`,
          );
        }
        assetId = locked.sourceAssetId;
      } else if (candidate.sourceKind === 'task_reference') {
        if (!policy.task.taskReferenceIds?.includes(candidate.sourceId)) {
          throw runtimeError(
            REFERENCE_MATERIALIZATION_PROJECT_MISMATCH,
            `Task reference is not a member of the frozen task: ${candidate.sourceId}.`,
          );
        }
        assetId = locators.taskReferences[candidate.candidateId] ?? '';
        if (!assetId) {
          throw runtimeError(
            TASK_REFERENCE_LOCATOR_MISSING,
            `Task reference locator is missing: ${candidate.candidateId}.`,
          );
        }
      } else {
        assetId = candidate.sourceId;
      }
      references.push(await materializeProjectAsset(
        projectId, project, projectRoot, candidate, assetId, capability,
      ));
    }

    assertExactOrderedSet(
      allocation.selectedCandidateIds,
      references.map((reference) => reference.candidateId),
      'materialization',
    );
    return references;
  }

  async function prepare(input: PrepareVisualMigrationReferenceExecutionInput) {
    const policy = await referencePolicies.resolve(input.projectId, input.policyId);
    if (policy.projectId !== input.projectId || policy.preset !== 'visual_transfer') {
      throw runtimeError(
        REFERENCE_MATERIALIZATION_PROJECT_MISMATCH,
        'Only the frozen visual_transfer policy may enter VM-4 execution.',
      );
    }
    const capability = resolveCapability({
      registryModelId: input.registryModelId,
      provider: input.provider,
      protocol: input.protocol,
    });
    const allocation = allocateVisualMigrationReferencePolicy(
      policy,
      capability.maxReferenceImages,
    );
    const references = await materializeSelected(
      input.projectId,
      policy,
      capability,
      allocation,
      input.locators ?? { taskReferences: {} },
    );
    const providerEnvelope = buildAllocationBoundProviderReferenceEnvelope(
      capability,
      allocation,
      references,
    );
    const providerRequest = input.buildProviderRequest
      ? await input.buildProviderRequest({
        capability,
        references: [...providerEnvelope.references],
      })
      : undefined;
    return {
      schema: VISUAL_MIGRATION_REFERENCE_MATERIALIZATION_SCHEMA,
      policyId: policy.policyId,
      policyFingerprint: policy.policyFingerprint,
      canonId: policy.canon.canonId,
      capability,
      allocation,
      references,
      providerEnvelope,
      providerRequest,
    };
  }

  return { prepare };
}

export type VisualMigrationReferenceExecutionService = ReturnType<
  typeof createVisualMigrationReferenceExecutionService
>;
