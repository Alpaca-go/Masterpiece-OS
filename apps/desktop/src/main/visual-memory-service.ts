import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  ProjectVisualContext,
  VisualMemory,
} from '@masterpiece/project-contracts/index.ts';
import {
  compileVisualMemory,
  validateVisualMemory,
} from '@masterpiece/creative-production-runtime/visual-memory.js';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';
import type { ProjectStore } from './project-store.ts';
import type { CreativeSessionService } from './creative-session-service.ts';
import type { CreativeDirectionService } from './creative-direction-service.ts';
import type { LockedAssetsService } from './locked-assets-service.ts';
import { isAnalysisSourceAsset } from './project-assets.ts';

async function writeJson(filename: string, value: unknown): Promise<void> {
  const result = await atomicWriteJsonWithRetry(filename, value);
  if (!result.success) {
    throw Object.assign(new Error(`Visual Memory 保存失败：${result.errorMessage}`), {
      code: 'STATE_PERSIST_FAILED',
    });
  }
}

export function createVisualMemoryService(
  projects: ProjectStore,
  sessions: CreativeSessionService,
  directions: CreativeDirectionService,
  lockedAssets: LockedAssetsService,
) {
  async function locations(projectId: string) {
    const projectPaths = await projects.paths(projectId);
    const root = path.join(projectPaths.root, 'visual-memory');
    return {
      ...projectPaths,
      root,
      memory: path.join(root, 'visual-memory.json'),
      sourceSnapshot: path.join(root, 'source-snapshot.json'),
    };
  }

  async function get(projectId: string): Promise<VisualMemory | null> {
    const target = await locations(projectId);
    try {
      const value = JSON.parse(await fs.readFile(target.memory, 'utf8'));
      const memory = validateVisualMemory(value) as VisualMemory;
      return memory.project_id === projectId ? memory : null;
    } catch {
      return null;
    }
  }

  async function compile(projectId: string): Promise<VisualMemory> {
    const [project, session, direction, locks, target] = await Promise.all([
      projects.get(projectId),
      sessions.create(projectId),
      directions.getActive(projectId),
      lockedAssets.list(projectId),
      locations(projectId),
    ]);
    if (!session.understanding || !direction) {
      throw Object.assign(new Error('请先完成 Creative Reading 与 Creative Direction，再建立 Visual Memory。'), {
        code: 'VISUAL_MEMORY_SOURCE_MISSING',
      });
    }
    const visualContext = await fs.readFile(
      path.join(target.outputs, 'project-visual-context.json'),
      'utf8',
    ).then((value) => JSON.parse(value) as ProjectVisualContext).catch(() => null);
    if (!visualContext) {
      throw Object.assign(new Error('项目缺少 project-visual-context.json，无法建立 Visual Memory。'), {
        code: 'VISUAL_MEMORY_SOURCE_MISSING',
      });
    }
    const memory = compileVisualMemory({
      projectId,
      visualContext,
      understanding: session.understanding,
      creativeDirection: direction,
      lockedAssets: locks,
      assets: project.assets.filter(isAnalysisSourceAsset),
    }) as VisualMemory;
    await fs.mkdir(target.root, { recursive: true });
    await writeJson(target.sourceSnapshot, {
      schema_version: '1.0',
      project_id: projectId,
      visual_context_generated_at: visualContext.generatedAt,
      creative_understanding_generated_at: session.understanding.generatedAt,
      creative_direction_id: direction.id,
      creative_direction_version: direction.version,
      locked_asset_ids: locks.map((item) => item.id),
      asset_ids: project.assets.filter(isAnalysisSourceAsset).map((item) => item.id),
      created_at: memory.generated_at,
    });
    await writeJson(target.memory, memory);
    return memory;
  }

  return { get, compile };
}

export type VisualMemoryService = ReturnType<typeof createVisualMemoryService>;
