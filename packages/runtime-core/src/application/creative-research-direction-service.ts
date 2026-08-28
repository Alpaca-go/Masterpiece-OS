import { randomUUID } from 'node:crypto';
import type {
  CreativeDirectionContext,
  CreativeResearchSession,
  DirectionBoard,
} from './creative-research/contracts.ts';
import { assertDirectionBoardEvidence, compileCreativeDirectionContext } from './creative-research/direction-context.ts';
import { assertCreativeResearchTransition } from './creative-research/invariants.ts';
import type {
  CreativeDirectionContextRepository,
  CreativeResearchSessionRepository,
  DesignBriefRepository,
  DirectionBoardRepository,
  PreferenceEvidenceRepository,
  ReferenceResearchRepository,
} from './creative-research/ports.ts';
import {
  createCreativeResearchDirectionBoardService,
  type DirectionBoardUpdateInput,
} from './creative-research-direction-board-service.ts';
import { creativeResearchDirectionError } from './creative-research-direction-errors.ts';

export interface PendingFinalizedInsight {
  id: string;
  category: string;
  text: string;
}

export interface StartDirectionResult {
  session: CreativeResearchSession;
  board: DirectionBoard;
  availableReferenceIds: string[];
  pendingFinalizedInsights: PendingFinalizedInsight[];
}

export interface CreativeResearchDirectionService {
  startDirection(sessionId: string): Promise<StartDirectionResult>;
  updateDirectionBoard(sessionId: string, update: DirectionBoardUpdateInput): Promise<DirectionBoard>;
  getDirectionBoard(sessionId: string): Promise<{ session: CreativeResearchSession; board: DirectionBoard | null }>;
  listDirectionBoardRevisions(sessionId: string): Promise<DirectionBoard[]>;
  returnToResearch(sessionId: string): Promise<CreativeResearchSession>;
  completeDirection(sessionId: string, options: { confirm: boolean }): Promise<{
    session: CreativeResearchSession;
    context: CreativeDirectionContext;
  }>;
  getDirectionContext(sessionId: string): Promise<{
    session: CreativeResearchSession;
    context: CreativeDirectionContext | null;
  }>;
}

export function createCreativeResearchDirectionService(options: {
  sessions: CreativeResearchSessionRepository;
  briefs: DesignBriefRepository;
  references: ReferenceResearchRepository;
  insights: PreferenceEvidenceRepository;
  boards: DirectionBoardRepository;
  contexts: CreativeDirectionContextRepository;
  boardService: ReturnType<typeof createCreativeResearchDirectionBoardService>;
  now?: () => string;
  createId?: () => string;
}): CreativeResearchDirectionService {
  const now = options.now || (() => new Date().toISOString());
  const createId = options.createId || randomUUID;

  const loadSession = async (sessionId: string): Promise<CreativeResearchSession> => {
    const session = await options.sessions.get(sessionId);
    if (!session) {
      throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_SESSION_NOT_FOUND', `Creative Research Session 不存在：${sessionId}`);
    }
    return session;
  };

  return Object.freeze({
    async startDirection(sessionId: string) {
      const session = await loadSession(sessionId);
      if (session.status === 'DIRECTION') {
        const board = await options.boards.getCurrent(sessionId);
        if (!board) {
          throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_BOARD_NOT_FOUND', '当前 Session 缺少 active Direction Board');
        }
        return { session, board, availableReferenceIds: [], pendingFinalizedInsights: [] };
      }
      if (session.status !== 'RESEARCH') {
        throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_INVALID_STATE', `当前状态 ${session.status} 不能进入 Direction 阶段`);
      }
      const selections = await options.references.listSelections(sessionId);
      assertCreativeResearchTransition(session, 'DIRECTION', { selections });
      const [brief, negativeSignals, preferenceInsights, regions, previous] = await Promise.all([
        options.briefs.getActiveRevision(sessionId),
        options.references.listNegativeSignals(sessionId),
        options.insights.listInsights(sessionId),
        options.references.listRegions(sessionId),
        options.boards.getCurrent(sessionId),
      ]);
      if (!brief) {
        throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_VALIDATION_FAILED', '当前 Session 没有 active Design Brief');
      }
      const draftInput = { sessionId, brief, selections, regions, negativeSignals, preferenceInsights };
      const draft = previous
        ? options.boardService.buildReentryDraft({ ...draftInput, previousBoard: previous })
        : options.boardService.buildInitialDraft(draftInput);
      if (!draft.referenceIds.length) {
        throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_VALIDATION_FAILED', '当前没有可沿用的设计师已选参考，请返回研究阶段重新选择');
      }
      const timestamp = now();
      const board: DirectionBoard = {
        ...draft,
        id: createId(),
        revision: previous ? previous.revision + 1 : 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      assertDirectionBoardEvidence(board, selections);
      const saved = await options.boards.saveRevision(board);
      const nextSession = await options.sessions.save({
        ...session,
        status: 'DIRECTION',
        activeDirectionBoardId: saved.id,
        updatedAt: timestamp,
      });
      const onBoard = new Set(saved.referenceIds);
      const availableReferenceIds = selections
        .filter((selection) => selection.state === 'SELECTED' && selection.actor === 'DESIGNER')
        .map((selection) => selection.referenceId)
        .filter((id) => !onBoard.has(id));
      const pendingFinalizedInsights: PendingFinalizedInsight[] = previous
        ? preferenceInsights
          .filter((insight) => insight.status === 'FINALIZED'
            && (insight.finalizedAt ?? insight.createdAt) > previous.updatedAt)
          .map((insight) => ({
            id: insight.id,
            category: insight.category,
            text: (insight.designerOverride ?? insight.summary).trim(),
          }))
        : [];
      return { session: nextSession, board: saved, availableReferenceIds, pendingFinalizedInsights };
    },
    async updateDirectionBoard(sessionId: string, update: DirectionBoardUpdateInput) {
      const session = await loadSession(sessionId);
      if (session.status === 'COMPLETED') {
        throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_INVALID_STATE', 'Session 已完成，Direction Board 只读');
      }
      if (session.status !== 'DIRECTION') {
        throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_INVALID_STATE', `当前状态 ${session.status} 不能修改 Direction Board`);
      }
      const saved = await options.boardService.saveRevision({ session, update });
      await options.sessions.save({ ...session, activeDirectionBoardId: saved.id, updatedAt: now() });
      return saved;
    },
    async getDirectionBoard(sessionId: string) {
      const session = await loadSession(sessionId);
      return { session, board: await options.boards.getCurrent(sessionId) };
    },
    async listDirectionBoardRevisions(sessionId: string) {
      await loadSession(sessionId);
      return options.boards.listRevisionHistory(sessionId);
    },
    async returnToResearch(sessionId: string) {
      const session = await loadSession(sessionId);
      if (session.status !== 'DIRECTION') {
        throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_INVALID_STATE', `当前状态 ${session.status} 不能返回研究阶段`);
      }
      assertCreativeResearchTransition(session, 'RESEARCH');
      return options.sessions.save({ ...session, status: 'RESEARCH', updatedAt: now() });
    },
    async completeDirection(sessionId: string, completeOptions: { confirm: boolean }) {
      if (!completeOptions?.confirm) {
        throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_CONFIRMATION_REQUIRED', '完成后本次 Creative Research 将进入只读完成状态');
      }
      const session = await loadSession(sessionId);
      if (session.status !== 'DIRECTION') {
        throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_INVALID_STATE', `当前状态 ${session.status} 不能完成 Direction 阶段`);
      }
      const [brief, board, selections, regions, negativeSignals] = await Promise.all([
        options.briefs.getActiveRevision(sessionId),
        options.boards.getCurrent(sessionId),
        options.references.listSelections(sessionId),
        options.references.listRegions(sessionId),
        options.references.listNegativeSignals(sessionId),
      ]);
      if (!brief || brief.id !== session.activeDesignBriefId) {
        throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_VALIDATION_FAILED', '当前 Session 没有 active Design Brief');
      }
      if (!board || board.id !== session.activeDirectionBoardId) {
        throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_BOARD_NOT_FOUND', '当前 Session 缺少 active Direction Board');
      }
      const timestamp = now();
      // 幂等重试：若当前 active Board 已持久化过 Context，直接复用，
      // 避免 “Context 已写入但 Session 未保存 COMPLETED” 后的重试因 createdAt 不同而失败。
      const existing = await options.contexts.getCurrent(sessionId);
      const context = existing && existing.provenance.directionBoardId === board.id
        ? existing
        : compileCreativeDirectionContext({
          session,
          brief,
          directionBoard: board,
          selections,
          regions,
          negativeSignals,
          createdAt: timestamp,
        });
      assertCreativeResearchTransition(session, 'COMPLETED', { directionBoard: board, directionContext: context });
      const savedContext = await options.contexts.save(context);
      const nextSession = await options.sessions.save({
        ...session,
        status: 'COMPLETED',
        completedAt: timestamp,
        updatedAt: timestamp,
      });
      return { session: nextSession, context: savedContext };
    },
    async getDirectionContext(sessionId: string) {
      const session = await loadSession(sessionId);
      const context = await options.contexts.getCurrent(sessionId);
      if (session.status === 'COMPLETED' && !context) {
        throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_CONTEXT_NOT_FOUND', 'Session 已完成但缺少 Creative Direction Context');
      }
      return { session, context };
    },
  });
}
