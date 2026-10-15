import crypto from 'node:crypto';
import type {
  AnalysisModelAdapter,
  DocumentIntakeAdapter,
  ProjectBriefLinkAdapter,
} from './creative-research/adapter-contracts.ts';
import type {
  CreativeResearchSession,
  DesignBrief,
  DesignBriefField,
  SearchKeyword,
  SearchKeywordKind,
} from './creative-research/contracts.ts';
import { DESIGN_BRIEF_FIELDS, SEARCH_KEYWORD_KINDS } from './creative-research/contracts.ts';
import { assertCreativeResearchSession, assertDesignBrief, assertDesignBriefRevision } from './creative-research/evidence.ts';
import type { CreativeResearchSessionRepository, DesignBriefRepository } from './creative-research/ports.ts';
import { creativeResearchError } from './creative-research-errors.ts';

export interface DesignBriefKeywordUpdate {
  id?: string;
  value: string;
  kind: SearchKeywordKind;
  enabled?: boolean;
  rationale?: string;
  locale?: string;
}

export interface DesignBriefUpdate {
  projectSummary?: string;
  designTask?: string;
  audience?: string;
  scenarios?: string[];
  coreMessages?: string[];
  constraints?: string[];
  conceptKeywords?: string[];
  visualKeywords?: string[];
  designerNotes?: string[];
  searchKeywords?: DesignBriefKeywordUpdate[];
}

function cleanText(value: string, field: string): string {
  const result = String(value || '').replace(/\s+/gu, ' ').trim();
  if (!result) throw new Error(`${field} 不能为空`);
  return result;
}

function cleanList(values: string[], cap: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const cleaned = String(value || '').replace(/\s+/gu, ' ').trim();
    const key = cleaned.toLocaleLowerCase();
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
    if (result.length >= cap) break;
  }
  return result;
}

export function createCreativeResearchDesignBriefService(options: {
  sessions: CreativeResearchSessionRepository;
  briefs: DesignBriefRepository;
  documentAdapter: DocumentIntakeAdapter;
  analysisAdapter: AnalysisModelAdapter;
  projectBriefAdapter?: ProjectBriefLinkAdapter;
  now?: () => string;
  createId?: () => string;
}) {
  const now = options.now || (() => new Date().toISOString());
  const createId = options.createId || (() => crypto.randomUUID());

  async function requireSession(sessionId: string): Promise<CreativeResearchSession> {
    const session = await options.sessions.get(sessionId);
    if (!session) throw creativeResearchError('CREATIVE_RESEARCH_SESSION_NOT_FOUND', `Creative Research Session 不存在：${sessionId}`);
    return session;
  }

  async function createSession(input: { projectId: string; sourceDocumentIds: string[] }): Promise<CreativeResearchSession> {
    if (!input.projectId.trim()) throw new Error('projectId 不能为空');
    const sourceDocumentIds = [...new Set(input.sourceDocumentIds.map((id) => id.trim()).filter(Boolean))];
    if (!sourceDocumentIds.length) throw creativeResearchError('CREATIVE_RESEARCH_DOCUMENT_EMPTY', '请至少选择一个源文档');
    const timestamp = now();
    const session: CreativeResearchSession = {
      id: createId(),
      projectId: input.projectId.trim(),
      status: 'INTAKE',
      sourceDocumentIds,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    assertCreativeResearchSession(session);
    return options.sessions.create(session);
  }

  async function prepareDesignBrief(sessionId: string, input: {
    profileId: string;
    designerNotes?: string[];
  }): Promise<DesignBrief> {
    const session = await requireSession(sessionId);
    if (session.status !== 'INTAKE') throw creativeResearchError('CREATIVE_RESEARCH_SESSION_CONFLICT', 'R2 只允许在 INTAKE 阶段生成 Design Brief');
    if (await options.briefs.getActiveRevision(sessionId)) {
      throw creativeResearchError('CREATIVE_RESEARCH_BRIEF_CONFLICT', 'Design Brief 已存在；请使用 updateDesignBrief 创建新 revision');
    }
    if (!input.profileId.trim()) throw creativeResearchError('CREATIVE_RESEARCH_MODEL_FAILED', '必须选择有效的模型 Profile');
    const intake = await options.documentAdapter.readEvidence({
      projectId: session.projectId,
      sourceDocumentIds: session.sourceDocumentIds,
    });
    const linkedProjectBrief = await options.projectBriefAdapter?.readLinkedBrief(session.projectId) || null;
    const designerNotes = cleanList(input.designerNotes || [], 32);
    const draft = await options.analysisAdapter.draftDesignBrief({
      ...intake,
      profileId: input.profileId.trim(),
      designerNotes,
      linkedProjectBrief,
    });
    const timestamp = now();
    const briefId = createId();
    const referenced = new Set(draft.evidenceIds);
    const evidence = intake.evidence.filter((item) => referenced.has(item.id));
    if (!evidence.length) throw creativeResearchError('CREATIVE_RESEARCH_MODEL_OUTPUT_INVALID', '模型没有返回可追溯的文档证据');
    const searchKeywords: SearchKeyword[] = (draft.searchKeywordSuggestions || []).slice(0, 24).map((item) => ({
      id: createId(), briefId, value: item.value, kind: item.kind, source: 'AI', enabled: true,
      ...(item.rationale ? { rationale: item.rationale } : {}),
      ...(item.locale ? { locale: item.locale } : {}),
      createdAt: timestamp,
    }));
    const brief: DesignBrief = {
      id: briefId,
      sessionId,
      revision: 1,
      projectSummary: draft.projectSummary,
      designTask: draft.designTask,
      audience: draft.audience,
      scenarios: draft.scenarios,
      coreMessages: draft.coreMessages,
      constraints: draft.constraints,
      conceptKeywords: draft.conceptKeywords,
      visualKeywords: draft.visualKeywords,
      searchKeywords,
      designerNotes,
      evidence,
      fieldEvidence: draft.fieldEvidence,
      warnings: [...new Set([...(intake.warnings || []), ...(draft.warnings || [])])],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    assertDesignBrief(brief);
    await options.briefs.saveRevision(brief);
    await options.sessions.save({ ...session, activeDesignBriefId: brief.id, updatedAt: timestamp });
    return brief;
  }

  async function getSession(sessionId: string): Promise<CreativeResearchSession> {
    return requireSession(sessionId);
  }

  async function getDesignBrief(sessionId: string): Promise<DesignBrief> {
    await requireSession(sessionId);
    const brief = await options.briefs.getActiveRevision(sessionId);
    if (!brief) throw creativeResearchError('CREATIVE_RESEARCH_BRIEF_NOT_FOUND', `Design Brief 不存在：${sessionId}`);
    return brief;
  }

  function updateKeywords(previous: DesignBrief, nextBriefId: string, updates: DesignBriefKeywordUpdate[] | undefined, timestamp: string): SearchKeyword[] {
    if (!updates) return previous.searchKeywords.map((keyword) => ({ ...keyword, briefId: nextBriefId }));
    const priorById = new Map(previous.searchKeywords.map((keyword) => [keyword.id, keyword]));
    const seen = new Set<string>();
    const result: SearchKeyword[] = [];
    for (const update of updates.slice(0, 24)) {
      const value = cleanText(update.value, 'searchKeyword.value');
      if (!SEARCH_KEYWORD_KINDS.includes(update.kind)) throw new Error('searchKeyword.kind 无效');
      const key = `${update.kind}:${value.toLocaleLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const prior = update.id ? priorById.get(update.id) : undefined;
      const contentUnchanged = Boolean(prior)
        && prior!.value === value
        && prior!.kind === update.kind
        && (prior!.rationale || '') === (update.rationale || '')
        && (prior!.locale || '') === (update.locale || '');
      result.push({
        id: contentUnchanged ? prior!.id : createId(),
        briefId: nextBriefId,
        value,
        kind: update.kind,
        source: contentUnchanged ? prior!.source : 'DESIGNER',
        enabled: update.enabled ?? prior?.enabled ?? true,
        ...(update.rationale ? { rationale: update.rationale } : {}),
        ...(update.locale ? { locale: update.locale } : {}),
        createdAt: contentUnchanged ? prior!.createdAt : timestamp,
      });
    }
    return result;
  }

  async function updateDesignBrief(sessionId: string, patch: DesignBriefUpdate): Promise<DesignBrief> {
    const session = await requireSession(sessionId);
    if (session.status !== 'INTAKE') throw creativeResearchError('CREATIVE_RESEARCH_SESSION_CONFLICT', 'R2 更新 Design Brief 时 Session 必须保持 INTAKE');
    const previous = await getDesignBrief(sessionId);
    const timestamp = now();
    const briefId = createId();
    const changedFields = DESIGN_BRIEF_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(patch, field));
    const fieldEvidence = { ...(previous.fieldEvidence || {}) };
    for (const field of changedFields) delete fieldEvidence[field as DesignBriefField];
    const designerWarnings = changedFields.map((field) => `Designer override: ${field}; value is designer-authored rather than document-derived.`);
    const next: DesignBrief = {
      ...previous,
      id: briefId,
      revision: previous.revision + 1,
      projectSummary: patch.projectSummary === undefined ? previous.projectSummary : cleanText(patch.projectSummary, 'projectSummary'),
      designTask: patch.designTask === undefined ? previous.designTask : cleanText(patch.designTask, 'designTask'),
      audience: patch.audience === undefined ? previous.audience : cleanText(patch.audience, 'audience'),
      scenarios: patch.scenarios === undefined ? previous.scenarios : cleanList(patch.scenarios, 8),
      coreMessages: patch.coreMessages === undefined ? previous.coreMessages : cleanList(patch.coreMessages, 8),
      constraints: patch.constraints === undefined ? previous.constraints : cleanList(patch.constraints, 16),
      conceptKeywords: patch.conceptKeywords === undefined ? previous.conceptKeywords : cleanList(patch.conceptKeywords, 12),
      visualKeywords: patch.visualKeywords === undefined ? previous.visualKeywords : cleanList(patch.visualKeywords, 12),
      designerNotes: patch.designerNotes === undefined ? previous.designerNotes : cleanList(patch.designerNotes, 32),
      searchKeywords: updateKeywords(previous, briefId, patch.searchKeywords, timestamp),
      fieldEvidence,
      warnings: [...new Set([...(previous.warnings || []), ...designerWarnings])],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    assertDesignBriefRevision(previous, next);
    await options.briefs.saveRevision(next);
    await options.sessions.save({ ...session, activeDesignBriefId: next.id, updatedAt: timestamp });
    return next;
  }

  async function listBriefRevisions(sessionId: string): Promise<DesignBrief[]> {
    await requireSession(sessionId);
    return options.briefs.listRevisions(sessionId);
  }

  return { createSession, prepareDesignBrief, getSession, getDesignBrief, updateDesignBrief, listBriefRevisions };
}
