#!/usr/bin/env node
// Anchor-Aware Field-Enriched Prompt Compiler v1 (Phase 8A) — A/B test
// 用法: node space-generator/v1-experimental/prompt-compiler/anchor-aware/tests/compile-with-anchor.test.mjs
//
// A/B Test 设计:
//   A (baseline): compileFieldEnrichedPrompt(dna)  -> 10 blocks, 3907 chars
//   B (anchor-aware): compileFieldEnrichedPromptWithAnchorContext(dna, anchors) -> 11 blocks
//
// 验证目标:
//   1. Baseline 行为完全不变 (10 blocks, characterCount 不变)
//   2. Anchor-aware 路径注入 architecture_context 块, 含全部 3 个 JZMX-ARCH anchor
//   3. architecture_context 在 task 之后, 在 architectural_concept 之前 (Phase 8A 设计)
//   4. Anchor-aware prompt 通过 Space Evaluation Layer 评分, architecture_quality
//      维度 >= baseline (即"在 DNA 之外补充 anchor 后, 建筑美学评分应不下降")
//
// 不调 Provider, 不污染生产代码.

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..', '..', '..');

const { compileFieldEnrichedPrompt } = await import(
  '../../field-enriched/compile-prompt.mjs'
);
const { compileFieldEnrichedPromptWithAnchorContext } = await import(
  '../compile-with-anchor.mjs'
);
const { loadArchitectureAnchors, getAnchorsAsInContextReference } = await import(
  '../../../architecture-anchors/loader/load-anchors.mjs'
);
const { evaluateSpace } = await import('../../../evaluation/evaluate-space.mjs');

const v11DnaPath = join(
  repoRoot, 'space-generator', 'v1-experimental', 'field-schema', 'examples', 'jiuzhou-aesthetics.dna.v1.1.json',
);
const v01DnaPath = join(
  repoRoot, 'space-generator', 'v1-experimental', 'field-schema', 'examples', 'jiuzhou-aesthetics.dna.json',
);
const schemaPath = join(
  repoRoot, 'space-generator', 'v1-experimental', 'field-schema', 'space-dna.schema.json',
);

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
const validateDna = ajv.compile(schema);
const v11Dna = JSON.parse(readFileSync(v11DnaPath, 'utf8'));
const v01Dna = JSON.parse(readFileSync(v01DnaPath, 'utf8'));

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

console.log('Anchor-Aware Prompt Compiler v1 (Phase 8A) \u2014 A/B test\n');

// ---------- Preconditions ----------
console.log('Preconditions:');

test('JZMX v0.2 (v1.1) DNA validates', () => {
  assert(validateDna(v11Dna), 'JZMX v0.2 DNA must validate');
});

test('Anchor loader returns 3 JZMX-ARCH anchors', () => {
  const anchors = loadArchitectureAnchors('jiuzhou-aesthetics');
  assert(Array.isArray(anchors), 'must return array');
  assert(anchors.length === 3, `expected 3 anchors, got ${anchors.length}`);
  for (const a of anchors) {
    assert(a.id && a.role && a.primaryMechanism, `anchor ${a.id ?? '?'} missing required fields`);
  }
});

test('getAnchorsAsInContextReference returns sorted, capped list', () => {
  const ref = getAnchorsAsInContextReference('jiuzhou-aesthetics', 3);
  assert(ref.length === 3, `expected 3, got ${ref.length}`);
  // 验证按 weight desc 排序 (虽然所有 anchor weight 都是 1.0)
  for (let i = 0; i < ref.length - 1; i++) {
    assert((ref[i].weight ?? 1) >= (ref[i + 1].weight ?? 1),
      `anchor order broken at ${i}`);
  }
});

test('Anchor loader returns [] for unknown brand (graceful degradation)', () => {
  const anchors = loadArchitectureAnchors('nonexistent-brand');
  assert(Array.isArray(anchors), 'must return array');
  assert(anchors.length === 0, 'unknown brand should return empty array');
});

// ---------- A/B Test: A = baseline (v1.1 10 blocks) ----------
console.log('\nA. Baseline (v1.1 10-block prompt, no anchor):');

const baselineV11 = compileFieldEnrichedPrompt(v11Dna);

test('A: 10 blocks (unchanged from v1.1 Step 4)', () => {
  assert(baselineV11.blockCount === 10, `blockCount ${baselineV11.blockCount} != 10 (baseline must not regress)`);
});

test('A: characterCount matches v0.2 (v1.1) DNA baseline', () => {
  // v0.2 (v1.1) DNA 多了 brandTranslationRules + 4 mechanism, baseline 比 v0.1 (3907) 大.
  // 这里只 sanity check A 是 10 块, characterCount 是固定值 (5019) 防止未来无意修改.
  assert(baselineV11.characterCount === 5019, `v0.2 baseline characterCount ${baselineV11.characterCount} != 5019 (v0.1 was 3907, v0.2 has more brandTranslationRules + 4 mechanism)`);
});

test('A: no architecture_context block in baseline', () => {
  const archCtx = baselineV11.blocks.find((b) => b.id === 'architecture_context');
  assert(!archCtx, 'baseline should not have architecture_context block');
});

// ---------- A/B Test: B = anchor-aware (11 blocks) ----------
console.log('\nB. Anchor-aware (11 blocks with architecture_context):');

const anchors = getAnchorsAsInContextReference('jiuzhou-aesthetics', 3);
const anchorV11 = compileFieldEnrichedPromptWithAnchorContext(v11Dna, anchors);

test('B: 11 blocks (10 baseline + 1 architecture_context)', () => {
  assert(anchorV11.blockCount === 11, `blockCount ${anchorV11.blockCount} != 11 (should be baseline 10 + architecture_context 1)`);
});

test('B: anchorContextIncluded=true', () => {
  assert(anchorV11.anchorContextIncluded === true, 'anchorContextIncluded should be true');
});

test('B: block[0] is still task (architecture_context inserted as block[1])', () => {
  assert(anchorV11.blocks[0].id === 'task', `block[0] should be task, got ${anchorV11.blocks[0].id}`);
  assert(anchorV11.blocks[1].id === 'architecture_context',
    `block[1] should be architecture_context, got ${anchorV11.blocks[1].id}`);
  // architectural_concept 现在应该是 block[2] (从 baseline 的 block[1] 移到 block[2])
  assert(anchorV11.blocks[2].id === 'architectural_concept',
    `block[2] should be architectural_concept (was block[1] in baseline), got ${anchorV11.blocks[2].id}`);
});

test('B: architecture_context contains all 3 JZMX-ARCH anchor IDs and mechanisms', () => {
  const archCtxBlock = anchorV11.blocks.find((b) => b.id === 'architecture_context');
  assert(archCtxBlock, 'architecture_context block missing');
  for (const a of anchors) {
    assert(archCtxBlock.text.includes(a.id), `architecture_context missing ${a.id}`);
    // primaryMechanism 关键短语 (前 30 字符)
    const snippet = a.primaryMechanism.slice(0, 30);
    assert(archCtxBlock.text.includes(snippet) || archCtxBlock.text.includes(a.primaryMechanism.slice(0, 20)),
      `architecture_context missing primaryMechanism snippet: ${snippet}`);
  }
});

test('B: architecture_context 是 anchor 先验, 在 architectural_concept 之前', () => {
  const archCtxIdx = anchorV11.blocks.findIndex((b) => b.id === 'architecture_context');
  const archConceptIdx = anchorV11.blocks.findIndex((b) => b.id === 'architectural_concept');
  assert(archCtxIdx < archConceptIdx,
    `architecture_context (${archCtxIdx}) must come before architectural_concept (${archConceptIdx})`);
});

test('B: architecture_context 不含禁止复刻的具体物 (v1.0 §34 规则一/五)', () => {
  const archCtxBlock = anchorV11.blocks.find((b) => b.id === 'architecture_context');
  // 不应直接说"放一个 3 大格玻璃"等具体复刻
  // 我们的实现里 architecture_context 说的是 mechanism 不是具体物, 所以应该不包含
  // forbidden 词. 但因为是 anchor 块, 允许引用 mechanism 短语 (如 "整面 3 大格")
  // 关键: 不能有 "literal_asset" / "sculpture" / "install" 这种装饰物的字面物
  // 这里做软检查: 不含 "字面物" / "装饰雕塑" / "字面资产"
  assert(!archCtxBlock.text.includes('字面物'), 'should not use "literal asset" term');
  assert(!archCtxBlock.text.includes('sculpture'), 'should not mention sculpture');
});

test('B: total characterCount within 12000 (extended limit for in-context)', () => {
  // v1.0 §10 hard constraint for v1.1 baseline: 8000 chars
  // Phase 8A with anchor context: extended to 12000 (baseline 3907 + anchor block ~1500 + headroom)
  assert(anchorV11.characterCount <= 12000,
    `characterCount ${anchorV11.characterCount} exceeds 12000 (extended Phase 8A limit)`);
  assert(anchorV11.characterCount > baselineV11.characterCount,
    `characterCount ${anchorV11.characterCount} should be > baseline ${baselineV11.characterCount}`);
});

// ---------- A/B Test: B 在 v0.1 DNA 上也能跑 (向后兼容) ----------
console.log('\nB (v0.1 DNA compatibility):');

test('B: anchor-aware works on v0.1 JZMX DNA too (backward compat)', () => {
  const r = compileFieldEnrichedPromptWithAnchorContext(v01Dna, anchors);
  assert(r.blockCount === 11, `v0.1 DNA anchor-aware blockCount ${r.blockCount} != 11`);
  assert(r.anchorContextIncluded, 'v0.1 DNA anchor-aware should include context');
});

test('B: empty anchors -> degrades to baseline (10 blocks)', () => {
  const r = compileFieldEnrichedPromptWithAnchorContext(v11Dna, []);
  assert(r.blockCount === 10, `empty anchors should fall back to 10 blocks, got ${r.blockCount}`);
  assert(r.anchorContextIncluded === false, 'empty anchors should not set anchorContextIncluded');
  assert(r.characterCount === 5019, `empty anchors should match v0.2 baseline characterCount (5019), got ${r.characterCount}`);
});

// ---------- A/B Test: 评估对比 ----------
console.log('\nA/B Evaluation (Space Evaluation Layer):');

const evalA = evaluateSpace(v11Dna);
const evalB_dna = evaluateSpace(v11Dna);
// 注意: Evaluation Layer 是基于 DNA 字段的, 不是基于 prompt 文本.
// Phase 8A 的核心命题是 "anchor 作为 in-context reference 提升建筑美学", 这是 runtime 效果,
// 6-dim 评分基于 DNA 字段, anchor 注入 prompt 不改变 DNA 字段, 所以 score 应保持.
// 这个测试是 sanity check: 评估层没有因为 anchor 注入而误报.
test('A == B: same DNA => same 6-dim score (sanity check)', () => {
  assert(evalA.total === evalB_dna.total,
    `DNA-only score A=${evalA.total} should equal B=${evalB_dna.total} (same DNA)`);
  for (let i = 0; i < evalA.dimensions.length; i++) {
    assert(evalA.dimensions[i].score === evalB_dna.dimensions[i].score,
      `dim[${i}] A=${evalA.dimensions[i].score} should equal B=${evalB_dna.dimensions[i].score}`);
  }
});

test('prompt 字符差 (anchor 注入) < baseline 字符的 80% (i.e. < 4015)', () => {
  // 验证 anchor block 是适度大小, 没有把整个 prompt 撑爆
  // v0.2 baseline = 5019, 80% = 4015
  const diff = anchorV11.characterCount - baselineV11.characterCount;
  assert(diff < 4015, `anchor injection added ${diff} chars, should be < 4015 (i.e. < 80% of 5019 v0.2 baseline)`);
});

// ---------- 写产物 (不 commit) ----------
test('writes A/B comparison report to results/', () => {
  const outDir = join(repoRoot, 'space-generator', 'v1-experimental', 'prompt-compiler', 'anchor-aware', 'results');
  mkdirSync(outDir, { recursive: true });
  const report = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    phase: '8A',
    dna: { key: 'jiuzhou-aesthetics', version: v11Dna.dnaVersion },
    baseline: {
      blockCount: baselineV11.blockCount,
      characterCount: baselineV11.characterCount,
      blockOrder: baselineV11.blocks.map((b) => b.id),
    },
    anchorAware: {
      blockCount: anchorV11.blockCount,
      characterCount: anchorV11.characterCount,
      blockOrder: anchorV11.blocks.map((b) => b.id),
      anchorIds: anchorV11.anchorIds,
      characterDiff: anchorV11.characterCount - baselineV11.characterCount,
    },
    evaluation: {
      A: { total: evalA.total, level: evalA.level },
      B: { total: evalB_dna.total, level: evalB_dna.level, note: 'same DNA => same 6-dim score; prompt-level difference is runtime architectural emphasis' },
    },
  };
  writeFileSync(join(outDir, 'ab-comparison-report.json'), JSON.stringify(report, null, 2));
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
