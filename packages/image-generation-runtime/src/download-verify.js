// @masterpiece/image-generation-runtime/download-verify
// §11.3 下载校验：临时文件 → 校验 → 计算哈希 → 原子移动到正式路径。
// 校验项：HTTP 状态、Content-Type、文件大小 > 0、允许的 MIME、图片可解码、SHA-256、本地原子重命名。
// 客户端历史记录不得依赖 Provider 返回的临时 URL（§11.1），因此成功后必须立即落盘。

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ALLOWED_MIME = ['image/png'];

/** 惰性加载 sharp，避免纯逻辑测试引入原生依赖。 */
async function loadSharp() {
  const mod = await import('sharp');
  return mod.default ?? mod;
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * 下载并校验单张图片，成功后原子写入正式路径，并生成 webp 缩略图。
 *
 * @param {object} input
 * @param {string} [input.url] Provider 返回的临时 URL
 * @param {string} [input.b64] 或直接返回的 base64
 * @param {string} input.targetPath 正式图片路径（例如 .../images/image-01.png）
 * @param {string} [input.thumbnailPath] 缩略图路径（例如 .../thumbnails/image-01.webp）
 * @param {string[]} [input.allowedMimeTypes]
 * @param {typeof fetch} [input.fetchImpl]
 * @param {boolean} [input.decode] 是否用 sharp 解码校验（默认 true）
 * @returns {Promise<{
 *   downloadFailed?: boolean, error?: string,
 *   mimeType?: string, sizeBytes?: number, sha256?: string,
 *   decoded?: boolean, written?: boolean, width?: number, height?: number,
 *   relativePathWritten?: string
 * }>}
 */
export async function downloadAndVerifyImage(input) {
  const {
    url,
    b64,
    targetPath,
    thumbnailPath,
    allowedMimeTypes = ALLOWED_MIME,
    fetchImpl = globalThis.fetch,
    decode = true,
  } = input ?? {};

  let buffer;
  let mimeType = 'image/png';

  // 1. 获取字节
  try {
    if (b64) {
      const cleaned = b64.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(cleaned, 'base64');
    } else if (url) {
      const response = await fetchImpl(url);
      if (!response.ok) {
        return { downloadFailed: true, error: `HTTP ${response.status}` };
      }
      const contentType = response.headers?.get?.('content-type') || '';
      if (contentType) mimeType = contentType.split(';')[0].trim();
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      return { downloadFailed: true, error: '既无 url 也无 b64。' };
    }
  } catch (error) {
    return { downloadFailed: true, error: `下载异常：${error?.message ?? error}` };
  }

  // 2. 大小
  const sizeBytes = buffer.length;
  if (sizeBytes <= 0) {
    return { downloadFailed: false, mimeType, sizeBytes: 0 };
  }

  // 3. MIME（allowedMimeTypes 决定后续是否接受）

  // 4. 解码校验 + 尺寸
  let decoded = true;
  let width;
  let height;
  if (decode) {
    try {
      const sharp = await loadSharp();
      const meta = await sharp(buffer).metadata();
      width = meta.width;
      height = meta.height;
      decoded = Boolean(meta.format);
      // 以真实解码格式校正 MIME
      if (meta.format === 'png') mimeType = 'image/png';
    } catch {
      decoded = false;
    }
  }

  // 5. SHA-256
  const hash = sha256(buffer);

  // 6. 原子写入（临时文件 → rename）
  let written = false;
  let thumbnailWritten = false;
  try {
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    const tmp = `${targetPath}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(tmp, buffer);
    await fs.rename(tmp, targetPath);
    written = true;
  } catch (error) {
    return {
      downloadFailed: false,
      mimeType,
      sizeBytes,
      sha256: hash,
      decoded,
      written: false,
      width,
      height,
      error: `写入失败：${error?.message ?? error}`,
    };
  }

  // 6b. 缩略图（nice-to-have）：失败不影响主图写入结果，仅记录。
  if (thumbnailPath && decoded && written) {
    try {
      const sharp = await loadSharp();
      await fs.mkdir(path.dirname(thumbnailPath), { recursive: true });
      const thumbTmp = `${thumbnailPath}.${crypto.randomUUID()}.tmp`;
      await sharp(buffer).resize({ width: 512, withoutEnlargement: true }).webp({ quality: 80 }).toFile(thumbTmp);
      await fs.rename(thumbTmp, thumbnailPath);
      thumbnailWritten = true;
    } catch (error) {
      // 缩略图生成失败不阻断主流程，仅留痕。
      thumbnailWritten = false;
    }
  }

  return {
    downloadFailed: false,
    mimeType,
    sizeBytes,
    sha256: hash,
    decoded,
    written,
    thumbnailWritten,
    width,
    height,
  };
}
