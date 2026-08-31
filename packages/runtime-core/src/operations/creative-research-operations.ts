import type {
  CreativeDirectionContextDto,
  CreativeResearchBriefDto,
  CreativeResearchCredentialStatusDto,
  CreativeResearchBriefEvidenceDto,
  CreativeResearchBriefFieldDto,
  CreativeResearchDirectionBoardDto,
  CreativeResearchQueryDto,
  CreativeResearchNegativeSignalDto,
  CreativeResearchPreferenceInsightDto,
  CreativeResearchPlanDto,
  CreativeResearchReferenceGuideDto,
  CreativeResearchReferenceDto,
  CreativeResearchReferenceSelectionDto,
  CreativeResearchSessionDto,
  CompleteCreativeResearchDirectionInput,
  UpdateCreativeResearchBriefInput,
  UpdateCreativeResearchDirectionBoardInput,
  SetCreativeResearchReferenceSelectionInput,
  UpdateCreativeResearchSearchStrategyInput,
  PlanCreativeResearchSimilarSearchInput,
} from '../application-contracts.ts';
import type { CreativeDirectionContext, CreativeResearchPlan, CreativeResearchReferenceGuide, CreativeResearchSession, CuratedReferenceItem, DesignBrief, DirectionBoard, NegativeSignal, PreferenceInsight, ReferenceSelection, SearchQuery, WebReferenceItem } from '../application/creative-research/contracts.ts';
import type { CreativeResearchDirectionService } from '../application/creative-research-direction-service.ts';
import type { CreativeResearchSelectionService } from '../application/creative-research-selection-service.ts';
import type { CreativeResearchPreferenceAnalysisService } from '../application/creative-research-preference-analysis-service.ts';
import type { SearchHistoryRepository } from '../application/creative-research/ports.ts';
import type { CreativeResearchPlannerService } from '../application/creative-research-planner-service.ts';
import type { CreativeResearchReferenceGuideService } from '../application/creative-research-reference-guide-service.ts';
import type { CreativeResearchCuratedReferenceService } from '../application/creative-research-curated-reference-service.ts';

type BriefService = {
  createSession(input: { projectId: string; sourceDocumentIds: string[] }): Promise<CreativeResearchSession>;
  getSession(sessionId: string): Promise<CreativeResearchSession>;
  prepareDesignBrief(sessionId: string, input: { profileId: string; designerNotes?: string[] }): Promise<DesignBrief>;
  getDesignBrief(sessionId: string): Promise<DesignBrief>;
  updateDesignBrief(sessionId: string, patch: UpdateCreativeResearchBriefInput): Promise<DesignBrief>;
};

type SearchService = {
  startResearch(sessionId: string): Promise<CreativeResearchSession>;
  planInitialSearch(sessionId: string): Promise<SearchQuery[]>;
  executeSearchBatch(sessionId: string, queryIds?: string[]): Promise<unknown>;
  getSearchHistory(sessionId: string): Promise<SearchQuery[]>;
  listWebReferences(sessionId: string): Promise<WebReferenceItem[]>;
};

type SearchRefinementService = {
  planRefreshSearch(sessionId: string, profileId: string): Promise<SearchQuery[]>;
  planSimilarSearch(input: PlanCreativeResearchSimilarSearchInput): Promise<SearchQuery[]>;
};

type SearchStrategyService = {
  updateResearchSearchStrategy(sessionId: string, input: UpdateCreativeResearchSearchStrategyInput): Promise<DesignBrief>;
  planKeywordAdjustmentSearch(sessionId: string): Promise<SearchQuery[]>;
};

type ReanalysisService = {
  reanalyzeDesignBrief(sessionId: string, input: { profileId: string; feedback: string[] }): Promise<DesignBrief>;
};

export function toCreativeResearchSessionDto(value: CreativeResearchSession): CreativeResearchSessionDto {
  return Object.freeze({
    id: value.id,
    projectId: value.projectId,
    status: value.status,
    sourceDocumentCount: value.sourceDocumentIds.length,
    activeDesignBriefId: value.activeDesignBriefId,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  });
}

const PUBLIC_EVIDENCE_FIELDS: CreativeResearchBriefFieldDto[] = [
  'projectSummary', 'designTask', 'audience', 'scenarios', 'coreMessages', 'constraints',
];

function safeDocumentLabel(value: string): string {
  const normalized = String(value || '').replace(/\\/gu, '/').replace(/\/+$/gu, '');
  const basename = normalized.split('/').pop()?.trim() || '';
  return basename && basename !== '.' && basename !== '..' ? basename.slice(0, 180) : '来源文档';
}

export function projectCreativeResearchBriefEvidence(value: DesignBrief): {
  evidence: CreativeResearchBriefEvidenceDto[];
  fieldEvidence: CreativeResearchBriefDto['fieldEvidence'];
} {
  const evidenceById = new Map(value.evidence.map((item) => [item.id, item]));
  const fieldEvidence = PUBLIC_EVIDENCE_FIELDS.flatMap((field) => {
    const evidenceIds = [...new Set(value.fieldEvidence?.[field] || [])]
      .filter((evidenceId) => evidenceById.has(evidenceId));
    return evidenceIds.length ? [{ field, evidenceIds }] : [];
  });
  const referencedIds = new Set(fieldEvidence.flatMap((item) => item.evidenceIds));
  const evidence = value.evidence
    .filter((item) => referencedIds.has(item.id))
    .map((item) => Object.freeze({
      id: item.id,
      sourceLabel: safeDocumentLabel(item.sourceDocumentId),
      locator: Object.freeze({ kind: item.locator.kind, value: item.locator.value }),
      excerpt: String(item.excerpt || ''),
    }));
  return Object.freeze({ evidence, fieldEvidence });
}

export function toCreativeResearchBriefDto(value: DesignBrief): CreativeResearchBriefDto {
  const evidenceProjection = projectCreativeResearchBriefEvidence(value);
  return Object.freeze({
    id: value.id,
    sessionId: value.sessionId,
    revision: value.revision,
    projectSummary: value.projectSummary,
    designTask: value.designTask,
    audience: value.audience,
    scenarios: [...value.scenarios],
    coreMessages: [...value.coreMessages],
    constraints: [...value.constraints],
    conceptKeywords: [...value.conceptKeywords],
    visualKeywords: [...value.visualKeywords],
    designerNotes: [...value.designerNotes],
    searchKeywords: value.searchKeywords.map((keyword) => ({
      id: keyword.id,
      value: keyword.value,
      kind: keyword.kind,
      source: keyword.source,
      enabled: keyword.enabled,
      rationale: keyword.rationale,
      locale: keyword.locale,
    })),
    ...evidenceProjection,
    warnings: [...(value.warnings || [])],
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  });
}

export function toCreativeResearchQueryDto(value: SearchQuery): CreativeResearchQueryDto {
  return Object.freeze({
    id: value.id,
    text: value.text,
    kind: value.kind,
    status: value.status,
    provider: value.provider,
    providerQueryText: value.providerQueryText,
    errorCode: value.errorCode,
    errorMessage: value.errorMessage,
    resultCount: value.resultCount,
    createdAt: value.createdAt,
    completedAt: value.completedAt,
    batch: value.batch,
    origin: value.origin || 'INITIAL',
    researchTrackId: value.researchTrackId,
    round: value.round || (value.origin === 'INITIAL' || value.origin === undefined ? 'INITIAL' : 'REFINEMENT'),
    intent: value.intent || 'KNOWLEDGE',
    locale: value.locale,
    groupId: value.groupId,
    platform: value.platform,
  });
}

export function toCreativeResearchPlanDto(value: CreativeResearchPlan): CreativeResearchPlanDto {
  return Object.freeze({
    id: value.id,
    sessionId: value.sessionId,
    briefRevisionId: value.briefRevisionId,
    clues: value.clues.map((clue) => Object.freeze({ ...clue })),
    tracks: value.tracks.map((track) => Object.freeze({ ...track, clueIds: [...track.clueIds] })),
    firstRoundQueries: value.firstRoundQueries.map((query) => Object.freeze({ ...query, intent: query.intent || 'KNOWLEDGE', locale: query.locale || 'ZH' })),
    ...(value.visualReferencePlan ? { visualReferencePlan: Object.freeze({
      id: value.visualReferencePlan.id,
      groups: value.visualReferencePlan.groups.map((group) => Object.freeze({ ...group, keywords: [...group.keywords] })),
      createdAt: value.visualReferencePlan.createdAt,
    }) } : {}),
    plannerMode: value.plannerMode,
    telemetry: Object.freeze({ ...value.telemetry }),
    createdAt: value.createdAt,
  });
}

function publicHttpUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function toCreativeResearchReferenceDto(value: WebReferenceItem | CuratedReferenceItem): CreativeResearchReferenceDto {
  if (value.sourceType === 'CURATED_REFERENCE') return Object.freeze({
    sourceType: value.sourceType,
    id: value.id,
    resourceType: 'IMAGE',
    title: value.title || value.originalFileName,
    ...(value.sourceUrl ? { sourceUrl: value.sourceUrl } : {}),
    publisher: value.sourceLabel || '设计师精选',
    matchedQueryIds: [],
    retrievedAt: value.importedAt,
    searchIntent: 'VISUAL',
    imageStatus: 'READY',
    cachedImageUrl: value.cachedImageUrl,
    originalFileName: value.originalFileName,
    mimeType: value.mimeType,
    ...(value.sourceLabel ? { sourceLabel: value.sourceLabel } : {}),
    importedAt: value.importedAt,
  });
  return Object.freeze({
    sourceType: value.sourceType,
    id: value.id,
    resourceType: value.resourceType,
    title: value.title || value.publisherOrDomain,
    sourceUrl: publicHttpUrl(value.sourceUrl) || '',
    thumbnailUrl: publicHttpUrl(value.thumbnail?.url),
    remoteImageUrl: publicHttpUrl(value.remoteImageUrl),
    publisher: value.publisherOrDomain,
    queryId: value.queryId,
    matchedQueryIds: [...(value.matchedQueryIds || [value.queryId])],
    resultRank: value.resultRank,
    retrievedAt: value.retrievedAt,
    searchIntent: value.searchIntent || 'KNOWLEDGE',
    imageStatus: value.imageStatus || (value.remoteImageUrl ? 'PENDING' : 'UNAVAILABLE'),
    ...(value.cachedImageUrl ? { cachedImageUrl: value.cachedImageUrl } : {}),
    ...(value.groupId ? { groupId: value.groupId } : {}),
    ...(value.matchedGroupIds ? { matchedGroupIds: [...value.matchedGroupIds] } : {}),
    ...(value.platform ? { platform: value.platform } : {}),
    ...(value.visualRole ? { visualRole: value.visualRole } : {}),
    ...(value.qualityScore !== undefined ? { qualityScore: value.qualityScore } : {}),
  });
}

export function toCreativeResearchReferenceGuideDto(value: CreativeResearchReferenceGuide): CreativeResearchReferenceGuideDto {
  return Object.freeze({
    id: value.id, sessionId: value.sessionId, briefRevisionId: value.briefRevisionId,
    territories: value.territories.map((territory) => Object.freeze({
      id: territory.id, kind: territory.kind, title: territory.title,
      keywords: [...territory.keywords], rationale: territory.rationale,
      observe: [...territory.observe], suggestedQueries: [...(territory.suggestedQueries || [])],
    })),
    createdAt: value.createdAt,
  });
}

export function toCreativeResearchSelectionDto(value: ReferenceSelection): CreativeResearchReferenceSelectionDto {
  return Object.freeze({
    referenceId: value.referenceId,
    state: value.state,
    selectedAttributes: [...value.selectedAttributes],
    designerNote: value.designerNote,
    updatedAt: value.updatedAt,
  });
}

export function toCreativeResearchNegativeSignalDto(value: NegativeSignal): CreativeResearchNegativeSignalDto {
  return Object.freeze({
    id: value.id,
    type: value.type,
    scope: value.scope,
    ...(value.sourceReferenceId ? { sourceReferenceId: value.sourceReferenceId } : {}),
    ...(value.sourceKeywordId ? { sourceKeywordId: value.sourceKeywordId } : {}),
    ...(value.value ? { value: value.value } : {}),
    ...(value.reason ? { reason: value.reason } : {}),
    createdAt: value.createdAt,
  });
}

export function toCreativeResearchPreferenceInsightDto(value: PreferenceInsight): CreativeResearchPreferenceInsightDto {
  return Object.freeze({
    id: value.id,
    analysisRunId: value.analysisRunId,
    category: value.category,
    summary: value.summary,
    status: value.status,
    confidence: value.confidence,
    supportingReferenceIds: [...value.supportingReferenceIds],
    supportingNegativeSignalIds: [...value.supportingNegativeSignalIds],
    designerOverride: value.designerOverride,
    createdAt: value.createdAt,
    finalizedAt: value.finalizedAt,
  });
}

export function toCreativeResearchDirectionBoardDto(value: DirectionBoard): CreativeResearchDirectionBoardDto {
  return Object.freeze({
    id: value.id,
    sessionId: value.sessionId,
    revision: value.revision,
    summary: value.summary,
    visualKeywords: [...value.visualKeywords],
    ...(value.typography !== undefined ? { typography: value.typography } : {}),
    ...(value.layout !== undefined ? { layout: value.layout } : {}),
    ...(value.color !== undefined ? { color: value.color } : {}),
    ...(value.graphic !== undefined ? { graphic: value.graphic } : {}),
    ...(value.material !== undefined ? { material: value.material } : {}),
    ...(value.photography !== undefined ? { photography: value.photography } : {}),
    referenceIds: [...value.referenceIds],
    referenceRegionIds: [...value.referenceRegionIds],
    negativeSignalIds: [...value.negativeSignalIds],
    designerNotes: [...value.designerNotes],
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  });
}

export function toCreativeDirectionContextDto(value: CreativeDirectionContext): CreativeDirectionContextDto {
  return Object.freeze({
    sessionId: value.sessionId,
    projectId: value.projectId,
    briefRevision: value.briefRevision,
    directionBoardRevision: value.directionBoardRevision,
    projectBrief: value.projectBrief,
    constraints: [...value.constraints],
    visualKeywords: [...value.visualKeywords],
    selectedReferenceIds: [...value.selectedReferenceIds],
    selectedReferenceRegionIds: [...value.selectedReferenceRegionIds],
    preferredAttributes: [...value.preferredAttributes],
    negativeSignals: value.negativeSignals.map((signal) => Object.freeze({
      id: signal.id,
      type: signal.type,
      scope: signal.scope,
      ...(signal.value ? { value: signal.value } : {}),
      ...(signal.reason ? { reason: signal.reason } : {}),
    })),
    designerNotes: [...value.designerNotes],
    directionSummary: value.directionSummary,
    provenance: Object.freeze({
      designBriefId: value.provenance.designBriefId,
      directionBoardId: value.provenance.directionBoardId,
      sourceDocumentCount: value.provenance.sourceDocumentIds.length,
      sourceDocumentLabels: value.provenance.sourceDocumentIds.map(safeDocumentLabel),
      referenceIds: [...value.provenance.referenceIds],
      referenceRegionIds: [...value.provenance.referenceRegionIds],
      negativeSignalIds: [...value.provenance.negativeSignalIds],
    }),
    createdAt: value.createdAt,
  });
}

export function createCreativeResearchOperations(options: {
  briefs: BriefService;
  search: SearchService;
  planner: CreativeResearchPlannerService;
  guide: CreativeResearchReferenceGuideService;
  curated: CreativeResearchCuratedReferenceService;
  importCuratedFiles(sessionId: string, input: unknown): Promise<CuratedReferenceItem[]>;
  history: SearchHistoryRepository;
  selection: CreativeResearchSelectionService;
  preferences: CreativeResearchPreferenceAnalysisService;
  direction: CreativeResearchDirectionService;
  refinement: SearchRefinementService;
  strategy: SearchStrategyService;
  reanalysis: ReanalysisService;
  listSessions(projectId: string): Promise<CreativeResearchSession[]>;
  deleteSession(sessionId: string): Promise<boolean>;
  credential: {
    has(): Promise<boolean>;
    save(value: string): Promise<void>;
    remove(): Promise<void>;
  };
}) {
  const credentialStatus = async (): Promise<CreativeResearchCredentialStatusDto> => ({
    provider: 'baidu-search',
    configured: await options.credential.has(),
  });

  return Object.freeze({
    'creative-research:list-sessions': async (_context: unknown, projectId: string) =>
      (await options.listSessions(String(projectId || ''))).map(toCreativeResearchSessionDto),
    'creative-research:create-session': async (_context: unknown, input: { projectId: string; sourceDocumentIds: string[] }) =>
      toCreativeResearchSessionDto(await options.briefs.createSession(input)),
    'creative-research:delete-session': async (_context: unknown, sessionId: string) => ({
      deleted: await options.deleteSession(String(sessionId || '')),
    }),
    'creative-research:get-session': async (_context: unknown, sessionId: string) =>
      toCreativeResearchSessionDto(await options.briefs.getSession(sessionId)),
    'creative-research:prepare-design-brief': async (_context: unknown, sessionId: string, input: { profileId: string; designerNotes?: string[] }) =>
      toCreativeResearchBriefDto(await options.briefs.prepareDesignBrief(sessionId, input)),
    'creative-research:get-design-brief': async (_context: unknown, sessionId: string) =>
      toCreativeResearchBriefDto(await options.briefs.getDesignBrief(sessionId)),
    'creative-research:update-design-brief': async (_context: unknown, sessionId: string, input: UpdateCreativeResearchBriefInput) =>
      toCreativeResearchBriefDto(await options.briefs.updateDesignBrief(sessionId, input)),
    'creative-research:create-research-plan': async (_context: unknown, sessionId: string, input: { profileId: string }) =>
      toCreativeResearchPlanDto(await options.planner.createResearchPlan(sessionId, input)),
    'creative-research:get-research-plan': async (_context: unknown, sessionId: string) => {
      const plan = await options.planner.getResearchPlan(sessionId);
      return plan ? toCreativeResearchPlanDto(plan) : null;
    },
    'creative-research:generate-reference-guide': async (_context: unknown, sessionId: string, input: { profileId: string }) =>
      toCreativeResearchReferenceGuideDto(await options.guide.generateReferenceGuide(sessionId, input)),
    'creative-research:get-reference-guide': async (_context: unknown, sessionId: string) => {
      const guide = await options.guide.getReferenceGuide(sessionId);
      return guide ? toCreativeResearchReferenceGuideDto(guide) : null;
    },
    'creative-research:start-research': async (_context: unknown, sessionId: string) =>
      toCreativeResearchSessionDto(await options.guide.startResearch(sessionId)),
    'creative-research:plan-initial-search': async (_context: unknown, sessionId: string) =>
      (await options.search.planInitialSearch(sessionId)).map(toCreativeResearchQueryDto),
    'creative-research:plan-refresh-search': async (_context: unknown, sessionId: string, profileId: string) =>
      (await options.refinement.planRefreshSearch(sessionId, profileId)).map(toCreativeResearchQueryDto),
    'creative-research:update-search-strategy': async (_context: unknown, sessionId: string, input: UpdateCreativeResearchSearchStrategyInput) =>
      toCreativeResearchBriefDto(await options.strategy.updateResearchSearchStrategy(sessionId, input)),
    'creative-research:plan-keyword-adjustment-search': async (_context: unknown, sessionId: string) =>
      (await options.strategy.planKeywordAdjustmentSearch(sessionId)).map(toCreativeResearchQueryDto),
    'creative-research:plan-similar-search': async (_context: unknown, input: PlanCreativeResearchSimilarSearchInput) =>
      (await options.refinement.planSimilarSearch(input)).map(toCreativeResearchQueryDto),
    'creative-research:reanalyze-design-brief': async (_context: unknown, sessionId: string, input: { profileId: string; feedback: string[] }) =>
      toCreativeResearchBriefDto(await options.reanalysis.reanalyzeDesignBrief(sessionId, input)),
    'creative-research:execute-search-batch': async (_context: unknown, sessionId: string, queryIds?: string[]) => {
      const requested = Array.isArray(queryIds) ? [...new Set(queryIds)] : undefined;
      if (requested?.length) {
        const history = await options.history.listSessionSearchHistory(sessionId);
        for (const query of history) {
          if (requested.includes(query.id) && query.status === 'FAILED') {
            await options.history.recordQueryProgress(sessionId, query.id, {
              status: 'PENDING',
              completedAt: undefined,
              errorCode: undefined,
              errorMessage: undefined,
              resultCount: undefined,
              providerCalls: undefined,
            });
          }
        }
      }
      await options.search.executeSearchBatch(sessionId, requested);
      return (await options.search.getSearchHistory(sessionId)).map(toCreativeResearchQueryDto);
    },
    'creative-research:get-search-history': async (_context: unknown, sessionId: string) =>
      (await options.search.getSearchHistory(sessionId)).map(toCreativeResearchQueryDto),
    'creative-research:list-references': async (_context: unknown, sessionId: string) =>
      [...await options.curated.listCuratedReferences(sessionId), ...await options.search.listWebReferences(sessionId)].map(toCreativeResearchReferenceDto),
    'creative-research:list-curated-references': async (_context: unknown, sessionId: string) =>
      (await options.curated.listCuratedReferences(sessionId)).map(toCreativeResearchReferenceDto),
    'creative-research:import-curated-references': async (_context: unknown, sessionId: string, input: unknown) =>
      (await options.importCuratedFiles(sessionId, input)).map(toCreativeResearchReferenceDto),
    'creative-research:remove-curated-reference': async (_context: unknown, sessionId: string, referenceId: string) => ({
      removed: await options.curated.removeCuratedReference(sessionId, referenceId),
    }),
    'creative-research:update-curated-reference-source': async (_context: unknown, sessionId: string, referenceId: string, input: { sourceUrl?: string; sourceLabel?: string }) =>
      toCreativeResearchReferenceDto(await options.curated.updateCuratedReferenceSource(sessionId, referenceId, input || {})),
    'creative-research:list-selections': async (_context: unknown, sessionId: string) =>
      (await options.selection.listSelections(sessionId)).map(toCreativeResearchSelectionDto),
    'creative-research:set-reference-selection': async (_context: unknown, input: SetCreativeResearchReferenceSelectionInput) =>
      toCreativeResearchSelectionDto((await options.selection.setReferenceSelection(input)).selection),
    'creative-research:list-negative-signals': async (_context: unknown, sessionId: string) =>
      (await options.selection.listNegativeSignals(sessionId)).map(toCreativeResearchNegativeSignalDto),
    'creative-research:analyze-preferences': async (_context: unknown, sessionId: string, profileId: string) =>
      (await options.preferences.analyzeSelection(sessionId, profileId)).map(toCreativeResearchPreferenceInsightDto),
    'creative-research:list-preference-insights': async (_context: unknown, sessionId: string) =>
      (await options.preferences.listInsights(sessionId)).map(toCreativeResearchPreferenceInsightDto),
    'creative-research:update-preference-insight': async (_context: unknown, sessionId: string, insightId: string, designerOverride: string) =>
      toCreativeResearchPreferenceInsightDto(await options.preferences.updateInsight(sessionId, insightId, designerOverride)),
    'creative-research:finalize-preference-insight': async (_context: unknown, sessionId: string, insightId: string) =>
      toCreativeResearchPreferenceInsightDto(await options.preferences.finalizeInsight(sessionId, insightId)),
    'creative-research:start-direction': async (_context: unknown, sessionId: string) => {
      const result = await options.direction.startDirection(sessionId);
      return Object.freeze({
        session: toCreativeResearchSessionDto(result.session),
        board: toCreativeResearchDirectionBoardDto(result.board),
        availableReferenceIds: [...result.availableReferenceIds],
        pendingFinalizedInsights: result.pendingFinalizedInsights.map((insight) => Object.freeze({
          id: insight.id,
          category: insight.category,
          text: insight.text,
        })),
      });
    },
    'creative-research:get-direction-board': async (_context: unknown, sessionId: string) => {
      const result = await options.direction.getDirectionBoard(sessionId);
      return Object.freeze({
        session: toCreativeResearchSessionDto(result.session),
        board: result.board ? toCreativeResearchDirectionBoardDto(result.board) : null,
      });
    },
    'creative-research:update-direction-board': async (_context: unknown, sessionId: string, update: UpdateCreativeResearchDirectionBoardInput) =>
      toCreativeResearchDirectionBoardDto(await options.direction.updateDirectionBoard(sessionId, update)),
    'creative-research:list-direction-board-revisions': async (_context: unknown, sessionId: string) =>
      (await options.direction.listDirectionBoardRevisions(sessionId)).map(toCreativeResearchDirectionBoardDto),
    'creative-research:return-to-research': async (_context: unknown, sessionId: string) =>
      toCreativeResearchSessionDto(await options.direction.returnToResearch(sessionId)),
    'creative-research:complete-direction': async (_context: unknown, sessionId: string, input: CompleteCreativeResearchDirectionInput) => {
      const result = await options.direction.completeDirection(sessionId, input);
      return Object.freeze({
        session: toCreativeResearchSessionDto(result.session),
        context: toCreativeDirectionContextDto(result.context),
      });
    },
    'creative-research:get-direction-context': async (_context: unknown, sessionId: string) => {
      const result = await options.direction.getDirectionContext(sessionId);
      return Object.freeze({
        session: toCreativeResearchSessionDto(result.session),
        context: result.context ? toCreativeDirectionContextDto(result.context) : null,
      });
    },
    'creative-research:get-search-credential-status': credentialStatus,
    'creative-research:save-search-credential': async (_context: unknown, value: string) => {
      const credential = String(value || '').trim();
      if (!credential) throw new Error('百度搜索凭据不能为空');
      await options.credential.save(credential);
      return credentialStatus();
    },
    'creative-research:delete-search-credential': async () => {
      await options.credential.remove();
      return credentialStatus();
    },
  });
}
