import assert from 'node:assert/strict';
import test from 'node:test';
import {
  runStructuredRepair,
  type RepairPlanBatch,
} from '../../../packages/analysis-runtime/src/index.ts';
import { structuredAnalysisPacketFixture } from './analysis-runtime-fixtures.ts';

const batch: RepairPlanBatch = {
  id: 'repair-batch-01',
  strategy: 'ai_from_evidence',
  fieldPaths: ['creativeDecision.toneBoundaries'],
  evidencePaths: ['diagnosis.brandMisreadRisks'],
  evidenceRefs: ['diagnosis:risk-1'],
};

test('structured repair runner enforces target fields and emits evidence-backed patches', async () => {
  const result = await runStructuredRepair({
    batch,
    packet: structuredAnalysisPacketFixture(),
    attempt: 1,
    sourceFingerprint: 'fingerprint-generic',
    model: async (request) => {
      assert.deepEqual(request.targetFields, ['creativeDecision.toneBoundaries']);
      const properties = request.responseSchema.properties as Record<string, unknown>;
      const repairsSchema = properties.repairs as Record<string, unknown>;
      assert.equal(repairsSchema.minItems, 1);
      return {
        repairs: [{
          path: 'creativeDecision.toneBoundaries',
          value: [
            { target: 'confident', avoid: ['institutional'] },
            { target: 'warm', avoid: ['decorative nostalgia'] },
          ],
          status: 'inferred',
          confidence: 0.88,
          evidenceRefs: ['diagnosis:risk-1'],
        }],
      };
    },
  });

  assert.equal(result.patches.length, 1);
  assert.equal(result.patches[0]?.value.generatedBy, 'repair_model');
  assert.equal(result.patches[0]?.value.sourceFingerprint, 'fingerprint-generic');
});

test('structured repair runner rejects unrequested fields', async () => {
  await assert.rejects(
    runStructuredRepair({
      batch,
      packet: structuredAnalysisPacketFixture(),
      attempt: 1,
      sourceFingerprint: 'fingerprint-generic',
      model: async () => ({
        repairs: [{
          path: 'lockedAssets',
          value: [{ value: 'replacement' }],
          status: 'inferred',
          confidence: 0.9,
          evidenceRefs: ['diagnosis:risk-1'],
        }],
      }),
    }),
    (error: Error & { code?: string }) => error.code === 'REPAIR_RESPONSE_INVALID',
  );
});

test('structured repair runner does not call a model without evidence', async () => {
  let calls = 0;
  await assert.rejects(
    runStructuredRepair({
      batch: { ...batch, evidenceRefs: [] },
      packet: structuredAnalysisPacketFixture(),
      attempt: 1,
      sourceFingerprint: 'fingerprint-generic',
      model: async () => {
        calls += 1;
        return {};
      },
    }),
    (error: Error & { code?: string }) => error.code === 'REPAIR_EVIDENCE_UNAVAILABLE',
  );
  assert.equal(calls, 0);
});

test('structured repair runner rejects a scalar for an array-valued field', async () => {
  const packet = structuredAnalysisPacketFixture();
  packet.mediaTranslations.spatial.colorBehavior.accent = [];
  const accentBatch: RepairPlanBatch = {
    id: 'repair-batch-01',
    strategy: 'ai_from_evidence',
    fieldPaths: ['mediaTranslations.spatial.colorBehavior.accent'],
    evidencePaths: ['diagnosis.valuableAssets'],
    evidenceRefs: ['asset:motif-1'],
  };

  await assert.rejects(
    () => runStructuredRepair({
      batch: accentBatch,
      packet,
      attempt: 1,
      sourceFingerprint: packet.provenance.sourceFingerprint,
      model: async () => ({
        repairs: [{
          path: 'mediaTranslations.spatial.colorBehavior.accent',
          value: '#B00000',
          status: 'inferred',
          confidence: 0.9,
          evidenceRefs: accentBatch.evidenceRefs,
        }],
      }),
    }),
    (error: Error & { code?: string }) => error.code === 'REPAIR_RESPONSE_INVALID'
      && /invalid value shape/u.test(error.message),
  );
});
