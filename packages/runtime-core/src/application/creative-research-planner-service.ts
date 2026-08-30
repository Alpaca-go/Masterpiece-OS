import crypto from 'node:crypto';
import type { CreativeResearchPlanDraft, CreativeResearchPlannerAdapter } from './creative-research/adapter-contracts.ts';
import type {
  CreativeResearchClue,
  CreativeResearchClueKind,
  CreativeResearchPlan,
  CreativeResearchTrack,
  CreativeResearchTrackKind,
  DesignBrief,
  PlannedQuery,
  SearchQueryKind,
} from './creative-research/contracts.ts';
import { assertCreativeResearchPlan } from './creative-research/evidence.ts';
import type {
  CreativeResearchPlanRepository,
  CreativeResearchSessionRepository,
  DesignBriefRepository,
} from './creative-research/ports.ts';
import { creativeResearchError } from './creative-research-errors.ts';

const FIRST_ROUND_KINDS = new Set<CreativeResearchTrackKind>(['CATEGORY', 'MARKET', 'CONCEPT', 'CULTURE', 'COMPLIANCE']);
const ABSTRACT_CLUE_KINDS = new Set<CreativeResearchClueKind>(['CONCEPT', 'BRAND_VALUE', 'CULTURE', 'VISUAL', 'OTHER']);

function clean(value: unknown, max = 600): string {
  return typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim().slice(0, max) : '';
}

function comparisonKey(value: string): string {
  return clean(value, 240)
    .replace(/[，,。.!！?？；;：:、]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .toLocaleLowerCase();
}

function clueKind(value: string, fallback: CreativeResearchClueKind): CreativeResearchClueKind {
  if (/合规|法规|监管|医疗广告|质控|安全|可信/u.test(value)) return 'COMPLIANCE';
  if (/东方|文化|传统|哲学|道法|人文|美学/u.test(value)) return 'CULTURE';
  if (/行业|市场|趋势|竞品|消费者|受众/u.test(value)) return 'MARKET';
  if (/价值|信任|温度|使命|愿景|承诺/u.test(value)) return 'BRAND_VALUE';
  return fallback;
}

export function buildCreativeResearchClues(brief: DesignBrief, createId: () => string): CreativeResearchClue[] {
  const clues: CreativeResearchClue[] = [];
  const seen = new Set<string>();
  const add = (input: Omit<CreativeResearchClue, 'id'> & { id?: string }) => {
    const value = clean(input.value, 180);
    const key = comparisonKey(value);
    if (!value || !key || seen.has(key)) return;
    seen.add(key);
    clues.push({ ...input, id: input.id || createId(), value });
  };
  add({ value: brief.projectSummary, kind: 'CATEGORY', enabled: true, source: 'BRIEF', priority: 'HIGH', rationale: '项目摘要提供行业与品类语境。' });
  add({ value: brief.audience, kind: 'MARKET', enabled: true, source: 'BRIEF', priority: 'HIGH', rationale: '目标受众提供市场研究语境。' });
  add({ value: brief.designTask, kind: 'CONCEPT', enabled: true, source: 'BRIEF', priority: 'HIGH', rationale: '设计任务定义首轮研究目标。' });
  for (const keyword of brief.searchKeywords) {
    const mapped: CreativeResearchClueKind = keyword.kind === 'VISUAL'
      ? 'VISUAL'
      : keyword.kind === 'CATEGORY'
        ? 'CATEGORY'
        : clueKind(keyword.value, 'CONCEPT');
    add({
      id: keyword.id,
      value: keyword.value,
      kind: mapped,
      enabled: keyword.enabled,
      source: keyword.source === 'DESIGNER' ? 'DESIGNER' : 'BRIEF',
      priority: keyword.source === 'DESIGNER' || keyword.kind === 'CATEGORY' ? 'HIGH' : keyword.kind === 'VISUAL' ? 'LOW' : 'MEDIUM',
      ...(keyword.rationale ? { rationale: keyword.rationale } : {}),
    });
  }
  for (const value of brief.conceptKeywords) {
    add({ value, kind: clueKind(value, 'CONCEPT'), enabled: true, source: 'BRIEF', priority: 'MEDIUM' });
  }
  for (const value of brief.visualKeywords) {
    add({ value, kind: 'VISUAL', enabled: true, source: 'BRIEF', priority: 'LOW' });
  }
  for (const value of brief.coreMessages) {
    add({ value, kind: clueKind(value, 'BRAND_VALUE'), enabled: true, source: 'BRIEF', priority: 'MEDIUM' });
  }
  for (const value of brief.constraints) {
    add({ value, kind: clueKind(value, 'OTHER'), enabled: true, source: 'BRIEF', priority: 'MEDIUM' });
  }
  return clues.slice(0, 48);
}

function trackKindForClue(kind: CreativeResearchClueKind): CreativeResearchTrackKind {
  if (kind === 'BRAND_VALUE' || kind === 'OTHER') return 'CONCEPT';
  return kind;
}

function queryKindForTrack(kind: CreativeResearchTrackKind): SearchQueryKind {
  return kind === 'CATEGORY' || kind === 'MARKET' || kind === 'COMPLIANCE' ? 'CATEGORY' : 'CONCEPT';
}

function validateModelDraft(
  draft: CreativeResearchPlanDraft,
  clues: CreativeResearchClue[],
  createId: () => string,
): { tracks: CreativeResearchTrack[]; queries: PlannedQuery[]; duplicates: number } {
  if (draft.tracks.length < 3 || draft.tracks.length > 6) throw new Error('Planner track count must be 3..6');
  const enabledClues = clues.filter((clue) => clue.enabled);
  const clueByValue = new Map(enabledClues.map((clue) => [comparisonKey(clue.value), clue]));
  const titleKeys = new Set<string>();
  const tracks: CreativeResearchTrack[] = draft.tracks.map((candidate, index) => {
    const title = clean(candidate.title, 120);
    const titleKey = comparisonKey(title);
    const summary = clean(candidate.summary, 500);
    const rationale = clean(candidate.rationale, 500);
    if (!title || !summary || !rationale || !titleKey || titleKeys.has(titleKey)) throw new Error('Planner track text is invalid or duplicated');
    titleKeys.add(titleKey);
    const clueIds = [...new Set(candidate.clueValues.map((value) => clueByValue.get(comparisonKey(value))?.id).filter((id): id is string => Boolean(id)))];
    if (!clueIds.length || clueIds.length !== new Set(candidate.clueValues.map(comparisonKey).filter(Boolean)).size) {
      throw new Error('Planner track must reference real clues only');
    }
    const firstRoundEligible = candidate.kind === 'VISUAL' ? false : candidate.firstRoundEligible && FIRST_ROUND_KINDS.has(candidate.kind);
    return {
      id: createId(), title, summary, clueIds, kind: candidate.kind,
      priority: candidate.priority,
      firstRoundEligible,
      rationale,
    };
  });
  const trackByTitle = new Map(tracks.map((track) => [comparisonKey(track.title), track]));
  const abstractValues = new Set(enabledClues.filter((clue) => ABSTRACT_CLUE_KINDS.has(clue.kind)).map((clue) => comparisonKey(clue.value)));
  const seenQueries = new Set<string>();
  const trackQueryCounts = new Map<string, number>();
  const queries: PlannedQuery[] = [];
  let duplicates = 0;
  for (const candidate of draft.queries) {
    const track = trackByTitle.get(comparisonKey(candidate.trackTitle));
    const text = clean(candidate.query, 180).replace(/([，,。.!！?？；;：:、])\1+/gu, '$1');
    const key = comparisonKey(text);
    if (!track?.firstRoundEligible || (trackQueryCounts.get(track.id) || 0) >= 2) continue;
    if (text.length < 6 || !key || abstractValues.has(key)) throw new Error('Planner query is empty, too short, or equals an abstract clue');
    if (candidate.intent === 'VISUAL' && !/(设计|视觉|品牌|包装|版式|字体|摄影|材质|design|identity|branding|packaging|layout|typography|photography|material|case study)/iu.test(text)) {
      throw new Error('VISUAL query requires explicit design context');
    }
    if (seenQueries.has(key)) { duplicates += 1; continue; }
    seenQueries.add(key);
    trackQueryCounts.set(track.id, (trackQueryCounts.get(track.id) || 0) + 1);
    queries.push({
      id: createId(), trackId: track.id, text, kind: queryKindForTrack(track.kind), round: 'INITIAL',
      rationale: clean(candidate.rationale, 500) || track.rationale,
      intent: candidate.intent,
      locale: candidate.locale,
    });
  }
  const knowledgeCount = queries.filter((query) => query.intent === 'KNOWLEDGE').length;
  const visualQueries = queries.filter((query) => query.intent === 'VISUAL');
  if (queries.length < 5 || queries.length > 8 || knowledgeCount < 2 || knowledgeCount > 4 || visualQueries.length < 3 || visualQueries.length > 5) {
    throw new Error('Planner query mix must be 2..4 KNOWLEDGE, 3..5 VISUAL, 5..8 total');
  }
  if (!visualQueries.some((query) => query.locale === 'ZH') || !visualQueries.some((query) => query.locale === 'EN')) {
    throw new Error('VISUAL queries require both ZH and EN locales');
  }
  return { tracks, queries, duplicates };
}

const TRACK_LABELS: Record<Exclude<CreativeResearchTrackKind, 'VISUAL'>, string> = {
  CATEGORY: '行业与品类定位',
  MARKET: '市场与受众语境',
  COMPLIANCE: '合规、品质与可信',
  CULTURE: '文化语境与现代转译',
  CONCEPT: '品牌核心概念',
};

function composeQuery(parts: string[]): string {
  const seen = new Set<string>();
  return parts.flatMap((part) => {
    const value = clean(part, 56);
    const key = comparisonKey(value);
    if (!value || !key || seen.has(key)) return [];
    seen.add(key);
    return [value];
  }).join(' ').slice(0, 180);
}

function deterministicFallback(clues: CreativeResearchClue[], createId: () => string) {
  const enabled = clues.filter((clue) => clue.enabled);
  const groups = new Map<CreativeResearchTrackKind, CreativeResearchClue[]>();
  for (const clue of enabled) {
    const kind = trackKindForClue(clue.kind);
    const values = groups.get(kind) || [];
    values.push(clue);
    groups.set(kind, values);
  }
  const priorityOrder: CreativeResearchTrackKind[] = ['CATEGORY', 'MARKET', 'COMPLIANCE', 'CULTURE', 'CONCEPT'];
  const tracks: CreativeResearchTrack[] = priorityOrder.flatMap((kind) => {
    const values = groups.get(kind) || [];
    if (!values.length) return [];
    return [{
      id: createId(),
      title: TRACK_LABELS[kind as Exclude<CreativeResearchTrackKind, 'VISUAL'>],
      summary: values.slice(0, 3).map((clue) => clue.value).join('；'),
      clueIds: values.map((clue) => clue.id),
      kind,
      priority: 'PRIMARY' as const,
      firstRoundEligible: true,
      rationale: '按真实研究线索类型确定的首轮研究主题。',
    }];
  }).slice(0, 5);
  const visualClues = groups.get('VISUAL') || [];
  if (visualClues.length && tracks.length < 6) {
    tracks.push({
      id: createId(), title: '视觉表现线索', summary: visualClues.slice(0, 3).map((clue) => clue.value).join('；'),
      clueIds: visualClues.map((clue) => clue.id), kind: 'VISUAL', priority: 'SECONDARY', firstRoundEligible: false,
      rationale: '视觉表现线索延后到第二轮研究，避免过早收窄方向。',
    });
  }
  if (tracks.length < 3) throw new Error('Deterministic planner requires at least 3 grounded tracks');
  const categoryContext = clean((groups.get('CATEGORY') || [])[0]?.value || '', 48);
  const suffix: Record<Exclude<CreativeResearchTrackKind, 'VISUAL'>, string> = {
    CATEGORY: '品牌设计 案例',
    MARKET: '品牌定位 设计案例',
    COMPLIANCE: '品牌设计 合规传播',
    CULTURE: '现代品牌视觉设计',
    CONCEPT: '品牌设计',
  };
  const seen = new Set<string>();
  let duplicates = 0;
  const eligibleTracks = tracks.filter((track) => track.firstRoundEligible);
  const knowledgeQueries = eligibleTracks.slice(0, 2).flatMap((track) => {
    const clue = enabled.find((item) => track.clueIds.includes(item.id));
    const text = composeQuery([track.kind === 'CATEGORY' ? '' : categoryContext, clue?.value || track.title, suffix[track.kind as Exclude<CreativeResearchTrackKind, 'VISUAL'>]]);
    const key = comparisonKey(text);
    if (!key || seen.has(key)) { duplicates += 1; return []; }
    seen.add(key);
    return [{ id: createId(), trackId: track.id, text, kind: queryKindForTrack(track.kind), round: 'INITIAL' as const, rationale: track.rationale, intent: 'KNOWLEDGE' as const, locale: 'ZH' as const }];
  });
  const visualSuffixes = [
    { locale: 'ZH' as const, text: '品牌视觉识别 设计案例 版式 包装' },
    { locale: 'EN' as const, text: 'brand identity design case study packaging typography' },
    { locale: 'EN' as const, text: 'visual identity design system photography material case study' },
  ];
  const visualQueries = visualSuffixes.flatMap((suffix, index) => {
    const track = eligibleTracks[index % eligibleTracks.length];
    if (!track) return [];
    const clue = enabled.find((item) => track.clueIds.includes(item.id));
    const text = composeQuery([categoryContext, clue?.value || track.title, suffix.text]);
    const key = comparisonKey(text);
    if (!key || seen.has(key)) { duplicates += 1; return []; }
    seen.add(key);
    return [{ id: createId(), trackId: track.id, text, kind: queryKindForTrack(track.kind), round: 'INITIAL' as const, rationale: '为该研究主题补充可观察的视觉设计案例。', intent: 'VISUAL' as const, locale: suffix.locale }];
  });
  const queries = [...visualQueries, ...knowledgeQueries];
  if (knowledgeQueries.length < 2 || visualQueries.length < 3) throw new Error('Deterministic planner requires a complete intent mix');
  return { tracks, queries, duplicates };
}

export function createCreativeResearchPlannerService(options: {
  sessions: CreativeResearchSessionRepository;
  briefs: DesignBriefRepository;
  plans: CreativeResearchPlanRepository;
  adapter: CreativeResearchPlannerAdapter;
  now?: () => string;
  createId?: () => string;
}) {
  const now = options.now || (() => new Date().toISOString());
  const createId = options.createId || (() => crypto.randomUUID());

  async function requireSession(sessionId: string) {
    const session = await options.sessions.get(sessionId);
    if (!session) throw creativeResearchError('CREATIVE_RESEARCH_SESSION_NOT_FOUND', `Creative Research Session 不存在：${sessionId}`);
    return session;
  }

  async function getResearchPlan(sessionId: string): Promise<CreativeResearchPlan | null> {
    const session = await requireSession(sessionId);
    const [brief, plan] = await Promise.all([options.briefs.getActiveRevision(sessionId), options.plans.get(sessionId)]);
    if (!plan) return null;
    return session.status === 'INTAKE' && plan.briefRevisionId !== brief?.id ? null : plan;
  }

  async function createResearchPlan(sessionId: string, input: { profileId: string }): Promise<CreativeResearchPlan> {
    const session = await requireSession(sessionId);
    if (session.status !== 'INTAKE') throw creativeResearchError('CREATIVE_RESEARCH_SESSION_CONFLICT', 'Research Plan 只能在 INTAKE 阶段生成；进入 RESEARCH 后计划冻结');
    const brief = await options.briefs.getActiveRevision(sessionId);
    if (!brief) throw creativeResearchError('CREATIVE_RESEARCH_BRIEF_NOT_FOUND', '生成 Research Plan 前必须存在 active Design Brief');
    const existing = await options.plans.get(sessionId);
    if (existing?.briefRevisionId === brief.id) return existing;
    const clues = buildCreativeResearchClues(brief, createId);
    let compiled: { tracks: CreativeResearchTrack[]; queries: PlannedQuery[]; duplicates: number };
    let plannerMode: CreativeResearchPlan['plannerMode'] = 'MODEL';
    try {
      if (!clean(input.profileId, 120)) throw new Error('Planner profile is missing');
      const draft = await options.adapter.createPlan({
        sessionId,
        profileId: clean(input.profileId, 120),
        brief: {
          projectSummary: brief.projectSummary,
          designTask: brief.designTask,
          audience: brief.audience,
          conceptKeywords: [...brief.conceptKeywords],
          visualKeywords: [...brief.visualKeywords],
          searchKeywords: brief.searchKeywords.map(({ id, value, kind, enabled }) => ({ id, value, kind, enabled })),
        },
        clues,
      });
      compiled = validateModelDraft(draft, clues, createId);
    } catch {
      plannerMode = 'DETERMINISTIC_FALLBACK';
      compiled = deterministicFallback(clues, createId);
    }
    const plan: CreativeResearchPlan = {
      id: createId(), sessionId, briefRevisionId: brief.id, clues,
      tracks: compiled.tracks,
      firstRoundQueries: compiled.queries,
      plannerMode,
      telemetry: {
        clueCount: clues.length,
        trackCount: compiled.tracks.length,
        initialQueryCount: compiled.queries.length,
        visualClueDeferredCount: clues.filter((clue) => clue.enabled && clue.kind === 'VISUAL').length,
        plannerFallbackUsed: plannerMode === 'DETERMINISTIC_FALLBACK',
        duplicateQueryRemovedCount: compiled.duplicates,
      },
      createdAt: now(),
    };
    assertCreativeResearchPlan(plan);
    return options.plans.save(plan);
  }

  return Object.freeze({ createResearchPlan, getResearchPlan });
}

export type CreativeResearchPlannerService = ReturnType<typeof createCreativeResearchPlannerService>;
