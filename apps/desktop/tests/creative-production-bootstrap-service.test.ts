import test from 'node:test';
import assert from 'node:assert/strict';
import { createCreativeProductionBootstrapService } from '../src/main/creative-production-bootstrap-service.ts';

const understanding = {
  identityLocks: ['Logo 原样保留'],
  currentProblems: ['层级混乱'],
  valuableAssets: [],
  upgradePrinciples: ['建立清晰秩序'],
  oldPatternsToAvoid: ['多格物料拼贴'],
  creativeFreedom: ['允许重构材质与光线'],
  assetReadingSummary: [],
};

test('production context regeneration compiles a new user-directed Style Profile version', async () => {
  let compiledDecision: Record<string, unknown> | undefined;
  const decisions: Array<Record<string, unknown>> = [];
  const service = createCreativeProductionBootstrapService(
    {} as never,
    {
      create: async () => ({
        id: 'session-1',
        workflowState: 'VISUAL_CANON_CONFIRMED',
        understanding,
      }),
      recordDecision: async (_projectId: string, decision: Record<string, unknown>) => {
        decisions.push(decision);
      },
    } as never,
    { list: async () => [{ id: 'lock-logo' }] } as never,
    {
      getActive: async () => ({ id: 'style-1', version: '1.0.0' }),
      compile: async (_projectId: string, decision: Record<string, unknown>) => {
        compiledDecision = decision;
        return { id: 'style-2', version: '1.1.0', status: 'draft' };
      },
    } as never,
  );
  const result = await service.regenerate('project-1', {
    directionBrief: '改为明亮的现代社区小馆，强化晨间光线与开放式后厨',
  });
  assert.equal(result.styleProfile.version, '1.1.0');
  assert.equal(result.invalidated.visualCanon, true);
  assert.equal(compiledDecision?.version, '1.1.0');
  assert.match(String(compiledDecision?.visualUpgradeThesis), /晨间光线/);
  assert.equal(
    (compiledDecision?.primaryDirection as { name: string }).name,
    'User Regenerated Direction',
  );
  assert.equal(decisions[0]?.type, 'creative_direction_regenerated');
});

test('production context regeneration rejects an empty or fixed default direction', async () => {
  const service = createCreativeProductionBootstrapService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  await assert.rejects(
    () => service.regenerate('project-1', { directionBrief: '换一个' }),
    { code: 'PRODUCTION_CONTEXT_DIRECTION_REQUIRED' },
  );
});
