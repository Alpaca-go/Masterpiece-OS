import type { ProviderCredentials } from '../shared/types.ts';
import type { AnalysisModelAdapter, DesignBriefDraftMaterial } from './creative-research/adapter-contracts.ts';
import {
  buildDesignBriefMessages,
  buildDesignBriefRepairMessages,
  normalizeDesignBriefDraft,
  parseCreativeResearchModelJson,
} from './creative-research-design-brief-core.ts';
import { CreativeResearchError, creativeResearchError } from './creative-research-errors.ts';

// Current model runtime authority. Profile selection and credentials remain owned by the host callback.
// @ts-ignore JavaScript workspace module intentionally has no declaration file.
import { createOpenAICompatibleTextReasoner } from '@masterpiece/model-runtime/openai-compatible-text-reasoner.js';

type Reasoner = (messages: unknown, context?: unknown) => Promise<{ text?: string }>;
type ReasonerFactory = (options: Pick<ProviderCredentials, 'apiKey' | 'model' | 'provider' | 'baseUrl'>) => Reasoner;

export interface CreativeResearchAnalysisDiagnostics {
  modelCallCount: number;
  repairCount: number;
  provider: string;
  model: string;
}

export function createCreativeResearchAnalysisAdapter(options: {
  readCredentials(profileId: string): Promise<ProviderCredentials>;
  reasonerFactory?: ReasonerFactory;
  onDiagnostics?: (diagnostics: CreativeResearchAnalysisDiagnostics) => void;
}): AnalysisModelAdapter {
  const reasonerFactory: ReasonerFactory = options.reasonerFactory
    ?? (createOpenAICompatibleTextReasoner as ReasonerFactory);
  return {
    async draftDesignBrief(input): Promise<DesignBriefDraftMaterial> {
      const credentials = await options.readCredentials(input.profileId).catch((error) => {
        throw creativeResearchError('CREATIVE_RESEARCH_MODEL_FAILED', `读取模型配置失败：${(error as Error).message}`);
      });
      let modelCallCount = 0;
      let repairCount = 0;
      let reasoner: Reasoner;
      try {
        reasoner = reasonerFactory(credentials);
      } catch (error) {
        throw creativeResearchError('CREATIVE_RESEARCH_MODEL_FAILED', `初始化模型失败：${(error as Error).message}`);
      }
      const call = async (messages: unknown): Promise<string> => {
        try {
          const response = await reasoner(messages, { maxOutputTokens: 8192 });
          modelCallCount += 1;
          return String(response?.text || '');
        } catch (error) {
          throw creativeResearchError('CREATIVE_RESEARCH_MODEL_FAILED', `Design Brief 模型调用失败：${(error as Error).message}`);
        }
      };
      let output = await call(buildDesignBriefMessages(input));
      try {
        return normalizeDesignBriefDraft(parseCreativeResearchModelJson(output), input.evidence.map((item) => item.id));
      } catch (error) {
        if (!(error instanceof CreativeResearchError) || error.code !== 'CREATIVE_RESEARCH_MODEL_OUTPUT_INVALID') throw error;
        repairCount = 1;
        output = await call(buildDesignBriefRepairMessages(output, error.message, input));
        try {
          return normalizeDesignBriefDraft(parseCreativeResearchModelJson(output), input.evidence.map((item) => item.id));
        } catch (repairError) {
          if (repairError instanceof CreativeResearchError && repairError.code === 'CREATIVE_RESEARCH_MODEL_OUTPUT_INVALID') throw repairError;
          throw creativeResearchError('CREATIVE_RESEARCH_MODEL_OUTPUT_INVALID', `Repair 后输出仍无效：${(repairError as Error).message}`);
        }
      } finally {
        options.onDiagnostics?.({ modelCallCount, repairCount, provider: credentials.provider, model: credentials.model });
      }
    },
  };
}
