import crypto from "node:crypto";
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
const REFERENCE_ASSET_RESOLVER_VERSION = "reference-asset-resolver@1.0.0";
const FILE_HEADER_READ_BYTES = 16;
const SIGNATURE_PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const SIGNATURE_JPEG = Buffer.from([255, 216, 255]);
const SIGNATURE_RIFF = Buffer.from([82, 73, 70, 70]);
const SIGNATURE_WEBP_AT_8 = Buffer.from([87, 69, 66, 80]);
const REFERENCE_MIME_ALLOWLIST = /* @__PURE__ */ new Set([
  "image/png",
  "image/jpeg",
  "image/webp"
]);
const DEFAULT_MAX_REFERENCE_BYTES = 12 * 1024 * 1024;
function assertPathInside(parent, target) {
  const resolvedParent = path.resolve(parent);
  const resolvedTarget = path.resolve(target);
  const relative = path.relative(resolvedParent, resolvedTarget);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("\u76EE\u6807\u8DEF\u5F84\u8D85\u51FA\u9879\u76EE\u6570\u636E\u76EE\u5F55");
  }
  return resolvedTarget;
}
async function detectMimeByFileSignature(absolutePath) {
  let handle = null;
  try {
    handle = await fsp.open(absolutePath, "r");
    const buffer = Buffer.alloc(FILE_HEADER_READ_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, FILE_HEADER_READ_BYTES, 0);
    if (bytesRead < 4) return null;
    if (bytesRead >= 8 && buffer.subarray(0, 8).equals(SIGNATURE_PNG)) return "image/png";
    if (buffer.subarray(0, 3).equals(SIGNATURE_JPEG)) return "image/jpeg";
    if (bytesRead >= 12 && buffer.subarray(0, 4).equals(SIGNATURE_RIFF) && buffer.subarray(8, 12).equals(SIGNATURE_WEBP_AT_8)) {
      return "image/webp";
    }
    return null;
  } catch {
    return null;
  } finally {
    if (handle) await handle.close().catch(() => void 0);
  }
}
function sha256OfFile(absolutePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(absolutePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", (error) => reject(error));
  });
}
function sha256OfBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
async function resolveReferenceAsset(assetId, options, assets) {
  const maxReferenceBytes = options.maxReferenceBytes ?? DEFAULT_MAX_REFERENCE_BYTES;
  const verifySha256 = options.verifySha256 !== false;
  const asset = assets.find((a) => a.id === assetId);
  if (!asset) {
    return {
      status: "failed",
      failure: {
        assetId,
        code: "REFERENCE_ASSET_NOT_FOUND",
        message: `Reference asset ${assetId} not found in the project asset list. Re-upload the asset(s) or rebuild the project analysis context.`
      }
    };
  }
  if (asset.status !== "ready") {
    return {
      status: "failed",
      failure: {
        assetId,
        code: "REFERENCE_ASSET_NOT_READY",
        message: `Reference asset ${assetId} status is "${asset.status}", expected "ready". The asset is not yet processed by the desktop importer.`,
        relativePath: asset.relativePath
      }
    };
  }
  let absolutePath;
  try {
    absolutePath = assertPathInside(
      options.projectRoot,
      asset.usage === "generation_reference" ? path.join(options.projectRoot, asset.relativePath) : path.join(options.projectRoot, "input", asset.relativePath)
    );
  } catch (error) {
    return {
      status: "failed",
      failure: {
        assetId,
        code: "REFERENCE_ASSET_PATH_INVALID",
        message: error instanceof Error ? error.message : "Path is outside the project root.",
        relativePath: asset.relativePath
      }
    };
  }
  const detectedMime = await detectMimeByFileSignature(absolutePath);
  if (!detectedMime) {
    return {
      status: "failed",
      failure: {
        assetId,
        code: "REFERENCE_ASSET_FORMAT_UNSUPPORTED",
        message: `Reference asset ${assetId} is not a supported image format. Only PNG, JPEG and WebP are accepted as references.`,
        relativePath: asset.relativePath,
        declaredMime: asset.mimeType
      }
    };
  }
  if (!REFERENCE_MIME_ALLOWLIST.has(detectedMime)) {
    return {
      status: "failed",
      failure: {
        assetId,
        code: "REFERENCE_ASSET_FORMAT_UNSUPPORTED",
        message: `Reference asset ${assetId} MIME "${detectedMime}" is not in the allowlist. Only PNG, JPEG and WebP are accepted as references.`,
        relativePath: asset.relativePath,
        mime: detectedMime
      }
    };
  }
  let sizeBytes;
  try {
    const stat = await fsp.stat(absolutePath);
    sizeBytes = stat.size;
  } catch (error) {
    return {
      status: "failed",
      failure: {
        assetId,
        code: "REFERENCE_ASSET_FILE_UNREADABLE",
        message: error instanceof Error ? error.message : "File is not readable.",
        relativePath: asset.relativePath,
        mime: detectedMime
      }
    };
  }
  if (sizeBytes > maxReferenceBytes) {
    return {
      status: "failed",
      failure: {
        assetId,
        code: "REFERENCE_ASSET_FILE_TOO_LARGE",
        message: `Reference asset ${assetId} size ${sizeBytes} bytes exceeds the maximum ${maxReferenceBytes}. Reduce the file size or raise the per-asset cap.`,
        relativePath: asset.relativePath,
        mime: detectedMime,
        sizeBytes
      }
    };
  }
  let actualSha256;
  if (verifySha256) {
    try {
      actualSha256 = await sha256OfFile(absolutePath);
    } catch (error) {
      return {
        status: "failed",
        failure: {
          assetId,
          code: "REFERENCE_ASSET_FILE_UNREADABLE",
          message: error instanceof Error ? error.message : "Could not read file to verify SHA256.",
          relativePath: asset.relativePath,
          mime: detectedMime
        }
      };
    }
    if (actualSha256 !== asset.sha256) {
      return {
        status: "failed",
        failure: {
          assetId,
          code: "REFERENCE_ASSET_SHA_MISMATCH",
          message: `Reference asset ${assetId} SHA256 does not match the project store. The file may have been modified after import; re-import the asset.`,
          relativePath: asset.relativePath,
          mime: detectedMime,
          declaredSha256: asset.sha256,
          actualSha256
        }
      };
    }
  } else {
    actualSha256 = asset.sha256;
  }
  return {
    status: "resolved",
    record: {
      assetId,
      role: "core_reference",
      relativePath: asset.relativePath,
      absolutePath,
      mime: detectedMime,
      sizeBytes,
      sha256: actualSha256,
      status: "ready"
    }
  };
}
async function resolveReferenceAssets(assetIds, options, assets) {
  const resolved = [];
  const failures = [];
  for (const assetId of assetIds) {
    const result = await resolveReferenceAsset(assetId, options, assets);
    if (result.status === "resolved") {
      resolved.push(result.record);
    } else {
      failures.push(result.failure);
    }
  }
  return { resolved, failures };
}
export {
  REFERENCE_ASSET_RESOLVER_VERSION,
  detectMimeByFileSignature,
  resolveReferenceAsset,
  resolveReferenceAssets,
  sha256OfBuffer,
  sha256OfFile
};
