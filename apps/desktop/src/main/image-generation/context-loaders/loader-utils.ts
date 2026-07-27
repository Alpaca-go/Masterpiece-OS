import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { ImageGenerationReference } from '../../../shared/types';

export async function readJson<T>(filePath: string): Promise<T | null> {
  try { return JSON.parse(await fs.readFile(filePath, 'utf8')) as T; } catch { return null; }
}

export async function hashFile(filePath: string): Promise<string> {
  try {
    return crypto.createHash('sha256').update(await fs.readFile(filePath)).digest('hex');
  } catch {
    return crypto.createHash('sha256').update(filePath).digest('hex');
  }
}

export async function referenceFiles(
  directory: string,
  role: ImageGenerationReference['role'],
  source: ImageGenerationReference['source'],
  includeReason: string,
): Promise<ImageGenerationReference[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
  const files = entries.filter((entry) => entry.isFile()).sort((a, b) => a.name.localeCompare(b.name));
  return Promise.all(files.map(async (entry) => {
    const localPath = path.join(directory, entry.name);
    return {
      assetId: `${role}-${entry.name}`,
      role,
      localPath,
      sha256: await hashFile(localPath),
      source,
      includeReason,
    };
  }));
}
