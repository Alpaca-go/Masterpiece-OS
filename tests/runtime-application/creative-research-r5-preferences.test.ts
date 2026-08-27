import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { DesignBrief, WebReferenceItem } from '@masterpiece/runtime-core/application/creative-research/contracts.ts';
import { createCreativeResearchStore } from '@masterpiece/runtime-core/application/creative-research-store.ts';
import { createCreativeResearchResearchStore } from '@masterpiece/runtime-core/application/creative-research-research-store.ts';
import { createCreativeResearchSelectionService } from '@masterpiece/runtime-core/application/creative-research-selection-service.ts';
import { createCreativeResearchPreferenceStore } from '@masterpiece/runtime-core/application/creative-research-preference-store.ts';
import { createCreativeResearchPreferenceAnalysisService } from '@masterpiece/runtime-core/application/creative-research-preference-analysis-service.ts';
import {
  buildPreferenceAnalysisMessages,
  createCreativeResearchPreferenceAnalysisAdapter,
  normalizePreferenceInsightDrafts,
} from '@masterpiece/runtime-core/application/creative-research-preference-analysis-adapter.ts';

const NOW = '2026-08-27T14:00:00.000Z';

function brief(): DesignBrief {
  return {
    id: 'brief-1', sessionId: 'session-1', revision: 1, projectSummary: '公共文化品牌',
    designTask: '建立清晰的视觉秩序', audience: '城市青年', scenarios: ['展览'], coreMessages: ['开放'],
    constraints: ['保持易读'], conceptKeywords: ['公共性'], visualKeywords: ['克制', '纸张质感'],
    searchKeywords: [], designerNotes: [], evidence: [], createdAt: NOW, updatedAt: NOW,
  };
}

function reference(id: string, resourceType: 'IMAGE' | 'WEB' = 'IMAGE'): WebReferenceItem {
  return {
    id, sessionId: 'session-1', sourceType: 'WEB_REFERENCE', resourceType, title: `Reference ${id}`, tags: [],
    sourceUrl: `https://example.com/${id}`, canonicalUrl: `https://example.com/${id}`,
    ...(resourceType === 'IMAGE' ? { remoteImageUrl: `https://images.example.com/${id}.jpg` } : {}),
    provider: 'baidu-search', publisherOrDomain: 'example.com', queryId: 'query-1', resultRank: 1,
    retrievedAt: NOW, createdAt: NOW,
  };
}

function ids(prefix = 'id') {
  let index = 0;
  return () => `${prefix}-${++index}`;
}

async function fixture(root: string) {
  const base = createCreativeResearchStore({ readDefaultDataPath: () => root });
  const research = createCreativeResearchResearchStore({ readDefaultDataPath: () => root });
  const insights = createCreativeResearchPreferenceStore({ readDefaultDataPath: () => root });
  await base.sessions.create({ id: 'session-1', projectId: 'project-1', status: 'RESEARCH', sourceDocumentIds: ['document-1'], activeDesignBriefId: 'brief-1', createdAt: NOW, updatedAt: NOW });
  await base.briefs.saveRevision(brief());
  for (const item of [reference('selected-1'), reference('selected-2'), reference('selected-3', 'WEB'), reference('rejected-1'), reference('unselected-1')]) {
    await research.references.storeReference(item);
  }
  const selection = createCreativeResearchSelectionService({ references: research.references, now: () => NOW, createId: ids('negative') });
  await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'selected-1', state: 'SELECTED', selectedAttributes: ['TYPOGRAPHY', 'LAYOUT'], designerNote: '喜欢编号系统' });
  await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'selected-2', state: 'SELECTED', selectedAttributes: ['MATERIAL'] });
  await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'selected-3', state: 'SELECTED', selectedAttributes: ['LAYOUT'], designerNote: '网页只参考信息层级' });
  await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'rejected-1', state: 'REJECTED', selectedAttributes: [], rejectionReason: '太商业' });
  return { base, research, insights, selection };
}

test('R5 preference service requires three selections and sends only selected evidence plus active rejection reasons', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'creative-research-r5-preference-'));
  try {
    const { base, research, insights } = await fixture(temporary);
    let captured: any;
    const service = createCreativeResearchPreferenceAnalysisService({
      briefs: base.briefs, references: research.references, insights,
      adapter: { async analyzePreferences(input) {
        captured = input;
        return [{ category: 'LAYOUT', summary: '更偏向清晰层级与克制留白。', confidence: .82, supportingReferenceIds: ['selected-1', 'selected-3'], supportingNegativeSignalIds: ['negative-1'] }];
      } },
      now: () => NOW, createId: ids('analysis'),
    });
    const created = await service.analyzeSelection('session-1', 'profile-analysis');
    assert.equal(created[0]?.status, 'DRAFT');
    assert.equal(created[0]?.analysisRunId, 'analysis-1');
    assert.deepEqual(captured.selectedReferences.map((item: any) => item.id), ['selected-1', 'selected-2', 'selected-3']);
    assert.equal(captured.selectedReferences.some((item: any) => item.id === 'unselected-1' || item.id === 'rejected-1'), false);
    assert.equal(captured.selectedReferences.find((item: any) => item.id === 'selected-3')?.remoteImageUrl, undefined);
    assert.deepEqual(captured.activeNegativeSignals, [{ id: 'negative-1', sourceReferenceId: 'rejected-1', reason: '太商业', referenceTitle: 'Reference rejected-1' }]);

    const finalized = await service.finalizeInsight('session-1', created[0]!.id);
    assert.equal(finalized.status, 'FINALIZED');
    const overridden = await service.updateInsight('session-1', finalized.id, '不是极简，我选这些主要因为信息层级。');
    assert.match(overridden.designerOverride || '', /信息层级/u);
    const reloaded = createCreativeResearchPreferenceStore({ readDefaultDataPath: () => temporary });
    assert.equal((await reloaded.listInsights('session-1'))[0]?.status, 'FINALIZED');

    await service.analyzeSelection('session-1', 'profile-analysis');
    const history = await service.listInsights('session-1');
    assert.equal(history.filter((item) => item.status === 'FINALIZED').length, 1);
    assert.equal(history.filter((item) => item.status === 'DRAFT').length, 1);
    const persistedText = await fs.readFile(path.join(temporary, 'creative-research', 'session-1', 'research', 'preference-insights', `${created[0]!.id}.json`), 'utf8');
    assert.doesNotMatch(persistedText, /https:\/\/images|base64|sourceUrl|apiKey/u);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});

test('R5 preference service fails below minimum and rejects fabricated adapter evidence before persistence', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'creative-research-r5-preference-invalid-'));
  try {
    const { base, research, insights, selection } = await fixture(temporary);
    await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'selected-3', state: 'NONE', selectedAttributes: [] });
    const service = createCreativeResearchPreferenceAnalysisService({
      briefs: base.briefs, references: research.references, insights,
      adapter: { async analyzePreferences() { return [{ category: 'COLOR', summary: '虚构证据', supportingReferenceIds: ['unknown-reference'], supportingNegativeSignalIds: [] }]; } },
      now: () => NOW,
    });
    await assert.rejects(service.analyzeSelection('session-1', 'profile-analysis'), (error: any) => error.code === 'CREATIVE_RESEARCH_PREFERENCE_MIN_SELECTION_REQUIRED');
    await selection.setReferenceSelection({ sessionId: 'session-1', referenceId: 'selected-3', state: 'SELECTED', selectedAttributes: ['LAYOUT'] });
    await assert.rejects(service.analyzeSelection('session-1', 'profile-analysis'), (error: any) => error.code === 'CREATIVE_RESEARCH_PREFERENCE_EVIDENCE_INVALID');
    assert.deepEqual(await insights.listInsights('session-1'), []);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});

function adapterInput(imageCount = 1) {
  return {
    sessionId: 'session-1', profileId: 'profile-analysis',
    brief: { projectSummary: '摘要', designTask: '任务', audience: '受众', visualKeywords: ['克制'] },
    selectedReferences: Array.from({ length: imageCount }, (_, index) => ({
      id: `selected-${index + 1}`, resourceType: 'IMAGE' as const, title: `Selected ${index + 1}`, publisher: 'example.com',
      selectedAttributes: ['LAYOUT' as const], remoteImageUrl: `https://images.example.com/${index + 1}.jpg`,
    })),
    activeNegativeSignals: [{ id: 'negative-1', sourceReferenceId: 'rejected-1', reason: '太商业' }],
  };
}

test('R5 preference adapter enforces explicit multimodal profile, one repair, evidence allowlists and 12-image budget', async () => {
  let calls = 0;
  let diagnostics: any;
  const adapter = createCreativeResearchPreferenceAnalysisAdapter({
    readCredentials: async () => ({ profileId: 'profile-analysis', provider: 'qwen', protocol: 'openai-chat-multimodal', modelType: 'analysis', baseUrl: 'https://model.example.com/v1', model: 'analysis-model', apiKey: 'secret' }),
    reasonerFactory: () => async () => {
      calls += 1;
      return { text: calls === 1 ? 'not-json' : JSON.stringify({ insights: [{ category: 'LAYOUT', summary: '偏向清晰层级。', confidence: .7, supportingReferenceIds: ['selected-1'], supportingNegativeSignalIds: [] }] }) };
    },
    onDiagnostics: (value) => { diagnostics = value; },
  });
  const result = await adapter.analyzePreferences(adapterInput(13));
  assert.equal(calls, 2);
  assert.equal(diagnostics.repairCount, 1);
  assert.equal(diagnostics.modelCallCount, 2);
  assert.equal(diagnostics.visualInputCount, 12);
  assert.equal(result[0]?.category, 'LAYOUT');
  const messages = buildPreferenceAnalysisMessages(adapterInput(13));
  const serialized = JSON.stringify(messages);
  assert.equal((serialized.match(/"type":"image_url"/gu) || []).length, 12);
  const promptText = (messages as any)[1].content[0].text as string;
  const promptPayload = JSON.parse(promptText.split('\n\n').at(-1)!);
  assert.equal(promptPayload.selectedReferences.find((item: any) => item.id === 'selected-13')?.visuallyAnalyzed, false);
  assert.doesNotMatch(serialized, /base64|apiKey|完整策划/u);

  const unsupported = createCreativeResearchPreferenceAnalysisAdapter({
    readCredentials: async () => ({ profileId: 'different-profile', provider: 'qwen', protocol: 'openai-chat-multimodal', modelType: 'analysis', baseUrl: 'https://model.example.com/v1', model: 'analysis-model', apiKey: 'secret' }),
    reasonerFactory: () => { throw new Error('must not initialize'); },
  });
  await assert.rejects(unsupported.analyzePreferences(adapterInput()), (error: any) => error.code === 'CREATIVE_RESEARCH_PREFERENCE_PROFILE_UNSUPPORTED');
});

test('R5 preference UI keeps AI interpretation as draft evidence under explicit designer authority', async () => {
  const [workspace, panel, operations] = await Promise.all([
    fs.readFile('apps/web/src/features/creative-research/CreativeResearchWorkspace.tsx', 'utf8'),
    fs.readFile('apps/web/src/features/creative-research/PreferenceInsightsPanel.tsx', 'utf8'),
    fs.readFile('packages/runtime-core/src/operations/creative-research-operations.ts', 'utf8'),
  ]);
  assert.match(panel, /这是根据你目前的选择整理出的视觉倾向/u);
  assert.match(panel, /查看依据/u);
  assert.match(panel, /保存修正/u);
  assert.match(panel, /确认这条倾向/u);
  assert.match(workspace, /onAnalyze=\{\(\) => void analyzePreferences\(\)\}/u);
  assert.match(operations, /creative-research:analyze-preferences/u);
  assert.match(operations, /creative-research:finalize-preference-insight/u);
  assert.doesNotMatch(`${workspace}\n${panel}\n${operations}`, /more-like-this|change-batch|compile-direction|Direction Board|换一批/iu);
});

test('R5 preference adapter rejects unknown evidence after its single repair and validates category/confidence', async () => {
  let calls = 0;
  const invalid = JSON.stringify({ insights: [{ category: 'LAYOUT', summary: '虚构', confidence: .5, supportingReferenceIds: ['fabricated'], supportingNegativeSignalIds: [] }] });
  const adapter = createCreativeResearchPreferenceAnalysisAdapter({
    readCredentials: async () => ({ profileId: 'profile-analysis', provider: 'qwen', protocol: 'openai-chat-multimodal', modelType: 'analysis', baseUrl: 'https://model.example.com/v1', model: 'analysis-model', apiKey: 'secret' }),
    reasonerFactory: () => async () => { calls += 1; return { text: invalid }; },
  });
  await assert.rejects(adapter.analyzePreferences(adapterInput()), (error: any) => error.code === 'CREATIVE_RESEARCH_PREFERENCE_EVIDENCE_INVALID');
  assert.equal(calls, 2);
  assert.throws(() => normalizePreferenceInsightDrafts({ insights: [{ category: 'LIGHTING', summary: 'x', confidence: 2, supportingReferenceIds: ['selected-1'], supportingNegativeSignalIds: [] }] }, ['selected-1'], []), /category/u);
});
