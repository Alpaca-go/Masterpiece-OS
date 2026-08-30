import { randomUUID } from 'node:crypto';
import type { PreferenceInsight } from './creative-research/contracts.ts';
import { REFERENCE_ATTRIBUTES } from './creative-research/contracts.ts';
import type { ReferencePreferenceAnalysisAdapter } from './creative-research/adapter-contracts.ts';
import { assertPreferenceInsight } from './creative-research/evidence.ts';
import type {
  CreativeResearchSessionRepository,
  DesignBriefRepository,
  PreferenceEvidenceRepository,
  ReferenceResearchRepository,
} from './creative-research/ports.ts';
import { activeRejectionSignals } from './creative-research-selection-service.ts';
import { creativeResearchPreferenceError } from './creative-research-preference-errors.ts';

export const MIN_SELECTION_FOR_AI_ANALYSIS = 3;
export const MAX_VISUAL_REFERENCES_PER_ANALYSIS = 12;

export interface CreativeResearchPreferenceAnalysisService {
  analyzeSelection(sessionId: string, profileId: string): Promise<PreferenceInsight[]>;
  listInsights(sessionId: string): Promise<PreferenceInsight[]>;
  updateInsight(sessionId: string, insightId: string, designerOverride: string): Promise<PreferenceInsight>;
  finalizeInsight(sessionId: string, insightId: string): Promise<PreferenceInsight>;
}

function requireText(value: string, label: string, code: 'CREATIVE_RESEARCH_PREFERENCE_PROFILE_REQUIRED' | 'CREATIVE_RESEARCH_PREFERENCE_STORE_FAILED'): string {
  const normalized = String(value || '').trim();
  if (!normalized) throw creativeResearchPreferenceError(code, `${label} 不能为空`);
  return normalized;
}

export function createCreativeResearchPreferenceAnalysisService(options: {
  briefs: DesignBriefRepository;
  references: ReferenceResearchRepository;
  insights: PreferenceEvidenceRepository;
  adapter: ReferencePreferenceAnalysisAdapter;
  // R7: optional session repository — when provided, COMPLETED sessions become
  // read-only for preference analysis and insight mutations.
  sessions?: CreativeResearchSessionRepository;
  now?: () => string;
  createId?: () => string;
}): CreativeResearchPreferenceAnalysisService {
  const now = options.now || (() => new Date().toISOString());
  const createId = options.createId || randomUUID;

  const assertSessionWritable = async (sessionId: string): Promise<void> => {
    if (!options.sessions) return;
    const session = await options.sessions.get(sessionId);
    if (session?.status === 'COMPLETED') {
      throw creativeResearchPreferenceError('CREATIVE_RESEARCH_PREFERENCE_SESSION_COMPLETED', 'Session 已完成，视觉倾向证据只读');
    }
  };

  const findInsight = async (sessionId: string, insightId: string): Promise<PreferenceInsight> => {
    const insight = (await options.insights.listInsights(sessionId)).find((item) => item.id === insightId);
    if (!insight) throw creativeResearchPreferenceError('CREATIVE_RESEARCH_PREFERENCE_STORE_FAILED', `Preference Insight 不存在：${insightId}`);
    return insight;
  };

  const service: CreativeResearchPreferenceAnalysisService = {
    async analyzeSelection(rawSessionId, rawProfileId) {
      const sessionId = requireText(rawSessionId, 'Session ID', 'CREATIVE_RESEARCH_PREFERENCE_STORE_FAILED');
      const profileId = requireText(rawProfileId, 'Profile ID', 'CREATIVE_RESEARCH_PREFERENCE_PROFILE_REQUIRED');
      await assertSessionWritable(sessionId);
      const [brief, selections, references, negativeSignals] = await Promise.all([
        options.briefs.getActiveRevision(sessionId),
        options.references.listSelections(sessionId),
        options.references.listSessionReferences(sessionId),
        options.references.listNegativeSignals(sessionId),
      ]);
      if (!brief) throw creativeResearchPreferenceError('CREATIVE_RESEARCH_PREFERENCE_STORE_FAILED', '当前 Session 没有 active Design Brief');
      const selected = selections.filter((selection) => selection.state === 'SELECTED');
      if (selected.length < MIN_SELECTION_FOR_AI_ANALYSIS) {
        throw creativeResearchPreferenceError(
          'CREATIVE_RESEARCH_PREFERENCE_MIN_SELECTION_REQUIRED',
          `至少选择 ${MIN_SELECTION_FOR_AI_ANALYSIS} 个参考，才能形成有意义的视觉倾向`,
        );
      }
      const referencesById = new Map(references.map((reference) => [reference.id, reference]));
      const missing = selected.filter((selection) => !referencesById.has(selection.referenceId));
      if (missing.length) throw creativeResearchPreferenceError('CREATIVE_RESEARCH_PREFERENCE_EVIDENCE_INVALID', 'Selection 引用了不存在的 Reference');
      const activeNegatives = activeRejectionSignals(selections, negativeSignals);
      const selectedReferences = selected.map((selection) => {
        const reference = referencesById.get(selection.referenceId)!;
        const web = reference.sourceType === 'WEB_REFERENCE' ? reference : null;
        return {
          id: reference.id,
          resourceType: web?.resourceType || 'WEB' as const,
          title: reference.title || (web?.publisherOrDomain || reference.id),
          publisher: web?.publisherOrDomain || reference.sourceType,
          selectedAttributes: [...selection.selectedAttributes],
          designerNote: selection.designerNote,
          ...(web?.resourceType === 'IMAGE' && web.remoteImageUrl ? { remoteImageUrl: web.remoteImageUrl } : {}),
        };
      });
      const activeNegativeSignals = activeNegatives.map((signal) => ({
        id: signal.id,
        sourceReferenceId: signal.sourceReferenceId!,
        reason: signal.reason,
        referenceTitle: referencesById.get(signal.sourceReferenceId!)?.title,
      }));
      const drafts = await options.adapter.analyzePreferences({
        sessionId,
        profileId,
        brief: {
          projectSummary: brief.projectSummary,
          designTask: brief.designTask,
          audience: brief.audience,
          visualKeywords: [...brief.visualKeywords],
        },
        selectedReferences,
        activeNegativeSignals,
      });
      const selectedIds = new Set(selected.map((item) => item.referenceId));
      const activeNegativeIds = new Set(activeNegatives.map((item) => item.id));
      const analysisRunId = createId();
      const timestamp = now();
      const insights = drafts.map((draft) => {
        if (!REFERENCE_ATTRIBUTES.includes(draft.category)
          || draft.supportingReferenceIds.some((id) => !selectedIds.has(id))
          || draft.supportingNegativeSignalIds.some((id) => !activeNegativeIds.has(id))
          || draft.supportingReferenceIds.length + draft.supportingNegativeSignalIds.length === 0) {
          throw creativeResearchPreferenceError('CREATIVE_RESEARCH_PREFERENCE_EVIDENCE_INVALID', 'Preference Insight 引用了本次真实输入之外的 evidence');
        }
        const insight: PreferenceInsight = {
          id: createId(),
          sessionId,
          analysisRunId,
          category: draft.category,
          summary: draft.summary,
          status: 'DRAFT',
          ...(draft.confidence !== undefined ? { confidence: draft.confidence } : {}),
          supportingReferenceIds: [...new Set(draft.supportingReferenceIds)],
          supportingRegionIds: [],
          supportingNegativeSignalIds: [...new Set(draft.supportingNegativeSignalIds)],
          createdAt: timestamp,
        };
        assertPreferenceInsight(insight);
        return insight;
      });
      return Promise.all(insights.map((insight) => options.insights.saveInsight(insight)));
    },
    listInsights(sessionId) {
      return options.insights.listInsights(requireText(sessionId, 'Session ID', 'CREATIVE_RESEARCH_PREFERENCE_STORE_FAILED'));
    },
    async updateInsight(sessionId, insightId, designerOverride) {
      await assertSessionWritable(requireText(sessionId, 'Session ID', 'CREATIVE_RESEARCH_PREFERENCE_STORE_FAILED'));
      await findInsight(sessionId, insightId);
      return options.insights.storeDesignerOverride(sessionId, insightId, designerOverride);
    },
    async finalizeInsight(sessionId, insightId) {
      await assertSessionWritable(requireText(sessionId, 'Session ID', 'CREATIVE_RESEARCH_PREFERENCE_STORE_FAILED'));
      const previous = await findInsight(sessionId, insightId);
      const finalized: PreferenceInsight = previous.status === 'DRAFT'
        ? { ...previous, status: 'FINALIZED', finalizedAt: now() }
        : previous;
      assertPreferenceInsight(finalized);
      return options.insights.saveInsight(finalized);
    },
  };
  return Object.freeze(service);
}
