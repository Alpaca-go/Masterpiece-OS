#!/usr/bin/env node
// Space Role Intelligence — Phase 9C.1 validation suite
// 用法: node space-role-intelligence/tests/compile-space-role-intelligence.test.mjs
//
// 测试目标 (Phase 9C.1 §10 验收 6 项):
//   1. Space Role JSON 可加载 (8 个 JSONs: reception / lobby / vip-lounge /
//      consultation / treatment / corridor / product-display / exterior)
//   2. Prompt Compiler 支持新 block (compileSpaceRoleBlock 返回 blockId + content)
//   3. Brand Translation 不变化 (compileSpaceRuntime with/without 9C.1: brand_translation byte-equal)
//   4. Architecture DNA 不变化 (architecture_dna byte-equal)
//   5. 不同空间输出明显不同 (8 个 space_type 的 priority / visual_rules / functional_constraints / narrative_focus 都不同)
//   6. 同品牌保持统一 (同一 brand 不同 space_type, brand_translation / architecture_dna byte-equal)
//
// 不调真实 Provider, 不污染生产代码, 不动 v1-baseline.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..');

const {
  compileSpaceRoleBlock,
  loadSpaceRole,
  listAvailableSpaceRoles,
  SUPPORTED_SPACE_TYPES,
  PHASE,
  VERSION,
  MODULE_NAME,
  DATA_CONTRACT,
  SPACE_ROLE_INTELLIGENCE_VERSION,
  sceneTypeToFileName,
} = await import('../compile-space-role-prompt.mjs');
const { compileSpaceRuntime } = await import('../../space-runtime/compile-space-runtime.mjs');

let pass = 0;
let fail = 0;
const failures = [];

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.then(
        () => { pass += 1; console.log(`  \u2713 ${name}`); },
        (err) => { fail += 1; failures.push({ name, error: err }); console.log(`  \u2717 ${name}\n      ${err.message}`); },
      );
    }
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

console.log('Space Role Intelligence v1 (Phase 9C.1) \u2014 validation suite\n');

// ---------- Preconditions ----------
console.log('Preconditions:');

test('module exports compileSpaceRoleBlock + loadSpaceRole + SUPPORTED_SPACE_TYPES + DATA_CONTRACT', () => {
  assert(typeof compileSpaceRoleBlock === 'function', 'compileSpaceRoleBlock not exported');
  assert(typeof loadSpaceRole === 'function', 'loadSpaceRole not exported');
  assert(Array.isArray(SUPPORTED_SPACE_TYPES), 'SUPPORTED_SPACE_TYPES not exported');
  assert(DATA_CONTRACT, 'DATA_CONTRACT not exported');
});

test('PHASE = "9C.1" and VERSION = "1.0.0"', () => {
  assert(PHASE === '9C.1', `PHASE should be '9C.1', got '${PHASE}'`);
  assert(VERSION === '1.0.0', `VERSION should be '1.0.0', got '${VERSION}'`);
  assert(MODULE_NAME === 'space-role-intelligence', `MODULE_NAME should be 'space-role-intelligence', got '${MODULE_NAME}'`);
  assert(SPACE_ROLE_INTELLIGENCE_VERSION === '1.0.0', `SPACE_ROLE_INTELLIGENCE_VERSION should be '1.0.0'`);
});

test('SUPPORTED_SPACE_TYPES has all 8 space types (Phase 9C.1 §4)', () => {
  const expected = ['reception', 'lobby', 'vip_lounge', 'consultation', 'treatment', 'corridor', 'product_display', 'exterior'];
  assert(SUPPORTED_SPACE_TYPES.length === 8, `should have 8 space types, got ${SUPPORTED_SPACE_TYPES.length}`);
  for (const e of expected) {
    assert(SUPPORTED_SPACE_TYPES.includes(e), `SUPPORTED_SPACE_TYPES should include '${e}'`);
  }
});

// ---------- §10.1 Space Role JSON 可加载 ----------
console.log('\n\u00a710.1 Space Role JSON loadable:');

test('all 8 Space Role JSON files exist on disk', () => {
  const dir = join(__dirname, '..');
  for (const t of SUPPORTED_SPACE_TYPES) {
    const fileName = sceneTypeToFileName(t) + '.json';
    const filePath = join(dir, fileName);
    assert(existsSync(filePath), `Space Role JSON not found: ${filePath}`);
  }
});

test('loadSpaceRole returns parsed object with required fields (8 space types)', () => {
  const requiredFields = ['space_type', 'label', 'role', 'priority', 'visual_rules', 'functional_constraints', 'narrative_focus'];
  for (const t of SUPPORTED_SPACE_TYPES) {
    const r = loadSpaceRole(t);
    assert(r, `loadSpaceRole(${t}) returned null/undefined`);
    for (const f of requiredFields) {
      assert(r[f] !== undefined, `loadSpaceRole(${t}) missing field '${f}'`);
    }
    assert(r.space_type === t, `space_type mismatch: expected '${t}', got '${r.space_type}'`);
  }
});

test('loadSpaceRole: priority has 4 dimensions (privacy / comfort / brand_display / circulation) in [0,1]', () => {
  for (const t of SUPPORTED_SPACE_TYPES) {
    const r = loadSpaceRole(t);
    for (const dim of ['privacy', 'comfort', 'brand_display', 'circulation']) {
      assert(typeof r.priority[dim] === 'number', `${t}.priority.${dim} should be number`);
      assert(r.priority[dim] >= 0 && r.priority[dim] <= 1, `${t}.priority.${dim} should be in [0,1], got ${r.priority[dim]}`);
    }
  }
});

test('loadSpaceRole: visual_rules has lighting / material / density as strings', () => {
  for (const t of SUPPORTED_SPACE_TYPES) {
    const r = loadSpaceRole(t);
    assert(typeof r.visual_rules.lighting === 'string' && r.visual_rules.lighting.length > 0, `${t}.visual_rules.lighting`);
    assert(typeof r.visual_rules.material === 'string' && r.visual_rules.material.length > 0, `${t}.visual_rules.material`);
    assert(typeof r.visual_rules.density === 'string' && r.visual_rules.density.length > 0, `${t}.visual_rules.density`);
  }
});

test('loadSpaceRole: functional_constraints has must_include / must_exclude / key_equipment / human_traffic', () => {
  for (const t of SUPPORTED_SPACE_TYPES) {
    const r = loadSpaceRole(t);
    const fc = r.functional_constraints;
    assert(Array.isArray(fc.must_include) && fc.must_include.length > 0, `${t}.functional_constraints.must_include should be non-empty array`);
    assert(Array.isArray(fc.must_exclude) && fc.must_exclude.length > 0, `${t}.functional_constraints.must_exclude should be non-empty array`);
    assert(Array.isArray(fc.key_equipment) && fc.key_equipment.length > 0, `${t}.functional_constraints.key_equipment should be non-empty array`);
    assert(typeof fc.human_traffic === 'string' && fc.human_traffic.length > 0, `${t}.functional_constraints.human_traffic`);
  }
});

test('loadSpaceRole: role has primary + secondary (both non-empty strings)', () => {
  for (const t of SUPPORTED_SPACE_TYPES) {
    const r = loadSpaceRole(t);
    assert(typeof r.role.primary === 'string' && r.role.primary.length > 0, `${t}.role.primary`);
    assert(typeof r.role.secondary === 'string' && r.role.secondary.length > 0, `${t}.role.secondary`);
  }
});

test('loadSpaceRole: narrative_focus is non-empty string', () => {
  for (const t of SUPPORTED_SPACE_TYPES) {
    const r = loadSpaceRole(t);
    assert(typeof r.narrative_focus === 'string' && r.narrative_focus.length >= 10, `${t}.narrative_focus should be a substantive string`);
  }
});

test('loadSpaceRole throws on missing sceneType', () => {
  let threw = false;
  try { loadSpaceRole(null); } catch { threw = true; }
  assert(threw, 'should throw on null sceneType');
  threw = false;
  try { loadSpaceRole(''); } catch { threw = true; }
  assert(threw, 'should throw on empty sceneType');
});

test('loadSpaceRole throws on unsupported sceneType', () => {
  let threw = false;
  try { loadSpaceRole('unknown_space_type_xyz'); } catch { threw = true; }
  assert(threw, 'should throw on unsupported sceneType');
});

test('sceneTypeToFileName normalizes snake_case to kebab-case', () => {
  assert(sceneTypeToFileName('vip_lounge') === 'vip-lounge', `vip_lounge -> vip-lounge`);
  assert(sceneTypeToFileName('product_display') === 'product-display', `product_display -> product-display`);
  assert(sceneTypeToFileName('reception') === 'reception', `reception -> reception`);
  assert(sceneTypeToFileName('vip-lounge') === 'vip-lounge', `vip-lounge -> vip-lounge (kebab stays)`);
});

test('listAvailableSpaceRoles returns 8 scene types matching SUPPORTED_SPACE_TYPES', () => {
  const list = listAvailableSpaceRoles();
  assert(list.length === 8, `should list 8 space types, got ${list.length}`);
  for (const t of SUPPORTED_SPACE_TYPES) {
    assert(list.includes(t), `listAvailableSpaceRoles should include '${t}'`);
  }
});

// ---------- §10.2 Prompt Compiler 支持新 block ----------
console.log('\n\u00a710.2 Prompt Compiler integration:');

test('compileSpaceRoleBlock returns { blockId, blockTitle, content, spaceRole, characterCount }', () => {
  const r = compileSpaceRoleBlock('reception');
  assert(r.blockId === 'space_role_context', `blockId should be 'space_role_context', got '${r.blockId}'`);
  assert(typeof r.blockTitle === 'string' && r.blockTitle.includes('Space Role Context'), 'blockTitle should include "Space Role Context"');
  assert(typeof r.content === 'string' && r.content.length > 0, 'content should be non-empty string');
  assert(r.spaceRole, 'spaceRole should be present');
  assert(typeof r.characterCount === 'number' && r.characterCount > 0, 'characterCount should be positive number');
});

test('compileSpaceRoleBlock content includes role / priority / visual_rules / functional_constraints / narrative_focus', () => {
  const r = compileSpaceRoleBlock('vip_lounge');
  assert(r.content.includes('**Role**'), 'content should include **Role**');
  assert(r.content.includes('**Priority**'), 'content should include **Priority**');
  assert(r.content.includes('**Visual Rules**'), 'content should include **Visual Rules**');
  assert(r.content.includes('**Functional Constraints**'), 'content should include **Functional Constraints**');
  assert(r.content.includes('**Narrative Focus**'), 'content should include **Narrative Focus**');
  // VIP lounge specific
  assert(r.content.includes('0.9') || r.content.includes('privacy'), 'content should reference priority values');
  assert(r.content.includes('VIP'), 'content should reference VIP lounge specifics');
});

test('compileSpaceRoleBlock throws on missing sceneType', () => {
  let threw = false;
  try { compileSpaceRoleBlock(null); } catch { threw = true; }
  assert(threw, 'should throw on null sceneType');
});

test('compileSpaceRoleBlock throws on unsupported sceneType', () => {
  let threw = false;
  try { compileSpaceRoleBlock('unknown_space_type_xyz'); } catch { threw = true; }
  assert(threw, 'should throw on unsupported sceneType');
});

// ---------- §10.5 不同空间输出明显不同 ----------
console.log('\n\u00a710.5 Space-type differentiation:');

test('8 space_type priorities are all distinct (each axis is differentiated)', () => {
  const prioritiesByType = {};
  for (const t of SUPPORTED_SPACE_TYPES) {
    prioritiesByType[t] = JSON.stringify(loadSpaceRole(t).priority);
  }
  const unique = new Set(Object.values(prioritiesByType));
  assert(unique.size === 8, `8 space types should have 8 distinct priority fingerprints, got ${unique.size} unique`);
});

test('treatment has highest privacy (>= 0.9) and lowest brand_display (<= 0.3) — 9C.1 §3 functional differentiation', () => {
  const t = loadSpaceRole('treatment');
  assert(t.priority.privacy >= 0.9, `treatment.privacy should be >= 0.9, got ${t.priority.privacy}`);
  assert(t.priority.brand_display <= 0.3, `treatment.brand_display should be <= 0.3, got ${t.priority.brand_display}`);
});

test('exterior has highest brand_display (>= 0.9) — 9C.1 §3 first-impression space', () => {
  const t = loadSpaceRole('exterior');
  assert(t.priority.brand_display >= 0.9, `exterior.brand_display should be >= 0.9, got ${t.priority.brand_display}`);
});

test('corridor has highest circulation (>= 0.9) — 9C.1 §3 引导动线', () => {
  const t = loadSpaceRole('corridor');
  assert(t.priority.circulation >= 0.9, `corridor.circulation should be >= 0.9, got ${t.priority.circulation}`);
});

test('vip_lounge has high privacy (>= 0.85) and high comfort (>= 0.8)', () => {
  const t = loadSpaceRole('vip_lounge');
  assert(t.priority.privacy >= 0.85, `vip_lounge.privacy should be >= 0.85, got ${t.priority.privacy}`);
  assert(t.priority.comfort >= 0.8, `vip_lounge.comfort should be >= 0.8, got ${t.priority.comfort}`);
});

test('8 space_type must_include lists are all distinct', () => {
  const includes = SUPPORTED_SPACE_TYPES.map((t) => loadSpaceRole(t).functional_constraints.must_include.join(','));
  const unique = new Set(includes);
  assert(unique.size === 8, `8 must_include lists should be distinct, got ${unique.size}`);
});

test('reception must_include reception_desk / brand_wall; treatment must_include treatment_bed — 9C.1 §3 functional split', () => {
  const rec = loadSpaceRole('reception').functional_constraints.must_include;
  const trt = loadSpaceRole('treatment').functional_constraints.must_include;
  assert(rec.includes('reception_desk'), 'reception must_include reception_desk');
  assert(rec.includes('brand_wall'), 'reception must_include brand_wall');
  assert(trt.includes('treatment_bed'), 'treatment must_include treatment_bed');
  assert(!trt.includes('reception_desk'), 'treatment should NOT include reception_desk (functional split)');
  assert(!rec.includes('treatment_bed'), 'reception should NOT include treatment_bed (functional split)');
});

test('8 compiled prompt blocks (compileSpaceRoleBlock) are all distinct in content', () => {
  const contents = SUPPORTED_SPACE_TYPES.map((t) => compileSpaceRoleBlock(t).content);
  const unique = new Set(contents);
  assert(unique.size === 8, `8 compileSpaceRoleBlock contents should be distinct, got ${unique.size}`);
});

// ---------- §10.3 / §10.4 Brand Translation / Architecture DNA 不变化 ----------
console.log('\n\u00a710.3-4 Brand Translation / Architecture DNA byte-equal (9C.1 \u00a77):');

test('architecture_dna and brand_translation are byte-equal with/without 9C.1 (9C.1 §7 不修改) — JZMX', () => {
  const rWith = compileSpaceRuntime('jiuzhou-aesthetics', { includeSpaceRoleContext: true });
  const rWithout = compileSpaceRuntime('jiuzhou-aesthetics', { includeSpaceRoleContext: false });
  for (const layer of ['architecture_dna', 'brand_translation']) {
    const a = rWith.blocks.find((b) => b.id === layer)?.text;
    const b = rWithout.blocks.find((b) => b.id === layer)?.text;
    assert(a === b, `${layer} must be byte-equal with/without 9C.1`);
  }
});

test('architecture_dna and brand_translation are byte-equal with/without 9C.1 — FTT', () => {
  const rWith = compileSpaceRuntime('feng-tang-tang', { includeSpaceRoleContext: true });
  const rWithout = compileSpaceRuntime('feng-tang-tang', { includeSpaceRoleContext: false });
  for (const layer of ['architecture_dna', 'brand_translation']) {
    const a = rWith.blocks.find((b) => b.id === layer)?.text;
    const b = rWithout.blocks.find((b) => b.id === layer)?.text;
    assert(a === b, `${layer} must be byte-equal with/without 9C.1 (FTT)`);
  }
});

test('architecture_dna and brand_translation are byte-equal with/without 9C.1 — YJLF', () => {
  const rWith = compileSpaceRuntime('yi-ji-liang-fang', { includeSpaceRoleContext: true });
  const rWithout = compileSpaceRuntime('yi-ji-liang-fang', { includeSpaceRoleContext: false });
  for (const layer of ['architecture_dna', 'brand_translation']) {
    const a = rWith.blocks.find((b) => b.id === layer)?.text;
    const b = rWithout.blocks.find((b) => b.id === layer)?.text;
    assert(a === b, `${layer} must be byte-equal with/without 9C.1 (YJLF)`);
  }
});

// ---------- §10.6 同品牌保持统一 (但不同空间有差异) ----------
console.log('\n\u00a710.6 Same brand stays consistent:');

test('same brand, different space_type: brand_translation byte-equal, space_role_context distinct', () => {
  const r1 = compileSpaceRuntime('jiuzhou-aesthetics', { spaceTypeOverride: 'reception' });
  const r2 = compileSpaceRuntime('jiuzhou-aesthetics', { spaceTypeOverride: 'treatment' });

  // Brand language stays consistent
  const bt1 = r1.blocks.find((b) => b.id === 'brand_translation')?.text;
  const bt2 = r2.blocks.find((b) => b.id === 'brand_translation')?.text;
  assert(bt1 === bt2, 'brand_translation must be byte-equal across space_types (same brand language)');

  // Architecture DNA stays consistent
  const ad1 = r1.blocks.find((b) => b.id === 'architecture_dna')?.text;
  const ad2 = r2.blocks.find((b) => b.id === 'architecture_dna')?.text;
  assert(ad1 === ad2, 'architecture_dna must be byte-equal across space_types (same brand DNA)');

  // Space role context differs
  const sr1 = r1.compiledSpaceRole.content;
  const sr2 = r2.compiledSpaceRole.content;
  assert(sr1 !== sr2, 'space_role_context must differ between reception and treatment (functional differentiation)');
  assert(r1.compiledSpaceRole.spaceRole.space_type === 'reception', 'r1 space_type should be reception');
  assert(r2.compiledSpaceRole.spaceRole.space_type === 'treatment', 'r2 space_type should be treatment');
});

test('8 space_type on JZMX all produce distinct space_role_context content', () => {
  const seen = new Set();
  for (const t of SUPPORTED_SPACE_TYPES) {
    const r = compileSpaceRuntime('jiuzhou-aesthetics', { spaceTypeOverride: t });
    seen.add(r.compiledSpaceRole.content);
  }
  assert(seen.size === 8, `8 space_types should produce 8 distinct space_role_context, got ${seen.size}`);
});

// ---------- compileSpaceRuntime: Phase 9C.1 集成 ----------
console.log('\nPhase 9C.1 Runtime Integration:');

test('compileSpaceRuntime default includes space_role_context (blockCount 17)', () => {
  const r = compileSpaceRuntime('jiuzhou-aesthetics');
  assert(r.blockCount === 17, `default should be 17 blocks (9C.1), got ${r.blockCount}`);
  assert(r.includeSpaceRoleContext === true, 'includeSpaceRoleContext should default to true');
  assert(r.compiledSpaceRole, 'compiledSpaceRole should be populated');
  assert(r.compiledSpaceRole.blockId === 'space_role_context', 'compiledSpaceRole.blockId should be space_role_context');
});

test('compileSpaceRuntime includeSpaceRoleContext=false returns 16 blocks (no 9C.1)', () => {
  const r = compileSpaceRuntime('jiuzhou-aesthetics', { includeSpaceRoleContext: false });
  assert(r.blockCount === 16, `should be 16 blocks without 9C.1, got ${r.blockCount}`);
  assert(r.includeSpaceRoleContext === false, 'includeSpaceRoleContext should be false');
  assert(!r.compiledSpaceRole, 'compiledSpaceRole should be null when 9C.1 disabled');
});

test('compileSpaceRuntime 3 brand: space_type assignment is correct (sceneDefinition.sceneType fallback)', () => {
  // FTT / YJLF: sceneDefinition.sceneType should drive space_type
  const rFTT = compileSpaceRuntime('feng-tang-tang');
  const rYJLF = compileSpaceRuntime('yi-ji-liang-fang');
  // We don't hard-code which sceneType; just verify it's loaded and non-empty
  for (const [brand, r] of [['FTT', rFTT], ['YJLF', rYJLF]]) {
    const st = r.compiledSpaceRole.spaceRole.space_type;
    assert(SUPPORTED_SPACE_TYPES.includes(st), `${brand} space_type '${st}' should be in SUPPORTED_SPACE_TYPES`);
  }
});

test('compileSpaceRuntime WAYE (post-9C.0.5 DNA correction): compiles with 9C.1 space_role_context', () => {
  // 蛙耶 DNA 在 9C.0.5 被修正 (industry=casual_dining, sceneType=reception — 餐饮入口点单概念).
  // 9B.2 baseline 15 blocks (无 architecture_context, 因 wa-ye 没有 anchor registry),
  // 9C.1 default 16 blocks (15 + 1 space_role_context).
  const r = compileSpaceRuntime('wa-ye');
  assert(r.includeSpaceRoleContext === true, 'WAYE should include space role context by default');
  assert(r.blockCount === 16, `WAYE 9C.1 should be 16 blocks (15 baseline + 1 space_role_context), got ${r.blockCount}`);
  assert(r.compiledSpaceRole, 'compiledSpaceRole should be populated');
  assert(r.compiledSpaceRole.blockId === 'space_role_context', 'blockId should be space_role_context');
  assert(r.compiledSpaceRole.spaceRole.space_type === 'reception', `WAYE sceneType should be 'reception', got '${r.compiledSpaceRole.spaceRole.space_type}'`);
  // architecture_dna / brand_translation byte-equal with/without 9C.1
  const rWithout = compileSpaceRuntime('wa-ye', { includeSpaceRoleContext: false });
  for (const layer of ['architecture_dna', 'brand_translation']) {
    const a = r.blocks.find((b) => b.id === layer)?.text;
    const b = rWithout.blocks.find((b) => b.id === layer)?.text;
    assert(a === b, `${layer} must be byte-equal with/without 9C.1 (WAYE)`);
  }
});

// ---------- Validation: throws on invalid input ----------
console.log('\nInput validation:');

test('compileSpaceRuntime throws on unsupported spaceTypeOverride', () => {
  let threw = false;
  try { compileSpaceRuntime('jiuzhou-aesthetics', { spaceTypeOverride: 'unknown_xyz' }); } catch { threw = true; }
  assert(threw, 'should throw on unsupported spaceTypeOverride');
});

// ---------- No Provider Calls ----------
console.log('\nNo Provider Calls:');

test('compile-space-role-prompt.mjs 不调网络', () => {
  const src = readFileSync(join(__dirname, '..', 'compile-space-role-prompt.mjs'), 'utf8');
  assert(!src.includes('fetch('), 'compile-space-role-prompt.mjs should not have fetch calls');
  assert(!src.toLowerCase().includes('openai') && !src.toLowerCase().includes('seedream'), 'compile-space-role-prompt.mjs should not reference LLM providers');
});

test('data-contract.mjs 不调网络', () => {
  const src = readFileSync(join(__dirname, '..', 'data-contract.mjs'), 'utf8');
  assert(!src.includes('fetch('), 'data-contract.mjs should not have fetch calls');
  assert(!src.toLowerCase().includes('openai'), 'data-contract.mjs should not reference openai');
});

// ---------- summary ----------
await new Promise((r) => setTimeout(r, 100));
console.log(`\nSummary: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log(`  - ${f.name}: ${f.error.message}`);
  }
  process.exit(1);
}
process.exit(0);
