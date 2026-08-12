import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
// R11.2.2 §17-§21: "true continuation" — start() must bind the ORIGINAL
// confirmed generated output (source = confirmed_generated_output) to its
// on-disk image and record the continuation lineage, never a user-upload copy.
process.env.MASTERPIECE_SPACE_COMPILER_MODE = 'r8_6_golden';
import type { ImageGenerationRun } from '@masterpiece/runtime-core/application-contracts.ts';
import { createShortChainGenerationService } from '@masterpiece/runtime-core/application/image-generation/short-chain-service.ts';

const projectId = 'project-r11-cont-start';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

async function loadPacket() {
  const packetPath = path.join(
    repoRoot,
    'space-generator/quality-baselines/phase9b-recovered/_packets/jiuzhou-aesthetics/visual-decision-packet.json',
  );
  return JSON.parse(await fs.readFile(packetPath, 'utf8'));
}

test('R11.2.2 true continuation start() binds the confirmed generated output reference', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-r11-cont-start-'));
  const packet = await loadPacket();
  const ctx: Record<string, unknown> = {
    projectId,
    provenance: { sourceFingerprint: 'continuation-fingerprint', builderId: 'test', builderVersion: '1', sourceKinds: ['project_record'] },
  };
  ctx.visualDecisionPacket = packet;
  ctx.lockedAssets = { logoAssetIds: [] };
  ctx.sourceAssetRefs = [];

  // The source run produced a generated reception image on disk.
  const sourceRunId = 'source-run-1';
  const sourceImagePath = 'images/source-image-1.png';
  const imageRoot = path.join(root, 'image-generation', sourceRunId);
  await fs.mkdir(path.join(imageRoot, 'images'), { recursive: true });
  await fs.writeFile(path.join(imageRoot, sourceImagePath), Buffer.from('dummy-png', 'utf8'));
  const runs = new Map<string, ImageGenerationRun>();
  runs.set(sourceRunId, {
    schemaVersion: '1.0',
    runId: sourceRunId,
    projectId,
    taskId: 'task-source-1',
    status: 'succeeded',
    deliverable: 'interior_scene',
    outputType: 'concept_image',
    providerId: 'dashscope',
    modelId: 'seedream-5',
    region: 'beijing',
    createdAt: '2026-08-09T10:00:00.000Z',
    updatedAt: '2026-08-09T10:00:01.000Z',
    completedAt: '2026-08-09T10:00:01.000Z',
    gate: { blocked: false, errors: [], warnings: [] },
    images: [{
      imageId: 'source-image-1',
      relativePath: sourceImagePath,
      mimeType: 'image/png',
      sizeBytes: 9,
      sha256: 'source-sha',
      downloadedAt: '2026-08-09T10:00:01.000Z',
    }],
  });

  let capturedReferences: Array<{ id: string; source?: string; projectRelativePath?: string }> = [];
  const imageGeneration = {
    async getRun(runId: string) { return runs.get(runId) ?? null; },
    async runRoot(runId: string) { return path.join(root, 'image-generation', runId); },
    async startCompiledCreativeTask(options: {
      projectId: string;
      references?: Array<{ id: string; source?: string; projectRelativePath?: string }>;
      apiProfileId?: string;
    }) {
      capturedReferences = options.references ?? [];
      const run: ImageGenerationRun = {
        schemaVersion: '1.0',
        runId: 'continuation-run-1',
        projectId: options.projectId,
        taskId: 'task-cont-1',
        status: 'succeeded',
        outputType: 'concept_image',
        providerId: 'dashscope',
        modelId: 'seedream-5',
        region: 'beijing',
        createdAt: '2026-08-09T11:00:00.000Z',
        updatedAt: '2026-08-09T11:00:01.000Z',
        completedAt: '2026-08-09T11:00:01.000Z',
        gate: { blocked: false, errors: [], warnings: [] },
        images: [{
          imageId: 'cont-image-1',
          relativePath: 'images/cont-image-1.png',
          mimeType: 'image/png',
          sizeBytes: 9,
          sha256: 'cont-sha',
          downloadedAt: '2026-08-09T11:00:01.000Z',
        }],
      };
      runs.set(run.runId, run);
      // Provide the generated image on disk so the post-run output.png copy works.
      const runDir = path.join(root, 'image-generation', run.runId);
      await fs.mkdir(path.join(runDir, 'images'), { recursive: true });
      await fs.writeFile(path.join(runDir, run.images[0]!.relativePath), Buffer.from('dummy-png', 'utf8'));
      return run;
    },
  };
  const service = createShortChainGenerationService(
    { paths: async () => ({
      root,
      input: path.join(root, 'input'),
      prepared: path.join(root, 'prepared'),
      outputs: path.join(root, 'outputs'),
      runtime: path.join(root, 'runtime'),
    }) } as never,
    { getShortChain: async () => ctx, rebuildShortChain: async () => ctx } as never,
    () => imageGeneration as never,
    undefined,
  );

  // Seed a session with the confirmed generated output.
  const confirmedAssetId = 'asset-source-run-1-source-image-1';
  const sessionDir = path.join(root, 'image-generation-vnext');
  await fs.mkdir(sessionDir, { recursive: true });
  await fs.writeFile(path.join(sessionDir, 'creative-session.json'), JSON.stringify({
    schemaVersion: '1.0',
    projectId,
    currentTask: null,
    history: [],
    implicitAnchors: {},
    projectPromptAssets: {},
    confirmedGeneratedOutputs: {
      [confirmedAssetId]: {
        assetId: confirmedAssetId,
        projectId,
        assetOrigin: 'generated_output',
        deliverableFamily: 'space',
        generationRole: 'continuation_source',
        sourceRunId,
        sourceTaskId: 'task-source-1',
        sourceScene: 'reception',
        confirmationState: 'confirmed',
        confirmedAt: '2026-08-09T10:05:00.000Z',
        confirmationSource: 'user_explicit',
        imageSha256: 'source-sha',
        compilerId: 'phase9b-quality-compiler',
        baselineId: 'r10.4.1-post-repair',
      },
    },
    createdAt: '2026-08-09T10:00:00.000Z',
    updatedAt: '2026-08-09T10:05:00.000Z',
  }), 'utf8');

  const compiled = await service.compile({
    projectId,
    task: {
      deliverableFamily: 'space',
      subtype: 'consultation',
      shot: 'entrance_view',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: '延续已确认方向，生成咨询空间。更私密',
      generationBasis: 'continuation',
      mustInclude: [],
      mustAvoid: [],
      referenceAssetIds: [confirmedAssetId],
      logoUsageMode: 'post_composite',
      continuation: {
        sourceAssetId: confirmedAssetId,
        sourceRunId,
        sourceScene: 'reception',
        targetScene: 'consultation',
        confirmedAt: '2026-08-09T10:05:00.000Z',
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
    },
  });

  const targetProjection = JSON.parse(await fs.readFile(
    path.join(compiled.artifactDirectory, 'target-scene-projection.json'),
    'utf8',
  )) as Record<string, unknown>;
  const promptSourceMap = JSON.parse(await fs.readFile(
    path.join(compiled.artifactDirectory, 'prompt-source-map.json'),
    'utf8',
  )) as {
    operationConstraintsSource?: string;
    brandManifestationSource?: string;
    brand_role_manifestation?: {
      preservedMechanisms?: string[];
      replacedSceneObjects?: string[];
    };
  };
  assert.equal(targetProjection.operationConstraintsSource, 'target_scene_projection');
  assert.equal(targetProjection.brandManifestationSource, 'target_scene_projection');
  assert.equal(promptSourceMap.operationConstraintsSource, 'target_scene_projection');
  assert.equal(promptSourceMap.brandManifestationSource, 'target_scene_projection');
  assert.ok(Array.isArray(promptSourceMap.brand_role_manifestation?.preservedMechanisms));
  assert.ok(Array.isArray(promptSourceMap.brand_role_manifestation?.replacedSceneObjects));

  const run = await service.start({
    projectId,
    taskId: compiled.taskContract.taskId,
    apiProfileId: 'seedream-profile',
  });
  assert.equal(run.status, 'succeeded');

  // The provider reference must be the ORIGINAL confirmed generated output,
  // bound to its on-disk image (never a user-upload copy).
  assert.equal(capturedReferences.length, 1);
  assert.equal(capturedReferences[0]?.id, confirmedAssetId);
  assert.equal(capturedReferences[0]?.source, 'confirmed_generated_output');
  assert.equal(
    capturedReferences[0]?.projectRelativePath,
    `image-generation/${sourceRunId}/${sourceImagePath}`,
  );

  // The generated history entry records the continuation mode + lineage.
  const session = await service.getSession(projectId);
  const generated = [...session.history].reverse().find((entry) => entry.type === 'generated');
  assert.equal(generated?.generationBasis, 'continuation');
  assert.equal(generated?.continuationLineage?.sourceScene, 'reception');
  assert.equal(generated?.continuationLineage?.targetScene, 'consultation');
  assert.equal(generated?.continuationLineage?.sourceRunId, sourceRunId);
});
