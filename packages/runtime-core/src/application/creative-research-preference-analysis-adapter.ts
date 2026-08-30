import type { ProviderCredentials } from '../shared/types.ts';
import { REFERENCE_ATTRIBUTES } from './creative-research/contracts.ts';
import type {
  PreferenceInsightDraftMaterial,
  ReferencePreferenceAnalysisAdapter,
  ReferencePreferenceAnalysisInput,
} from './creative-research/adapter-contracts.ts';
import {
  CreativeResearchPreferenceError,
  creativeResearchPreferenceError,
} from './creative-research-preference-errors.ts';

// Current model runtime authority. Profile selection and credentials remain owned by the host callback.
// @ts-ignore JavaScript workspace module intentionally has no declaration file.
import { createOpenAICompatibleTextReasoner } from '@masterpiece/model-runtime/openai-compatible-text-reasoner.js';

type Reasoner = (messages: unknown, context?: unknown) => Promise<{ text?: string }>;
type ReasonerFactory = (options: Pick<ProviderCredentials, 'apiKey' | 'model' | 'provider' | 'baseUrl'>) => Reasoner;

export interface CreativeResearchPreferenceDiagnostics {
  modelCallCount: number;
  repairCount: number;
  provider: string;
  model: string;
  selectedReferenceCount: number;
  visualInputCount: number;
}

function parseModelJson(value: string): unknown {
  const normalized = String(value || '').trim()
    .replace(/^```(?:json)?\s*/iu, '')
    .replace(/\s*```$/u, '');
  try { return JSON.parse(normalized); }
  catch (error) {
    throw creativeResearchPreferenceError('CREATIVE_RESEARCH_PREFERENCE_OUTPUT_INVALID', `模型输出不是有效 JSON：${(error as Error).message}`);
  }
}

function stringIds(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim())) {
    throw creativeResearchPreferenceError('CREATIVE_RESEARCH_PREFERENCE_OUTPUT_INVALID', `${field} 必须是字符串数组`);
  }
  return [...new Set(value.map((item) => String(item).trim()))];
}

export function normalizePreferenceInsightDrafts(
  value: unknown,
  allowedReferenceIds: string[],
  allowedNegativeSignalIds: string[],
): PreferenceInsightDraftMaterial[] {
  const raw = value && typeof value === 'object' ? value as { insights?: unknown } : {};
  if (!Array.isArray(raw.insights) || raw.insights.length === 0 || raw.insights.length > REFERENCE_ATTRIBUTES.length) {
    throw creativeResearchPreferenceError('CREATIVE_RESEARCH_PREFERENCE_OUTPUT_INVALID', 'insights 必须包含 1 至 9 条结果');
  }
  const references = new Set(allowedReferenceIds);
  const negatives = new Set(allowedNegativeSignalIds);
  return raw.insights.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw creativeResearchPreferenceError('CREATIVE_RESEARCH_PREFERENCE_OUTPUT_INVALID', `insights[${index}] 必须是对象`);
    }
    const candidate = item as Record<string, unknown>;
    const category = String(candidate.category || '');
    const summary = String(candidate.summary || '').trim();
    if (!REFERENCE_ATTRIBUTES.includes(category as never)) {
      throw creativeResearchPreferenceError('CREATIVE_RESEARCH_PREFERENCE_OUTPUT_INVALID', `insights[${index}].category 无效`);
    }
    if (!summary || summary.length > 600) {
      throw creativeResearchPreferenceError('CREATIVE_RESEARCH_PREFERENCE_OUTPUT_INVALID', `insights[${index}].summary 无效`);
    }
    const supportingReferenceIds = stringIds(candidate.supportingReferenceIds, `insights[${index}].supportingReferenceIds`);
    const supportingNegativeSignalIds = stringIds(candidate.supportingNegativeSignalIds, `insights[${index}].supportingNegativeSignalIds`);
    if (supportingReferenceIds.some((id) => !references.has(id))
      || supportingNegativeSignalIds.some((id) => !negatives.has(id))) {
      throw creativeResearchPreferenceError('CREATIVE_RESEARCH_PREFERENCE_EVIDENCE_INVALID', `insights[${index}] 引用了本次输入之外的 evidence id`);
    }
    if (supportingReferenceIds.length + supportingNegativeSignalIds.length === 0) {
      throw creativeResearchPreferenceError('CREATIVE_RESEARCH_PREFERENCE_EVIDENCE_INVALID', `insights[${index}] 缺少 supporting evidence`);
    }
    const confidence = candidate.confidence;
    if (confidence !== undefined && (typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence < 0 || confidence > 1)) {
      throw creativeResearchPreferenceError('CREATIVE_RESEARCH_PREFERENCE_OUTPUT_INVALID', `insights[${index}].confidence 必须在 0 到 1 之间`);
    }
    return {
      category: category as PreferenceInsightDraftMaterial['category'],
      summary,
      ...(confidence !== undefined ? { confidence } : {}),
      supportingReferenceIds,
      supportingNegativeSignalIds,
    };
  });
}

function boundedText(value: string, maximum: number): string {
  return String(value || '').trim().slice(0, maximum);
}

export function buildPreferenceAnalysisMessages(input: ReferencePreferenceAnalysisInput): unknown[] {
  const visualReferences = input.selectedReferences
    .filter((reference) => reference.resourceType === 'IMAGE' && /^https?:\/\//iu.test(reference.remoteImageUrl || ''))
    .slice(0, 12);
  const visuallyAnalyzedIds = new Set(visualReferences.map((reference) => reference.id));
  const payload = {
    sessionId: input.sessionId,
    brief: {
      projectSummary: boundedText(input.brief.projectSummary, 1200),
      designTask: boundedText(input.brief.designTask, 1200),
      audience: boundedText(input.brief.audience, 600),
      visualKeywords: input.brief.visualKeywords.slice(0, 24).map((item) => boundedText(item, 120)),
    },
    selectedReferences: input.selectedReferences.map((reference) => ({
      id: reference.id,
      resourceType: reference.resourceType,
      title: boundedText(reference.title, 300),
      publisher: boundedText(reference.publisher, 160),
      selectedAttributes: reference.selectedAttributes,
      designerNote: reference.designerNote ? boundedText(reference.designerNote, 500) : undefined,
      visuallyAnalyzed: visuallyAnalyzedIds.has(reference.id),
    })),
    activeNegativeSignals: input.activeNegativeSignals.map((signal) => ({
      id: signal.id,
      sourceReferenceId: signal.sourceReferenceId,
      reason: signal.reason ? boundedText(signal.reason, 300) : undefined,
      referenceTitle: signal.referenceTitle ? boundedText(signal.referenceTitle, 300) : undefined,
    })),
  };
  const text = [
    '这是根据设计师目前的选择整理视觉倾向的任务。AI 只整理已有判断，不决定最终方向。',
    '只输出 JSON：{"insights":[{"category":"TYPOGRAPHY","summary":"...","confidence":0.8,"supportingReferenceIds":["..."],"supportingNegativeSignalIds":[]}]}。',
    `category 只能是：${REFERENCE_ATTRIBUTES.join(', ')}。每条 insight 必须引用输入中的真实 evidence id。`,
    'WEB reference 未提供视觉输入时，不得声称已经进行视觉分析。禁止使用“最佳方向”“你应该使用”“系统建议最终采用”。',
    JSON.stringify(payload),
  ].join('\n\n');
  const visualInputs = visualReferences
    .map((reference) => ({ type: 'image_url', image_url: { url: reference.remoteImageUrl } }));
  return [
    { role: 'system', content: '你是设计师选择证据的整理助手。严格遵循证据边界并只返回 JSON。' },
    { role: 'user', content: [{ type: 'text', text }, ...visualInputs] },
  ];
}

function buildRepairMessages(
  input: ReferencePreferenceAnalysisInput,
  output: string,
  message: string,
): unknown[] {
  return [
    { role: 'system', content: '修复结构化输出。只返回合法 JSON，不添加解释。' },
    { role: 'user', content: JSON.stringify({
      error: message,
      allowedReferenceIds: input.selectedReferences.map((item) => item.id),
      allowedNegativeSignalIds: input.activeNegativeSignals.map((item) => item.id),
      invalidOutput: boundedText(output, 12000),
    }) },
  ];
}

export function createCreativeResearchPreferenceAnalysisAdapter(options: {
  readCredentials(profileId: string): Promise<ProviderCredentials>;
  reasonerFactory?: ReasonerFactory;
  onDiagnostics?: (diagnostics: CreativeResearchPreferenceDiagnostics) => void;
}): ReferencePreferenceAnalysisAdapter {
  const reasonerFactory: ReasonerFactory = options.reasonerFactory
    ?? (createOpenAICompatibleTextReasoner as ReasonerFactory);
  const adapter: ReferencePreferenceAnalysisAdapter = {
    async analyzePreferences(input: ReferencePreferenceAnalysisInput) {
      const profileId = String(input.profileId || '').trim();
      if (!profileId) throw creativeResearchPreferenceError('CREATIVE_RESEARCH_PREFERENCE_PROFILE_REQUIRED', '必须明确选择分析 Profile');
      const credentials = await options.readCredentials(profileId).catch((error) => {
        throw creativeResearchPreferenceError('CREATIVE_RESEARCH_PREFERENCE_PROFILE_UNSUPPORTED', `读取所选 Profile 失败：${(error as Error).message}`);
      });
      if (credentials.profileId !== profileId || credentials.modelType !== 'analysis' || credentials.protocol !== 'openai-chat-multimodal') {
        throw creativeResearchPreferenceError('CREATIVE_RESEARCH_PREFERENCE_PROFILE_UNSUPPORTED', '所选 Profile 必须是启用的多模态 analysis Profile，且不能自动替换');
      }
      let reasoner: Reasoner;
      try { reasoner = reasonerFactory(credentials); }
      catch (error) { throw creativeResearchPreferenceError('CREATIVE_RESEARCH_PREFERENCE_MODEL_FAILED', `初始化偏好分析模型失败：${(error as Error).message}`); }
      let modelCallCount = 0;
      let repairCount = 0;
      const call = async (messages: unknown): Promise<string> => {
        try {
          const response = await reasoner(messages, { maxOutputTokens: 4096 });
          modelCallCount += 1;
          return String(response?.text || '');
        } catch (error) {
          throw creativeResearchPreferenceError('CREATIVE_RESEARCH_PREFERENCE_MODEL_FAILED', `偏好分析模型调用失败：${(error as Error).message}`);
        }
      };
      const allowedReferences = input.selectedReferences.map((item) => item.id);
      const allowedNegatives = input.activeNegativeSignals.map((item) => item.id);
      const parse = (output: string) => normalizePreferenceInsightDrafts(parseModelJson(output), allowedReferences, allowedNegatives);
      let output = await call(buildPreferenceAnalysisMessages(input));
      try { return parse(output); }
      catch (error) {
        if (!(error instanceof CreativeResearchPreferenceError)
          || !['CREATIVE_RESEARCH_PREFERENCE_OUTPUT_INVALID', 'CREATIVE_RESEARCH_PREFERENCE_EVIDENCE_INVALID'].includes(error.code)) throw error;
        repairCount = 1;
        output = await call(buildRepairMessages(input, output, error.message));
        return parse(output);
      } finally {
        options.onDiagnostics?.({
          modelCallCount,
          repairCount,
          provider: credentials.provider,
          model: credentials.model,
          selectedReferenceCount: input.selectedReferences.length,
          visualInputCount: input.selectedReferences.filter((item) => item.resourceType === 'IMAGE' && item.remoteImageUrl).slice(0, 12).length,
        });
      }
    },
  };
  return Object.freeze(adapter);
}
