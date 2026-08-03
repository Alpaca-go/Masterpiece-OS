import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const mappingUrl = new URL(
  '../docs/development/creative-intelligence-v2/nice-rule-mapping.json',
  import.meta.url,
);
const schemaUrl = new URL(
  '../schemas/creative-intelligence-v2/creative-decision-v2.schema.json',
  import.meta.url,
);

test('Phase 0 maps every NICE rule to an explicit repository disposition', () => {
  const mapping = JSON.parse(fs.readFileSync(mappingUrl, 'utf8'));
  assert.ok(mapping.rules.length >= 15);
  assert.equal(new Set(mapping.rules.map((item) => item.id)).size, mapping.rules.length);
  for (const rule of mapping.rules) {
    assert.ok(mapping.classifications.includes(rule.classification));
    assert.ok(rule.rule);
    assert.ok(rule.v2Target);
  }
  assert.ok(mapping.rules.some((item) =>
    item.id === 'NICE-AS-PRODUCTION-PROMPT' && item.classification === 'not_applicable'));
});

test('Creative Decision V2 schema requires one confirmed, traceable decision source', () => {
  const schema = JSON.parse(fs.readFileSync(schemaUrl, 'utf8'));
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.properties.schemaVersion.const, '2.0');
  assert.deepEqual(schema.properties.decisionStatus.enum, ['confirmed', 'superseded']);
  assert.ok(schema.required.includes('decisionSource'));
  assert.ok(schema.required.includes('evidenceRefs'));
  assert.ok(schema.properties.decisionSource.properties.mode.enum.includes('legacy_adapter'));
  assert.ok(schema.properties.coreVisualMechanism.required.includes('validationStatus'));
});
