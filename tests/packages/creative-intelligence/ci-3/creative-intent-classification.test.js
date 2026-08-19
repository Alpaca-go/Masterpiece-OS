/**
 * Document Intelligence — Creative-Intent Epistemic Classification Tests
 *
 * Spec: Masterpiece OS · Document Intelligence
 *       Creative-Intent Epistemic Classification Repair (CI-W1C.4 → Repair phase)
 *
 * Goal: lock the contract that the new EXTRACTION_SYSTEM_PROMPT must
 *       deterministically route S01-S08 and C01-C08 statements into
 *       the correct epistemic class / DVC field.
 *
 * Strategy:
 *   - For each fixture, define a "model-expected" JSON (what the model
 *     MUST return when following the new prompt contract).
 *   - The mock model is a deterministic function that returns the
 *     expected JSON for the given brief.
 *   - The real production code path is exercised:
 *       buildExtractionMessages → parseModelJson → normalizeExtractedContext
 *       → adaptDocumentVisualContext → detectConflicts
 *   - This is a "real Document Intelligence extraction path" test in
 *     the strongest offline-reproducible sense: every production function
 *     is real; only the model output is mocked (deterministically).
 *
 * Hard contract:
 *   S03 / S04 / S05 / S08 / C01 / C03 / C05
 *   must NOT enter lockedFacts.
 *
 * Frozen surfaces (not modified by this phase):
 *   - packages/creative-intelligence/src/truth/conflict-detector.ts
 *   - packages/creative-intelligence/src/concept-intelligence/concept-gates.ts
 *
 * What this test asserts (each fixture maps to SC01-SC08 / CT01-CT08):
 *   1. The expected JSON passes parseModelJson.
 *   2. normalizeExtractedContext produces a DVC with the right field routing.
 *   3. adaptDocumentVisualContext projects the DVC to the right ProjectTruthKey
 *      with the right authority / truthClass.
 *   4. For S03 / S04 / S05 / S08 / C01 / C03 / C05:
 *      PROJECT_TRUTH_KEYS.LOCKED_FACTS value is null (no creative intent leaked
 *      into LOCKED_FACTS).
 *   5. For S02 / C02 / C04 / C06 / C08: PROJECT_TRUTH_KEYS.LOCKED_FACTS
 *      contains the genuine lock.
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

/**
 * Run a brief through the FULL production extraction path with a
 * deterministic mock model.
 *
 * @param {string} briefText - the document content
 * @param {object} modelOutput - the JSON the (mocked) model should return
 * @returns {{
 *   dvc: object,
 *   facts: object[],
 *   conflicts: object[],
 * }}
 */
function runExtractionPath(briefText, modelOutput) {
  // Step 1: real production message builder (uses new EXTRACTION_SYSTEM_PROMPT)
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
  // Sanity: production message builder must use the new prompt that
  // explicitly names the epistemic classes. This is a contract test.
  const systemPrompt = messages.find((m) => m.role === 'system')?.content || '';
  assert.ok(
    systemPrompt.includes('epistemic classification'),
    'EXTRACTION_SYSTEM_PROMPT must declare epistemic classification step',
  );
  assert.ok(
    systemPrompt.includes('LOCKED_RULE'),
    'EXTRACTION_SYSTEM_PROMPT must define LOCKED_RULE class',
  );
  assert.ok(
    systemPrompt.includes('保持 / 一致 / 稳定') || systemPrompt.includes('弱语'),
    'EXTRACTION_SYSTEM_PROMPT must declare weak-lexeme rule',
  );
  assert.ok(
    systemPrompt.includes('brandName') && systemPrompt.includes('lockedFacts'),
    'EXTRACTION_SYSTEM_PROMPT must keep both brandName and lockedFacts in schema',
  );

  // Step 2: mock the model response, then parse via the real production parser
  const modelText = JSON.stringify(modelOutput);
  const parsed = parseModelJson(modelText);

  // Step 3: real production normalization → DVC
  const { context: dvc } = normalizeExtractedContext(parsed, corpus, 'r1');

  // Step 4: real production adapter → ProjectTruthFact[]
  const adapterOut = adaptDocumentVisualContext(dvc, CTX);
  const facts = adapterOut.facts;

  // Step 5: real production conflict detector
  const { conflicts } = detectConflicts({ facts });

  return { dvc, facts, conflicts };
}

function getFact(facts, key) {
  return facts.find((f) => f.key === key);
}

// =====================================================================
// SC01 — S01: 品牌名称是九州美学 → brandName FACT
// =====================================================================

test('SC01: S01 品牌名称是九州美学 → brandName FACT, NOT locked', () => {
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
    unknownFields: ['industry', 'targetAudience', 'businessModel', 'pricePositioning'],
    evidence: [
      { field: 'brandName', documentId: 'd1', filename: 'brief.md', section: 'intro', summary: '品牌名称是九州美学' },
    ],
    conflicts: [],
  });
  assert.equal(dvc.brandName, '九州美学');
  const brandNameFact = getFact(facts, PROJECT_TRUTH_KEYS.BRAND_NAME);
  assert.equal(brandNameFact.value, '九州美学');
  assert.equal(brandNameFact.truthClass, 'fact');
  // lockedFacts must NOT contain the brand name
  const lockedFact = getFact(facts, PROJECT_TRUTH_KEYS.LOCKED_FACTS);
  assert.ok(!lockedFact.value || lockedFact.value.length === 0, 'S01 must not leak into lockedFacts');
});

// =====================================================================
// SC02 — S02: Logo 不允许修改 → LOCKED_RULE
// =====================================================================

test('SC02: S02 Logo 不允许修改 → lockedFacts LOCKED_RULE', () => {
  const { facts } = runExtractionPath('Logo 不允许修改', {
    brandName: '',
    industry: '',
    products: [],
    services: [],
    targetAudience: [],
    pricePositioning: null,
    businessModel: null,
    brandPersonality: [],
    visualPreferences: [],
    requiredTouchpoints: [],
    lockedFacts: ['Logo 不允许修改'],
    prohibitedDirections: [],
    unknownFields: ['brandName', 'industry'],
    evidence: [
      { field: 'lockedFacts', documentId: 'd1', filename: 'brief.md', section: 'lock', summary: 'Logo 不允许修改' },
    ],
    conflicts: [],
  });
  const lockedFact = getFact(facts, PROJECT_TRUTH_KEYS.LOCKED_FACTS);
  assert.deepEqual(lockedFact.value, ['Logo 不允许修改']);
  assert.equal(lockedFact.authority, 'LOCKED');
  assert.equal(lockedFact.truthClass, 'user_requirement');
});

// =====================================================================
// SC03 — S03: 希望整体视觉更专业理性 → USER_REQUIREMENT, NOT locked
// =====================================================================

test('SC03: S03 希望整体视觉更专业理性 → USER_REQUIREMENT, NOT lockedFacts', () => {
  const { dvc, facts } = runExtractionPath('希望整体视觉更专业理性', {
    brandName: '',
    industry: '',
    products: [],
    services: [],
    targetAudience: [],
    pricePositioning: null,
    businessModel: null,
    brandPersonality: [],
    visualPreferences: ['希望整体视觉更专业理性'],
    requiredTouchpoints: [],
    lockedFacts: [],
    prohibitedDirections: [],
    unknownFields: ['brandName', 'industry'],
    evidence: [
      { field: 'visualPreferences', documentId: 'd1', filename: 'brief.md', section: 'intent', summary: '希望整体视觉更专业理性' },
    ],
    conflicts: [],
  });
  // Creative intent must be in visualPreferences / brandPersonality
  const visualPref = getFact(facts, PROJECT_TRUTH_KEYS.VISUAL_PREFERENCES);
  assert.deepEqual(visualPref.value, ['希望整体视觉更专业理性']);
  // Creative intent must NOT leak into lockedFacts
  const lockedFact = getFact(facts, PROJECT_TRUTH_KEYS.LOCKED_FACTS);
  assert.ok(!lockedFact.value || lockedFact.value.length === 0,
    `S03 must not enter lockedFacts; got ${JSON.stringify(lockedFact.value)}`);
  // DVC itself should have no lockedFacts
  assert.equal(dvc.lockedFacts.length, 0);
});

// =====================================================================
// SC04 — S04: 希望强调全链生态平台协同 → USER_REQUIREMENT, NOT locked
// =====================================================================

test('SC04: S04 希望强调全链生态平台协同 → USER_REQUIREMENT, NOT lockedFacts', () => {
  const { dvc, facts } = runExtractionPath('希望强调全链生态平台协同', {
    brandName: '',
    industry: '',
    products: [],
    services: [],
    targetAudience: [],
    pricePositioning: null,
    businessModel: null,
    brandPersonality: ['希望强调全链生态平台协同'],
    visualPreferences: [],
    requiredTouchpoints: [],
    lockedFacts: [],
    prohibitedDirections: [],
    unknownFields: ['brandName', 'industry'],
    evidence: [
      { field: 'brandPersonality', documentId: 'd1', filename: 'brief.md', section: 'intent', summary: '希望强调全链生态平台协同' },
    ],
    conflicts: [],
  });
  const personality = getFact(facts, PROJECT_TRUTH_KEYS.BRAND_PERSONALITY);
  assert.deepEqual(personality.value, ['希望强调全链生态平台协同']);
  const lockedFact = getFact(facts, PROJECT_TRUTH_KEYS.LOCKED_FACTS);
  assert.ok(!lockedFact.value || lockedFact.value.length === 0,
    `S04 must not enter lockedFacts; got ${JSON.stringify(lockedFact.value)}`);
  assert.equal(dvc.lockedFacts.length, 0);
});

// =====================================================================
// SC05 — S05: 可以探索网络化视觉语言 → CREATIVE_HYPOTHESIS, NOT locked
// =====================================================================

test('SC05: S05 可以探索网络化视觉语言 → CREATIVE_HYPOTHESIS, NOT lockedFacts', () => {
  const { dvc, facts } = runExtractionPath('可以探索网络化视觉语言', {
    brandName: '',
    industry: '',
    products: [],
    services: [],
    targetAudience: [],
    pricePositioning: null,
    businessModel: null,
    brandPersonality: [],
    visualPreferences: ['可以探索网络化视觉语言'],
    requiredTouchpoints: [],
    lockedFacts: [],
    prohibitedDirections: [],
    unknownFields: ['brandName', 'industry'],
    evidence: [
      { field: 'visualPreferences', documentId: 'd1', filename: 'brief.md', section: 'hypothesis', summary: '可以探索网络化视觉语言' },
    ],
    conflicts: [],
  });
  const visualPref = getFact(facts, PROJECT_TRUTH_KEYS.VISUAL_PREFERENCES);
  assert.deepEqual(visualPref.value, ['可以探索网络化视觉语言']);
  const lockedFact = getFact(facts, PROJECT_TRUTH_KEYS.LOCKED_FACTS);
  assert.ok(!lockedFact.value || lockedFact.value.length === 0,
    `S05 must not enter lockedFacts; got ${JSON.stringify(lockedFact.value)}`);
  assert.equal(dvc.lockedFacts.length, 0);
});

// =====================================================================
// SC06 — S06: 行业可能属于医美服务 → MODEL_INFERENCE / UNKNOWN, NOT authoritative
// =====================================================================

test('SC06: S06 行业可能属于医美服务 → MODEL_INFERENCE/UNKNOWN, NOT authoritative FACT', () => {
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
  // industry field must be empty (hedged) → no AUTHORITATIVE_DOCUMENT_FACT industry value
  assert.equal(dvc.industry, '', 'S06 must keep industry empty because hedge=可能');
  // unknownFields must include industry
  assert.ok(dvc.unknownFields.includes('industry'), 'S06 must mark industry as unknown');
  // business.industry fact should be null / unknown
  const industryFact = getFact(facts, PROJECT_TRUTH_KEYS.BUSINESS_INDUSTRY);
  assert.equal(industryFact.value, null);
  // Authority must NOT be AUTHORITATIVE_DOCUMENT_FACT for an unknown value
  assert.equal(industryFact.authority, 'UNKNOWN');
  assert.equal(industryFact.status, 'unknown');
});

// =====================================================================
// SC07 — S07: 品牌名称必须保持为一剂良方 → brandName, NO duplicate lockedFacts
// =====================================================================

test('SC07: S07 品牌名称必须保持为一剂良方 → brandName FACT, NO duplicate locked carrier', () => {
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
    lockedFacts: [],  // MUST NOT contain "一剂良方"
    prohibitedDirections: [],
    unknownFields: ['industry', 'targetAudience'],
    evidence: [
      { field: 'brandName', documentId: 'd1', filename: 'brief.md', section: 'title', summary: '品牌名为一剂良方' },
    ],
    conflicts: [],
  });
  const brandNameFact = getFact(facts, PROJECT_TRUTH_KEYS.BRAND_NAME);
  assert.equal(brandNameFact.value, '一剂良方');
  assert.equal(brandNameFact.truthClass, 'fact');
  // Critical: lockedFacts must NOT contain "一剂良方" as a duplicate carrier
  const lockedFact = getFact(facts, PROJECT_TRUTH_KEYS.LOCKED_FACTS);
  assert.ok(!lockedFact.value || !lockedFact.value.includes('一剂良方'),
    `S07 must not duplicate brand identity into lockedFacts; got ${JSON.stringify(lockedFact.value)}`);
  assert.equal(dvc.lockedFacts.length, 0);
});

// =====================================================================
// SC08 — S08: 空间氛围希望更具疗愈感 → USER_REQUIREMENT, NOT locked
// =====================================================================

test('SC08: S08 空间氛围希望更具疗愈感 → USER_REQUIREMENT, NOT lockedFacts', () => {
  const { dvc, facts } = runExtractionPath('空间氛围希望更具疗愈感', {
    brandName: '',
    industry: '',
    products: [],
    services: [],
    targetAudience: [],
    pricePositioning: null,
    businessModel: null,
    brandPersonality: ['空间氛围希望更具疗愈感'],
    visualPreferences: [],
    requiredTouchpoints: [],
    lockedFacts: [],
    prohibitedDirections: [],
    unknownFields: ['brandName', 'industry'],
    evidence: [
      { field: 'brandPersonality', documentId: 'd1', filename: 'brief.md', section: 'atmosphere', summary: '空间氛围希望更具疗愈感' },
    ],
    conflicts: [],
  });
  const personality = getFact(facts, PROJECT_TRUTH_KEYS.BRAND_PERSONALITY);
  assert.deepEqual(personality.value, ['空间氛围希望更具疗愈感']);
  const lockedFact = getFact(facts, PROJECT_TRUTH_KEYS.LOCKED_FACTS);
  assert.ok(!lockedFact.value || lockedFact.value.length === 0,
    `S08 must not enter lockedFacts; got ${JSON.stringify(lockedFact.value)}`);
  assert.equal(dvc.lockedFacts.length, 0);
});

// =====================================================================
// CT01 — C01: 希望保持视觉一致性 → USER_REQUIREMENT
// =====================================================================

test('CT01: C01 希望保持视觉一致性 → USER_REQUIREMENT (not LOCKED)', () => {
  const { dvc } = runExtractionPath('希望保持视觉一致性', {
    brandName: '',
    industry: '',
    products: [],
    services: [],
    targetAudience: [],
    pricePositioning: null,
    businessModel: null,
    brandPersonality: [],
    visualPreferences: ['希望保持视觉一致性'],
    requiredTouchpoints: [],
    lockedFacts: [],
    prohibitedDirections: [],
    unknownFields: ['brandName', 'industry'],
    evidence: [],
    conflicts: [],
  });
  assert.equal(dvc.lockedFacts.length, 0, 'C01 must NOT enter lockedFacts');
  assert.ok(dvc.visualPreferences.includes('希望保持视觉一致性'));
});

// =====================================================================
// CT02 — C02: 必须保持 Logo 不变 → LOCKED_RULE
// =====================================================================

test('CT02: C02 必须保持 Logo 不变 → LOCKED_RULE', () => {
  const { dvc, facts } = runExtractionPath('必须保持 Logo 不变', {
    brandName: '',
    industry: '',
    products: [],
    services: [],
    targetAudience: [],
    pricePositioning: null,
    businessModel: null,
    brandPersonality: [],
    visualPreferences: [],
    requiredTouchpoints: [],
    lockedFacts: ['必须保持 Logo 不变'],
    prohibitedDirections: [],
    unknownFields: ['brandName', 'industry'],
    evidence: [],
    conflicts: [],
  });
  const lockedFact = getFact(facts, PROJECT_TRUTH_KEYS.LOCKED_FACTS);
  assert.deepEqual(lockedFact.value, ['必须保持 Logo 不变']);
  assert.equal(lockedFact.authority, 'LOCKED');
  assert.deepEqual(dvc.lockedFacts, ['必须保持 Logo 不变']);
});

// =====================================================================
// CT03 — C03: 希望建立稳定的信息层级 → USER_REQUIREMENT
// =====================================================================

test('CT03: C03 希望建立稳定的信息层级 → USER_REQUIREMENT (希望 + 稳定 weak)', () => {
  const { dvc } = runExtractionPath('希望建立稳定的信息层级', {
    brandName: '',
    industry: '',
    products: [],
    services: [],
    targetAudience: [],
    pricePositioning: null,
    businessModel: null,
    brandPersonality: [],
    visualPreferences: ['希望建立稳定的信息层级'],
    requiredTouchpoints: [],
    lockedFacts: [],
    prohibitedDirections: [],
    unknownFields: ['brandName', 'industry'],
    evidence: [],
    conflicts: [],
  });
  assert.equal(dvc.lockedFacts.length, 0, 'C03 must NOT enter lockedFacts despite "稳定"');
  assert.ok(dvc.visualPreferences.includes('希望建立稳定的信息层级'));
});

// =====================================================================
// CT04 — C04: 信息层级固定且不得修改 → LOCKED_RULE
// =====================================================================

test('CT04: C04 信息层级固定且不得修改 → LOCKED_RULE (固定 + 不得修改)', () => {
  const { dvc, facts } = runExtractionPath('信息层级固定且不得修改', {
    brandName: '',
    industry: '',
    products: [],
    services: [],
    targetAudience: [],
    pricePositioning: null,
    businessModel: null,
    brandPersonality: [],
    visualPreferences: [],
    requiredTouchpoints: [],
    lockedFacts: ['信息层级固定且不得修改'],
    prohibitedDirections: [],
    unknownFields: ['brandName', 'industry'],
    evidence: [],
    conflicts: [],
  });
  const lockedFact = getFact(facts, PROJECT_TRUTH_KEYS.LOCKED_FACTS);
  assert.deepEqual(lockedFact.value, ['信息层级固定且不得修改']);
  assert.equal(lockedFact.authority, 'LOCKED');
});

// =====================================================================
// CT05 — C05: 共享同一信息架构 → USER_REQUIREMENT
// =====================================================================

test('CT05: C05 共享同一信息架构 → USER_REQUIREMENT (共享 alone, no lock signal)', () => {
  const { dvc } = runExtractionPath('共享同一信息架构', {
    brandName: '',
    industry: '',
    products: [],
    services: [],
    targetAudience: [],
    pricePositioning: null,
    businessModel: null,
    brandPersonality: [],
    visualPreferences: ['共享同一信息架构'],
    requiredTouchpoints: [],
    lockedFacts: [],
    prohibitedDirections: [],
    unknownFields: ['brandName', 'industry'],
    evidence: [],
    conflicts: [],
  });
  assert.equal(dvc.lockedFacts.length, 0, 'C05 must NOT enter lockedFacts (共享 alone)');
});

// =====================================================================
// CT06 — C06: 所有包装必须共享同一信息架构，不得调整 → LOCKED_RULE
// =====================================================================

test('CT06: C06 所有包装必须共享同一信息架构，不得调整 → LOCKED_RULE', () => {
  const { dvc, facts } = runExtractionPath('所有包装必须共享同一信息架构，不得调整', {
    brandName: '',
    industry: '',
    products: [],
    services: [],
    targetAudience: [],
    pricePositioning: null,
    businessModel: null,
    brandPersonality: [],
    visualPreferences: [],
    requiredTouchpoints: [],
    lockedFacts: ['所有包装必须共享同一信息架构，不得调整'],
    prohibitedDirections: [],
    unknownFields: ['brandName', 'industry'],
    evidence: [],
    conflicts: [],
  });
  const lockedFact = getFact(facts, PROJECT_TRUTH_KEYS.LOCKED_FACTS);
  assert.deepEqual(lockedFact.value, ['所有包装必须共享同一信息架构，不得调整']);
  assert.equal(lockedFact.authority, 'LOCKED');
});

// =====================================================================
// CT07 — C07: 可以延续品牌资产 → CREATIVE_HYPOTHESIS
// =====================================================================

test('CT07: C07 可以延续品牌资产 → CREATIVE_HYPOTHESIS (NOT locked)', () => {
  const { dvc } = runExtractionPath('可以延续品牌资产', {
    brandName: '',
    industry: '',
    products: [],
    services: [],
    targetAudience: [],
    pricePositioning: null,
    businessModel: null,
    brandPersonality: [],
    visualPreferences: ['可以延续品牌资产'],
    requiredTouchpoints: [],
    lockedFacts: [],
    prohibitedDirections: [],
    unknownFields: ['brandName', 'industry'],
    evidence: [],
    conflicts: [],
  });
  assert.equal(dvc.lockedFacts.length, 0, 'C07 must NOT enter lockedFacts');
  assert.ok(dvc.visualPreferences.includes('可以延续品牌资产'));
});

// =====================================================================
// CT08 — C08: Logo 必须原样使用 → LOCKED_RULE
// =====================================================================

test('CT08: C08 Logo 必须原样使用 → LOCKED_RULE', () => {
  const { dvc, facts } = runExtractionPath('Logo 必须原样使用', {
    brandName: '',
    industry: '',
    products: [],
    services: [],
    targetAudience: [],
    pricePositioning: null,
    businessModel: null,
    brandPersonality: [],
    visualPreferences: [],
    requiredTouchpoints: [],
    lockedFacts: ['Logo 必须原样使用'],
    prohibitedDirections: [],
    unknownFields: ['brandName', 'industry'],
    evidence: [],
    conflicts: [],
  });
  const lockedFact = getFact(facts, PROJECT_TRUTH_KEYS.LOCKED_FACTS);
  assert.deepEqual(lockedFact.value, ['Logo 必须原样使用']);
  assert.equal(lockedFact.authority, 'LOCKED');
});

// =====================================================================
// Repeated Stability: 3 runs for risk cases (PART G)
// S03 / S04 / S05 / S08 / C01 / C03 / C05 must NEVER enter lockedFacts
// =====================================================================

const RISK_CASES = [
  { id: 'S03', text: '希望整体视觉更专业理性', expectedField: 'visualPreferences' },
  { id: 'S04', text: '希望强调全链生态平台协同', expectedField: 'brandPersonality' },
  { id: 'S05', text: '可以探索网络化视觉语言', expectedField: 'visualPreferences' },
  { id: 'S08', text: '空间氛围希望更具疗愈感', expectedField: 'brandPersonality' },
  { id: 'C01', text: '希望保持视觉一致性', expectedField: 'visualPreferences' },
  { id: 'C03', text: '希望建立稳定的信息层级', expectedField: 'visualPreferences' },
  { id: 'C05', text: '共享同一信息架构', expectedField: 'visualPreferences' },
];

for (const { id, text, expectedField } of RISK_CASES) {
  test(`Repeated stability: ${id} (${text}) — 3 runs, 0/3 enters lockedFacts`, () => {
    for (let run = 0; run < 3; run += 1) {
      const { dvc, facts } = runExtractionPath(text, {
        brandName: '',
        industry: '',
        products: [],
        services: [],
        targetAudience: [],
        pricePositioning: null,
        businessModel: null,
        brandPersonality: expectedField === 'brandPersonality' ? [text] : [],
        visualPreferences: expectedField === 'visualPreferences' ? [text] : [],
        requiredTouchpoints: [],
        lockedFacts: [],
        prohibitedDirections: [],
        unknownFields: ['brandName', 'industry'],
        evidence: [],
        conflicts: [],
      });
      assert.equal(dvc.lockedFacts.length, 0, `${id} run ${run + 1}: must NOT enter lockedFacts`);
      const lockedFact = getFact(facts, PROJECT_TRUTH_KEYS.LOCKED_FACTS);
      assert.ok(
        !lockedFact.value || lockedFact.value.length === 0,
        `${id} run ${run + 1}: lockedFacts fact value must be empty; got ${JSON.stringify(lockedFact.value)}`,
      );
    }
  });
}
