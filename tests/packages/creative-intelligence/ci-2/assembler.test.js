import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * CI-2 assembler + shadow integration tests.
 *
 * Spec #22 / #31: pure deterministic assembler; stable ordering.
 * Spec #27-#32: shadow mode.
 */

import { assembleProjectTruth } from '@masterpiece/creative-intelligence/truth/assembler.ts';
import { runShadowProjectTruth } from '@masterpiece/creative-intelligence/integration/shadow-project-truth.ts';
import { adaptProjectRecord } from '@masterpiece/creative-intelligence/truth/adapters/project-record-adapter.ts';
import { adaptDocumentVisualContext } from '@masterpiece/creative-intelligence/truth/adapters/document-visual-context-adapter.ts';
import { PROJECT_TRUTH_KEYS } from '@masterpiece/creative-intelligence/truth/key-registry.ts';

const CTX = { projectId: 'p1', generatedAt: '2026-01-01T00:00:00.000Z', sourceFingerprints: {} };

test('CI-2 assembler: stable output across runs', () => {
  const inputs = {
    projectRecord: { id: 'p1', brandName: 'X', industry: 'tech' },
    documentVisualContext: { sourceRunId: 'r1', brandName: 'X', industry: 'tech' },
  };
  const carrierOutputs = [
    adaptProjectRecord(inputs.projectRecord, CTX),
    adaptDocumentVisualContext(inputs.documentVisualContext, CTX),
  ];
  const a = assembleProjectTruth({ projectId: 'p1', carrierOutputs, context: CTX });
  const b = assembleProjectTruth({ projectId: 'p1', carrierOutputs, context: CTX });
  assert.deepEqual(a.truth, b.truth);
  assert.deepEqual(a.ledger, b.ledger);
  assert.deepEqual(a.resolutions, b.resolutions);
  assert.deepEqual(a.conflicts, b.conflicts);
});

test('CI-2 assembler: facts sorted by key then id', () => {
  const carrierOutputs = [
    adaptProjectRecord({ id: 'p1', brandName: 'Z' }, CTX),
    adaptProjectRecord({ id: 'p2', brandName: 'A' }, CTX),
  ];
  const result = assembleProjectTruth({ projectId: 'p1', carrierOutputs, context: CTX });
  const keys = result.truth.facts.map((f) => f.key);
  const sortedKeys = [...keys].sort();
  assert.deepEqual(keys, sortedKeys);
});

test('CI-2 assembler: provenance is shadow mode', () => {
  const result = assembleProjectTruth({ projectId: 'p1', carrierOutputs: [], context: CTX });
  assert.equal(result.truth.provenance.mode, 'shadow');
});

test('CI-2 assembler: ledger deduplicates by id', () => {
  const out1 = adaptProjectRecord({ id: 'p1', brandName: 'X' }, CTX);
  const out2 = adaptProjectRecord({ id: 'p1', brandName: 'X' }, CTX); // same evidence ids
  const result = assembleProjectTruth({
    projectId: 'p1',
    carrierOutputs: [out1, out2],
    context: CTX,
  });
  // ProjectRecord adapter emits 2 evidence entries per call. With duplicate
  // ids across calls, the ledger should not contain duplicates.
  const allIds = result.ledger.entries.map((e) => e.id);
  assert.equal(new Set(allIds).size, allIds.length, 'evidence ids must be unique');
});

test('CI-2 assembler: empty carriers produce empty truth model', () => {
  const result = assembleProjectTruth({ projectId: 'p1', carrierOutputs: [], context: CTX });
  assert.equal(result.truth.facts.length, 0);
  assert.equal(result.truth.conflicts.length, 0);
  assert.equal(result.truth.provenance.mode, 'shadow');
});

test('CI-2 assembler: deterministic for empty carriers', () => {
  const a = assembleProjectTruth({ projectId: 'p1', carrierOutputs: [], context: CTX });
  const b = assembleProjectTruth({ projectId: 'p1', carrierOutputs: [], context: CTX });
  assert.deepEqual(a, b);
});

test('CI-2 assembler: unknown facts are categorized as unknown, not dropped', () => {
  const out = adaptProjectRecord({ id: 'p1' }, CTX); // no brandName
  const result = assembleProjectTruth({ projectId: 'p1', carrierOutputs: [out], context: CTX });
  const unknowns = result.truth.unknowns;
  assert.ok(unknowns.includes(PROJECT_TRUTH_KEYS.BRAND_NAME));
});

test('CI-2 assembler: assumptions categorize inference', () => {
  const out = adaptProjectRecord({ id: 'p1', detectedBrandName: 'Detected' }, CTX);
  const result = assembleProjectTruth({ projectId: 'p1', carrierOutputs: [out], context: CTX });
  assert.ok(result.truth.assumptions.includes(PROJECT_TRUTH_KEYS.BRAND_NAME));
});

test('CI-2 shadow: end-to-end with mixed carriers', () => {
  const carrierOutputs = [
    adaptProjectRecord({ id: 'p1', brandName: 'Acme', industry: 'tech' }, CTX),
    adaptDocumentVisualContext(
      { sourceRunId: 'r1', brandName: 'Acme', industry: 'tech', products: ['app'] },
      CTX,
    ),
  ];
  const result = runShadowProjectTruth({
    projectId: 'p1',
    carrierOutputs,
    context: CTX,
    currentCarrierValues: {
      'brand.name': 'Acme',
      'business.industry': 'tech',
    },
  });
  assert.equal(result.assembled.truth.provenance.mode, 'shadow');
  assert.equal(result.report.authoritative, false);
  assert.equal(result.report.mode, 'shadow');
  // All 5 canonical keys should be present in the validation report.
  assert.ok(result.validation.summary.totalKeys >= 5);
});

test('CI-2 shadow: artifacts include authoritative=false and mode=shadow', () => {
  const result = runShadowProjectTruth({
    projectId: 'p1',
    carrierOutputs: [adaptProjectRecord({ id: 'p1', brandName: 'X' }, CTX)],
    context: CTX,
  });
  assert.equal(result.report.authoritative, false);
  assert.equal(result.report.mode, 'shadow');
  assert.ok(result.report.ciVersion);
  assert.ok(result.report.projectTruth.provenance.mode === 'shadow');
});

test('CI-2 shadow: reference carrier tagged isReferenceFact=true but does not contaminate brand.name', () => {
  const refOut = adaptProjectRecord(
    { id: 'ref1', brandName: 'RefBrand', activeReferenceSource: { projectId: 'ref1' } },
    CTX,
  );
  // Mark reference output facts.
  refOut.facts.forEach((f) => { f.isReferenceFact = true; });
  const curOut = adaptProjectRecord({ id: 'p1', brandName: 'CurBrand' }, CTX);
  const result = runShadowProjectTruth({
    projectId: 'p1',
    carrierOutputs: [curOut],
    referenceOutputs: [refOut],
    context: CTX,
    currentCarrierValues: { 'brand.name': 'CurBrand' },
  });
  const bnResolution = result.assembled.resolutions.find((r) => r.key === PROJECT_TRUTH_KEYS.BRAND_NAME);
  assert.ok(bnResolution);
  // Selected should be current, not reference.
  const selectedFact = result.assembled.truth.facts.find((f) => f.id === bnResolution.selectedFactId);
  assert.ok(selectedFact);
  assert.equal(selectedFact.isReferenceFact, false);
});
