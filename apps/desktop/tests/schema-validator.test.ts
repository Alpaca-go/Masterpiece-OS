import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAnalysisPacketSchema } from '@masterpiece/analysis-runtime/index.ts';
import { structuredAnalysisPacketFixture } from './analysis-runtime-fixtures.ts';

test('schema validator returns structured issues instead of a generic insufficiency error', () => {
  const packet = structuredAnalysisPacketFixture();
  packet.creativeDecision.toneBoundaries = [];

  const issues = validateAnalysisPacketSchema(packet);

  assert.ok(issues.some((issue) => (
    issue.path === 'creativeDecision.toneBoundaries'
    && issue.code === 'TONE_BOUNDARIES_MISSING'
    && issue.kind === 'missing'
  )));
});

test('schema validator rejects blank avoid rules and unsupported schema versions', () => {
  const packet = structuredAnalysisPacketFixture();
  packet.schemaVersion = '2.0' as '1.0';
  packet.creativeDecision.toneBoundaries[0] = {
    target: 'confident',
    avoid: [' '],
  };

  const issues = validateAnalysisPacketSchema(packet);

  assert.ok(issues.some((issue) => issue.code === 'SCHEMA_MIGRATION_REQUIRED'));
  assert.ok(issues.some((issue) => issue.code === 'TONE_BOUNDARIES_MISSING'));
});

test('schema validator reports corrupted packet data as fatal-classifiable structure', () => {
  assert.deepEqual(validateAnalysisPacketSchema(null), [{
    path: '$',
    code: 'PROJECT_CONTEXT_CORRUPTED',
    kind: 'invalid',
    message: 'Structured analysis packet must be an object.',
  }]);
});

test('schema validator accepts a structurally complete packet', () => {
  assert.deepEqual(
    validateAnalysisPacketSchema(structuredAnalysisPacketFixture()),
    [],
  );
});
