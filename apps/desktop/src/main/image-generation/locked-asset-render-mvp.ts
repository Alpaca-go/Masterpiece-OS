import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type {
  ImageGenerationRun,
  LockedAssetMaterialMode,
  LockedAssetPlacementPlan,
} from '@masterpiece/image-generation-contracts/index.ts';
import {
  postCompositeConfirmedLogo,
  type LogoPostCompositeInput,
} from './logo-post-composite.ts';

const REPAIR_MATERIALS = new Set<LockedAssetMaterialMode>([
  'front_lit_acrylic',
  'halo_lit_metal',
  'acrylic_dimensional',
  'pvc_dimensional',
  'metal_dimensional',
]);

export interface SingleLogoRepairResult {
  run: ImageGenerationRun;
  pass: 'local_repair' | 'fallback_composite';
  sourceAssetId: string;
  outputPath: string;
  outputSha256: string;
  materialMode?: LockedAssetMaterialMode;
}

export function isLogoOnlyRepairCandidate(input: {
  mismatchTypes: string[];
  lockedAssetViolations: string[];
}): boolean {
  const types = new Set(input.mismatchTypes);
  return input.lockedAssetViolations.length > 0
    || types.has('locked_asset_violation')
    || types.has('logo_text_error');
}

export async function repairSingleLogoInPlace(input: {
  run: ImageGenerationRun;
  runRoot: string;
  logoPath: string;
  placementPlan: LockedAssetPlacementPlan;
  mode: 'local_repair' | 'fallback_composite';
  simplifyMaterial?: boolean;
}): Promise<SingleLogoRepairResult> {
  const image = input.run.images[0];
  const placement = input.placementPlan.placements.find((item) => item.role === 'primary_signage');
  if (!image || !placement) throw new Error('Single Logo repair requires one generated image and one placement');
  const resolvedRunRoot = path.resolve(input.runRoot);
  const scenePath = path.resolve(resolvedRunRoot, image.relativePath);
  if (scenePath !== resolvedRunRoot && !scenePath.startsWith(`${resolvedRunRoot}${path.sep}`)) {
    throw Object.assign(new Error('Generated scene path escapes the image run root'), {
      code: 'LOCKED_ASSET_REPAIR_SCENE_PATH_INVALID',
    });
  }
  const metadata = await sharp(input.logoPath).rotate().metadata();
  if (!metadata.width || !metadata.height) throw new Error('Locked Logo has no readable pixel dimensions');
  const temporaryPath = path.join(path.dirname(scenePath), `.locked-asset-${crypto.randomUUID()}.png`);
  const materialMode: LogoPostCompositeInput['materialMode'] = input.mode === 'local_repair'
    && REPAIR_MATERIALS.has(placement.material as LockedAssetMaterialMode)
    ? input.simplifyMaterial
      ? 'pvc_dimensional'
      : placement.material as LogoPostCompositeInput['materialMode']
    : undefined;
  try {
    const composed = await postCompositeConfirmedLogo({
      scenePath,
      logoPath: input.logoPath,
      outputPath: temporaryPath,
      sourceCrop: { left: 0, top: 0, width: metadata.width, height: metadata.height },
      placement: placement.normalizedBounds,
      removeBackground: { enabled: metadata.hasAlpha !== true, tolerance: 24 },
      ...(materialMode ? { materialMode } : {}),
      ...(placement.surfaceMode && placement.surfaceMode !== 'partial_occlusion'
        ? { surfaceMode: placement.surfaceMode }
        : {}),
    });
    await fs.rename(temporaryPath, scenePath);
    const output = await fs.readFile(scenePath);
    const finalMetadata = await sharp(output).metadata();
    const updatedImage = {
      ...image,
      mimeType: 'image/png',
      sizeBytes: output.byteLength,
      width: finalMetadata.width,
      height: finalMetadata.height,
      sha256: crypto.createHash('sha256').update(output).digest('hex'),
    };
    return {
      run: { ...input.run, images: [updatedImage, ...input.run.images.slice(1)] },
      pass: input.mode,
      sourceAssetId: placement.assetId,
      outputPath: scenePath,
      outputSha256: composed.outputSha256,
      ...(materialMode ? { materialMode } : {}),
    };
  } finally {
    await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
  }
}
