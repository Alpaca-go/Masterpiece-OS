#!/usr/bin/env node
// Architecture Bridge v1 (Phase 9A.3) — validation suite
// 用法: node space-generator/v1-experimental/architecture-bridge/tests/compile-architecture-bridge.test.mjs
//
// Phase 9A.3 §10 + §11 验收:
//   1. bridge module 完成 (compileArchitectureBridge 输出 architectureLanguage)
//   2. schema validation 完成 (5 字段 + optional weight)
//   3. 3 品牌测试通过 (differentiation, 3 brand 各自 distinct, §10 Multi-brand Validation)
//   4. No Anchor Leakage (output 不含 anchor name / 具体 material / 装饰元素)
//   5. Stability (同输入多次编译结果稳定, §10)
//   6. Intent preservation (architecture language 包含 §10 期望关键词)
//
// 不调真实 Provider, 不污染生产代码, 不动 v1-baseline.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..');

const { compileArchitectureBridge, compileArchitectureBridgeForBrand } = await import(
  '../compile-architecture-bridge.mjs',
);

const archLangSchemaPath = join(__dirname, '..', 'schemas', 'architecture-language.schema.json');
const archLangSchema = JSON.parse(readFileSync(archLangSchemaPath, 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateArchLang = ajv.compile(archLangSchema);

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

console.log('Architecture Bridge v1 (Phase 9A.3) \u2014 validation suite\n');

// ---------- Preconditions ----------
console.log('Preconditions:');

test('schemas/architecture-language.schema.json exists', () => {
  assert(existsSync(archLangSchemaPath), `missing: ${archLangSchemaPath}`);
});

test('compile-architecture-bridge.mjs exports compileArchitectureBridge + compileArchitectureBridgeForBrand', () => {
  assert(typeof compileArchitectureBridge === 'function', 'compileArchitectureBridge not exported');
  assert(typeof compileArchitectureBridgeForBrand === 'function', 'compileArchitectureBridgeForBrand not exported');
});

test('3 bridge rules files exist (emotion-to-space / strategy-to-architecture / architecture-principles)', () => {
  for (const name of ['emotion-to-space.json', 'strategy-to-architecture.json', 'architecture-principles.json']) {
    const p = join(__dirname, '..', 'bridge-rules', name);
    assert(existsSync(p), `missing: ${p}`);
  }
});

// ---------- §11 验收 1: bridge module 完成 ----------
console.log('\n§11.1 bridge module:');

const rJZMX = compileArchitectureBridgeForBrand('jiuzhou-aesthetics');
const rFTT = compileArchitectureBridgeForBrand('feng-tang-tang');
const rYJLF = compileArchitectureBridgeForBrand('yi-ji-liang-fang');

test('compileArchitectureBridgeForBrand returns 5 fields + weight', () => {
  for (const k of ['spatialPrinciples', 'architecturalCharacteristics', 'materialDirection', 'lightDirection', 'spatialOrganization', 'weight']) {
    assert(rJZMX[k] !== undefined, `JZMX output missing ${k}`);
  }
});

test('output validates against architecture-language.schema.json', () => {
  for (const [brand, r] of [['JZMX', rJZMX], ['FTT', rFTT], ['YJLF', rYJLF]]) {
    const ok = validateArchLang(r);
    if (!ok) {
      const errs = (validateArchLang.errors || []).slice(0, 3).map((e) => `${e.instancePath} ${e.message}`).join('; ');
      throw new Error(`${brand} output failed schema validation: ${errs}`);
    }
  }
});

test('5 array fields are non-empty arrays for all 3 brands', () => {
  for (const [brand, r] of [['JZMX', rJZMX], ['FTT', rFTT], ['YJLF', rYJLF]]) {
    for (const k of ['spatialPrinciples', 'architecturalCharacteristics', 'materialDirection', 'lightDirection', 'spatialOrganization']) {
      assert(Array.isArray(r[k]) && r[k].length > 0,
        `${brand}.${k} should be non-empty array, got ${r[k]?.length || 0} items`);
    }
  }
});

test('weight defaults to 0.25 (Phase 9A.3 recommendation)', () => {
  for (const [brand, r] of [['JZMX', rJZMX], ['FTT', rFTT], ['YJLF', rYJLF]]) {
    assert(r.weight === 0.25, `${brand} weight should default to 0.25, got ${r.weight}`);
  }
});

test('weight can be overridden via options', () => {
  const r = compileArchitectureBridgeForBrand('jiuzhou-aesthetics', { weight: 0.5 });
  assert(r.weight === 0.5, `custom weight 0.5 should apply, got ${r.weight}`);
});

// ---------- §10 Brand independence (3 brand differentiation) ----------
console.log('\n§10 Brand independence:');

test('3 brand spatialPrinciples are distinct (overlap < 50%)', () => {
  const overlap = (a, b) => a.filter((x) => b.includes(x)).length;
  const jzFt = overlap(rJZMX.spatialPrinciples, rFTT.spatialPrinciples);
  const jzYj = overlap(rJZMX.spatialPrinciples, rYJLF.spatialPrinciples);
  const ftYj = overlap(rFTT.spatialPrinciples, rYJLF.spatialPrinciples);
  const totalOverlap = jzFt + jzYj + ftYj;
  const totalItems = rJZMX.spatialPrinciples.length + rFTT.spatialPrinciples.length + rYJLF.spatialPrinciples.length;
  const overlapRatio = totalOverlap / totalItems;
  assert(overlapRatio < 0.5,
    `3 brand spatialPrinciples overlap ratio ${overlapRatio.toFixed(2)} should be < 0.5 (jzFt=${jzFt}, jzYj=${jzYj}, ftYj=${ftYj})`);
});

test('3 brand architecturalCharacteristics are distinct (each brand has its own characteristics)', () => {
  // JZMX should have "continuous spatial flow" or "soft boundary", not "human scale" / "process visibility" / "layered privacy"
  assert(rJZMX.architecturalCharacteristics.some((c) => c.includes('continuous spatial flow') || c.includes('soft boundary')),
    `JZMX architecturalCharacteristics should include continuous spatial flow / soft boundary, got: ${rJZMX.architecturalCharacteristics.join(', ')}`);
  assert(!rJZMX.architecturalCharacteristics.some((c) => c.includes('human scale') || c.includes('process visibility') || c.includes('layered privacy')),
    `JZMX architecturalCharacteristics should not contain FTT/YJLF characteristics: ${rJZMX.architecturalCharacteristics.join(', ')}`);

  // FTT should have "human scale" or "process visibility", not "continuous spatial flow" / "layered privacy gradient"
  assert(rFTT.architecturalCharacteristics.some((c) => c.includes('human scale') || c.includes('process visibility')),
    `FTT architecturalCharacteristics should include human scale / process visibility, got: ${rFTT.architecturalCharacteristics.join(', ')}`);
  assert(!rFTT.architecturalCharacteristics.some((c) => c.includes('continuous spatial flow') || c.includes('layered privacy gradient')),
    `FTT architecturalCharacteristics should not contain JZMX/YJLF characteristics: ${rFTT.architecturalCharacteristics.join(', ')}`);

  // YJLF should have "layered privacy gradient" or "diffused natural light", not "continuous spatial flow" / "process visibility"
  assert(rYJLF.architecturalCharacteristics.some((c) => c.includes('layered privacy gradient') || c.includes('diffused natural light')),
    `YJLF architecturalCharacteristics should include layered privacy gradient / diffused natural light, got: ${rYJLF.architecturalCharacteristics.join(', ')}`);
  assert(!rYJLF.architecturalCharacteristics.some((c) => c.includes('continuous spatial flow') || c.includes('process visibility')),
    `YJLF architecturalCharacteristics should not contain JZMX/FTT characteristics: ${rYJLF.architecturalCharacteristics.join(', ')}`);
});

test('3 brand materialDirection are distinct (each brand has its own material direction)', () => {
  // JZMX: mineral / translucent
  assert(rJZMX.materialDirection.some((m) => m.includes('mineral') || m.includes('translucent')),
    `JZMX materialDirection should include mineral/translucent, got: ${rJZMX.materialDirection.join(', ')}`);
  // FTT: warm surface / natural texture
  assert(rFTT.materialDirection.some((m) => m.includes('warm') || m.includes('natural texture')),
    `FTT materialDirection should include warm/natural texture, got: ${rFTT.materialDirection.join(', ')}`);
  // YJLF: natural wood / paper
  assert(rYJLF.materialDirection.some((m) => m.includes('wood') || m.includes('paper')),
    `YJLF materialDirection should include wood/paper, got: ${rYJLF.materialDirection.join(', ')}`);
});

test('3 brand lightDirection are distinct (each brand has its own light direction)', () => {
  // JZMX: indirect / soft
  assert(rJZMX.lightDirection.some((l) => l.includes('indirect') || l.includes('soft natural')),
    `JZMX lightDirection should include indirect/soft natural, got: ${rJZMX.lightDirection.join(', ')}`);
  // FTT: natural daylight / warm ambient
  assert(rFTT.lightDirection.some((l) => l.includes('natural daylight') || l.includes('warm ambient')),
    `FTT lightDirection should include natural daylight / warm ambient, got: ${rFTT.lightDirection.join(', ')}`);
  // YJLF: diffused / soft natural
  assert(rYJLF.lightDirection.some((l) => l.includes('diffused') || l.includes('soft natural')),
    `YJLF lightDirection should include diffused/soft natural, got: ${rYJLF.lightDirection.join(', ')}`);
});

test('3 brand spatialOrganization are distinct (each brand has its own organization)', () => {
  // JZMX: gradual privacy / clear user circulation
  assert(rJZMX.spatialOrganization.some((o) => o.includes('gradual privacy') || o.includes('clear user circulation')),
    `JZMX spatialOrganization should include gradual privacy / clear user circulation, got: ${rJZMX.spatialOrganization.join(', ')}`);
  // FTT: process-as-anchor / dining circulation
  assert(rFTT.spatialOrganization.some((o) => o.includes('process-as-anchor') || o.includes('dining circulation')),
    `FTT spatialOrganization should include process-as-anchor / dining circulation, got: ${rFTT.spatialOrganization.join(', ')}`);
  // YJLF: layered privacy / consultation circulation
  assert(rYJLF.spatialOrganization.some((o) => o.includes('layered privacy') || o.includes('consultation circulation')),
    `YJLF spatialOrganization should include layered privacy / consultation circulation, got: ${rYJLF.spatialOrganization.join(', ')}`);
});

// ---------- §10 §10 Multi-brand Validation expected keywords ----------
console.log('\n§10 Multi-brand Validation (expected keywords):');

test('JZMX architecture language includes §10 expected: continuous space / soft boundary / controlled transparency', () => {
  // JZMX: "continuous space" / "soft boundary" / "controlled transparency"
  // soft boundary 可能出现在 spatialPrinciples 或 architecturalCharacteristics
  const allText = JSON.stringify(rJZMX).toLowerCase();
  assert(allText.includes('continuous space'),
    `JZMX should include 'continuous space', got: ${rJZMX.spatialPrinciples.join(', ')} / ${rJZMX.architecturalCharacteristics.join(', ')}`);
  assert(allText.includes('soft boundary'),
    `JZMX should include 'soft boundary', got: ${rJZMX.spatialPrinciples.join(', ')} / ${rJZMX.architecturalCharacteristics.join(', ')}`);
  assert(allText.includes('controlled transparency'),
    `JZMX should include 'controlled transparency', got: ${rJZMX.spatialPrinciples.join(', ')} / ${rJZMX.architecturalCharacteristics.join(', ')}`);
});

test('FTT architecture language includes §10 expected: human scale / visible process / warm interaction', () => {
  const allText = JSON.stringify(rFTT).toLowerCase();
  assert(allText.includes('human scale'),
    `FTT should include 'human scale', got: ${rFTT.spatialPrinciples.join(', ')} / ${rFTT.architecturalCharacteristics.join(', ')}`);
  assert(allText.includes('visible process'),
    `FTT should include 'visible process', got: ${rFTT.spatialPrinciples.join(', ')} / ${rFTT.architecturalCharacteristics.join(', ')}`);
  assert(allText.includes('warm interaction'),
    `FTT should include 'warm interaction', got: ${rFTT.spatialPrinciples.join(', ')} / ${rFTT.architecturalCharacteristics.join(', ')}`);
});

test('YJLF architecture language includes §10 expected: layered privacy / natural materials / calm circulation', () => {
  const allText = JSON.stringify(rYJLF).toLowerCase();
  assert(allText.includes('layered privacy'),
    `YJLF should include 'layered privacy', got: ${rYJLF.spatialPrinciples.join(', ')} / ${rYJLF.architecturalCharacteristics.join(', ')}`);
  assert(allText.includes('natural materials') || allText.includes('natural material relationship'),
    `YJLF should include 'natural materials' (or 'natural material relationship'), got: ${rYJLF.spatialPrinciples.join(', ')} / ${rYJLF.architecturalCharacteristics.join(', ')}`);
  assert(allText.includes('calm circulation') || allText.includes('quiet circulation'),
    `YJLF should include 'calm circulation' (or 'quiet circulation'), got: ${rYJLF.spatialPrinciples.join(', ')} / ${rYJLF.architecturalCharacteristics.join(', ')}`);
});

// ---------- §10 No Architecture Leakage ----------
console.log('\n§10 No Architecture Leakage:');

const FORBIDDEN_LEAKAGE = {
  anchor_names: ['JZMX-ARCH-', 'FTT-ARCH-', 'YJLF-ARCH-'],
  // Phase 9A.1/9A.2 FORBIDDEN_WORDS 的 material 列表 (具体物, 桥接层不应出现)
  material: ['mineral_plaster', 'frosted_glass', 'warm_wood_booth', 'red_brick_wall', 'terracotta_tile',
    'matte_clay_wall', 'linen_fabric', 'rice_paper', 'brass_fitting', 'translucent_membrane'],
  // 装饰元素 / 具体造型 (桥接层应只输出方向, 不应输出具体物)
  architecture_specific: ['层叠半透明介质', '3 大格落地玻璃', '金属长方体接待台', 'membrane ceiling', 'open kitchen window', 'wooden grid partition', 'paper screen'],
};

function checkNoLeakage(label, output) {
  const allText = JSON.stringify(output);
  for (const [category, words] of Object.entries(FORBIDDEN_LEAKAGE)) {
    for (const word of words) {
      if (allText.toLowerCase().includes(word.toLowerCase())) {
        return `${label} leaks ${category} keyword "${word}"`;
      }
    }
  }
  return null;
}

for (const [brand, r] of [['JZMX', rJZMX], ['FTT', rFTT], ['YJLF', rYJLF]]) {
  test(`${brand} architecture language 不含 anchor name (§10 No Anchor Leakage)`, () => {
    const allText = JSON.stringify(r);
    for (const word of FORBIDDEN_LEAKAGE.anchor_names) {
      assert(!allText.includes(word),
        `${brand} should not leak anchor name "${word}" (Phase 9A.3 §10)`);
    }
  });

  test(`${brand} architecture language 不含具体 material (§10 No Anchor Leakage)`, () => {
    const allText = JSON.stringify(r).toLowerCase();
    for (const word of FORBIDDEN_LEAKAGE.material) {
      assert(!allText.includes(word.toLowerCase()),
        `${brand} should not leak material "${word}" (Phase 9A.3 §10)`);
    }
  });

  test(`${brand} architecture language 不含具体 architecture_specific (§10 No Anchor Leakage)`, () => {
    const allText = JSON.stringify(r).toLowerCase();
    for (const word of FORBIDDEN_LEAKAGE.architecture_specific) {
      assert(!allText.includes(word.toLowerCase()),
        `${brand} should not leak architecture_specific "${word}" (Phase 9A.3 §10)`);
    }
  });
}

// ---------- §10 Stability ----------
console.log('\n§10 Stability (同输入多次编译结果稳定):');

test('compileArchitectureBridgeForBrand("jiuzhou-aesthetics") is deterministic (10 runs)', () => {
  const first = JSON.stringify(compileArchitectureBridgeForBrand('jiuzhou-aesthetics'));
  for (let i = 0; i < 10; i++) {
    const next = JSON.stringify(compileArchitectureBridgeForBrand('jiuzhou-aesthetics'));
    assert(next === first,
      `Run ${i + 1} differs from first run (stability violation)`);
  }
});

test('compileArchitectureBridgeForBrand is deterministic across all 3 brands', () => {
  for (const brand of ['jiuzhou-aesthetics', 'feng-tang-tang', 'yi-ji-liang-fang']) {
    const first = JSON.stringify(compileArchitectureBridgeForBrand(brand));
    for (let i = 0; i < 5; i++) {
      const next = JSON.stringify(compileArchitectureBridgeForBrand(brand));
      assert(next === first, `${brand} run ${i + 1} differs from first (stability)`);
    }
  }
});

// ---------- Intent preservation (custom compiledSpatialIntent) ----------
console.log('\nIntent preservation (custom compiledSpatialIntent):');

test('custom compiledSpatialIntent compiles correctly', () => {
  const custom = {
    experienceGoal: '建立一种平静的疗愈氛围',
    spatialStrategy: ['soft transition', 'calm circulation'],
    architecturalImplications: ['gradual transition', 'controlled openness'],
    functionRelationship: ['single patient flow', 'clear path'],
    constraints: ['avoid hospital corridor'],
  };
  const r = compileArchitectureBridge(custom);
  assert(typeof r.spatialPrinciples === 'object' && Array.isArray(r.spatialPrinciples),
    'custom compiled should have spatialPrinciples array');
  assert(r.spatialPrinciples.length > 0, 'custom compiled should have non-empty spatialPrinciples');
  // 验证输出 schema
  assert(validateArchLang(r), 'custom compiled output should validate');
});

test('compileArchitectureBridge throws on null input', () => {
  let threw = false;
  try { compileArchitectureBridge(null); } catch { threw = true; }
  assert(threw, 'should throw on null input');
});

test('compileArchitectureBridge throws on missing field', () => {
  let threw = false;
  try {
    compileArchitectureBridge({
      experienceGoal: 'x',
      // spatialStrategy missing
      architecturalImplications: ['x'],
      functionRelationship: ['x'],
      constraints: ['x'],
    });
  } catch { threw = true; }
  assert(threw, 'should throw on missing spatialStrategy');
});

// ---------- §11.4 No Provider Calls (sanity) ----------
console.log('\n§11.4 No Provider Calls:');

test('compile-architecture-bridge.mjs 不调网络 (no fetch / http / https imports)', () => {
  const src = readFileSync(join(__dirname, '..', 'compile-architecture-bridge.mjs'), 'utf8');
  // 检查明显的网络调用
  assert(!src.includes('fetch(') && !src.includes('http.') && !src.includes('https.'),
    'compile-architecture-bridge.mjs should not have network calls');
  // 检查 import 路径不含 provider / openai / seedream
  const importLines = src.split('\n').filter((l) => l.trim().startsWith('import ') || l.trim().startsWith('from '));
  for (const line of importLines) {
    assert(!line.toLowerCase().includes('openai') && !line.toLowerCase().includes('seedream') && !line.toLowerCase().includes('http'),
      `compile-architecture-bridge.mjs import line should not reference LLM/Provider: ${line.trim()}`);
  }
});

// ---------- §11.5 No Prompt Runtime Modification (sanity) ----------
console.log('\n§11.5 No Prompt Runtime Modification:');

test('compile-architecture-bridge.mjs module 不导出 prompt 编译函数', () => {
  const src = readFileSync(join(__dirname, '..', 'compile-architecture-bridge.mjs'), 'utf8');
  const exportMatches = src.match(/export\s+(?:async\s+)?function\s+(\w+)/g) ?? [];
  const exported = exportMatches.map((m) => m.match(/function\s+(\w+)/)[1]);
  for (const e of exported) {
    assert(['compileArchitectureBridge', 'compileArchitectureBridgeForBrand'].includes(e),
      `compile-architecture-bridge.mjs should not export '${e}' (Phase 9A.3 §11 不修改 Prompt Runtime)`);
  }
});

test('compile-architecture-bridge.mjs 不调用 compileFieldEnrichedPrompt / compileRuntimePrompt', () => {
  const src = readFileSync(join(__dirname, '..', 'compile-architecture-bridge.mjs'), 'utf8');
  assert(!src.includes('compileFieldEnrichedPrompt'),
    'compile-architecture-bridge.mjs should not import compileFieldEnrichedPrompt');
  assert(!src.includes('compileRuntimePrompt'),
    'compile-architecture-bridge.mjs should not import compileRuntimePrompt');
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
