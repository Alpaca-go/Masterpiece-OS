import crypto from 'node:crypto';
import type { ReferenceSearchRefinementAdapter } from './creative-research/adapter-contracts.ts';
import type { SearchQuery, SearchQueryKind, SimilarSearchDimension, WebReferenceItem } from './creative-research/contracts.ts';
import { SIMILAR_SEARCH_DIMENSIONS } from './creative-research/contracts.ts';
import type {
  CreativeResearchSessionRepository,
  DesignBriefRepository,
  PreferenceEvidenceRepository,
  ReferenceResearchRepository,
  SearchHistoryRepository,
} from './creative-research/ports.ts';
import { creativeResearchCorrectionError } from './creative-research-correction-errors.ts';
import { creativeResearchError } from './creative-research-errors.ts';
import { activeRejectionSignals } from './creative-research-selection-service.ts';
import { lockQueryToPlatform } from './creative-research-platform-query-compiler.ts';
import type { VisualReferencePlatform } from './creative-research/contracts.ts';

function normalized(value: string): string { return String(value || '').replace(/\s+/gu, ' ').trim().toLocaleLowerCase(); }

export function createCreativeResearchSearchRefinementService(options: {
  sessions: CreativeResearchSessionRepository;
  briefs: DesignBriefRepository;
  history: SearchHistoryRepository;
  references: ReferenceResearchRepository;
  insights: PreferenceEvidenceRepository;
  adapter: ReferenceSearchRefinementAdapter;
  now?: () => string;
  createId?: () => string;
}) {
  const now = options.now || (() => new Date().toISOString());
  const createId = options.createId || (() => crypto.randomUUID());

  async function context(sessionId: string) {
    const session = await options.sessions.get(sessionId);
    if (!session) throw creativeResearchError('CREATIVE_RESEARCH_SESSION_NOT_FOUND', `Creative Research Session 不存在：${sessionId}`);
    if (session.status !== 'RESEARCH') throw creativeResearchError('CREATIVE_RESEARCH_SESSION_CONFLICT', '只有 RESEARCH Session 可以规划纠偏搜索');
    const brief = await options.briefs.getActiveRevision(sessionId);
    if (!brief) throw creativeResearchError('CREATIVE_RESEARCH_BRIEF_NOT_FOUND', '纠偏搜索需要 active Design Brief');
    const [history, references, selections, negatives, insights] = await Promise.all([
      options.history.listSessionSearchHistory(sessionId), options.references.listSessionReferences(sessionId),
      options.references.listSelections(sessionId), options.references.listNegativeSignals(sessionId), options.insights.listInsights(sessionId),
    ]);
    return { session, brief, history, references, selections, negatives, insights };
  }

  async function plan(input: {
    sessionId: string;
    profileId: string;
    mode: 'REFRESH' | 'SIMILAR';
    sourceReferenceId?: string;
    sourcePreferenceInsightId?: string;
    dimension?: SimilarSearchDimension;
    targetKind?: SearchQueryKind;
  }): Promise<SearchQuery[]> {
    const data = await context(String(input.sessionId || '').trim());
    const enabled = data.brief.searchKeywords.filter((item) => item.enabled);
    const activeNegatives = activeRejectionSignals(data.selections, data.negatives);
    const lastBatch = data.history.at(-1)?.batch;
    let reference: WebReferenceItem | undefined;
    let preference = undefined as typeof data.insights[number] | undefined;
    if (input.mode === 'SIMILAR') {
      const hasReference = Boolean(input.sourceReferenceId);
      const hasPreference = Boolean(input.sourcePreferenceInsightId);
      if (hasReference === hasPreference) throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_SOURCE_INVALID', '找相似必须且只能指定一个 Reference 或 Preference Insight');
      if (!input.targetKind || !['CONCEPT', 'CATEGORY'].includes(input.targetKind)) throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_INPUT_INVALID', '找相似的目标研究类型无效');
      if (hasReference) {
        if (!input.dimension || !SIMILAR_SEARCH_DIMENSIONS.includes(input.dimension)) throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_INPUT_INVALID', '找相似的视觉维度无效');
        const candidate = data.references.find((item) => item.id === input.sourceReferenceId);
        if (!candidate || candidate.sessionId !== data.session.id || candidate.sourceType !== 'WEB_REFERENCE') {
          throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_SOURCE_INVALID', '找相似的 Reference 不属于当前 Session');
        }
        reference = candidate;
      } else {
        preference = data.insights.find((item) => item.id === input.sourcePreferenceInsightId && item.sessionId === data.session.id);
        if (!preference) throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_SOURCE_INVALID', '找更多类似的 Preference Insight 不属于当前 Session');
      }
    }
    const drafts = await options.adapter.planQueries({
      sessionId: data.session.id,
      profileId: String(input.profileId || '').trim(),
      mode: input.mode,
      enabledSearchKeywords: enabled.map(({ id, value, kind }) => ({ id, value, kind })),
      conceptKeywords: data.brief.conceptKeywords,
      visualKeywords: data.brief.visualKeywords,
      recentQueries: data.history.slice(-32).map(({ id, text, providerQueryText, kind, batch }) => ({ id, text, providerQueryText, kind, batch })),
      selections: data.selections.filter((item) => item.state !== 'NONE').map(({ referenceId, selectedAttributes, designerNote }) => ({ referenceId, selectedAttributes, designerNote })),
      activeRejectionReasons: activeNegatives.map(({ sourceReferenceId, reason }) => ({ sourceReferenceId: sourceReferenceId!, reason })),
      preferenceInsights: data.insights.slice(-12).map((item) => ({ id: item.id, category: item.category, text: item.designerOverride || item.summary })),
      ...(input.mode === 'SIMILAR' ? { similar: {
        dimension: input.dimension,
        targetKind: input.targetKind!,
        ...(reference ? { reference: {
          id: reference.id, title: reference.title || reference.publisherOrDomain, publisher: reference.publisherOrDomain,
          remoteImageUrl: reference.remoteImageUrl,
          selectedAttributes: data.selections.find((item) => item.referenceId === reference!.id)?.selectedAttributes || [],
          designerNote: data.selections.find((item) => item.referenceId === reference!.id)?.designerNote,
        } } : {}),
        ...(preference ? { preferenceInsight: {
          id: preference.id, category: preference.category, text: preference.designerOverride || preference.summary,
          supportingReferenceIds: preference.supportingReferenceIds,
        } } : {}),
      } } : {}),
    });
    const historical = new Set(data.history.flatMap((item) => [item.text, item.providerQueryText || '']).map(normalized).filter(Boolean));
    const enabledById = new Map(enabled.map((item) => [item.id, item]));
    const maximum = input.mode === 'SIMILAR' ? 2 : 4;
    if (!drafts.length || drafts.length > maximum || drafts.some((item) => !['CONCEPT', 'CATEGORY'].includes(item.kind)
      || (input.mode === 'SIMILAR' && item.kind !== input.targetKind)
      || !item.derivedFromKeywordIds.length
      || item.derivedFromKeywordIds.some((id) => !enabledById.has(id))
      || !item.derivedFromKeywordIds.some((id) => enabledById.get(id)?.kind === item.kind))) {
      throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_OUTPUT_INVALID', '搜索纠偏结果违反数量、类型或 keyword evidence contract');
    }
    const outputKeys = drafts.map((item) => normalized(item.text));
    if (outputKeys.some((key) => !key || historical.has(key)) || new Set(outputKeys).size !== outputKeys.length) {
      throw creativeResearchCorrectionError('CREATIVE_RESEARCH_REFRESH_NO_NOVEL_QUERY', '当前关键词已经很难产生新的搜索组合，建议调整关键词。');
    }
    const timestamp = now();
    const batch = createId();
    const origin = input.mode === 'REFRESH' ? 'REFRESH' : 'SIMILAR';
    const platforms: VisualReferencePlatform[] = reference?.platform
      ? [reference.platform]
      : ['ZCOOL', 'HUABAN', 'PINTEREST'];
    const queries: SearchQuery[] = drafts.map((draft, index) => {
      const platform = platforms[index % platforms.length]!;
      return ({
      id: createId(), sessionId: data.session.id, text: lockQueryToPlatform(draft.text, platform), kind: draft.kind, batch, status: 'PENDING',
      derivedFromKeywordIds: draft.derivedFromKeywordIds, createdAt: timestamp, origin, excludeSeen: true,
      intent: 'VISUAL', locale: platform === 'PINTEREST' ? 'EN' : 'ZH', platform,
      ...(reference?.groupId ? { groupId: reference.groupId } : {}),
      ...(lastBatch ? { parentQueryIds: data.history.filter((item) => item.batch === lastBatch).map((item) => item.id) } : {}),
      ...(reference ? { sourceReferenceIds: [reference.id] } : {}),
      ...(preference ? { sourcePreferenceInsightIds: [preference.id] } : {}),
    }); });
    for (const query of queries) await options.history.appendQuery(query);
    return queries;
  }

  return Object.freeze({
    planRefreshSearch: (sessionId: string, profileId: string) => plan({ sessionId, profileId, mode: 'REFRESH' }),
    planSimilarSearch: (input: { sessionId: string; profileId: string; sourceReferenceId?: string; sourcePreferenceInsightId?: string; dimension?: SimilarSearchDimension; targetKind: SearchQueryKind }) => plan({ ...input, mode: 'SIMILAR' }),
  });
}
