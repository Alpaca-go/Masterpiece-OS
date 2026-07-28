import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  CreativeDirection,
  ProjectVisualContext,
} from '../../../../packages/project-contracts/src/index.ts';
import type { CreativeDirectionService } from './creative-direction-service.ts';
import type { CreativeSessionService } from './creative-session-service.ts';
import type { LockedAssetsService } from './locked-assets-service.ts';
import type { ProjectStore } from './project-store.ts';
import type { StyleProfileService } from './style-profile-service.ts';
import type { VisualMemoryService } from './visual-memory-service.ts';
import type { ReferencePackService } from './reference-pack-service.ts';

export function createCreativeProductionBootstrapService(
  projects: ProjectStore,
  sessions: CreativeSessionService,
  lockedAssets: LockedAssetsService,
  styles: StyleProfileService,
  directions: CreativeDirectionService,
  memories?: VisualMemoryService,
  referencePacks?: ReferencePackService,
) {
  async function attachVisualMemoryContext(projectId: string) {
    if (!memories || !referencePacks) return {};
    const visualMemory = await memories.compile(projectId);
    const referencePack = await referencePacks.build(projectId);
    return { visualMemory, referencePack };
  }
  function creativeDecisionFromDirection(
    projectId: string,
    understanding: NonNullable<Awaited<ReturnType<CreativeSessionService['create']>>['understanding']>,
    direction: CreativeDirection,
  ) {
    const strategyRules = [
      direction.designStrategy,
      direction.primaryConcept,
      direction.colorStrategy,
      direction.materialStrategy,
      direction.compositionStrategy,
      direction.photographyStrategy,
      direction.spaceStrategy,
      direction.packagingStrategy,
      direction.posterStrategy,
    ].filter((item): item is string => Boolean(item?.trim()));
    return {
      schemaVersion: '6.0',
      id: `creative-decision-${direction.id}`,
      projectId,
      version: direction.version,
      brandCoreJudgment: understanding.identityLocks,
      currentVisualProblems: direction.oldVisualProblems,
      retainedAssets: direction.thingsToKeep,
      reconstructableAssets: strategyRules,
      inheritedReferenceMechanisms: [],
      prohibitedReferenceContent: direction.thingsToRemove,
      visualUpgradeThesis: direction.projectTransformation,
      primaryDirection: {
        name: direction.primaryConcept,
        summary: direction.designStrategy,
        keywords: direction.visualKeywords,
        mood: direction.visualKeywords,
      },
      styleBoundaries: {
        allowed: strategyRules,
        forbidden: [...direction.thingsToRemove, ...direction.generationRules],
      },
      outputPriorities: [direction.spaceStrategy, direction.packagingStrategy, direction.posterStrategy]
        .filter((item): item is string => Boolean(item?.trim())),
      risks: understanding.currentProblems,
      createdAt: direction.generatedAt,
    };
  }

  async function prepare(projectId: string) {
    const [session, active, direction] = await Promise.all([
      sessions.create(projectId),
      styles.getActive(projectId),
      directions.getActive(projectId),
    ]);
    if (!session.understanding) {
      throw Object.assign(new Error('请先完成 Creative Reading，再建立生产上下文。'), {
        code: 'CREATIVE_UNDERSTANDING_MISSING',
      });
    }
    if (!direction) {
      throw Object.assign(new Error('请先生成 Creative Direction，再建立生产上下文。'), {
        code: 'CREATIVE_DIRECTION_MISSING',
      });
    }
    if (active?.source.creativeDecisionId === `creative-decision-${direction.id}`) {
      return {
        session,
        styleProfile: active,
        lockedAssets: await lockedAssets.list(projectId),
        ...await attachVisualMemoryContext(projectId),
      };
    }
    const projectPaths = await projects.paths(projectId);
    const visualContext = await fs
      .readFile(path.join(projectPaths.outputs, 'project-visual-context.json'), 'utf8')
      .then((value) => JSON.parse(value) as ProjectVisualContext)
      .catch(() => undefined);
    const locks = await lockedAssets.compile(projectId, {
      visualContext,
      understanding: session.understanding,
    });
    const creativeDecision = creativeDecisionFromDirection(
      projectId,
      session.understanding,
      direction,
    );
    await sessions.recordDecision(projectId, {
      type: 'creative_direction',
      summary: creativeDecision.visualUpgradeThesis || 'Creative Reading 生产方向已建立。',
      rationale: `由 Creative Direction ${direction.version} 转换为 V6 Creative Decision。`,
      outcome: 'confirmed',
      source: 'analysis',
    });
    const current = await sessions.create(projectId);
    if (current.workflowState === 'DIRECTION_READY') {
      await sessions.transition(projectId, 'CREATIVE_DECISION_COMPLETED', 'Creative Decision 已由 Creative Direction 建立。');
    }
    const styleProfile = await styles.compile(projectId, creativeDecision);
    return {
      session: await sessions.create(projectId),
      styleProfile,
      lockedAssets: locks,
      ...await attachVisualMemoryContext(projectId),
    };
  }

  async function regenerate(projectId: string, input: { directionBrief?: string }) {
    const directionBrief = input.directionBrief?.trim() || '';
    if (directionBrief.length < 8) {
      throw Object.assign(new Error('请至少输入 8 个字，说明这次希望 Anchor 改变的视觉方向。'), {
        code: 'PRODUCTION_CONTEXT_DIRECTION_REQUIRED',
      });
    }
    const [session, active, locks] = await Promise.all([
      sessions.create(projectId),
      styles.getActive(projectId),
      lockedAssets.list(projectId),
    ]);
    if (!session.understanding) {
      throw Object.assign(new Error('请先完成 Creative Reading，再重新生成生产上下文。'), {
        code: 'CREATIVE_UNDERSTANDING_MISSING',
      });
    }
    if (!active) {
      throw Object.assign(new Error('尚未建立初始 Style Profile，请先建立生产上下文。'), {
        code: 'STYLE_PROFILE_MISSING',
      });
    }
    const directionResult = await directions.generate(projectId, {
      understanding: session.understanding,
      directionBrief,
    });
    const decision = creativeDecisionFromDirection(
      projectId,
      session.understanding,
      directionResult.direction,
    );
    await sessions.recordDecision(projectId, {
      type: 'creative_direction_regenerated',
      summary: directionBrief,
      rationale: `用户要求在 Style Profile ${active.version} 基础上重新生成生产上下文。`,
      outcome: 'confirmed',
      source: 'user',
    });
    const styleProfile = await styles.compile(projectId, decision);
    return {
      session: await sessions.create(projectId),
      creativeDirection: directionResult.direction,
      styleProfile,
      lockedAssets: locks,
      ...await attachVisualMemoryContext(projectId),
      invalidated: {
        anchorCandidates: true,
        visualCanon: true,
        generationSeries: true,
      },
    };
  }

  return { prepare, regenerate };
}

export type CreativeProductionBootstrapService = ReturnType<typeof createCreativeProductionBootstrapService>;
