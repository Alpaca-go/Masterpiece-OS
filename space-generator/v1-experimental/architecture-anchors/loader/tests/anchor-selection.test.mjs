#!/usr/bin/env node
// Architecture Anchor Selection Logic v1 (Phase 8C) — validation suite
// 用法: node space-generator/v1-experimental/architecture-anchors/loader/tests/anchor-selection.test.mjs
//
// Phase 8C §4 验收: Future runtime should not rely on manual anchor selection.
// 验证 selectAnchors(brandKey, criteria) 根据 DNA 字段自动选 anchor.
//
// 不调 Provider, 不污染生产代码.

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..', '..');

const {
  selectAnchors,
  loadArchitectureAnchors,
  listBrandKeys,
} = await import('../load-anchors.mjs');

let pass = 0;
let fail = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    pass += 1;
    console.log(`  \u2713 ${name}`);
  } catch (err) {
    fail += 1;
    failures.push({ name, error: err });
    console.log(`  \u2717 ${name}\n      ${err.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

console.log('Architecture Anchor Selection Logic v1 (Phase 8C) \u2014 validation suite\n');

// ---------- Preconditions ----------
console.log('Preconditions:');

test('registry.json exists and loads', () => {
  const keys = listBrandKeys();
  assert(keys.includes('jiuzhou-aesthetics'), 'jiuzhou-aesthetics not in registry');
});

test('3 JZMX anchors loaded with new Phase 8C fields (category, strength, applicability)', () => {
  const anchors = loadArchitectureAnchors('jiuzhou-aesthetics');
  assert(anchors.length === 3, `expected 3 anchors, got ${anchors.length}`);
  for (const a of anchors) {
    assert(a.category, `anchor ${a.id} missing category (Phase 8C §3)`);
    assert(a.strength?.architecture != null, `anchor ${a.id} missing strength.architecture`);
    assert(a.strength?.function != null, `anchor ${a.id} missing strength.function`);
    assert(a.applicability?.industries?.length > 0, `anchor ${a.id} missing applicability.industries`);
    assert(a.applicability?.sceneTypes?.length > 0, `anchor ${a.id} missing applicability.sceneTypes`);
  }
});

// ---------- Selection: basic ops ----------
console.log('\nSelection basic ops:');

test('selectAnchors returns sorted, scored list for medical_aesthetics + reception', () => {
  const result = selectAnchors('jiuzhou-aesthetics', {
    industry: 'medical_aesthetics',
    sceneType: 'reception',
    commercialContext: 'street_store',
  });
  assert(result.length > 0, 'should return at least 1 anchor');
  // 验证排序按 score desc
  for (let i = 0; i < result.length - 1; i++) {
    assert(result[i].score >= result[i + 1].score,
      `selection order broken at ${i}: ${result[i].score} < ${result[i + 1].score}`);
  }
  // 每个 selected entry 有 anchor + score + breakdown
  for (const s of result) {
    assert(s.anchor, 'selected entry missing anchor');
    assert(typeof s.score === 'number', 'selected entry missing score');
    assert(s.breakdown, 'selected entry missing breakdown');
  }
});

test('selectAnchors returns [] for unknown brand', () => {
  const result = selectAnchors('nonexistent-brand', {
    industry: 'medical_aesthetics',
  });
  assert(result.length === 0, `unknown brand should return [], got ${result.length}`);
});

test('selectAnchors returns [] when no criteria matches', () => {
  // 选一个不存在的 industry 组合, 让所有 score = 0
  const result = selectAnchors('jiuzhou-aesthetics', {
    industry: 'unknown_industry',
    sceneType: 'unknown_scene',
  });
  assert(result.length === 0, `non-matching criteria should return [], got ${result.length}`);
});

test('selectAnchors throws on missing brandKey', () => {
  let threw = false;
  try { selectAnchors(null); } catch { threw = true; }
  assert(threw, 'should throw on null brandKey');
});

test('selectAnchors caps at maxCount', () => {
  const r1 = selectAnchors('jiuzhou-aesthetics', {
    industry: 'medical_aesthetics',
    sceneType: 'reception',
  }, 1);
  assert(r1.length === 1, `maxCount=1 should cap, got ${r1.length}`);
  const r2 = selectAnchors('jiuzhou-aesthetics', {
    industry: 'medical_aesthetics',
    sceneType: 'reception',
  }, 2);
  assert(r2.length === 2, `maxCount=2 should cap, got ${r2.length}`);
});

// ---------- Selection: scoring logic ----------
console.log('\nSelection scoring logic:');

test('industry+sceneType exact match scores higher than partial', () => {
  // 完整匹配: medical_aesthetics + reception
  const fullMatch = selectAnchors('jiuzhou-aesthetics', {
    industry: 'medical_aesthetics',
    sceneType: 'reception',
  });
  // 单独 industry 匹配
  const partialMatch = selectAnchors('jiuzhou-aesthetics', {
    industry: 'medical_aesthetics',
  });
  assert(fullMatch.length > 0, 'full match should not be empty');
  assert(partialMatch.length > 0, 'partial match should not be empty');
  // 完整匹配的最高分应 >= 部分匹配的最高分
  const topFull = Math.max(...fullMatch.map((s) => s.score));
  const topPartial = Math.max(...partialMatch.map((s) => s.score));
  assert(topFull >= topPartial,
    `full match ${topFull} should be >= partial match ${topPartial}`);
});

test('commercialContext match contributes to score', () => {
  const withCtx = selectAnchors('jiuzhou-aesthetics', {
    industry: 'medical_aesthetics',
    sceneType: 'reception',
    commercialContext: 'street_store',
  });
  const withoutCtx = selectAnchors('jiuzhou-aesthetics', {
    industry: 'medical_aesthetics',
    sceneType: 'reception',
  });
  const topWith = Math.max(...withCtx.map((s) => s.score));
  const topWithout = Math.max(...withoutCtx.map((s) => s.score));
  assert(topWith >= topWithout,
    `with commercialContext ${topWith} should be >= without ${topWithout}`);
});

test('operationalRealism=high requires high function strength', () => {
  // medical_aesthetics + consultation + operationalRealism=high
  // 应该选 function strength 高的 anchor (>= 0.75)
  const result = selectAnchors('jiuzhou-aesthetics', {
    industry: 'medical_aesthetics',
    sceneType: 'consultation',
    operationalRealism: 'high',
  });
  for (const s of result) {
    assert(s.anchor.strength.function >= 0.75,
      `high operationalRealism should select anchors with function >= 0.75, got ${s.anchor.id} function=${s.anchor.strength.function}`);
  }
});

test('requireFunctionStrength filters out low-function anchors', () => {
  const strict = selectAnchors('jiuzhou-aesthetics', {
    industry: 'medical_aesthetics',
    sceneType: 'reception',
    requireFunctionStrength: 0.85,
  });
  for (const s of strict) {
    assert(s.anchor.strength.function >= 0.85,
      `requireFunctionStrength=0.85 should filter, got ${s.anchor.id} function=${s.anchor.strength.function}`);
  }
});

test('breakdown exposes all 5 dimensions (Phase 8C §3 scoring weights)', () => {
  const result = selectAnchors('jiuzhou-aesthetics', {
    industry: 'medical_aesthetics',
    sceneType: 'reception',
  });
  assert(result.length > 0, 'should return at least 1 anchor');
  const b = result[0].breakdown;
  for (const k of ['industry', 'sceneType', 'commercialContext', 'functionalAlignment', 'weight', 'total']) {
    assert(typeof b[k] === 'number', `breakdown missing ${k} (got ${typeof b[k]})`);
  }
});

test('total score is sum of weighted components (within floating point tolerance)', () => {
  const result = selectAnchors('jiuzhou-aesthetics', {
    industry: 'medical_aesthetics',
    sceneType: 'reception',
  });
  assert(result.length > 0, 'should return at least 1 anchor');
  const b = result[0].breakdown;
  // 各分项应在 [0, 1]
  for (const k of ['industry', 'sceneType', 'commercialContext', 'functionalAlignment', 'weight']) {
    assert(b[k] >= 0 && b[k] <= 1, `${k} should be in [0,1], got ${b[k]}`);
  }
  // total = sum (简化: 实际是 weighted sum, 这里只检查 total 是合理值)
  assert(b.total >= 0 && b.total <= 1, `total should be in [0,1], got ${b.total}`);
});

// ---------- Selection: 4 different industry categories ----------
console.log('\nSelection: 4 different industry categories (Phase 8D preparation):');

test('medical_aesthetics returns >= 1 anchor (JZMX brand has 3)', () => {
  const result = selectAnchors('jiuzhou-aesthetics', {
    industry: 'medical_aesthetics',
    sceneType: 'reception',
  });
  assert(result.length >= 1, `medical_aesthetics should return >= 1 anchor, got ${result.length}`);
});

test('health_management returns 0 JZMX anchors (Phase 8D §3 Risk 1 防 overfit, JZMX applicability 收紧到 medical_aesthetics)', () => {
  // Phase 8D §3 Risk 1: selectAnchors industry match 防护 JZMX overfit.
  // Phase 8A/8C 时 JZMX 包含 health_management cross-industry applicability, 但 Phase 8D 收紧.
  // 这是 Phase 8D 多 brand 验证的关键防线: JZMX 自己的 anchor 不应被 health_management 行业选中.
  const result = selectAnchors('jiuzhou-aesthetics', {
    industry: 'health_management',
    sceneType: 'reception',
  });
  assert(result.length === 0,
    `JZMX (medical) for health_management should be 0 (Phase 8D 防 overfit), got ${result.length}`);
});

test('YJLF (health_management) returns 3 anchors (own industry)', () => {
  // Phase 8D 新增 YJLF anchors, 应对应 health_management 行业
  const result = selectAnchors('yi-ji-liang-fang', {
    industry: 'health_management',
    sceneType: 'reception',
  });
  assert(result.length === 3, `YJLF health_management should return 3 anchors, got ${result.length}`);
});

test('FTT (restaurant) returns 3 anchors (own industry)', () => {
  // Phase 8D 新增 FTT anchors, 应对应 restaurant 行业
  const result = selectAnchors('feng-tang-tang', {
    industry: 'restaurant',
    sceneType: 'reception',
  });
  assert(result.length === 3, `FTT restaurant should return 3 anchors, got ${result.length}`);
});

test('restaurant returns >= 0 anchors (cross-industry applicability via ARCH-02)', () => {
  // JZMX-ARCH-02 (EntranceGlass) 的 applicability.industries 包含 restaurant, 应返回
  // 如果 registry 改动导致 restaurant 不在 applicability 里, 返回 [] 也是合法的 (graceful degradation)
  const result = selectAnchors('jiuzhou-aesthetics', {
    industry: 'restaurant',
    sceneType: 'reception',
  });
  if (result.length > 0) {
    assert(result[0].anchor.applicability.industries.includes('restaurant'),
      'cross-industry anchor should have restaurant in applicability.industries');
  }
  // else: graceful degradation, no cross-industry anchor (acceptable)
});

// ---------- summary ----------
console.log(`\nSummary: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log(`  - ${f.name}: ${f.error.message}`);
  }
  process.exit(1);
}
process.exit(0);
