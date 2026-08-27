import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertCreativeResearchTransition,
  compileCreativeDirectionContext,
  type CreativeResearchSession,
  type DesignBrief,
  type DirectionBoard,
  type NegativeSignal,
  type ReferenceSelection,
  type SearchQuery,
} from '@masterpiece/runtime-core/application/creative-research/index.ts';

const NOW = '2026-08-27T09:00:00.000Z';

function session(status: CreativeResearchSession['status']): CreativeResearchSession {
  return {
    id: 'session-1', projectId: 'project-1', status, sourceDocumentIds: ['document-1'],
    activeDesignBriefId: 'brief-1', activeDirectionBoardId: 'board-1', createdAt: NOW, updatedAt: NOW,
    ...(status === 'COMPLETED' ? { completedAt: NOW } : {}),
  };
}

function brief(revision = 1, id = `brief-${revision}`): DesignBrief {
  return {
    id, sessionId: 'session-1', revision, projectSummary: '项目摘要', designTask: '设计任务', audience: '目标人群',
    scenarios: [], coreMessages: [], constraints: [], conceptKeywords: [], visualKeywords: ['温暖'],
    searchKeywords: [{ id: `keyword-${revision}`, briefId: id, value: 'warm identity', kind: 'CONCEPT', source: 'DESIGNER', enabled: true, createdAt: NOW }],
    designerNotes: [], evidence: [{ id: `evidence-${revision}`, sourceDocumentId: 'document-1', locator: { kind: 'DOCUMENT_SECTION', value: '摘要' }, createdAt: NOW }],
    createdAt: NOW, updatedAt: NOW,
  };
}

const selected: ReferenceSelection = {
  referenceId: 'reference-1', state: 'SELECTED', selectedAttributes: ['COLOR'], actor: 'DESIGNER', createdAt: NOW, updatedAt: NOW,
};
const board: DirectionBoard = {
  id: 'board-1', sessionId: 'session-1', revision: 1, summary: '有证据支持的方向', visualKeywords: ['温暖'],
  referenceIds: ['reference-1'], referenceRegionIds: [], negativeSignalIds: [], designerNotes: [], createdAt: NOW, updatedAt: NOW,
};

test('INTAKE -> RESEARCH requires active brief and enabled keyword', () => {
  assert.doesNotThrow(() => assertCreativeResearchTransition(session('INTAKE'), 'RESEARCH', {
    activeDesignBrief: brief(), searchKeywords: brief().searchKeywords,
  }));
  assert.throws(() => assertCreativeResearchTransition(session('INTAKE'), 'RESEARCH', {
    activeDesignBrief: { ...brief(), searchKeywords: brief().searchKeywords.map((keyword) => ({ ...keyword, enabled: false })) },
    searchKeywords: brief().searchKeywords.map((keyword) => ({ ...keyword, enabled: false })),
  }), /enabled search keyword/);
  assert.throws(() => assertCreativeResearchTransition(session('INTAKE'), 'DIRECTION'), /not allowed/);
});

test('RESEARCH -> DIRECTION requires real designer selection evidence', () => {
  assert.doesNotThrow(() => assertCreativeResearchTransition(session('RESEARCH'), 'DIRECTION', { selections: [selected] }));
  assert.throws(() => assertCreativeResearchTransition(session('RESEARCH'), 'DIRECTION', { selections: [] }), /designer-selected reference/);
  assert.throws(() => assertCreativeResearchTransition(session('RESEARCH'), 'DIRECTION', {
    selections: [{ ...selected, state: 'NONE' }],
  }), /designer-selected reference/);
});

test('DIRECTION -> RESEARCH is allowed', () => {
  assert.doesNotThrow(() => assertCreativeResearchTransition(session('DIRECTION'), 'RESEARCH'));
});

test('RESEARCH -> INTAKE reanalysis increments brief and preserves history', () => {
  const query: SearchQuery = {
    id: 'query-1', sessionId: 'session-1', text: 'warm identity', kind: 'CONCEPT', batch: 'batch-1',
    status: 'PENDING', derivedFromKeywordIds: ['keyword-1'], createdAt: NOW,
  };
  const negative: NegativeSignal = {
    id: 'negative-1', sessionId: 'session-1', type: 'REJECT_REFERENCE', sourceReferenceId: 'reference-2',
    scope: 'REFERENCE', actor: 'DESIGNER', createdAt: NOW,
  };
  const evidence = {
    previousBrief: brief(), nextBrief: brief(2),
    previousSearchQueries: [query], nextSearchQueries: [query],
    previousSelections: [{ ...selected, state: 'REJECTED' as const }], nextSelections: [{ ...selected, state: 'REJECTED' as const }],
    previousNegativeSignals: [negative], nextNegativeSignals: [negative],
  };
  assert.doesNotThrow(() => assertCreativeResearchTransition(session('RESEARCH'), 'INTAKE', { reanalysis: evidence }));
  assert.throws(() => assertCreativeResearchTransition(session('RESEARCH'), 'INTAKE', {
    reanalysis: { ...evidence, nextSearchQueries: [] },
  }), /preserve search history/);
  assert.throws(() => assertCreativeResearchTransition(session('RESEARCH'), 'INTAKE', {
    reanalysis: { ...evidence, nextSelections: [{ ...selected, state: 'SELECTED' }] },
  }), /preserve selection and rejection history/);
  assert.throws(() => assertCreativeResearchTransition(session('RESEARCH'), 'INTAKE', {
    reanalysis: { ...evidence, nextNegativeSignals: [] },
  }), /preserve negative evidence history/);
});

test('DIRECTION -> COMPLETED requires matching board and deterministic context', () => {
  const directionSession = session('DIRECTION');
  const context = compileCreativeDirectionContext({
    session: directionSession, brief: brief(), directionBoard: board, selections: [selected], regions: [], negativeSignals: [], createdAt: NOW,
  });
  assert.doesNotThrow(() => assertCreativeResearchTransition(directionSession, 'COMPLETED', {
    directionBoard: board, directionContext: context,
  }));
  assert.throws(() => assertCreativeResearchTransition(directionSession, 'COMPLETED', { directionBoard: board }), /requires CreativeDirectionContext/);
  assert.throws(() => assertCreativeResearchTransition(session('COMPLETED'), 'INTAKE'), /not allowed/);
});
