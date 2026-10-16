import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-ignore — shared JavaScript parser used by the production provider bridge.
import { parseStructuredResponse } from '@masterpiece/model-runtime/response-parser';
import {
  completeStructuredAnalysis,
  type StructuredRepairModelRequest,
} from '@masterpiece/analysis-runtime/index.ts';
import { structuredAnalysisPacketFixture } from './analysis-runtime-fixtures.ts';

const execution = {
  camera: { focalLength: '24-28mm' },
  outputLanguage: 'zh-CN',
  aspectRatio: '16:9',
};

function toneRepair(request: StructuredRepairModelRequest): unknown {
  return {
    repairs: request.targetFields.map((path) => ({
      path,
      value: path === 'creativeDecision.toneBoundaries'
        ? [
          { target: 'confident', avoid: ['institutional'] },
          { target: 'warm', avoid: ['decorative nostalgia'] },
        ]
        : ['repaired current-project decision'],
      status: 'inferred',
      confidence: 0.88,
      evidenceRefs: ['diagnosis:risk-1'],
    })),
  };
}

test('completion orchestrator records zero repair attempts when analysis is already ready', async () => {
  let calls = 0;
  const result = await completeStructuredAnalysis({
    packet: structuredAnalysisPacketFixture(),
    deliverable: 'space',
    execution,
    model: async () => {
      calls += 1;
      return {};
    },
    runId: 'repair-run-00000000-0000-4000-8000-000000000000',
    now: () => '2026-02-01T00:00:00.000Z',
  });

  assert.equal(result.status, 'ready');
  assert.equal(result.attempts, 0);
  assert.equal(result.modelCallCount, 0);
  assert.equal(calls, 0);
});

test('completion orchestrator repairs missing tone boundaries and reaches ready', async () => {
  const packet = structuredAnalysisPacketFixture();
  packet.creativeDecision.toneBoundaries = [];
  const progress: string[] = [];

  const result = await completeStructuredAnalysis({
    packet,
    deliverable: 'space',
    execution,
    model: async (request) => toneRepair(request),
    runId: 'repair-run-11111111-1111-4111-8111-111111111111',
    now: () => '2026-02-01T00:00:00.000Z',
    onProgress: (stage) => progress.push(stage),
  });

  assert.equal(result.status, 'ready');
  assert.equal(result.attempts, 1);
  assert.equal(result.modelCallCount, 1);
  assert.deepEqual(result.repairedFields, ['creativeDecision.toneBoundaries']);
  assert.deepEqual(result.unresolvedFields, []);
  assert.ok(progress.includes('repairing'));
  assert.ok(progress.includes('revalidation'));
});

test('completion orchestrator stops after two invalid repair attempts', async () => {
  const packet = structuredAnalysisPacketFixture();
  packet.creativeDecision.toneBoundaries = [];

  const result = await completeStructuredAnalysis({
    packet,
    deliverable: 'space',
    execution,
    model: async () => ({ repairs: [] }),
    runId: 'repair-run-22222222-2222-4222-8222-222222222222',
    now: () => '2026-02-01T00:00:00.000Z',
  });

  assert.equal(result.status, 'failed');
  assert.equal(result.attempts, 2);
  assert.equal(result.modelCallCount, 2);
  assert.equal(result.audit.errors.length, 2);
  assert.ok(result.audit.errors.every((error) => (
    error.message.startsWith('Repair model returned invalid structured output.')
  )));
  assert.ok(result.unresolvedFields.includes('creativeDecision.toneBoundaries'));
});

test('completion orchestrator asks about real packaging facts without calling AI', async () => {
  const packet = structuredAnalysisPacketFixture();
  packet.mediaTranslations.packaging.productAndCategoryRole = [];
  packet.mediaTranslations.packaging.structureStrategy = [];
  let calls = 0;

  const result = await completeStructuredAnalysis({
    packet,
    deliverable: 'packaging',
    execution: { outputLanguage: 'zh-CN', aspectRatio: '3:4' },
    model: async () => {
      calls += 1;
      return {};
    },
    runId: 'repair-run-33333333-3333-4333-8333-333333333333',
    now: () => '2026-02-01T00:00:00.000Z',
  });

  assert.equal(result.status, 'requires_confirmation');
  assert.equal(calls, 0);
  assert.equal(result.modelCallCount, 0);
  assert.ok(result.clarificationQuestions.some((question) => (
    /包装内实际放置的产品/u.test(question.question)
  )));
});

test('completion retries invalid shapes with corrective feedback and preserves project facts', async () => {
  const packet = structuredAnalysisPacketFixture();
  packet.creativeDecision.toneBoundaries = [];
  const facts = structuredClone(packet.projectFacts);
  const result = await completeStructuredAnalysis({
    packet,
    deliverable: 'space',
    execution,
    model: async (request) => {
      if (request.attempt === 1) return { repairs: [] };
      assert.match(request.prompt, /上一次校验失败/u);
      assert.match(request.prompt, /every requested path exactly once/u);
      return toneRepair(request);
    },
  });
  assert.equal(result.status, 'ready');
  assert.equal(result.modelCallCount, 2);
  assert.deepEqual(result.packet.projectFacts, facts);
});

test('provider bridge recovers JSON formatting before validating missing spatial decisions', async () => {
  const packet = structuredAnalysisPacketFixture();
  packet.mediaTranslations.spatial.sceneProgram = [];
  packet.mediaTranslations.spatial.functionalRelationships = [];
  packet.mediaTranslations.spatial.functionalNetwork = [];
  const result = await completeStructuredAnalysis({
    packet,
    deliverable: 'space',
    execution,
    model: async (request) => {
      const raw = JSON.stringify({ repairs: request.targetFields.map((path) => ({
        path,
        value: path.endsWith('functionalNetwork')
          ? ['Arrival leads to waiting', 'Staff guides guests to consultation', 'Consultation returns guests to the exit']
          : ['Arrival connects to waiting through a visible circulation boundary'],
        status: 'inferred',
        confidence: 0.8,
        evidenceRefs: ['document:brand-role'],
      })) });
      // A compatible endpoint can return prose and a trailing comma despite
      // response_format. The production bridge normalizes syntax, not facts.
      const formatted = `Here is the JSON:\n${raw.slice(0, -1)},}`;
      assert.throws(() => JSON.parse(formatted));
      return parseStructuredResponse(formatted);
    },
  });
  assert.equal(result.status, 'ready');
  assert.equal(result.modelCallCount, 1);
  assert.equal(result.repairedFields.length, 3);
  assert.deepEqual(result.packet.projectFacts, packet.projectFacts);
});

test('out-of-range citation indexes are rejected and retry uses current-project evidence', async () => {
  const packet = structuredAnalysisPacketFixture();
  packet.mediaTranslations.spatial.sceneProgram = [];
  packet.mediaTranslations.spatial.functionalRelationships = [];
  const result = await completeStructuredAnalysis({
    packet, deliverable: 'space', execution,
    model: async (request) => {
      const variants = (request.responseSchema as any).properties.repairs.items.oneOf;
      const refs = variants[0].properties.evidenceRefs.items.anyOf[0].enum;
      assert.ok(refs.includes('document:brand-role'));
      if (request.attempt === 2) assert.match(request.prompt, /Use only the evidenceRefs listed/u);
      return { repairs: request.targetFields.map((path) => ({
        path, value: ['Arrival connects to consultation through a clearly separated waiting zone'],
        status: 'inferred', confidence: 0.8,
        evidenceRefs: request.attempt === 1 ? [0, 999] : ['document:brand-role'],
      })) };
    },
  });
  assert.equal(result.status, 'ready');
  assert.equal(result.modelCallCount, 2);
  assert.equal(result.repairedFields.length, 2);
});

test('completion orchestrator validates and repairs polluted spatial semantics once', async () => {
  const packet = structuredAnalysisPacketFixture();
  packet.mediaTranslations.spatial.mustBeVisible = ['Logo作为主要视觉焦点'];
  let semanticRepairCalls = 0;
  const validateFinalPacket = (candidate: Record<string, unknown>) => {
    const current = candidate as unknown as typeof packet;
    const invalid = current.mediaTranslations.spatial.mustBeVisible.some((item) => /logo/iu.test(item));
    return { status: invalid ? 'block' as const : 'pass' as const, findings: invalid ? ['logo'] : [] };
  };
  const result = await completeStructuredAnalysis({
    packet,
    deliverable: 'space',
    execution,
    model: async () => ({}),
    validateFinalPacket,
    repairInvalidFinalPacket: async ({ packet: candidate }) => {
      semanticRepairCalls += 1;
      const repaired = structuredClone(candidate) as unknown as typeof packet;
      repaired.mediaTranslations.spatial.mustBeVisible = ['接待台与等候区边界'];
      return repaired as unknown as Record<string, unknown>;
    },
  });
  assert.equal(result.status, 'ready');
  assert.equal(result.modelCallCount, 1);
  assert.equal(semanticRepairCalls, 1);
});

test('completion orchestrator fails closed when spatial repair remains invalid', async () => {
  const packet = structuredAnalysisPacketFixture();
  const result = await completeStructuredAnalysis({
    packet,
    deliverable: 'space',
    execution,
    model: async () => ({}),
    validateFinalPacket: () => ({ status: 'block', findings: ['motif'] }),
    repairInvalidFinalPacket: async ({ packet: candidate }) => candidate,
  });
  assert.equal(result.status, 'failed');
  assert.ok(result.audit.errors.some((error) => error.code === 'ANALYSIS_SPATIAL_SEMANTICS_INVALID'));
});
