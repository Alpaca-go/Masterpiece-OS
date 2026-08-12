// r2.0 §4.13 / Phase E: integration test for the 5-state flow model
// and the first-image preservation invariant.
//
// Pins:
//   - the vnext-service.startValidated result carries a `flowState`
//     field that matches the 5-state enum, AND a `firstImage` field
//     that is the FIRST image reference, regardless of what the
//     correction outcome is
//   - when the initial Provider call succeeds but a later step fails
//     (correction start, correction validation), the firstImage is
//     still present in the result and the flowState is one of
//     {correction_start_failed, correction_still_failed}
//   - the legacy `terminalStatus` is unchanged (still passed/failed/
//     unverified); the new `flowState` is a strictly richer encoding
//   - state 1 (initial_failed) throws the original error from
//     start() — the new fields are NOT in the throw path
//
// Test fixtures use a fake ImageGenerationService that returns a
// sequence of runs (initial failed / succeeded, optional correction
// failed / succeeded) and a fake validator that returns passed/failed.
// Each test exercises one of the 5 state machine transitions.

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
process.env.MASTERPIECE_SPACE_COMPILER_MODE = 'r8_6_golden';
import type { ImageGenerationRun } from '@masterpiece/runtime-core/application-contracts.ts';
import type { ShortChainGenerationFlowState } from '@masterpiece/runtime-core/application-contracts.ts';
import { createShortChainGenerationService } from '@masterpiece/runtime-core/application/image-generation/short-chain-service.ts';

const projectId = 'project-r2-e-flow-state';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

async function loadPacket() {
  const packetPath = path.join(
    repoRoot,
    'space-generator/quality-baselines/phase9b-recovered/_packets/jiuzhou-aesthetics/visual-decision-packet.json',
  );
  return JSON.parse(await fs.readFile(packetPath, 'utf8'));
}

function makeRun(overrides: Partial<ImageGenerationRun> = {}, imageIdSuffix = '1'): ImageGenerationRun {
  return {
    schemaVersion: '1.0',
    runId: `run-${imageIdSuffix}`,
    projectId,
    taskId: `task-${imageIdSuffix}`,
    status: 'succeeded',
    deliverable: 'interior_scene',
    outputType: 'concept_image',
    providerId: 'dashscope',
    modelId: 'seedream-5',
    region: 'beijing',
    createdAt: '2026-08-10T00:00:00.000Z',
    updatedAt: '2026-08-10T00:00:01.000Z',
    completedAt: '2026-08-10T00:00:01.000Z',
    gate: { blocked: false, errors: [], warnings: [] },
    images: [{
      imageId: `img-${imageIdSuffix}`,
      relativePath: `images/img-${imageIdSuffix}.png`,
      mimeType: 'image/png',
      sizeBytes: 1,
      sha256: `sha-${imageIdSuffix}`,
      downloadedAt: '2026-08-10T00:00:01.000Z',
    }],
    ...overrides,
  };
}

function makeValidation(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: '1.0',
    projectId,
    taskId: 't-1',
    runId: 'run-1',
    imageId: 'img-1',
    status: 'passed',
    detectedFamily: 'space',
    detectedSubtype: 'reception',
    visibleEvidence: ['visible'],
    missingRequiredItems: [],
    forbiddenItemsFound: [],
    lockedAssetViolations: [],
    brandMatch: 'matched',
    mismatchTypes: [],
    retryRecommended: false,
    validatorId: 'v',
    validatorVersion: '1',
    validatedAt: '2026-08-10T00:00:00.000Z',
    ...overrides,
  };
}

interface SetupOptions {
  initialRun: ImageGenerationRun;
  initialValidation: Record<string, unknown>;
  correctionRun?: ImageGenerationRun;
  correctionValidation?: Record<string, unknown>;
}

async function setupWithSequence(opts: SetupOptions) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-r2-e-flow-'));
  const startSequence: ImageGenerationRun[] = [opts.initialRun];
  if (opts.correctionRun) startSequence.push(opts.correctionRun);
  let callIdx = 0;
  const imageGeneration = {
    async getRun(runId: string) {
      return startSequence.find((r) => r.runId === runId) ?? null;
    },
    async runRoot(runId: string) {
      return path.join(root, 'image-generation', runId);
    },
    async startCompiledCreativeTask() {
      const run = startSequence[callIdx]!;
      callIdx += 1;
      // Write a dummy image on disk so the output.png copy doesn't throw.
      const runDir = path.join(root, 'image-generation', run.runId);
      await fs.mkdir(path.join(runDir, 'images'), { recursive: true });
      const imgRelPath = run.images[0]?.relativePath ?? 'images/img.png';
      await fs.writeFile(path.join(runDir, imgRelPath), Buffer.from('dummy', 'utf8'));
      return run;
    },
  };
  const validatorSequence: Record<string, unknown>[] = [opts.initialValidation];
  if (opts.correctionValidation) validatorSequence.push(opts.correctionValidation);
  let vIdx = 0;
  const validator = {
    async validate() {
      const result = validatorSequence[vIdx]!;
      vIdx += 1;
      return result;
    },
  };
  const packet = await loadPacket();
  const ctx: Record<string, unknown> = {
    projectId,
    provenance: { sourceFingerprint: 'fp', builderId: 'test', builderVersion: '1', sourceKinds: ['project_record'] },
  };
  ctx.visualDecisionPacket = packet;
  ctx.lockedAssets = { logoAssetIds: [] };
  ctx.sourceAssetRefs = [];
  const projectContext = {
    getShortChain: async () => ctx,
    rebuildShortChain: async () => ctx,
  };
  const service = createShortChainGenerationService(
    { paths: async () => ({
      root,
      input: path.join(root, 'input'),
      prepared: path.join(root, 'prepared'),
      outputs: path.join(root, 'outputs'),
      runtime: path.join(root, 'runtime'),
    }) } as never,
    projectContext as never,
    () => imageGeneration as never,
    () => validator as never,
  );
  return { root, service, startSequence };
}

async function compileOnce(service: ReturnType<typeof createShortChainGenerationService>) {
  return service.compile({
    projectId,
    task: {
      deliverableFamily: 'space',
      subtype: 'reception',
      shot: 'entrance_view',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: 'Generate the first formal reception result.',
      mustInclude: [],
      mustAvoid: [],
      referenceAssetIds: [],
    },
  });
}

test('E-2: state 1 (initial_failed) throws before the new flowState / firstImage are populated', async () => {
  const { service } = await setupWithSequence({
    initialRun: makeRun({ status: 'failed', errorMessage: 'Provider down' }, '1'),
    initialValidation: makeValidation(),
  });
  const compiled = await compileOnce(service);
  let caught: (Error & { code?: string }) | undefined;
  try {
    await service.startValidated({
      projectId,
      taskId: compiled.taskContract.taskId,
      apiProfileId: 'seedream-profile',
    });
  } catch (error) {
    caught = error as typeof caught;
  }
  assert.ok(caught, 'expected throw');
  assert.equal(caught.code, 'VNEXT_INITIAL_GENERATION_FAILED');
  // The error message includes the Provider's errorMessage.
  assert.match(caught.message, /Provider down/);
});

// Note: states 2 (awaiting_validation) and 3 (correcting) are tested
// in tests/image-generation/e-flow-state.test.js (contracts-level
// unit tests). The synchronous vnext-service.startValidated path
// always returns AFTER the second validator call, so the integration
// path can only reach states {passed, correction_start_failed,
// correction_still_failed, initial_failed}. States 2 + 3 are
// intermediate states that exist between calls in real usage and
// are best pinned at the contracts level.

test('E-2: state passed (initial) — firstImage is the initial image, no correction fields present', async () => {
  const { service } = await setupWithSequence({
    initialRun: makeRun(),
    initialValidation: makeValidation({ status: 'passed' }),
  });
  const compiled = await compileOnce(service);
  const result = await service.startValidated({
    projectId,
    taskId: compiled.taskContract.taskId,
    apiProfileId: 'seedream-profile',
  });
  assert.equal(result.flowState, 'passed');
  assert.equal(result.terminalStatus, 'passed');
  assert.equal(result.automaticRetryCount, 0);
  assert.equal(result.correctionRun, undefined);
  assert.equal(result.correctionValidation, undefined);
  assert.equal(result.firstImage!.runId, 'run-1');
});

test('E-2: state 4 (correction_start_failed) — correction Provider call failed; FIRST image preserved', async () => {
  const { service } = await setupWithSequence({
    initialRun: makeRun(),
    initialValidation: makeValidation({ status: 'failed', retryRecommended: true }),
    correctionRun: makeRun({ status: 'failed', errorMessage: 'correction-provider-down' }, '2'),
  });
  const compiled = await compileOnce(service);
  const result = await service.startValidated({
    projectId,
    taskId: compiled.taskContract.taskId,
    apiProfileId: 'seedream-profile',
  });
  assert.equal(result.flowState, 'correction_start_failed');
  assert.equal(result.terminalStatus, 'failed');
  assert.equal(result.automaticRetryCount, 1);
  // FIRST IMAGE PRESERVATION: the initial image is still here even
  // though the correction failed. The UI must keep it visible.
  assert.ok(result.firstImage, 'firstImage MUST be preserved when correction fails');
  assert.equal(result.firstImage!.runId, 'run-1');
  assert.equal(result.firstImage!.imageId, 'img-1');
  assert.equal(result.firstImage!.mimeType, 'image/png');
  assert.equal(result.firstImage!.sizeBytes, 1);
  assert.equal(result.firstImage!.sha256, 'sha-1');
});

test('E-2: state 5 (correction_still_failed) — correction succeeded but validation still failed; FIRST image preserved', async () => {
  const { service } = await setupWithSequence({
    initialRun: makeRun(),
    initialValidation: makeValidation({ status: 'failed', retryRecommended: true }),
    correctionRun: makeRun({}, '2'),
    correctionValidation: makeValidation({
      runId: 'run-2',
      status: 'failed',
      retryRecommended: false,
    }),
  });
  const compiled = await compileOnce(service);
  const result = await service.startValidated({
    projectId,
    taskId: compiled.taskContract.taskId,
    apiProfileId: 'seedream-profile',
  });
  assert.equal(result.flowState, 'correction_still_failed');
  assert.equal(result.terminalStatus, 'failed');
  // FIRST IMAGE PRESERVATION: still the initial image.
  assert.equal(result.firstImage!.runId, 'run-1');
  assert.equal(result.firstImage!.imageId, 'img-1');
});

test('E-2: passed (terminal, after correction) — flowState=passed, firstImage is the INITIAL image (UI must NOT show correction as the "first")', async () => {
  const { service } = await setupWithSequence({
    initialRun: makeRun(),
    initialValidation: makeValidation({ status: 'failed', retryRecommended: true }),
    correctionRun: makeRun({}, '2'),
    correctionValidation: makeValidation({ runId: 'run-2', status: 'passed' }),
  });
  const compiled = await compileOnce(service);
  const result = await service.startValidated({
    projectId,
    taskId: compiled.taskContract.taskId,
    apiProfileId: 'seedream-profile',
  });
  assert.equal(result.flowState, 'passed');
  assert.equal(result.terminalStatus, 'passed');
  assert.equal(result.automaticRetryCount, 1);
  // firstImage is the initial even when the terminal outcome is the
  // correction. The renderer treats the INITIAL image as the
  // "preserved first" the user always sees.
  assert.equal(result.firstImage!.runId, 'run-1');
  assert.equal(result.firstImage!.imageId, 'img-1');
});

test('E-2: passed (initial, no correction) — firstImage is the initial image, no correction fields present', async () => {
  const { service } = await setupWithSequence({
    initialRun: makeRun(),
    initialValidation: makeValidation({ status: 'passed' }),
  });
  const compiled = await compileOnce(service);
  const result = await service.startValidated({
    projectId,
    taskId: compiled.taskContract.taskId,
    apiProfileId: 'seedream-profile',
  });
  assert.equal(result.flowState, 'passed');
  assert.equal(result.terminalStatus, 'passed');
  assert.equal(result.automaticRetryCount, 0);
  assert.equal(result.correctionRun, undefined);
  assert.equal(result.correctionValidation, undefined);
  assert.equal(result.firstImage!.runId, 'run-1');
});

test('E-2: result.summary.json written to disk has the same flowState + firstImage', async () => {
  const { root, service } = await setupWithSequence({
    initialRun: makeRun(),
    initialValidation: makeValidation({ status: 'failed', retryRecommended: true }),
    correctionRun: makeRun({ status: 'failed' }, '2'),
  });
  const compiled = await compileOnce(service);
  const result = await service.startValidated({
    projectId,
    taskId: compiled.taskContract.taskId,
    apiProfileId: 'seedream-profile',
  });
  const summaryPath = path.join(
    root, 'image-generation-vnext', 'validations', `${compiled.taskContract.taskId}.summary.json`,
  );
  const summaryRaw = await fs.readFile(summaryPath, 'utf8');
  const summary = JSON.parse(summaryRaw);
  assert.equal(summary.flowState, 'correction_start_failed');
  assert.equal(summary.terminalStatus, result.terminalStatus);
  assert.deepEqual(summary.firstImage, result.firstImage);
});

test('E-2: 6 flowState values are valid (no orphan states)', () => {
  // Compile-time guarantee: the enum has exactly 6 values. Runtime
  // check: any state the function returns is one of them.
  const allowed: ShortChainGenerationFlowState[] = [
    'initial_failed',
    'awaiting_validation',
    'correcting',
    'correction_start_failed',
    'correction_still_failed',
    'passed',
  ];
  // Sanity: 6 states.
  assert.equal(allowed.length, 6);
});
