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
    const understanding = session.understanding;
    const creativeDecision = {
      schemaVersion: '6.0',
      id: `creative-decision-${session.id}`,
      projectId,
      version: '1.0.0',
      brandCoreJudgment: understanding.identityLocks,
      currentVisualProblems: understanding.currentProblems,
      retainedAssets: understanding.identityLocks,
      reconstructableAssets: understanding.creativeFreedom,
      inheritedReferenceMechanisms: [],
      prohibitedReferenceContent: understanding.oldPatternsToAvoid,
      visualUpgradeThesis: understanding.upgradePrinciples.join('；'),
      primaryDirection: {
        name: 'Creative Reading Direction',
        summary: understanding.upgradePrinciples.join('；'),
        keywords: understanding.creativeFreedom.slice(0, 8),
        mood: [],
      },
      styleBoundaries: {
        allowed: understanding.creativeFreedom,
        forbidden: understanding.oldPatternsToAvoid,
      },
      outputPriorities: [],
      risks: understanding.currentProblems,
      createdAt: new Date().toISOString(),
    };
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

  return { prepare };
}

export type CreativeProductionBootstrapService = ReturnType<typeof createCreativeProductionBootstrapService>;
