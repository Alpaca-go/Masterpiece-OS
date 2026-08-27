import type {
  CreativeDirectionContext,
  CreativeResearchSession,
  CreativeResearchSessionStatus,
  DesignBrief,
  DirectionBoard,
  NegativeSignal,
  ReferenceSelection,
  SearchKeyword,
  SearchQuery,
} from './contracts.ts';
import {
  assertCreativeResearchSession,
  assertDesignBrief,
  assertDesignBriefRevision,
  assertNegativeSignal,
  assertReferenceSelection,
} from './evidence.ts';
import { assertCreativeDirectionContextBoundary } from './direction-context.ts';

export interface CreativeResearchTransitionEvidence {
  activeDesignBrief?: DesignBrief;
  searchKeywords?: SearchKeyword[];
  selections?: ReferenceSelection[];
  directionBoard?: DirectionBoard;
  directionContext?: CreativeDirectionContext;
  reanalysis?: {
    previousBrief: DesignBrief;
    nextBrief: DesignBrief;
    previousSearchQueries: SearchQuery[];
    nextSearchQueries: SearchQuery[];
    previousSelections: ReferenceSelection[];
    nextSelections: ReferenceSelection[];
    previousNegativeSignals: NegativeSignal[];
    nextNegativeSignals: NegativeSignal[];
  };
}

function assertPreserved(previous: string[], next: string[], label: string): void {
  const nextIds = new Set(next);
  const lost = previous.filter((id) => !nextIds.has(id));
  if (lost.length) throw new Error(`reanalysis must preserve ${label}: ${lost.join(', ')}`);
}

function assertDirectionCompletion(
  session: CreativeResearchSession,
  board: DirectionBoard | undefined,
  context: CreativeDirectionContext | undefined,
): void {
  if (!board) throw new Error('DIRECTION -> COMPLETED requires DirectionBoard');
  if (!context) throw new Error('DIRECTION -> COMPLETED requires CreativeDirectionContext');
  if (board.sessionId !== session.id || context.sessionId !== session.id) {
    throw new Error('completion artifacts must preserve session identity');
  }
  if (context.projectId !== session.projectId) throw new Error('completion context must preserve project identity');
  if (context.provenance.designBriefId !== session.activeDesignBriefId) {
    throw new Error('completion context must use the active DesignBrief');
  }
  if (session.activeDirectionBoardId !== board.id) throw new Error('completion requires the active DirectionBoard');
  if (context.directionBoardRevision !== board.revision || context.provenance.directionBoardId !== board.id) {
    throw new Error('completion context must match DirectionBoard revision');
  }
  assertCreativeDirectionContextBoundary(context);
}

export function assertCreativeResearchTransition(
  session: CreativeResearchSession,
  targetStatus: CreativeResearchSessionStatus,
  evidence: CreativeResearchTransitionEvidence = {},
): void {
  assertCreativeResearchSession(session);
  if (session.status === targetStatus) throw new Error('session transition must change status');

  if (session.status === 'INTAKE' && targetStatus === 'RESEARCH') {
    const brief = evidence.activeDesignBrief;
    if (!brief || !session.activeDesignBriefId || brief.id !== session.activeDesignBriefId) {
      throw new Error('INTAKE -> RESEARCH requires an active DesignBrief');
    }
    assertDesignBrief(brief);
    if (brief.sessionId !== session.id) throw new Error('active DesignBrief must belong to session');
    const keywords = evidence.searchKeywords ?? brief.searchKeywords;
    if (!keywords.some((keyword) => keyword.enabled && keyword.briefId === brief.id)) {
      throw new Error('INTAKE -> RESEARCH requires an enabled search keyword');
    }
    return;
  }

  if (session.status === 'RESEARCH' && targetStatus === 'DIRECTION') {
    const selections = evidence.selections ?? [];
    for (const selection of selections) assertReferenceSelection(selection);
    if (!selections.some((selection) => selection.sessionId === session.id && selection.state === 'SELECTED' && selection.actor === 'DESIGNER')) {
      throw new Error('RESEARCH -> DIRECTION requires a designer-selected reference');
    }
    return;
  }

  if (session.status === 'DIRECTION' && targetStatus === 'RESEARCH') return;

  if (session.status === 'RESEARCH' && targetStatus === 'INTAKE') {
    const reanalysis = evidence.reanalysis;
    if (!reanalysis) throw new Error('RESEARCH -> INTAKE requires reanalysis evidence');
    assertDesignBriefRevision(reanalysis.previousBrief, reanalysis.nextBrief);
    if (reanalysis.previousBrief.sessionId !== session.id) throw new Error('reanalysis brief must belong to session');
    for (const signal of reanalysis.previousNegativeSignals) assertNegativeSignal(signal);
    for (const signal of reanalysis.nextNegativeSignals) assertNegativeSignal(signal);
    assertPreserved(
      reanalysis.previousSearchQueries.map((query) => query.id),
      reanalysis.nextSearchQueries.map((query) => query.id),
      'search history',
    );
    assertPreserved(
      reanalysis.previousSelections.map((selection) => `${selection.referenceId}:${selection.state}`),
      reanalysis.nextSelections.map((selection) => `${selection.referenceId}:${selection.state}`),
      'selection and rejection history',
    );
    assertPreserved(
      reanalysis.previousNegativeSignals.map((signal) => signal.id),
      reanalysis.nextNegativeSignals.map((signal) => signal.id),
      'negative evidence history',
    );
    return;
  }

  if (session.status === 'DIRECTION' && targetStatus === 'COMPLETED') {
    assertDirectionCompletion(session, evidence.directionBoard, evidence.directionContext);
    return;
  }

  throw new Error(`transition ${session.status} -> ${targetStatus} is not allowed`);
}
