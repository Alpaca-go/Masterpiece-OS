#!/usr/bin/env node
// Spatial Intent Schema v9A.1 — validation suite
// 用法: node space-generator/v1-experimental/field-schema/tests/spatial-intent.test.mjs
//
// Phase 9A.1 §8 + §9 验收:
//   1. schema completeness (5 字段都有, minLength=1)
//   2. 3 brand examples (JZMX / FTT / YJLF) 加载 + validate
//   3. brand differentiation (Phase 9A.1 §7 明显不同, 禁止通用高级感)
//   4. layer boundary (Phase 9A.1 §5: 不含 architecture / material / anchor / rendering 关键词)
//   5. no architecture leakage (不出现具体建筑形式如 "membrane" / "booth" / "paper" 等)
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

const spatialIntentSchemaPath = join(__dirname, '..', 'spatial-intent.schema.json');
const mainDnaSchemaPath = join(__dirname, '..', 'space-dna.schema.json');
const examplesDir = join(__dirname, '..', 'examples');

const spatialIntentSchema = JSON.parse(readFileSync(spatialIntentSchemaPath, 'utf8'));
const mainDnaSchema = JSON.parse(readFileSync(mainDnaSchemaPath, 'utf8'));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateSpatialIntent = ajv.compile(spatialIntentSchema);
const validateMainDna = ajv.compile(mainDnaSchema);

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

function loadJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

console.log('Spatial Intent Schema v9A.1 \u2014 validation suite\n');

// ---------- Preconditions ----------
console.log('Preconditions:');

test('spatial-intent.schema.json exists', () => {
  assert(existsSync(spatialIntentSchemaPath), `missing: ${spatialIntentSchemaPath}`);
});

test('main DNA schema has spatialIntentDna field (Phase 9A.1 §3 + §8 Task 2)', () => {
  const afb = mainDnaSchema.properties.spatialIntentDna;
  assert(afb, 'main DNA schema should have spatialIntentDna field');
  for (const k of ['primaryEmotion', 'userJourney', 'spaceRole', 'designLogic', 'architecturalReason']) {
    assert(afb.properties[k], `spatialIntentDna.${k} missing in main DNA schema`);
  }
});

test('3 brand examples exist (Phase 9A.1 §8 Task 3)', () => {
  for (const brand of ['jiuzhou-aesthetics', 'feng-tang-tang', 'yi-ji-liang-fang']) {
    const p = join(examplesDir, `${brand}.spatial-intent.json`);
    assert(existsSync(p), `missing: ${p}`);
  }
});

// ---------- Schema completeness ----------
console.log('\nSchema completeness (Phase 9A.1 §4):');

test('spatial-intent.schema.json has 5 required fields (§4.1-4.5)', () => {
  const required = spatialIntentSchema.required;
  for (const k of ['primaryEmotion', 'userJourney', 'spaceRole', 'designLogic', 'architecturalReason']) {
    assert(required.includes(k), `required should include ${k}`);
  }
  assert(required.length === 5, `required should have exactly 5 fields, got ${required.length}`);
});

test('all 5 fields are strings with minLength >= 1', () => {
  for (const k of ['primaryEmotion', 'userJourney', 'spaceRole', 'designLogic', 'architecturalReason']) {
    const p = spatialIntentSchema.properties[k];
    assert(p.type === 'string', `${k} should be string`);
    assert(p.minLength >= 1, `${k} should have minLength >= 1, got ${p.minLength}`);
  }
});

test('schema enforces additionalProperties: false (Phase 9A.1 §8 Task 2)', () => {
  assert(spatialIntentSchema.additionalProperties === false,
    'spatial-intent schema should have additionalProperties: false');
});

test('schema uses JSON Schema draft 2020-12', () => {
  assert(spatialIntentSchema.$schema.includes('2020-12'),
    'schema should be draft 2020-12');
});

// ---------- 3 brand example validation ----------
console.log('\n3 brand example validation (§7):');

const brandIntents = {};
for (const brand of ['jiuzhou-aesthetics', 'feng-tang-tang', 'yi-ji-liang-fang']) {
  test(`${brand} spatial-intent.json validates against schema`, () => {
    const p = join(examplesDir, `${brand}.spatial-intent.json`);
    const data = loadJson(p);
    brandIntents[brand] = data.spatialIntentDna;
    const ok = validateSpatialIntent(data.spatialIntentDna);
    if (!ok) {
      const errs = (validateSpatialIntent.errors || []).slice(0, 3).map((e) => `${e.instancePath} ${e.message}`).join('; ');
      throw new Error(`schema validation failed: ${errs}`);
    }
  });

  test(`${brand} spatial-intent.json has all 5 fields non-empty`, () => {
    const intent = brandIntents[brand];
    for (const k of ['primaryEmotion', 'userJourney', 'spaceRole', 'designLogic', 'architecturalReason']) {
      assert(typeof intent[k] === 'string' && intent[k].length > 0,
        `${brand}.${k} should be non-empty string, got ${intent[k]?.length || 0} chars`);
    }
  });
}

// ---------- Brand differentiation (Phase 9A.1 §7 验收) ----------
console.log('\nBrand differentiation (Phase 9A.1 §7 明显不同):');

test('3 brand primaryEmotion are distinct (not 通用高级感)', () => {
  const emotions = Object.values(brandIntents).map((i) => i.primaryEmotion);
  assert(new Set(emotions).size === 3,
    `3 brand primaryEmotion should be distinct, got ${new Set(emotions).size} unique values`);
});

test('3 brand spaceRole are distinct (not 通用现代空间)', () => {
  const roles = Object.values(brandIntents).map((i) => i.spaceRole);
  assert(new Set(roles).size === 3,
    `3 brand spaceRole should be distinct, got ${new Set(roles).size} unique values`);
});

test('3 brand designLogic are distinct (not 通用东方美学)', () => {
  const logics = Object.values(brandIntents).map((i) => i.designLogic);
  assert(new Set(logics).size === 3,
    `3 brand designLogic should be distinct, got ${new Set(logics).size} unique values`);
});

test('no 通用高级感 (no "通用高级感" / "通用现代" / "通用东方" in any example)', () => {
  // Phase 9A.1 §7 禁止: 通用高级感 / 通用现代空间 / 通用东方美学
  for (const brand of Object.keys(brandIntents)) {
    const intent = brandIntents[brand];
    const allText = Object.values(intent).join(' ');
    assert(!allText.includes('通用高级感'),
      `${brand} should not contain '通用高级感' (§7 禁止)`);
    assert(!allText.includes('通用现代空间'),
      `${brand} should not contain '通用现代空间' (§7 禁止)`);
    assert(!allText.includes('通用东方美学'),
      `${brand} should not contain '通用东方美学' (§7 禁止)`);
  }
});

test('JZMX primaryEmotion 是 "安心与信任" 类, 不是 FTT/YJLF 风格', () => {
  const jz = brandIntents['jiuzhou-aesthetics'].primaryEmotion;
  assert(jz.includes('安心') || jz.includes('信任'),
    `JZMX primaryEmotion should mention 安心/信任, got: ${jz}`);
  // 验证 JZMX 不与 FTT/YJLF 关键词重叠
  assert(!jz.includes('烟火气') && !jz.includes('沉静'),
    'JZMX primaryEmotion should not use FTT (烟火气) or YJLF (沉静) language');
});

test('FTT primaryEmotion 是 "实在与饱满" 类, 不是 JZMX/YJLF 风格', () => {
  const ft = brandIntents['feng-tang-tang'].primaryEmotion;
  assert(ft.includes('实在') || ft.includes('饱满') || ft.includes('烟火气'),
    `FTT primaryEmotion should mention 实在/饱满/烟火气, got: ${ft}`);
  assert(!ft.includes('安心') && !ft.includes('沉静'),
    'FTT primaryEmotion should not use JZMX (安心) or YJLF (沉静) language');
});

test('YJLF primaryEmotion 是 "沉静" 类, 不是 JZMX/FTT 风格', () => {
  const yj = brandIntents['yi-ji-liang-fang'].primaryEmotion;
  assert(yj.includes('沉静') || yj.includes('慢') || yj.includes('调理'),
    `YJLF primaryEmotion should mention 沉静/慢/调理, got: ${yj}`);
  assert(!yj.includes('安心') && !yj.includes('饱满') && !yj.includes('烟火气'),
    'YJLF primaryEmotion should not use JZMX (安心) or FTT (饱满/烟火气) language');
});

// ---------- Layer boundary (Phase 9A.1 §5) ----------
console.log('\nLayer boundary (Phase 9A.1 §5):');

// §5: spatialIntentDna CAN explain emotion / user psychology / spatial purpose / design reasoning
// §5: spatialIntentDna CANNOT select anchors / define materials / copy references / decide rendering style

const FORBIDDEN_WORDS = {
  material: ['mineral_plaster', 'frosted_glass', 'warm_wood_booth', 'red_brick_wall', 'terracotta_tile',
    'matte_clay_wall', 'linen_fabric', 'rice_paper', 'rice_paper_screen', 'brass_fitting', 'translucent_membrane'],
  architecture_specific: ['层叠半透明介质', '3 大格落地玻璃', '金属长方体接待台', 'membrane ceiling', 'open kitchen window', 'wooden grid partition', 'paper screen'],
  rendering: ['commercial_archviz', 'soft_bright', 'human_eye_level', '28mm_to_40mm'],
  anchor_specific: ['JZMX-ARCH-', 'FTT-ARCH-', 'YJLF-ARCH-'],
};

for (const brand of Object.keys(brandIntents)) {
  test(`${brand} spatialIntentDna 不含 material 具体词 (§5 boundary)`, () => {
    const allText = Object.values(brandIntents[brand]).join(' ');
    for (const word of FORBIDDEN_WORDS.material) {
      assert(!allText.toLowerCase().includes(word.toLowerCase()),
        `${brand} should not mention material '${word}' (Phase 9A.1 §5 boundary)`);
    }
  });

  test(`${brand} spatialIntentDna 不含具体建筑形式 (§5 boundary)`, () => {
    const allText = Object.values(brandIntents[brand]).join(' ');
    for (const word of FORBIDDEN_WORDS.architecture_specific) {
      assert(!allText.toLowerCase().includes(word.toLowerCase()),
        `${brand} should not mention specific architecture '${word}' (Phase 9A.1 §5 boundary)`);
    }
  });

  test(`${brand} spatialIntentDna 不含 rendering 关键词 (§5 boundary)`, () => {
    const allText = Object.values(brandIntents[brand]).join(' ');
    for (const word of FORBIDDEN_WORDS.rendering) {
      assert(!allText.toLowerCase().includes(word.toLowerCase()),
        `${brand} should not mention rendering '${word}' (Phase 9A.1 §5 boundary)`);
    }
  });
}

// ---------- No architecture leakage (Phase 9A.1 §7) ----------
console.log('\nNo architecture leakage (§7 + §5):');

test('3 brand spatialIntentDna 不提具体 anchor id', () => {
  for (const brand of Object.keys(brandIntents)) {
    const allText = Object.values(brandIntents[brand]).join(' ');
    for (const word of FORBIDDEN_WORDS.anchor_specific) {
      assert(!allText.includes(word),
        `${brand} should not mention anchor id '${word}' (Phase 9A.1 §5 boundary)`);
    }
  }
});

// ---------- Main DNA schema integration (Phase 9A.1 §8 Task 2) ----------
console.log('\nMain DNA schema integration:');

test('main DNA schema validates when spatialIntentDna is provided (Phase 9A.1 §8 Task 2)', () => {
  // 把 spatialIntentDna 加到 v0.3 DNA 实例 (JZZMX v0.3 是 active instance)
  const v11 = join(examplesDir, 'jiuzhou-aesthetics.dna.v1.1.json');
  const dna = loadJson(v11);
  dna.spatialIntentDna = loadJson(join(examplesDir, 'jiuzhou-aesthetics.spatial-intent.json')).spatialIntentDna;
  const ok = validateMainDna(dna);
  if (!ok) {
    const errs = (validateMainDna.errors || []).slice(0, 3).map((e) => `${e.instancePath} ${e.message}`).join('; ');
    throw new Error(`main DNA schema validation failed with spatialIntentDna: ${errs}`);
  }
});

test('main DNA schema still validates v0.1 DNA without spatialIntentDna (backward compat)', () => {
  // 模拟 v0.1 frozen (没有 spatialIntentDna)
  const v01 = loadJson(join(examplesDir, 'jiuzhou-aesthetics.dna.json'));
  delete v01.spatialIntentDna; // 防御性删除 (v0.1.1 已经包含, 但我们要测试 frozen v0.1)
  const ok = validateMainDna(v01);
  if (!ok) {
    const errs = (validateMainDna.errors || []).slice(0, 3).map((e) => `${e.instancePath} ${e.message}`).join('; ');
    throw new Error(`v0.1 DNA (no spatialIntentDna) should still validate: ${errs}`);
  }
});

// ---------- Summary ----------
console.log(`\nSummary: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log(`  - ${f.name}: ${f.error.message}`);
  }
  process.exit(1);
}
process.exit(0);
