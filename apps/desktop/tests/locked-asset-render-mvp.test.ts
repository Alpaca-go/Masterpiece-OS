import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import type { ImageGenerationRun, LockedAssetPlacementPlan } from '../src/shared/types.ts';
import {
  isLogoOnlyRepairCandidate,
  repairSingleLogoInPlace,
} from '../src/main/image-generation/locked-asset-render-mvp.ts';

test('single Logo MVP repairs only the planned region and preserves the scene dimensions', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-locked-logo-mvp-'));
  const imageDirectory = path.join(root, 'images');
  await fs.mkdir(imageDirectory, { recursive: true });
  const scenePath = path.join(imageDirectory, 'image-01.png');
  const logoPath = path.join(root, 'logo.png');
  await sharp({ create: { width: 800, height: 500, channels: 3, background: '#d8d0c4' } })
    .png().toFile(scenePath);
  await sharp(Buffer.from(`
    <svg width="240" height="80" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="236" height="76" rx="12" fill="#5926a8"/>
      <circle cx="42" cy="40" r="22" fill="#55c52a"/>
      <path d="M82 20h130v40H82z" fill="#ffffff"/>
    </svg>
  `)).png().toFile(logoPath);
  const untouchedBefore = await sharp(scenePath).extract({ left: 0, top: 0, width: 80, height: 80 })
    .removeAlpha().raw().toBuffer();
  const run: ImageGenerationRun = {
    schemaVersion: '1.0',
    runId: 'run-logo-repair',
    projectId: 'project-logo-repair',
    taskId: 'provider-task',
    status: 'succeeded',
    outputType: 'concept_image',
    providerId: 'dashscope',
    modelId: 'test',
    region: 'beijing',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    gate: { blocked: false, errors: [], warnings: [] },
    images: [{
      imageId: 'image-01',
      relativePath: 'images/image-01.png',
      mimeType: 'image/png',
      sizeBytes: 1,
      sha256: 'before',
      downloadedAt: new Date().toISOString(),
    }],
  };
  const placementPlan: LockedAssetPlacementPlan = {
    schemaVersion: '1.0',
    sceneId: 'scene-1',
    brandIntensity: 'balanced',
    mvpEligible: true,
    limitations: [],
    placements: [{
      assetId: 'logo-1',
      assetType: 'logo',
      role: 'primary_signage',
      zone: 'central_feature_wall',
      material: 'front_lit_acrylic',
      importance: 1,
      targetSize: 'large',
      mustBeLegible: true,
      maxOccurrences: 1,
      normalizedBounds: { x: 0.34, y: 0.22, width: 0.32 },
    }],
    styleInheritance: { palette: true, shapeLanguage: true, patternRhythm: true, logoRepetition: false },
  };

  const repaired = await repairSingleLogoInPlace({
    run,
    runRoot: root,
    logoPath,
    placementPlan,
    mode: 'local_repair',
  });
  const untouchedAfter = await sharp(scenePath).extract({ left: 0, top: 0, width: 80, height: 80 })
    .removeAlpha().raw().toBuffer();
  assert.deepEqual(untouchedAfter, untouchedBefore);
  assert.equal(repaired.pass, 'local_repair');
  assert.equal(repaired.materialMode, 'front_lit_acrylic');
  assert.notEqual(repaired.run.images[0]?.sha256, 'before');
  assert.equal(repaired.run.images[0]?.width, 800);
  assert.equal(repaired.run.images[0]?.height, 500);
  assert.equal(isLogoOnlyRepairCandidate({ mismatchTypes: ['logo_text_error'], lockedAssetViolations: [] }), true);
  assert.equal(isLogoOnlyRepairCandidate({ mismatchTypes: ['wrong_family'], lockedAssetViolations: [] }), false);
});
