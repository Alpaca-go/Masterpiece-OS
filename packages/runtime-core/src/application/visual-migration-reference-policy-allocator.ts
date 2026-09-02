import type {
  ReferencePolicyAllocationV1,
  ReferencePolicyCandidateV1,
  ReferencePolicyRole,
  TaskAwareReferencePolicyV1,
} from '@masterpiece/project-contracts/index.ts';
import {
  createReferencePolicyError,
  validateTaskAwareReferencePolicyV1,
} from './visual-migration-reference-policy-contract.ts';

const ROLE_ORDER = new Map<ReferencePolicyRole, number>([
  ['identity_reference', 0],
  ['structure_reference', 1],
  ['style_reference', 2],
  ['analysis_only', 3],
]);

function ordered(candidates: ReferencePolicyCandidateV1[]): ReferencePolicyCandidateV1[] {
  return [...candidates].sort((left, right) =>
    (ROLE_ORDER.get(left.role) ?? 99) - (ROLE_ORDER.get(right.role) ?? 99)
    || left.sourceOrder - right.sourceOrder
    || left.candidateId.localeCompare(right.candidateId));
}

function firstForGroup(
  candidates: ReferencePolicyCandidateV1[],
  group: 'style_floor' | 'identity_floor' | 'structure_floor',
): ReferencePolicyCandidateV1 | undefined {
  return [...candidates]
    .filter((candidate) => candidate.requiredGroup === group
      && candidate.retention !== 'non_materializable'
      && candidate.role !== 'analysis_only')
    .sort((left, right) => left.sourceOrder - right.sourceOrder
      || left.candidateId.localeCompare(right.candidateId))[0];
}

export function allocateVisualMigrationReferencePolicy(
  rawPolicy: TaskAwareReferencePolicyV1,
  maxReferences: number,
): ReferencePolicyAllocationV1 {
  const policy = validateTaskAwareReferencePolicyV1(rawPolicy);
  if (!Number.isInteger(maxReferences) || maxReferences < 1) {
    throw createReferencePolicyError(
      'REFERENCE_POLICY_CAPACITY_INVALID',
      'Reference Policy capacity 必须是正整数。',
    );
  }
  if (maxReferences < policy.guarantees.minimumRequiredReferences) {
    throw createReferencePolicyError(
      'REFERENCE_POLICY_CAPACITY_UNSATISFIABLE',
      `Capacity ${maxReferences} 小于任务最低证据需求 ${policy.guarantees.minimumRequiredReferences}。`,
    );
  }

  const materializable = policy.candidates.filter((candidate) =>
    candidate.role !== 'analysis_only' && candidate.retention !== 'non_materializable');
  const reserved: ReferencePolicyAllocationV1['reserved'] = {};
  const reservedIds = new Set<string>();
  const style = firstForGroup(materializable, 'style_floor');
  if (!style) {
    throw createReferencePolicyError('REFERENCE_POLICY_STYLE_EVIDENCE_REQUIRED', 'Style floor 无可用候选。');
  }
  reserved.style = style.candidateId;
  reservedIds.add(style.candidateId);
  if (policy.guarantees.identityFloor === 1) {
    const identity = firstForGroup(materializable, 'identity_floor');
    if (!identity) {
      throw createReferencePolicyError('REFERENCE_POLICY_INTEGRITY_FAILED', 'Identity floor 无可用候选。');
    }
    reserved.identity = identity.candidateId;
    reservedIds.add(identity.candidateId);
  }
  if (policy.guarantees.structureFloor === 1) {
    const structure = firstForGroup(materializable, 'structure_floor');
    if (!structure) {
      throw createReferencePolicyError('REFERENCE_POLICY_INTEGRITY_FAILED', 'Structure floor 无可用候选。');
    }
    reserved.structure = structure.candidateId;
    reservedIds.add(structure.candidateId);
  }

  const surplus = ordered(materializable.filter((candidate) => !reservedIds.has(candidate.candidateId)));
  const selectedIds = new Set([...reservedIds]);
  for (const candidate of surplus) {
    if (selectedIds.size >= maxReferences) break;
    selectedIds.add(candidate.candidateId);
  }
  const selectedCandidateIds = ordered(materializable.filter((candidate) => selectedIds.has(candidate.candidateId)))
    .map((candidate) => candidate.candidateId);
  const droppedCandidates = policy.candidates.filter((candidate) => !selectedIds.has(candidate.candidateId));
  return {
    policyId: policy.policyId,
    maxReferences,
    minimumRequiredReferences: policy.guarantees.minimumRequiredReferences,
    selectedCandidateIds,
    droppedCandidateIds: droppedCandidates.map((candidate) => candidate.candidateId),
    reserved,
    dropReasons: droppedCandidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      reason: candidate.role === 'analysis_only' || candidate.retention === 'non_materializable'
        ? 'non_materializable' as const
        : 'capacity_surplus' as const,
    })),
  };
}
