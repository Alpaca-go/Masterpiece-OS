import crypto from 'node:crypto';
import type { DesignBriefReanalysisAdapter, DocumentIntakeAdapter } from './creative-research/adapter-contracts.ts';
import type { DesignBrief, DesignBriefField, NegativeSignal, SearchKeyword } from './creative-research/contracts.ts';
import type {
  CreativeResearchSessionRepository,
  DesignBriefRepository,
  PreferenceEvidenceRepository,
  ReferenceResearchRepository,
  SearchHistoryRepository,
} from './creative-research/ports.ts';
import { assertDesignBrief, assertNegativeSignal } from './creative-research/evidence.ts';
import { assertCreativeResearchTransition } from './creative-research/invariants.ts';
import { activeRejectionSignals } from './creative-research-selection-service.ts';
import { creativeResearchCorrectionError } from './creative-research-correction-errors.ts';
import { creativeResearchError } from './creative-research-errors.ts';

const FACTUAL_FIELDS: DesignBriefField[] = ['projectSummary', 'designTask', 'audience', 'scenarios', 'coreMessages', 'constraints'];
function cleanList(values: string[]): string[] { return [...new Set(values.map((item) => String(item || '').replace(/\s+/gu, ' ').trim()).filter(Boolean))].slice(0, 12); }

export function createCreativeResearchReanalysisService(options: {
  sessions: CreativeResearchSessionRepository;
  briefs: DesignBriefRepository;
  history: SearchHistoryRepository;
  references: ReferenceResearchRepository;
  insights: PreferenceEvidenceRepository;
  documentAdapter: DocumentIntakeAdapter;
  adapter: DesignBriefReanalysisAdapter;
  now?: () => string;
  createId?: () => string;
}) {
  const now = options.now || (() => new Date().toISOString());
  const createId = options.createId || (() => crypto.randomUUID());

  async function reanalyzeDesignBrief(sessionId: string, input: { profileId: string; feedback: string[] }): Promise<DesignBrief> {
    const session = await options.sessions.get(sessionId);
    if (!session) throw creativeResearchError('CREATIVE_RESEARCH_SESSION_NOT_FOUND', `Creative Research Session 不存在：${sessionId}`);
    if (session.status !== 'RESEARCH') throw creativeResearchError('CREATIVE_RESEARCH_SESSION_CONFLICT', '重新分析只允许由 RESEARCH 阶段显式触发');
    const feedback = cleanList(input.feedback || []);
    if (!feedback.length) throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_INPUT_INVALID', '重新分析必须提供明确的设计师反馈');
    const previousBrief = await options.briefs.getActiveRevision(sessionId);
    if (!previousBrief) throw creativeResearchError('CREATIVE_RESEARCH_BRIEF_NOT_FOUND', '重新分析需要 active Design Brief');
    const [intake, searchHistory, selections, allNegatives, preferenceInsights, references] = await Promise.all([
      options.documentAdapter.readEvidence({ projectId: session.projectId, sourceDocumentIds: session.sourceDocumentIds }),
      options.history.listSessionSearchHistory(sessionId), options.references.listSelections(sessionId),
      options.references.listNegativeSignals(sessionId), options.insights.listInsights(sessionId), options.references.listSessionReferences(sessionId),
    ]);
    const timestamp = now();
    const feedbackSignal: NegativeSignal = {
      id: createId(), sessionId, type: 'REANALYSIS_FEEDBACK', scope: 'SESSION', value: feedback.join('；'),
      reason: feedback.join('；'), actor: 'DESIGNER', createdAt: timestamp,
    };
    assertNegativeSignal(feedbackSignal);
    const activeNegatives = [
      ...activeRejectionSignals(selections, allNegatives),
      ...allNegatives.filter((item) => item.type !== 'REJECT_REFERENCE'),
      feedbackSignal,
    ];
    const draft = await options.adapter.reanalyzeDesignBrief({
      ...intake, sessionId, profileId: String(input.profileId || '').trim(), previousBrief,
      recentSearchHistory: searchHistory.slice(-32).map((item) => ({ id: item.id, text: item.text, kind: item.kind, origin: item.origin || 'INITIAL', status: item.status })),
      selections: selections.map(({ referenceId, state, selectedAttributes, designerNote }) => ({ referenceId, state, selectedAttributes, designerNote })),
      activeNegativeSignals: activeNegatives.map(({ id, type, scope, reason, value }) => ({ id, type, scope, reason, value })),
      preferenceInsights: preferenceInsights.slice(-16).map((item) => ({ id: item.id, category: item.category, text: item.designerOverride || item.summary, status: item.status })),
      feedback,
    });
    const allowedEvidence = new Set(intake.evidence.map((item) => item.id));
    for (const field of FACTUAL_FIELDS) {
      const ids = draft.fieldEvidence?.[field] || [];
      if (!ids.length || ids.some((id) => !allowedEvidence.has(id))) {
        throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_OUTPUT_INVALID', `${field} 必须只引用重新读取的 Document Evidence`);
      }
    }
    const briefId = createId();
    const evidenceIds = new Set(draft.evidenceIds);
    const searchKeywords: SearchKeyword[] = (draft.searchKeywordSuggestions || []).slice(0, 24).map((item) => ({
      id: createId(), briefId, value: item.value, kind: item.kind, source: 'AI', enabled: true,
      ...(item.rationale ? { rationale: item.rationale } : {}), ...(item.locale ? { locale: item.locale } : {}), createdAt: timestamp,
    }));
    const nextBrief: DesignBrief = {
      id: briefId, sessionId, revision: previousBrief.revision + 1,
      projectSummary: draft.projectSummary, designTask: draft.designTask, audience: draft.audience,
      scenarios: draft.scenarios, coreMessages: draft.coreMessages, constraints: draft.constraints,
      conceptKeywords: draft.conceptKeywords, visualKeywords: draft.visualKeywords, searchKeywords,
      designerNotes: [...previousBrief.designerNotes, ...feedback].slice(-32),
      evidence: intake.evidence.filter((item) => evidenceIds.has(item.id)), fieldEvidence: draft.fieldEvidence,
      warnings: [...new Set([...(intake.warnings || []), ...(draft.warnings || [])])], createdAt: timestamp, updatedAt: timestamp,
    };
    assertDesignBrief(nextBrief);
    const nextNegatives = [...allNegatives, feedbackSignal];
    assertCreativeResearchTransition(session, 'INTAKE', { reanalysis: {
      previousBrief, nextBrief, previousSearchQueries: searchHistory, nextSearchQueries: searchHistory,
      previousSelections: selections, nextSelections: selections,
      previousNegativeSignals: allNegatives, nextNegativeSignals: nextNegatives,
    } });
    await options.references.saveNegativeSignal(feedbackSignal);
    await options.briefs.saveRevision(nextBrief);
    await options.sessions.save({ ...session, status: 'INTAKE', activeDesignBriefId: nextBrief.id, updatedAt: timestamp });
    const [nextReferences, nextPreferences] = await Promise.all([
      options.references.listSessionReferences(sessionId), options.insights.listInsights(sessionId),
    ]);
    if (references.some((item) => !nextReferences.some((next) => next.id === item.id))
      || preferenceInsights.some((item) => !nextPreferences.some((next) => next.id === item.id))) {
      throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_OUTPUT_INVALID', '重新分析必须保留 Reference 与 PreferenceInsight history');
    }
    return nextBrief;
  }

  return Object.freeze({ reanalyzeDesignBrief });
}
