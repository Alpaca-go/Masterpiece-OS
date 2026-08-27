import test from 'node:test';
import assert from 'node:assert/strict';
import { createCreativeResearchAnalysisAdapter } from '@masterpiece/runtime-core/application/creative-research-analysis-adapter.ts';
import { normalizeDesignBriefDraft } from '@masterpiece/runtime-core/application/creative-research-design-brief-core.ts';

const evidence = [{
  id: 'evidence-1', sourceDocumentId: 'document-1', locator: { kind: 'DOCUMENT_SECTION' as const, value: 'Audience' },
  excerpt: 'Urban families', createdAt: '2026-08-27T08:00:00.000Z',
}];

const valid = {
  projectSummary: 'Community hospitality brand', designTask: 'Create a flexible identity', audience: 'Urban families',
  scenarios: Array.from({ length: 12 }, (_, index) => `Scenario ${index}`),
  coreMessages: ['Open and trusted'], constraints: ['Keep the logo'],
  conceptKeywords: ['belonging'], visualKeywords: ['warm editorial'], evidenceIds: ['evidence-1', 'invented'],
  fieldEvidence: {
    projectSummary: ['evidence-1'], designTask: ['evidence-1'], audience: ['evidence-1'],
    scenarios: ['evidence-1'], coreMessages: ['evidence-1'], constraints: ['evidence-1'],
  },
  searchKeywordSuggestions: [{ value: 'community table', kind: 'CONCEPT' }, { value: 'bad', kind: 'UNKNOWN' }],
  warnings: [],
};

test('R2 Design Brief normalization caps collections and rejects invented evidence', () => {
  const normalized = normalizeDesignBriefDraft(valid, ['evidence-1']);
  assert.equal(normalized.scenarios.length, 8);
  assert.deepEqual(normalized.evidenceIds, ['evidence-1']);
  assert.deepEqual(normalized.searchKeywordSuggestions?.map((item) => item.kind), ['CONCEPT', 'CONCEPT', 'VISUAL']);
  assert.throws(
    () => normalizeDesignBriefDraft({ ...valid, evidenceIds: ['invented'] }, ['evidence-1']),
    (error: any) => error.code === 'CREATIVE_RESEARCH_MODEL_OUTPUT_INVALID',
  );
  assert.throws(
    () => normalizeDesignBriefDraft({ ...valid, fieldEvidence: {} }, ['evidence-1']),
    /缺少文档证据引用/u,
  );
});

test('R2 analysis adapter uses one primary call and at most one structured repair through profile credentials', async () => {
  const outputs = ['not-json', JSON.stringify(valid)];
  let calls = 0;
  let diagnostics: any;
  const adapter = createCreativeResearchAnalysisAdapter({
    readCredentials: async (profileId) => ({ profileId, provider: 'test-provider', baseUrl: 'https://example.test/v1', model: 'test-model', apiKey: 'secret' }),
    reasonerFactory: () => async () => ({ text: outputs[calls++] }),
    onDiagnostics: (value) => { diagnostics = value; },
  });
  const draft = await adapter.draftDesignBrief({
    projectId: 'project-1', sourceDocumentIds: ['document-1'], evidence, profileId: 'profile-1', designerNotes: [],
  });
  assert.equal(draft.audience, 'Urban families');
  assert.equal(calls, 2);
  assert.deepEqual(diagnostics, { modelCallCount: 2, repairCount: 1, provider: 'test-provider', model: 'test-model' });

  let failedCalls = 0;
  const failing = createCreativeResearchAnalysisAdapter({
    readCredentials: async (profileId) => ({ profileId, provider: 'test-provider', baseUrl: 'https://example.test/v1', model: 'test-model', apiKey: 'secret' }),
    reasonerFactory: () => async () => { failedCalls += 1; return { text: '{}' }; },
  });
  await assert.rejects(
    failing.draftDesignBrief({ projectId: 'project-1', sourceDocumentIds: ['document-1'], evidence, profileId: 'profile-1', designerNotes: [] }),
    (error: any) => error.code === 'CREATIVE_RESEARCH_MODEL_OUTPUT_INVALID',
  );
  assert.equal(failedCalls, 2);
});
