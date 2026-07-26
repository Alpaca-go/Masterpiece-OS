import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { ReferenceAssetSelection } from '../shared/types';

const REFERENCE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.zip']);
const IGNORED_DIRECTORIES = new Set(['node_modules', '.git', '.cache', 'cache', 'tmp', 'temp']);

/**
 * 参考图资产检查：展开目录、按扩展名过滤、哈希去重、生成缩略图。
 * 抽离自旧的 Reference Translation Service，供 Reference Anchor 复用，
 * 打破新参考工作流对旧生产 Service 的直接依赖。
 */
export async function inspectReferenceAssets(paths: string[]): Promise<ReferenceAssetSelection> {
  const candidates: string[] = [];
  const skipped: string[] = [];
  async function visit(source: string): Promise<void> {
    const resolved = path.resolve(source);
    const stat = await fs.stat(resolved).catch(() => null);
    if (!stat) {
      skipped.push(path.basename(resolved));
      return;
    }
    if (stat.isDirectory()) {
      for (const entry of await fs.readdir(resolved, { withFileTypes: true })) {
        if (entry.name.startsWith('.') || (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name.toLowerCase()))) continue;
        await visit(path.join(resolved, entry.name));
      }
      return;
    }
    const extension = path.extname(resolved).toLowerCase();
    if (!REFERENCE_EXTENSIONS.has(extension) || /(?:thumbs\.db|desktop\.ini|~\$)/iu.test(path.basename(resolved))) {
      skipped.push(path.basename(resolved));
      return;
    }
    candidates.push(resolved);
  }
  for (const source of [...new Set(paths.filter(Boolean))]) await visit(source);
  const items: ReferenceAssetSelection['items'] = [];
  const seen = new Set<string>();
  let duplicateCount = 0;
  for (const sourcePath of candidates) {
    const stat = await fs.stat(sourcePath);
    const fingerprint = `${path.basename(sourcePath).toLowerCase()}|${stat.size}|${Math.round(stat.mtimeMs)}`;
    if (seen.has(fingerprint)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(fingerprint);
    const extension = path.extname(sourcePath).toLowerCase();
    let thumbnailDataUrl: string | undefined;
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) {
      thumbnailDataUrl = await sharp(sourcePath)
        .rotate()
        .resize({ width: 240, height: 160, fit: 'cover' })
        .jpeg({ quality: 72 })
        .toBuffer()
        .then((value) => `data:image/jpeg;base64,${value.toString('base64')}`)
        .catch(() => undefined);
    }
    items.push({
      sourcePath,
      name: path.basename(sourcePath),
      extension,
      sizeBytes: stat.size,
      fingerprint,
      thumbnailDataUrl
    });
  }
  return { items, skipped, duplicateCount };
}
