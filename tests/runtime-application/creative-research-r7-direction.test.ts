import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { DesignBrief, PreferenceInsight, WebReferenceItem } from '@masterpiece/runtime-core/application/creative-research/contracts.ts';
import { createCreativeResearchStore } from '@masterpiece/runtime-core/application/creative-research-store.ts';
import { createCreativeResearchResearchStore } from '@masterpiece/runtime-core/application/creative-research-research-store.ts';
import { createCreativeResearchPreferenceStore } from '@masterpiece/runtime-core/application/creative-research-preference-store.ts';
import { createCreativeResearchDirectionBoardStore } from '@masterpiece/runtime-core/application/creative-research-direction-board-store.ts';
import { createCreativeDirectionContextStore } from '@masterpiece/runtime-core/application/creative-research-direction-context-store.ts';
import { createCreativeResearchDirectionBoardService } from '@masterpiece/runtime-core/application/creative-research-direction-board-service.ts';
import { createCreativeResearchDirectionService } from '@masterpiece/runtime-core/application/creative-research-direction-service.ts';
import { createCreativeResearchSelectionService } from '@masterpiece/runtime-core/application/creative-research-selection-service.ts';
import { createCreativeResearchPreferenceAnalysisService } from '@masterpiece/runtime-core/application/creative-research-preference-analysis-service.ts';
import { createCreativeResearchReferenceSearchService } from '@masterpiece/runtime-core/application/creative-research-reference-search-service.ts';
import { createCreativeResearchOperations } from '@masterpiece/runtime-core/operations/creative-research-operations.ts';

const NOW = '2026-08-27T16:00:00.000Z';
const LATER = '2026-08-27T16:05:00.000Z';
const BEFORE = '2026-08-27T15:55:00.000Z';

function ids(prefix: string) { let index = 0; return () => `${prefix}-${++index}`; }

function brief(overrides: Partial<DesignBrief> = {}): DesignBrief {
  return {
    id: 'brief-1', sessionId: 'session-1', revision: 1,
    projectSummary: '公共文化项目', designTask: '建立视觉身份', audience: '城市公众',
    scenarios: ['展览'], coreMessages: ['开放'], constraints: ['保持易读'],
    conceptKeywords: ['公共性'], visualKeywords: ['克制', '纸张质感'],
    searchKeywords: [], designerNotes: ['整体气质要克制'], evidence: [],
    createdAt: NOW, updatedAt: NOW,
    ...overrides,
  };
}

function reference(id: string, sessionId = 'session-1', resourceType: 'IMAGE' | 'WEB' = 'IMAGE'): WebReferenceItem {
  return {
    id, sessionId, sourceType: 'WEB_REFERENCE', resourceType, title: `Reference ${id}`, tags: [],
    sourceUrl: `https://example.com/${id}`, canonicalUrl: `https://example.com/${id}`,
    ...(resourceType === 'IMAGE' ? { remoteImageUrl: `https://images.example.com/${id}.jpg` } : {}),
    provider: 'baidu-search', publisherOrDomain: 'example.com', queryId: 'query-1', resultRank: 1,
    retrievedAt: NOW, createdAt: NOW,
  };
}

function insight(input: Partial<PreferenceInsight> & Pick<PreferenceInsight, 'id' | 'category' | 'summary' | 'status'>): PreferenceInsight {
  return {
    sessionId: 'session-1', supportingReferenceIds: ['selected-1'], supportingRegionIds: [],
    supportingNegativeSignalIds: [], createdAt: NOW,
    ...input,
  };
}

function createStack(root: string) {
  const base = createCreativeResearchStore({ readDefaultDataPath: () => root });
  const research = createCreativeResearchResearchStore({ readDefaultDataPath: () => root });
  const insights = createCreativeResearchPreferenceStore({ readDefaultDataPath: () => root });
  const boards = createCreativeResearchDirectionBoardStore({ readDefaultDataPath: () => root });
  const contexts = createCreativeDirectionContextStore({ readDefaultDataPath: () => root });
  const boardService = createCreativeResearchDirectionBoardService({
    references: research.references, insights, boards, now: () => NOW, createId: ids('edit'),
  });
  const direction = createCreativeResearchDirectionService({
    sessions: base.sessions, briefs: base.briefs, references: research.references, insights,
    boards, contexts, boardService, now: () => NOW, createId: ids('board'),
  });
  return { base, research, insights, boards, contexts, boardService, direction };
}

async function seedSession(stack: ReturnType<typeof createStack>, options: {
  sessionId?: string;
  status?: 'INTAKE' | 'RESEARCH' | 'COMPLETED';
  sourceDocumentIds?: string[];
} = {}) {
  const sessionId = options.sessionId || 'session-1';
  const status = options.status || 'RESEARCH';
  await stack.base.sessions.create({
    id: sessionId, projectId: 'project-1', status,
    sourceDocumentIds: options.sourceDocumentIds || ['document-1'],
    activeDesignBriefId: `brief-${sessionId}`,
    createdAt: NOW, updatedAt: NOW,
    ...(status === 'COMPLETED' ? { completedAt: NOW } : {}),
  });
  await stack.base.briefs.saveRevision(brief({ id: `brief-${sessionId}`, sessionId }));
  return sessionId;
}

test('R7 direction entry requires RESEARCH with a designer-selected reference and rejects INTAKE/COMPLETED', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cr-r7-entry-'));
  try {
    const stack = createStack(root);
    await seedSession(stack);
    await stack.research.references.storeReference(reference('selected-1'));
    await assert.rejects(stack.direction.startDirection('ghost'), (error: any) => error.code === 'CREATIVE_RESEARCH_DIRECTION_SESSION_NOT_FOUND');
    // RESEARCH but zero DESIGNER-selected selections -> R1 invariant rejects.
    await assert.rejects(stack.direction.startDirection('session-1'), /designer-selected reference/u);
    await seedSession(stack, { sessionId: 'session-intake', status: 'INTAKE' });
    await assert.rejects(stack.direction.startDirection('session-intake'), (error: any) => error.code === 'CREATIVE_RESEARCH_DIRECTION_INVALID_STATE');
    await seedSession(stack, { sessionId: 'session-done', status: 'COMPLETED' });
    await assert.rejects(stack.direction.startDirection('session-done'), (error: any) => error.code === 'CREATIVE_RESEARCH_DIRECTION_INVALID_STATE');
  } finally {
    await fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});

test('R7 direction entry activates DIRECTION with the saved board id and resumes idempotently', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cr-r7-resume-'));
  try {
    const stack = createStack(root);
    await seedSession(stack);
    await stack.research.references.storeReference(reference('selected-1'));
    const selection = createCreativeResearchSelectionService({
      references: stack.research.references, sessions: stack.base.sessions, now: () => NOW, createId: ids('negative'),
    });
    await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'selected-1', state: 'SELECTED', selectedAttributes: ['LAYOUT'] });

    const started = await stack.direction.startDirection('session-1');
    assert.equal(started.session.status, 'DIRECTION');
    assert.equal(started.session.activeDirectionBoardId, started.board.id);
    assert.equal(started.board.revision, 1);
    assert.deepEqual(started.availableReferenceIds, []);
    assert.deepEqual(started.pendingFinalizedInsights, []);
    assert.equal((await stack.base.sessions.get('session-1'))?.activeDirectionBoardId, started.board.id);
    assert.equal((await stack.boards.getCurrent('session-1'))?.id, started.board.id);

    // Already DIRECTION -> idempotent resume: same board, no new revision.
    const resumed = await stack.direction.startDirection('session-1');
    assert.deepEqual(resumed.board, started.board);
    assert.equal(resumed.session.activeDirectionBoardId, started.board.id);
    assert.equal((await stack.direction.listDirectionBoardRevisions('session-1')).length, 1);
  } finally {
    await fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});

test('R7 initial board keeps only current evidence: selected refs, active rejections, FINALIZED insights with designer override', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cr-r7-initial-'));
  try {
    const stack = createStack(root);
    await seedSession(stack);
    for (const item of ['selected-1', 'selected-2', 'rejected-1', 'flip-1', 'unselected-1']) {
      await stack.research.references.storeReference(reference(item));
    }
    const selection = createCreativeResearchSelectionService({
      references: stack.research.references, sessions: stack.base.sessions, now: () => NOW, createId: ids('negative'),
    });
    await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'rejected-1', state: 'REJECTED', selectedAttributes: [], rejectionReason: '太商业' });
    const stale = await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'flip-1', state: 'REJECTED', selectedAttributes: [], rejectionReason: '曾经拒绝' });
    await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'flip-1', state: 'SELECTED', selectedAttributes: ['COLOR'], designerNote: '回归的参考' });
    await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'selected-1', state: 'SELECTED', selectedAttributes: ['TYPOGRAPHY', 'LAYOUT'], designerNote: '喜欢编号系统' });
    await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'selected-2', state: 'SELECTED', selectedAttributes: ['MATERIAL'] });
    await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'unselected-1', state: 'NONE', selectedAttributes: [] });
    assert.equal(stale.negativeSignal?.id, 'negative-2');

    await stack.insights.saveInsight(insight({ id: 'insight-fin-1', category: 'TYPOGRAPHY', summary: 'AI 字体摘要', status: 'FINALIZED', designerOverride: '设计师：只要人文无衬线' }));
    await stack.insights.saveInsight(insight({ id: 'insight-fin-2', category: 'LAYOUT', summary: '偏好网格系统', status: 'FINALIZED', supportingReferenceIds: ['selected-2'] }));
    await stack.insights.saveInsight(insight({ id: 'insight-draft-1', category: 'COLOR', summary: '草稿：浓郁撞色', status: 'DRAFT' }));

    const { board } = await stack.direction.startDirection('session-1');
    // referenceIds: current DESIGNER SELECTED only — NONE/REJECTED excluded.
    assert.deepEqual(board.referenceIds, ['flip-1', 'selected-1', 'selected-2']);
    // negativeSignalIds: active rejection kept, stale (REJECTED -> SELECTED) signal excluded.
    assert.deepEqual(board.negativeSignalIds, ['negative-1']);
    // FINALIZED insights prefill mapped sections; designerOverride wins over summary.
    assert.equal(board.typography, '设计师：只要人文无衬线');
    assert.equal(board.layout, '偏好网格系统');
    // DRAFT insight is not auto-applied anywhere.
    assert.equal(board.color, undefined);
    assert.equal(board.summary, '设计师：只要人文无衬线；偏好网格系统');
    assert.doesNotMatch(JSON.stringify(board), /草稿/u);
    assert.deepEqual(board.visualKeywords, ['克制', '纸张质感']);
    assert.deepEqual(board.designerNotes, ['整体气质要克制', '回归的参考', '喜欢编号系统']);
  } finally {
    await fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});

test('R7 initial board summary falls back to brief visualKeywords plus selected attributes', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cr-r7-fallback-'));
  try {
    const stack = createStack(root);
    await seedSession(stack);
    await stack.research.references.storeReference(reference('selected-1'));
    const selection = createCreativeResearchSelectionService({
      references: stack.research.references, sessions: stack.base.sessions, now: () => NOW, createId: ids('negative'),
    });
    await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'selected-1', state: 'SELECTED', selectedAttributes: ['MATERIAL', 'LAYOUT'] });
    const { board } = await stack.direction.startDirection('session-1');
    assert.equal(board.summary, '当前方向集中在：克制、纸张质感；重点参考版式、材质。');
    assert.equal(board.typography, undefined);
    assert.deepEqual(board.negativeSignalIds, []);
  } finally {
    await fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});

test('R7 board save appends a revision, preserves history across reload, and writes nothing below the board', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cr-r7-save-'));
  try {
    const stack = createStack(root);
    await seedSession(stack);
    for (const item of ['selected-1', 'selected-2']) await stack.research.references.storeReference(reference(item));
    const selection = createCreativeResearchSelectionService({
      references: stack.research.references, sessions: stack.base.sessions, now: () => NOW, createId: ids('negative'),
    });
    await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'selected-1', state: 'SELECTED', selectedAttributes: ['LAYOUT'] });
    await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'selected-2', state: 'SELECTED', selectedAttributes: ['MATERIAL'] });
    await stack.research.history.appendQuery({
      id: 'query-old', sessionId: 'session-1', text: '公共文化品牌', kind: 'CONCEPT', batch: 'batch-old',
      status: 'COMPLETED', provider: 'baidu-search', derivedFromKeywordIds: ['concept-1'], createdAt: NOW, completedAt: NOW,
    });
    const started = await stack.direction.startDirection('session-1');

    const snapshot = async () => ({
      selections: await stack.research.references.listSelections('session-1'),
      negativeSignals: await stack.research.references.listNegativeSignals('session-1'),
      queries: await stack.research.history.listSessionSearchHistory('session-1'),
      insights: await stack.insights.listInsights('session-1'),
    });
    const before = await snapshot();

    // Browser-supplied identity fields must be ignored: sessionId/revision/createdAt/projectId cannot override.
    const saved = await stack.direction.updateDirectionBoard('session-1', {
      summary: '新的方向摘要', visualKeywords: ['手改关键词'], designerNotes: ['作者注'],
      sessionId: 'session-hack', revision: 99, createdAt: '1970-01-01T00:00:00.000Z', projectId: 'project-hack',
    } as any);
    assert.equal(saved.revision, 2);
    assert.notEqual(saved.id, started.board.id);
    assert.equal(saved.sessionId, 'session-1');
    assert.equal(saved.createdAt, NOW);
    assert.equal(saved.summary, '新的方向摘要');
    assert.deepEqual(saved.referenceIds, started.board.referenceIds);
    assert.equal((saved as any).projectId, undefined);
    assert.equal((await stack.base.sessions.get('session-1'))?.activeDirectionBoardId, saved.id);

    // A second store instance on the same root proves persistence: revision history
    // grows and the previous revision file is preserved intact.
    const reloaded = createCreativeResearchDirectionBoardStore({ readDefaultDataPath: () => root });
    const history = await reloaded.listRevisionHistory('session-1');
    assert.equal(history.length, 2);
    assert.deepEqual(history[0], started.board);
    assert.deepEqual(history[1], saved);
    assert.deepEqual(await snapshot(), before);
  } finally {
    await fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});

test('R7 board save rejects unselected, nonexistent and cross-session evidence', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cr-r7-save-invalid-'));
  try {
    const stack = createStack(root);
    await seedSession(stack);
    for (const item of ['selected-1', 'flip-1']) await stack.research.references.storeReference(reference(item));
    const selection = createCreativeResearchSelectionService({
      references: stack.research.references, sessions: stack.base.sessions, now: () => NOW, createId: ids('negative'),
    });
    const stale = await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'flip-1', state: 'REJECTED', selectedAttributes: [], rejectionReason: '曾经拒绝' });
    await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'flip-1', state: 'SELECTED', selectedAttributes: ['COLOR'] });
    await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'selected-1', state: 'SELECTED', selectedAttributes: ['LAYOUT'] });

    // Cross-session evidence in session-2.
    await seedSession(stack, { sessionId: 'session-2' });
    await stack.research.references.storeReference(reference('other-ref', 'session-2'));
    await stack.research.references.storeReference(reference('other-rejected', 'session-2'));
    await selection.setReferenceSelection({ sessionId: 'session-2', referenceId: 'other-ref', state: 'SELECTED', selectedAttributes: ['COLOR'] });
    const foreign = await selection.setReferenceSelection({ sessionId: 'session-2', referenceId: 'other-rejected', state: 'REJECTED', selectedAttributes: [], rejectionReason: '跨会话' });

    await stack.direction.startDirection('session-1');
    const invalidState = (error: any) => error.code === 'CREATIVE_RESEARCH_DIRECTION_VALIDATION_FAILED';
    await assert.rejects(stack.direction.updateDirectionBoard('session-1', { referenceIds: ['unselected-1'] }), invalidState);
    await assert.rejects(stack.direction.updateDirectionBoard('session-1', { referenceIds: ['ghost-ref'] }), invalidState);
    await assert.rejects(stack.direction.updateDirectionBoard('session-1', { referenceIds: ['other-ref'] }), invalidState);
    await assert.rejects(stack.direction.updateDirectionBoard('session-1', { referenceIds: [] }), invalidState);
    // Stale REJECT_REFERENCE (source now SELECTED), cross-session and nonexistent signals.
    await assert.rejects(
      stack.direction.updateDirectionBoard('session-1', { negativeSignalIds: [stale.negativeSignal!.id] }),
      (error: any) => error.code === 'CREATIVE_RESEARCH_DIRECTION_VALIDATION_FAILED' && /未被拒绝/u.test(error.message),
    );
    await assert.rejects(
      stack.direction.updateDirectionBoard('session-1', { negativeSignalIds: [foreign.negativeSignal!.id] }),
      (error: any) => error.code === 'CREATIVE_RESEARCH_DIRECTION_VALIDATION_FAILED' && /不存在/u.test(error.message),
    );
    await assert.rejects(stack.direction.updateDirectionBoard('session-1', { negativeSignalIds: ['ghost-signal'] }), invalidState);
    // Nothing was written by the rejected attempts.
    assert.equal((await stack.direction.listDirectionBoardRevisions('session-1')).length, 1);
  } finally {
    await fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});

test('R7 return-to-research preserves all evidence and re-entry clones authored text without overwriting it', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cr-r7-reentry-'));
  try {
    const stack = createStack(root);
    await seedSession(stack);
    for (const item of ['selected-1', 'selected-2', 'rejected-1', 'new-ref']) {
      await stack.research.references.storeReference(reference(item));
    }
    const selection = createCreativeResearchSelectionService({
      references: stack.research.references, sessions: stack.base.sessions, now: () => NOW, createId: ids('negative'),
    });
    await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'selected-1', state: 'SELECTED', selectedAttributes: ['TYPOGRAPHY', 'LAYOUT'], designerNote: '喜欢编号系统' });
    await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'selected-2', state: 'SELECTED', selectedAttributes: ['MATERIAL'] });
    await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'rejected-1', state: 'REJECTED', selectedAttributes: [], rejectionReason: '太商业' });
    await stack.research.history.appendQuery({
      id: 'query-old', sessionId: 'session-1', text: '公共文化品牌', kind: 'CONCEPT', batch: 'batch-old',
      status: 'COMPLETED', provider: 'baidu-search', derivedFromKeywordIds: ['concept-1'], createdAt: NOW, completedAt: NOW,
    });

    await stack.direction.startDirection('session-1');
    const authored = await stack.direction.updateDirectionBoard('session-1', {
      summary: '作者改写的摘要', typography: '作者排印笔记', visualKeywords: ['手改关键词'], designerNotes: ['作者注'],
    });
    assert.equal(authored.revision, 2);

    const snapshot = async () => ({
      boards: await stack.direction.listDirectionBoardRevisions('session-1'),
      selections: await stack.research.references.listSelections('session-1'),
      negativeSignals: await stack.research.references.listNegativeSignals('session-1'),
      queries: await stack.research.history.listSessionSearchHistory('session-1'),
      insights: await stack.insights.listInsights('session-1'),
    });
    const before = await snapshot();
    const returned = await stack.direction.returnToResearch('session-1');
    assert.equal(returned.status, 'RESEARCH');
    // Board history, selections, insights and search history survive the round trip.
    assert.deepEqual(await snapshot(), before);

    // Research continues: one board ref is now rejected, one new ref is selected,
    // and a FINALIZED insight arrives after the previous board revision.
    await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'selected-2', state: 'REJECTED', selectedAttributes: [], rejectionReason: '后期排除' });
    await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'new-ref', state: 'SELECTED', selectedAttributes: ['COLOR'] });
    await stack.insights.saveInsight(insight({ id: 'insight-late', category: 'COLOR', summary: '晚到的倾向', status: 'FINALIZED', createdAt: LATER }));

    const reentered = await stack.direction.startDirection('session-1');
    assert.equal(reentered.session.status, 'DIRECTION');
    assert.equal(reentered.board.revision, 3);
    // Old board ref still SELECTED -> retained; now-REJECTED ref -> removed.
    assert.deepEqual(reentered.board.referenceIds, ['selected-1']);
    // Newly selected ref is not forced onto the board but offered as available.
    assert.deepEqual(reentered.availableReferenceIds, ['new-ref']);
    // Active rejections are recomputed: both rejected refs contribute signals.
    assert.deepEqual(reentered.board.negativeSignalIds, ['negative-1', 'negative-2']);
    // Authored text is cloned, never overwritten by the new insight.
    assert.equal(reentered.board.summary, '作者改写的摘要');
    assert.equal(reentered.board.typography, '作者排印笔记');
    assert.deepEqual(reentered.board.visualKeywords, ['手改关键词']);
    assert.deepEqual(reentered.board.designerNotes, ['作者注']);
    assert.deepEqual(reentered.pendingFinalizedInsights, [{ id: 'insight-late', category: 'COLOR', text: '晚到的倾向' }]);
    assert.doesNotMatch(JSON.stringify(reentered.board), /晚到的倾向/u);
    assert.equal((await stack.direction.listDirectionBoardRevisions('session-1')).length, 3);
  } finally {
    await fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});

test('R8 direction re-entry compares first-finalized time while preserving legacy createdAt fallback', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cr-r8-finalized-timing-'));
  try {
    const stack = createStack(root);
    await seedSession(stack);
    await stack.research.references.storeReference(reference('selected-1'));
    const selection = createCreativeResearchSelectionService({
      references: stack.research.references, sessions: stack.base.sessions, now: () => NOW, createId: ids('negative'),
    });
    await selection.setReferenceSelection({
      sessionId: 'session-1', referenceId: 'selected-1', state: 'SELECTED', selectedAttributes: ['LAYOUT'],
    });

    await stack.insights.saveInsight(insight({
      id: 'insight-before', category: 'LAYOUT', summary: 'Board 前确认', status: 'DRAFT', createdAt: BEFORE,
    }));
    await stack.insights.saveInsight(insight({
      id: 'insight-after', category: 'COLOR', summary: '旧草稿在 Board 后确认', status: 'DRAFT', createdAt: BEFORE,
    }));
    await stack.insights.saveInsight(insight({
      id: 'insight-legacy', category: 'MATERIAL', summary: '旧版已确认倾向', status: 'FINALIZED', createdAt: BEFORE,
    }));

    let clock = BEFORE;
    const preferences = createCreativeResearchPreferenceAnalysisService({
      briefs: stack.base.briefs,
      references: stack.research.references,
      insights: stack.insights,
      sessions: stack.base.sessions,
      adapter: { async analyzePreferences() { throw new Error('not used'); } },
      now: () => clock,
    });
    const finalizedBefore = await preferences.finalizeInsight('session-1', 'insight-before');
    assert.equal(finalizedBefore.finalizedAt, BEFORE);

    await stack.direction.startDirection('session-1');
    await stack.direction.returnToResearch('session-1');
    clock = LATER;
    const finalizedAfter = await preferences.finalizeInsight('session-1', 'insight-after');
    assert.equal(finalizedAfter.finalizedAt, LATER);

    const reentered = await stack.direction.startDirection('session-1');
    assert.deepEqual(reentered.pendingFinalizedInsights, [
      { id: 'insight-after', category: 'COLOR', text: '旧草稿在 Board 后确认' },
    ]);
  } finally {
    await fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});

test('R8 failed Direction Board atomic write preserves the current revision and active board id', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cr-r8-board-write-failure-'));
  try {
    const stack = createStack(root);
    await seedSession(stack);
    await stack.research.references.storeReference(reference('selected-1'));
    const selection = createCreativeResearchSelectionService({
      references: stack.research.references, sessions: stack.base.sessions, now: () => NOW, createId: ids('negative'),
    });
    await selection.setReferenceSelection({
      sessionId: 'session-1', referenceId: 'selected-1', state: 'SELECTED', selectedAttributes: ['LAYOUT'],
    });
    const started = await stack.direction.startDirection('session-1');

    const failingBoards = createCreativeResearchDirectionBoardStore({
      readDefaultDataPath: () => root,
      writeJson: async (targetPath) => ({
        success: false, targetPath, attempts: 1, errorCode: 'EACCES', errorMessage: 'simulated atomic rename failure',
      }),
    });
    const failingBoardService = createCreativeResearchDirectionBoardService({
      references: stack.research.references, insights: stack.insights, boards: failingBoards,
      now: () => LATER, createId: ids('failed-edit'),
    });
    const failingDirection = createCreativeResearchDirectionService({
      sessions: stack.base.sessions, briefs: stack.base.briefs, references: stack.research.references,
      insights: stack.insights, boards: failingBoards, contexts: stack.contexts,
      boardService: failingBoardService, now: () => LATER, createId: ids('failed-board'),
    });

    await assert.rejects(
      failingDirection.updateDirectionBoard('session-1', { summary: '不应成为 current 的 revision' }),
      (error: any) => error.code === 'CREATIVE_RESEARCH_DIRECTION_STORE_FAILED',
    );
    assert.deepEqual(await stack.boards.getCurrent('session-1'), started.board);
    assert.deepEqual(await stack.boards.listRevisionHistory('session-1'), [started.board]);
    assert.equal((await stack.base.sessions.get('session-1'))?.activeDirectionBoardId, started.board.id);
  } finally {
    await fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});

test('R8 Context failure keeps DIRECTION recoverable and completion retry reuses persisted Context', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cr-r8-context-recovery-'));
  try {
    const stack = createStack(root);
    await seedSession(stack);
    await stack.research.references.storeReference(reference('selected-1'));
    const selection = createCreativeResearchSelectionService({
      references: stack.research.references, sessions: stack.base.sessions, now: () => NOW, createId: ids('negative'),
    });
    await selection.setReferenceSelection({
      sessionId: 'session-1', referenceId: 'selected-1', state: 'SELECTED', selectedAttributes: ['LAYOUT'],
    });
    await stack.direction.startDirection('session-1');

    const failingContexts = createCreativeDirectionContextStore({
      readDefaultDataPath: () => root,
      writeJson: async (targetPath) => ({
        success: false, targetPath, attempts: 1, errorCode: 'EACCES', errorMessage: 'simulated context write failure',
      }),
    });
    const contextWriteFailure = createCreativeResearchDirectionService({
      sessions: stack.base.sessions, briefs: stack.base.briefs, references: stack.research.references,
      insights: stack.insights, boards: stack.boards, contexts: failingContexts,
      boardService: stack.boardService, now: () => NOW, createId: ids('unused'),
    });
    await assert.rejects(
      contextWriteFailure.completeDirection('session-1', { confirm: true }),
      (error: any) => error.code === 'CREATIVE_RESEARCH_DIRECTION_STORE_FAILED',
    );
    assert.equal((await stack.base.sessions.get('session-1'))?.status, 'DIRECTION');
    assert.equal(await stack.contexts.getCurrent('session-1'), null);

    let failCompletionSave = true;
    let clock = NOW;
    const retrySessions = {
      ...stack.base.sessions,
      async save(session: any) {
        if (session.status === 'COMPLETED' && failCompletionSave) {
          failCompletionSave = false;
          throw new Error('simulated Session completion write failure');
        }
        return stack.base.sessions.save(session);
      },
    };
    const retryDirection = createCreativeResearchDirectionService({
      sessions: retrySessions, briefs: stack.base.briefs, references: stack.research.references,
      insights: stack.insights, boards: stack.boards, contexts: stack.contexts,
      boardService: stack.boardService, now: () => clock, createId: ids('unused'),
    });
    await assert.rejects(
      retryDirection.completeDirection('session-1', { confirm: true }),
      /simulated Session completion write failure/u,
    );
    const persistedBeforeRetry = await stack.contexts.getCurrent('session-1');
    assert.equal(persistedBeforeRetry?.createdAt, NOW);
    assert.equal((await stack.base.sessions.get('session-1'))?.status, 'DIRECTION');

    clock = LATER;
    const completed = await retryDirection.completeDirection('session-1', { confirm: true });
    assert.deepEqual(completed.context, persistedBeforeRetry);
    assert.equal(completed.context.createdAt, NOW);
    assert.equal(completed.session.status, 'COMPLETED');
    assert.equal(completed.session.completedAt, LATER);
  } finally {
    await fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});

test('R7 completeDirection compiles an exact, persisted, immutable context and freezes the session', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cr-r7-complete-'));
  try {
    const stack = createStack(root);
    await seedSession(stack);
    for (const item of ['selected-1', 'selected-2', 'rejected-1', 'rejected-2']) {
      await stack.research.references.storeReference(reference(item));
    }
    const selection = createCreativeResearchSelectionService({
      references: stack.research.references, sessions: stack.base.sessions, now: () => NOW, createId: ids('negative'),
    });
    await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'selected-1', state: 'SELECTED', selectedAttributes: ['TYPOGRAPHY', 'LAYOUT'], designerNote: '喜欢编号系统' });
    await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'selected-2', state: 'SELECTED', selectedAttributes: ['MATERIAL'] });
    await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'rejected-1', state: 'REJECTED', selectedAttributes: [], rejectionReason: '太商业' });
    await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'rejected-2', state: 'REJECTED', selectedAttributes: [], rejectionReason: '太花哨' });

    // Explicit confirmation is required.
    await assert.rejects(stack.direction.completeDirection('session-1', { confirm: false }), (error: any) => error.code === 'CREATIVE_RESEARCH_DIRECTION_CONFIRMATION_REQUIRED');
    // Only DIRECTION can complete.
    await assert.rejects(stack.direction.completeDirection('session-1', { confirm: true }), (error: any) => error.code === 'CREATIVE_RESEARCH_DIRECTION_INVALID_STATE');

    await stack.direction.startDirection('session-1');
    // Board narrows to one reference and one signal although more evidence is active.
    const narrowed = await stack.direction.updateDirectionBoard('session-1', { referenceIds: ['selected-1'], negativeSignalIds: ['negative-1'] });

    const { session, context } = await stack.direction.completeDirection('session-1', { confirm: true });
    assert.equal(session.status, 'COMPLETED');
    assert.equal(session.completedAt, NOW);
    assert.equal(context.briefRevision, 1);
    assert.equal(context.directionBoardRevision, narrowed.revision);
    assert.equal(context.projectBrief, '公共文化项目\n\n建立视觉身份');
    assert.deepEqual(context.constraints, ['保持易读']);
    assert.deepEqual(context.visualKeywords, ['克制', '纸张质感']);
    // selectedReferenceIds come from the board only, even though selected-2 is still SELECTED.
    assert.deepEqual(context.selectedReferenceIds, ['selected-1']);
    assert.deepEqual(context.selectedReferenceRegionIds, []);
    // negativeSignals come from the board only, even though negative-2 is still active.
    assert.deepEqual(context.negativeSignals, [{ id: 'negative-1', type: 'REJECT_REFERENCE', scope: 'REFERENCE', reason: '太商业' }]);
    // preferredAttributes are deterministic: REFERENCE_ATTRIBUTES order over board refs.
    assert.deepEqual(context.preferredAttributes, ['TYPOGRAPHY', 'LAYOUT']);
    assert.deepEqual(context.designerNotes, ['整体气质要克制', '喜欢编号系统']);
    assert.equal(context.directionSummary, narrowed.summary);
    assert.deepEqual(context.provenance, {
      designBriefId: 'brief-session-1',
      directionBoardId: narrowed.id,
      sourceDocumentIds: ['document-1'],
      referenceIds: ['selected-1'],
      referenceRegionIds: [],
      negativeSignalIds: ['negative-1'],
    });
    assert.equal(context.createdAt, NOW);

    // The context is persisted before/with completion and readable afterwards.
    assert.deepEqual(await stack.contexts.getCurrent('session-1'), context);
    const reloadedContexts = createCreativeDirectionContextStore({ readDefaultDataPath: () => root });
    assert.deepEqual(await reloadedContexts.getCurrent('session-1'), context);
    const lookedUp = await stack.direction.getDirectionContext('session-1');
    assert.equal(lookedUp.session.status, 'COMPLETED');
    assert.deepEqual(lookedUp.context, context);

    // The compiled JSON carries no packaging/space/prompt/visualGrammar keys at any depth.
    const persisted = JSON.parse(await fs.readFile(path.join(root, 'creative-research', 'session-1', 'direction', 'context', 'current.json'), 'utf8'));
    const collectKeys = (value: unknown, keys: string[] = []): string[] => {
      if (!value || typeof value !== 'object') return keys;
      if (Array.isArray(value)) { value.forEach((item) => collectKeys(item, keys)); return keys; }
      for (const [key, item] of Object.entries(value)) { keys.push(key); collectKeys(item, keys); }
      return keys;
    };
    assert.equal(collectKeys(persisted).some((key) => /packaging|space|prompt|visualGrammar/iu.test(key)), false);

    // Idempotent retry at the store level: same content returns as-is, any change is rejected.
    assert.deepEqual(await stack.contexts.save(context), context);
    await assert.rejects(stack.contexts.save({ ...context, directionSummary: '篡改' }), (error: any) => error.code === 'CREATIVE_RESEARCH_DIRECTION_CONTEXT_IMMUTABLE');

    // Read-only after completion.
    await assert.rejects(stack.direction.completeDirection('session-1', { confirm: true }), (error: any) => error.code === 'CREATIVE_RESEARCH_DIRECTION_INVALID_STATE');
    await assert.rejects(stack.direction.updateDirectionBoard('session-1', { summary: '太晚了' }), (error: any) => error.code === 'CREATIVE_RESEARCH_DIRECTION_INVALID_STATE');
    await assert.rejects(stack.direction.returnToResearch('session-1'), (error: any) => error.code === 'CREATIVE_RESEARCH_DIRECTION_INVALID_STATE');
    await assert.rejects(stack.direction.startDirection('session-1'), (error: any) => error.code === 'CREATIVE_RESEARCH_DIRECTION_INVALID_STATE');
  } finally {
    await fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});

test('R7 COMPLETED session is read-only for selections, preference insights and new searches', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cr-r7-readonly-'));
  try {
    const stack = createStack(root);
    await seedSession(stack);
    for (const item of ['selected-1', 'selected-2']) await stack.research.references.storeReference(reference(item));
    const selection = createCreativeResearchSelectionService({
      references: stack.research.references, sessions: stack.base.sessions, now: () => NOW, createId: ids('negative'),
    });
    await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'selected-1', state: 'SELECTED', selectedAttributes: ['LAYOUT'] });
    await stack.insights.saveInsight(insight({ id: 'insight-1', category: 'LAYOUT', summary: '偏好网格', status: 'DRAFT' }));
    await stack.direction.startDirection('session-1');
    await stack.direction.completeDirection('session-1', { confirm: true });

    // Selection changes are rejected on a COMPLETED session.
    await assert.rejects(
      selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'selected-2', state: 'SELECTED', selectedAttributes: ['COLOR'] }),
      (error: any) => error.code === 'CREATIVE_RESEARCH_SELECTION_SESSION_COMPLETED',
    );
    // Preference analysis and insight mutations are rejected; the model adapter is never touched.
    let adapterCalls = 0;
    const preferences = createCreativeResearchPreferenceAnalysisService({
      briefs: stack.base.briefs, references: stack.research.references, insights: stack.insights,
      sessions: stack.base.sessions,
      adapter: { async analyzePreferences() { adapterCalls += 1; return []; } },
      now: () => NOW, createId: ids('analysis'),
    });
    await assert.rejects(preferences.analyzeSelection('session-1', 'profile-analysis'), (error: any) => error.code === 'CREATIVE_RESEARCH_PREFERENCE_SESSION_COMPLETED');
    await assert.rejects(preferences.updateInsight('session-1', 'insight-1', '改'), (error: any) => error.code === 'CREATIVE_RESEARCH_PREFERENCE_SESSION_COMPLETED');
    await assert.rejects(preferences.finalizeInsight('session-1', 'insight-1'), (error: any) => error.code === 'CREATIVE_RESEARCH_PREFERENCE_SESSION_COMPLETED');
    assert.equal(adapterCalls, 0);
    // New searches stay rejected by the existing RESEARCH-only guard.
    const search = createCreativeResearchReferenceSearchService({
      ...stack.base, ...stack.research,
      gateway: { async search() { throw new Error('must not be called'); } },
      now: () => NOW, createId: ids('query'),
    });
    await assert.rejects(search.planInitialSearch('session-1'), (error: any) => error.code === 'CREATIVE_RESEARCH_SESSION_CONFLICT');
    await stack.research.history.appendQuery({
      id: 'query-pending', sessionId: 'session-1', text: '公共文化品牌', kind: 'CONCEPT', batch: 'batch-new',
      status: 'PENDING', derivedFromKeywordIds: ['concept-1'], createdAt: NOW,
    });
    await assert.rejects(search.executeSearchQuery('session-1', 'query-pending'), (error: any) => error.code === 'CREATIVE_RESEARCH_SESSION_CONFLICT');

    // Non-COMPLETED sessions keep R1–R6 behavior with the sessions repository wired in.
    await seedSession(stack, { sessionId: 'session-2' });
    await stack.research.references.storeReference(reference('other-ref', 'session-2'));
    const changed = await selection.setReferenceSelection({ sessionId: 'session-2', referenceId: 'other-ref', state: 'SELECTED', selectedAttributes: ['COLOR'] });
    assert.equal(changed.selection.state, 'SELECTED');
  } finally {
    await fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});

test('R7 operations layer keeps browser DTOs safe and ignores hostile board-update identity fields', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cr-r7-operations-'));
  try {
    const stack = createStack(root);
    const absoluteSource = path.join(root, 'documents-intake', '品牌策略.pdf');
    await seedSession(stack, { sourceDocumentIds: [absoluteSource] });
    for (const item of ['selected-1', 'rejected-1']) await stack.research.references.storeReference(reference(item));
    const selection = createCreativeResearchSelectionService({
      references: stack.research.references, sessions: stack.base.sessions, now: () => NOW, createId: ids('negative'),
    });
    await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'selected-1', state: 'SELECTED', selectedAttributes: ['LAYOUT'] });
    await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'rejected-1', state: 'REJECTED', selectedAttributes: [], rejectionReason: '太商业' });

    const unused = {} as any;
    const operations = createCreativeResearchOperations({
      briefs: unused, search: unused, history: unused, selection: unused, preferences: unused,
      direction: stack.direction, refinement: unused, strategy: unused, reanalysis: unused,
      listSessions: async () => [],
      credential: { has: async () => false, save: async () => undefined, remove: async () => undefined },
    });

    const started = await operations['creative-research:start-direction']({}, 'session-1');
    assert.deepEqual(Object.keys(started).sort(), ['availableReferenceIds', 'board', 'pendingFinalizedInsights', 'session']);
    assert.equal(started.session.status, 'DIRECTION');
    assert.deepEqual(Object.keys(started.board).sort(), [
      'createdAt', 'designerNotes', 'id', 'negativeSignalIds', 'referenceIds', 'referenceRegionIds',
      'revision', 'sessionId', 'summary', 'updatedAt', 'visualKeywords',
    ]);

    const updated = await operations['creative-research:update-direction-board']({}, 'session-1', {
      summary: '定稿摘要', sessionId: 'session-hack', revision: 99, createdAt: '1970-01-01T00:00:00.000Z', id: 'board-hack',
    } as any);
    assert.equal(updated.revision, 2);
    assert.equal(updated.sessionId, 'session-1');
    assert.equal(updated.createdAt, NOW);
    assert.notEqual(updated.id, 'board-hack');
    assert.equal(updated.summary, '定稿摘要');

    const completed = await operations['creative-research:complete-direction']({}, 'session-1', { confirm: true });
    assert.equal(completed.session.status, 'COMPLETED');
    // The DTO exposes only document count and basename labels — never absolute paths.
    assert.deepEqual(completed.context.provenance.sourceDocumentCount, 1);
    assert.deepEqual(completed.context.provenance.sourceDocumentLabels, ['品牌策略.pdf']);
    assert.equal('sourceDocumentIds' in completed.context.provenance, false);
    const serialized = JSON.stringify(completed);
    assert.equal(serialized.includes(root), false);
    assert.equal(serialized.includes(root.replace(/\\/gu, '/')), false);
    assert.equal(serialized.includes('documents-intake'), false);
    assert.equal(serialized.includes(absoluteSource), false);

    const fetched = await operations['creative-research:get-direction-context']({}, 'session-1');
    assert.deepEqual(fetched.context, completed.context);
    const revisions = await operations['creative-research:list-direction-board-revisions']({}, 'session-1');
    assert.equal(revisions.length, 2);
  } finally {
    await fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});

test('R7 full direction flow makes zero provider calls and zero downstream writes', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cr-r7-offline-'));
  try {
    const stack = createStack(root);
    await seedSession(stack);
    for (const item of ['selected-1', 'rejected-1']) await stack.research.references.storeReference(reference(item));
    const selection = createCreativeResearchSelectionService({
      references: stack.research.references, sessions: stack.base.sessions, now: () => NOW, createId: ids('negative'),
    });
    await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'selected-1', state: 'SELECTED', selectedAttributes: ['LAYOUT'] });
    await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'rejected-1', state: 'REJECTED', selectedAttributes: [], rejectionReason: '太商业' });

    // Counter-instrumented gateway and analysis adapters wired into the SAME stores.
    let gatewayCalls = 0;
    let adapterCalls = 0;
    const search = createCreativeResearchReferenceSearchService({
      ...stack.base, ...stack.research,
      gateway: { async search() { gatewayCalls += 1; throw new Error('must not be called'); } },
      now: () => NOW, createId: ids('query'),
    });
    const preferences = createCreativeResearchPreferenceAnalysisService({
      briefs: stack.base.briefs, references: stack.research.references, insights: stack.insights,
      sessions: stack.base.sessions,
      adapter: { async analyzePreferences() { adapterCalls += 1; return []; } },
      now: () => NOW, createId: ids('analysis'),
    });
    void search;
    void preferences;

    // startDirection -> updateDirectionBoard -> returnToResearch -> startDirection -> completeDirection -> getDirectionContext.
    await stack.direction.startDirection('session-1');
    await stack.direction.updateDirectionBoard('session-1', { designerNotes: ['定稿备注'] });
    await stack.direction.returnToResearch('session-1');
    await stack.direction.startDirection('session-1');
    const { session } = await stack.direction.completeDirection('session-1', { confirm: true });
    assert.equal(session.status, 'COMPLETED');
    const { context } = await stack.direction.getDirectionContext('session-1');
    assert.ok(context);
    assert.equal(gatewayCalls, 0);
    assert.equal(adapterCalls, 0);

    // Nothing outside <root>/creative-research was written: no Packaging/Space/Reference-First artifacts.
    assert.deepEqual(await fs.readdir(root), ['creative-research']);

    // The R7 application and operations sources import no packaging/space/image-generation modules.
    const sources = await Promise.all([
      'packages/runtime-core/src/application/creative-research-direction-service.ts',
      'packages/runtime-core/src/application/creative-research-direction-board-service.ts',
      'packages/runtime-core/src/application/creative-research-direction-board-store.ts',
      'packages/runtime-core/src/application/creative-research-direction-context-store.ts',
      'packages/runtime-core/src/application/creative-research/direction-context.ts',
      'packages/runtime-core/src/operations/creative-research-operations.ts',
    ].map((file) => fs.readFile(file, 'utf8')));
    for (const source of sources) {
      assert.doesNotMatch(source, /from\s+['"][^'"]*(?:packaging|image-generation|space-generator|space-compiler)[^'"]*['"]/iu);
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});
