import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { WebReferenceItem } from '@masterpiece/runtime-core/application/creative-research/contracts.ts';
import { createCreativeResearchResearchStore } from '@masterpiece/runtime-core/application/creative-research-research-store.ts';
import {
  activeRejectionSignals,
  createCreativeResearchSelectionService,
} from '@masterpiece/runtime-core/application/creative-research-selection-service.ts';

const NOW = '2026-08-27T12:00:00.000Z';

function reference(id: string, sessionId = 'session-1'): WebReferenceItem {
  return {
    id, sessionId, sourceType: 'WEB_REFERENCE', resourceType: 'IMAGE', title: id, tags: [],
    sourceUrl: `https://example.com/${id}`, canonicalUrl: `https://example.com/${id}`,
    remoteImageUrl: `https://images.example.com/${id}.jpg`, provider: 'baidu-search',
    publisherOrDomain: 'example.com', queryId: 'query-1', resultRank: 1,
    retrievedAt: NOW, createdAt: NOW,
  };
}

function ids(...values: string[]) {
  let index = 0;
  return () => values[index++] || `generated-${index}`;
}

test('R5 selection persists NONE/SELECTED/REJECTED current state with session identity and immutable rejection history', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'creative-research-r5-selection-'));
  try {
    const first = createCreativeResearchResearchStore({ readDefaultDataPath: () => temporary });
    await first.references.storeReference(reference('reference-1'));
    const service = createCreativeResearchSelectionService({ references: first.references, now: () => NOW, createId: ids('negative-1') });
    const selected = await service.setReferenceSelection({
      sessionId: 'session-1', referenceId: 'reference-1', state: 'SELECTED',
      selectedAttributes: ['TYPOGRAPHY', 'LAYOUT', 'TYPOGRAPHY'], designerNote: '只参考版式',
    });
    assert.equal(selected.selection.sessionId, 'session-1');
    assert.deepEqual(selected.selection.selectedAttributes, ['TYPOGRAPHY', 'LAYOUT']);
    assert.equal(selected.selection.designerNote, '只参考版式');
    assert.equal(selected.selection.actor, 'DESIGNER');

    const rejected = await service.setReferenceSelection({
      sessionId: 'session-1', referenceId: 'reference-1', state: 'REJECTED',
      selectedAttributes: ['COLOR'], rejectionReason: '色彩过艳',
    });
    assert.equal(rejected.selection.state, 'REJECTED');
    assert.deepEqual(rejected.selection.selectedAttributes, []);
    assert.equal(rejected.negativeSignal?.type, 'REJECT_REFERENCE');
    assert.equal(rejected.negativeSignal?.actor, 'DESIGNER');
    assert.equal(rejected.negativeSignal?.reason, '色彩过艳');

    await service.setReferenceSelection({
      sessionId: 'session-1', referenceId: 'reference-1', state: 'NONE', selectedAttributes: [],
    });
    const reloaded = createCreativeResearchResearchStore({ readDefaultDataPath: () => temporary });
    assert.deepEqual((await reloaded.references.listSelections('session-1')).map((item) => item.state), ['NONE']);
    const history = await reloaded.references.listNegativeSignals('session-1');
    assert.equal(history.length, 1);
    assert.equal(history[0]?.reason, '色彩过艳');
    assert.deepEqual(activeRejectionSignals(await reloaded.references.listSelections('session-1'), history), []);
    await Promise.all([
      fs.access(path.join(temporary, 'creative-research', 'session-1', 'research', 'selections', 'reference-1.json')),
      fs.access(path.join(temporary, 'creative-research', 'session-1', 'research', 'negative-signals', 'negative-1.json')),
    ]);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});

test('R5 selection rejects fake/cross-session references and invalid attributes', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'creative-research-r5-containment-'));
  try {
    const store = createCreativeResearchResearchStore({ readDefaultDataPath: () => temporary });
    await store.references.storeReference(reference('reference-2', 'session-2'));
    const service = createCreativeResearchSelectionService({ references: store.references, now: () => NOW });
    await assert.rejects(
      service.setReferenceSelection({ sessionId: 'session-1', referenceId: 'reference-2', state: 'SELECTED', selectedAttributes: [] }),
      (error: any) => error.code === 'CREATIVE_RESEARCH_SELECTION_REFERENCE_NOT_FOUND',
    );
    await assert.rejects(
      service.setReferenceSelection({ sessionId: 'session-2', referenceId: 'reference-2', state: 'SELECTED', selectedAttributes: ['LIGHTING' as never] }),
      (error: any) => error.code === 'CREATIVE_RESEARCH_SELECTION_STORE_FAILED',
    );
  } finally {
    await fs.rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});

test('R5 rapid selection writes serialize by reference and reload the last submitted state', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'creative-research-r5-concurrency-'));
  try {
    const store = createCreativeResearchResearchStore({ readDefaultDataPath: () => temporary });
    await store.references.storeReference(reference('reference-1'));
    const service = createCreativeResearchSelectionService({ references: store.references, now: () => NOW });
    const writes = [
      service.setReferenceSelection({ sessionId: 'session-1', referenceId: 'reference-1', state: 'SELECTED', selectedAttributes: ['COLOR'] }),
      service.setReferenceSelection({ sessionId: 'session-1', referenceId: 'reference-1', state: 'NONE', selectedAttributes: [] }),
      service.setReferenceSelection({ sessionId: 'session-1', referenceId: 'reference-1', state: 'SELECTED', selectedAttributes: ['MATERIAL'], designerNote: '喜欢纸张材质' }),
    ];
    await Promise.all(writes);
    const [selection] = await store.references.listSelections('session-1');
    assert.equal(selection?.state, 'SELECTED');
    assert.deepEqual(selection?.selectedAttributes, ['MATERIAL']);
    assert.equal(selection?.designerNote, '喜欢纸张材质');
  } finally {
    await fs.rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});
