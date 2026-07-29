import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  CreativeDirection,
  StyleProfile,
  VisualExploration,
  VisualExplorationConcept,
} from '../../../../packages/project-contracts/src/index.ts';
import {
  createVisualExploration,
  updateVisualExplorationConcept,
  validateVisualExploration,
} from '../../../../packages/creative-production-runtime/src/visual-exploration.js';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';
import type { ProjectStore } from './project-store.ts';
import type { CreativeSessionService } from './creative-session-service.ts';
import type { CreativeDirectionService } from './creative-direction-service.ts';
import type { StyleProfileService } from './style-profile-service.ts';
import type { ImageGenerationService } from './image-generation/service.ts';

const VISUAL_ONLY_BOUNDARIES = [
  'Concept Image 只探索色彩关系、材质语言、光线、空间关系、构图规则与品牌气质。',
  '不要生成、继承、临摹或重绘任何 Logo、品牌文字、标题排版、海报文案。',
  '不要复制 Anchor Image 或既有图片中的具体布局。',
  '使用无文字、无标识的中性占位表面表达视觉方向。',
];

async function writeJson(filename: string, value: unknown): Promise<void> {
  const result = await atomicWriteJsonWithRetry(filename, value);
  if (!result.success) {
    throw Object.assign(new Error(`Visual Exploration 保存失败：${result.errorMessage}`), {
      code: 'STATE_PERSIST_FAILED',
    });
  }
}

function list(values: unknown): string {
  return (Array.isArray(values) ? values : [])
    .map((value) => String(value).trim())
    .filter(Boolean)
    .map((value) => `- ${value}`)
    .join('\n') || '- 待探索';
}

function conceptPrompt(
  exploration: VisualExploration,
  concept: VisualExplorationConcept,
  direction: CreativeDirection,
  style: StyleProfile,
): string {
  return [
    '# Visual Exploration Concept',
    `Exploration ${exploration.id} · Concept ${concept.index}/${exploration.conceptCount}`,
    `Type: ${concept.title}`,
    `Objective: ${concept.objective}`,
    '',
    '# Creative Direction',
    direction.primaryConcept,
    direction.designStrategy,
    `Visual world: ${direction.visualWorld}`,
    `Color strategy: ${direction.colorStrategy}`,
    `Material strategy: ${direction.materialStrategy}`,
    `Composition strategy: ${direction.compositionStrategy}`,
    `Photography strategy: ${direction.photographyStrategy}`,
    '',
    '# Style Profile',
    `Essence: ${style.styleEssence.summary}`,
    `Keywords:\n${list(style.styleEssence.keywords)}`,
    `Colors:\n${list([
      ...style.colorSystem.primary,
      ...style.colorSystem.secondary,
      ...style.colorSystem.accent,
    ])}`,
    `Materials:\n${list([
      ...style.materialAndTexture.materials,
      ...style.materialAndTexture.surfaceRules,
    ])}`,
    '',
    '# Visual Only Boundaries',
    list(VISUAL_ONLY_BOUNDARIES),
    '',
    '# Output',
    '生成一张独立概念图，用于设计师比较视觉方向，不作为最终品牌资产。',
    '单一完整画面，无拼贴、无水印、无可读文字、无 Logo。',
  ].filter((value) => value !== undefined && value !== null).join('\n');
}

function sizeFor(concept: VisualExplorationConcept): string {
  if (concept.aspectRatio === '16:9') return '1440*810';
  if (concept.aspectRatio === '4:5') return '1024*1280';
  return '1024*1024';
}

export function createVisualExplorationService(
  projects: ProjectStore,
  sessions: CreativeSessionService,
  directions: CreativeDirectionService,
  styles: StyleProfileService,
  imageGeneration: ImageGenerationService,
) {
  async function locations(projectId: string, explorationId?: string) {
    const projectRoot = (await projects.paths(projectId)).root;
    const root = path.join(projectRoot, 'visual-explorations');
    const explorationRoot = explorationId ? path.join(root, explorationId) : root;
    return {
      root,
      explorationRoot,
      record: path.join(explorationRoot, 'exploration.json'),
    };
  }

  async function persist(exploration: VisualExploration): Promise<VisualExploration> {
    validateVisualExploration(exploration);
    const target = await locations(exploration.projectId, exploration.id);
    await fs.mkdir(target.explorationRoot, { recursive: true });
    await writeJson(target.record, exploration);
    return exploration;
  }

  async function get(projectId: string, explorationId: string): Promise<VisualExploration | null> {
    try {
      const target = await locations(projectId, explorationId);
      const value = JSON.parse(await fs.readFile(target.record, 'utf8'));
      const exploration = validateVisualExploration(value) as VisualExploration;
      return exploration.projectId === projectId ? exploration : null;
    } catch {
      return null;
    }
  }

  async function listExplorations(projectId: string): Promise<VisualExploration[]> {
    const target = await locations(projectId);
    const entries = await fs.readdir(target.root, { withFileTypes: true }).catch(() => []);
    const explorations = await Promise.all(entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => get(projectId, entry.name)));
    return explorations
      .filter((item): item is VisualExploration => Boolean(item))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async function generate(projectId: string, input: {
    conceptCount?: number;
    apiProfileId?: string;
    dryRun?: boolean;
  }): Promise<VisualExploration> {
    const [direction, style] = await Promise.all([
      directions.getActive(projectId),
      styles.getActive(projectId),
    ]);
    if (!direction || !style) {
      throw Object.assign(new Error('Visual Exploration 缺少 Creative Direction 或 Style Profile。'), {
        code: 'VISUAL_EXPLORATION_CONTEXT_INVALID',
      });
    }
    let exploration = createVisualExploration({
      projectId,
      creativeDirection: direction,
      styleProfile: style,
      conceptCount: input.conceptCount,
    }) as VisualExploration;
    exploration = { ...exploration, status: 'generating' };
    await persist(exploration);
    await sessions.setActiveEntity(projectId, 'visual_exploration', { id: exploration.id });
    const session = await sessions.create(projectId);
    if (session.workflowState === 'STYLE_PROFILE_CREATED') {
      await sessions.transition(
        projectId,
        'VISUAL_EXPLORATION_GENERATING',
        `正在生成 ${exploration.conceptCount} 个 Visual Concept。`,
      );
    }

    for (const initial of exploration.concepts) {
      exploration = updateVisualExplorationConcept(
        exploration,
        initial.id,
        { status: 'generating' },
      ) as VisualExploration;
      await persist(exploration);
      const concept = exploration.concepts.find((item) => item.id === initial.id)!;
      try {
        const run = await imageGeneration.startCompiledCreativeTask({
          projectId,
          compiledPrompt: conceptPrompt(exploration, concept, direction, style),
          promptVersion: 'visual-exploration-1.0.0',
          snapshot: {
            schemaVersion: '1.0',
            kind: 'visual-exploration-concept',
            explorationId: exploration.id,
            conceptId: concept.id,
            conceptIndex: concept.index,
            conceptType: concept.type,
            creativeDirectionId: direction.id,
            creativeDirectionVersion: direction.version,
            styleProfileId: style.id,
            styleProfileVersion: style.version,
            anchorReferenceMode: 'visual_rules_only',
            providerReferences: [],
          },
          sourceMap: {
            visualExploration: exploration.id,
            concept: concept.id,
            creativeDirection: `${direction.id}@${direction.version}`,
            styleProfile: `${style.id}@${style.version}`,
            references: [],
          },
          references: [],
          event: 'VISUAL_EXPLORATION_CONCEPT_ATTACHED',
          apiProfileId: input.apiProfileId,
          size: sizeFor(concept),
          dryRun: input.dryRun,
        });
        exploration = updateVisualExplorationConcept(
          exploration,
          concept.id,
          run.status === 'succeeded' && run.images[0]
            ? {
                status: 'generated',
                generationRunId: run.runId,
                imagePath: `image-generation/${run.runId}/${run.images[0].relativePath}`,
              }
            : input.dryRun && run.status === 'ready'
              ? { status: 'prepared', generationRunId: run.runId }
              : {
                  status: 'failed',
                  generationRunId: run.runId,
                  errorCode: run.errorCode || 'IMAGE_GENERATION_FAILED',
                  errorMessage: run.errorMessage || 'Visual Concept 生成失败。',
                },
        ) as VisualExploration;
      } catch (error) {
        exploration = updateVisualExplorationConcept(exploration, concept.id, {
          status: 'failed',
          errorCode: String((error as { code?: string }).code || 'IMAGE_GENERATION_FAILED'),
          errorMessage: error instanceof Error ? error.message : String(error),
        }) as VisualExploration;
      }
      await persist(exploration);
    }

    if (['ready', 'partially_ready'].includes(exploration.status)) {
      const current = await sessions.create(projectId);
      if (current.workflowState === 'VISUAL_EXPLORATION_GENERATING') {
        await sessions.transition(
          projectId,
          'VISUAL_EXPLORATION_READY',
          `Visual Exploration 已生成 ${exploration.concepts.filter((item) => item.status === 'generated').length} 个方向。`,
        );
      }
    }
    return exploration;
  }

  return { get, list: listExplorations, generate };
}

export type VisualExplorationService = ReturnType<typeof createVisualExplorationService>;
