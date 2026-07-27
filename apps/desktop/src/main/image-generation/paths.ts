/**
 * 生图功能 V1：运行目录路径解析（§11.2）。
 *
 * 项目根目录命名为 <sanitizedName>-<id8>（与 project-store 一致），
 * 需扫描 project.json 的 id 字段定位；不能直接用 projectId 作目录名。
 *
 * 结构：<projectRoot>/image-generation/<runId>/
 *   ├─ run.json
 *   ├─ task.json
 *   ├─ source-context-snapshot.json
 *   ├─ compiled-prompt.md
 *   ├─ prompt-source-map.json
 *   ├─ provider-request.redacted.json
 *   ├─ provider-response.redacted.json
 *   ├─ events.ndjson
 *   ├─ warnings.json
 *   ├─ metrics.json
 *   ├─ review.json
 *   ├─ retry-history.json
 *   ├─ images/
 *   └─ thumbnails/
 */
import fs from 'node:fs/promises';
import path from 'node:path';

/** 扫描 projects 目录，按 project.json 的 id 定位项目根目录（与 project-store.rootForId 一致）。 */
export async function resolveProjectRoot(dataPath: string, projectId: string): Promise<string> {
  const projectsRoot = path.join(path.resolve(dataPath), 'projects');
  const entries = await fs.readdir(projectsRoot, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(projectsRoot, entry.name);
    try {
      const record = JSON.parse(await fs.readFile(path.join(candidate, 'project.json'), 'utf8')) as { id?: string };
      if (record.id === projectId) return candidate;
    } catch { /* 跳过损坏目录 */ }
  }
  throw new Error(`项目 ${projectId} 不存在（在 ${projectsRoot}）。`);
}

export function imageGenRootUnder(projectRoot: string): string {
  return path.join(projectRoot, 'image-generation');
}

export function runRootUnder(projectRoot: string, runId: string): string {
  return path.join(imageGenRootUnder(projectRoot), runId);
}

export function standaloneImageGenRoot(dataPath: string, virtualProjectId: string): string {
  return path.join(path.resolve(dataPath), 'standalone-image-generation', virtualProjectId);
}

export const RUN_FILES = {
  run: 'run.json',
  task: 'task.json',
  snapshot: 'source-context-snapshot.json',
  compiledPrompt: 'compiled-prompt.md',
  promptSourceMap: 'prompt-source-map.json',
  deliverablePolicy: 'deliverable-policy.json',
  userIntentResolution: 'user-intent-resolution.json',
  referencePlan: 'reference-plan.json',
  compileFingerprint: 'compile-fingerprint.json',
  providerRequest: 'provider-request.redacted.json',
  providerResponse: 'provider-response.redacted.json',
  events: 'events.ndjson',
  warnings: 'warnings.json',
  metrics: 'metrics.json',
  review: 'review.json',
  retryHistory: 'retry-history.json',
} as const;

export function imagesDir(runRootPath: string): string {
  return path.join(runRootPath, 'images');
}

export function thumbnailsDir(runRootPath: string): string {
  return path.join(runRootPath, 'thumbnails');
}
