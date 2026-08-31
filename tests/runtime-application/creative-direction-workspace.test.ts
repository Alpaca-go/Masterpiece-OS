import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createCreativeDirectionStore } from '@masterpiece/runtime-core/application/creative-direction-store.ts';
import { createCreativeDirectionApplicationService } from '@masterpiece/runtime-core/application/creative-direction-application-service.ts';

test('Creative Direction supports one or both lanes, explicit finalization, and context staleness', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-creative-direction-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let sequence = 0;
  const service = createCreativeDirectionApplicationService({
    store: createCreativeDirectionStore({ readDefaultDataPath: async () => root }),
    now: () => `2026-08-31T00:00:${String(sequence++).padStart(2, '0')}.000Z`,
    createId: () => `id-${sequence}`,
    loadStrategy: async (runId) => ({
      schemaVersion: 'creative-intelligence-workspace-v0.1',
      run: { id: runId, projectId: 'project-1', projectName: '测试项目', status: 'completed', selectionRevision: 1 },
      selectedDirectionSnapshot: { title: '可信专业', proposition: '以清晰信息建立可信度' },
      warnings: [], blockers: [], diagnostics: [],
    } as never),
    loadVisualResearch: async (sessionId) => ({
      session: { id: sessionId, projectId: 'project-1', status: 'COMPLETED', sourceDocumentIds: [], createdAt: '', updatedAt: '' },
      board: { summary: '克制留白', visualKeywords: ['极简', '留白'], negativeSignalIds: [], designerNotes: [], referenceIds: ['ref-1'] } as never,
      context: { sessionId, projectId: 'project-1', directionSummary: '用极简留白构建现代感', visualKeywords: ['极简'], negativeSignals: [], preferredAttributes: [], constraints: [], designerNotes: [], provenance: { referenceIds: ['ref-1'] } } as never,
    }),
  });

  let workspace = await service.createSession({ projectId: 'project-1', projectName: '测试项目', lockedFacts: ['品牌名称不可改变'] });
  assert.equal(workspace.session.status, 'CONTEXT_REVIEW');
  await assert.rejects(() => service.synthesize(workspace.session.id), /CONTEXT_NOT_CONFIRMED/);

  workspace = await service.updateContext(workspace.session.id, { facts: workspace.context.facts, confirm: true });
  workspace = await service.linkStrategy(workspace.session.id, 'strategy-1');
  workspace = await service.synthesize(workspace.session.id);
  assert.equal(workspace.finalDirection?.sourceCoverage.strategy, 'USED');
  assert.equal(workspace.finalDirection?.sourceCoverage.visualResearch, 'NOT_LINKED');
  await assert.rejects(() => service.finalize(workspace.session.id, false), /FINAL_CONFIRMATION_REQUIRED/);

  workspace = await service.linkVisualResearch(workspace.session.id, 'research-1');
  assert.equal(workspace.finalDirection?.stale, true);
  workspace = await service.synthesize(workspace.session.id);
  assert.equal(workspace.finalDirection?.sourceCoverage.visualResearch, 'USED');
  assert.ok(workspace.finalDirection?.conflictResolutions.length);
  workspace = await service.finalize(workspace.session.id, true);
  assert.equal(workspace.finalDirection?.status, 'FINALIZED');

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
    loadStrategy: async () => ({ run: { projectId: 'project-2' } } as never),
    loadVisualResearch: async () => ({ session: { projectId: 'project-2' } } as never),
  });
  const workspace = await service.createSession({ projectId: 'project-1', projectName: '项目一' });
  await assert.rejects(() => service.linkStrategy(workspace.session.id, 'other'), /PROJECT_MISMATCH/);
  await assert.rejects(() => service.linkVisualResearch(workspace.session.id, 'other'), /PROJECT_MISMATCH/);
});
