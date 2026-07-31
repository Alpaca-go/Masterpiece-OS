import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evidenceSafeMerge,
  type RepairFieldPatch,
} from '../../../packages/analysis-runtime/src/index.ts';
import { structuredAnalysisPacketFixture } from './analysis-runtime-fixtures.ts';

function patch(path: string, value: unknown): RepairFieldPatch {
  return {
    path,
    value: {
      value,
      status: 'inferred',
      confidence: 0.86,
      evidenceRefs: ['diagnosis:risk-1'],
      generatedBy: 'repair_model',
      sourceFingerprint: 'fingerprint-generic',
      schemaVersion: '1.0',
      repairVersion: '1.0',
    },
  };
}

test('evidence-safe merge fills only a missing field and records provenance', () => {
  const packet = structuredAnalysisPacketFixture();
  packet.creativeDecision.toneBoundaries = [];

  const result = evidenceSafeMerge({
    packet,
    sourceFingerprint: 'fingerprint-generic',
    repairedAt: '2026-02-01T00:00:00.000Z',
    patches: [patch('creativeDecision.toneBoundaries', [
      { target: 'confident', avoid: ['institutional'] },
      { target: 'warm', avoid: ['nostalgic decoration'] },
    ])],
  });

  assert.deepEqual(result.applied, ['creativeDecision.toneBoundaries']);
  assert.equal(
    result.metadata['creativeDecision.toneBoundaries']?.generatedBy,
    'repair_model',
  );
  const metadata = result.packet.repairMetadata as {
    fields: Record<string, { repairedAt: string }>;
  };
  assert.equal(
    metadata.fields['creativeDecision.toneBoundaries']?.repairedAt,
    '2026-02-01T00:00:00.000Z',
  );
});

test('evidence-safe merge rejects locked assets and existing decisions', () => {
  const packet = structuredAnalysisPacketFixture();

  const result = evidenceSafeMerge({
    packet,
    sourceFingerprint: 'fingerprint-generic',
    patches: [
      patch('lockedAssets.0.value', 'Replacement logo'),
      patch('creativeDecision.brandRoleStatement', 'Replacement statement'),
    ],
  });

  assert.deepEqual(result.applied, []);
  assert.deepEqual(result.rejected.sort(), [
    'creativeDecision.brandRoleStatement',
    'lockedAssets.0.value',
  ]);
  assert.ok(result.conflicts.includes('LOCKED_ASSET_CONFLICT:lockedAssets.0.value'));
  assert.ok(result.conflicts.includes(
    'EXISTING_VALUE_CONFLICT:creativeDecision.brandRoleStatement',
  ));
});

test('evidence-safe merge rejects changes to user-confirmed fields even when empty', () => {
  const packet = structuredAnalysisPacketFixture();
  packet.mediaTranslations.spatial.sceneProgram = [];

  const result = evidenceSafeMerge({
    packet,
    sourceFingerprint: 'fingerprint-generic',
    confirmedPaths: ['mediaTranslations.spatial.sceneProgram'],
    patches: [
      patch('mediaTranslations.spatial.sceneProgram', ['replacement program']),
    ],
  });

  assert.deepEqual(result.applied, []);
  assert.deepEqual(result.conflicts, [
    'CONFIRMED_FIELD_CONFLICT:mediaTranslations.spatial.sceneProgram',
  ]);
});

test('evidence-safe merge may replace a validated-invalid target but not a confirmed one', () => {
  const packet = structuredAnalysisPacketFixture();
  packet.creativeDecision.toneBoundaries = [
    { target: 'confident', avoid: [] },
  ];
  const replacement = patch('creativeDecision.toneBoundaries', [
    { target: 'confident', avoid: ['institutional'] },
    { target: 'warm', avoid: ['decorative nostalgia'] },
  ]);

  const repaired = evidenceSafeMerge({
    packet,
    sourceFingerprint: 'fingerprint-generic',
    repairablePaths: ['creativeDecision.toneBoundaries'],
    patches: [replacement],
  });
  assert.deepEqual(repaired.applied, ['creativeDecision.toneBoundaries']);

  const protectedResult = evidenceSafeMerge({
    packet,
    sourceFingerprint: 'fingerprint-generic',
    repairablePaths: ['creativeDecision.toneBoundaries'],
    confirmedPaths: ['creativeDecision.toneBoundaries'],
    patches: [replacement],
  });
  assert.deepEqual(protectedResult.applied, []);
  assert.deepEqual(protectedResult.conflicts, [
    'CONFIRMED_FIELD_CONFLICT:creativeDecision.toneBoundaries',
  ]);
});

test('evidence-safe merge rejects ungrounded or stale repair output', () => {
  const packet = structuredAnalysisPacketFixture();
  packet.creativeDecision.toneBoundaries = [];
  const invalid = patch('creativeDecision.toneBoundaries', []);
  invalid.value.evidenceRefs = [];
  invalid.value.sourceFingerprint = 'fingerprint-stale';

  const result = evidenceSafeMerge({
    packet,
    sourceFingerprint: 'fingerprint-generic',
    patches: [invalid],
  });

  assert.deepEqual(result.rejected, ['creativeDecision.toneBoundaries']);
  assert.deepEqual(result.conflicts, [
    'REPAIR_EVIDENCE_INVALID:creativeDecision.toneBoundaries',
  ]);
});
