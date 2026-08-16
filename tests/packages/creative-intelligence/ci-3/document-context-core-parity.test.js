import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * CI-3 document-context-core parity tests.
 *
 * Spec #43: old/new path must return identical output for:
 *   validateDocumentVisualContext / parseModelJson / normalization /
 *   unknown field handling / evidence normalization / source documents /
 *   warnings / visual strategy corpus normalization.
 *
 * Strategy: invoke the same logic on both paths. Because the runtime-core
 * file is now a thin facade re-exporting from CI, the two are the same code.
 * We assert that they are literally identical references for the function
 * objects, then exercise parity through the public CI path.
 */

import * as oldCore from '@masterpiece/runtime-core/application/document-context-core.ts';
import * as newCore from '@masterpiece/creative-intelligence/document-intelligence/document-context-core.ts';

const EXPECTED_EXPORTS = [
  'DOCUMENT_CONTEXT_SCHEMA_VERSION',
  'adaptLegacyVisualTranslationResult',
  'buildExtractionMessages',
  'buildRepairMessages',
  'compileContextBrief',
  'isContextEmpty',
  'normalizeExtractedContext',
  'parseModelJson',
  'validateDocumentVisualContext',
];

const VALID_DVC = {
  schemaVersion: '1.0',
  sourceRunId: 'r1',
  generatedAt: '2026-01-01T00:00:00.000Z',
  brandName: 'TestBrand',
  industry: 'tech',
  products: ['app'],
  services: ['support'],
  targetAudience: ['enterprise'],
  pricePositioning: 'premium',
  businessModel: 'B2B',
  brandPersonality: ['innovator'],
  visualPreferences: ['minimal'],
  requiredTouchpoints: ['logo'],
  lockedFacts: ['use-blue'],
  prohibitedDirections: ['no-flashy'],
  unknownFields: [],
  evidence: [
    {
      field: 'brandName',
      documentId: 'd1',
      filename: 'brief.pdf',
      summary: 'Brand is TestBrand',
      section: 'intro',
      page: 1,
    },
  ],
  sourceDocuments: [
    {
      documentId: 'd1',
      filename: 'brief.pdf',
      sourceType: 'pdf',
      characterCount: 1000,
      pageCount: 5,
    },
  ],
};

const VALID_CORPUS = {
  documents: [
    {
      id: 'd1',
      filename: 'brief.pdf',
      sourceType: 'pdf',
      title: 'Brief',
      rawText: 'TestBrand is a tech company.',
      characterCount: 1000,
      pageCount: 5,
      documentRole: 'creative-brief',
      tables: [],
    },
  ],
  sourceIndex: [
    {
      documentId: 'd1',
      filename: 'brief.pdf',
      sourceType: 'pdf',
      characterCount: 1000,
      pageCount: 5,
      documentRole: 'creative-brief',
    },
  ],
};

test('CI-3 parity: export set matches', () => {
  for (const name of EXPECTED_EXPORTS) {
    assert.ok(name in newCore, `newCore missing export: ${name}`);
    assert.ok(name in oldCore, `oldCore missing export: ${name}`);
  }
});

test('CI-3 parity: facade re-exports the same function references', () => {
  for (const name of EXPECTED_EXPORTS) {
    if (typeof newCore[name] === 'function') {
      assert.equal(oldCore[name], newCore[name], `${name} should be the same function reference via facade`);
    } else {
      assert.equal(oldCore[name], newCore[name], `${name} should be the same constant via facade`);
    }
  }
});

test('CI-3 parity: validateDocumentVisualContext — valid packet', () => {
  const oldResult = oldCore.validateDocumentVisualContext(VALID_DVC);
  const newResult = newCore.validateDocumentVisualContext(VALID_DVC);
  assert.deepEqual(newResult, oldResult);
  assert.equal(newResult.valid, true);
  assert.equal(newResult.errors.length, 0);
});

test('CI-3 parity: validateDocumentVisualContext — corrupted input', () => {
  const oldResult = oldCore.validateDocumentVisualContext(null);
  const newResult = newCore.validateDocumentVisualContext(null);
  assert.deepEqual(newResult, oldResult);
  assert.equal(newResult.valid, false);
});

test('CI-3 parity: validateDocumentVisualContext — schema mismatch', () => {
  const bad = { ...VALID_DVC, schemaVersion: '0.9' };
  const oldResult = oldCore.validateDocumentVisualContext(bad);
  const newResult = newCore.validateDocumentVisualContext(bad);
  assert.deepEqual(newResult, oldResult);
});

test('CI-3 parity: parseModelJson — extracts JSON from markdown', () => {
  const input = '```json\n{"brandName":"X","industry":"y"}\n```';
  const oldResult = oldCore.parseModelJson(input);
  const newResult = newCore.parseModelJson(input);
  assert.deepEqual(newResult, oldResult);
});

test('CI-3 parity: parseModelJson — throws on no JSON', () => {
  assert.throws(() => oldCore.parseModelJson('plain text'));
  assert.throws(() => newCore.parseModelJson('plain text'));
});

test('CI-3 parity: parseModelJson — handles BOM', () => {
  const input = '\uFEFF{"a":1}';
  assert.deepEqual(newCore.parseModelJson(input), oldCore.parseModelJson(input));
});

test('CI-3 parity: normalizeExtractedContext — produces identical context', () => {
  const raw = {
    brandName: 'TestBrand',
    industry: 'tech',
    products: ['app'],
    services: ['support'],
    targetAudience: ['enterprise'],
    pricePositioning: 'premium',
    businessModel: 'B2B',
    brandPersonality: ['innovator'],
    visualPreferences: ['minimal'],
    requiredTouchpoints: ['logo'],
    lockedFacts: ['use-blue'],
    prohibitedDirections: ['no-flashy'],
    unknownFields: [],
    evidence: [
      { field: 'brandName', documentId: 'd1', filename: 'brief.pdf', summary: 'X', section: 'intro' },
    ],
    conflicts: [],
  };
  const oldResult = oldCore.normalizeExtractedContext(raw, VALID_CORPUS, 'r1', () => '2026-01-01T00:00:00.000Z');
  const newResult = newCore.normalizeExtractedContext(raw, VALID_CORPUS, 'r1', () => '2026-01-01T00:00:00.000Z');
  assert.deepEqual(newResult, oldResult);
});

test('CI-3 parity: normalizeExtractedContext — unknown fields preserved', () => {
  const raw = {
    brandName: 'X',
    industry: 'tech',
    products: [],
    services: [],
    targetAudience: [], // empty → must become unknown
    pricePositioning: null,
    businessModel: null,
    brandPersonality: [],
    visualPreferences: [],
    requiredTouchpoints: [],
    lockedFacts: [],
    prohibitedDirections: [],
    unknownFields: ['targetAudience'],
    evidence: [],
    conflicts: [],
  };
  const oldResult = oldCore.normalizeExtractedContext(raw, VALID_CORPUS, 'r1', () => '2026-01-01T00:00:00.000Z');
  const newResult = newCore.normalizeExtractedContext(raw, VALID_CORPUS, 'r1', () => '2026-01-01T00:00:00.000Z');
  assert.deepEqual(newResult, oldResult);
  assert.ok(newResult.context.unknownFields.includes('targetAudience'));
});

test('CI-3 parity: normalizeExtractedContext — drops evidence for unknown document', () => {
  const raw = {
    brandName: 'X',
    industry: '',
    products: [],
    services: [],
    targetAudience: [],
    pricePositioning: null,
    businessModel: null,
    brandPersonality: [],
    visualPreferences: [],
    requiredTouchpoints: [],
    lockedFacts: [],
    prohibitedDirections: [],
    unknownFields: [],
    evidence: [
      { field: 'brandName', documentId: 'unknown-doc', filename: 'x.pdf', summary: 'X' },
    ],
    conflicts: [],
  };
  const oldResult = oldCore.normalizeExtractedContext(raw, VALID_CORPUS, 'r1', () => '2026-01-01T00:00:00.000Z');
  const newResult = newCore.normalizeExtractedContext(raw, VALID_CORPUS, 'r1', () => '2026-01-01T00:00:00.000Z');
  assert.deepEqual(newResult, oldResult);
  assert.equal(newResult.context.evidence.length, 0); // evidence dropped
});

test('CI-3 parity: isContextEmpty — empty DVC', () => {
  const empty = { ...VALID_DVC, brandName: '', industry: '', products: [], services: [], targetAudience: [], pricePositioning: null, businessModel: null, brandPersonality: [], visualPreferences: [], requiredTouchpoints: [], lockedFacts: [], prohibitedDirections: [], unknownFields: ['brandName', 'industry'] };
  assert.equal(newCore.isContextEmpty(empty), oldCore.isContextEmpty(empty));
  assert.equal(newCore.isContextEmpty(empty), true);
});

test('CI-3 parity: compileContextBrief — identical output', () => {
  const oldBrief = oldCore.compileContextBrief(VALID_DVC);
  const newBrief = newCore.compileContextBrief(VALID_DVC);
  assert.equal(newBrief, oldBrief);
  assert.ok(newBrief.includes('TestBrand'));
});

test('CI-3 parity: buildExtractionMessages — identical output', () => {
  const oldMsgs = oldCore.buildExtractionMessages(VALID_CORPUS);
  const newMsgs = newCore.buildExtractionMessages(VALID_CORPUS);
  assert.deepEqual(newMsgs, oldMsgs);
  assert.equal(newMsgs.length, 2);
  assert.equal(newMsgs[0].role, 'system');
});

test('CI-3 parity: buildRepairMessages — identical output', () => {
  const oldMsgs = oldCore.buildRepairMessages('{"x":1}', ['error1', 'error2']);
  const newMsgs = newCore.buildRepairMessages('{"x":1}', ['error1', 'error2']);
  assert.deepEqual(newMsgs, oldMsgs);
});

test('CI-3 parity: adaptLegacyVisualTranslationResult — identical output (ignoring timestamp)', () => {
  const legacy = {
    run: { id: 'r1', projectName: 'X', documentNames: ['brief.pdf'] },
    visualBrief: {
      brandName: 'LegacyBrand',
      industry: 'tech',
      targetAudience: ['enterprise'],
      products: ['app'],
      lockedFacts: ['use-blue'],
    },
  };
  const oldResult = oldCore.adaptLegacyVisualTranslationResult(legacy);
  const newResult = newCore.adaptLegacyVisualTranslationResult(legacy);
  // generatedAt uses Date.now() — non-deterministic. Compare all other fields.
  assert.equal(newResult.brandName, oldResult.brandName);
  assert.equal(newResult.industry, oldResult.industry);
  assert.deepEqual(newResult.products, oldResult.products);
  assert.deepEqual(newResult.targetAudience, oldResult.targetAudience);
  assert.deepEqual(newResult.lockedFacts, oldResult.lockedFacts);
  assert.deepEqual(newResult.unknownFields, oldResult.unknownFields);
  assert.equal(newResult.schemaVersion, oldResult.schemaVersion);
  assert.equal(newResult.sourceRunId, oldResult.sourceRunId);
  assert.deepEqual(newResult.sourceDocuments, oldResult.sourceDocuments);
});

test('CI-3 parity: deterministic output across runs', () => {
  const fixedNow = () => '2026-01-01T00:00:00.000Z';
  const raw = {
    brandName: 'Det',
    industry: 'tech',
    products: ['a'],
    services: ['b'],
    targetAudience: ['c'],
    pricePositioning: 'p',
    businessModel: 'm',
    brandPersonality: ['x'],
    visualPreferences: ['y'],
    requiredTouchpoints: ['z'],
    lockedFacts: ['l'],
    prohibitedDirections: ['d'],
    unknownFields: [],
    evidence: [],
    conflicts: [],
  };
  const a = newCore.normalizeExtractedContext(raw, VALID_CORPUS, 'r1', fixedNow);
  const b = newCore.normalizeExtractedContext(raw, VALID_CORPUS, 'r1', fixedNow);
  assert.deepEqual(a, b);
});

test('CI-3 parity: immutability — input not mutated', () => {
  const input = { ...VALID_DVC };
  const before = JSON.stringify(input);
  newCore.validateDocumentVisualContext(input);
  newCore.compileContextBrief(input);
  newCore.isContextEmpty(input);
  assert.equal(JSON.stringify(input), before);
});
