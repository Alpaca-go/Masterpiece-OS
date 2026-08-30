import type { ProviderCredentials } from '../shared/types.ts';
import type {
  CreativeResearchPlanDraft,
  CreativeResearchPlannerAdapter,
  CreativeResearchPlannerInput,
} from './creative-research/adapter-contracts.ts';
import {
  CREATIVE_RESEARCH_TRACK_KINDS,
  CREATIVE_RESEARCH_TRACK_PRIORITIES,
  type CreativeResearchTrackKind,
  type CreativeResearchTrackPriority,
} from './creative-research/contracts.ts';

// @ts-ignore JavaScript workspace module intentionally has no declaration file.
import { createOpenAICompatibleTextReasoner } from '@masterpiece/model-runtime/openai-compatible-text-reasoner.js';

type Reasoner = (messages: unknown, context?: unknown) => Promise<{ text?: string }>;
type ReasonerFactory = (options: Pick<ProviderCredentials, 'apiKey' | 'model' | 'provider' | 'baseUrl'>) => Reasoner;

function clean(value: unknown, max = 600): string {
  return typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim().slice(0, max) : '';
}

function cleanList(value: unknown, cap: number): string[] {
  return Array.isArray(value)
    ? [...new Set(value.map((item) => clean(item, 180)).filter(Boolean))].slice(0, cap)
    : [];
}

function parseObject(text: string): Record<string, unknown> {
  const trimmed = String(text || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/iu)?.[1]?.trim();
  const candidate = fenced || trimmed.slice(trimmed.indexOf('{'), trimmed.lastIndexOf('}') + 1);
  const parsed = JSON.parse(candidate);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Planner output root must be an object');
  return parsed as Record<string, unknown>;
}

function normalizeDraft(raw: Record<string, unknown>): CreativeResearchPlanDraft {
  if (!Array.isArray(raw.tracks) || !Array.isArray(raw.queries)) {
    throw new Error('Planner output requires tracks and queries arrays');
  }
  const tracks = raw.tracks.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Planner track must be an object');
    const value = item as Record<string, unknown>;
    const kind = clean(value.kind, 40) as CreativeResearchTrackKind;
    const priority = clean(value.priority, 40) as CreativeResearchTrackPriority;
    if (!CREATIVE_RESEARCH_TRACK_KINDS.includes(kind) || !CREATIVE_RESEARCH_TRACK_PRIORITIES.includes(priority)) {
      throw new Error('Planner track kind or priority is invalid');
    }
    return {
      title: clean(value.title, 120),
      summary: clean(value.summary, 500),
      clueValues: cleanList(value.clueValues, 24),
      kind,
      priority,
      firstRoundEligible: value.firstRoundEligible === true,
      rationale: clean(value.rationale, 500),
    };
  });
  const queries = raw.queries.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Planner query must be an object');
    const value = item as Record<string, unknown>;
    const intent = clean(value.intent, 20);
    const locale = clean(value.locale, 10);
    if (!['KNOWLEDGE', 'VISUAL'].includes(intent) || !['ZH', 'EN'].includes(locale)) throw new Error('Planner query intent or locale is invalid');
    return {
      trackTitle: clean(value.trackTitle, 120),
      query: clean(value.query, 180),
      rationale: clean(value.rationale, 500),
      intent: intent as 'KNOWLEDGE' | 'VISUAL',
      locale: locale as 'ZH' | 'EN',
    };
  });
  return { tracks, queries };
}

function buildMessages(input: CreativeResearchPlannerInput) {
  return [
    {
      role: 'system' as const,
      content: [
        '你是 Creative Research 的 Research Planner，不是搜索引擎。',
        '输入关键词仅代表研究线索，不得逐条转换成搜索请求。',
        '先把线索聚类为 3～6 个研究主题，再生成 5～8 条首轮搜索语句。',
        'Search Intent 与 Research Track 是不同维度：每个非 VISUAL Track 可以同时产生知识研究与视觉参考 Query。',
        '必须生成 2～4 条 KNOWLEDGE 和 3～5 条 VISUAL；每个 Track 最多 2 条 Query。',
        'VISUAL Query 必须包含品牌设计、视觉识别、包装、版式、摄影、material、identity、case study 等明确设计语境。',
        'VISUAL Query 必须同时包含 ZH 与 EN，且视觉搜索优先。',
        '禁止把抽象口号、价值观或内部命名单独作为 Query。只输出 JSON。',
      ].join('\n'),
    },
    {
      role: 'user' as const,
      content: JSON.stringify({
        task: '把 Research Clues 聚类成 Research Tracks，并合成克制的首轮 Search Queries',
        constraints: {
          trackCount: '3..6',
          totalQueryCount: '5..8',
          knowledgeQueryCount: '2..4',
          visualQueryCount: '3..5',
          maxQueriesPerTrack: 2,
          visualLocales: ['ZH', 'EN'],
          clueValuesMustExactlyMatchInput: true,
        },
        outputSchema: {
          tracks: [{
            title: 'string', summary: 'string', clueValues: 'input clue value[]',
            kind: CREATIVE_RESEARCH_TRACK_KINDS, priority: CREATIVE_RESEARCH_TRACK_PRIORITIES,
            firstRoundEligible: 'boolean', rationale: 'string',
          }],
          queries: [{ trackTitle: 'exact tracks[].title', query: 'string', rationale: 'string', intent: ['KNOWLEDGE', 'VISUAL'], locale: ['ZH', 'EN'] }],
        },
        brief: input.brief,
        clues: input.clues.filter((clue) => clue.enabled).map((clue) => ({
          value: clue.value,
          kind: clue.kind,
          priority: clue.priority,
          source: clue.source,
          rationale: clue.rationale,
        })),
      }),
    },
  ];
}

export function createCreativeResearchPlannerAdapter(options: {
  readCredentials(profileId: string): Promise<ProviderCredentials>;
  reasonerFactory?: ReasonerFactory;
}): CreativeResearchPlannerAdapter {
  const reasonerFactory: ReasonerFactory = options.reasonerFactory
    ?? (createOpenAICompatibleTextReasoner as ReasonerFactory);
  return Object.freeze({
    async createPlan(input: CreativeResearchPlannerInput): Promise<CreativeResearchPlanDraft> {
      const credentials = await options.readCredentials(input.profileId);
      const reasoner = reasonerFactory(credentials);
      const response = await reasoner(buildMessages(input), { maxOutputTokens: 8192 });
      return normalizeDraft(parseObject(String(response?.text || '')));
    },
  } satisfies CreativeResearchPlannerAdapter);
}
