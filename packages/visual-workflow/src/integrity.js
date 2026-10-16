import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function verifyImplementation(root = fileURLToPath(new URL('../', import.meta.url))) {
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'implementation-integrity.json'), 'utf8'));
  if (manifest.owner !== 'visual-workflow' || !manifest.files?.length) throw new Error('VISUAL_WORKFLOW_IMPLEMENTATION_MANIFEST_INVALID');
  for (const item of manifest.files) {
    const target = path.resolve(root, item.path);
    if (!target.startsWith(path.resolve(root) + path.sep)) throw new Error('VISUAL_WORKFLOW_IMPLEMENTATION_PATH_INVALID');
    const actual = crypto.createHash('sha256').update(await fs.readFile(target)).digest('hex');
    if (actual !== item.sha256) throw new Error(`VISUAL_WORKFLOW_IMPLEMENTATION_CHANGED: ${item.path}`);
  }
  return { owner: manifest.owner, extractionStatus: manifest.extractionStatus, qualityAcceptance: manifest.qualityAcceptance,
    implementationDigest: crypto.createHash('sha256').update(JSON.stringify(manifest.files)).digest('hex') };
}
