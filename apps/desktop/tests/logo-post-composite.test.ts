import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { postCompositeConfirmedLogo, postCompositeLockedAssets } from '../src/main/image-generation/logo-post-composite.ts';

test('confirmed Logo post-composite preserves source pixels and records deterministic hashes', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-logo-composite-'));
  const scenePath = path.join(root, 'scene.png');
  const logoPath = path.join(root, 'logo.png');
  const outputPath = path.join(root, 'output.png');
  await sharp({
    create: {
      width: 400,
      height: 240,
      channels: 3,
      background: '#f2f0ed',
    },
  }).png().toFile(scenePath);
  const logoSvg = Buffer.from(
    '<svg width="200" height="100"><rect width="200" height="100" fill="#e6e6e6"/>'
    + '<path d="M20 80 C40 10,80 10,100 80" fill="none" stroke="#5837BD" stroke-width="12"/>'
    + '<text x="110" y="62" font-size="26">TEST</text></svg>',
  );
  await sharp(logoSvg).png().toFile(logoPath);

  const result = await postCompositeConfirmedLogo({
    scenePath,
    logoPath,
    outputPath,
    sourceCrop: { left: 10, top: 5, width: 180, height: 90 },
    placement: { x: 0.6, y: 0.2, width: 0.25 },
    removeBackground: { enabled: true, tolerance: 20 },
  });
  assert.equal(result.sourceLogoSha256, crypto
    .createHash('sha256')
    .update(await fs.readFile(logoPath))
    .digest('hex'));
  assert.equal(result.outputSha256, crypto
    .createHash('sha256')
    .update(await fs.readFile(outputPath))
    .digest('hex'));
  assert.equal(result.placement.outputLeft, 240);
  assert.equal(result.placement.outputTop, 48);
  assert.equal(result.placement.outputWidth, 100);
  assert.equal((await sharp(outputPath).metadata()).width, 400);
});

test('Logo post-composite rejects out-of-bounds crop and placement', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-logo-geometry-'));
  const source = path.join(root, 'source.png');
  await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 4,
      background: '#ffffff',
    },
  }).png().toFile(source);
  await assert.rejects(
    postCompositeConfirmedLogo({
      scenePath: source,
      logoPath: source,
      outputPath: path.join(root, 'output.png'),
      sourceCrop: { left: 90, top: 90, width: 20, height: 20 },
      placement: { x: 0.1, y: 0.1, width: 0.2 },
    }),
    (error: unknown) => (error as { code?: string }).code
      === 'LOGO_POST_COMPOSITE_CROP_OUT_OF_BOUNDS',
  );
});

test('locked asset post-composite places multiple source-bound layers in one audited output', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-locked-assets-'));
  const scenePath = path.join(root, 'scene.png');
  const logoPath = path.join(root, 'logo.png');
  const iconsPath = path.join(root, 'icons.png');
  const outputPath = path.join(root, 'output.png');
  await sharp({ create: { width: 500, height: 300, channels: 3, background: '#ffffff' } }).png().toFile(scenePath);
  await sharp({ create: { width: 100, height: 50, channels: 3, background: '#663399' } }).png().toFile(logoPath);
  await sharp({ create: { width: 160, height: 40, channels: 3, background: '#91c83e' } }).png().toFile(iconsPath);
  const result = await postCompositeLockedAssets({
    scenePath,
    outputPath,
    layers: [
      { layerId: 'logo', assetPath: logoPath, sourceCrop: { left: 0, top: 0, width: 100, height: 50 }, placement: { x: 0.1, y: 0.1, width: 0.2 } },
      { layerId: 'icons', assetPath: iconsPath, sourceCrop: { left: 0, top: 0, width: 160, height: 40 }, placement: { x: 0.5, y: 0.6, width: 0.32 } },
    ],
  });
  assert.deepEqual(result.layers.map((layer) => layer.layerId), ['logo', 'icons']);
  assert.equal(result.sourceSceneSha256, crypto.createHash('sha256').update(await fs.readFile(scenePath)).digest('hex'));
  assert.equal(result.outputSha256, crypto.createHash('sha256').update(await fs.readFile(outputPath)).digest('hex'));
  assert.notEqual(result.outputSha256, result.sourceSceneSha256);
});

test('complex-surface compositor supports curved segmentation and translucent glass', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-logo-complex-surface-'));
  const scenePath = path.join(root, 'scene.png');
  const logoPath = path.join(root, 'logo.png');
  await sharp({ create: { width: 720, height: 420, channels: 3, background: '#b9c3c9' } }).png().toFile(scenePath);
  await sharp(Buffer.from('<svg width="240" height="80"><rect width="240" height="80" rx="10" fill="#5829a5"/><circle cx="45" cy="40" r="24" fill="#54c531"/><rect x="90" y="24" width="120" height="32" fill="white"/></svg>'))
    .png().toFile(logoPath);
  const curved = await postCompositeConfirmedLogo({
    scenePath,
    logoPath,
    outputPath: path.join(root, 'curved.png'),
    sourceCrop: { left: 0, top: 0, width: 240, height: 80 },
    placement: { x: 0.3, y: 0.25, width: 0.38 },
    surfaceMode: 'curved_wall',
    materialMode: 'metal_dimensional',
  });
  const glass = await postCompositeConfirmedLogo({
    scenePath,
    logoPath,
    outputPath: path.join(root, 'glass.png'),
    sourceCrop: { left: 0, top: 0, width: 240, height: 80 },
    placement: { x: 0.3, y: 0.25, width: 0.38 },
    surfaceMode: 'glass',
  });
  assert.equal(curved.surfaceMode, 'curved_wall');
  assert.equal(glass.surfaceMode, 'glass');
  assert.notEqual(curved.outputSha256, glass.outputSha256);
  assert.equal((await sharp(curved.outputPath).metadata()).width, 720);
});
