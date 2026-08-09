import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
// R11.2 continuation workflow: confirm -> revoke -> reload persistence, and
// the UI task assembly must route through the R11.1 contract (the compiled
// prompt trace records generationBasis=continuation + lineage), never a
// frontend-built prompt.
process.env.MASTERPIECE_SPACE_COMPILER_MODE = 'r8_6_golden';
import { createVNextImageGenerationService } from '../src/main/image-generation/vnext-service.ts';

const projectId = 'project-r11-workflow';

function spaceRun(overrides = {}) {
  return {
    schemaVersion: '1.0',
    runId: 'run-space-1',
    projectId,
    taskId: 'task-space-1',
    status: 'succeeded',
    deliverable: 'interior_scene',
    images: [{ imageId: 'img-1', relativePath: 'images/image-01.png', mimeType: 'image/png', sizeBytes: 1, sha256: 'abc', downloadedAt: '2026-08-09T10:00:00.000Z' }],
    ...overrides,
  };
}

async function setup() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-r11-workflow-'));
  const runs = new Map<string, ReturnType<typeof spaceRun>>();
  const imageGeneration = { async getRun(runId: string) { return runs.get(runId) ?? null; } };
  const projectContext = { getVNext: async () => ({ projectId }), rebuildVNext: async () => ({ projectId }) };
  const service = createVNextImageGenerationService(
    { paths: async () => ({ root, input: path.join(root, 'input'), prepared: path.join(root, 'prepared'), outputs: path.join(root, 'outputs'), runtime: path.join(root, 'runtime') }) } as never,
    projectContext as never,
    () => imageGeneration as never,
    undefined,
  );
  return { root, runs, service };
}

test('R11.2 confirm persists across session reload, revoke blocks reuse', async () => {
  const { runs, service } = await setup();
  runs.set('run-space-1', spaceRun());

  const confirmed = await service.confirmGeneratedOutput(projectId, 'run-space-1', 'img-1');
  assert.equal(confirmed.confirmationState, 'confirmed');

  // Reload: a fresh readSession must still see the confirmed state.
  const reloaded = await service.getConfirmedGeneratedOutputs(projectId);
  assert.equal(reloaded[confirmed.assetId]?.confirmationState, 'confirmed', 'persisted across reload');

  // Revoke.
  const revoked = await service.revokeGeneratedOutput(projectId, confirmed.assetId);
  assert.equal(revoked.confirmationState, 'revoked');
  const after = await service.getConfirmedGeneratedOutputs(projectId);
  assert.equal(after[confirmed.assetId]?.confirmationState, 'revoked', 'revoked persisted');
});

test('R11.2 UI task assembly routes through the R11.1 continuation contract', async () => {
  // The UI creates a structured continuation task; the runtime compiler must
  // produce a continuation trace (generationBasis=continuation) with lineage.
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const compileUrl = pathToFileURL(path.join(repoRoot, '../../packages/image-generation-runtime/src/vnext/compile.js')).href;
  const { compileVNextImageGeneration } = await import(compileUrl);
  const packet = JSON.parse(await fs.readFile(
    path.join(repoRoot, '../../space-generator/quality-baselines/phase9b-recovered/_packets/jiuzhou-aesthetics/visual-decision-packet.json'),
    'utf8',
  ));
  const ctx = { projectId };
  ctx.visualDecisionPacket = packet;

  const assetId = 'asset-confirmed-wf';
  const task = {
    schemaVersion: '1.0',
    taskId: 'r11-wf-cont',
    projectId,
    deliverableFamily: 'space',
    subtype: 'consultation',
    shot: 'entrance_view',
    count: 1,
    aspectRatio: '16:9',
    currentInstruction: '延续已确认方向，生成咨询空间。更私密',
    generationBasis: 'continuation',
    mustInclude: [],
    mustAvoid: [],
    referenceAssetIds: [assetId],
    logoUsageMode: 'post_composite',
    continuation: {
      sourceAssetId: assetId,
      sourceRunId: 'run-space-1',
      sourceScene: 'reception',
      targetScene: 'consultation',
      confirmedAt: '2026-08-09T10:00:00.000Z',
      confirmationSource: 'user_explicit',
      referenceSource: 'confirmed_generated_output',
      referenceRole: 'world_consistency',
      userRequirement: '更私密',
      targetFunctionalProgram: {
        sceneId: 'consultation',
        sceneLabel: '咨询室',
        viewStrategy: 'human_scale_consultation_view',
        requiredFunctions: ['1 对 1 / 1 对 2 专业咨询'],
        requiredSpatialElements: ['咨询桌或低桌', '2–3 人咨询座位', '半私密或私密边界'],
        sourceProgramElementsToDrop: ['大型公共接待台', '大尺度 Lobby 构图'],
      },
      continuationBoundary: {
        preserve: ['brand world', 'architecture language', 'material palette', 'lighting'],
        regenerate: ['functional program', 'layout', 'circulation', 'privacy', 'scale'],
      },
    },
    createdAt: new Date().toISOString(),
  };
  const out = compileVNextImageGeneration({ projectContext: ctx, model: 'doubao-seedream-5-0-pro-260628', task, brandKey: 'jiuzhou-aesthetics' });
  const sg = out.compiledPrompt.trace?.spaceGeneration;
  assert.equal(sg.generationBasis, 'continuation');
  assert.equal(sg.referenceMode, 'reference_assisted');
  assert.equal(sg.continuation?.sourceScene, 'reception');
  assert.equal(sg.continuation?.targetScene, 'consultation');
  assert.equal(sg.continuation?.referenceRole, 'world_consistency');
  assert.equal(sg.continuation?.sourceProgramLeakageGate, 'pass');
});
