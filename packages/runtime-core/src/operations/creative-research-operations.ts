import type {
  CreativeResearchBriefDto,
  CreativeResearchCredentialStatusDto,
  CreativeResearchQueryDto,
  CreativeResearchReferenceDto,
  CreativeResearchSessionDto,
  UpdateCreativeResearchBriefInput,
} from '../application-contracts.ts';
import type { CreativeResearchSession, DesignBrief, SearchQuery, WebReferenceItem } from '../application/creative-research/contracts.ts';
import type { SearchHistoryRepository } from '../application/creative-research/ports.ts';

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

export function toCreativeResearchBriefDto(value: DesignBrief): CreativeResearchBriefDto {
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

export function toCreativeResearchReferenceDto(value: WebReferenceItem): CreativeResearchReferenceDto {
  return Object.freeze({
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
  });
}

export function createCreativeResearchOperations(options: {
  briefs: BriefService;
  search: SearchService;
  history: SearchHistoryRepository;
  listSessions(projectId: string): Promise<CreativeResearchSession[]>;
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
    'creative-research:get-session': async (_context: unknown, sessionId: string) =>
      toCreativeResearchSessionDto(await options.briefs.getSession(sessionId)),
    'creative-research:prepare-design-brief': async (_context: unknown, sessionId: string, input: { profileId: string; designerNotes?: string[] }) =>
      toCreativeResearchBriefDto(await options.briefs.prepareDesignBrief(sessionId, input)),
    'creative-research:get-design-brief': async (_context: unknown, sessionId: string) =>
      toCreativeResearchBriefDto(await options.briefs.getDesignBrief(sessionId)),
    'creative-research:update-design-brief': async (_context: unknown, sessionId: string, input: UpdateCreativeResearchBriefInput) =>
      toCreativeResearchBriefDto(await options.briefs.updateDesignBrief(sessionId, input)),
    'creative-research:start-research': async (_context: unknown, sessionId: string) =>
      toCreativeResearchSessionDto(await options.search.startResearch(sessionId)),
    'creative-research:plan-initial-search': async (_context: unknown, sessionId: string) =>
      (await options.search.planInitialSearch(sessionId)).map(toCreativeResearchQueryDto),
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
      (await options.search.listWebReferences(sessionId)).map(toCreativeResearchReferenceDto),
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
