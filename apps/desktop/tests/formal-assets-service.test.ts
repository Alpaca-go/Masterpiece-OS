import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createFormalAssetsService } from '../src/main/formal-assets-service.ts';

test('formal asset service persists candidate review without changing source image', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'formal-assets-'));
  const service = createFormalAssetsService({
    paths: async () => ({ root: path.join(temp, 'project') }),
  } as never);
  try {
    const output = await service.create({
      projectId: 'p', seriesId: 's', taskId: 't', generationRunId: 'r',
      imagePath: 'image-generation/r/images/image-01.png',
    });
    const formal = await service.review('p', 's', output.id, { action: 'accept_formal', note: '通过' });
    assert.equal(formal.status, 'formal');
    assert.equal(formal.imagePath, output.imagePath);
    assert.equal((await service.list('p', 's')).length, 1);
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});
