import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createLockedAssetsService } from '@masterpiece/runtime-core/application/locked-assets-service.ts';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

test('Locked Assets service writes item records, thumbnails, index and Session references', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'locked-assets-service-'));
  const projectId = 'project-1';
  const projectRoot = path.join(temp, 'project');
  const sourceRelative = 'assets/logo.png';
  await fs.mkdir(path.join(projectRoot, 'input', 'assets'), { recursive: true });
  await fs.writeFile(path.join(projectRoot, 'input', sourceRelative), PNG);
  const references: string[][] = [];
  const project = {
    id: projectId,
    brandName: '测试品牌',
    logoLocked: true,
    logoFiles: [],
    lockedFacts: ['主色红色不可改变'],
    assets: [{
      id: 'logo-1',
      batchId: 'batch-1',
      sourceType: 'file',
      originalName: 'legacy-board-05.png',
      relativePath: sourceRelative,
      mimeType: 'image/png',
      sizeBytes: PNG.length,
      sha256: 'hash',
      status: 'ready',
    }],
  };
  const projects = {
    paths: async () => ({ root: projectRoot }),
    get: async () => project,
  };
  const sessions = {
    setLockedAssets: async (_projectId: string, ids: string[]) => { references.push(ids); },
  };
  try {
    const service = createLockedAssetsService(projects as never, sessions as never);
    const locked = await service.compile(projectId, {
      understanding: {
        assetReadingSummary: [{
          assetId: 'logo-1',
          recommendedUsage: 'identity_reference',
        }],
      },
    });
    const logo = locked.find((asset) => asset.type === 'logo');
    assert.ok(logo);
    assert.equal(logo.sourceAssetId, 'logo-1');
    assert.equal(logo.sourceFile, sourceRelative);
    assert.match(logo.thumbnail ?? '', /^locked-assets\/thumbnails\/.+\.webp$/);
    await fs.access(path.join(projectRoot, logo.thumbnail!));
    assert.deepEqual(await service.get(projectId, logo.id), logo);
    assert.deepEqual(references.at(-1), locked.map((asset) => asset.id));
    const index = JSON.parse(await fs.readFile(path.join(projectRoot, 'locked-assets', 'index.json'), 'utf8'));
    assert.deepEqual(index.assetIds, locked.map((asset) => asset.id));
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});
