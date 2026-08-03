import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { preprocessSpatialStructureReference } from '../src/main/image-generation/spatial-structure-reference.ts';

test('spatial structure preprocessing removes colour while retaining image geometry', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-structure-reference-'));
  const sourcePath = path.join(root, 'source.png');
  await sharp({
    create: { width: 640, height: 360, channels: 3, background: '#7e2eb8' },
  }).composite([{
    input: Buffer.from('<svg width="640" height="360" xmlns="http://www.w3.org/2000/svg"><rect x="80" y="70" width="480" height="220" fill="#f2c544"/><path d="M80 290 L320 130 L560 290" stroke="#102030" stroke-width="14" fill="none"/></svg>'),
  }]).png().toFile(sourcePath);

  const result = await preprocessSpatialStructureReference({
    sourceAssetId: 'source-room',
    sourcePath,
    outputDirectory: path.join(root, 'structure-references'),
  });
  const outputPath = path.join(root, result.relativePath);
  const metadata = await sharp(outputPath).metadata();
  const { channels } = await sharp(outputPath).stats();

  assert.equal(result.assetId, 'structure-reference-source-room');
  assert.equal(result.width, 640);
  assert.equal(result.height, 360);
  assert.ok(metadata.space === 'b-w' || channels.length === 3);
  if (channels.length === 3) {
    assert.ok(Math.abs(channels[0]!.mean - channels[1]!.mean) < 0.001);
    assert.ok(Math.abs(channels[1]!.mean - channels[2]!.mean) < 0.001);
  }
  assert.match(result.sha256, /^[a-f0-9]{64}$/u);
  assert.ok(result.preprocessing.includes('colour_authority_removed'));
});
