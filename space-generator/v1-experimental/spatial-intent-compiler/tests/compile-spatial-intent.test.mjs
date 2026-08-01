#!/usr/bin/env node
// Spatial Intent Compiler v1 (Phase 9A.2) — validation suite
// 用法: node space-generator/v1-experimental/spatial-intent-compiler/tests/compile-spatial-intent.test.mjs
//
// Phase 9A.2 §10 + §11 验收:
//   1. compiler module 完成 (compileSpatialIntent 输出 compiledSpatialIntent)
//   2. schema validation 完成 (5 字段 + optional weight)
//   3. 3 品牌测试通过 (differentiation, 3 brand 各自 distinct)
//   4. No Architecture Leakage (output 不含 anchor name / 图片关键词 / 品牌专属元素)
//   5. Stability (同输入多次编译结果稳定, §10)
//   6. 5 brand 自定义 (自定义 spatialIntentDna 编译)
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

const { compileSpatialIntent, compileSpatialIntentForBrand } = await import(
  '../compile-spatial-intent.mjs',
);

const compiledSchemaPath = join(__dirname, '..', 'schemas', 'compiled-spatial-intent.schema.json');
const compiledSchema = JSON.parse(readFileSync(compiledSchemaPath, 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateCompiled = ajv.compile(compiledSchema);

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

console.log('Spatial Intent Compiler v1 (Phase 9A.2) \u2014 validation suite\n');

// ---------- Preconditions ----------
console.log('Preconditions:');

test('schemas/compiled-spatial-intent.schema.json exists', () => {
  assert(existsSync(compiledSchemaPath), `missing: ${compiledSchemaPath}`);
});

test('compile-spatial-intent.mjs exports compileSpatialIntent + compileSpatialIntentForBrand', () => {
  assert(typeof compileSpatialIntent === 'function', 'compileSpatialIntent not exported');
  assert(typeof compileSpatialIntentForBrand === 'function', 'compileSpatialIntentForBrand not exported');
});

test('3 intent rules files exist (emotion / journey / space-role)', () => {
  for (const name of ['emotion-rules.json', 'journey-rules.json', 'space-role-rules.json']) {
    const p = join(__dirname, '..', 'intent-rules', name);
    assert(existsSync(p), `missing: ${p}`);
  }
});

// ---------- §11 验收 1: compiler module 完成 ----------
console.log('\n§11.1 compiler module:');

const rJZMX = compileSpatialIntentForBrand('jiuzhou-aesthetics');
const rFTT = compileSpatialIntentForBrand('feng-tang-tang');
const rYJLF = compileSpatialIntentForBrand('yi-ji-liang-fang');

test('compileSpatialIntentForBrand returns 5 fields + weight', () => {
  for (const k of ['experienceGoal', 'spatialStrategy', 'architecturalImplications', 'functionRelationship', 'constraints', 'weight']) {
    assert(rJZMX[k] !== undefined, `JZMX output missing ${k}`);
  }
});

test('output validates against compiled-spatial-intent.schema.json', () => {
  for (const [brand, r] of [['JZMX', rJZMX], ['FTT', rFTT], ['YJLF', rYJLF]]) {
    const ok = validateCompiled(r);
    if (!ok) {
      const errs = (validateCompiled.errors || []).slice(0, 3).map((e) => `${e.instancePath} ${e.message}`).join('; ');
      throw new Error(`${brand} output failed schema validation: ${errs}`);
    }
  }
});

test('experienceGoal is non-empty string for all 3 brands', () => {
  for (const [brand, r] of [['JZMX', rJZMX], ['FTT', rFTT], ['YJLF', rYJLF]]) {
    assert(typeof r.experienceGoal === 'string' && r.experienceGoal.length > 0,
      `${brand} experienceGoal should be non-empty string, got ${r.experienceGoal?.length || 0} chars`);
  }
});

test('4 array fields are non-empty arrays for all 3 brands', () => {
  for (const [brand, r] of [['JZMX', rJZMX], ['FTT', rFTT], ['YJLF', rYJLF]]) {
    for (const k of ['spatialStrategy', 'architecturalImplications', 'functionRelationship', 'constraints']) {
      assert(Array.isArray(r[k]) && r[k].length > 0,
        `${brand}.${k} should be non-empty array, got ${r[k]?.length || 0} items`);
    }
  }
});

test('weight defaults to 0.25 (Phase 9A.2 recommendation)', () => {
  for (const [brand, r] of [['JZMX', rJZMX], ['FTT', rFTT], ['YJLF', rYJLF]]) {
    assert(r.weight === 0.25, `${brand} weight should default to 0.25, got ${r.weight}`);
  }
});

// ---------- §10 Differentiation ----------
console.log('\n§10 Differentiation:');

test('3 brand experienceGoal are distinct', () => {
  assert(rJZMX.experienceGoal !== rFTT.experienceGoal, 'JZMX == FTT');
  assert(rJZMX.experienceGoal !== rYJLF.experienceGoal, 'JZMX == YJLF');
  assert(rFTT.experienceGoal !== rYJLF.experienceGoal, 'FTT == YJLF');
});

test('3 brand spatialStrategy are distinct (overlap < 50%)', () => {
  const overlap = (a, b) => a.filter((x) => b.includes(x)).length;
  const jzFt = overlap(rJZMX.spatialStrategy, rFTT.spatialStrategy);
  const jzYj = overlap(rJZMX.spatialStrategy, rYJLF.spatialStrategy);
  const ftYj = overlap(rFTT.spatialStrategy, rYJLF.spatialStrategy);
  const totalOverlap = jzFt + jzYj + ftYj;
  const totalItems = rJZMX.spatialStrategy.length + rFTT.spatialStrategy.length + rYJLF.spatialStrategy.length;
  const overlapRatio = totalOverlap / totalItems;
  assert(overlapRatio < 0.5,
    `3 brand spatialStrategy overlap ratio ${overlapRatio.toFixed(2)} should be < 0.5`);
});

test('3 brand constraints are distinct (each brand has its own forbidden directions)', () => {
  // JZMX should have "hospital corridor" or "clinical", not "kitchen" or "tea"
  assert(rJZMX.constraints.some((c) => c.includes('hospital') || c.includes('clinical')),
    `JZMX constraints should mention hospital/clinical, got: ${rJZMX.constraints.join(', ')}`);
  assert(!rJZMX.constraints.some((c) => c.includes('kitchen') || c.includes('tea') || c.includes('herbal')),
    `JZMX constraints should not contain FTT/YJLF forbidden: ${rJZMX.constraints.join(', ')}`);

  // FTT should have "hidden kitchen" or "sterile" or "fine dining", not "clinical" or "herbal"
  assert(rFTT.constraints.some((c) => c.includes('kitchen') || c.includes('sterile') || c.includes('fine dining')),
    `FTT constraints should mention kitchen/sterile/fine dining, got: ${rFTT.constraints.join(', ')}`);
  assert(!rFTT.constraints.some((c) => c.includes('clinical') || c.includes('herbal') || c.includes('modern museum')),
    `FTT constraints should not contain JZMX/YJLF forbidden: ${rFTT.constraints.join(', ')}`);

  // YJLF should have "clinical" or "spa" or "museum", not "kitchen"
  assert(rYJLF.constraints.some((c) => c.includes('clinical') || c.includes('spa') || c.includes('museum') || c.includes('modern')),
    `YJLF constraints should mention clinical/spa/museum/modern, got: ${rYJLF.constraints.join(', ')}`);
  assert(!rYJLF.constraints.some((c) => c.includes('hidden kitchen') || c.includes('sterile dining')),
    `YJLF constraints should not contain FTT forbidden: ${rYJLF.constraints.join(', ')}`);
});

test('JZMX spatialStrategy includes "soft boundary" / FTT includes "visible process" / YJLF includes "calm rhythm"', () => {
  assert(rJZMX.spatialStrategy.includes('soft boundary'),
    `JZMX spatialStrategy should include 'soft boundary', got: ${rJZMX.spatialStrategy.join(', ')}`);
  assert(rFTT.spatialStrategy.includes('visible process'),
    `FTT spatialStrategy should include 'visible process', got: ${rFTT.spatialStrategy.join(', ')}`);
  assert(rYJLF.spatialStrategy.includes('calm rhythm'),
    `YJLF spatialStrategy should include 'calm rhythm', got: ${rYJLF.spatialStrategy.join(', ')}`);
});

// ---------- §10 No Architecture Leakage ----------
console.log('\n§10 No Architecture Leakage:');

const FORBIDDEN_LEAKAGE = {
  anchor_names: ['JZMX-ARCH-', 'FTT-ARCH-', 'YJLF-ARCH-'],
  // Phase 9A.1 FORBIDDEN_WORDS 的 material/architecture_specific 列表
  material: ['mineral_plaster', 'frosted_glass', 'warm_wood_booth', 'red_brick_wall', 'terracotta_tile',
    'matte_clay_wall', 'linen_fabric', 'rice_paper', 'brass_fitting', 'translucent_membrane'],
  architecture_specific: ['层叠半透明介质', '3 大格落地玻璃', '金属长方体接待台', 'membrane ceiling', 'open kitchen window', 'wooden grid partition', 'paper screen'],
  // Phase 9A.1 architecturalReason 提到的高层方向可以出现 (不视为 leakage), 但具体实现方式 (booth / booth / 茶角 / 暖色木等) 不应出现
  // 注意: tea corner / kitchen_pass / booth 在 emotional/symbolic context 是允许的 (e.g. "avoid hidden kitchen"),
  // 但作为 architectural form (描述具体物) 不应出现
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
  test(`${brand} compiled spatial intent 不含 anchor name (§10 No Architecture Leakage)`, () => {
    const allText = JSON.stringify(r);
    for (const word of FORBIDDEN_LEAKAGE.anchor_names) {
      assert(!allText.includes(word),
        `${brand} should not leak anchor name "${word}" (Phase 9A.2 §10)`);
    }
  });

  test(`${brand} compiled spatial intent 不含具体 material (§10 No Architecture Leakage)`, () => {
    const allText = JSON.stringify(r).toLowerCase();
    for (const word of FORBIDDEN_LEAKAGE.material) {
      assert(!allText.includes(word.toLowerCase()),
        `${brand} should not leak material "${word}" (Phase 9A.2 §10)`);
    }
  });

  test(`${brand} compiled spatial intent 不含具体 architecture_specific (§10 No Architecture Leakage)`, () => {
    const allText = JSON.stringify(r).toLowerCase();
    for (const word of FORBIDDEN_LEAKAGE.architecture_specific) {
      assert(!allText.includes(word.toLowerCase()),
        `${brand} should not leak architecture_specific "${word}" (Phase 9A.2 §10)`);
    }
  });
}

// ---------- §10 Stability ----------
console.log('\n§10 Stability (同输入多次编译结果稳定):');

test('compileSpatialIntentForBrand("jiuzhou-aesthetics") is deterministic (10 runs)', () => {
  const first = JSON.stringify(compileSpatialIntentForBrand('jiuzhou-aesthetics'));
  for (let i = 0; i < 10; i++) {
    const next = JSON.stringify(compileSpatialIntentForBrand('jiuzhou-aesthetics'));
    assert(next === first,
      `Run ${i + 1} differs from first run (stability violation)`);
  }
});

test('compileSpatialIntentForBrand is deterministic across all 3 brands', () => {
  for (const brand of ['jiuzhou-aesthetics', 'feng-tang-tang', 'yi-ji-liang-fang']) {
    const first = JSON.stringify(compileSpatialIntentForBrand(brand));
    for (let i = 0; i < 5; i++) {
      const next = JSON.stringify(compileSpatialIntentForBrand(brand));
      assert(next === first, `${brand} run ${i + 1} differs from first (stability)`);
    }
  }
});

// ---------- 自定义 spatialIntentDna 编译 ----------
console.log('\nCustom spatialIntentDna compilation:');

test('custom spatialIntentDna compiles correctly', () => {
  const custom = {
    primaryEmotion: '让客户感到兴奋和惊讶',
    userJourney: '进入 -> 体验 -> 离开时分享',
    spaceRole: '创造难忘的品牌体验',
    designLogic: '通过戏剧性灯光和空间尺度',
    architecturalReason: '需要戏剧性层高和动态光照',
  };
  const r = compileSpatialIntent(custom);
  assert(typeof r.experienceGoal === 'string' && r.experienceGoal.length > 0,
    'custom compiled should have non-empty experienceGoal');
  assert(Array.isArray(r.spatialStrategy), 'custom compiled should have spatialStrategy array');
  // 验证输出 schema
  assert(validateCompiled(r), 'custom compiled output should validate');
});

test('compileSpatialIntent throws on null input', () => {
  let threw = false;
  try { compileSpatialIntent(null); } catch { threw = true; }
  assert(threw, 'should throw on null input');
});

test('compileSpatialIntent throws on missing field', () => {
  let threw = false;
  try {
    compileSpatialIntent({
      primaryEmotion: 'x',
      userJourney: 'x',
      // spaceRole missing
      designLogic: 'x',
      architecturalReason: 'x',
    });
  } catch { threw = true; }
  assert(threw, 'should throw on missing spaceRole');
});

// ---------- §11 验收 4: 无 Provider 调用 (sanity) ----------
console.log('\n§11.4 No Provider Calls:');

test('compileSpatialIntent 不调网络 (no fetch / http / https imports)', () => {
  const src = readFileSync(join(__dirname, '..', 'compile-spatial-intent.mjs'), 'utf8');
  // 检查明显的网络调用
  assert(!src.includes('fetch(') && !src.includes('http.') && !src.includes('https.'),
    'compile-spatial-intent.mjs should not have network calls');
  // 检查 import 路径不含 provider / openai / seedream
  // 注释和 docstring 可以提及 "Provider" (这是设计意图说明), 但 import 不能引入.
  const importLines = src.split('\n').filter((l) => l.trim().startsWith('import ') || l.trim().startsWith('from '));
  for (const line of importLines) {
    assert(!line.toLowerCase().includes('openai') && !line.toLowerCase().includes('seedream') && !line.toLowerCase().includes('http'),
      `compile-spatial-intent.mjs import line should not reference LLM/Provider: ${line.trim()}`);
  }
});

// ---------- §11 验收 5: 不修改 Prompt Runtime (sanity) ----------
console.log('\n§11.5 No Prompt Runtime Modification:');

test('compileSpatialIntent module 不导出 prompt 编译函数', () => {
  // Note: 这个 test 在测试开始时已经 import, 这里直接验证 export 列表
  // 验证 module 只导出 compileSpatialIntent + compileSpatialIntentForBrand
  // 我们从 import 语句提取 export 名字 (静态分析)
  const src = readFileSync(join(__dirname, '..', 'compile-spatial-intent.mjs'), 'utf8');
  const exportMatches = src.match(/export\s+(?:async\s+)?function\s+(\w+)/g) ?? [];
  const exported = exportMatches.map((m) => m.match(/function\s+(\w+)/)[1]);
  for (const e of exported) {
    assert(['compileSpatialIntent', 'compileSpatialIntentForBrand'].includes(e),
      `compile-spatial-intent.mjs should not export '${e}' (Phase 9A.2 §11 不修改 Prompt Runtime)`);
  }
});

test('compileSpatialIntent 不调用 compileFieldEnrichedPrompt / compileRuntimePrompt', () => {
  const src = readFileSync(join(__dirname, '..', 'compile-spatial-intent.mjs'), 'utf8');
  assert(!src.includes('compileFieldEnrichedPrompt'),
    'compile-spatial-intent.mjs should not import compileFieldEnrichedPrompt');
  assert(!src.includes('compileRuntimePrompt'),
    'compile-spatial-intent.mjs should not import compileRuntimePrompt');
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
