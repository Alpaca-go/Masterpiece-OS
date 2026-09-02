import type {
  VisualMigrationCanonPointerV1,
  VisualMigrationCanonSemanticRuleV1,
  VisualMigrationCanonV1,
} from '@masterpiece/project-contracts/index.ts';
import {
  canonicalSerializeVisualMigrationValue,
  sha256Fingerprint,
} from './visual-migration-reference-pack-contract.ts';

export const VISUAL_MIGRATION_CANON_SCHEMA = 'visual-migration-canon/v1' as const;
export const VISUAL_MIGRATION_CANON_POINTER_SCHEMA = 'visual-migration-canon-pointer/v1' as const;
export const VISUAL_MIGRATION_CANON_COMPILER_VERSION = '1.1.0' as const;

const FINGERPRINT = /^sha256:[a-f0-9]{64}$/u;
const CANON_ID = /^vmc-[a-f0-9]{32}$/u;
const PACK_ID = /^vmrp-[a-f0-9]{32}$/u;
const RULE_ID = /^vmcr-[a-f0-9]{16}$/u;
const RULE_DIMENSIONS = new Set([
  'identity', 'color', 'layout_typography', 'graphic_language',
  'material_photography', 'extension_mechanism',
]);
const RULE_SOURCES = new Set([
  'project_locked_fact', 'locked_asset', 'reference_style_capsule', 'style_profile',
]);
const INVARIANT_LEVELS = new Set(['hard', 'strong', 'adaptive']);
const FORBIDDEN_KEYS = new Set([
  'provider', 'providerId', 'providerParams', 'model', 'modelId', 'authority',
  'weight', 'priority', 'referencePlan', 'materializedReferences',
  'finalReferences', 'selectedReferences', 'absolutePath',
]);

function canonError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

function requireText(value: unknown, field: string): string {
  const text = String(value ?? '').trim();
  if (!text) throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', `${field} 不能为空。`);
  return text;
}

function requireFingerprint(value: unknown, field: string): string {
  const fingerprint = String(value ?? '');
  if (!FINGERPRINT.test(fingerprint)) {
    throw canonError('VISUAL_MIGRATION_CANON_FINGERPRINT_MISMATCH', `${field} fingerprint 格式无效。`);
  }
  return fingerprint;
}

function requireStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim())) {
    throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', `${field} 必须是字符串数组且不得包含空值。`);
  }
  return value;
}

function assertNoRuntimePayload(value: unknown, location = 'canon'): void {
  if (typeof value === 'string') {
    if (/^[a-z]:[\\/]/iu.test(value) || /^\\\\/u.test(value) || /(?:^|[\\/])\.\.(?:[\\/]|$)/u.test(value)) {
      throw canonError('VISUAL_MIGRATION_CANON_PATH_INVALID', `${location} 包含 machine-specific 或 traversal 路径。`);
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
      throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', `${location}.${key} 不属于 VM-2 semantic Canon。`);
    }
    assertNoRuntimePayload(child, `${location}.${key}`);
  }
}

function validateRule(value: unknown, field: string): VisualMigrationCanonSemanticRuleV1 {
  if (!value || typeof value !== 'object') {
    throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', `${field} 必须是规则对象。`);
  }
  const rule = value as VisualMigrationCanonSemanticRuleV1;
  if (!RULE_ID.test(requireText(rule.id, `${field}.id`))) {
    throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', `${field}.id 格式无效。`);
  }
  if (!RULE_DIMENSIONS.has(rule.dimension) || !RULE_SOURCES.has(rule.source)
    || !INVARIANT_LEVELS.has(rule.invariantLevel)) {
    throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', `${field} 规则枚举值无效。`);
  }
  requireText(rule.statement, `${field}.statement`);
  if (rule.allowedVariation !== undefined) requireStringArray(rule.allowedVariation, `${field}.allowedVariation`);
  if (rule.prohibitedVariation !== undefined) requireStringArray(rule.prohibitedVariation, `${field}.prohibitedVariation`);
  return rule;
}

function semanticRuleGroups(canon: VisualMigrationCanonV1): Array<[string, VisualMigrationCanonSemanticRuleV1[]]> {
  return [
    ['projectIdentity.requiredIdentityRules', canon.projectIdentity.requiredIdentityRules],
    ['transferSystem.color', canon.transferSystem.color],
    ['transferSystem.layoutAndTypography', canon.transferSystem.layoutAndTypography],
    ['transferSystem.graphicLanguage', canon.transferSystem.graphicLanguage],
    ['transferSystem.materialAndPhotography', canon.transferSystem.materialAndPhotography],
    ['transferSystem.extensionMechanism', canon.transferSystem.extensionMechanism],
  ];
}

export function computeVisualMigrationCanonSourceFingerprint(input: {
  projectId: string;
  compilerVersion: string;
  projectIdentityFingerprint: string;
  lockedAssetFingerprint: string;
  referencePackSourceFingerprint: string;
  referencePackManifestFingerprint: string;
  capsuleFingerprint: string;
  briefFingerprint?: string;
  styleProfileFingerprint: string;
  creativeDecisionId: string;
}): string {
  return sha256Fingerprint(canonicalSerializeVisualMigrationValue(input));
}

export function buildVisualMigrationCanonId(projectId: string, sourceFingerprint: string): string {
  const digest = sha256Fingerprint(canonicalSerializeVisualMigrationValue({ projectId, sourceFingerprint }));
  return `vmc-${digest.slice('sha256:'.length, 'sha256:'.length + 32)}`;
}

export function computeVisualMigrationCanonFingerprint(
  value: Omit<VisualMigrationCanonV1, 'canonFingerprint'> | VisualMigrationCanonV1,
): string {
  const {
    canonFingerprint: _fingerprint,
    canonId: _canonId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    status: _status,
    ...semanticContent
  } = value as VisualMigrationCanonV1;
  return sha256Fingerprint(canonicalSerializeVisualMigrationValue(semanticContent));
}

export function validateVisualMigrationCanonV1(value: unknown): VisualMigrationCanonV1 {
  if (!value || typeof value !== 'object') {
    throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', 'Visual Migration Canon 必须是对象。');
  }
  const canon = value as VisualMigrationCanonV1;
  if (canon.schemaVersion !== VISUAL_MIGRATION_CANON_SCHEMA) {
    throw canonError('VISUAL_MIGRATION_CANON_SCHEMA_UNSUPPORTED', 'Visual Migration Canon schemaVersion 不受支持。');
  }
  if (!CANON_ID.test(requireText(canon.canonId, 'canonId'))) {
    throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', 'canonId 格式无效。');
  }
  requireText(canon.projectId, 'projectId');
  if (canon.version !== '1.0.0' || !['valid', 'blocked', 'superseded'].includes(canon.status)) {
    throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', 'Canon version 或 status 无效。');
  }
  if (!Number.isFinite(Date.parse(requireText(canon.createdAt, 'createdAt')))
    || !Number.isFinite(Date.parse(requireText(canon.updatedAt, 'updatedAt')))) {
    throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', 'Canon 时间无效。');
  }
  requireFingerprint(canon.sourceFingerprint, 'sourceFingerprint');
  requireFingerprint(canon.canonFingerprint, 'canonFingerprint');
  const referencePackId = String(canon.source?.referencePackId ?? '').trim();
  if (!PACK_ID.test(referencePackId)) {
    throw canonError('VISUAL_MIGRATION_CANON_REFERENCE_PACK_INVALID', 'referencePackId 格式无效。');
  }
  const sourceCompilerVersion = String(canon.source?.compilerVersion ?? '').trim();
  const traceCompilerVersion = String(canon.trace?.compilerVersion ?? '').trim();
  const legacyCompilerIdentity = !sourceCompilerVersion && !traceCompilerVersion;
  if (!legacyCompilerIdentity) {
    if (!/^\d+\.\d+\.\d+$/u.test(sourceCompilerVersion)
      || sourceCompilerVersion !== traceCompilerVersion) {
      throw canonError('VISUAL_MIGRATION_CANON_COMPILER_VERSION_MISMATCH', 'Canon source / trace compilerVersion 无效或不一致。');
    }
  }
  requireText(canon.source?.sourceReferenceAnchorRunId, 'source.sourceReferenceAnchorRunId');
  requireFingerprint(canon.source?.referencePackSourceFingerprint, 'source.referencePackSourceFingerprint');
  requireFingerprint(canon.source?.referencePackManifestFingerprint, 'source.referencePackManifestFingerprint');
  requireFingerprint(canon.source?.capsuleFingerprint, 'source.capsuleFingerprint');
  if (canon.source?.briefFingerprint !== undefined) requireFingerprint(canon.source.briefFingerprint, 'source.briefFingerprint');
  requireFingerprint(canon.source?.styleProfileFingerprint, 'source.styleProfileFingerprint');
  requireFingerprint(canon.source?.lockedAssetFingerprint, 'source.lockedAssetFingerprint');
  requireFingerprint(canon.source?.projectIdentityFingerprint, 'source.projectIdentityFingerprint');
  requireText(canon.source?.creativeDecisionId, 'source.creativeDecisionId');
  requireText(canon.source?.styleProfileId, 'source.styleProfileId');
  if (!Number.isSafeInteger(canon.source?.referenceCount) || canon.source.referenceCount < 1) {
    throw canonError('VISUAL_MIGRATION_CANON_REFERENCE_PACK_INVALID', 'source.referenceCount 必须是正整数。');
  }

  requireStringArray(canon.projectIdentity?.lockedFacts, 'projectIdentity.lockedFacts');
  requireStringArray(canon.projectIdentity?.lockedAssetIds, 'projectIdentity.lockedAssetIds');
  requireText(canon.transferSystem?.goal, 'transferSystem.goal');
  const groups = semanticRuleGroups(canon);
  const ids = new Set<string>();
  let transferRuleCount = 0;
  for (const [field, rules] of groups) {
    if (!Array.isArray(rules)) {
      throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', `${field} 必须是数组。`);
    }
    for (const [index, valueRule] of rules.entries()) {
      const rule = validateRule(valueRule, `${field}[${index}]`);
      if (ids.has(rule.id)) {
        throw canonError('VISUAL_MIGRATION_CANON_DUPLICATE_RULE', `Semantic rule id 重复：${rule.id}`);
      }
      ids.add(rule.id);
      if (field.startsWith('transferSystem.')) transferRuleCount += 1;
      if (field === 'projectIdentity.requiredIdentityRules'
        && (rule.dimension !== 'identity' || !['project_locked_fact', 'locked_asset'].includes(rule.source))) {
        throw canonError('VISUAL_MIGRATION_CANON_IDENTITY_CONFLICT', 'Project identity rule 来源或维度无效。');
      }
    }
  }
  if (transferRuleCount === 0) {
    throw canonError('VISUAL_MIGRATION_CANON_EMPTY_TRANSFER_SYSTEM', 'Canon 至少需要一项可迁移语义规则。');
  }

  const prohibited = canon.prohibitedTransfer;
  for (const key of [
    'userAvoidance', 'referenceBrandNames', 'referenceLogos', 'referenceSlogans',
    'referenceSignatureGraphics', 'referenceProprietaryPatterns', 'prohibitedMutations',
  ] as const) requireStringArray(prohibited?.[key], `prohibitedTransfer.${key}`);
  const prohibitedIdentity = [
    ...prohibited.referenceBrandNames, ...prohibited.referenceLogos, ...prohibited.referenceSlogans,
    ...prohibited.referenceSignatureGraphics, ...prohibited.referenceProprietaryPatterns,
  ].map((item) => item.trim().toLocaleLowerCase());
  for (const rule of canon.projectIdentity.requiredIdentityRules) {
    const statement = rule.statement.toLocaleLowerCase();
    if (prohibitedIdentity.some((term) => term && statement.includes(term))) {
      throw canonError('VISUAL_MIGRATION_CANON_IDENTITY_CONFLICT', 'Reference identity 不得进入 Project identity rules。');
    }
  }

  if (canon.evidence?.visualEvidence?.referencePackId !== canon.source.referencePackId
    || canon.evidence?.visualEvidence?.manifestFingerprint !== canon.source.referencePackManifestFingerprint
    || !Array.isArray(canon.evidence?.visualEvidence?.referenceIds)
    || canon.evidence.visualEvidence.referenceIds.length !== canon.source.referenceCount) {
    throw canonError('VISUAL_MIGRATION_CANON_REFERENCE_PACK_INVALID', 'Visual evidence 与 source 不一致。');
  }
  if (canon.evidence?.semanticEvidence?.capsuleFingerprint !== canon.source.capsuleFingerprint
    || canon.evidence?.semanticEvidence?.styleProfileId !== canon.source.styleProfileId
    || canon.evidence?.semanticEvidence?.creativeDecisionId !== canon.source.creativeDecisionId
    || !Array.isArray(canon.evidence?.semanticEvidence?.lockedAssetIds)) {
    throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', 'Semantic evidence 与 source 不一致。');
  }
  const referenceIds = canon.evidence.visualEvidence.referenceIds;
  if (new Set(referenceIds).size !== referenceIds.length || referenceIds.some((id) => !String(id).trim())) {
    throw canonError('VISUAL_MIGRATION_CANON_REFERENCE_PACK_INVALID', 'Visual evidence referenceIds 无效或重复。');
  }
  if (canon.trace?.sourceReferenceAnchorRunId !== canon.source.sourceReferenceAnchorRunId
    || canon.trace?.referencePackId !== canon.source.referencePackId
    || canon.trace?.sourceFingerprint !== canon.sourceFingerprint) {
    throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', 'Canon trace 与 source 不一致。');
  }
  if (!legacyCompilerIdentity && computeVisualMigrationCanonSourceFingerprint({
    projectId: canon.projectId,
    compilerVersion: sourceCompilerVersion,
    projectIdentityFingerprint: canon.source.projectIdentityFingerprint,
    lockedAssetFingerprint: canon.source.lockedAssetFingerprint,
    referencePackSourceFingerprint: canon.source.referencePackSourceFingerprint,
    referencePackManifestFingerprint: canon.source.referencePackManifestFingerprint,
    capsuleFingerprint: canon.source.capsuleFingerprint,
    ...(canon.source.briefFingerprint ? { briefFingerprint: canon.source.briefFingerprint } : {}),
    styleProfileFingerprint: canon.source.styleProfileFingerprint,
    creativeDecisionId: canon.source.creativeDecisionId,
  }) !== canon.sourceFingerprint) {
    throw canonError('VISUAL_MIGRATION_CANON_FINGERPRINT_MISMATCH', 'sourceFingerprint 未包含一致的 compilerVersion 与输入身份。');
  }
  if (buildVisualMigrationCanonId(canon.projectId, canon.sourceFingerprint) !== canon.canonId) {
    throw canonError('VISUAL_MIGRATION_CANON_FINGERPRINT_MISMATCH', 'canonId 与 sourceFingerprint 不一致。');
  }
  for (const [key, fingerprint] of Object.entries(canon.trace?.inputFingerprints ?? {})) {
    requireText(key, 'trace.inputFingerprints key');
    requireFingerprint(fingerprint, `trace.inputFingerprints.${key}`);
  }
  if (computeVisualMigrationCanonFingerprint(canon) !== canon.canonFingerprint) {
    throw canonError('VISUAL_MIGRATION_CANON_FINGERPRINT_MISMATCH', 'canonFingerprint 不匹配。');
  }
  assertNoRuntimePayload(canon);
  return canon;
}

export function validateVisualMigrationCanonPointerV1(value: unknown): VisualMigrationCanonPointerV1 {
  if (!value || typeof value !== 'object') {
    throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', 'Canon active pointer 必须是对象。');
  }
  const pointer = value as VisualMigrationCanonPointerV1;
  if (pointer.schemaVersion !== VISUAL_MIGRATION_CANON_POINTER_SCHEMA
    || !CANON_ID.test(requireText(pointer.canonId, 'pointer.canonId'))) {
    throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', 'Canon active pointer 无效。');
  }
  requireText(pointer.projectId, 'pointer.projectId');
  requireFingerprint(pointer.sourceFingerprint, 'pointer.sourceFingerprint');
  requireFingerprint(pointer.canonFingerprint, 'pointer.canonFingerprint');
  if (!Number.isFinite(Date.parse(requireText(pointer.updatedAt, 'pointer.updatedAt')))) {
    throw canonError('VISUAL_MIGRATION_CANON_INTEGRITY_FAILED', 'pointer.updatedAt 无效。');
  }
  return pointer;
}
