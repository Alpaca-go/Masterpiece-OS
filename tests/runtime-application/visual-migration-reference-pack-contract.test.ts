import test from 'node:test';
import assert from 'node:assert/strict';
import type { VisualMigrationReferencePackV1 } from '@masterpiece/project-contracts/index.ts';
import {
  computeVisualMigrationManifestFingerprint,
  validateVisualMigrationReferencePackV1,
} from '@masterpiece/runtime-core/application/visual-migration-reference-pack-contract.ts';

function manifest(overrides: Partial<VisualMigrationReferencePackV1> = {}): VisualMigrationReferencePackV1 {
  const value: Omit<VisualMigrationReferencePackV1, 'manifestFingerprint'> = {
    schemaVersion: 'visual-migration-reference-pack/v1',
    referencePackId: `vmrp-${'a'.repeat(32)}`,
    projectId: 'project-1',
    sourceReferenceAnchorRunId: 'run-1',
    createdAt: '2026-09-02T00:00:00.000Z',
    sourceFingerprint: `sha256:${'b'.repeat(64)}`,
    references: [{
      referenceId: 'reference-01',
      storagePath: `visual-migration/reference-packs/vmrp-${'a'.repeat(32)}/assets/reference-01.png`,
      originalFileName: 'reference.png',
      mimeType: 'image/png',
      byteSize: 8,
      sha256: 'c'.repeat(64),
      role: 'style_reference',
    }],
    ...overrides,
  };
  return { ...value, manifestFingerprint: computeVisualMigrationManifestFingerprint(value) };
}

test('VM-0 validates a complete VisualMigrationReferencePackV1 manifest', () => {
  assert.equal(validateVisualMigrationReferencePackV1(manifest()).projectId, 'project-1');
});

test('VM-0 rejects unsupported schemaVersion', () => {
  const value = manifest() as VisualMigrationReferencePackV1 & { schemaVersion: string };
  value.schemaVersion = 'visual-migration-reference-pack/v2';
  assert.throws(() => validateVisualMigrationReferencePackV1(value), { code: 'VISUAL_MIGRATION_REFERENCE_PACK_SCHEMA_UNSUPPORTED' });
});

test('VM-0 rejects missing projectId and sourceReferenceAnchorRunId', () => {
  assert.throws(() => validateVisualMigrationReferencePackV1(manifest({ projectId: '' })), { code: 'VISUAL_MIGRATION_REFERENCE_PACK_INVALID' });
  assert.throws(() => validateVisualMigrationReferencePackV1(manifest({ sourceReferenceAnchorRunId: '' })), { code: 'VISUAL_MIGRATION_REFERENCE_PACK_INVALID' });
});

test('VM-0 rejects empty references', () => {
  assert.throws(() => validateVisualMigrationReferencePackV1(manifest({ references: [] })), { code: 'VISUAL_MIGRATION_REFERENCE_PACK_EMPTY' });
});

test('VM-0 rejects duplicate referenceId', () => {
  const item = manifest().references[0]!;
  assert.throws(
    () => validateVisualMigrationReferencePackV1(manifest({ references: [item, { ...item }] })),
    { code: 'VISUAL_MIGRATION_REFERENCE_PACK_DUPLICATE_REFERENCE' },
  );
});

test('VM-0 rejects invalid per-file SHA-256', () => {
  const item = manifest().references[0]!;
  assert.throws(
    () => validateVisualMigrationReferencePackV1(manifest({ references: [{ ...item, sha256: 'not-a-sha' }] })),
    { code: 'VISUAL_MIGRATION_REFERENCE_PACK_INVALID' },
  );
});

test('VM-0 rejects traversal and Windows absolute storage paths', () => {
  const item = manifest().references[0]!;
  for (const storagePath of ['../escape.png', 'assets/../escape.png', 'C:\\escape.png']) {
    assert.throws(
      () => validateVisualMigrationReferencePackV1(manifest({ references: [{ ...item, storagePath }] })),
      { code: 'VISUAL_MIGRATION_REFERENCE_PACK_PATH_INVALID' },
    );
  }
});

test('VM-0 manifest fingerprint is deterministic across object key order', () => {
  const first = manifest();
  const reordered = {
    references: first.references,
    sourceFingerprint: first.sourceFingerprint,
    createdAt: first.createdAt,
    sourceReferenceAnchorRunId: first.sourceReferenceAnchorRunId,
    projectId: first.projectId,
    referencePackId: first.referencePackId,
    schemaVersion: first.schemaVersion,
  };
  assert.equal(
    computeVisualMigrationManifestFingerprint(first),
    computeVisualMigrationManifestFingerprint(reordered),
  );
});

test('VM-0 accepts reserved optional fields without changing the VM-1 role', () => {
  const item = manifest().references[0]!;
  const value = manifest({ references: [{
    ...item,
    authority: null,
    transferableDimensions: ['color relationship'],
    forbiddenDimensions: ['brand identity'],
  }] });
  const validated = validateVisualMigrationReferencePackV1(value);
  assert.equal(validated.references[0]!.role, 'style_reference');
  assert.equal(validated.references[0]!.authority, null);
});

test('VM-0 detects manifest mutation after fingerprinting', () => {
  const value = manifest();
  value.references[0]!.originalFileName = 'mutated.png';
  assert.throws(
    () => validateVisualMigrationReferencePackV1(value),
    { code: 'VISUAL_MIGRATION_REFERENCE_PACK_MANIFEST_TAMPERED' },
  );
});
