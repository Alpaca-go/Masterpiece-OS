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
  if (Array.isArray(raw.groups)) {
    const visualGroups = raw.groups.map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Visual reference group must be an object');
      const value = item as Record<string, unknown>;
      const kind = clean(value.kind, 40);
      const keywords = cleanList(value.keywords, 3);
      if (!['INDUSTRY', 'POSITIONING', 'CROSS_CATEGORY'].includes(kind) || keywords.length < 1) throw new Error('Visual reference group kind or keywords are invalid');
      return { kind: kind as 'INDUSTRY' | 'POSITIONING' | 'CROSS_CATEGORY', title: clean(value.title, 120), keywords,
        rationale: clean(value.rationale, 500), priority: Number.isFinite(value.priority) ? Number(value.priority) : index + 1 };
    });
    if (visualGroups.length < 2 || visualGroups.length > 4) throw new Error('Visual reference plan requires 2 to 4 groups');
    if (visualGroups.reduce((total, group) => total + group.keywords.length, 0) > 10) throw new Error('Visual reference plan permits at most 10 keywords');
    return { visualGroups };
  }
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
        '你是 Creative Research 的视觉参考关键词规划器，不是搜索引擎。',
        '你的目标不是开放互联网研究，而是为品牌设计师提炼最精简的视觉参考关键词组；最终来源仅限站酷、花瓣与 Pinterest。',
        '优先围绕行业属性、定位气质、跨行业同类三层组织；每层只保留 1～3 个品类词。',
        '不要输出品牌口号、宣传语、抽象价值词、长句、企业叙事、技术描述或公关语言。',
        '输入关键词仅代表研究线索，不得逐条转换成搜索请求。',
        '输出 2～4 个关键词组，默认严格输出 3 个：INDUSTRY、POSITIONING、CROSS_CATEGORY。',
        '每组 1～3 个关键词，总关键词建议 4～8 个、不得超过 10 个。关键词必须短、品类化、可直接指导设计平台检索。',
        '禁止把抽象口号、价值观或内部命名单独作为关键词。只输出 JSON。',
      ].join('\n'),
    },
    {
      role: 'user' as const,
      content: JSON.stringify({
        task: '把 Brief 与 Research Clues 提炼成极简视觉参考关键词组',
        constraints: {
          groupCount: '2..4; target 3', keywordCountPerGroup: '1..3; target 2', totalKeywordCount: '<=10',
        },
        outputSchema: {
          groups: [{ kind: ['INDUSTRY', 'POSITIONING', 'CROSS_CATEGORY'], title: 'string', keywords: ['1..3 short category terms'], rationale: 'string', priority: 'number' }],
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
