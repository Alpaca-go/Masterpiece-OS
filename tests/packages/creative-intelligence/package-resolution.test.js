import assert from 'node:assert/strict';
import test from 'node:test';

// CI-1A: verify the package resolves and has the expected shape.
// We import by package name to verify workspace resolution works.

import {
  InMemoryEvidenceLedger,
} from '@masterpiece/creative-intelligence/evidence/index.ts';

test('CI package — evidence exports resolve from package name', () => {
  assert.ok(typeof InMemoryEvidenceLedger === 'function');
});

test('CI package — truth module is importable', async () => {
  // Truth module only exports types in CI-1 (no runtime values).
  // Importing it should not throw.
  const mod = await import('@masterpiece/creative-intelligence/truth/index.ts');
  assert.ok(mod !== null && typeof mod === 'object');
});

test('CI package — contracts module is importable', async () => {
  const mod = await import('@masterpiece/creative-intelligence/contracts/index.ts');
  assert.ok(mod !== null && typeof mod === 'object');
});

test('CI package — decisions module is importable (skeleton in CI-1A)', async () => {
  const mod = await import('@masterpiece/creative-intelligence/decisions/index.ts');
  assert.ok(mod !== null && typeof mod === 'object');
});

test('CI package — root index re-exports all namespaces', async () => {
  const mod = await import('@masterpiece/creative-intelligence/index.ts');
  assert.ok(typeof mod.InMemoryEvidenceLedger === 'function');
});

test('CI package — InMemoryEvidenceLedger basic operations', () => {
  const ledger = new InMemoryEvidenceLedger();
  assert.equal(ledger.list().length, 0);

  const entry = ledger.add({
    id: 'e1',
    type: 'document_section',
    sourceId: 'doc-1',
    content: 'Brand positioning is premium.',
  });

  assert.equal(entry.id, 'e1');
  assert.equal(ledger.has('e1'), true);
  assert.equal(ledger.has('nonexistent'), false);
  assert.equal(ledger.get('e1')?.type, 'document_section');
  assert.equal(ledger.get('nonexistent'), undefined);
  assert.equal(ledger.list().length, 1);
});

test('CI package — evidence ledger rejects duplicate IDs (no silent overwrite)', () => {
  const ledger = new InMemoryEvidenceLedger();
  ledger.add({ id: 'dup-test', type: 'user_input', sourceId: 'u1' });
  assert.throws(
    () => ledger.add({ id: 'dup-test', type: 'user_input', sourceId: 'u2' }),
    /already exists/,
  );
  // Original entry unchanged
  assert.equal(ledger.get('dup-test')?.sourceId, 'u1');
  // Only one entry (not replaced, not duplicated)
  assert.equal(ledger.list().length, 1);
});

test('CI package — evidence ledger list preserves insertion order', () => {
  const ledger = new InMemoryEvidenceLedger();
  ledger.add({ id: 'third', type: 'locked_asset', sourceId: 's1' });
  ledger.add({ id: 'first', type: 'locked_asset', sourceId: 's2' });
  ledger.add({ id: 'second', type: 'locked_asset', sourceId: 's1' });
  const ids = ledger.list().map((e) => e.id);
  assert.deepEqual(ids, ['third', 'first', 'second']);
});

test('CI package — evidence ledger findBySource preserves insertion order', () => {
  const ledger = new InMemoryEvidenceLedger();
  ledger.add({ id: 'a', type: 'document_section', sourceId: 'src-A' });
  ledger.add({ id: 'b', type: 'document_section', sourceId: 'src-B' });
  ledger.add({ id: 'c', type: 'document_section', sourceId: 'src-A' });
  const found = ledger.findBySource('src-A');
  assert.equal(found.length, 2);
  assert.equal(found[0].id, 'a');
  assert.equal(found[1].id, 'c');
});

test('CI package — evidence ledger supports all EvidenceType values', () => {
  const ledger = new InMemoryEvidenceLedger();
  const types = [
    'document_section',
    'visual_asset',
    'user_input',
    'locked_asset',
    'model_inference',
    'external_reference',
  ];
  for (const type of types) {
    ledger.add({ id: `type-${type}`, type, sourceId: `src-${type}` });
  }
  assert.equal(ledger.list().length, types.length);
});

test('CI package — evidence ledger entry carries all optional fields', () => {
  const ledger = new InMemoryEvidenceLedger();
  const entry = ledger.add({
    id: 'full-entry',
    type: 'document_section',
    sourceId: 'doc-001',
    content: 'Sample text content.',
    documentId: 'doc-001',
    filename: 'brand-strategy.pdf',
    section: '2.1 Brand Positioning',
    page: 42,
    confidence: 0.95,
    sourceFingerprint: 'sha256:abcdef123456',
    createdAt: '2026-08-16T00:00:00.000Z',
  });
  assert.equal(entry.id, 'full-entry');
  assert.equal(entry.documentId, 'doc-001');
  assert.equal(entry.filename, 'brand-strategy.pdf');
  assert.equal(entry.section, '2.1 Brand Positioning');
  assert.equal(entry.page, 42);
  assert.equal(entry.confidence, 0.95);
  assert.equal(entry.sourceFingerprint, 'sha256:abcdef123456');
  assert.equal(entry.createdAt, '2026-08-16T00:00:00.000Z');
});
