import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeSourceFingerprint,
  markStaleRepairMetadata,
  type RepairFieldMetadata,
} from '@masterpiece/analysis-runtime/index.ts';

test('source fingerprint is stable across key order and ignores volatile timestamps', () => {
  const left = computeSourceFingerprint({
    projectFacts: { industry: 'service', brandName: 'Example' },
    generatedAt: '2026-01-01T00:00:00.000Z',
  });
  const right = computeSourceFingerprint({
    generatedAt: '2026-02-01T00:00:00.000Z',
    projectFacts: { brandName: 'Example', industry: 'service' },
  });

  assert.equal(left, right);
  assert.notEqual(
    left,
    computeSourceFingerprint({
      projectFacts: { brandName: 'Example', industry: 'retail' },
    }),
  );
});

test('source changes stale inferred fields but preserve confirmed fields', () => {
  const metadata: Record<string, RepairFieldMetadata> = {
    'creativeDecision.toneBoundaries': {
      status: 'inferred',
      confidence: 0.8,
      evidenceRefs: ['source:1'],
      generatedBy: 'repair_model',
      sourceFingerprint: 'sha256:old',
      schemaVersion: '1.0',
      repairVersion: '1.0',
      repairedAt: '2026-01-01T00:00:00.000Z',
    },
    'projectFacts.brandName.value': {
      status: 'confirmed',
      confidence: 1,
      evidenceRefs: ['user:1'],
      generatedBy: 'user',
      sourceFingerprint: 'sha256:old',
      schemaVersion: '1.0',
      repairedAt: '2026-01-01T00:00:00.000Z',
    },
  };

  const result = markStaleRepairMetadata({
    metadata,
    sourceFingerprint: 'sha256:new',
  });

  assert.deepEqual(result.staleFields, ['creativeDecision.toneBoundaries']);
  assert.equal(result.metadata['creativeDecision.toneBoundaries']?.status, 'stale');
  assert.equal(result.metadata['projectFacts.brandName.value']?.status, 'confirmed');
});
