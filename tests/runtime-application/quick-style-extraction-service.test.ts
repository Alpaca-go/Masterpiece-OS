import test from 'node:test';
import assert from 'node:assert/strict';
import { createQuickStyleExtractionService } from '@masterpiece/runtime-core/application/quick-style-extraction-service.ts';

const capsule = {
  schemaVersion: '1.0',
  sourceRunId: 'reference-run-1',
  currentProjectId: 'project-1',
  generatedAt: '2026-07-28T00:00:00.000Z',
  currentProject: {
    brandName: '测试品牌',
    industry: '零售',
    logoLocked: true,
    logoAssetIds: ['logo-1'],
    lockedFacts: ['Logo 原样保留'],
    coreProducts: ['产品'],
    businessTouchpoints: ['包装', '海报'],
  },
  projectFacts: {},
  inheritedStyle: {
    color: ['低饱和暖色'],
    layoutAndTypography: ['单一焦点'],
    graphicLanguage: ['克制线条'],
    materialAndPhotography: ['真实纸张'],
    extensionMechanism: ['留白延展'],
  },
  userPreference: null,
  userAvoidance: ['不要多格拼贴'],
  prohibitedReferenceIdentity: {
    brandNames: ['参考品牌'],
    logos: ['参考 Logo'],
    slogans: [],
    signatureGraphics: [],
    proprietaryPatterns: [],
  },
  anchorGoal: '建立克制、真实的新品牌视觉方向',
  aspectRatio: '1:1',
  humanNotes: [],
  uncertainties: [],
};

test('Quick Extraction compiles an approved capsule into the standard Style Profile pipeline', async () => {
  const transitions: string[] = [];
  let compiledDecision: Record<string, unknown> | undefined;
  const service = createQuickStyleExtractionService(
    {
      getRun: async () => ({ projectId: 'project-1', decision: 'approved' }),
      getCapsule: async () => capsule,
    } as never,
    {
      create: async () => ({ id: 'session-1', workflowState: 'SESSION_CREATED' }),
      recordDecision: async () => undefined,
      transition: async (_projectId: string, state: string) => { transitions.push(state); },
    } as never,
    { compile: async () => [{ id: 'lock-logo' }] } as never,
    {
      getActive: async () => null,
      compile: async (_projectId: string, decision: Record<string, unknown>) => {
        compiledDecision = decision;
        return { id: 'style-1', status: 'draft' };
      },
    } as never,
  );
  const result = await service.extract('project-1', 'reference-run-1');
  assert.equal(result.styleProfile.id, 'style-1');
  assert.deepEqual(transitions, ['CREATIVE_DECISION_COMPLETED']);
  assert.equal(compiledDecision?.projectId, 'project-1');
  assert.match(String(compiledDecision?.visualUpgradeThesis), /克制、真实/);
  assert.deepEqual(
    (compiledDecision?.styleBoundaries as { forbidden: string[] }).forbidden,
    ['不要多格拼贴', '参考品牌', '参考 Logo'],
  );
});

test('Quick Extraction rejects unapproved sources and existing Style Profiles', async () => {
  const makeService = (decision: string, active: unknown) => createQuickStyleExtractionService(
    {
      getRun: async () => ({ projectId: 'project-1', decision }),
      getCapsule: async () => capsule,
    } as never,
    { create: async () => ({ workflowState: 'SESSION_CREATED' }) } as never,
    { compile: async () => [] } as never,
    { getActive: async () => active } as never,
  );
  await assert.rejects(
    () => makeService('pending', null).extract('project-1', 'reference-run-1'),
    { code: 'QUICK_EXTRACTION_SOURCE_INVALID' },
  );
  await assert.rejects(
    () => makeService('approved', { id: 'style-existing' }).extract('project-1', 'reference-run-1'),
    { code: 'QUICK_EXTRACTION_STYLE_EXISTS' },
  );
});
