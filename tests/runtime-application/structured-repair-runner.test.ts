import assert from 'node:assert/strict';
import test from 'node:test';
import {
  runStructuredRepair,
  type RepairPlanBatch,
} from '@masterpiece/analysis-runtime/index.ts';
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
      const variants = (repairsSchema.items as { oneOf: Array<{ properties: { evidenceRefs: { items: { anyOf: Array<{ enum: string[] }> } } } }> }).oneOf;
      assert.deepEqual(variants[0].properties.evidenceRefs.items.anyOf[0].enum, batch.evidenceRefs);
      assert.ok(request.prompt.includes(JSON.stringify(request.responseSchema)));
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

test('structured spatial repair requires arrays for all three missing function fields', async () => {
  const fieldPaths = [
    'mediaTranslations.spatial.sceneProgram',
    'mediaTranslations.spatial.functionalRelationships',
    'mediaTranslations.spatial.functionalNetwork',
  ];
  const result = await runStructuredRepair({
    batch: { ...batch, fieldPaths },
    packet: structuredAnalysisPacketFixture(),
    attempt: 1,
    sourceFingerprint: 'fingerprint-generic',
    model: async (request) => {
      const schema = request.responseSchema as any;
      for (const variant of schema.properties.repairs.items.oneOf) {
        assert.equal(variant.properties.value.type, 'array');
        assert.equal(variant.properties.value.items.type, 'string');
        assert.equal(variant.properties.value.minItems,
          variant.properties.path.enum[0].endsWith('functionalNetwork') ? 3 : 1);
      }
      return { repairs: fieldPaths.map((path) => ({
        path,
        value: path.endsWith('functionalNetwork')
          ? ['Arrival leads to waiting', 'Staff guides guests to consultation', 'Consultation returns guests to the exit']
          : ['Arrival connects to waiting through a visible circulation boundary'],
        status: 'inferred',
        confidence: 0.8,
        evidenceRefs: batch.evidenceRefs,
      })) };
    },
  });
  assert.deepEqual(result.patches.map((patch) => patch.path), fieldPaths);
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

test('functional network repair rejects fewer than the three required functional links', async () => {
  const path = 'mediaTranslations.spatial.functionalNetwork';
  await assert.rejects(runStructuredRepair({
    batch: { ...batch, fieldPaths: [path] },
    packet: structuredAnalysisPacketFixture(),
    attempt: 1,
    sourceFingerprint: 'fingerprint-generic',
    model: async () => ({ repairs: [{
      path,
      value: ['Arrival leads to waiting'],
      status: 'inferred',
      confidence: 0.8,
      evidenceRefs: batch.evidenceRefs,
    }] }),
  }), /invalid value shape/u);
});

test('evidence schema and prompt example agree with the current-project allowlist', async () => {
  const refs = ['evidence-alpha', 'evidence-beta'];
  await runStructuredRepair({
    batch: { ...batch, evidenceRefs: refs },
    packet: structuredAnalysisPacketFixture(),
    attempt: 1,
    sourceFingerprint: 'fingerprint-generic',
    model: async (request) => {
      const schema = request.responseSchema as any;
      assert.deepEqual(schema.properties.repairs.items.oneOf[0].properties.evidenceRefs.items.anyOf[0].enum, refs);
      assert.match(request.prompt, /"evidenceRefs": \["evidence-alpha"\]/u);
      assert.ok(!request.prompt.includes('["允许引用"]'));
      return { repairs: [{
        path: batch.fieldPaths[0],
        value: [{ target: 'confident', avoid: ['institutional'] }, { target: 'warm', avoid: ['generic'] }],
        status: 'inferred', confidence: 0.8, evidenceRefs: ['evidence-alpha'],
      }] };
    },
  });
});

test('repair still rejects foreign evidence even when an endpoint ignores the enum', async () => {
  await assert.rejects(runStructuredRepair({
    batch,
    packet: structuredAnalysisPacketFixture(),
    attempt: 1,
    sourceFingerprint: 'fingerprint-generic',
    model: async () => ({ repairs: [{
      path: batch.fieldPaths[0],
      value: [{ target: 'confident', avoid: ['institutional'] }, { target: 'warm', avoid: ['generic'] }],
      status: 'inferred', confidence: 0.8, evidenceRefs: ['foreign-project-evidence'],
    }] }),
  }), /unavailable evidence references/u);
});

test('explicit evidence indexes resolve only to the numbered current-request IDs', async () => {
  const refs = ['current-source-alpha', 'current-source-beta'];
  const run = (evidenceRefs: unknown[]) => runStructuredRepair({
    batch: { ...batch, evidenceRefs: refs },
    packet: structuredAnalysisPacketFixture(), attempt: 1, sourceFingerprint: 'fingerprint-generic',
    model: async (request) => {
      assert.ok(request.prompt.includes('1. current-source-alpha\n2. current-source-beta'));
      const variants = (request.responseSchema as any).properties.repairs.items.oneOf;
      assert.deepEqual(variants[0].properties.evidenceRefs.items.anyOf[1].enum, [1, 2]);
      return { repairs: [{ path: batch.fieldPaths[0],
        value: [{ target: 'confident', avoid: ['institutional'] }, { target: 'warm', avoid: ['generic'] }],
        status: 'inferred', confidence: 0.8, evidenceRefs,
      }] };
    },
  });
  const result = await run([2, 1, 2]);
  assert.deepEqual(result.patches[0].value.evidenceRefs, [refs[1], refs[0]]);
  for (const ref of [0, -1, 3, 1.5, '1', null]) {
    await assert.rejects(run([refs[0], ref]), /unavailable evidence references/u);
  }
});
