import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRepairResponse } from '../src/analysis-decisions/repair-response-normalizer.js';
import { runStructuredRepair } from '../src/analysis-decisions/structured-repair-runner.js';

const FIELDS = [
  'creativeDecision.brandRoleStatement',
  'mediaTranslations.spatial.spatialConcept',
  'mediaTranslations.spatial.functionalNetwork',
  'mediaTranslations.spatial.colorBehavior.primary',
];
const REFS = ['asset-1', 'asset-2'];

test('a repairs map and wrapper forms become the expected array', () => {
  const mapForm = normalizeRepairResponse({
    repairs: {
      'spatialConcept': { value: '明档小馆', status: 'inferred', confidence: 0.8, evidenceRefs: [1] },
    },
  }, { fieldPaths: FIELDS, evidenceRefs: REFS });
  assert.equal(mapForm.repairs.length, 1);
  assert.equal(mapForm.repairs[0].path, 'mediaTranslations.spatial.spatialConcept');
  assert.equal(mapForm.repairs[0].evidenceRefs[0], 1);

  const wrapped = normalizeRepairResponse({
    result: { repairs: [{ path: 'creativeDecision.brandRoleStatement', value: '角色', status: 'confirmed', confidence: '80%', evidenceRefs: 'asset-1' }] },
  }, { fieldPaths: FIELDS, evidenceRefs: REFS });
  assert.equal(wrapped.repairs[0].status, 'inferred');
  assert.equal(wrapped.repairs[0].confidence, 0.8);
  assert.deepEqual(wrapped.repairs[0].evidenceRefs, ['asset-1']);

  const bare = normalizeRepairResponse({ path: 'spatialConcept', value: '小馆', status: 'proposed', confidence: 0.5, evidenceRefs: ['asset-2'] }, { fieldPaths: FIELDS, evidenceRefs: REFS });
  assert.equal(bare.repairs[0].path, 'mediaTranslations.spatial.spatialConcept');
});

test('evidence refs are matched leniently, never invented', () => {
  const values = normalizeRepairResponse({
    repairs: [{ path: 'creativeDecision.brandRoleStatement', value: '角色', status: 'inferred', confidence: 1, evidenceRefs: ['#2', 'asset-1(主视觉)'] }],
  }, { fieldPaths: FIELDS, evidenceRefs: REFS });
  assert.deepEqual(values.repairs[0].evidenceRefs, [2, 'asset-1']);

  const missing = normalizeRepairResponse({
    repairs: [{ path: 'creativeDecision.brandRoleStatement', value: '角色', status: 'inferred', confidence: 1 }],
  }, { fieldPaths: FIELDS, evidenceRefs: REFS });
  assert.deepEqual(missing.repairs[0].evidenceRefs, [], 'no fallback evidence may be fabricated');
});

test('values that arrive in the wrong container are converted', () => {
  const result = normalizeRepairResponse({
    repairs: [
      { path: 'mediaTranslations.spatial.functionalNetwork', value: '入口明档；点餐台；取餐口', status: 'inferred', confidence: 0.7, evidenceRefs: ['asset-1'] },
      { path: 'mediaTranslations.spatial.spatialConcept', value: ['热络', '明档'], status: 'inferred', confidence: 0.6, evidenceRefs: ['asset-2'] },
      { path: 'mediaTranslations.spatial.colorBehavior.primary', value: '品牌红', status: 'inferred', confidence: 0.9, evidenceRefs: ['asset-1'] },
    ],
  }, { fieldPaths: FIELDS, evidenceRefs: REFS });
  assert.deepEqual(result.repairs[0].value, ['入口明档', '点餐台', '取餐口']);
  assert.equal(result.repairs[1].value, '热络；明档');
  assert.deepEqual(result.repairs[2].value, [{ name: '品牌红', role: 'primary' }]);
});

test('unknown shapes are returned untouched so the runner can fail loudly', () => {
  const raw = { unexpected: true };
  assert.deepEqual(normalizeRepairResponse(raw, { fieldPaths: FIELDS, evidenceRefs: REFS }), raw);
  assert.equal(normalizeRepairResponse('not json', { fieldPaths: FIELDS, evidenceRefs: REFS }), 'not json');
});

test('the runner accepts a map-shaped model response that used to be rejected', async () => {
  const batch = {
    id: 'batch-1',
    fieldPaths: ['creativeDecision.brandRoleStatement', 'mediaTranslations.spatial.spatialConcept'],
    evidenceRefs: REFS,
    evidencePaths: ['evidence'],
  };
  const packet = { evidence: { asset: 'asset-1' } };
  const result = await runStructuredRepair({
    batch,
    packet,
    attempt: 1,
    sourceFingerprint: 'fp',
    model: async () => ({
      result: {
        repairs: {
          'brandRoleStatement': { value: '社区烟火气', status: 'inferred', confidence: '90%', evidenceRefs: '#1' },
          'spatialConcept': { value: ['社区明档', '热气'], status: 'proposed', confidence: 0.7, evidenceRefs: ['asset-2'] },
        },
      },
    }),
  });
  assert.equal(result.patches.length, 2);
  const byPath = Object.fromEntries(result.patches.map((patch) => [patch.path, patch.value]));
  assert.equal(byPath['creativeDecision.brandRoleStatement'].value, '社区烟火气');
  assert.equal(byPath['creativeDecision.brandRoleStatement'].confidence, 0.9);
  assert.deepEqual(byPath['creativeDecision.brandRoleStatement'].evidenceRefs, ['asset-1']);
  assert.equal(byPath['mediaTranslations.spatial.spatialConcept'].value, '社区明档；热气');
});

test('the runner still rejects fabricated evidence with an actionable message', async () => {
  const batch = { id: 'batch-2', fieldPaths: ['creativeDecision.brandRoleStatement'], evidenceRefs: REFS, evidencePaths: ['evidence'] };
  await assert.rejects(() => runStructuredRepair({
    batch,
    packet: { evidence: { asset: 'asset-1' } },
    attempt: 1,
    sourceFingerprint: 'fp',
    model: async () => ({ repairs: [{ path: 'creativeDecision.brandRoleStatement', value: '角色', status: 'inferred', confidence: 1, evidenceRefs: ['made-up-asset'] }] }),
  }), /unavailable evidence references/);
});
