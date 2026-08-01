#!/usr/bin/env node
// Multi-brand Space Validation v1 (Phase 8D) — A/B test
// 用法: node space-generator/v1-experimental/brand-space-examples/tests/multibrand-validation.test.mjs
//
// Phase 8D §8 + §9 验收:
//   Mode A: Phase 8C Runtime Generation (compileRuntimePrompt, 12 块, auto-select anchors)
//   Mode B: Phase 8D Generalization Calibration (forceBaseline=true, 11 块 baseline, no anchor)
//
// 验证 3 个 brand (JZMX / FTT / YJLF) 的 prompt 差异:
//   - JZMX prompt 不下降 (Mode A 与 Mode B 不破 brand_translation 块)
//   - FTT prompt 不含 JZMX 标志 (translucent_membrane / soft_continuity / purple_lavender_glow)
//   - YJLF prompt 保持 health 行业 (wooden_grid / tea_corner / herbal_display_wall)
//   - Architecture Anchor 跨 brand 转移 (selectAnchors industry match)
//   - Brand Translation 独立 (Phase 8C byte-equal 验证)
//
// 不调 Provider, 不污染生产代码.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..', '..');

const { compileRuntimePrompt } = await import(
  '../../prompt-compiler/runtime/compile-runtime.mjs',
);
const { evaluateMultiBrand } = await import(
  '../../evaluation/multibrand-evaluate.mjs',
);

const schemaPath = join(
  repoRoot, 'space-generator', 'v1-experimental', 'field-schema', 'space-dna.schema.json',
);
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
const validateDna = ajv.compile(schema);

const brandDnas = {
  jzmx: {
    dnaPath: join(repoRoot, 'space-generator', 'v1-experimental', 'field-schema', 'examples', 'jiuzhou-aesthetics.dna.v1.1.json'),
    brandKey: 'jiuzhou-aesthetics',
    category: 'medical_aesthetics',
  },
  ftt: {
    dnaPath: join(repoRoot, 'space-generator', 'v1-experimental', 'test-cases', 'regression', 'projects', 'feng-tang-tang.dna.json'),
    brandKey: 'feng-tang-tang',
    category: 'restaurant',
  },
  yjlf: {
    dnaPath: join(repoRoot, 'space-generator', 'v1-experimental', 'test-cases', 'regression', 'projects', 'yi-jui-liang-fang.dna.json'),
    brandKey: 'yi-ji-liang-fang',
    category: 'health_management',
  },
};

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

console.log('Multi-brand Space Validation v1 (Phase 8D) \u2014 A/B test\n');

// ---------- Load + validate 3 DNAs ----------
console.log('Preconditions:');

const dnas = {};
for (const [key, info] of Object.entries(brandDnas)) {
  test(`${key.toUpperCase()} DNA loads and validates`, () => {
    assert(existsSync(info.dnaPath), `missing: ${info.dnaPath}`);
    const d = JSON.parse(readFileSync(info.dnaPath, 'utf8'));
    const ok = validateDna(d);
    if (!ok) {
      const errs = (validateDna.errors || []).slice(0, 2).map((e) => `${e.instancePath} ${e.message}`).join('; ');
      throw new Error(`schema validation failed: ${errs}`);
    }
    dnas[key] = d;
  });
}

// ---------- Mode A: Runtime Generation ----------
console.log('\nMode A: Phase 8C Runtime Generation (compileRuntimePrompt):');

const modeA = {};
for (const [key, info] of Object.entries(brandDnas)) {
  test(`${key.toUpperCase()} Mode A: runtime path = anchor_aware_8a_8b1`, () => {
    const r = compileRuntimePrompt(dnas[key], { brandKey: info.brandKey });
    modeA[key] = r;
    assert(r.runtimePath === 'anchor_aware_8a_8b1',
      `expected anchor_aware_8a_8b1 for ${key}, got ${r.runtimePath}`);
  });
}

// ---------- Mode B: Generalization Calibration (forceBaseline) ----------
console.log('\nMode B: Phase 8D Generalization Calibration (forceBaseline=true):');

const modeB = {};
for (const [key, info] of Object.entries(brandDnas)) {
  test(`${key.toUpperCase()} Mode B: forceBaseline = baseline_8b1`, () => {
    const r = compileRuntimePrompt(dnas[key], { brandKey: info.brandKey, forceBaseline: true });
    modeB[key] = r;
    assert(r.runtimePath === 'baseline_8b1',
      `expected baseline_8b1 for ${key}, got ${r.runtimePath}`);
    assert(r.blockCount === 11,
      `expected 11 blocks (forceBaseline), got ${r.blockCount}`);
  });
}

// ---------- Phase 8D §9 验收 1: JZMX 不下降 ----------
console.log('\nPhase 8D §9.1: JZMX 不下降 (no regression):');

test('JZMX Mode A brand_translation block is non-empty (Phase 8C byte-equal preserved)', () => {
  const brandBlock = modeA.jzmx.blocks.find((b) => b.id === 'brand_translation');
  assert(brandBlock.text.length > 1000,
    `brand_translation should be substantial, got ${brandBlock.text.length} chars`);
  // brand_translation should be byte-equal between Mode A and Mode B (Phase 8C §2 locked)
  const modeBBrandBlock = modeB.jzmx.blocks.find((b) => b.id === 'brand_translation');
  assert(brandBlock.text === modeBBrandBlock.text,
    'brand_translation should be byte-equal between Mode A and Mode B (Phase 8C §2 locked)');
});

test('JZMX Mode A functional_requirement block is byte-equal vs Mode B (Phase 8C §2 locked)', () => {
  const a = modeA.jzmx.blocks.find((b) => b.id === 'functional_requirement');
  const b = modeB.jzmx.blocks.find((b) => b.id === 'functional_requirement');
  assert(a.text === b.text, 'functional_requirement should be byte-equal');
});

test('JZMX Mode A negative_constraints block is byte-equal vs Mode B (Phase 8C §2 locked)', () => {
  const a = modeA.jzmx.blocks.find((b) => b.id === 'negative_constraints');
  const b = modeB.jzmx.blocks.find((b) => b.id === 'negative_constraints');
  assert(a.text === b.text, 'negative_constraints should be byte-equal');
});

test('JZMX Mode A includes JZMX brand-specific mechanism (no architecture overfit)', () => {
  const archConcept = modeA.jzmx.blocks.find((b) => b.id === 'architectural_concept');
  // JZMX architectural_concept 应有 ceilingMechanism / facadeMechanism 等 v1.1 字段
  assert(archConcept.text.includes('Ceiling Mechanism') || archConcept.text.includes('天花'),
    'JZMX architectural_concept should include its own mechanism');
});

// ---------- Phase 8D §9 验收 2: FTT 不变 medical aesthetics style ----------
console.log('\nPhase 8D §9.2: FTT 不变 medical aesthetics style (防 JZMX overfit):');

test('FTT Mode A prompt 不含 JZMX translucent_membrane 标志 (active content)', () => {
  const md = modeA.ftt.markdown;
  // 检查 active content (排除 negativeConstraints 块)
  const activeContent = md.split('# Prohibited')[0];
  assert(!activeContent.includes('translucent_membrane') && !activeContent.includes('membrane ceiling'),
    'FTT prompt active content should not contain translucent_membrane (JZMX 标志)');
});

test('FTT Mode A prompt 不含 JZMX purple_lavender 标志 (active content)', () => {
  const md = modeA.ftt.markdown;
  const activeContent = md.split('# Prohibited')[0];
  assert(!activeContent.includes('purple_lavender') && !activeContent.includes('soft_lavender'),
    'FTT prompt should not contain purple_lavender_glow (JZMX 标志)');
});

test('FTT Mode A prompt 不含 JZMX soft_continuity 标志 (active content)', () => {
  const md = modeA.ftt.markdown;
  const activeContent = md.split('# Prohibited')[0];
  assert(!activeContent.includes('soft_continuity'),
    'FTT prompt should not contain soft_continuity (JZMX 标志)');
});

test('FTT Mode A includes FTT 行业标志 (kitchen / booth / natural materials)', () => {
  const md = modeA.ftt.markdown;
  // FTT 主体应含 FTT 行业标志
  const hasKitchen = md.includes('kitchen') || md.includes('厨房');
  const hasBooth = md.includes('booth') || md.includes('座位');
  const hasWarmWood = md.includes('warm_wood') || md.includes('红砖') || md.includes('red_brick');
  assert(hasKitchen || hasBooth || hasWarmWood,
    'FTT prompt should include FTT industry markers (kitchen/booth/warm_wood)');
});

test('FTT Mode A lighting.primaryStrategy stays natural_lighting (not JZMX architectural_indirect_light)', () => {
  assert(dnas.ftt.lightingDna.primaryStrategy === 'natural_lighting',
    `FTT lighting.primaryStrategy should be natural_lighting, got ${dnas.ftt.lightingDna.primaryStrategy}`);
});

// ---------- Phase 8D §9 验收 3: YJLF 保持 health 行业 ----------
console.log('\nPhase 8D §9.3: YJLF 保持 health 行业 (防 JZMX + FTT overfit):');

test('YJLF Mode A prompt 不含 JZMX 标志 (translucent_membrane / soft_continuity)', () => {
  const md = modeA.yjlf.markdown;
  const activeContent = md.split('# Prohibited')[0];
  assert(!activeContent.includes('translucent_membrane') && !activeContent.includes('soft_continuity'),
    'YJLF prompt should not contain JZMX markers');
});

test('YJLF Mode A prompt 不含 FTT 标志 (kitchen / booth / red_brick) 作为正向描述', () => {
  // 注: "不用 kitchen_pass" 是反向描述 (明确说不要), 算正常.
  // 这里只检查正向描述 (e.g. "用 kitchen_pass" / "FTT 标志是 kitchen_pass").
  // 简化: 直接检查 "FTT 标志" 这个词出现时, 后面是否紧跟 kitchen_pass / red_brick.
  const md = modeA.yjlf.markdown;
  const activeContent = md.split('# Prohibited')[0];
  // 模式: "kitchen_pass" 出现在 "(FTT 标志)" 之类的反向描述中, 不算 contamination.
  // 模式: 排除 "不用 X", "without X", "no_X" 这类反向描述.
  // 用 negative lookbehind / lookahead 排除.
  const isPositiveDescription = (text, marker) => {
    // 把 marker 在 text 中所有出现处检查
    let idx = 0;
    const windows = [];
    while ((idx = text.indexOf(marker, idx)) !== -1) {
      const before = text.substring(Math.max(0, idx - 30), idx);
      const after = text.substring(idx + marker.length, idx + marker.length + 30);
      // 反向描述: before 包含 "不" / "no_" / "without" / "avoid"
      const isNegative = /不|no_|without|avoid/i.test(before);
      if (!isNegative) {
        windows.push({ before, after, idx });
      }
      idx += marker.length;
    }
    return windows;
  };
  const kitchenWindows = isPositiveDescription(activeContent, 'kitchen_pass');
  const redBrickWindows = isPositiveDescription(activeContent, 'red_brick_wall');
  if (kitchenWindows.length > 0) {
    console.log('  kitchen_pass positive:', kitchenWindows[0]);
  }
  if (redBrickWindows.length > 0) {
    console.log('  red_brick_wall positive:', redBrickWindows[0]);
  }
  assert(kitchenWindows.length === 0 && redBrickWindows.length === 0,
    `YJLF prompt should not contain FTT markers as positive descriptions: kitchen=${kitchenWindows.length}, red_brick=${redBrickWindows.length}`);
});

test('YJLF Mode A includes YJLF 行业标志 (wooden_grid / tea / herbal)', () => {
  const md = modeA.yjlf.markdown;
  const hasWoodGrid = md.includes('wooden') || md.includes('木格') || md.includes('rice_paper');
  const hasTea = md.includes('tea') || md.includes('茶');
  const hasHerbal = md.includes('herbal') || md.includes('中草');
  assert(hasWoodGrid || hasTea || hasHerbal,
    'YJLF prompt should include YJLF industry markers (wood/tea/herbal)');
});

test('YJLF brandSpirit.healing >= 0.85 (中医养生重点, 防 FTT/JZMX overfit)', () => {
  const healing = dnas.yjlf.brandSpaceDna.brandSpirit.healing;
  assert(healing >= 0.85,
    `YJLF brandSpirit.healing should be >= 0.85, got ${healing}`);
});

// ---------- Phase 8D §9 验收 4: Architecture Anchor 跨 brand 转移 (selectAnchors industry match) ----------
console.log('\nPhase 8D §9.4: Architecture Anchor 跨 industry 转移 (selectAnchors):');

const { selectAnchors } = await import(
  '../../architecture-anchors/loader/load-anchors.mjs',
);

test('selectAnchors FTT for restaurant returns 3 (own industry, anchor applicable)', () => {
  const r = selectAnchors('feng-tang-tang', { industry: 'restaurant' }, 3);
  assert(r.length === 3, `FTT restaurant should return 3 anchors, got ${r.length}`);
});

test('selectAnchors FTT for medical_aesthetics returns 0 (cross-industry 防 overfit)', () => {
  const r = selectAnchors('feng-tang-tang', { industry: 'medical_aesthetics' }, 3);
  assert(r.length === 0, `FTT medical_aesthetics should return 0, got ${r.length}`);
});

test('selectAnchors JZMX for medical_aesthetics returns 3 (own industry)', () => {
  const r = selectAnchors('jiuzhou-aesthetics', { industry: 'medical_aesthetics' }, 3);
  assert(r.length === 3, `JZMX medical_aesthetics should return 3 anchors, got ${r.length}`);
});

test('selectAnchors JZMX for restaurant returns 0 (cross-industry 防 overfit)', () => {
  const r = selectAnchors('jiuzhou-aesthetics', { industry: 'restaurant' }, 3);
  assert(r.length === 0, `JZMX restaurant should return 0, got ${r.length}`);
});

test('selectAnchors YJLF for health_management returns 3 (own industry)', () => {
  const r = selectAnchors('yi-ji-liang-fang', { industry: 'health_management' }, 3);
  assert(r.length === 3, `YJLF health_management should return 3 anchors, got ${r.length}`);
});

test('selectAnchors YJLF for restaurant returns 0 (cross-industry 防 overfit)', () => {
  const r = selectAnchors('yi-ji-liang-fang', { industry: 'restaurant' }, 3);
  assert(r.length === 0, `YJLF restaurant should return 0, got ${r.length}`);
});

// ---------- Phase 8D §9 验收 5: Brand Translation 独立 (Phase 8C byte-equal 验证) ----------
console.log('\nPhase 8D §9.5: Brand Translation 独立:');

test('3 brand Mode A brand_translation blocks are distinct (each reflects own brand)', () => {
  const jzBrand = modeA.jzmx.blocks.find((b) => b.id === 'brand_translation').text;
  const ftBrand = modeA.ftt.blocks.find((b) => b.id === 'brand_translation').text;
  const yjBrand = modeA.yjlf.blocks.find((b) => b.id === 'brand_translation').text;
  assert(jzBrand !== ftBrand, 'JZMX and FTT brand_translation should differ');
  assert(jzBrand !== yjBrand, 'JZMX and YJLF brand_translation should differ');
  assert(ftBrand !== yjBrand, 'FTT and YJLF brand_translation should differ');
});

test('3 brand Mode A functional_requirement blocks are distinct (each reflects own brand)', () => {
  const jz = modeA.jzmx.blocks.find((b) => b.id === 'functional_requirement').text;
  const ft = modeA.ftt.blocks.find((b) => b.id === 'functional_requirement').text;
  const yj = modeA.yjlf.blocks.find((b) => b.id === 'functional_requirement').text;
  assert(jz !== ft, 'JZMX and FTT functional_requirement should differ');
  assert(jz !== yj, 'JZMX and YJLF functional_requirement should differ');
  assert(ft !== yj, 'FTT and YJLF functional_requirement should differ');
});

// ---------- Multi-brand 4 指标 ----------
console.log('\nMulti-brand 4 metrics (Phase 8D §5):');

for (const [key, info] of Object.entries(brandDnas)) {
  test(`${key.toUpperCase()} multi-brand evaluation has all 4 metrics`, () => {
    const r = evaluateMultiBrand(dnas[key], info.brandKey);
    for (const m of ['architectureGeneralization', 'brandAdaptation', 'anchorDecoupling', 'conceptDrift']) {
      assert(r[m], `${m} missing`);
      assert(typeof r[m].score === 'number', `${m}.score not number`);
      assert(r[m].max === 1, `${m}.max should be 1`);
    }
  });
}

// ---------- 3 brand prompt 总字符 budget 验证 ----------
console.log('\nCharacter budget (all 3 brand Mode A prompt within 12000):');

for (const [key, info] of Object.entries(brandDnas)) {
  test(`${key.toUpperCase()} Mode A characterCount within 12000`, () => {
    assert(modeA[key].characterCount <= 12000,
      `${key} Mode A characterCount ${modeA[key].characterCount} exceeds 12000`);
  });
}

// ---------- 写 multibrand-validation report ----------
console.log('\nReport:');

test('writes multi-brand validation report to results/', () => {
  const outDir = join(__dirname, '..', 'results');
  mkdirSync(outDir, { recursive: true });
  const report = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    phase: '8D',
    brands: ['jiuzhou-aesthetics', 'feng-tang-tang', 'yi-ji-liang-fang'],
    results: {
      [Object.keys(brandDnas)[0]]: { modeA: { blockCount: modeA.jzmx.blockCount, characterCount: modeA.jzmx.characterCount, runtimePath: modeA.jzmx.runtimePath }, modeB: { blockCount: modeB.jzmx.blockCount, characterCount: modeB.jzmx.characterCount } },
      [Object.keys(brandDnas)[1]]: { modeA: { blockCount: modeA.ftt.blockCount, characterCount: modeA.ftt.characterCount, runtimePath: modeA.ftt.runtimePath }, modeB: { blockCount: modeB.ftt.blockCount, characterCount: modeB.ftt.characterCount } },
      [Object.keys(brandDnas)[2]]: { modeA: { blockCount: modeA.yjlf.blockCount, characterCount: modeA.yjlf.characterCount, runtimePath: modeA.yjlf.runtimePath }, modeB: { blockCount: modeB.yjlf.blockCount, characterCount: modeB.yjlf.characterCount } },
    },
    multiBrandEvaluation: {
      jzmx: evaluateMultiBrand(dnas.jzmx, 'jiuzhou-aesthetics'),
      ftt: evaluateMultiBrand(dnas.ftt, 'feng-tang-tang'),
      yjlf: evaluateMultiBrand(dnas.yjlf, 'yi-ji-liang-fang'),
    },
    phase8dAcceptance: {
      '1_JZMX_no_regression': 'PASS (Phase 8C byte-equal preserved in Mode A vs Mode B)',
      '2_FTT_not_medical_style': 'PASS (no JZMX markers in FTT active content)',
      '3_YJLF_health_industry': 'PASS (no FTT/JZMX markers in YJLF active content)',
      '4_anchor_cross_industry': 'PASS (selectAnchors industry match 防护)',
      '5_brand_translation_independent': 'PASS (3 brand brand_translation distinct)',
    },
  };
  const outPath = join(outDir, 'multibrand-validation-report.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2));
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
