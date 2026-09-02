import type {
  LockedAsset,
  ReferencePolicyCandidateV1,
  ReferencePolicyTransferDimension,
  TaskAwareReferencePolicyV1,
  VisualMigrationCanonV1,
  VisualMigrationReferenceCandidateDeclarationV1,
  VisualMigrationReferencePackV1,
  VisualMigrationReferenceTaskV1,
} from '@masterpiece/project-contracts/index.ts';
import { validateVisualMigrationCanonV1 } from './visual-migration-canon-contract.ts';
import { validateVisualMigrationReferencePackV1 } from './visual-migration-reference-pack-contract.ts';
import {
  buildVisualMigrationReferencePolicyId,
  computeVisualMigrationReferenceCandidateSetFingerprint,
  computeVisualMigrationReferencePolicyFingerprint,
  computeVisualMigrationReferencePolicySourceFingerprint,
  computeVisualMigrationReferenceTaskFingerprint,
  createReferencePolicyError,
  validateTaskAwareReferencePolicyV1,
  validateVisualMigrationReferenceTaskV1,
  VISUAL_MIGRATION_REFERENCE_POLICY_ACTIVE_PRESET,
  VISUAL_MIGRATION_REFERENCE_POLICY_COMPILER_VERSION,
  VISUAL_MIGRATION_REFERENCE_POLICY_SCHEMA,
  VISUAL_MIGRATION_REFERENCE_POLICY_SURPLUS_ORDER,
} from './visual-migration-reference-policy-contract.ts';
import {
  canonicalSerializeVisualMigrationValue,
  sha256Fingerprint,
} from './visual-migration-reference-pack-contract.ts';

export interface VisualMigrationPolicyProjectAsset {
  id: string;
  mimeType: string;
  status: 'ready' | 'ignored' | 'deleted' | 'failed';
}

export interface BuildVisualMigrationReferencePolicyInput {
  projectId: string;
  task: VisualMigrationReferenceTaskV1;
  canon: VisualMigrationCanonV1;
  referencePack: VisualMigrationReferencePackV1;
  projectAssets?: VisualMigrationPolicyProjectAsset[];
  lockedAssets?: LockedAsset[];
  candidateDeclarations?: VisualMigrationReferenceCandidateDeclarationV1[];
}

const ROLE_ORDER = new Map([
  ['identity_reference', 0], ['structure_reference', 1],
  ['style_reference', 2], ['analysis_only', 3],
]);
const DIMENSIONS = new Set<ReferencePolicyTransferDimension>([
  'color', 'layout_typography', 'graphic_language', 'material_photography', 'extension_mechanism',
]);

function stableCandidateId(sourceKind: string, sourceId: string, role: string): string {
  const fingerprint = sha256Fingerprint(canonicalSerializeVisualMigrationValue({ sourceKind, sourceId, role }));
  return `vrpc-${fingerprint.slice('sha256:'.length, 'sha256:'.length + 16)}`;
}

function dimensions(values: unknown): ReferencePolicyTransferDimension[] {
  if (!Array.isArray(values)) return [];
  const normalized = [...new Set(values.filter(
    (value): value is ReferencePolicyTransferDimension => typeof value === 'string'
      && DIMENSIONS.has(value as ReferencePolicyTransferDimension),
  ))];
  return normalized.sort();
}

function isReadyImage(asset: VisualMigrationPolicyProjectAsset | undefined): boolean {
  return Boolean(asset && asset.status === 'ready' && /^image\/(?:png|jpe?g|webp)$/iu.test(asset.mimeType));
}

function normalizeCandidates(input: BuildVisualMigrationReferencePolicyInput): ReferencePolicyCandidateV1[] {
  const packCandidates: ReferencePolicyCandidateV1[] = input.referencePack.references.map((reference, sourceOrder) => ({
    candidateId: stableCandidateId('visual_migration_reference_pack', reference.referenceId, 'style_reference'),
    sourceKind: 'visual_migration_reference_pack',
    sourceId: reference.referenceId,
    role: 'style_reference',
    retention: 'preferred',
    sourceOrder,
    requiredGroup: 'style_floor',
    transferableDimensions: dimensions(reference.transferableDimensions),
    reasonCodes: ['reference_pack_style_evidence'],
  }));
  if (!packCandidates.length) {
    throw createReferencePolicyError(
      'REFERENCE_POLICY_STYLE_EVIDENCE_REQUIRED',
      'visual_transfer 必须包含当前 Canon 链接的 Reference Pack style evidence。',
    );
  }

  const assets = new Map((input.projectAssets ?? []).map((asset) => [asset.id, asset]));
  const locks = new Map((input.lockedAssets ?? []).map((asset) => [asset.id, asset]));
  const taskReferenceIds = new Set(input.task.taskReferenceIds ?? []);
  const declared: ReferencePolicyCandidateV1[] = [];
  for (const declaration of input.candidateDeclarations ?? []) {
    if (!declaration || typeof declaration !== 'object'
      || !String(declaration.candidateId ?? '').trim()
      || !String(declaration.sourceId ?? '').trim()
      || !['locked_asset', 'project_asset', 'task_reference'].includes(declaration.sourceKind)
      || !['identity_reference', 'structure_reference', 'analysis_only'].includes(declaration.role)
      || !Number.isInteger(declaration.sourceOrder) || declaration.sourceOrder < 0) {
      throw createReferencePolicyError('REFERENCE_POLICY_CANDIDATE_INVALID', '当前项目候选声明无效。');
    }
    let imageAssetId = declaration.imageAssetId ?? declaration.sourceId;
    if (declaration.sourceKind === 'locked_asset') {
      const locked = locks.get(declaration.sourceId);
      if (!locked) {
        throw createReferencePolicyError('REFERENCE_POLICY_CANDIDATE_INVALID', `Locked Asset 不存在：${declaration.sourceId}`);
      }
      imageAssetId = declaration.imageAssetId ?? locked.sourceAssetId ?? '';
      if (locked.sourceAssetId && imageAssetId !== locked.sourceAssetId) {
        throw createReferencePolicyError('REFERENCE_POLICY_CANDIDATE_INVALID', 'Locked Asset image evidence linkage 不一致。');
      }
      if (!locked.sourceAssetId && declaration.role !== 'analysis_only') {
        throw createReferencePolicyError(
          'REFERENCE_POLICY_CANDIDATE_INVALID',
          '纯语义 Locked Asset 不得成为 identity/structure image candidate。',
        );
      }
    }
    if (declaration.sourceKind === 'task_reference' && !taskReferenceIds.has(declaration.sourceId)) {
      throw createReferencePolicyError('REFERENCE_POLICY_CANDIDATE_INVALID', 'task_reference 未被当前任务显式声明。');
    }
    if (declaration.role !== 'analysis_only' && !isReadyImage(assets.get(imageAssetId))) {
      throw createReferencePolicyError(
        'REFERENCE_POLICY_CANDIDATE_INVALID',
        `候选 ${declaration.candidateId} 没有 ready image-backed project asset。`,
      );
    }
    if (declaration.role === 'analysis_only' && imageAssetId && assets.has(imageAssetId)
      && !isReadyImage(assets.get(imageAssetId))) {
      throw createReferencePolicyError('REFERENCE_POLICY_CANDIDATE_INVALID', 'analysis_only 关联了无效项目资产。');
    }
    declared.push({
      candidateId: declaration.candidateId,
      sourceKind: declaration.sourceKind,
      sourceId: declaration.sourceId,
      role: declaration.role,
      retention: declaration.role === 'analysis_only' ? 'non_materializable'
        : declaration.role === 'identity_reference' ? 'preferred' : 'optional',
      sourceOrder: declaration.sourceOrder,
      transferableDimensions: dimensions(declaration.transferableDimensions),
      reasonCodes: [...new Set(declaration.reasonCodes?.length
        ? declaration.reasonCodes
        : [`explicit_${declaration.role}`])].sort(),
    });
  }

  const candidates = [...packCandidates, ...declared];
  const ids = candidates.map((candidate) => candidate.candidateId);
  const sources = candidates.map((candidate) => `${candidate.sourceKind}:${candidate.sourceId}`);
  if (new Set(ids).size !== ids.length) {
    throw createReferencePolicyError('REFERENCE_POLICY_DUPLICATE_CANDIDATE', '候选 ID 或 source identity 重复。');
  }
  if (new Set(sources).size !== sources.length) {
    throw createReferencePolicyError('REFERENCE_POLICY_IDENTITY_CONFLICT', '同一 source entity 不得声明多个 Policy 角色。');
  }
  const explicitStructures = new Set(input.task.explicitStructureCandidateIds ?? []);
  for (const candidateId of explicitStructures) {
    if (!candidates.some((candidate) => candidate.candidateId === candidateId
      && candidate.role === 'structure_reference')) {
      throw createReferencePolicyError(
        'REFERENCE_POLICY_CANDIDATE_INVALID',
        `显式结构候选不存在或角色不符：${candidateId}`,
      );
    }
  }
  for (const candidate of candidates) {
    if (candidate.role === 'identity_reference' && input.task.identityEvidence === 'required_if_available') {
      candidate.requiredGroup = 'identity_floor';
    }
    if (candidate.role === 'structure_reference'
      && input.task.structureEvidence === 'required_if_explicit'
      && explicitStructures.has(candidate.candidateId)) {
      candidate.requiredGroup = 'structure_floor';
      candidate.retention = 'preferred';
    }
  }
  return candidates.sort((left, right) =>
    (ROLE_ORDER.get(left.role) ?? 99) - (ROLE_ORDER.get(right.role) ?? 99)
    || left.sourceOrder - right.sourceOrder
    || left.candidateId.localeCompare(right.candidateId));
}

export function buildVisualMigrationReferencePolicy(
  input: BuildVisualMigrationReferencePolicyInput,
): TaskAwareReferencePolicyV1 {
  if (!String(input.projectId ?? '').trim()) {
    throw createReferencePolicyError('REFERENCE_POLICY_PROJECT_REQUIRED', 'Reference Policy 必须选择项目。');
  }
  const task = validateVisualMigrationReferenceTaskV1(input.task);
  if (task.projectId !== input.projectId) {
    throw createReferencePolicyError('REFERENCE_POLICY_PROJECT_REQUIRED', 'Reference task 与项目不匹配。');
  }
  if (task.preset !== VISUAL_MIGRATION_REFERENCE_POLICY_ACTIVE_PRESET) {
    throw createReferencePolicyError('REFERENCE_POLICY_PRESET_NOT_ACTIVATED', 'VM-3 仅激活 visual_transfer。');
  }
  const canon = validateVisualMigrationCanonV1(input.canon);
  const referencePack = validateVisualMigrationReferencePackV1(input.referencePack);
  if (canon.projectId !== input.projectId) {
    throw createReferencePolicyError('REFERENCE_POLICY_CANON_MISMATCH', 'Canon 不属于当前项目。');
  }
  if (referencePack.projectId !== input.projectId
    || canon.source.referencePackId !== referencePack.referencePackId
    || canon.source.referencePackManifestFingerprint !== referencePack.manifestFingerprint
    || canon.source.referenceCount !== referencePack.references.length) {
    throw createReferencePolicyError('REFERENCE_POLICY_REFERENCE_PACK_INVALID', 'Canon 与 Reference Pack linkage 不一致。');
  }

  const normalizedTask: VisualMigrationReferenceTaskV1 = {
    ...task,
    explicitStructureCandidateIds: [...(task.explicitStructureCandidateIds ?? [])].sort(),
    taskReferenceIds: [...(task.taskReferenceIds ?? [])].sort(),
  };
  const candidates = normalizeCandidates({ ...input, task: normalizedTask, canon, referencePack });
  const taskFingerprint = computeVisualMigrationReferenceTaskFingerprint(normalizedTask);
  const candidateSetFingerprint = computeVisualMigrationReferenceCandidateSetFingerprint(candidates);
  const sourceFingerprint = computeVisualMigrationReferencePolicySourceFingerprint({
    compilerVersion: VISUAL_MIGRATION_REFERENCE_POLICY_COMPILER_VERSION,
    projectId: input.projectId,
    canonId: canon.canonId,
    canonFingerprint: canon.canonFingerprint,
    canonSourceFingerprint: canon.sourceFingerprint,
    referencePackId: referencePack.referencePackId,
    referencePackManifestFingerprint: referencePack.manifestFingerprint,
    taskFingerprint,
    candidateSetFingerprint,
  });
  const identityFloor = normalizedTask.identityEvidence === 'required_if_available'
    && candidates.some((candidate) => candidate.role === 'identity_reference') ? 1 : 0;
  const structureFloor = normalizedTask.structureEvidence === 'required_if_explicit'
    && candidates.some((candidate) => candidate.requiredGroup === 'structure_floor') ? 1 : 0;
  const policy: TaskAwareReferencePolicyV1 = {
    schemaVersion: VISUAL_MIGRATION_REFERENCE_POLICY_SCHEMA,
    policyId: buildVisualMigrationReferencePolicyId(input.projectId, sourceFingerprint),
    compilerVersion: VISUAL_MIGRATION_REFERENCE_POLICY_COMPILER_VERSION,
    projectId: input.projectId,
    preset: VISUAL_MIGRATION_REFERENCE_POLICY_ACTIVE_PRESET,
    sourceFingerprint,
    policyFingerprint: 'sha256:'.padEnd(71, '0'),
    task: { ...normalizedTask, taskFingerprint },
    canon: {
      canonId: canon.canonId,
      canonFingerprint: canon.canonFingerprint,
      canonSourceFingerprint: canon.sourceFingerprint,
    },
    referencePack: {
      referencePackId: referencePack.referencePackId,
      manifestFingerprint: referencePack.manifestFingerprint,
    },
    guarantees: {
      styleFloor: 1,
      identityFloor,
      structureFloor,
      minimumRequiredReferences: 1 + identityFloor + structureFloor,
    },
    candidates,
    surplusOrder: [...VISUAL_MIGRATION_REFERENCE_POLICY_SURPLUS_ORDER],
    trace: { taskFingerprint, candidateSetFingerprint },
  };
  policy.policyFingerprint = computeVisualMigrationReferencePolicyFingerprint(policy);
  return validateTaskAwareReferencePolicyV1(policy);
}
