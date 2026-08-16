import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * CI-2 evidence tests.
 *
 * Spec #16-#20: stable ids, deterministic dedup, source/document/asset
 *                lookups, serializable snapshot.
 * Spec #21: confidence preserved iff source provided; never invented.
 */

import { InMemoryEvidenceLedger } from '@masterpiece/creative-intelligence/evidence/in-memory-ledger.ts';
import {
  normalizeDocumentEvidence,
  normalizeVisualEvidence,
  normalizeLockedAssetEvidence,
  normalizeUserEvidence,
  normalizeModelEvidence,
} from '@masterpiece/creative-intelligence/evidence/normalizer.ts';
import {
  findEvidenceBySource,
  findEvidenceByDocument,
  findEvidenceByAsset,
  findReferenceEvidence,
  snapshotLedger,
} from '@masterpiece/creative-intelligence/evidence/source-index.ts';

test('CI-2 evidence: stable ids across runs', () => {
  const a = normalizeDocumentEvidence({
    documentId: 'doc1', section: 'intro', page: 1, excerpt: 'hello',
    sourceType: 'document_visual_context', sourceId: 'r1', createdAt: '2026-01-01',
  });
  const b = normalizeDocumentEvidence({
    documentId: 'doc1', section: 'intro', page: 1, excerpt: 'hello',
    sourceType: 'document_visual_context', sourceId: 'r1', createdAt: '2026-01-01',
  });
  assert.equal(a.id, b.id);
  assert.equal(a.id, 'doc:doc1:intro');
});

test('CI-2 evidence: dedup rejects duplicate id with no silent overwrite', () => {
  const ledger = new InMemoryEvidenceLedger({ projectId: 'p1' });
  const e1 = normalizeDocumentEvidence({
    documentId: 'doc1', section: 'intro', sourceType: 'dvc', sourceId: 'r1', createdAt: '2026-01-01',
  });
  ledger.add(e1);
  assert.throws(
    () => ledger.add({ ...e1 }),
    /already exists/,
  );
});

test('CI-2 evidence: source lookup', () => {
  const ledger = new InMemoryEvidenceLedger({ projectId: 'p1' });
  const e1 = normalizeDocumentEvidence({
    documentId: 'd1', sourceType: 'dvc', sourceId: 'r1', createdAt: '2026-01-01',
  });
  const e2 = normalizeVisualEvidence({
    assetId: 'a1', sourceType: 'vuc', sourceId: 'r2', createdAt: '2026-01-01',
  });
  ledger.add(e1);
  ledger.add(e2);
  assert.equal(findEvidenceBySource(ledger, 'r1').length, 1);
  assert.equal(findEvidenceBySource(ledger, 'r2').length, 1);
});

test('CI-2 evidence: document lookup', () => {
  const ledger = new InMemoryEvidenceLedger({ projectId: 'p1' });
  const e1 = normalizeDocumentEvidence({
    documentId: 'd1', section: 's1', sourceType: 'dvc', sourceId: 'r1', createdAt: '2026-01-01',
  });
  const e2 = normalizeDocumentEvidence({
    documentId: 'd1', section: 's2', sourceType: 'dvc', sourceId: 'r1', createdAt: '2026-01-01',
  });
  ledger.add(e1);
  ledger.add(e2);
  assert.equal(findEvidenceByDocument(ledger, 'd1').length, 2);
});

test('CI-2 evidence: asset lookup', () => {
  const ledger = new InMemoryEvidenceLedger({ projectId: 'p1' });
  const e1 = normalizeVisualEvidence({
    assetId: 'a1', sourceType: 'vuc', sourceId: 'r1', createdAt: '2026-01-01',
  });
  const e2 = normalizeLockedAssetEvidence({
    assetId: 'a1', sourceType: 'cpcp', sourceId: 'r1', createdAt: '2026-01-01',
  });
  ledger.add(e1);
  ledger.add(e2);
  assert.equal(findEvidenceByAsset(ledger, 'a1').length, 2);
});

test('CI-2 evidence: reference evidence lookup', () => {
  const ledger = new InMemoryEvidenceLedger({ projectId: 'p1' });
  const ref = normalizeDocumentEvidence({
    documentId: 'd1', sourceType: 'dvc', sourceId: 'r1', createdAt: '2026-01-01',
  });
  const cur = normalizeDocumentEvidence({
    documentId: 'd2', sourceType: 'dvc', sourceId: 'r1', createdAt: '2026-01-01',
  });
  // Manually mark ref as reference.
  ref.isReferenceEvidence = true;
  ledger.add(ref);
  ledger.add(cur);
  assert.equal(findReferenceEvidence(ledger).length, 1);
});

test('CI-2 evidence: snapshot is serializable (JSON.stringify round trip)', () => {
  const ledger = new InMemoryEvidenceLedger({ projectId: 'p1' });
  ledger.add(normalizeUserEvidence({ sourceId: 'u1', content: 'hello', createdAt: '2026-01-01' }));
  ledger.add(normalizeModelEvidence({
    runId: 'm1', fieldPath: 'brandName', sourceType: 'vuc', sourceId: 'r1',
    createdAt: '2026-01-01',
  }));
  const snap = snapshotLedger(ledger);
  assert.equal(snap.schemaVersion, '0.1');
  assert.equal(snap.projectId, 'p1');
  assert.equal(snap.entries.length, 2);
  // JSON round trip preserves data.
  const round = JSON.parse(JSON.stringify(snap));
  assert.equal(round.entries.length, 2);
  assert.equal(round.entries[0].type, 'user_input');
  assert.equal(round.entries[1].type, 'model_inference');
});

test('CI-2 evidence: confidence preserved iff source provided', () => {
  const withConf = normalizeVisualEvidence({
    assetId: 'a1', confidence: 0.9, sourceType: 'vuc', sourceId: 'r1', createdAt: '2026-01-01',
  });
  const withoutConf = normalizeVisualEvidence({
    assetId: 'a2', sourceType: 'vuc', sourceId: 'r1', createdAt: '2026-01-01',
  });
  assert.equal(withConf.confidence, 0.9);
  assert.equal(withoutConf.confidence, undefined);
});

test('CI-2 evidence: deterministic insertion order', () => {
  const ledger = new InMemoryEvidenceLedger({ projectId: 'p1' });
  const a = normalizeUserEvidence({ sourceId: 'u1', createdAt: '2026-01-01' });
  const b = normalizeUserEvidence({ sourceId: 'u2', createdAt: '2026-01-01' });
  const c = normalizeUserEvidence({ sourceId: 'u3', createdAt: '2026-01-01' });
  ledger.add(a);
  ledger.add(b);
  ledger.add(c);
  assert.deepEqual(ledger.list().map((e) => e.id), [a.id, b.id, c.id]);
});
