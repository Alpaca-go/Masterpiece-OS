import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  GenerationBlueprint,
  GenerationPromptSnapshot,
} from '../../../../packages/project-contracts/src/index.ts';
import {
  compileGenerationBlueprint,
  validateGenerationBlueprint,
} from '../../../../packages/creative-production-runtime/src/generation-blueprint.js';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';
import type { ProjectStore } from './project-store.ts';
import type { CreativeDirectionService } from './creative-direction-service.ts';
import type { CreativeSessionService } from './creative-session-service.ts';

async function writeJson(filename: string, value: unknown): Promise<void> {
  const result = await atomicWriteJsonWithRetry(filename, value);
  if (!result.success) {
    throw Object.assign(new Error(`Generation Blueprint 保存失败：${result.errorMessage}`), {
      code: 'STATE_PERSIST_FAILED',
    });
  }
}

async function readJson<T>(filename: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(filename, 'utf8')) as T;
  } catch {
    return null;
  }
}

export function createGenerationBlueprintService(
  projects: ProjectStore,
  sessions: CreativeSessionService,
  directions: CreativeDirectionService,
) {
  async function locations(projectId: string) {
    const projectPaths = await projects.paths(projectId);
    const root = path.join(projectPaths.root, 'creative-session', 'blueprints');
    return {
      root,
      active: path.join(root, 'active-blueprint.json'),
    };
  }

  async function get(projectId: string, blueprintId: string): Promise<GenerationBlueprint | null> {
    const target = await locations(projectId);
    const value = await readJson<GenerationBlueprint>(path.join(target.root, `${blueprintId}.json`));
    return value ? validateGenerationBlueprint(value) as GenerationBlueprint : null;
  }

  async function getActive(projectId: string): Promise<GenerationBlueprint | null> {
    const target = await locations(projectId);
    const pointer = await readJson<{ blueprintId?: string }>(target.active);
    return pointer?.blueprintId ? get(projectId, pointer.blueprintId) : null;
  }

  async function compile(projectId: string, input: {
    userRequest: string;
    imagePurpose: GenerationPromptSnapshot['outputType'];
    materialRules?: string[];
    brandAssetRules?: string[];
    avoid?: string[];
  }): Promise<GenerationBlueprint> {
    const [session, direction, target] = await Promise.all([
      sessions.create(projectId),
      directions.getActive(projectId),
      locations(projectId),
    ]);
    if (!direction) {
      throw Object.assign(new Error('Generation Blueprint 缺少 active Creative Direction。'), {
        code: 'CREATIVE_DIRECTION_NOT_READY',
      });
    }
    await sessions.transition(projectId, 'BLUEPRINT_GENERATING', '正在把 Creative Direction 编译为单图执行蓝图。');
    try {
      const blueprint = compileGenerationBlueprint({
        projectId,
        sessionId: session.id,
        creativeDirection: direction,
        ...input,
      }) as GenerationBlueprint;
      await fs.mkdir(target.root, { recursive: true });
      await writeJson(path.join(target.root, `${blueprint.id}.json`), blueprint);
      await writeJson(target.active, {
        blueprintId: blueprint.id,
        creativeDirectionId: blueprint.creativeDirectionId,
        creativeDirectionVersion: blueprint.creativeDirectionVersion,
        updatedAt: blueprint.generatedAt,
      });
      await sessions.setActiveEntity(projectId, 'generation_blueprint', blueprint);
      await sessions.transition(projectId, 'BLUEPRINT_READY', 'Generation Blueprint 已通过校验并保存。');
      return blueprint;
    } catch (error) {
      const current = await sessions.create(projectId);
      if (current.workflowState === 'BLUEPRINT_GENERATING') {
        await sessions.transition(projectId, 'FAILED', 'Generation Blueprint 编译失败。');
      }
      throw error;
    }
  }

  return { compile, get, getActive };
}

export type GenerationBlueprintService = ReturnType<typeof createGenerationBlueprintService>;
