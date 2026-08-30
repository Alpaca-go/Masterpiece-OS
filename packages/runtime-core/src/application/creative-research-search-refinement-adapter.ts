import type { ProviderCredentials } from '../shared/types.ts';
import type {
  ReferenceSearchRefinementAdapter,
  ReferenceSearchRefinementInput,
  SearchRefinementQueryDraft,
} from './creative-research/adapter-contracts.ts';
import { creativeResearchCorrectionError, CreativeResearchCorrectionError } from './creative-research-correction-errors.ts';
// @ts-ignore JavaScript workspace module intentionally has no declaration file.
import { createOpenAICompatibleTextReasoner } from '@masterpiece/model-runtime/openai-compatible-text-reasoner.js';

type Reasoner = (messages: unknown, context?: unknown) => Promise<{ text?: string }>;
type ReasonerFactory = (options: Pick<ProviderCredentials, 'apiKey' | 'model' | 'provider' | 'baseUrl'>) => Reasoner;

function normalized(value: string): string {
  return String(value || '').replace(/\s+/gu, ' ').trim().toLocaleLowerCase();
}

function parseJson(output: string): unknown {
  const value = String(output || '').trim().replace(/^```(?:json)?\s*/iu, '').replace(/\s*```$/u, '');
  try { return JSON.parse(value); }
  catch (error) { throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_OUTPUT_INVALID', `搜索纠偏输出不是有效 JSON：${(error as Error).message}`); }
}

export function normalizeSearchRefinementDrafts(value: unknown, input: ReferenceSearchRefinementInput): SearchRefinementQueryDraft[] {
  const candidate = value && typeof value === 'object' ? value as { queries?: unknown } : {};
  const maximum = input.mode === 'SIMILAR' ? 2 : 4;
  if (!Array.isArray(candidate.queries) || candidate.queries.length < 1 || candidate.queries.length > maximum) {
    throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_OUTPUT_INVALID', `queries 必须包含 1 至 ${maximum} 条结果`);
  }
  const enabled = new Map(input.enabledSearchKeywords.map((item) => [item.id, item]));
  const historical = new Set(input.recentQueries
    .flatMap((item) => [item.text, item.providerQueryText || ''])
    .map((value) => normalized(value || ''))
    .filter(Boolean));
  const current = new Set<string>();
  return candidate.queries.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_OUTPUT_INVALID', `queries[${index}] 必须是对象`);
    const item = raw as Record<string, unknown>;
    const kind = String(item.kind || '');
    const text = String(item.text || '').replace(/\s+/gu, ' ').trim().slice(0, 240);
    const ids = Array.isArray(item.derivedFromKeywordIds)
      ? [...new Set(item.derivedFromKeywordIds.map(String).map((id) => id.trim()).filter(Boolean))]
      : [];
    if (!['CONCEPT', 'CATEGORY'].includes(kind) || !text || !ids.length || ids.some((id) => !enabled.has(id))) {
      throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_OUTPUT_INVALID', `queries[${index}] 的 kind、text 或 keyword evidence 无效`);
    }
    if (input.mode === 'SIMILAR' && kind !== input.similar?.targetKind) {
      throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_OUTPUT_INVALID', `queries[${index}] 与 target research kind 不匹配`);
    }
    if (!ids.some((id) => enabled.get(id)?.kind === kind)) {
      throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_OUTPUT_INVALID', `queries[${index}] 缺少同 kind primary keyword`);
    }
    const key = normalized(text);
    if (historical.has(key) || current.has(key)) {
      throw creativeResearchCorrectionError('CREATIVE_RESEARCH_REFRESH_NO_NOVEL_QUERY', '当前关键词已经很难产生新的搜索组合，建议调整关键词。');
    }
    current.add(key);
    return { kind: kind as SearchRefinementQueryDraft['kind'], text, derivedFromKeywordIds: ids };
  });
}

export function buildSearchRefinementMessages(input: ReferenceSearchRefinementInput): unknown[] {
  const payload = {
    task: input.mode === 'REFRESH' ? '生成不同措辞和组合的新搜索 query' : '把指定视觉特征转成真实互联网文本搜索 query',
    mode: input.mode,
    enabledSearchKeywords: input.enabledSearchKeywords.slice(0, 24),
    conceptKeywords: input.conceptKeywords.slice(0, 12),
    visualKeywords: input.visualKeywords.slice(0, 12),
    recentQueries: input.recentQueries.slice(-32),
    selections: input.selections.slice(0, 24),
    activeRejectionReasons: input.activeRejectionReasons.slice(0, 24),
    preferenceInsights: input.preferenceInsights.slice(0, 12),
    similar: input.similar ? {
      ...input.similar,
      reference: input.similar.reference ? { ...input.similar.reference, remoteImageUrl: undefined } : undefined,
    } : undefined,
  };
  const text = [
    '只输出 JSON：{"queries":[{"kind":"CONCEPT","text":"...","derivedFromKeywordIds":["..."]}]}。你的目标不是开放互联网研究，而是提炼简短、品类化、设计导向的视觉检索词；不要写 site:，Runtime 会绑定设计平台。',
    'kind 只能是 CONCEPT 或 CATEGORY；VISUAL keyword 只能作 modifier。每条 query 必须引用输入中 enabled keyword id，并包含同 kind primary keyword。',
    `最多 ${input.mode === 'SIMILAR' ? 2 : 4} 条。不得重复任一历史 text/providerQueryText，不得改变 Brief 或关键词。`,
    JSON.stringify(payload),
  ].join('\n\n');
  const image = input.mode === 'SIMILAR' && /^https?:\/\//iu.test(input.similar?.reference?.remoteImageUrl || '')
    ? [{ type: 'image_url', image_url: { url: input.similar!.reference!.remoteImageUrl } }]
    : [];
  return [
    { role: 'system', content: '你是设计师主导的视觉参考搜索纠偏器。只规划站酷、花瓣或 Pinterest 的设计案例检索词，不生成图片，只返回 JSON。' },
    { role: 'user', content: [{ type: 'text', text }, ...image] },
  ];
}

export function createCreativeResearchSearchRefinementAdapter(options: {
  readCredentials(profileId: string): Promise<ProviderCredentials>;
  reasonerFactory?: ReasonerFactory;
  onDiagnostics?: (value: { modelCallCount: number; repairCount: number; provider: string; model: string }) => void;
}): ReferenceSearchRefinementAdapter {
  const reasonerFactory: ReasonerFactory = options.reasonerFactory
    ?? (createOpenAICompatibleTextReasoner as ReasonerFactory);
  const adapter: ReferenceSearchRefinementAdapter = {
    async planQueries(input: ReferenceSearchRefinementInput) {
      const profileId = String(input.profileId || '').trim();
      if (!profileId) throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_PROFILE_REQUIRED', '必须明确选择分析 Profile');
      const credentials = await options.readCredentials(profileId).catch((error) => {
        throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_PROFILE_UNSUPPORTED', `读取所选 Profile 失败：${(error as Error).message}`);
      });
      if (credentials.profileId !== profileId || credentials.modelType !== 'analysis'
        || !['openai-chat', 'openai-chat-multimodal'].includes(String(credentials.protocol || ''))) {
        throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_PROFILE_UNSUPPORTED', '所选 Profile 必须是启用的 analysis Profile，且不能自动替换');
      }
      let reasoner: Reasoner;
      try { reasoner = reasonerFactory(credentials); }
      catch (error) { throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_MODEL_FAILED', `初始化搜索纠偏模型失败：${(error as Error).message}`); }
      let modelCallCount = 0;
      let repairCount = 0;
      const call = async (messages: unknown) => {
        try { modelCallCount += 1; return String((await reasoner(messages, { maxOutputTokens: 2048 }))?.text || ''); }
        catch (error) { throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_MODEL_FAILED', `搜索纠偏模型调用失败：${(error as Error).message}`); }
      };
      const modelInput = credentials.protocol === 'openai-chat-multimodal' ? input : {
        ...input,
        ...(input.similar?.reference ? { similar: { ...input.similar, reference: { ...input.similar.reference, remoteImageUrl: undefined } } } : {}),
      };
      let output = await call(buildSearchRefinementMessages(modelInput));
      try { return normalizeSearchRefinementDrafts(parseJson(output), input); }
      catch (error) {
        if (!(error instanceof CreativeResearchCorrectionError)
          || !['CREATIVE_RESEARCH_CORRECTION_OUTPUT_INVALID', 'CREATIVE_RESEARCH_REFRESH_NO_NOVEL_QUERY'].includes(error.code)) throw error;
        repairCount = 1;
        output = await call([
          { role: 'system', content: '修复搜索 query JSON。只输出合法、新颖、证据有效的 JSON。' },
          { role: 'user', content: JSON.stringify({ error: error.message, invalidOutput: output.slice(0, 8000), historicalQueries: input.recentQueries }) },
        ]);
        return normalizeSearchRefinementDrafts(parseJson(output), input);
      } finally {
        options.onDiagnostics?.({ modelCallCount, repairCount, provider: credentials.provider, model: credentials.model });
      }
    },
  };
  return Object.freeze(adapter);
}
