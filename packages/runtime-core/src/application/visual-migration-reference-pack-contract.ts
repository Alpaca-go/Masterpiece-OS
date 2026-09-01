import crypto from 'node:crypto';
import path from 'node:path';
import type {
  VisualMigrationReferencePackV1,
  VisualMigrationReferencePackReferenceV1,
} from '@masterpiece/project-contracts/index.ts';

export const VISUAL_MIGRATION_REFERENCE_PACK_SCHEMA = 'visual-migration-reference-pack/v1' as const;

const SHA256 = /^[a-f0-9]{64}$/u;
const FINGERPRINT = /^sha256:[a-f0-9]{64}$/u;
const PACK_ID = /^vmrp-[a-f0-9]{32}$/u;

function contractError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

function requireText(value: unknown, field: string): string {
  const text = String(value ?? '').trim();
  if (!text) throw contractError('VISUAL_MIGRATION_REFERENCE_PACK_INVALID', `${field} 不能为空。`);
  return text;
}

/** Canonical JSON serialization with recursively sorted object keys. */
export function canonicalSerializeVisualMigrationValue(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalSerializeVisualMigrationValue(item)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).filter((key) => record[key] !== undefined).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalSerializeVisualMigrationValue(record[key])}`
  ).join(',')}}`;
}

export function sha256Fingerprint(value: string | Buffer): string {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

export function computeVisualMigrationSourceFingerprint(input: {
  projectId: string;
  sourceReferenceAnchorRunId: string;
  referenceSha256: string[];
  capsuleFingerprint?: string;
  briefFingerprint?: string;
}): string {
  return sha256Fingerprint(canonicalSerializeVisualMigrationValue({
    projectId: requireText(input.projectId, 'projectId'),
    sourceReferenceAnchorRunId: requireText(input.sourceReferenceAnchorRunId, 'sourceReferenceAnchorRunId'),
    referenceSha256: [...input.referenceSha256].sort(),
    ...(input.capsuleFingerprint ? { capsuleFingerprint: input.capsuleFingerprint } : {}),
    ...(input.briefFingerprint ? { briefFingerprint: input.briefFingerprint } : {}),
  }));
}

export function buildVisualMigrationReferencePackId(input: {
  projectId: string;
  sourceReferenceAnchorRunId: string;
  sourceFingerprint: string;
}): string {
  const digest = crypto.createHash('sha256')
    .update(canonicalSerializeVisualMigrationValue(input))
    .digest('hex');
  return `vmrp-${digest.slice(0, 32)}`;
}

export function computeVisualMigrationManifestFingerprint(
  manifest: Omit<VisualMigrationReferencePackV1, 'manifestFingerprint'> | VisualMigrationReferencePackV1,
): string {
  const { manifestFingerprint: _ignored, ...content } = manifest as VisualMigrationReferencePackV1;
  return sha256Fingerprint(canonicalSerializeVisualMigrationValue(content));
}

function validateStoragePath(value: unknown): string {
  const storagePath = requireText(value, 'references[].storagePath');
  if (path.isAbsolute(storagePath) || /^[a-z]:/iu.test(storagePath) || storagePath.includes('\\')) {
    throw contractError('VISUAL_MIGRATION_REFERENCE_PACK_PATH_INVALID', 'storagePath 必须是项目内 POSIX 相对路径。');
  }
  const segments = storagePath.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw contractError('VISUAL_MIGRATION_REFERENCE_PACK_PATH_INVALID', 'storagePath 包含非法路径片段。');
  }
  return storagePath;
}

function validateReference(value: unknown): VisualMigrationReferencePackReferenceV1 {
  if (!value || typeof value !== 'object') {
    throw contractError('VISUAL_MIGRATION_REFERENCE_PACK_INVALID', 'references[] 必须是对象。');
  }
  const reference = value as VisualMigrationReferencePackReferenceV1;
  requireText(reference.referenceId, 'references[].referenceId');
  validateStoragePath(reference.storagePath);
  requireText(reference.originalFileName, 'references[].originalFileName');
  requireText(reference.mimeType, 'references[].mimeType');
  if (!Number.isSafeInteger(reference.byteSize) || reference.byteSize < 1) {
    throw contractError('VISUAL_MIGRATION_REFERENCE_PACK_INVALID', 'references[].byteSize 必须是正整数。');
  }
  if (!SHA256.test(String(reference.sha256 || ''))) {
    throw contractError('VISUAL_MIGRATION_REFERENCE_PACK_INVALID', 'references[].sha256 必须是 64 位十六进制 SHA-256。');
  }
  if (reference.role !== 'style_reference') {
    throw contractError('VISUAL_MIGRATION_REFERENCE_PACK_INVALID', 'VM-1 reference role 必须是 style_reference。');
  }
  if (reference.authority !== undefined && reference.authority !== null) {
    throw contractError('VISUAL_MIGRATION_REFERENCE_PACK_INVALID', 'VM-1 authority 仅允许保留值 null。');
  }
  for (const field of ['transferableDimensions', 'forbiddenDimensions'] as const) {
    if (reference[field] !== undefined && (
      !Array.isArray(reference[field])
      || reference[field]!.some((item) => typeof item !== 'string')
    )) {
      throw contractError('VISUAL_MIGRATION_REFERENCE_PACK_INVALID', `${field} 必须是字符串数组。`);
    }
  }
  return reference;
}

export function validateVisualMigrationReferencePackV1(value: unknown): VisualMigrationReferencePackV1 {
  if (!value || typeof value !== 'object') {
    throw contractError('VISUAL_MIGRATION_REFERENCE_PACK_INVALID', 'Reference Pack manifest 必须是对象。');
  }
  const manifest = value as VisualMigrationReferencePackV1;
  if (manifest.schemaVersion !== VISUAL_MIGRATION_REFERENCE_PACK_SCHEMA) {
    throw contractError('VISUAL_MIGRATION_REFERENCE_PACK_SCHEMA_UNSUPPORTED', 'Reference Pack schemaVersion 不受支持。');
  }
  if (!PACK_ID.test(requireText(manifest.referencePackId, 'referencePackId'))) {
    throw contractError('VISUAL_MIGRATION_REFERENCE_PACK_INVALID', 'referencePackId 格式无效。');
  }
  requireText(manifest.projectId, 'projectId');
  requireText(manifest.sourceReferenceAnchorRunId, 'sourceReferenceAnchorRunId');
  if (!Number.isFinite(Date.parse(requireText(manifest.createdAt, 'createdAt')))) {
    throw contractError('VISUAL_MIGRATION_REFERENCE_PACK_INVALID', 'createdAt 不是有效时间。');
  }
  if (!FINGERPRINT.test(String(manifest.sourceFingerprint || ''))) {
    throw contractError('VISUAL_MIGRATION_REFERENCE_PACK_INVALID', 'sourceFingerprint 格式无效。');
  }
  if (!FINGERPRINT.test(String(manifest.manifestFingerprint || ''))) {
    throw contractError('VISUAL_MIGRATION_REFERENCE_PACK_INVALID', 'manifestFingerprint 格式无效。');
  }
  if (!Array.isArray(manifest.references) || manifest.references.length === 0) {
    throw contractError('VISUAL_MIGRATION_REFERENCE_PACK_EMPTY', 'Reference Pack 至少需要一项视觉证据。');
  }
  const references = manifest.references.map(validateReference);
  const ids = new Set<string>();
  for (const reference of references) {
    if (ids.has(reference.referenceId)) {
      throw contractError('VISUAL_MIGRATION_REFERENCE_PACK_DUPLICATE_REFERENCE', `referenceId 重复：${reference.referenceId}`);
    }
    ids.add(reference.referenceId);
  }
  const expected = computeVisualMigrationManifestFingerprint(manifest);
  if (expected !== manifest.manifestFingerprint) {
    throw contractError('VISUAL_MIGRATION_REFERENCE_PACK_MANIFEST_TAMPERED', 'Reference Pack manifest fingerprint 不匹配。');
  }
  return manifest;
}
