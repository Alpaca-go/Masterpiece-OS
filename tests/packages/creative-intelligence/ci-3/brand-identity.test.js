/**
 * Document Intelligence — Brand Identity Regression (BI01-BI03)
 *
 * Spec: §39 Brand Identity Regression
 *   "品牌名称必须保持为一剂良方"
 *   Expected: brandName = "一剂良方"
 *   Must NOT: lockedFacts = ["一剂良方"]
 *   Reason: brand identity value must NOT become a second conflicting
 *   carrier that would create a false identity_mismatch / locked_value_violation
 *   against project.json.
 *
 * Strategy: run the full production extraction path with mock model
 * that returns the expected prompt-compliant JSON, then assert
 * the DVC / Project Truth shape.
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
import { detectConflicts } from '@masterpiece/creative-intelligence/truth/conflict-detector.ts';

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
  // Brand identity special rule must be in the prompt
  assert.ok(
    systemPrompt.includes('brandName') && systemPrompt.includes('lockedFacts'),
    'EXTRACTION_SYSTEM_PROMPT must keep brandName/lockedFacts distinction for brand identity',
  );
  // The prompt must explicitly say brand identity is NOT to be copied into lockedFacts
  assert.ok(
    systemPrompt.includes('品牌身份') || systemPrompt.includes('brand identity'),
    'EXTRACTION_SYSTEM_PROMPT must declare brand identity special rule',
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
// BI01: 品牌名称是九州美学 → brandName FACT
// =====================================================================

test('BI01: 品牌名称是九州美学 → brandName FACT (no locked duplicate)', () => {
  const { dvc, facts } = runExtractionPath('品牌名称是九州美学', {
    brandName: '九州美学',
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
    unknownFields: ['industry', 'targetAudience'],
    evidence: [
      { field: 'brandName', documentId: 'd1', filename: 'brief.md', section: 'title', summary: '品牌名为九州美学' },
    ],
    conflicts: [],
  });
  assert.equal(dvc.brandName, '九州美学');
  const brandNameFact = getFact(facts, PROJECT_TRUTH_KEYS.BRAND_NAME);
  assert.equal(brandNameFact.value, '九州美学');
  assert.equal(brandNameFact.truthClass, 'fact');
  const lockedFact = getFact(facts, PROJECT_TRUTH_KEYS.LOCKED_FACTS);
  assert.ok(!lockedFact.value || !lockedFact.value.includes('九州美学'),
    'BI01: brand identity must not be duplicated into lockedFacts');
});

// =====================================================================
// BI02: 品牌名称必须保持为一剂良方 → brandName, NO duplicate locked carrier
// =====================================================================

test('BI02: 品牌名称必须保持为一剂良方 → brandName FACT, NO duplicate lockedFacts', () => {
  const { dvc, facts } = runExtractionPath('品牌名称必须保持为一剂良方', {
    brandName: '一剂良方',
    industry: '',
    products: [],
    services: [],
    targetAudience: [],
    pricePositioning: null,
    businessModel: null,
    brandPersonality: [],
    visualPreferences: [],
    requiredTouchpoints: [],
    lockedFacts: [],  // MUST be empty — "一剂良方" is brand identity, not a lock
    prohibitedDirections: [],
    unknownFields: ['industry', 'targetAudience'],
    evidence: [
      { field: 'brandName', documentId: 'd1', filename: 'brief.md', section: 'title', summary: '品牌名为一剂良方' },
    ],
    conflicts: [],
  });
  // brandName must be "一剂良方"
  assert.equal(dvc.brandName, '一剂良方');
  const brandNameFact = getFact(facts, PROJECT_TRUTH_KEYS.BRAND_NAME);
  assert.equal(brandNameFact.value, '一剂良方');
  assert.equal(brandNameFact.truthClass, 'fact');
  // lockedFacts must NOT contain "一剂良方"
  const lockedFact = getFact(facts, PROJECT_TRUTH_KEYS.LOCKED_FACTS);
  assert.ok(!lockedFact.value || !lockedFact.value.includes('一剂良方'),
    `BI02: brand identity must not be duplicated into lockedFacts; got ${JSON.stringify(lockedFact.value)}`);
  // Also, the brandName authority should be AUTHORITATIVE_DOCUMENT_FACT
  // (because the brief declared the identity), not LOCKED
  assert.equal(brandNameFact.authority, 'AUTHORITATIVE_DOCUMENT_FACT',
    'BI02: brandName must remain AUTHORITATIVE_DOCUMENT_FACT, not LOCKED');
});

// =====================================================================
// BI03: Project-side brand identity fact should not be duplicated as locked
//   Carrier: project.json says brand.name = "一剂良方" with LOCKED authority
//   Document: says "品牌名称是一剂良方" (FACT)
//   Expected: no value_mismatch, no locked_value_violation
// =====================================================================

test('BI03: project_record brand.name + document brand.name match → no false conflict', () => {
  const { facts } = runExtractionPath('品牌名称是一剂良方', {
    brandName: '一剂良方',
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
    unknownFields: ['industry', 'targetAudience'],
    evidence: [],
    conflicts: [],
  });
  // Simulate the project_record carrier adding a LOCKED brand.name
  const projectRecordBrandName = {
    id: 'project_record:p1:brand.name',
    key: PROJECT_TRUTH_KEYS.BRAND_NAME,
    value: '一剂良方',
    truthClass: 'fact',
    status: 'observed',
    authority: 'AUTHORITATIVE_PROJECT_METADATA',
    sourceType: 'project_record',
    sourceId: 'p1',
    createdAt: CTX.generatedAt,
    evidenceRefs: [],
    isReferenceFact: false,
  };
  const conflicts = detectConflicts({ facts: [...facts, projectRecordBrandName] });
  // When values match but authorities differ, the production detector raises
  // source_authority_mismatch (informational), NOT identity_mismatch.
  // BI03 is asserting: no value-mismatch / no identity_mismatch / no locked violation.
  const identityMismatch = conflicts.find((c) => c.type === 'identity_mismatch');
  assert.ok(!identityMismatch, 'BI03: matching brand names must NOT raise identity_mismatch');
  const valueMismatch = conflicts.find((c) => c.type === 'value_mismatch' && c.key === PROJECT_TRUTH_KEYS.BRAND_NAME);
  assert.ok(!valueMismatch, 'BI03: matching brand names must NOT raise value_mismatch');
  const lockedViolation = conflicts.find((c) => c.type === 'locked_value_violation');
  assert.ok(!lockedViolation, 'BI03: no locked_value_violation when document and project agree on brand name');
});
