import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { postCompositeConfirmedLogo } from '@masterpiece/runtime-core/application/image-generation/logo-post-composite.ts';

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
