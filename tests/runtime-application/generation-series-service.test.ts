import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createGenerationSeriesService } from '@masterpiece/runtime-core/application/generation-series-service.ts';

test('Generation Series service persists queue state and active Session reference', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'generation-series-'));
  const entities: string[] = [];
  const service = createGenerationSeriesService(
    { paths: async () => ({ root: path.join(temp, 'project') }) } as never,
    { setActiveEntity: async (_p: string, _t: string, entity: { id: string }) => { entities.push(entity.id); } } as never,
    { getActive: async () => ({ id: 'style', version: '1.0.0', status: 'confirmed' }) } as never,
    { list: async () => [{ id: 'lock' }] } as never,
    { getActive: async () => ({ id: 'canon', version: '1.0.0', status: 'confirmed' }) } as never,
  );
  try {
    const created = await service.create('project-1', {
      name: 'Series 01',
      tasks: [{ taskCode: 'POS-01', taskType: 'poster', title: '主海报' }],
    });
    const running = await service.start('project-1', created.id);
    const paused = await service.pause('project-1', created.id);
    assert.equal(running.status, 'running');
    assert.equal(paused.status, 'paused');
    assert.deepEqual(entities, [created.id]);
    assert.equal((await service.get('project-1', created.id))?.status, 'paused');
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});
