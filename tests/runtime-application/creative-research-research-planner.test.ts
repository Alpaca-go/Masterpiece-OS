import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  CreativeResearchPlan,
  CreativeResearchSession,
  DesignBrief,
} from '@masterpiece/runtime-core/application/creative-research/contracts.ts';
import type { CreativeResearchPlannerAdapter } from '@masterpiece/runtime-core/application/creative-research/adapter-contracts.ts';
import { createCreativeResearchPlannerAdapter } from '@masterpiece/runtime-core/application/creative-research-planner-adapter.ts';
import { createCreativeResearchPlannerService } from '@masterpiece/runtime-core/application/creative-research-planner-service.ts';

const NOW = '2026-08-30T08:00:00.000Z';

function brief(id = 'brief-1', revision = 1): DesignBrief {
  return {
    id,
    sessionId: 'session-1',
    revision,
    projectSummary: '新中式餐饮品牌',
    designTask: '建立兼具文化辨识度与现代体验的品牌视觉身份',
    audience: '一二线城市年轻餐饮消费者',
    scenarios: ['门店', '社交传播'],
    coreMessages: ['当代东方餐叙'],
    constraints: ['传播内容必须真实可信'],
    conceptKeywords: ['东方秩序'],
    visualKeywords: ['克制留白'],
    searchKeywords: [
      { id: `category-${revision}`, briefId: id, value: '新中式餐饮品牌设计', kind: 'CATEGORY', source: 'AI', enabled: true, createdAt: NOW },
      { id: `concept-${revision}`, briefId: id, value: '当代东方餐叙', kind: 'CONCEPT', source: 'DESIGNER', enabled: true, createdAt: NOW },
      { id: `visual-${revision}`, briefId: id, value: '克制留白', kind: 'VISUAL', source: 'DESIGNER', enabled: true, createdAt: NOW },
    ],
    designerNotes: [],
    evidence: [],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function ids(prefix = 'planner') {
  let index = 0;
  return () => `${prefix}-${++index}`;
}

function fixture(adapter: CreativeResearchPlannerAdapter) {
  let session: CreativeResearchSession = {
    id: 'session-1', projectId: 'project-1', status: 'INTAKE', sourceDocumentIds: ['document-1'],
    activeDesignBriefId: 'brief-1', createdAt: NOW, updatedAt: NOW,
  };
  let activeBrief = brief();
  let storedPlan: CreativeResearchPlan | null = null;
  const service = createCreativeResearchPlannerService({
    sessions: {
      async create(value) { session = value; return value; },
      async get() { return session; },
      async save(value) { session = value; return value; },
      async listByProject() { return [session]; },
    },
    briefs: {
      async saveRevision(value) { activeBrief = value; return value; },
      async getActiveRevision() { return activeBrief; },
      async listRevisions() { return [activeBrief]; },
    },
    plans: {
      async save(value) { storedPlan = value; return value; },
      async get() { return storedPlan; },
    },
    adapter,
    now: () => NOW,
    createId: ids(),
  });
  return {
    service,
    setBrief(value: DesignBrief) { activeBrief = value; },
    setStatus(status: CreativeResearchSession['status']) { session = { ...session, status }; },
  };
}

test('Research Planner clusters clues, accepts a grounded model plan, and forcibly defers VISUAL tracks', async () => {
  let calls = 0;
  const stack = fixture({
    async createPlan(input) {
      calls += 1;
      assert.ok(input.clues.some((clue) => clue.kind === 'CATEGORY'));
      assert.ok(input.clues.some((clue) => clue.kind === 'MARKET'));
      assert.ok(input.clues.some((clue) => clue.kind === 'VISUAL'));
      return {
        tracks: [
          { title: '餐饮品类与定位', summary: '研究新中式餐饮品牌案例', clueValues: ['新中式餐饮品牌'], kind: 'CATEGORY', priority: 'PRIMARY', firstRoundEligible: true, rationale: '建立品类基准' },
          { title: '年轻消费市场', summary: '研究城市年轻消费者', clueValues: ['一二线城市年轻餐饮消费者'], kind: 'MARKET', priority: 'PRIMARY', firstRoundEligible: true, rationale: '理解市场语境' },
          { title: '当代东方叙事', summary: '研究文化概念如何进入品牌设计', clueValues: ['东方秩序', '当代东方餐叙'], kind: 'CULTURE', priority: 'PRIMARY', firstRoundEligible: true, rationale: '理解文化转译' },
          { title: '克制视觉表达', summary: '作为第二轮视觉线索', clueValues: ['克制留白'], kind: 'VISUAL', priority: 'SECONDARY', firstRoundEligible: true, rationale: '避免首轮过早收窄' },
        ],
        firstRoundQueries: [
          { trackTitle: '餐饮品类与定位', query: '新中式餐饮品牌定位 视觉识别 案例', rationale: '品类案例' },
          { trackTitle: '年轻消费市场', query: '新中式餐饮 年轻消费者 品牌体验 设计案例', rationale: '市场案例' },
          { trackTitle: '当代东方叙事', query: '新中式餐饮 当代东方文化 品牌视觉设计', rationale: '文化案例' },
          { trackTitle: '克制视觉表达', query: '新中式餐饮 克制留白 视觉设计', rationale: '视觉案例' },
        ],
      };
    },
  });

  const plan = await stack.service.createResearchPlan('session-1', { profileId: 'analysis-profile' });
  assert.equal(plan.plannerMode, 'MODEL');
  assert.equal(plan.briefRevisionId, 'brief-1');
  assert.equal(plan.tracks.length, 4);
  assert.equal(plan.firstRoundQueries.length, 3);
  assert.equal(plan.tracks.find((track) => track.kind === 'VISUAL')?.firstRoundEligible, false);
  assert.ok(plan.firstRoundQueries.every((query) => plan.tracks.find((track) => track.id === query.trackId)?.kind !== 'VISUAL'));
  assert.equal(plan.telemetry.visualClueDeferredCount, 1);
  assert.equal(plan.telemetry.plannerFallbackUsed, false);

  const reused = await stack.service.createResearchPlan('session-1', { profileId: 'analysis-profile' });
  assert.equal(reused.id, plan.id);
  assert.equal(calls, 1);
});

test('Research Planner falls back deterministically when model output fails validation', async () => {
  const stack = fixture({ async createPlan() { throw new Error('provider unavailable'); } });
  const plan = await stack.service.createResearchPlan('session-1', { profileId: 'analysis-profile' });

  assert.equal(plan.plannerMode, 'DETERMINISTIC_FALLBACK');
  assert.equal(plan.telemetry.plannerFallbackUsed, true);
  assert.ok(plan.tracks.length >= 3 && plan.tracks.length <= 6);
  assert.ok(plan.firstRoundQueries.length >= 3 && plan.firstRoundQueries.length <= 4);
  assert.equal(new Set(plan.firstRoundQueries.map((query) => query.text.toLocaleLowerCase())).size, plan.firstRoundQueries.length);
  assert.ok(plan.firstRoundQueries.every((query) => query.text.length >= 6 && /品牌|设计/u.test(query.text)));
  assert.ok(plan.firstRoundQueries.every((query) => plan.tracks.find((track) => track.id === query.trackId)?.kind !== 'VISUAL'));
  assert.doesNotMatch(plan.firstRoundQueries.map((query) => query.text).join(' '), /克制留白/u);
});

test('Research Plan is bound to the active Brief revision and freezes after RESEARCH starts', async () => {
  const stack = fixture({ async createPlan() { throw new Error('use fallback'); } });
  const first = await stack.service.createResearchPlan('session-1', { profileId: 'analysis-profile' });
  stack.setBrief(brief('brief-2', 2));
  assert.equal(await stack.service.getResearchPlan('session-1'), null);

  stack.setStatus('RESEARCH');
  assert.equal((await stack.service.getResearchPlan('session-1'))?.id, first.id);
  await assert.rejects(
    stack.service.createResearchPlan('session-1', { profileId: 'analysis-profile' }),
    /进入 RESEARCH 后计划冻结/u,
  );
});

test('Planner adapter performs one structured call and explicitly separates clues from search queries', async () => {
  let calls = 0;
  let serializedMessages = '';
  const adapter = createCreativeResearchPlannerAdapter({
    async readCredentials() {
      return {
        profileId: 'analysis-profile', displayName: 'Analysis', provider: 'qwen', model: 'qwen3.6-plus',
        modelType: 'analysis', protocol: 'openai-chat', baseUrl: 'https://example.invalid', apiKey: 'secret',
        isEnabled: true, isDefault: true,
      };
    },
    reasonerFactory: () => async (messages) => {
      calls += 1;
      serializedMessages = JSON.stringify(messages);
      return { text: JSON.stringify({
        tracks: [
          { title: 'Category', summary: 'category summary', clueValues: ['新中式餐饮品牌'], kind: 'CATEGORY', priority: 'PRIMARY', firstRoundEligible: true, rationale: 'category' },
          { title: 'Market', summary: 'market summary', clueValues: ['一二线城市年轻餐饮消费者'], kind: 'MARKET', priority: 'PRIMARY', firstRoundEligible: true, rationale: 'market' },
          { title: 'Concept', summary: 'concept summary', clueValues: ['建立兼具文化辨识度与现代体验的品牌视觉身份'], kind: 'CONCEPT', priority: 'PRIMARY', firstRoundEligible: true, rationale: 'concept' },
        ],
        firstRoundQueries: [
          { trackTitle: 'Category', query: 'category query context', rationale: 'category' },
          { trackTitle: 'Market', query: 'market query context', rationale: 'market' },
          { trackTitle: 'Concept', query: 'concept query context', rationale: 'concept' },
        ],
      }) };
    },
  });
  const source = brief();
  const draft = await adapter.createPlan({
    sessionId: 'session-1', profileId: 'analysis-profile',
    brief: {
      projectSummary: source.projectSummary, designTask: source.designTask, audience: source.audience,
      conceptKeywords: source.conceptKeywords, visualKeywords: source.visualKeywords,
      searchKeywords: source.searchKeywords.map(({ id, value, kind, enabled }) => ({ id, value, kind, enabled })),
    },
    clues: [
      { id: 'clue-1', value: source.projectSummary, kind: 'CATEGORY', enabled: true, source: 'BRIEF', priority: 'HIGH' },
      { id: 'clue-2', value: source.audience, kind: 'MARKET', enabled: true, source: 'BRIEF', priority: 'HIGH' },
      { id: 'clue-3', value: source.designTask, kind: 'CONCEPT', enabled: true, source: 'BRIEF', priority: 'HIGH' },
    ],
  });
  assert.equal(calls, 1);
  assert.equal(draft.tracks.length, 3);
  assert.match(serializedMessages, /不是搜索引擎/u);
  assert.match(serializedMessages, /不得逐条转换成搜索请求/u);
  assert.match(serializedMessages, /VISUAL 默认推迟到第二轮/u);
});
