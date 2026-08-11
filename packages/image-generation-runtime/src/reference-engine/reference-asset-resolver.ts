// r2.0 §4.11 / Phase C: Reference Asset Resolver.
//
// Replaces the A0 silent-drop helper with a complete resolver that:
//   - looks up the asset in the live project store (project.assets, not
//     the static sourceAssetRefs) so post-analysis uploads work
//   - detects MIME by FILE SIGNATURE (magic bytes), not by extension
//   - enforces the PNG / JPEG / WebP allowlist explicitly
//   - checks file size against a configurable maximum
//   - optionally re-verifies the SHA256 against the project store
//
// The resolver is pure: it takes the asset list and the project root
// as input. It does NOT depend on Electron, IPC, or any other singleton.
// This makes it cheap to unit-test in isolation, and lets both the
// vnext-service.start() path and the UI preflight channel use the same
// logic without duplicating it.

import crypto from 'node:crypto';
import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
export interface ReferenceProjectAsset {
  id: string;
  status: string;
  usage?: string;
  relativePath: string;
  mimeType: string;
  sha256: string;
}

export const REFERENCE_ASSET_RESOLVER_VERSION = 'reference-asset-resolver@1.0.0';

// File signature magic bytes (first N bytes that uniquely identify the format).
// We read only the first 16 bytes of the file — enough to cover every supported
// format without loading the full image into memory.
const FILE_HEADER_READ_BYTES = 16;

const SIGNATURE_PNG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]); // 8 bytes
const SIGNATURE_JPEG = Buffer.from([0xFF, 0xD8, 0xFF]); // 3 bytes
const SIGNATURE_RIFF = Buffer.from([0x52, 0x49, 0x46, 0x46]); // "RIFF"
const SIGNATURE_WEBP_AT_8 = Buffer.from([0x57, 0x45, 0x42, 0x50]); // "WEBP" at offset 8

// Reference images are limited to PNG, JPEG and WebP. PDF, ZIP and any
// non-image format must be rejected explicitly with the format error
// code; A0's silent PDF filter is now formal here.
const REFERENCE_MIME_ALLOWLIST: ReadonlySet<string> = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

// 12 MB. Matches the Seedream adapter's prompt budget ceiling; the
// product policy can override this when the brand has stricter limits.
const DEFAULT_MAX_REFERENCE_BYTES = 12 * 1024 * 1024;

export type ReferenceResolutionFailureCode =
  // r2.0 §4.11 — exact codes
  | 'REFERENCE_ASSET_NOT_FOUND'
  | 'REFERENCE_ASSET_FORMAT_UNSUPPORTED'
  | 'REFERENCE_ASSET_PATH_INVALID'
  // A0 + Phase C extensions
  | 'REFERENCE_ASSET_NOT_READY'         // asset status !== 'ready'
  | 'REFERENCE_ASSET_FILE_UNREADABLE'   // fs.open / fs.read failed
  | 'REFERENCE_ASSET_FILE_TOO_LARGE'    // exceeds maxReferenceBytes
  | 'REFERENCE_ASSET_SHA_MISMATCH';     // file changed since import

export interface ResolvedReferenceAsset {
  assetId: string;
  role: string;
  relativePath: string;
  absolutePath: string;
  mime: string;
  sizeBytes: number;
  sha256: string;
  status: 'ready';
}

export interface ReferenceResolutionFailure {
  assetId: string;
  code: ReferenceResolutionFailureCode;
  message: string;
  relativePath?: string;
  declaredMime?: string;
  mime?: string;
  sizeBytes?: number;
  declaredSha256?: string;
  actualSha256?: string;
}

export type ReferenceResolutionResult =
  | { status: 'resolved'; record: ResolvedReferenceAsset }
  | { status: 'failed'; failure: ReferenceResolutionFailure };

export interface ResolveReferenceAssetsOptions {
  projectRoot: string;
  /** Max bytes per reference. Defaults to 12 MB. */
  maxReferenceBytes?: number;
  /**
   * If true (default), re-read the file and recompute SHA256, comparing
   * to the asset record. Use false when the resolver is called in a hot
   * path where the cost of a full-file hash is unacceptable.
   */
  verifySha256?: boolean;
}

function assertPathInside(parent: string, target: string): string {
  const resolvedParent = path.resolve(parent);
  const resolvedTarget = path.resolve(target);
  const relative = path.relative(resolvedParent, resolvedTarget);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('目标路径超出项目数据目录');
  }
  return resolvedTarget;
}

/**
 * Detect MIME by file signature. Reads only the first 16 bytes of the
 * file. Returns null when the signature does not match any supported
 * format. The function is pure (file path in, MIME string out) and
 * does NOT trust the file extension.
 */
export async function detectMimeByFileSignature(absolutePath: string): Promise<string | null> {
  let handle: import('node:fs/promises').FileHandle | null = null;
  try {
    handle = await fsp.open(absolutePath, 'r');
    const buffer = Buffer.alloc(FILE_HEADER_READ_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, FILE_HEADER_READ_BYTES, 0);
    if (bytesRead < 4) return null;
    if (bytesRead >= 8 && buffer.subarray(0, 8).equals(SIGNATURE_PNG)) return 'image/png';
    if (buffer.subarray(0, 3).equals(SIGNATURE_JPEG)) return 'image/jpeg';
    if (
      bytesRead >= 12
      && buffer.subarray(0, 4).equals(SIGNATURE_RIFF)
      && buffer.subarray(8, 12).equals(SIGNATURE_WEBP_AT_8)
    ) {
      return 'image/webp';
    }
    return null;
  } catch {
    return null;
  } finally {
    if (handle) await handle.close().catch(() => undefined);
  }
}

/**
 * Streaming SHA256 of a file. Does not load the file into memory.
 */
export function sha256OfFile(absolutePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(absolutePath);
    stream.on('data', (chunk: string | Buffer) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (error) => reject(error));
  });
}

/**
 * Compute SHA256 of an in-memory buffer (used by tests and by callers
 * that already hold the file bytes).
 */
export function sha256OfBuffer(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Resolve a single reference asset ID to its normalized record, or
 * a structured failure.
 *
 * @param assetId  the asset ID the user / smoke selected
 * @param options  projectRoot + maxReferenceBytes + verifySha256
 * @param assets   the LIVE project.assets array (project store), not the
 *                 static sourceAssetRefs. This is the A0 fix: a fresh
 *                 upload that is not in the vnext visual context will
 *                 still be resolvable here.
 */
export async function resolveReferenceAsset(
  assetId: string,
  options: ResolveReferenceAssetsOptions,
  assets: ReferenceProjectAsset[],
): Promise<ReferenceResolutionResult> {
  const maxReferenceBytes = options.maxReferenceBytes ?? DEFAULT_MAX_REFERENCE_BYTES;
  const verifySha256 = options.verifySha256 !== false;

  // 1. Look up the asset in the live project store.
  const asset = assets.find((a) => a.id === assetId);
  if (!asset) {
    return {
      status: 'failed',
      failure: {
        assetId,
        code: 'REFERENCE_ASSET_NOT_FOUND',
        message: `Reference asset ${assetId} not found in the project asset list. ` +
          'Re-upload the asset(s) or rebuild the project analysis context.',
      },
    };
  }

  // 2. Reject assets that are not in the 'ready' state.
  if (asset.status !== 'ready') {
    return {
      status: 'failed',
      failure: {
        assetId,
        code: 'REFERENCE_ASSET_NOT_READY',
        message: `Reference asset ${assetId} status is "${asset.status}", expected "ready". ` +
          'The asset is not yet processed by the desktop importer.',
        relativePath: asset.relativePath,
      },
    };
  }

  // 3. Build the absolute path and assert it is inside the project root.
  let absolutePath: string;
  try {
    absolutePath = assertPathInside(
      options.projectRoot,
      asset.usage === 'generation_reference'
        ? path.join(options.projectRoot, asset.relativePath)
        : path.join(options.projectRoot, 'input', asset.relativePath),
    );
  } catch (error) {
    return {
      status: 'failed',
      failure: {
        assetId,
        code: 'REFERENCE_ASSET_PATH_INVALID',
        message: error instanceof Error ? error.message : 'Path is outside the project root.',
        relativePath: asset.relativePath,
      },
    };
  }

  // 4. Detect MIME by file signature (NOT by extension).
  const detectedMime = await detectMimeByFileSignature(absolutePath);
  if (!detectedMime) {
    return {
      status: 'failed',
      failure: {
        assetId,
        code: 'REFERENCE_ASSET_FORMAT_UNSUPPORTED',
        message: `Reference asset ${assetId} is not a supported image format. ` +
          'Only PNG, JPEG and WebP are accepted as references.',
        relativePath: asset.relativePath,
        declaredMime: asset.mimeType,
      },
    };
  }
  if (!REFERENCE_MIME_ALLOWLIST.has(detectedMime)) {
    return {
      status: 'failed',
      failure: {
        assetId,
        code: 'REFERENCE_ASSET_FORMAT_UNSUPPORTED',
        message: `Reference asset ${assetId} MIME "${detectedMime}" is not in the allowlist. ` +
          'Only PNG, JPEG and WebP are accepted as references.',
        relativePath: asset.relativePath,
        mime: detectedMime,
      },
    };
  }

  // 5. Check file size.
  let sizeBytes: number;
  try {
    const stat = await fsp.stat(absolutePath);
    sizeBytes = stat.size;
  } catch (error) {
    return {
      status: 'failed',
      failure: {
        assetId,
        code: 'REFERENCE_ASSET_FILE_UNREADABLE',
        message: error instanceof Error ? error.message : 'File is not readable.',
        relativePath: asset.relativePath,
        mime: detectedMime,
      },
    };
  }
  if (sizeBytes > maxReferenceBytes) {
    return {
      status: 'failed',
      failure: {
        assetId,
        code: 'REFERENCE_ASSET_FILE_TOO_LARGE',
        message: `Reference asset ${assetId} size ${sizeBytes} bytes exceeds the maximum ${maxReferenceBytes}. ` +
          'Reduce the file size or raise the per-asset cap.',
        relativePath: asset.relativePath,
        mime: detectedMime,
        sizeBytes,
      },
    };
  }

  // 6. Optionally verify SHA256 against the project store.
  let actualSha256: string;
  if (verifySha256) {
    try {
      actualSha256 = await sha256OfFile(absolutePath);
    } catch (error) {
      return {
        status: 'failed',
        failure: {
          assetId,
          code: 'REFERENCE_ASSET_FILE_UNREADABLE',
          message: error instanceof Error ? error.message : 'Could not read file to verify SHA256.',
          relativePath: asset.relativePath,
          mime: detectedMime,
        },
      };
    }
    if (actualSha256 !== asset.sha256) {
      return {
        status: 'failed',
        failure: {
          assetId,
          code: 'REFERENCE_ASSET_SHA_MISMATCH',
          message: `Reference asset ${assetId} SHA256 does not match the project store. ` +
            'The file may have been modified after import; re-import the asset.',
          relativePath: asset.relativePath,
          mime: detectedMime,
          declaredSha256: asset.sha256,
          actualSha256,
        },
      };
    }
  } else {
    actualSha256 = asset.sha256;
  }

  return {
    status: 'resolved',
    record: {
      assetId,
      role: 'core_reference',
      relativePath: asset.relativePath,
      absolutePath,
      mime: detectedMime,
      sizeBytes,
      sha256: actualSha256,
      status: 'ready',
    },
  };
}

/**
 * Batch resolve a list of reference asset IDs. Each ID is resolved
 * independently — one ID's failure does not abort the others. The
 * caller can map `resolved` to the actual provider references, and
 * `failures` to UI preflight markers or trace events.
 */
export async function resolveReferenceAssets(
  assetIds: string[],
  options: ResolveReferenceAssetsOptions,
  assets: ReferenceProjectAsset[],
): Promise<{
  resolved: ResolvedReferenceAsset[];
  failures: ReferenceResolutionFailure[];
}> {
  const resolved: ResolvedReferenceAsset[] = [];
  const failures: ReferenceResolutionFailure[] = [];
  for (const assetId of assetIds) {
    const result = await resolveReferenceAsset(assetId, options, assets);
    if (result.status === 'resolved') {
      resolved.push(result.record);
    } else {
      failures.push(result.failure);
    }
  }
  return { resolved, failures };
}
