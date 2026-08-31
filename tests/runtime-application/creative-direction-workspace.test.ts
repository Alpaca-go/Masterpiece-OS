import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createCreativeDirectionStore } from '@masterpiece/runtime-core/application/creative-direction-store.ts';
import { createCreativeDirectionApplicationService } from '@masterpiece/runtime-core/application/creative-direction-application-service.ts';
import { synthesizeCreativeDirection } from '@masterpiece/runtime-core/application/creative-direction-synthesis-service.ts';

test('Creative Direction synthesis adapter excludes provenance and falls back on invalid output or timeout', async () => {
  const input = {
    sessionId: 'session-1',
    projectName: '综合项目',
    context: {
      schemaVersion: 'shared-project-context-v0.1' as const,
      projectId: 'project-1',
      revision: 2,
      facts: [{ key: 'projectName' as const, value: '综合项目', authority: 'PROJECT_RECORD' as const, evidence: ['项目记录'] }],
      confirmedByUser: true,
      createdAt: '',
      updatedAt: '',
    },
    strategy: {
      sourceRunId: 'strategy-secret-id',
      sourceRevision: 3,
      sourceFingerprint: 'secret-fingerprint',
      directionTitle: '可信秩序',
      proposition: '让复杂信息变得清晰可信',
      strategicIntent: ['清晰'],
      opportunityStatements: [],
      audienceNeeds: [],
      brandPrinciples: ['可信'],
      decisionRationales: [],
      warnings: [],
    },
    visual: null,
    previous: null,
    id: 'direction-1',
    timestamp: '2026-09-01T00:00:00.000Z',
  };

  const invalid = await synthesizeCreativeDirection({ ...input, adapter: { synthesize: async () => '{invalid json' } });
  assert.equal(invalid.proposition, '让复杂信息变得清晰可信');

  const timedOut = await synthesizeCreativeDirection({ ...input, adapter: { synthesize: async () => { throw new Error('TIMEOUT'); } } });
  assert.equal(timedOut.proposition, '让复杂信息变得清晰可信');

  let received = '';
  const modeled = await synthesizeCreativeDirection({
    ...input,
    adapter: {
      synthesize: async (value) => {
        received = JSON.stringify(value);
        return {
          title: '模型综合方向', proposition: '模型综合主张', strategicPrinciples: ['清晰与可信'],
          visualPrinciples: ['不得在缺少视觉来源时采用'], negativeConstraints: [], risks: [], conflictResolutions: [], rationale: ['基于策略贡献'],
        };
      },
    },
  });
  assert.equal(modeled.title, '模型综合方向');
  assert.deepEqual(modeled.visualPrinciples, []);
  assert.equal(received.includes('strategy-secret-id'), false);
  assert.equal(received.includes('secret-fingerprint'), false);
});

test('Creative Direction supports one or both lanes, explicit finalization, and context staleness', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-creative-direction-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let sequence = 0;
  let visualReady = false;
  const service = createCreativeDirectionApplicationService({
    store: createCreativeDirectionStore({ readDefaultDataPath: async () => root }),
    now: () => `2026-08-31T00:00:${String(sequence++).padStart(2, '0')}.000Z`,
    createId: () => `id-${sequence}`,
    createVisualResearch: async ({ projectId }) => ({ id: 'research-created', projectId, status: 'INTAKE', sourceDocumentIds: ['brief.md'], createdAt: '', updatedAt: '' }),
    loadStrategy: async (runId) => ({
      schemaVersion: 'creative-intelligence-workspace-v0.1',
      run: { id: runId, projectId: 'project-1', projectName: '测试项目', status: 'completed', selectionRevision: 1 },
      selectedDirectionSnapshot: { title: '可信专业', proposition: '以清晰信息建立可信度' },
      warnings: [], blockers: [], diagnostics: [],
    } as never),
    loadVisualResearch: async (sessionId) => ({
      session: { id: sessionId, projectId: 'project-1', status: 'COMPLETED', sourceDocumentIds: [], createdAt: '', updatedAt: '' },
      board: { summary: '克制留白', visualKeywords: ['极简', '留白'], negativeSignalIds: [], designerNotes: [], referenceIds: ['ref-1'] } as never,
      context: visualReady ? { sessionId, projectId: 'project-1', directionSummary: '用极简留白构建现代感', visualKeywords: ['极简'], negativeSignals: [], preferredAttributes: [], constraints: [], designerNotes: [], provenance: { referenceIds: ['ref-1'] } } as never : null,
    }),
  });

  let workspace = await service.createSession({ projectId: 'project-1', projectName: '测试项目', lockedFacts: ['品牌名称不可改变'], sourceDocumentIds: ['brief.md'], sourceDocumentLabels: ['brief.md'] });
  assert.equal(workspace.session.status, 'CONTEXT_REVIEW');
  assert.equal(workspace.session.visualResearchSessionId, 'research-created');
  assert.equal(workspace.session.sourceDocumentCount, 1);
  await assert.rejects(() => service.synthesize(workspace.session.id), /CONTEXT_NOT_CONFIRMED/);

  workspace = await service.updateContext(workspace.session.id, { facts: workspace.context.facts, confirm: true });
  workspace = await service.linkStrategy(workspace.session.id, 'strategy-1');
  workspace = await service.synthesize(workspace.session.id);
  assert.equal(workspace.finalDirection?.sourceCoverage.strategy, 'USED');
  assert.equal(workspace.finalDirection?.sourceCoverage.visualResearch, 'NOT_READY');
  await assert.rejects(() => service.finalize(workspace.session.id, false), /FINAL_CONFIRMATION_REQUIRED/);

  visualReady = true;
  workspace = await service.linkVisualResearch(workspace.session.id, 'research-1');
  assert.equal(workspace.finalDirection?.stale, true);
  workspace = await service.synthesize(workspace.session.id);
  assert.equal(workspace.finalDirection?.sourceCoverage.visualResearch, 'USED');
  assert.ok(workspace.finalDirection?.conflictResolutions.length);
  workspace = await service.finalize(workspace.session.id, true);
  assert.equal(workspace.finalDirection?.status, 'FINALIZED');
  assert.equal(workspace.session.status, 'FINALIZED');
  assert.equal(workspace.productionHandoff?.status, 'PENDING');
  assert.equal(workspace.productionHandoff?.pendingReason, 'PRODUCTION_COMPILER_UNAVAILABLE');

  workspace = await service.updateContext(workspace.session.id, { facts: workspace.context.facts, confirm: true });
  assert.equal(workspace.context.revision, 3);
  assert.equal(workspace.finalDirection?.stale, true);
  await assert.rejects(() => service.finalize(workspace.session.id, true), /FRESH_DRAFT_REQUIRED/);
});

test('Creative Direction rejects sources belonging to another project', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-creative-direction-project-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const service = createCreativeDirectionApplicationService({
    store: createCreativeDirectionStore({ readDefaultDataPath: async () => root }),
    createId: () => 'session',
    createVisualResearch: async ({ projectId }) => ({ id: 'research-created', projectId, status: 'INTAKE', sourceDocumentIds: ['brief.md'], createdAt: '', updatedAt: '' }),
    loadStrategy: async () => ({ run: { projectId: 'project-2' } } as never),
    loadVisualResearch: async () => ({ session: { projectId: 'project-2' } } as never),
  });
  const workspace = await service.createSession({ projectId: 'project-1', projectName: '项目一', sourceDocumentIds: ['brief.md'], sourceDocumentLabels: ['brief.md'] });
  await assert.rejects(() => service.linkStrategy(workspace.session.id, 'other'), /PROJECT_MISMATCH/);
  await assert.rejects(() => service.linkVisualResearch(workspace.session.id, 'other'), /PROJECT_MISMATCH/);
});

test('deleting a Creative Direction workspace retains linked child runs', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-creative-direction-delete-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const service = createCreativeDirectionApplicationService({
    store: createCreativeDirectionStore({ readDefaultDataPath: async () => root }),
    createId: () => 'delete-session',
    createVisualResearch: async ({ projectId }) => ({ id: 'research-retained', projectId, status: 'INTAKE', sourceDocumentIds: ['brief.md'], createdAt: '', updatedAt: '' }),
    loadStrategy: async () => ({ run: { projectId: 'project-1' } } as never),
    loadVisualResearch: async () => ({ session: { projectId: 'project-1' } } as never),
  });
  const workspace = await service.createSession({ projectId: 'project-1', projectName: '项目一', sourceDocumentIds: ['brief.md'], sourceDocumentLabels: ['brief.md'] });
  const result = await service.deleteSession(workspace.session.id);
  assert.deepEqual(result, { deleted: true, retainedStrategyRunId: null, retainedVisualResearchSessionId: 'research-retained' });
  await assert.rejects(() => service.getWorkspace(workspace.session.id), /SESSION_NOT_FOUND/);
});

test('Creative Direction projects semantic fields only and detects same-source revisions', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-creative-direction-semantic-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let visualSummary = '以克制留白形成清晰秩序';
  const service = createCreativeDirectionApplicationService({
    store: createCreativeDirectionStore({ readDefaultDataPath: async () => root }),
    createId: () => 'semantic',
    createVisualResearch: async ({ projectId }) => ({ id: 'visual-1', projectId, status: 'INTAKE', sourceDocumentIds: ['brief.md'], createdAt: '', updatedAt: '' }),
    loadStrategy: async (runId) => ({
      schemaVersion: 'creative-intelligence-workspace-v0.1',
      run: { id: runId, projectId: 'project-1', projectName: '语义项目', status: 'completed', selectionRevision: 3 },
      selectedDirectionSnapshot: {
        schemaVersion: '0.1', directionFingerprint: 'fp:secret', selectedAt: '2026-08-31T00:00:00.000Z', selectedBy: 'user',
        direction: { id: 'dir-concept-uuid', title: '可信秩序', thesis: '让复杂信息成为可理解的品牌体验', systemHypothesis: '以清晰层级建立信任', strengths: ['清晰', '可信'], risks: ['避免信息过载'] },
      },
      warnings: [], blockers: [], diagnostics: [],
    } as never),
    loadVisualResearch: async (sessionId) => ({
      session: { id: sessionId, projectId: 'project-1', status: 'COMPLETED', sourceDocumentIds: [], createdAt: '', updatedAt: '' },
      board: { id: 'board-uuid', sessionId, revision: 2, summary: visualSummary, visualKeywords: ['留白'], layout: '明确的信息层级', negativeSignalIds: [], designerNotes: [], referenceIds: ['ref-uuid'], referenceRegionIds: [], createdAt: '', updatedAt: '' },
      context: { sessionId, projectId: 'project-1', briefRevision: 1, directionBoardRevision: 2, projectBrief: '', constraints: [], visualKeywords: ['留白'], selectedReferenceIds: ['ref-uuid'], selectedReferenceRegionIds: [], preferredAttributes: [], negativeSignals: [], designerNotes: [], directionSummary: visualSummary, provenance: { designBriefId: 'brief-uuid', directionBoardId: 'board-uuid', sourceDocumentIds: [], referenceIds: ['ref-uuid'], referenceRegionIds: [], negativeSignalIds: [] }, createdAt: '' },
    } as never),
  });

  let workspace = await service.createSession({ projectId: 'project-1', projectName: '语义项目', sourceDocumentIds: ['brief.md'], sourceDocumentLabels: ['brief.md'] });
  workspace = await service.updateContext(workspace.session.id, { facts: workspace.context.facts, confirm: true });
  workspace = await service.linkStrategy(workspace.session.id, 'strategy-uuid');
  workspace = await service.synthesize(workspace.session.id);
  const visible = JSON.stringify({
    proposition: workspace.finalDirection?.proposition,
    strategicPrinciples: workspace.finalDirection?.strategicPrinciples,
    visualPrinciples: workspace.finalDirection?.visualPrinciples,
    risks: workspace.finalDirection?.risks,
  });
  assert.equal(visible.includes('dir-concept-uuid'), false);
  assert.equal(visible.includes('fp:secret'), false);
  assert.equal(visible.includes('2026-08-31T00:00:00.000Z'), false);
  assert.equal(visible.includes('user'), false);
  assert.equal(workspace.finalDirection?.proposition, '让复杂信息成为可理解的品牌体验');
  assert.equal(workspace.finalDirection?.stale, false);

  visualSummary = '同一研究记录内已更新的视觉方向';
  workspace = await service.getWorkspace(workspace.session.id);
  assert.equal(workspace.finalDirection?.stale, true);
  workspace = await service.linkStrategy(workspace.session.id, null);
  workspace = await service.synthesize(workspace.session.id);
  assert.equal(workspace.finalDirection?.proposition, '同一研究记录内已更新的视觉方向');
  assert.equal(workspace.finalDirection?.stale, false);
});

test('Creative Direction production handoff reaches READY only through a real compiler result', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-creative-direction-compile-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const service = createCreativeDirectionApplicationService({
    store: createCreativeDirectionStore({ readDefaultDataPath: async () => root }),
    createId: () => 'compile',
    createVisualResearch: async ({ projectId }) => ({ id: 'visual-1', projectId, status: 'COMPLETED', sourceDocumentIds: [], createdAt: '', updatedAt: '' }),
    loadStrategy: async () => ({ run: { projectId: 'project-1' } } as never),
    loadVisualResearch: async (sessionId) => ({
      session: { id: sessionId, projectId: 'project-1', status: 'COMPLETED', sourceDocumentIds: [], createdAt: '', updatedAt: '' },
      board: { id: 'board-1', sessionId, revision: 1, summary: '视觉方向', visualKeywords: ['秩序'], negativeSignalIds: [], designerNotes: [], referenceIds: [], referenceRegionIds: [], createdAt: '', updatedAt: '' },
      context: { sessionId, projectId: 'project-1', briefRevision: 1, directionBoardRevision: 1, projectBrief: '', constraints: [], visualKeywords: ['秩序'], selectedReferenceIds: [], selectedReferenceRegionIds: [], preferredAttributes: [], negativeSignals: [], designerNotes: [], directionSummary: '视觉方向', provenance: { designBriefId: 'brief-1', directionBoardId: 'board-1', sourceDocumentIds: [], referenceIds: [], referenceRegionIds: [], negativeSignalIds: [] }, createdAt: '' },
    } as never),
    productionCompiler: { compile: async () => ({ visualCanonId: 'canon-1', anchorContractId: 'anchor-1', packagingTranslationId: 'packaging-1' }) },
  });

  let workspace = await service.createSession({ projectId: 'project-1', projectName: '生产项目', sourceDocumentIds: ['brief.md'], sourceDocumentLabels: ['brief.md'] });
  workspace = await service.updateContext(workspace.session.id, { facts: workspace.context.facts, confirm: true });
  workspace = await service.synthesize(workspace.session.id);
  workspace = await service.finalize(workspace.session.id, true);
  assert.equal(workspace.session.status, 'PRODUCTION_READY');
  assert.equal(workspace.productionHandoff?.status, 'READY');
  assert.equal(workspace.productionHandoff?.visualCanonId, 'canon-1');
  assert.equal(workspace.productionHandoff?.anchorContractId, 'anchor-1');
});

test('Creative Direction keeps production pending when visual research is not ready', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-creative-direction-pending-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const service = createCreativeDirectionApplicationService({
    store: createCreativeDirectionStore({ readDefaultDataPath: async () => root }),
    createId: () => 'pending',
    createVisualResearch: async ({ projectId }) => ({ id: 'visual-pending', projectId, status: 'INTAKE', sourceDocumentIds: [], createdAt: '', updatedAt: '' }),
    loadStrategy: async (runId) => ({
      run: { id: runId, projectId: 'project-1', selectionRevision: 1 },
      selectedDirectionSnapshot: { directionFingerprint: 'strategy-fingerprint', direction: { title: '策略方向', thesis: '策略主张' } },
      warnings: [],
    } as never),
    loadVisualResearch: async (sessionId) => ({
      session: { id: sessionId, projectId: 'project-1', status: 'INTAKE', sourceDocumentIds: [], createdAt: '', updatedAt: '' },
      board: null,
      context: null,
    }),
  });

  let workspace = await service.createSession({ projectId: 'project-1', projectName: '等待视觉', sourceDocumentIds: ['brief.md'], sourceDocumentLabels: ['brief.md'] });
  workspace = await service.updateContext(workspace.session.id, { facts: workspace.context.facts, confirm: true });
  workspace = await service.linkStrategy(workspace.session.id, 'strategy-1');
  workspace = await service.synthesize(workspace.session.id);
  workspace = await service.finalize(workspace.session.id, true);
  assert.equal(workspace.session.status, 'FINALIZED');
  assert.equal(workspace.productionHandoff?.status, 'PENDING');
  assert.equal(workspace.productionHandoff?.pendingReason, 'VISUAL_RESEARCH_REQUIRED');
});

test('Creative Direction rejects invalid compiler output and can retry a failed handoff', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-creative-direction-retry-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let compilerMode: 'invalid' | 'error' | 'success' = 'invalid';
  const service = createCreativeDirectionApplicationService({
    store: createCreativeDirectionStore({ readDefaultDataPath: async () => root }),
    createId: () => 'retry',
    createVisualResearch: async ({ projectId }) => ({ id: 'visual-ready', projectId, status: 'COMPLETED', sourceDocumentIds: [], createdAt: '', updatedAt: '' }),
    loadStrategy: async () => ({ run: { projectId: 'project-1' } } as never),
    loadVisualResearch: async (sessionId) => ({
      session: { id: sessionId, projectId: 'project-1', status: 'COMPLETED', sourceDocumentIds: [], createdAt: '', updatedAt: '' },
      board: { id: 'board-1', sessionId, revision: 1, summary: '视觉方向', visualKeywords: [], negativeSignalIds: [], designerNotes: [], referenceIds: [], referenceRegionIds: [], createdAt: '', updatedAt: '' },
      context: { sessionId, projectId: 'project-1', directionBoardRevision: 1, visualKeywords: [], selectedReferenceIds: [], selectedReferenceRegionIds: [], preferredAttributes: [], negativeSignals: [], designerNotes: [], constraints: [], directionSummary: '视觉方向', provenance: { referenceIds: [], referenceRegionIds: [], negativeSignalIds: [], sourceDocumentIds: [] } },
    } as never),
    productionCompiler: {
      compile: async () => {
        if (compilerMode === 'invalid') return { visualCanonId: '', anchorContractId: 'anchor-invalid' };
        if (compilerMode === 'error') {
          const error = new Error('canonical compiler unavailable') as Error & { code?: string };
          error.code = 'CANONICAL_COMPILER_UNAVAILABLE';
          throw error;
        }
        return { visualCanonId: 'canon-ready', anchorContractId: 'anchor-ready' };
      },
    },
  });

  let workspace = await service.createSession({ projectId: 'project-1', projectName: '重试项目', sourceDocumentIds: ['brief.md'], sourceDocumentLabels: ['brief.md'] });
  workspace = await service.updateContext(workspace.session.id, { facts: workspace.context.facts, confirm: true });
  workspace = await service.synthesize(workspace.session.id);
  workspace = await service.finalize(workspace.session.id, true);
  assert.equal(workspace.session.status, 'PRODUCTION_FAILED');
  assert.equal(workspace.finalDirection?.status, 'FINALIZED');
  assert.equal(workspace.productionHandoff?.errorCode, 'PRODUCTION_COMPILE_RESULT_INVALID');

  compilerMode = 'error';
  workspace = await service.retryProduction(workspace.session.id);
  assert.equal(workspace.productionHandoff?.status, 'FAILED');
  assert.equal(workspace.productionHandoff?.errorCode, 'CANONICAL_COMPILER_UNAVAILABLE');

  compilerMode = 'success';
  workspace = await service.retryProduction(workspace.session.id);
  assert.equal(workspace.session.status, 'PRODUCTION_READY');
  assert.equal(workspace.productionHandoff?.status, 'READY');
  assert.equal(workspace.productionHandoff?.visualCanonId, 'canon-ready');
  assert.equal(workspace.productionHandoff?.anchorContractId, 'anchor-ready');
});

test('Creative Direction store migrates v0.1 final directions as stale', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-creative-direction-legacy-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const sessionRoot = path.join(root, 'creative-direction', 'legacy');
  await fs.mkdir(sessionRoot, { recursive: true });
  await fs.writeFile(path.join(sessionRoot, 'final-direction.json'), JSON.stringify({
    schemaVersion: 'final-creative-direction-v0.1', id: 'fd-old', sessionId: 'legacy', revision: 1,
    status: 'FINALIZED', stale: false, title: '旧方向', proposition: '旧主张', strategicPrinciples: [],
    visualPrinciples: [], negativeConstraints: [], risks: [], conflictResolutions: [], evidence: [],
    sourceCoverage: { strategy: 'USED', visualResearch: 'NOT_READY', contextRevision: 2 },
    createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z',
  }), 'utf8');
  const value = await createCreativeDirectionStore({ readDefaultDataPath: async () => root }).getFinal('legacy');
  assert.equal(value?.schemaVersion, 'final-creative-direction-v0.2');
  assert.equal(value?.stale, true);
  assert.deepEqual(value?.rationale, []);
  assert.equal(value?.sourceFingerprint.digest, '');
});
