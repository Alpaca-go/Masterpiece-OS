import test from 'node:test';
import assert from 'node:assert/strict';
import { createCreativeProductionBootstrapService } from '../src/main/creative-production-bootstrap-service.ts';

const understanding = {
  schemaVersion: '1.0',
  generatedAt: '2026-07-28T00:00:00.000Z',
  identityLocks: ['Logo 原样保留'],
  currentProblems: ['层级混乱'],
  valuableAssets: [],
  upgradePrinciples: ['建立清晰秩序'],
  oldPatternsToAvoid: ['多格物料拼贴'],
  creativeFreedom: ['允许重构材质与光线'],
  assetReadingSummary: [],
};

const direction = {
  id: 'direction-1',
  version: '1.0.0',
  generatedAt: '2026-07-28T01:00:00.000Z',
  projectTransformation: '从旧 VI 陈列升级为社区共享餐桌体验',
  oldVisualProblems: ['旧海报层级混乱'],
  designStrategy: '以开放后厨、共享餐桌和晨间光线建立跨触点系统',
  primaryConcept: '晨间共享厨房',
  visualKeywords: ['开放', '温暖'],
  thingsToRemove: ['停止旧 VI 拼贴'],
  thingsToKeep: ['保留品牌名和 Logo'],
  colorStrategy: '暖白和原木为主',
  materialStrategy: '真实木材和亚光金属',
  compositionStrategy: '单一焦点和留白',
  photographyStrategy: '自然晨光下的真实情境',
  spaceStrategy: '以共享餐桌组织空间',
  packagingStrategy: '建立新的信息层级',
  posterStrategy: '建立单一事件叙事',
  generationRules: ['禁止复制旧 VI'],
};

test('production bootstrap compiles Style Profile from the active model-generated Creative Direction', async () => {
  let workflowState = 'DIRECTION_READY';
  let compiledDecision: Record<string, unknown> | undefined;
  const service = createCreativeProductionBootstrapService(
    {
      paths: async () => ({
        outputs: 'Z:/missing-output',
      }),
    } as never,
    {
      create: async () => ({
        id: 'session-1',
        workflowState,
        understanding,
      }),
      recordDecision: async () => undefined,
      transition: async (_projectId: string, next: string) => {
        workflowState = next;
      },
    } as never,
    {
      compile: async () => [{ id: 'lock-logo' }],
      list: async () => [{ id: 'lock-logo' }],
    } as never,
    {
      getActive: async () => null,
      compile: async (_projectId: string, decisionValue: Record<string, unknown>) => {
        compiledDecision = decisionValue;
        return {
          id: 'style-1',
          version: '1.0.0',
          status: 'draft',
          source: { creativeDecisionId: 'creative-decision-direction-1' },
        };
      },
    } as never,
    { getActive: async () => direction } as never,
  );
  const result = await service.prepare('project-1');
  assert.equal(result.styleProfile.source.creativeDecisionId, 'creative-decision-direction-1');
  assert.equal(compiledDecision?.visualUpgradeThesis, direction.projectTransformation);
  assert.equal(
    (compiledDecision?.primaryDirection as { name: string }).name,
    direction.primaryConcept,
  );
  assert.equal(workflowState, 'CREATIVE_DECISION_COMPLETED');
});

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
    { getActive: async () => null } as never,
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
    {} as never,
  );
  await assert.rejects(
    () => service.regenerate('project-1', { directionBrief: '换一个' }),
    { code: 'PRODUCTION_CONTEXT_DIRECTION_REQUIRED' },
  );
});
