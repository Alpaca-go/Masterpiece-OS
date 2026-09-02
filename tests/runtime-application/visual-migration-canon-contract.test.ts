import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { VisualMigrationCanonV1 } from '@masterpiece/project-contracts/index.ts';
import {
  buildVisualMigrationCanonId,
  computeVisualMigrationCanonFingerprint,
  computeVisualMigrationCanonSourceFingerprint,
  VISUAL_MIGRATION_CANON_COMPILER_VERSION,
  validateVisualMigrationCanonV1,
} from '@masterpiece/runtime-core/application/visual-migration-canon-contract.ts';
import { canonicalSerializeVisualMigrationValue } from '@masterpiece/runtime-core/application/visual-migration-reference-pack-contract.ts';

const fp = (char: string) => `sha256:${char.repeat(64)}`;

test('VM-2 generated Canon fixture remains contract-valid and free of runtime payloads', () => {
  const fixture = JSON.parse(fs.readFileSync(
    path.resolve('docs/runtime/fixtures/visual-migration-canon-v1.example.json'),
    'utf8',
  ));
  assert.doesNotThrow(() => validateVisualMigrationCanonV1(fixture));
  assert.doesNotMatch(JSON.stringify(fixture), /absolutePath|provider|modelId|materializedReferences|imageBytes/u);
});

function canon(): VisualMigrationCanonV1 {
  const source = {
    compilerVersion: VISUAL_MIGRATION_CANON_COMPILER_VERSION,
    sourceReferenceAnchorRunId: 'run-1',
    referencePackId: `vmrp-${'b'.repeat(32)}`,
    referencePackSourceFingerprint: fp('c'),
    referencePackManifestFingerprint: fp('d'),
    referenceCount: 1,
    capsuleFingerprint: fp('e'),
    briefFingerprint: fp('f'),
    creativeDecisionId: 'creative-decision-quick-run-1',
    styleProfileId: 'style-1',
    styleProfileFingerprint: fp('1'),
    lockedAssetFingerprint: fp('2'),
    projectIdentityFingerprint: fp('3'),
  };
  const sourceFingerprint = computeVisualMigrationCanonSourceFingerprint({
    projectId: 'project-1',
    compilerVersion: source.compilerVersion,
    projectIdentityFingerprint: source.projectIdentityFingerprint,
    lockedAssetFingerprint: source.lockedAssetFingerprint,
    referencePackSourceFingerprint: source.referencePackSourceFingerprint,
    referencePackManifestFingerprint: source.referencePackManifestFingerprint,
    capsuleFingerprint: source.capsuleFingerprint,
    briefFingerprint: source.briefFingerprint,
    styleProfileFingerprint: source.styleProfileFingerprint,
    creativeDecisionId: source.creativeDecisionId,
  });
  const value: VisualMigrationCanonV1 = {
    schemaVersion: 'visual-migration-canon/v1',
    canonId: buildVisualMigrationCanonId('project-1', sourceFingerprint),
    projectId: 'project-1',
    version: '1.0.0',
    status: 'valid',
    createdAt: '2026-09-02T00:00:00.000Z',
    updatedAt: '2026-09-02T00:00:00.000Z',
    sourceFingerprint,
    canonFingerprint: fp('0'),
    source,
    projectIdentity: {
      brandName: '当前品牌',
      lockedFacts: ['当前 Logo 必须保留'],
      lockedAssetIds: ['lock-1'],
      requiredIdentityRules: [{
        id: `vmcr-${'1'.repeat(16)}`,
        dimension: 'identity',
        statement: '当前 Logo 必须保留',
        source: 'project_locked_fact',
        invariantLevel: 'hard',
      }],
    },
    transferSystem: {
      goal: '迁移视觉机制',
      color: [{
        id: `vmcr-${'2'.repeat(16)}`,
        dimension: 'color',
        statement: '低饱和暖色',
        source: 'reference_style_capsule',
        invariantLevel: 'strong',
      }],
      layoutAndTypography: [],
      graphicLanguage: [],
      materialAndPhotography: [],
      extensionMechanism: [],
    },
    prohibitedTransfer: {
      userAvoidance: [],
      referenceBrandNames: ['参考品牌'],
      referenceLogos: [],
      referenceSlogans: [],
      referenceSignatureGraphics: [],
      referenceProprietaryPatterns: [],
      prohibitedMutations: ['不得修改当前 Logo'],
    },
    evidence: {
      visualEvidence: {
        referencePackId: `vmrp-${'b'.repeat(32)}`,
        manifestFingerprint: fp('d'),
        referenceIds: ['reference-01'],
      },
      semanticEvidence: {
        capsuleFingerprint: fp('e'),
        styleProfileId: 'style-1',
        creativeDecisionId: 'creative-decision-quick-run-1',
        lockedAssetIds: ['lock-1'],
      },
    },
    trace: {
      compilerVersion: VISUAL_MIGRATION_CANON_COMPILER_VERSION,
      sourceReferenceAnchorRunId: 'run-1',
      referencePackId: `vmrp-${'b'.repeat(32)}`,
      sourceFingerprint,
      inputFingerprints: {
        projectIdentity: fp('3'), lockedAssets: fp('2'), styleProfile: fp('1'), capsule: fp('e'),
      },
    },
  };
  value.canonFingerprint = computeVisualMigrationCanonFingerprint(value);
  return value;
}

function refingerprint(value: VisualMigrationCanonV1): VisualMigrationCanonV1 {
  value.canonId = buildVisualMigrationCanonId(value.projectId, value.sourceFingerprint);
  value.canonFingerprint = computeVisualMigrationCanonFingerprint(value);
  return value;
}

test('VM-2 contract validates a complete VisualMigrationCanonV1', () => {
  assert.equal(validateVisualMigrationCanonV1(canon()).status, 'valid');
});

test('VM-2 contract rejects unsupported schemaVersion', () => {
  const value = canon() as VisualMigrationCanonV1 & { schemaVersion: string };
  value.schemaVersion = 'visual-migration-canon/v2';
  assert.throws(() => validateVisualMigrationCanonV1(value), { code: 'VISUAL_MIGRATION_CANON_SCHEMA_UNSUPPORTED' });
});

test('VM-2 contract rejects missing projectId and referencePackId', () => {
  const missingProject = canon();
  missingProject.projectId = '';
  assert.throws(() => validateVisualMigrationCanonV1(missingProject), { code: 'VISUAL_MIGRATION_CANON_INTEGRITY_FAILED' });
  const missingPack = canon();
  missingPack.source.referencePackId = '';
  assert.throws(() => validateVisualMigrationCanonV1(missingPack), { code: 'VISUAL_MIGRATION_CANON_REFERENCE_PACK_INVALID' });
});

test('VM-2 contract rejects an invalid fingerprint', () => {
  const value = canon();
  value.canonFingerprint = fp('9');
  assert.throws(() => validateVisualMigrationCanonV1(value), { code: 'VISUAL_MIGRATION_CANON_FINGERPRINT_MISMATCH' });
});

test('VM-2 contract rejects an empty transfer system', () => {
  const value = canon();
  value.transferSystem.color = [];
  refingerprint(value);
  assert.throws(() => validateVisualMigrationCanonV1(value), { code: 'VISUAL_MIGRATION_CANON_EMPTY_TRANSFER_SYSTEM' });
});

test('VM-2 contract rejects duplicate semantic rule ids', () => {
  const value = canon();
  value.transferSystem.graphicLanguage = [{ ...value.transferSystem.color[0]!, dimension: 'graphic_language' }];
  refingerprint(value);
  assert.throws(() => validateVisualMigrationCanonV1(value), { code: 'VISUAL_MIGRATION_CANON_DUPLICATE_RULE' });
});

test('VM-2 contract rejects absolute and traversal values', () => {
  for (const statement of ['C:\\secret\\asset.png', '../escape']) {
    const value = canon();
    value.transferSystem.color[0]!.statement = statement;
    refingerprint(value);
    assert.throws(() => validateVisualMigrationCanonV1(value), { code: 'VISUAL_MIGRATION_CANON_PATH_INVALID' });
  }
});

test('VM-2 contract rejects reference identity inside project identity rules', () => {
  const value = canon();
  value.projectIdentity.requiredIdentityRules[0]!.statement = '保留参考品牌身份';
  refingerprint(value);
  assert.throws(() => validateVisualMigrationCanonV1(value), { code: 'VISUAL_MIGRATION_CANON_IDENTITY_CONFLICT' });
});

test('VM-2 contract rejects Provider and materialized-reference payload fields', () => {
  for (const extra of [{ provider: 'seedream' }, { materializedReferences: [] }]) {
    const value = Object.assign(canon(), extra);
    value.canonFingerprint = computeVisualMigrationCanonFingerprint(value);
    assert.throws(() => validateVisualMigrationCanonV1(value), { code: 'VISUAL_MIGRATION_CANON_INTEGRITY_FAILED' });
  }
});

test('VM-2 canonical serialization is deterministic across key order', () => {
  assert.equal(
    canonicalSerializeVisualMigrationValue({ b: 2, a: { d: 4, c: 3 } }),
    canonicalSerializeVisualMigrationValue({ a: { c: 3, d: 4 }, b: 2 }),
  );
});

test('VM-2 canon fingerprint changes when semantic content changes', () => {
  const value = canon();
  const before = value.canonFingerprint;
  value.transferSystem.color[0]!.statement = '高饱和冷色';
  assert.notEqual(computeVisualMigrationCanonFingerprint(value), before);
});

test('VM-2 canon fingerprint ignores lifecycle metadata', () => {
  const value = canon();
  assert.equal(computeVisualMigrationCanonFingerprint({
    ...value,
    status: 'superseded',
    createdAt: '2027-01-01T00:00:00.000Z',
    updatedAt: '2027-01-02T00:00:00.000Z',
  }), value.canonFingerprint);
});

test('VM-2.1 contract rejects mismatched source and trace compiler identity', () => {
  const value = canon();
  value.trace.compilerVersion = '1.0.0';
  value.canonFingerprint = computeVisualMigrationCanonFingerprint(value);
  assert.throws(() => validateVisualMigrationCanonV1(value), {
    code: 'VISUAL_MIGRATION_CANON_COMPILER_VERSION_MISMATCH',
  });
});

test('VM-2.1 compiler identity participates in source fingerprint and Canon id', () => {
  const value = canon();
  const common = {
    projectId: value.projectId,
    projectIdentityFingerprint: value.source.projectIdentityFingerprint,
    lockedAssetFingerprint: value.source.lockedAssetFingerprint,
    referencePackSourceFingerprint: value.source.referencePackSourceFingerprint,
    referencePackManifestFingerprint: value.source.referencePackManifestFingerprint,
    capsuleFingerprint: value.source.capsuleFingerprint,
    briefFingerprint: value.source.briefFingerprint,
    styleProfileFingerprint: value.source.styleProfileFingerprint,
    creativeDecisionId: value.source.creativeDecisionId,
  };
  const oldFingerprint = computeVisualMigrationCanonSourceFingerprint({ ...common, compilerVersion: '1.0.0' });
  const currentFingerprint = computeVisualMigrationCanonSourceFingerprint({
    ...common,
    compilerVersion: VISUAL_MIGRATION_CANON_COMPILER_VERSION,
  });
  assert.notEqual(currentFingerprint, oldFingerprint);
  assert.notEqual(
    buildVisualMigrationCanonId(value.projectId, currentFingerprint),
    buildVisualMigrationCanonId(value.projectId, oldFingerprint),
  );
});

test('VM-2.1 contract detects compiler identity tampering through source fingerprint validation', () => {
  const value = canon();
  value.source.compilerVersion = '1.2.0';
  value.trace.compilerVersion = '1.2.0';
  value.canonFingerprint = computeVisualMigrationCanonFingerprint(value);
  assert.throws(() => validateVisualMigrationCanonV1(value), {
    code: 'VISUAL_MIGRATION_CANON_FINGERPRINT_MISMATCH',
  });
});
