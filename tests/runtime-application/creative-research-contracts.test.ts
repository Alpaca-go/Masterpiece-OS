import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertCreativeResearchSession,
  assertDesignBrief,
  assertDesignBriefRevision,
  assertNegativeSignal,
  assertPreferenceInsight,
  assertReferenceItem,
  assertReferenceRegion,
  assertReferenceSearchInput,
  assertReferenceSelection,
  assertSearchQuery,
  assertSearchResultPage,
  compileCreativeDirectionContext,
  serializeCreativeDirectionContext,
  type CreativeResearchSession,
  type DesignBrief,
  type DirectionBoard,
  type NegativeSignal,
  type ReferenceSelection,
  type WebReferenceItem,
} from '@masterpiece/runtime-core/application/creative-research/index.ts';

const NOW = '2026-08-27T08:00:00.000Z';

function session(status: CreativeResearchSession['status'] = 'INTAKE'): CreativeResearchSession {
  return {
    id: 'session-1',
    projectId: 'project-1',
    status,
    sourceDocumentIds: ['document-1'],
    activeDesignBriefId: 'brief-1',
    activeDirectionBoardId: 'board-1',
    createdAt: NOW,
    updatedAt: NOW,
    ...(status === 'COMPLETED' ? { completedAt: NOW } : {}),
  };
}

function brief(revision = 1, id = `brief-${revision}`): DesignBrief {
  return {
    id,
    sessionId: 'session-1',
    revision,
    projectSummary: '面向城市家庭的社区餐饮品牌',
    designTask: '建立可跨门店与数字触点延展的视觉方向',
    audience: '城市家庭',
    scenarios: ['社区门店'],
    coreMessages: ['开放与可信'],
    constraints: ['保留现有 Logo'],
    conceptKeywords: ['共享'],
    visualKeywords: ['温暖'],
    searchKeywords: [
      { id: `keyword-ai-${revision}`, briefId: id, value: 'shared table', kind: 'CONCEPT', source: 'AI', enabled: true, createdAt: NOW },
      { id: `keyword-designer-${revision}`, briefId: id, value: 'warm editorial', kind: 'VISUAL', source: 'DESIGNER', enabled: true, createdAt: NOW },
    ],
    designerNotes: ['避免作品集式拼贴'],
    evidence: [{
      id: `evidence-${revision}`,
      sourceDocumentId: 'document-1',
      normalizedSourceId: 'normalized-1',
      locator: { kind: 'DOCUMENT_SECTION', value: '品牌策略/目标人群' },
      excerpt: '服务城市家庭',
      createdAt: NOW,
    }],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function webReference(): WebReferenceItem {
  return {
    id: 'reference-web-1',
    sessionId: 'session-1',
    sourceType: 'WEB_REFERENCE',
    resourceType: 'WEB',
    title: 'Editorial identity reference',
    tags: ['editorial'],
    sourceUrl: 'https://example.com/work/1',
    canonicalUrl: 'https://example.com/work/1',
    provider: 'search-provider',
    publisherOrDomain: 'example.com',
    queryId: 'query-1',
    resultRank: 1,
    retrievedAt: NOW,
    createdAt: NOW,
  };
}

test('Creative Research session has exactly four valid states and preserves identity', () => {
  for (const status of ['INTAKE', 'RESEARCH', 'DIRECTION', 'COMPLETED'] as const) {
    const value = session(status);
    assert.doesNotThrow(() => assertCreativeResearchSession(value));
    assert.equal(value.id, 'session-1');
    assert.equal(value.projectId, 'project-1');
  }
  assert.throws(
    () => assertCreativeResearchSession({ ...session(), status: 'PROPOSITION' as never }),
    /session.status is invalid/,
  );
});

test('Design Brief revision, evidence and AI/DESIGNER keyword provenance are traceable', () => {
  const first = brief();
  const second = brief(2);
  assert.doesNotThrow(() => assertDesignBrief(first));
  assert.deepEqual(first.searchKeywords.map((keyword) => keyword.source), ['AI', 'DESIGNER']);
  assert.equal(first.evidence[0]?.sourceDocumentId, 'document-1');
  assert.doesNotThrow(() => assertDesignBriefRevision(first, second));
  assert.throws(() => assertDesignBriefRevision(first, brief(3)), /increment by exactly one/);
  assert.throws(
    () => assertDesignBrief({ ...first, evidence: [{ ...first.evidence[0]!, sourceDocumentId: '' }] }),
    /sourceDocumentId is required/,
  );
});

test('Reference source types require distinct and non-forgeable provenance', () => {
  const web = webReference();
  const user = {
    id: 'reference-user-1', sessionId: 'session-1', sourceType: 'USER_REFERENCE' as const,
    assetId: 'asset-1', originalFilename: 'reference.png', tags: [], createdAt: NOW,
  };
  const ai = {
    id: 'reference-ai-1', sessionId: 'session-1', sourceType: 'AI_EXPLORATION' as const,
    generationRunId: 'generation-1', inputReferenceIds: [web.id], generatedAt: NOW, tags: [], createdAt: NOW,
  };
  assert.doesNotThrow(() => assertReferenceItem(web));
  assert.doesNotThrow(() => assertReferenceItem(user));
  assert.doesNotThrow(() => assertReferenceItem(ai));
  assert.throws(
    () => assertReferenceItem({ ...web, sourceUrl: '', canonicalUrl: '' }),
    /sourceUrl is required/,
  );
  assert.throws(
    () => assertReferenceItem({ ...ai, sourceUrl: 'https://example.com/fake' } as never),
    /cannot claim Web provenance/,
  );
  assert.throws(
    () => assertReferenceItem({ ...user, sourceUrl: 'https://example.com/fake' } as never),
    /cannot claim Web or AI provenance/,
  );
});

test('Search contracts lock kind, batch, cursor, exclusions and real Web provenance', () => {
  const query = {
    id: 'query-1', sessionId: 'session-1', text: 'warm editorial identity', kind: 'CONCEPT' as const,
    provider: 'search-provider', batch: 'batch-1', status: 'COMPLETED' as const,
    cursor: 'cursor-1', derivedFromKeywordIds: ['keyword-ai-1'], createdAt: NOW, completedAt: NOW,
  };
  assert.doesNotThrow(() => assertSearchQuery(query));
  assert.doesNotThrow(() => assertReferenceSearchInput({
    sessionId: 'session-1',
    queryId: query.id,
    query: query.text,
    kind: query.kind,
    cursor: query.cursor,
    limit: 20,
    exclusions: { referenceIds: ['old-reference'], domains: ['blocked.example'], urls: [] },
  }));
  assert.doesNotThrow(() => assertSearchResultPage({
    items: [webReference()], provider: 'search-provider', query: query.text, nextCursor: 'cursor-2',
  }));
  assert.throws(
    () => assertSearchResultPage({
      items: [{ id: 'llm-text', sessionId: 'session-1', sourceType: 'WEB_REFERENCE', resourceType: 'WEB', title: 'invented', tags: [], createdAt: NOW } as never],
      provider: 'search-provider', query: query.text,
    }),
    /sourceUrl is required/,
  );
});

test('Selections, regions, negative signals and finalized insights require designer evidence', () => {
  const selected: ReferenceSelection = {
    referenceId: 'reference-web-1', state: 'SELECTED', selectedAttributes: ['TYPOGRAPHY', 'LAYOUT'],
    designerNote: '保留编辑式留白', actor: 'DESIGNER', createdAt: NOW, updatedAt: NOW,
  };
  const rejected: ReferenceSelection = { ...selected, referenceId: 'reference-web-2', state: 'REJECTED' };
  assert.doesNotThrow(() => assertReferenceSelection(selected));
  assert.doesNotThrow(() => assertReferenceSelection(rejected));
  assert.throws(() => assertReferenceSelection({ ...selected, selectedAttributes: ['LIGHTING' as never] }), /invalid/);

  const region = {
    id: 'region-1', referenceId: selected.referenceId, x: 0.1, y: 0.2, width: 0.4, height: 0.5,
    coordinateSpace: 'NORMALIZED_0_1' as const, selectedAttributes: ['COLOR' as const], createdAt: NOW,
  };
  assert.doesNotThrow(() => assertReferenceRegion(region));
  assert.throws(() => assertReferenceRegion({ ...region, x: 0.8, width: 0.4 }), /normalized bounds/);

  const negative: NegativeSignal = {
    id: 'negative-1', sessionId: 'session-1', type: 'REJECT_REFERENCE', sourceReferenceId: rejected.referenceId,
    scope: 'REFERENCE', reason: '过度装饰', actor: 'DESIGNER', createdAt: NOW,
  };
  assert.doesNotThrow(() => assertNegativeSignal(negative));
  assert.throws(() => assertNegativeSignal({ ...negative, actor: 'AI' as never }), /must be DESIGNER/);
  assert.throws(() => assertNegativeSignal({ ...negative, sourceReferenceId: undefined }), /sourceReferenceId is required/);

  assert.throws(() => assertPreferenceInsight({
    id: 'insight-1', sessionId: 'session-1', category: 'LAYOUT', summary: '偏好留白', status: 'FINALIZED',
    supportingReferenceIds: [], supportingRegionIds: [], supportingNegativeSignalIds: [], createdAt: NOW,
  }), /requires supporting evidence/);
});

test('Creative Direction Context compiles deterministically without downstream private schema', () => {
  const selection: ReferenceSelection = {
    referenceId: 'reference-web-1', state: 'SELECTED', selectedAttributes: ['LAYOUT'],
    designerNote: '保持单一焦点', actor: 'DESIGNER', createdAt: NOW, updatedAt: NOW,
  };
  const board: DirectionBoard = {
    id: 'board-1', sessionId: 'session-1', revision: 1, summary: '温暖、开放的编辑式社区体验',
    visualKeywords: ['开放'], referenceIds: [selection.referenceId], referenceRegionIds: [], negativeSignalIds: [],
    designerNotes: ['避免 Logo 墙'], createdAt: NOW, updatedAt: NOW,
  };
  const context = compileCreativeDirectionContext({
    session: session('DIRECTION'), brief: brief(), directionBoard: board, selections: [selection],
    regions: [], negativeSignals: [], createdAt: NOW,
  });
  assert.equal(serializeCreativeDirectionContext(context), serializeCreativeDirectionContext(context));
  assert.deepEqual(context.preferredAttributes, ['LAYOUT']);
  assert.equal(context.provenance.directionBoardId, 'board-1');
  assert.doesNotMatch(serializeCreativeDirectionContext(context), /packagingContract|spaceContract|visualGrammar/u);
  assert.throws(
    () => serializeCreativeDirectionContext({
      ...context,
      provenance: { ...context.provenance, packagingContract: {} },
    } as never),
    /downstream private schema/,
  );
});
