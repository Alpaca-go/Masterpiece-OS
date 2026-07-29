import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import type {
  ImageGenerationRun,
  ProjectVisualContextVNext,
} from '../src/shared/types.ts';
import { createVNextImageGenerationService } from '../src/main/image-generation/vnext-service.ts';

const projectId = 'project-vnext-session';
const context: ProjectVisualContextVNext = {
  schemaVersion: '2.0',
  projectId,
  version: 1,
  generatedAt: '2026-07-29T00:00:00.000Z',
  brandCore: { name: 'Session Brand', industry: 'test', brandRole: null, audience: [] },
  lockedAssets: {
    logoAssetIds: [],
    brandNameLocked: true,
    confirmedColors: [],
    packageStructures: [],
    productAssetIds: [],
    lockedAssetIds: [],
    mustPreserve: [],
  },
  visualIdentity: {
    tone: ['clear and warm'],
    colorBehavior: [],
    graphicBehavior: [],
    materialBehavior: [],
    compositionBehavior: [],
    lightingBehavior: [],
  },
  styleBoundaries: { mustAvoid: [], uncertainItems: [] },
  confirmedDecisions: [],
  sourceAssetRefs: [],
  provenance: {
    builderId: 'test',
    builderVersion: '1',
    sourceKinds: ['project_record'],
    sourceFingerprint: 'session-context-fingerprint',
  },
};

test('vNext session promotes a formal result to a family-scoped implicit anchor', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-vnext-session-'));
  const runs = new Map<string, ImageGenerationRun>();
  let counter = 0;
  const imageGeneration = {
    async startCompiledCreativeTask(options: { projectId: string }) {
      counter += 1;
      const runId = `run-${counter}`;
      const run: ImageGenerationRun = {
        schemaVersion: '1.0',
        runId,
        projectId: options.projectId,
        taskId: `task-${counter}`,
        status: 'succeeded',
        outputType: 'concept_image',
        providerId: 'dashscope',
        modelId: 'seedream-5',
        region: 'beijing',
        createdAt: '2026-07-29T00:00:00.000Z',
        updatedAt: '2026-07-29T00:00:01.000Z',
        completedAt: '2026-07-29T00:00:01.000Z',
        gate: { blocked: false, errors: [], warnings: [] },
        images: [{
          imageId: `image-${counter}`,
          relativePath: `images/image-${counter}.png`,
          mimeType: 'image/png',
          sizeBytes: 10,
          sha256: `sha-${counter}`,
          downloadedAt: '2026-07-29T00:00:01.000Z',
        }],
      };
      runs.set(runId, run);
      return run;
    },
    async getRun(runId: string) {
      return runs.get(runId) ?? null;
    },
  };
  const service = createVNextImageGenerationService(
    { paths: async () => ({
      root,
      input: path.join(root, 'input'),
      prepared: path.join(root, 'prepared'),
      outputs: path.join(root, 'outputs'),
      runtime: path.join(root, 'runtime'),
    }) } as never,
    {
      getVNext: async () => context,
      rebuildVNext: async () => context,
    } as never,
    () => imageGeneration as never,
  );

  const compiled = await service.compile({
    projectId,
    task: {
      deliverableFamily: 'space',
      subtype: 'reception',
      shot: 'entrance_view',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: 'Create the first formal reception result.',
      mustInclude: [],
      mustAvoid: [],
      referenceAssetIds: [],
    },
  });
  const firstRun = await service.start({ projectId, taskId: compiled.taskContract.taskId });
  const confirmed = await service.confirmDirection(
    projectId,
    firstRun.runId,
    firstRun.images[0]!.imageId,
  );
  assert.equal(confirmed.implicitAnchors.space?.runId, firstRun.runId);
  assert.equal(confirmed.implicitAnchors.packaging, undefined);

  const nextRun = await service.continueSameType(
    projectId,
    'Continue with the same space direction and show a quieter variant.',
  );
  assert.equal(nextRun.status, 'succeeded');
  const nextSession = await service.getSession(projectId);
  assert.equal(nextSession.currentTask?.deliverableFamily, 'space');
  assert.equal(nextSession.history.some((entry) => entry.type === 'direction_confirmed'), true);

  const asset = await service.saveProjectPromptAsset({
    projectId,
    deliverableFamily: 'space',
    name: 'Approved space behavior',
    promptFragments: ['Keep the confirmed spatial restraint.'],
    negativeConstraints: ['ornamental clutter'],
  });
  assert.equal(asset.version, 1);
  assert.equal((await service.getSession(projectId)).projectPromptAssets.space, asset.id);
});
