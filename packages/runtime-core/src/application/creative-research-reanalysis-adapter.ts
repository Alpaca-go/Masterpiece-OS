import type { ProviderCredentials } from '../shared/types.ts';
import type { DesignBriefReanalysisAdapter, DesignBriefReanalysisInput } from './creative-research/adapter-contracts.ts';
import { DESIGN_BRIEF_FIELDS } from './creative-research/contracts.ts';
import { buildDesignBriefRepairMessages, normalizeDesignBriefDraft, parseCreativeResearchModelJson } from './creative-research-design-brief-core.ts';
import { creativeResearchCorrectionError, CreativeResearchCorrectionError } from './creative-research-correction-errors.ts';
// @ts-ignore JavaScript workspace module intentionally has no declaration file.
import { createOpenAICompatibleTextReasoner } from '@masterpiece/model-runtime/openai-compatible-text-reasoner.js';

type Reasoner = (messages: unknown, context?: unknown) => Promise<{ text?: string }>;
type ReasonerFactory = (options: Pick<ProviderCredentials, 'apiKey' | 'model' | 'provider' | 'baseUrl'>) => Reasoner;

function bounded(value: string, max: number): string { return String(value || '').replace(/\s+/gu, ' ').trim().slice(0, max); }

export function buildDesignBriefReanalysisMessages(input: DesignBriefReanalysisInput): unknown[] {
  return [
    {
      role: 'system',
      content: [
        '你是 Creative Research 的 Design Brief 重新分析器。只输出 JSON。',
        '项目事实只能由本次重新读取的 Document Evidence 证明；Reference、Selection、Negative Signal 和 Preference 只允许影响视觉/搜索解释。',
        '不得把 Reference id 或 Preference id 写入 factual fieldEvidence。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: '根据设计师明确反馈重新理解原始文档并输出完整的新 Design Brief draft',
        requiredFields: DESIGN_BRIEF_FIELDS,
        outputSchema: {
          projectSummary: 'string', designTask: 'string', audience: 'string', scenarios: 'string[]', coreMessages: 'string[]', constraints: 'string[]',
          conceptKeywords: 'string[]', visualKeywords: 'string[]', evidenceIds: 'Document Evidence id[]',
          fieldEvidence: 'factual field -> Document Evidence id[]', searchKeywordSuggestions: 'array of {value,kind,rationale?,locale?}', warnings: 'string[]',
        },
        documents: input.documents || [],
        documentEvidence: input.evidence,
        previousBrief: input.previousBrief,
        recentSearchHistory: input.recentSearchHistory.slice(-32),
        selections: input.selections.slice(0, 32),
        activeNegativeSignals: input.activeNegativeSignals.slice(0, 32),
        preferenceInsights: input.preferenceInsights.slice(-16),
        explicitDesignerFeedback: input.feedback.map((item) => bounded(item, 300)).slice(0, 12),
        intakeWarnings: input.warnings || [],
      }),
    },
  ];
}

export function createCreativeResearchReanalysisAdapter(options: {
  readCredentials(profileId: string): Promise<ProviderCredentials>;
  reasonerFactory?: ReasonerFactory;
  onDiagnostics?: (value: { modelCallCount: number; repairCount: number; provider: string; model: string }) => void;
}): DesignBriefReanalysisAdapter {
  return Object.freeze({
    async reanalyzeDesignBrief(input) {
      const profileId = String(input.profileId || '').trim();
      if (!profileId) throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_PROFILE_REQUIRED', '重新分析必须明确选择 Profile');
      const credentials = await options.readCredentials(profileId).catch((error) => {
        throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_PROFILE_UNSUPPORTED', `读取所选 Profile 失败：${(error as Error).message}`);
      });
      if (credentials.profileId !== profileId || credentials.modelType !== 'analysis'
        || !['openai-chat', 'openai-chat-multimodal'].includes(credentials.protocol)) {
        throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_PROFILE_UNSUPPORTED', '所选 Profile 必须是启用的 analysis Profile，且不能自动替换');
      }
      let reasoner: Reasoner;
      try { reasoner = (options.reasonerFactory || createOpenAICompatibleTextReasoner)(credentials); }
      catch (error) { throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_MODEL_FAILED', `初始化重新分析模型失败：${(error as Error).message}`); }
      let modelCallCount = 0;
      let repairCount = 0;
      const call = async (messages: unknown) => {
        try { modelCallCount += 1; return String((await reasoner(messages, { maxOutputTokens: 8192 }))?.text || ''); }
        catch (error) { throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_MODEL_FAILED', `重新分析模型调用失败：${(error as Error).message}`); }
      };
      const parse = (output: string) => {
        try { return normalizeDesignBriefDraft(parseCreativeResearchModelJson(output), input.evidence.map((item) => item.id)); }
        catch (error) { throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_OUTPUT_INVALID', (error as Error).message, { cause: error }); }
      };
      let output = await call(buildDesignBriefReanalysisMessages(input));
      try { return parse(output); }
      catch (error) {
        if (!(error instanceof CreativeResearchCorrectionError) || error.code !== 'CREATIVE_RESEARCH_CORRECTION_OUTPUT_INVALID') throw error;
        repairCount = 1;
        output = await call(buildDesignBriefRepairMessages(output, error.message, { ...input, designerNotes: input.feedback }));
        return parse(output);
      } finally {
        options.onDiagnostics?.({ modelCallCount, repairCount, provider: credentials.provider, model: credentials.model });
      }
    },
  });
}
