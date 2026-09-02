import type {
  ReferencePolicyCandidateV1,
  ReferencePolicyPreset,
  ReferencePolicyRole,
  TaskAwareReferencePolicyV1,
  VisualMigrationReferenceTaskV1,
} from '@masterpiece/project-contracts/index.ts';
import {
  canonicalSerializeVisualMigrationValue,
  sha256Fingerprint,
} from './visual-migration-reference-pack-contract.ts';

export const VISUAL_MIGRATION_REFERENCE_POLICY_SCHEMA = 'visual-migration-reference-policy/v1' as const;
export const VISUAL_MIGRATION_REFERENCE_TASK_SCHEMA = 'visual-migration-reference-task/v1' as const;
export const VISUAL_MIGRATION_REFERENCE_POLICY_COMPILER_VERSION = '1.0.0' as const;
export const VISUAL_MIGRATION_REFERENCE_POLICY_ACTIVE_PRESET = 'visual_transfer' as const;
export const VISUAL_MIGRATION_REFERENCE_POLICY_SURPLUS_ORDER = [
  'identity_reference', 'structure_reference', 'style_reference',
] as const;

const FINGERPRINT = /^sha256:[a-f0-9]{64}$/u;
const POLICY_ID = /^vrp-[a-f0-9]{32}$/u;
const CANON_ID = /^vmc-[a-f0-9]{32}$/u;
const PACK_ID = /^vmrp-[a-f0-9]{32}$/u;
const CANDIDATE_ID = /^[a-z0-9][a-z0-9._:-]{0,127}$/u;
const PRESETS = new Set<ReferencePolicyPreset>([
  'visual_transfer', 'reference_first_space', 'packaging_reference_first',
  'identity_locked_generation', 'analysis_led',
]);
const TASK_KINDS = new Set([
  'brand_hero', 'packaging', 'poster_graphic', 'vi_application',
  'spatial', 'illustration', 'generic',
]);
const ROLES = new Set<ReferencePolicyRole>([
  'identity_reference', 'structure_reference', 'style_reference', 'analysis_only',
]);
const SOURCE_KINDS = new Set([
  'visual_migration_reference_pack', 'locked_asset', 'project_asset', 'task_reference',
]);
const RETENTIONS = new Set(['required', 'preferred', 'optional', 'non_materializable']);
const DIMENSIONS = new Set([
  'color', 'layout_typography', 'graphic_language', 'material_photography', 'extension_mechanism',
]);
const FORBIDDEN_KEYS = new Set([
  'provider', 'providerId', 'providerParams', 'model', 'modelId', 'payload',
  'localPath', 'absolutePath', 'storagePath', 'imageBytes', 'base64', 'sha256',
  'maxReferenceImages', 'maxReferences',
]);

function policyError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

function requireText(value: unknown, field: string): string {
  const text = String(value ?? '').trim();
  if (!text) throw policyError('REFERENCE_POLICY_INTEGRITY_FAILED', `${field} 不能为空。`);
  return text;
}

function requireFingerprint(value: unknown, field: string): string {
  const fingerprint = String(value ?? '');
  if (!FINGERPRINT.test(fingerprint)) {
    throw policyError('REFERENCE_POLICY_FINGERPRINT_MISMATCH', `${field} fingerprint 格式无效。`);
  }
  return fingerprint;
}

function requireIdArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !CANDIDATE_ID.test(item))) {
    throw policyError('REFERENCE_POLICY_CANDIDATE_INVALID', `${field} 必须是稳定 candidate/source ID 数组。`);
  }
  if (new Set(value).size !== value.length) {
    throw policyError('REFERENCE_POLICY_DUPLICATE_CANDIDATE', `${field} 不得重复。`);
  }
  return value;
}

function assertNoRuntimePayload(value: unknown, location = 'policy'): void {
  if (typeof value === 'string') {
    if (/^[a-z]:[\\/]/iu.test(value) || /^\\\\/u.test(value)
      || /(?:^|[\\/])\.\.(?:[\\/]|$)/u.test(value) || /^data:/iu.test(value)) {
      throw policyError('REFERENCE_POLICY_PATH_INVALID', `${location} 包含本地路径、traversal 或内联数据。`);
    }
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoRuntimePayload(item, `${location}[${index}]`));
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(key)) {
      throw policyError('REFERENCE_POLICY_INTEGRITY_FAILED', `${location}.${key} 不属于 VM-3 Policy。`);
    }
    assertNoRuntimePayload(child, `${location}.${key}`);
  }
}

function normalizedTaskIdentity(task: VisualMigrationReferenceTaskV1) {
  return {
    projectId: task.projectId,
    preset: task.preset,
    taskKind: task.taskKind,
    identityEvidence: task.identityEvidence,
    structureEvidence: task.structureEvidence,
    explicitStructureCandidateIds: [...(task.explicitStructureCandidateIds ?? [])].sort(),
    taskReferenceIds: [...(task.taskReferenceIds ?? [])].sort(),
  };
}

function normalizedCandidateIdentity(candidate: ReferencePolicyCandidateV1) {
  return {
    candidateId: candidate.candidateId,
    sourceKind: candidate.sourceKind,
    sourceId: candidate.sourceId,
    role: candidate.role,
    retention: candidate.retention,
    sourceOrder: candidate.sourceOrder,
    requiredGroup: candidate.requiredGroup ?? null,
    transferableDimensions: [...(candidate.transferableDimensions ?? [])].sort(),
    reasonCodes: [...candidate.reasonCodes].sort(),
  };
}

export function validateVisualMigrationReferenceTaskV1(value: unknown): VisualMigrationReferenceTaskV1 {
  if (!value || typeof value !== 'object') {
    throw policyError('REFERENCE_POLICY_INTEGRITY_FAILED', 'Reference task 必须是对象。');
  }
  const task = value as VisualMigrationReferenceTaskV1;
  if (task.schemaVersion !== VISUAL_MIGRATION_REFERENCE_TASK_SCHEMA) {
    throw policyError('REFERENCE_POLICY_INTEGRITY_FAILED', 'Reference task schemaVersion 不受支持。');
  }
  if (typeof task.projectId !== 'string' || !task.projectId.trim()) {
    throw policyError('REFERENCE_POLICY_PROJECT_REQUIRED', 'Reference task 必须绑定项目。');
  }
  if (!PRESETS.has(task.preset)) {
    throw policyError('REFERENCE_POLICY_PRESET_UNSUPPORTED', 'Reference Policy preset 不受支持。');
  }
  if (task.preset !== VISUAL_MIGRATION_REFERENCE_POLICY_ACTIVE_PRESET) {
    throw policyError('REFERENCE_POLICY_PRESET_NOT_ACTIVATED', `Preset ${task.preset} 尚未在 VM-3 激活。`);
  }
  if (!TASK_KINDS.has(task.taskKind)
    || !['required_if_available', 'semantic_only'].includes(task.identityEvidence)
    || !['required_if_explicit', 'not_required'].includes(task.structureEvidence)) {
    throw policyError('REFERENCE_POLICY_INTEGRITY_FAILED', 'Reference task 枚举值无效。');
  }
  requireIdArray(task.explicitStructureCandidateIds ?? [], 'task.explicitStructureCandidateIds');
  requireIdArray(task.taskReferenceIds ?? [], 'task.taskReferenceIds');
  assertNoRuntimePayload(task, 'task');
  return task;
}

export function computeVisualMigrationReferenceTaskFingerprint(task: VisualMigrationReferenceTaskV1): string {
  validateVisualMigrationReferenceTaskV1(task);
  return sha256Fingerprint(canonicalSerializeVisualMigrationValue(normalizedTaskIdentity(task)));
}

export function computeVisualMigrationReferenceCandidateSetFingerprint(
  candidates: ReferencePolicyCandidateV1[],
): string {
  const normalized = candidates.map(normalizedCandidateIdentity)
    .sort((a, b) => a.candidateId.localeCompare(b.candidateId));
  return sha256Fingerprint(canonicalSerializeVisualMigrationValue(normalized));
}

export function computeVisualMigrationReferencePolicySourceFingerprint(input: {
  compilerVersion: string;
  projectId: string;
  canonId: string;
  canonFingerprint: string;
  canonSourceFingerprint: string;
  referencePackId: string;
  referencePackManifestFingerprint: string;
  taskFingerprint: string;
  candidateSetFingerprint: string;
}): string {
  return sha256Fingerprint(canonicalSerializeVisualMigrationValue(input));
}

export function buildVisualMigrationReferencePolicyId(projectId: string, sourceFingerprint: string): string {
  const fingerprint = sha256Fingerprint(canonicalSerializeVisualMigrationValue({ projectId, sourceFingerprint }));
  return `vrp-${fingerprint.slice('sha256:'.length, 'sha256:'.length + 32)}`;
}

export function computeVisualMigrationReferencePolicyFingerprint(
  value: Omit<TaskAwareReferencePolicyV1, 'policyFingerprint'> | TaskAwareReferencePolicyV1,
): string {
  const { policyFingerprint: _fingerprint, ...semantic } = value as TaskAwareReferencePolicyV1;
  return sha256Fingerprint(canonicalSerializeVisualMigrationValue(semantic));
}

function validateCandidate(value: unknown, index: number): ReferencePolicyCandidateV1 {
  if (!value || typeof value !== 'object') {
    throw policyError('REFERENCE_POLICY_CANDIDATE_INVALID', `candidates[${index}] 必须是对象。`);
  }
  const candidate = value as ReferencePolicyCandidateV1;
  if (!CANDIDATE_ID.test(requireText(candidate.candidateId, `candidates[${index}].candidateId`))
    || !SOURCE_KINDS.has(candidate.sourceKind)
    || !ROLES.has(candidate.role)
    || !RETENTIONS.has(candidate.retention)
    || !Number.isInteger(candidate.sourceOrder) || candidate.sourceOrder < 0) {
    throw policyError('REFERENCE_POLICY_CANDIDATE_INVALID', `candidates[${index}] 字段无效。`);
  }
  requireText(candidate.sourceId, `candidates[${index}].sourceId`);
  if (!Array.isArray(candidate.reasonCodes) || !candidate.reasonCodes.length
    || candidate.reasonCodes.some((code) => typeof code !== 'string' || !code.trim())) {
    throw policyError('REFERENCE_POLICY_CANDIDATE_INVALID', `candidates[${index}].reasonCodes 无效。`);
  }
  if (candidate.transferableDimensions !== undefined
    && (!Array.isArray(candidate.transferableDimensions)
      || candidate.transferableDimensions.some((dimension) => !DIMENSIONS.has(dimension)))) {
    throw policyError('REFERENCE_POLICY_CANDIDATE_INVALID', `candidates[${index}].transferableDimensions 无效。`);
  }
  if (candidate.role === 'analysis_only' && candidate.retention !== 'non_materializable') {
    throw policyError('REFERENCE_POLICY_CANDIDATE_INVALID', 'analysis_only 必须是 non_materializable。');
  }
  if (candidate.role !== 'analysis_only' && candidate.retention === 'non_materializable') {
    throw policyError('REFERENCE_POLICY_CANDIDATE_INVALID', '可物化角色不得标记 non_materializable。');
  }
  if (candidate.sourceKind === 'visual_migration_reference_pack' && candidate.role !== 'style_reference') {
    throw policyError('REFERENCE_POLICY_IDENTITY_CONFLICT', 'Reference Pack evidence 只能成为 style_reference。');
  }
  if (candidate.sourceKind !== 'visual_migration_reference_pack' && candidate.role === 'style_reference') {
    throw policyError('REFERENCE_POLICY_IDENTITY_CONFLICT', 'style_reference 必须来自冻结 Reference Pack。');
  }
  return candidate;
}

export function validateTaskAwareReferencePolicyV1(value: unknown): TaskAwareReferencePolicyV1 {
  if (!value || typeof value !== 'object') {
    throw policyError('REFERENCE_POLICY_INTEGRITY_FAILED', 'Task-Aware Reference Policy 必须是对象。');
  }
  const policy = value as TaskAwareReferencePolicyV1;
  if (policy.schemaVersion !== VISUAL_MIGRATION_REFERENCE_POLICY_SCHEMA) {
    throw policyError('REFERENCE_POLICY_INTEGRITY_FAILED', 'Reference Policy schemaVersion 不受支持。');
  }
  assertNoRuntimePayload(policy);
  if (!POLICY_ID.test(requireText(policy.policyId, 'policyId'))
    || policy.compilerVersion !== VISUAL_MIGRATION_REFERENCE_POLICY_COMPILER_VERSION
    || !requireText(policy.projectId, 'projectId')
    || policy.preset !== VISUAL_MIGRATION_REFERENCE_POLICY_ACTIVE_PRESET) {
    throw policyError('REFERENCE_POLICY_INTEGRITY_FAILED', 'Policy identity 字段无效。');
  }
  requireFingerprint(policy.sourceFingerprint, 'sourceFingerprint');
  requireFingerprint(policy.policyFingerprint, 'policyFingerprint');
  const task = validateVisualMigrationReferenceTaskV1(policy.task);
  if (task.projectId !== policy.projectId || task.preset !== policy.preset) {
    throw policyError('REFERENCE_POLICY_INTEGRITY_FAILED', 'Policy task 与顶层 identity 不一致。');
  }
  const expectedTaskFingerprint = computeVisualMigrationReferenceTaskFingerprint(task);
  if (policy.task.taskFingerprint !== expectedTaskFingerprint
    || policy.trace?.taskFingerprint !== expectedTaskFingerprint) {
    throw policyError('REFERENCE_POLICY_FINGERPRINT_MISMATCH', 'taskFingerprint 不匹配。');
  }
  if (!CANON_ID.test(requireText(policy.canon?.canonId, 'canon.canonId'))) {
    throw policyError('REFERENCE_POLICY_CANON_MISMATCH', 'Policy Canon ID 无效。');
  }
  requireFingerprint(policy.canon?.canonFingerprint, 'canon.canonFingerprint');
  requireFingerprint(policy.canon?.canonSourceFingerprint, 'canon.canonSourceFingerprint');
  if (!PACK_ID.test(requireText(policy.referencePack?.referencePackId, 'referencePack.referencePackId'))) {
    throw policyError('REFERENCE_POLICY_REFERENCE_PACK_INVALID', 'Policy Reference Pack ID 无效。');
  }
  requireFingerprint(policy.referencePack?.manifestFingerprint, 'referencePack.manifestFingerprint');
  if (!Array.isArray(policy.candidates) || !policy.candidates.length) {
    throw policyError('REFERENCE_POLICY_STYLE_EVIDENCE_REQUIRED', 'Visual Transfer Policy 缺少候选证据。');
  }
  const candidates = policy.candidates.map(validateCandidate);
  if (new Set(candidates.map((candidate) => candidate.candidateId)).size !== candidates.length) {
    throw policyError('REFERENCE_POLICY_DUPLICATE_CANDIDATE', 'Policy candidateId 重复。');
  }
  if (new Set(candidates.map((candidate) => `${candidate.sourceKind}:${candidate.sourceId}`)).size !== candidates.length) {
    throw policyError('REFERENCE_POLICY_IDENTITY_CONFLICT', '同一 source entity 不得声明多个 Policy 角色。');
  }
  const styleCandidates = candidates.filter((candidate) => candidate.role === 'style_reference');
  if (!styleCandidates.length) {
    throw policyError('REFERENCE_POLICY_STYLE_EVIDENCE_REQUIRED', 'Visual Transfer 必须保留 Pack style evidence。');
  }
  const identityFloor = task.identityEvidence === 'required_if_available'
    && candidates.some((candidate) => candidate.role === 'identity_reference') ? 1 : 0;
  const explicitStructures = new Set(task.explicitStructureCandidateIds ?? []);
  const structureFloor = task.structureEvidence === 'required_if_explicit'
    && candidates.some((candidate) => candidate.role === 'structure_reference'
      && explicitStructures.has(candidate.candidateId)) ? 1 : 0;
  for (const candidate of candidates) {
    const expectedGroup = candidate.role === 'style_reference' ? 'style_floor'
      : candidate.role === 'identity_reference' && identityFloor === 1 ? 'identity_floor'
        : candidate.role === 'structure_reference' && structureFloor === 1
          && explicitStructures.has(candidate.candidateId) ? 'structure_floor'
          : undefined;
    if (candidate.requiredGroup !== expectedGroup) {
      throw policyError('REFERENCE_POLICY_INTEGRITY_FAILED', `Candidate ${candidate.candidateId} required floor 不一致。`);
    }
  }
  const expectedMinimum = 1 + identityFloor + structureFloor;
  if (policy.guarantees?.styleFloor !== 1
    || policy.guarantees?.identityFloor !== identityFloor
    || policy.guarantees?.structureFloor !== structureFloor
    || policy.guarantees?.minimumRequiredReferences !== expectedMinimum) {
    throw policyError('REFERENCE_POLICY_INTEGRITY_FAILED', 'Policy reference floors 不一致。');
  }
  if (canonicalSerializeVisualMigrationValue(policy.surplusOrder)
    !== canonicalSerializeVisualMigrationValue(VISUAL_MIGRATION_REFERENCE_POLICY_SURPLUS_ORDER)) {
    throw policyError('REFERENCE_POLICY_INTEGRITY_FAILED', 'Policy surplus order 已偏离冻结顺序。');
  }
  const candidateSetFingerprint = computeVisualMigrationReferenceCandidateSetFingerprint(candidates);
  if (policy.trace?.candidateSetFingerprint !== candidateSetFingerprint) {
    throw policyError('REFERENCE_POLICY_FINGERPRINT_MISMATCH', 'candidateSetFingerprint 不匹配。');
  }
  const sourceFingerprint = computeVisualMigrationReferencePolicySourceFingerprint({
    compilerVersion: policy.compilerVersion,
    projectId: policy.projectId,
    canonId: policy.canon.canonId,
    canonFingerprint: policy.canon.canonFingerprint,
    canonSourceFingerprint: policy.canon.canonSourceFingerprint,
    referencePackId: policy.referencePack.referencePackId,
    referencePackManifestFingerprint: policy.referencePack.manifestFingerprint,
    taskFingerprint: expectedTaskFingerprint,
    candidateSetFingerprint,
  });
  if (policy.sourceFingerprint !== sourceFingerprint
    || policy.policyId !== buildVisualMigrationReferencePolicyId(policy.projectId, sourceFingerprint)
    || policy.policyFingerprint !== computeVisualMigrationReferencePolicyFingerprint(policy)) {
    throw policyError('REFERENCE_POLICY_FINGERPRINT_MISMATCH', 'Policy fingerprint 或 deterministic ID 不匹配。');
  }
  return policy;
}

export function createReferencePolicyError(code: string, message: string): Error {
  return policyError(code, message);
}
