/**
 * Document Intelligence — G02.002-Style Replay (G02R01-G02R04)
 *
 * Spec: §34-§37 G02.002-Style Replay
 *   "我们希望……保持一种贯穿触点的视觉一致性"
 *   "不同包装共享同一套信息架构，但允许调整信息密度"
 *
 *   修复后：
 *     - DVC lockedFacts 不得包含这些 creative intent
 *     - visualPreferences / brandPersonality / equivalent 包含 intent
 *     - false locked_value_violation = 0
 *     - false CRITICAL_CONFLICT_DEPENDENCY = 0
 *     - run reaches awaiting_direction_selection（Document Intelligence 层：no direction_blocked）
 *
 * Strategy: build the G02.002 brief into a corpus, then exercise the
 * full production extraction path:
 *   buildExtractionMessages → mock model (deterministic) → parseModelJson
 *   → normalizeExtractedContext → adaptDocumentVisualContext
 *   → detectConflicts
 *
 * The mock model returns the JSON that the new EXTRACTION_SYSTEM_PROMPT
 * is contracted to produce for the G02.002 brief (per the contract test
 * in creative-intent-classification.test.js).
 *
 * If a real model integration is desired, replace the mockModel function
 * with an actual LLM API call. The downstream pipeline remains identical.
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

const CTX = { projectId: 'p-yiji', generatedAt: '2026-08-19T00:00:00.000Z', sourceFingerprints: {} };

// G02.002 brief content (from .codex-smoke/ci-w1c-attempt-2/g02-yiji-brief.md)
const G02_BRIEF_TEXT = `# 一剂良方 — Creative Brief

我们希望这个项目的方向探索能够围绕方剂可读性、药材地道感、功效传承这三个主题来展开，
并希望最终的方向能够在产品包装、门店和品牌视觉这三个触点上同时落地，
同时保持一种贯穿触点的视觉一致性。

我们希望方向的核心思路是把现有的品牌资产从被动的状态激活为主动的叙事驱动力，
让品牌通过信息层级的清晰组织而被识别 — 不同包装形态（方剂盒、瓶贴、标签）
共享同一套信息架构，但允许根据具体形态调整信息密度。

我们希望创作者在思考方向时能够关注：药材的地道性如何作为方剂可信度的视觉锚点；
复杂产品组合如何在视觉上保持清晰可读；传统中医文化如何用现代可信的方式表达。

我们希望避免的方向是：玄学化的视觉表达、过度简化的包装、混乱的信息层级。

我们希望鼓励的方向是：地道、清晰、可信、长期可识别。
`;

/**
 * Mock model: returns the JSON that the new EXTRACTION_SYSTEM_PROMPT
 * is contracted to produce for the G02.002 brief.
 *
 * This represents the expected model behavior. In production, the model
 * (e.g., qwen3.6-plus) is expected to follow the new prompt contract and
 * produce equivalent JSON.
 */
function mockG02ModelOutput() {
  return {
    brandName: '一剂良方',
    industry: '',
    products: ['方剂'],
    services: [],
    targetAudience: [],
    pricePositioning: null,
    businessModel: null,
    brandPersonality: [
      '方剂可读性',
      '药材地道感',
      '功效传承',
      '地道',
      '清晰',
      '可信',
      '长期可识别',
    ],
    visualPreferences: [
      '希望保持一种贯穿触点的视觉一致性',
      '希望信息层级的清晰组织',
      '希望传统中医文化用现代可信的方式表达',
    ],
    requiredTouchpoints: [
      '产品包装',
      '门店',
      '品牌视觉',
      '不同包装形态共享同一套信息架构',
    ],
    lockedFacts: [],  // ← critical: no creative intent leaks here
    prohibitedDirections: [
      '玄学化的视觉表达',
      '过度简化的包装',
      '混乱的信息层级',
    ],
    unknownFields: [
      'industry',
      'targetAudience',
      'pricePositioning',
      'businessModel',
    ],
    evidence: [
      { field: 'brandName', documentId: 'd1', filename: 'g02-yiji-brief.md', section: 'title', summary: '品牌名为一剂良方' },
      { field: 'brandPersonality', documentId: 'd1', filename: 'g02-yiji-brief.md', section: 'intent', summary: '用户希望围绕方剂可读性/药材地道感/功效传承三个主题展开' },
      { field: 'visualPreferences', documentId: 'd1', filename: 'g02-yiji-brief.md', section: 'intent', summary: '希望保持一种贯穿触点的视觉一致性（USER_REQUIREMENT）' },
      { field: 'requiredTouchpoints', documentId: 'd1', filename: 'g02-yiji-brief.md', section: 'constraint', summary: '不同包装形态共享同一套信息架构（USER_REQUIREMENT; 共享 weak lexeme alone）' },
      { field: 'prohibitedDirections', documentId: 'd1', filename: 'g02-yiji-brief.md', section: 'avoid', summary: '我们希望避免的方向（authoritative prohibitedDirections）' },
    ],
    conflicts: [],
  };
}

/**
 * Run the G02 brief through the full production extraction path.
 */
function runG02Extraction() {
  const corpus = {
    documents: [
      {
        id: 'd1',
        filename: 'g02-yiji-brief.md',
        sourceType: 'markdown',
        title: '一剂良方 Creative Brief',
        rawText: G02_BRIEF_TEXT,
        characterCount: G02_BRIEF_TEXT.length,
        pageCount: 1,
        documentRole: 'creative-brief',
        tables: [],
      },
    ],
    sourceIndex: [
      {
        documentId: 'd1',
        filename: 'g02-yiji-brief.md',
        sourceType: 'markdown',
        characterCount: G02_BRIEF_TEXT.length,
        pageCount: 1,
        documentRole: 'creative-brief',
      },
    ],
  };

  // Step 1: real production message builder (uses new EXTRACTION_SYSTEM_PROMPT)
  const messages = buildExtractionMessages(corpus);
  const systemPrompt = messages.find((m) => m.role === 'system')?.content || '';
  // The new prompt must contain the epistemic classification rules
  assert.ok(systemPrompt.includes('epistemic classification'),
    'EXTRACTION_SYSTEM_PROMPT must declare epistemic classification step');
  assert.ok(systemPrompt.includes('LOCKED_RULE'),
    'EXTRACTION_SYSTEM_PROMPT must define LOCKED_RULE class');
  assert.ok(systemPrompt.includes('保持 / 一致 / 稳定'),
    'EXTRACTION_SYSTEM_PROMPT must declare weak-lexeme rule');

  // Step 2: mock model returns the contract-compliant JSON
  const parsed = parseModelJson(JSON.stringify(mockG02ModelOutput()));

  // Step 3: real production normalization → DVC
  const { context: dvc } = normalizeExtractedContext(parsed, corpus, 'r1');

  // Step 4: real production adapter → ProjectTruthFact[]
  const { facts } = adaptDocumentVisualContext(dvc, CTX);

  // Step 5: real production conflict detector
  const conflicts = detectConflicts({ facts });

  return { dvc, facts, conflicts };
}

function getFact(facts, key) {
  return facts.find((f) => f.key === key);
}

// =====================================================================
// G02R01: creative intent NOT in lockedFacts
// =====================================================================

test('G02R01: G02.002-style brief → creative intent NOT in lockedFacts', () => {
  const { dvc, facts } = runG02Extraction();
  // DVC: lockedFacts must be empty (no creative intent leak)
  assert.equal(dvc.lockedFacts.length, 0,
    `G02R01: DVC.lockedFacts must be empty; got ${JSON.stringify(dvc.lockedFacts)}`);
  // Project Truth: LOCKED_FACTS fact must have null/empty value
  const lockedFact = getFact(facts, PROJECT_TRUTH_KEYS.LOCKED_FACTS);
  assert.ok(!lockedFact.value || lockedFact.value.length === 0,
    `G02R01: ProjectTruth LOCKED_FACTS value must be empty; got ${JSON.stringify(lockedFact.value)}`);
});

// =====================================================================
// G02R02: visual preferences carrier contains creative intent
// =====================================================================

test('G02R02: G02.002-style brief → visualPreferences / brandPersonality / requiredTouchpoints carry intent', () => {
  const { dvc, facts } = runG02Extraction();
  // DVC: at least one of visualPreferences / brandPersonality / requiredTouchpoints
  // must contain the brief's intent content
  const dvcIntentCarriers = [
    ...dvc.visualPreferences,
    ...dvc.brandPersonality,
    ...dvc.requiredTouchpoints,
  ].join(' ');
  assert.ok(
    dvcIntentCarriers.includes('方剂可读性') ||
    dvcIntentCarriers.includes('药材地道感') ||
    dvcIntentCarriers.includes('功效传承') ||
    dvcIntentCarriers.includes('保持') ||
    dvcIntentCarriers.includes('共享'),
    `G02R02: DVC must carry creative intent in preference/personality/touchpoint; got "${dvcIntentCarriers}"`,
  );
  // Project Truth: VISUAL_PREFERENCES or BRAND_PERSONALITY or PRODUCT_TOUCHPOINTS
  // must carry the intent
  const visualPref = getFact(facts, PROJECT_TRUTH_KEYS.VISUAL_PREFERENCES);
  const personality = getFact(facts, PROJECT_TRUTH_KEYS.BRAND_PERSONALITY);
  const touchpoints = getFact(facts, PROJECT_TRUTH_KEYS.PRODUCT_TOUCHPOINTS);
  const truthIntentCarriers = [
    ...(visualPref.value || []),
    ...(personality.value || []),
    ...(touchpoints.value || []),
  ].join(' ');
  assert.ok(
    truthIntentCarriers.length > 0,
    'G02R02: Project Truth must carry creative intent in preference / personality / touchpoints',
  );
});

// =====================================================================
// G02R03: false locked_value_violation = 0
// =====================================================================

test('G02R03: G02.002-style brief → no false locked_value_violation', () => {
  const { facts, conflicts } = runG02Extraction();
  // Now simulate the project_record carrier with the genuine LOCKED facts
  // from project.json (Logo Locked + 简体中文)
  const projectRecordFacts = [
    {
      id: 'project_record:p-yiji:brand.name',
      key: PROJECT_TRUTH_KEYS.BRAND_NAME,
      value: '一剂良方',
      truthClass: 'fact',
      status: 'observed',
      authority: 'AUTHORITATIVE_PROJECT_METADATA',
      sourceType: 'project_record',
      sourceId: 'p-yiji',
      createdAt: CTX.generatedAt,
      evidenceRefs: [],
      isReferenceFact: false,
    },
    {
      id: 'project_record:p-yiji:locked.facts',
      key: PROJECT_TRUTH_KEYS.LOCKED_FACTS,
      value: [
        '原始 Logo Locked：不得修改、重绘、拆解、替换、仿造或改变内部字形。',
        '输出语言固定为简体中文。',
      ],
      truthClass: 'user_requirement',
      status: 'confirmed',
      authority: 'LOCKED',
      sourceType: 'project_record',
      sourceId: 'p-yiji',
      createdAt: CTX.generatedAt,
      evidenceRefs: [],
      isReferenceFact: false,
    },
  ];
  const allFacts = [...facts, ...projectRecordFacts];
  const allConflicts = detectConflicts({ facts: allFacts });
  const lockedViolations = allConflicts.filter((c) => c.type === 'locked_value_violation');
  assert.equal(lockedViolations.length, 0,
    `G02R03: no false locked_value_violation; got ${JSON.stringify(lockedViolations)}`);
  // Also no value_mismatch on locked.facts (would be a false positive)
  const lockedValueMismatch = allConflicts.find(
    (c) => c.key === PROJECT_TRUTH_KEYS.LOCKED_FACTS && c.type === 'value_mismatch',
  );
  assert.ok(!lockedValueMismatch,
    `G02R03: no false value_mismatch on locked.facts; got ${JSON.stringify(lockedValueMismatch)}`);
});

// =====================================================================
// G02R04: direction_blocked does NOT fire (Document Intelligence layer)
// =====================================================================

test('G02R04: G02.002-style brief → no CRITICAL_CONFLICT_DEPENDENCY-causing false conflict', () => {
  const { facts } = runG02Extraction();
  // Simulate the project_record carrier (genuine LOCKED facts)
  const projectRecordFacts = [
    {
      id: 'project_record:p-yiji:locked.facts',
      key: PROJECT_TRUTH_KEYS.LOCKED_FACTS,
      value: [
        '原始 Logo Locked：不得修改、重绘、拆解、替换、仿造或改变内部字形。',
        '输出语言固定为简体中文。',
      ],
      truthClass: 'user_requirement',
      status: 'confirmed',
      authority: 'LOCKED',
      sourceType: 'project_record',
      sourceId: 'p-yiji',
      createdAt: CTX.generatedAt,
      evidenceRefs: [],
      isReferenceFact: false,
    },
  ];
  const allConflicts = detectConflicts({ facts: [...facts, ...projectRecordFacts] });
  // No critical conflicts that would cascade to CRITICAL_CONFLICT_DEPENDENCY
  const criticalConflictTypes = [
    'identity_mismatch',
    'locked_value_violation',
    'reference_contamination',
  ];
  const critical = allConflicts.filter((c) => criticalConflictTypes.includes(c.type));
  assert.equal(critical.length, 0,
    `G02R04: no critical conflicts; got ${JSON.stringify(critical)}`);
  // This means: at the Document Intelligence / Project Truth layer,
  // the run would NOT cascade to direction_blocked. The Concept gate
  // cascade depends on this layer's critical conflicts.
});
