import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export interface PixelRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface NormalizedPlacement {
  x: number;
  y: number;
  width: number;
}

export interface LogoPostCompositeInput {
  scenePath: string;
  logoPath: string;
  outputPath: string;
  sourceCrop: PixelRect;
  placement: NormalizedPlacement;
  removeBackground?: {
    enabled: boolean;
    tolerance?: number;
  };
}

export interface LogoPostCompositeResult {
  outputPath: string;
  sourceLogoSha256: string;
  outputSha256: string;
  sourceCrop: PixelRect;
  placement: NormalizedPlacement & {
    outputLeft: number;
    outputTop: number;
    outputWidth: number;
    outputHeight: number;
  };
}

export interface LockedAssetLayerInput {
  layerId: string;
  assetPath: string;
  sourceCrop: PixelRect;
  placement: NormalizedPlacement;
  removeBackground?: LogoPostCompositeInput['removeBackground'];
}

export interface LockedAssetsPostCompositeInput {
  scenePath: string;
  outputPath: string;
  layers: LockedAssetLayerInput[];
}

export interface LockedAssetLayerResult {
  layerId: string;
  sourceAssetSha256: string;
  sourceCrop: PixelRect;
  placement: NormalizedPlacement & {
    outputLeft: number;
    outputTop: number;
    outputWidth: number;
    outputHeight: number;
  };
}

export interface LockedAssetsPostCompositeResult {
  outputPath: string;
  sourceSceneSha256: string;
  outputSha256: string;
  layers: LockedAssetLayerResult[];
}

function finiteInteger(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    throw Object.assign(new Error(`${name} must be a non-negative integer`), {
      code: 'LOGO_POST_COMPOSITE_INVALID_GEOMETRY',
    });
  }
  return value;
}

function normalized(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw Object.assign(new Error(`${name} must be between 0 and 1`), {
      code: 'LOGO_POST_COMPOSITE_INVALID_GEOMETRY',
    });
  }
  return value;
}

async function transparentLogo(
  logoPath: string,
  crop: PixelRect,
  background: LogoPostCompositeInput['removeBackground'],
): Promise<Buffer> {
  const image = sharp(logoPath).rotate();
  const metadata = await image.metadata();
  const sourceWidth = metadata.width || 0;
  const sourceHeight = metadata.height || 0;
  if (
    crop.width <= 0
    || crop.height <= 0
    || crop.left + crop.width > sourceWidth
    || crop.top + crop.height > sourceHeight
  ) {
    throw Object.assign(new Error('Logo crop exceeds the confirmed source asset'), {
      code: 'LOGO_POST_COMPOSITE_CROP_OUT_OF_BOUNDS',
    });
  }
  const extracted = image.extract(crop).ensureAlpha();
  if (!background?.enabled) return extracted.png().toBuffer();

  const { data, info } = await extracted.raw().toBuffer({ resolveWithObject: true });
  const tolerance = Math.min(96, Math.max(1, background.tolerance ?? 24));
  const cornerOffsets = [
    0,
    (info.width - 1) * info.channels,
    (info.height - 1) * info.width * info.channels,
    ((info.height * info.width) - 1) * info.channels,
  ];
  const cornerRgb = cornerOffsets.map((offset) => [
    data[offset] ?? 0,
    data[offset + 1] ?? 0,
    data[offset + 2] ?? 0,
  ] as [number, number, number]);
  let closestPair: [[number, number, number], [number, number, number]] = [cornerRgb[0]!, cornerRgb[1]!];
  let closestDistance = Number.POSITIVE_INFINITY;
  for (let left = 0; left < cornerRgb.length; left += 1) {
    for (let right = left + 1; right < cornerRgb.length; right += 1) {
      const distance = Math.max(...[0, 1, 2].map((channel) =>
        Math.abs(cornerRgb[left]![channel]! - cornerRgb[right]![channel]!)));
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPair = [cornerRgb[left]!, cornerRgb[right]!];
      }
    }
  }
  const backgroundRgb = [0, 1, 2].map((channel) =>
    Math.round((closestPair[0][channel]! + closestPair[1][channel]!) / 2)) as [number, number, number];
  for (let offset = 0; offset < data.length; offset += info.channels) {
    const distance = Math.max(
      Math.abs((data[offset] ?? 0) - backgroundRgb[0]),
      Math.abs((data[offset + 1] ?? 0) - backgroundRgb[1]),
      Math.abs((data[offset + 2] ?? 0) - backgroundRgb[2]),
    );
    if (distance <= tolerance) data[offset + 3] = 0;
  }
  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  }).png().toBuffer();
}

export async function postCompositeConfirmedLogo(
  input: LogoPostCompositeInput,
): Promise<LogoPostCompositeResult> {
  const crop = {
    left: finiteInteger(input.sourceCrop.left, 'sourceCrop.left'),
    top: finiteInteger(input.sourceCrop.top, 'sourceCrop.top'),
    width: finiteInteger(input.sourceCrop.width, 'sourceCrop.width'),
    height: finiteInteger(input.sourceCrop.height, 'sourceCrop.height'),
  };
  const placement = {
    x: normalized(input.placement.x, 'placement.x'),
    y: normalized(input.placement.y, 'placement.y'),
    width: normalized(input.placement.width, 'placement.width'),
  };
  if (placement.width <= 0) {
    throw Object.assign(new Error('placement.width must be greater than zero'), {
      code: 'LOGO_POST_COMPOSITE_INVALID_GEOMETRY',
    });
  }

  const [sceneMetadata, logoSource, logoLayer] = await Promise.all([
    sharp(input.scenePath).metadata(),
    fs.readFile(input.logoPath),
    transparentLogo(input.logoPath, crop, input.removeBackground),
  ]);
  const sceneWidth = sceneMetadata.width || 0;
  const sceneHeight = sceneMetadata.height || 0;
  if (!sceneWidth || !sceneHeight) {
    throw Object.assign(new Error('Generated scene has no readable pixel dimensions'), {
      code: 'LOGO_POST_COMPOSITE_SCENE_INVALID',
    });
  }
  const outputWidth = Math.max(1, Math.round(sceneWidth * placement.width));
  const resized = await sharp(logoLayer)
    .resize({ width: outputWidth, withoutEnlargement: false })
    .png()
    .toBuffer();
  const resizedMetadata = await sharp(resized).metadata();
  const outputHeight = resizedMetadata.height || 0;
  const outputLeft = Math.round(sceneWidth * placement.x);
  const outputTop = Math.round(sceneHeight * placement.y);
  if (
    outputLeft + outputWidth > sceneWidth
    || outputTop + outputHeight > sceneHeight
  ) {
    throw Object.assign(new Error('Logo placement exceeds the generated scene'), {
      code: 'LOGO_POST_COMPOSITE_PLACEMENT_OUT_OF_BOUNDS',
    });
  }

  await fs.mkdir(path.dirname(input.outputPath), { recursive: true });
  const output = await sharp(input.scenePath)
    .composite([{ input: resized, left: outputLeft, top: outputTop }])
    .png()
    .toBuffer();
  await fs.writeFile(input.outputPath, output);
  return {
    outputPath: input.outputPath,
    sourceLogoSha256: crypto.createHash('sha256').update(logoSource).digest('hex'),
    outputSha256: crypto.createHash('sha256').update(output).digest('hex'),
    sourceCrop: crop,
    placement: {
      ...placement,
      outputLeft,
      outputTop,
      outputWidth,
      outputHeight,
    },
  };
}

/**
 * Deterministically places confirmed source pixels over a model-generated scene.
 * The model is responsible for the environment; identity graphics remain byte-
 * traceable to project assets through the per-layer SHA-256 audit.
 */
export async function postCompositeLockedAssets(
  input: LockedAssetsPostCompositeInput,
): Promise<LockedAssetsPostCompositeResult> {
  if (!input.layers.length || input.layers.length > 16) {
    throw Object.assign(new Error('Locked asset post-composite requires 1 to 16 layers'), {
      code: 'LOCKED_ASSET_POST_COMPOSITE_LAYER_COUNT_INVALID',
    });
  }
  if (new Set(input.layers.map((layer) => layer.layerId)).size !== input.layers.length) {
    throw Object.assign(new Error('Locked asset layerId values must be unique'), {
      code: 'LOCKED_ASSET_POST_COMPOSITE_LAYER_ID_DUPLICATE',
    });
  }
  const [sceneMetadata, sceneSource] = await Promise.all([
    sharp(input.scenePath).metadata(),
    fs.readFile(input.scenePath),
  ]);
  const sceneWidth = sceneMetadata.width || 0;
  const sceneHeight = sceneMetadata.height || 0;
  if (!sceneWidth || !sceneHeight) {
    throw Object.assign(new Error('Generated scene has no readable pixel dimensions'), {
      code: 'LOCKED_ASSET_POST_COMPOSITE_SCENE_INVALID',
    });
  }

  const prepared = await Promise.all(input.layers.map(async (layer) => {
    const crop = {
      left: finiteInteger(layer.sourceCrop.left, `${layer.layerId}.sourceCrop.left`),
      top: finiteInteger(layer.sourceCrop.top, `${layer.layerId}.sourceCrop.top`),
      width: finiteInteger(layer.sourceCrop.width, `${layer.layerId}.sourceCrop.width`),
      height: finiteInteger(layer.sourceCrop.height, `${layer.layerId}.sourceCrop.height`),
    };
    const placement = {
      x: normalized(layer.placement.x, `${layer.layerId}.placement.x`),
      y: normalized(layer.placement.y, `${layer.layerId}.placement.y`),
      width: normalized(layer.placement.width, `${layer.layerId}.placement.width`),
    };
    if (placement.width <= 0) {
      throw Object.assign(new Error(`${layer.layerId}.placement.width must be greater than zero`), {
        code: 'LOCKED_ASSET_POST_COMPOSITE_INVALID_GEOMETRY',
      });
    }
    const [source, pixels] = await Promise.all([
      fs.readFile(layer.assetPath),
      transparentLogo(layer.assetPath, crop, layer.removeBackground),
    ]);
    const outputWidth = Math.max(1, Math.round(sceneWidth * placement.width));
    const resized = await sharp(pixels).resize({ width: outputWidth }).png().toBuffer();
    const outputHeight = (await sharp(resized).metadata()).height || 0;
    const outputLeft = Math.round(sceneWidth * placement.x);
    const outputTop = Math.round(sceneHeight * placement.y);
    if (outputLeft + outputWidth > sceneWidth || outputTop + outputHeight > sceneHeight) {
      throw Object.assign(new Error(`${layer.layerId} placement exceeds the generated scene`), {
        code: 'LOCKED_ASSET_POST_COMPOSITE_PLACEMENT_OUT_OF_BOUNDS',
      });
    }
    return {
      composite: { input: resized, left: outputLeft, top: outputTop },
      audit: {
        layerId: layer.layerId,
        sourceAssetSha256: crypto.createHash('sha256').update(source).digest('hex'),
        sourceCrop: crop,
        placement: { ...placement, outputLeft, outputTop, outputWidth, outputHeight },
      },
    };
  }));

  await fs.mkdir(path.dirname(input.outputPath), { recursive: true });
  const output = await sharp(input.scenePath)
    .composite(prepared.map((item) => item.composite))
    .png()
    .toBuffer();
  await fs.writeFile(input.outputPath, output);
  return {
    outputPath: input.outputPath,
    sourceSceneSha256: crypto.createHash('sha256').update(sceneSource).digest('hex'),
    outputSha256: crypto.createHash('sha256').update(output).digest('hex'),
    layers: prepared.map((item) => item.audit),
  };
}
