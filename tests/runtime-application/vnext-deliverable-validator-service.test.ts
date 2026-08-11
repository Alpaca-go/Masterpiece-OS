import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createVNextDeliverableValidatorService } from '@masterpiece/runtime-core/application/image-generation/vnext-deliverable-validator-service.ts';

test('vNext validator records unverified instead of trusting prompt metadata without vision evidence', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-vnext-validator-'));
  const service = createVNextDeliverableValidatorService(
    { paths: async () => ({
      root,
      input: path.join(root, 'input'),
      prepared: path.join(root, 'prepared'),
      outputs: path.join(root, 'outputs'),
      runtime: path.join(root, 'runtime'),
    }) } as never,
    () => ({
      getRun: async () => ({
        projectId: 'project-1',
        runId: 'run-1',
        status: 'succeeded',
        images: [{ imageId: 'image-1', relativePath: 'images/image.png' }],
      }),
    }) as never,
    async () => ({ profiles: [] }) as never,
    async () => {
      throw new Error('credentials must not be read without a validator profile');
    },
  );
  const validation = await service.validate({
    projectId: 'project-1',
    runId: 'run-1',
    taskContract: {
      schemaVersion: '1.0',
      taskId: 'task-1',
      projectId: 'project-1',
      deliverableFamily: 'space',
      subtype: 'reception',
      shot: 'entrance_view',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: 'Create a real reception.',
      mustInclude: [],
      mustAvoid: [],
      referenceAssetIds: [],
      createdAt: '2026-07-29T00:00:00.000Z',
    },
  });
  assert.equal(validation.status, 'unverified');
  const persisted = JSON.parse(await fs.readFile(
    path.join(root, 'image-generation-vnext', 'validations', 'run-1.json'),
    'utf8',
  ));
  assert.equal(persisted.status, 'unverified');
});
