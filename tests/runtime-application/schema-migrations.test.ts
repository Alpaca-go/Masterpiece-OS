import assert from 'node:assert/strict';
import test from 'node:test';
import { migrateAnalysisPacket } from '@masterpiece/analysis-runtime/index.ts';
import { structuredAnalysisPacketFixture } from './analysis-runtime-fixtures.ts';

test('legacy packet migration initializes new shape and requests targeted repair', () => {
  const packet = structuredClone(structuredAnalysisPacketFixture()) as unknown as Record<string, unknown>;
  delete packet.schemaVersion;
  const diagnosis = packet.diagnosis as Record<string, unknown>;
  delete diagnosis.brandMisreadRisks;
  const creativeDecision = packet.creativeDecision as Record<string, unknown>;
  delete creativeDecision.toneBoundaries;

  const result = migrateAnalysisPacket(packet, '2026-02-01T00:00:00.000Z');

  assert.equal(result.fromVersion, 'unversioned');
  assert.equal(result.toVersion, '1.0');
  assert.deepEqual(
    (result.packet.creativeDecision as Record<string, unknown>).toneBoundaries,
    [],
  );
  assert.ok(result.requiresRepair.includes('creativeDecision.toneBoundaries'));
  assert.ok(result.requiresRepair.includes('diagnosis.brandMisreadRisks'));
  assert.equal(
    JSON.stringify(result.packet).includes('confident'),
    false,
    'migration must not invent a project-specific tone answer',
  );
});

test('schema migration fails closed for an unknown future schema', () => {
  const packet = structuredClone(structuredAnalysisPacketFixture()) as unknown as Record<string, unknown>;
  packet.schemaVersion = '99.0';

  assert.throws(
    () => migrateAnalysisPacket(packet),
    (error: Error & { code?: string }) => error.code === 'SCHEMA_MIGRATION_FAILED',
  );
});
