import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export interface SpatialStructureReferenceResult {
  schemaVersion: '1.0';
  sourceAssetId: string;
  assetId: string;
  relativePath: string;
  sha256: string;
  width: number;
  height: number;
  preprocessing: readonly string[];
}

/**
 * Removes colour/material authority from a source-space image while retaining
 * the envelope, openings, depth, circulation and major fixture geometry.
 */
export async function preprocessSpatialStructureReference(input: {
  sourceAssetId: string;
  sourcePath: string;
  outputDirectory: string;
}): Promise<SpatialStructureReferenceResult> {
  const assetId = `structure-reference-${input.sourceAssetId}`;
  const filename = `${assetId}.png`;
  const outputPath = path.join(input.outputDirectory, filename);
  await fs.mkdir(input.outputDirectory, { recursive: true });

  await sharp(input.sourcePath, { failOn: 'error' })
    .rotate()
    .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
    .grayscale()
    .blur(1.1)
    .linear(1.12, -12)
    .sharpen({ sigma: 1.25, m1: 0.55, m2: 0.25 })
    .toColourspace('b-w')
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outputPath);

  const [bytes, metadata] = await Promise.all([
    fs.readFile(outputPath),
    sharp(outputPath).metadata(),
  ]);
  if (!metadata.width || !metadata.height) {
    throw Object.assign(new Error('Preprocessed structure reference has invalid dimensions'), {
      code: 'SPATIAL_STRUCTURE_REFERENCE_INVALID',
    });
  }

  return {
    schemaVersion: '1.0',
    sourceAssetId: input.sourceAssetId,
    assetId,
    relativePath: `structure-references/${filename}`,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    width: metadata.width,
    height: metadata.height,
    preprocessing: [
      'orientation_normalized',
      'resolution_capped_1920',
      'colour_authority_removed',
      'fine_texture_suppressed',
      'structural_edges_restored',
    ],
  };
}
