/**
 * Document Intelligence — Hedging Regression (HD01-HD03)
 *
 * Spec: §40 Hedging Regression
 *   "行业可能属于医美服务"
 *   Expected: industry留空 + unknownFields += 'industry'
 *   Must NOT: AUTHORITATIVE_DOCUMENT_FACT for industry
 *   Reason: hedging 词（可能/似乎/大概/推测/待确认/或许属于）
 *   必须保留 uncertainty；不能因为目标字段是 industry 就升级为 authoritative fact。
 *
 * If the current DVC schema cannot preserve epistemic class for hedged
 * industry values, the spec requires STOP for schema extension
 * (PART M → §58 HOLD_FOR_DVC_SCHEMA_EXTENSION).
 *
 * Strategy: run the full production extraction path with mock model
 * that returns the expected prompt-compliant JSON (industry留空,
 * unknownFields += 'industry'), then assert the DVC / Project Truth
 * shape and that business.industry fact is unknown.
 *
 * Frozen surfaces: unchanged.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildExtractionMessages,
  parseModelJson,
  normalizeExtractedContext,
} from '@masterpiece/creative-intelligence/document-intelligence/index.ts';
import {
  adaptDocumentVisualContext,
} from '@masterpiece/creative-intelligence/truth/adapters/document-visual-context-adapter.ts';
import { PROJECT_TRUTH_KEYS } from '@masterpiece/creative-intelligence/truth/key-registry.ts';

const CTX = { projectId: 'p1', generatedAt: '2026-08-19T00:00:00.000Z', sourceFingerprints: {} };

function runExtractionPath(briefText, modelOutput) {
  const corpus = {
    documents: [
      {
        id: 'd1',
        filename: 'brief.md',
        sourceType: 'markdown',
        title: 'test brief',
        rawText: briefText,
        characterCount: briefText.length,
        pageCount: 1,
        documentRole: 'creative-brief',
        tables: [],
      },
    ],
    sourceIndex: [
      {
        documentId: 'd1',
        filename: 'brief.md',
        sourceType: 'markdown',
        characterCount: briefText.length,
        pageCount: 1,
        documentRole: 'creative-brief',
      },
    ],
  };
  const messages = buildExtractionMessages(corpus);
  const systemPrompt = messages.find((m) => m.role === 'system')?.content || '';
  // The prompt must explicitly declare hedging handling
  assert.ok(
    systemPrompt.includes('hedg') || systemPrompt.includes('MODEL_INFERENCE'),
    'EXTRACTION_SYSTEM_PROMPT must declare hedging / MODEL_INFERENCE handling',
  );
  const parsed = parseModelJson(JSON.stringify(modelOutput));
  const { context: dvc } = normalizeExtractedContext(parsed, corpus, 'r1');
  const { facts } = adaptDocumentVisualContext(dvc, CTX);
  return { dvc, facts };
}

function getFact(facts, key) {
  return facts.find((f) => f.key === key);
}

// =====================================================================
// HD01: 行业可能属于医美服务 → industry 留空, unknownFields += industry
// =====================================================================

test('HD01: 行业可能属于医美服务 → industry 留空, NOT authoritative fact', () => {
  const { dvc, facts } = runExtractionPath('行业可能属于医美服务', {
    brandName: '',
    industry: '',  // HEDGED: must remain empty
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
    unknownFields: ['brandName', 'industry', 'targetAudience', 'businessModel', 'pricePositioning'],
    evidence: [
      { field: 'industry', documentId: 'd1', filename: 'brief.md', section: 'inference', summary: 'hedged=可能；industry 推测医美，不进入 authoritative fact' },
    ],
    conflicts: [],
  });
  // Industry must be empty
  assert.equal(dvc.industry, '', 'HD01: industry must remain empty because hedge=可能');
  // unknownFields must include industry
  assert.ok(dvc.unknownFields.includes('industry'), 'HD01: industry must be in unknownFields');
  // business.industry fact should be null / unknown
  const industryFact = getFact(facts, PROJECT_TRUTH_KEYS.BUSINESS_INDUSTRY);
  assert.equal(industryFact.value, null);
  assert.equal(industryFact.authority, 'UNKNOWN');
  assert.equal(industryFact.status, 'unknown');
  assert.equal(industryFact.truthClass, 'unknown',
    'HD01: industry truthClass must be unknown, NOT fact');
});

// =====================================================================
// HD02: 目标用户似乎为高端消费者 → targetAudience 留空
// =====================================================================

test('HD02: 目标用户似乎为高端消费者 → targetAudience 留空, NOT authoritative', () => {
  const { dvc, facts } = runExtractionPath('目标用户似乎为高端消费者', {
    brandName: '',
    industry: '',
    products: [],
    services: [],
    targetAudience: [],  // HEDGED: must remain empty
    pricePositioning: null,
    businessModel: null,
    brandPersonality: [],
    visualPreferences: [],
    requiredTouchpoints: [],
    lockedFacts: [],
    prohibitedDirections: [],
    unknownFields: ['brandName', 'industry', 'targetAudience', 'businessModel', 'pricePositioning'],
    evidence: [
      { field: 'targetAudience', documentId: 'd1', filename: 'brief.md', section: 'inference', summary: 'hedged=似乎；targetAudience 推测高端消费者' },
    ],
    conflicts: [],
  });
  assert.equal(dvc.targetAudience.length, 0);
  assert.ok(dvc.unknownFields.includes('targetAudience'));
  const audienceFact = getFact(facts, PROJECT_TRUTH_KEYS.AUDIENCE_PRIMARY);
  assert.equal(audienceFact.value, null);
  assert.equal(audienceFact.authority, 'UNKNOWN');
});

// =====================================================================
// HD03: 价格大概在中高端 → pricePositioning 留空
// =====================================================================

test('HD03: 价格大概在中高端 → pricePositioning 留空, NOT authoritative', () => {
  const { dvc, facts } = runExtractionPath('价格大概在中高端', {
    brandName: '',
    industry: '',
    products: [],
    services: [],
    targetAudience: [],
    pricePositioning: null,  // HEDGED
    businessModel: null,
    brandPersonality: [],
    visualPreferences: [],
    requiredTouchpoints: [],
    lockedFacts: [],
    prohibitedDirections: [],
    unknownFields: ['brandName', 'industry', 'targetAudience', 'pricePositioning', 'businessModel'],
    evidence: [
      { field: 'pricePositioning', documentId: 'd1', filename: 'brief.md', section: 'inference', summary: 'hedged=大概' },
    ],
    conflicts: [],
  });
  assert.equal(dvc.pricePositioning, null);
  assert.ok(dvc.unknownFields.includes('pricePositioning'));
  const priceFact = getFact(facts, PROJECT_TRUTH_KEYS.PRICE_POSITIONING);
  assert.equal(priceFact.value, null);
  assert.equal(priceFact.authority, 'UNKNOWN');
});
