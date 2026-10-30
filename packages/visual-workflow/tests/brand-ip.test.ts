import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createVisualWorkflow } from '../src/service.js';

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

async function withWorkflow(run: (workflow: any) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'brand-ip-'));
  try {
    await run(createVisualWorkflow({ root, emit: () => {} }));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test('a project can mark one imported image as its brand IP, and clear it', async () => {
  await withWorkflow(async (workflow) => {
    const project = await workflow.operations['visual-workflow:create-project']({}, { projectName: '蛙耶', brandName: '蛙耶', industry: '餐饮' });
    const imported = await workflow.operations['visual-workflow:import-files']({}, project.id, [
      { name: 'mascot.png', content: PNG, size: Buffer.from(PNG, 'base64').length },
    ]);
    assert.equal(imported.assets.length, 1);
    const assetId = imported.assets[0].id;

    const selected = await workflow.operations['visual-workflow:select-ip']({}, project.id, assetId);
    assert.equal(selected.ipAssetId, assetId);
    assert.equal(selected.ipAssetName, 'mascot.png');

    const cleared = await workflow.operations['visual-workflow:select-ip']({}, project.id, '');
    assert.equal(cleared.ipAssetId, null);
    assert.equal(cleared.ipAssetName, null);
  });
});

test('selecting an asset that is not a project image fails loudly', async () => {
  await withWorkflow(async (workflow) => {
    const project = await workflow.operations['visual-workflow:create-project']({}, { projectName: '蛙耶', brandName: '蛙耶', industry: '餐饮' });
    await assert.rejects(
      () => workflow.operations['visual-workflow:select-ip']({}, project.id, 'not-an-asset'),
      /IP \/ 吉祥物资产/,
    );
  });
});

test('IP compositing requires the explicit user confirmation', async () => {
  await withWorkflow(async (workflow) => {
    const project = await workflow.operations['visual-workflow:create-project']({}, { projectName: '蛙耶', brandName: '蛙耶', industry: '餐饮' });
    await assert.rejects(
      () => workflow.operations['visual-workflow:post-composite-ip']({}, { projectId: project.id, runId: 'missing-run', imageId: 'missing', ipAssetId: 'missing' }),
      /confirmation/i,
    );
  });
});
