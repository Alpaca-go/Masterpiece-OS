import fs from 'node:fs/promises';
import path from 'node:path';
import type { ProjectVisualContext } from '../../../../packages/project-contracts/src/index.ts';
import type { CreativeSessionService } from './creative-session-service.ts';
import type { LockedAssetsService } from './locked-assets-service.ts';
import type { ProjectStore } from './project-store.ts';
import type { StyleProfileService } from './style-profile-service.ts';

export function createCreativeProductionBootstrapService(
  projects: ProjectStore,
  sessions: CreativeSessionService,
  lockedAssets: LockedAssetsService,
  styles: StyleProfileService,
) {
  function creativeDecisionFromUnderstanding(
    projectId: string,
    sessionId: string,
    understanding: NonNullable<Awaited<ReturnType<CreativeSessionService['create']>>['understanding']>,
    directionBrief?: string,
    version = '1.0.0',
  ) {
    const regeneratedDirection = directionBrief?.trim();
    const baseDirection = understanding.upgradePrinciples.join('；');
    const thesis = regeneratedDirection || baseDirection;
    const directionRules = regeneratedDirection
      ? [regeneratedDirection, ...understanding.creativeFreedom]
      : understanding.creativeFreedom;
    return {
      schemaVersion: '6.0',
      id: `creative-decision-${sessionId}-${version}`,
      projectId,
      version,
      brandCoreJudgment: understanding.identityLocks,
      currentVisualProblems: understanding.currentProblems,
      retainedAssets: understanding.identityLocks,
      reconstructableAssets: directionRules,
      inheritedReferenceMechanisms: [],
      prohibitedReferenceContent: understanding.oldPatternsToAvoid,
      visualUpgradeThesis: thesis,
      primaryDirection: {
        name: regeneratedDirection ? 'User Regenerated Direction' : 'Creative Reading Direction',
        summary: thesis,
        keywords: directionRules.slice(0, 8),
        mood: regeneratedDirection ? [regeneratedDirection] : [],
      },
      styleBoundaries: {
        allowed: directionRules,
        forbidden: understanding.oldPatternsToAvoid,
      },
      outputPriorities: [],
      risks: understanding.currentProblems,
      createdAt: new Date().toISOString(),
    };
  }

  async function prepare(projectId: string) {
    const [session, active] = await Promise.all([
      sessions.create(projectId),
      styles.getActive(projectId),
    ]);
    if (active) return { session, styleProfile: active, lockedAssets: await lockedAssets.list(projectId) };
    if (!session.understanding) {
      throw Object.assign(new Error('请先完成 Creative Reading，再建立生产上下文。'), {
        code: 'CREATIVE_UNDERSTANDING_MISSING',
      });
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
    const creativeDecision = creativeDecisionFromUnderstanding(
      projectId,
      session.id,
      session.understanding,
    );
    await sessions.recordDecision(projectId, {
      type: 'creative_direction',
      summary: creativeDecision.visualUpgradeThesis || 'Creative Reading 生产方向已建立。',
      rationale: '由已验证的 Creative Understanding 转换为 V6 Creative Decision。',
      outcome: 'confirmed',
      source: 'analysis',
    });
    const current = await sessions.create(projectId);
    if (current.workflowState === 'SESSION_CREATED') {
      await sessions.transition(projectId, 'CREATIVE_DECISION_COMPLETED', 'Creative Decision 已由 Reading 结果建立。');
    }
    const styleProfile = await styles.compile(projectId, creativeDecision);
    return { session: await sessions.create(projectId), styleProfile, lockedAssets: locks };
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
    const [major = 1, minor = 0] = active.version.split('.').map(Number);
    const decisionVersion = `${major}.${minor + 1}.0`;
    const decision = creativeDecisionFromUnderstanding(
      projectId,
      session.id,
      session.understanding,
      directionBrief,
      decisionVersion,
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
      styleProfile,
      lockedAssets: locks,
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
