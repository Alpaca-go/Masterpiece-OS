import assert from 'node:assert/strict';
import test from 'node:test';
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
    error.message === 'Repair model returned invalid structured output.'
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
