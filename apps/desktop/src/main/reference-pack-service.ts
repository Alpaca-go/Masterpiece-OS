import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  ReferencePack,
  VisualMemoryReferenceCandidate,
} from '@masterpiece/project-contracts/index.ts';
import {
  compileReferencePack,
  validateReferencePack,
} from '@masterpiece/creative-production-runtime/reference-pack.js';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';
import type { ProjectStore } from './project-store.ts';
import type { VisualMemoryService } from './visual-memory-service.ts';
import type { VisualCanonService } from './visual-canon-service.ts';

async function writeJson(filename: string, value: unknown): Promise<void> {
  const result = await atomicWriteJsonWithRetry(filename, value);
  if (!result.success) {
    throw Object.assign(new Error(`Reference Pack 保存失败：${result.errorMessage}`), {
      code: 'STATE_PERSIST_FAILED',
    });
  }
}

function inside(root: string, candidate: string): string {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(candidate);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw Object.assign(new Error('Reference Pack 文件路径越界。'), {
      code: 'REFERENCE_PACK_PATH_INVALID',
    });
  }
  return resolved;
}

export function createReferencePackService(
  projects: ProjectStore,
  memories: VisualMemoryService,
  canons: VisualCanonService,
) {
  async function locations(projectId: string) {
    const projectRoot = (await projects.paths(projectId)).root;
    const memoryRoot = path.join(projectRoot, 'visual-memory');
    const packRoot = path.join(memoryRoot, 'reference-pack');
    return {
      projectRoot,
      memoryRoot,
      packRoot,
      pack: path.join(packRoot, 'reference-pack.json'),
      excludeManifest: path.join(packRoot, 'exclude', 'manifest.json'),
    };
  }

  async function get(projectId: string): Promise<ReferencePack | null> {
    const target = await locations(projectId);
    try {
      const value = JSON.parse(await fs.readFile(target.pack, 'utf8'));
      const pack = validateReferencePack(value) as ReferencePack;
      return pack.project_id === projectId ? pack : null;
    } catch {
      return null;
    }
  }

  async function build(projectId: string): Promise<ReferencePack> {
    const [memory, canon, target] = await Promise.all([
      memories.get(projectId).then((value) => value ?? memories.compile(projectId)),
      canons.getActive(projectId),
      locations(projectId),
    ]);
    const anchors: VisualMemoryReferenceCandidate[] = (canon?.status === 'confirmed'
      ? canon.canonImages
      : [])
      .filter((image) => image.priority === 'primary' || image.priority === 'supporting')
      .map((image) => ({
        asset_id: image.id,
        source_kind: 'generated_anchor' as const,
        source_path: image.imagePath,
        role: 'anchor_reference' as const,
        rationale: image.priority === 'primary'
          ? '已确认 Visual Canon 的 Primary Anchor。'
          : `已确认 Visual Canon 的 ${image.type} Supporting Anchor。`,
        signals: [image.type, image.priority],
        score: image.priority === 'primary' ? 100 : 94,
      }));
    const existingOriginalCandidates = [];
    for (const candidate of memory.reference_strategy.candidates) {
      const source = inside(target.projectRoot, path.join(target.projectRoot, candidate.source_path));
      if (await fs.stat(source).then((stat) => stat.isFile()).catch(() => false)) {
        existingOriginalCandidates.push(candidate);
      }
    }
    const existingAnchors = [];
    for (const anchor of anchors) {
      const source = inside(target.projectRoot, path.join(target.projectRoot, anchor.source_path));
      if (await fs.stat(source).then((stat) => stat.isFile()).catch(() => false)) {
        existingAnchors.push(anchor);
      }
    }
    const pack = compileReferencePack({
      visualMemory: {
        ...memory,
        reference_strategy: {
          ...memory.reference_strategy,
          candidates: existingOriginalCandidates,
        },
      },
      anchors: existingAnchors,
    }) as ReferencePack;

    if (path.dirname(target.packRoot) !== target.memoryRoot) {
      throw Object.assign(new Error('Reference Pack 清理目录越界。'), {
        code: 'REFERENCE_PACK_PATH_INVALID',
      });
    }
    await fs.rm(target.packRoot, { recursive: true, force: true });
    await Promise.all(['locked', 'style', 'exclude', 'anchor'].map((role) =>
      fs.mkdir(path.join(target.packRoot, role), { recursive: true })));
    for (const item of pack.items) {
      const source = inside(target.projectRoot, path.join(target.projectRoot, item.source_path));
      const destination = inside(target.projectRoot, path.join(target.projectRoot, item.pack_path));
      await fs.copyFile(source, destination);
    }
    await writeJson(target.pack, pack);
    await writeJson(target.excludeManifest, {
      schema_version: '1.0',
      visual_memory_id: memory.id,
      excluded: pack.excluded,
      created_at: pack.created_at,
    });
    return pack;
  }

  return { get, build };
}

export type ReferencePackService = ReturnType<typeof createReferencePackService>;
