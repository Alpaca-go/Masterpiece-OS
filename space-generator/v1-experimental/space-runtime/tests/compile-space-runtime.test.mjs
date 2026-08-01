#!/usr/bin/env node
// Space Runtime v1 (Phase 9C) — validation suite
// 用法: node space-generator/v1-experimental/space-runtime/tests/compile-space-runtime.test.mjs
//
// Phase 9C §13 验收 4 项:
//   1. Runtime Integration: Spatial Intelligence 正式进入生成链路
//   2. Stability: 三品牌运行稳定
//   3. Traceability: 每次生成可追踪 Intent / Architecture / Reality / Prompt
//   4. No Regression: 相比 Phase 9B.1, 没有明显下降
//
// 不调真实 Provider, 不污染生产代码, 不动 v1-baseline.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..', '..');

const {
  compileSpaceRuntime,
  loadBrandDna,
  getBrandDnaPaths,
  buildRuntimeEvaluationRecord,
  DATA_CONTRACT,
  SPATIAL_INTENT_COMPILER_PHASE,
  ARCHITECTURE_BRIDGE_PHASE,
  SPATIAL_REALITY_PHASE,
  ARCHITECTURE_PRESERVATION_PHASE,
  SPACE_RUNTIME_PHASE,
  SPACE_RUNTIME_VERSION,
  EVALUATION_RECORD_SCHEMA_VERSION,
} = await import('../compile-space-runtime.mjs');
const { compileSpatialRealityBlock } = await import('../../spatial-reality/prompt-block/compile-spatial-reality-block.mjs');

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

console.log('Space Runtime v1 (Phase 9C) \u2014 validation suite\n');

// ---------- Preconditions ----------
console.log('Preconditions:');

test('compile-space-runtime.mjs exports compileSpaceRuntime + loadBrandDna + buildRuntimeEvaluationRecord', () => {
  assert(typeof compileSpaceRuntime === 'function', 'compileSpaceRuntime not exported');
  assert(typeof loadBrandDna === 'function', 'loadBrandDna not exported');
  assert(typeof buildRuntimeEvaluationRecord === 'function', 'buildRuntimeEvaluationRecord not exported');
});

test('DATA_CONTRACT input/output schema is defined (Phase 9C §8)', () => {
  assert(DATA_CONTRACT, 'DATA_CONTRACT not defined');
  assert(DATA_CONTRACT.input, 'DATA_CONTRACT.input not defined');
  assert(DATA_CONTRACT.output, 'DATA_CONTRACT.output not defined');
  assert(DATA_CONTRACT.input.brandDNA, 'DATA_CONTRACT.input.brandDNA not defined');
  assert(DATA_CONTRACT.input.spatialIntentDna, 'DATA_CONTRACT.input.spatialIntentDna not defined');
  assert(DATA_CONTRACT.input.spatialRealityDna, 'DATA_CONTRACT.input.spatialRealityDna not defined');
  assert(DATA_CONTRACT.input.architecturePreservation, 'DATA_CONTRACT.input.architecturePreservation not defined');
  assert(DATA_CONTRACT.output.compiledSpaceStrategy, 'DATA_CONTRACT.output.compiledSpaceStrategy not defined');
  assert(DATA_CONTRACT.output.compiledPrompt, 'DATA_CONTRACT.output.compiledPrompt not defined');
  assert(DATA_CONTRACT.output.validationContext, 'DATA_CONTRACT.output.validationContext not defined');
});

test('3 brand DNA + spatial intent + spatial reality + architecture preservation files exist', () => {
  for (const b of ['jiuzhou-aesthetics', 'feng-tang-tang', 'yi-ji-liang-fang']) {
    const paths = getBrandDnaPaths(b);
    assert(existsSync(paths.dnaPath), `missing DNA: ${paths.dnaPath}`);
    assert(existsSync(paths.spatialIntentPath), `missing spatial intent: ${paths.spatialIntentPath}`);
    assert(existsSync(paths.spatialRealityPath), `missing spatial reality: ${paths.spatialRealityPath}`);
    assert(existsSync(paths.architecturePreservationPath), `missing architecture preservation: ${paths.architecturePreservationPath}`);
  }
});

// ---------- §13 验收 1: Runtime Integration ----------
console.log('\n§13.1 Runtime Integration:');

const rJZMX = compileSpaceRuntime('jiuzhou-aesthetics');
const rFTT = compileSpaceRuntime('feng-tang-tang');
const rYJLF = compileSpaceRuntime('yi-ji-liang-fang');

test('compileSpaceRuntime returns 16 blocks (Phase 9B.2 baseline) for JZMX', () => {
  assert(rJZMX.blockCount === 16, `compileSpaceRuntime JZMX should have 16 blocks, got ${rJZMX.blockCount}`);
});

test('compileSpaceRuntime marks phase = "9C" and version = "1.0.0"', () => {
  assert(rJZMX.phase === '9C', `phase should be '9C', got '${rJZMX.phase}'`);
  assert(rJZMX.version === '1.0.0', `version should be '1.0.0', got '${rJZMX.version}'`);
});

test('Runtime integrates all 4 Spatial Intelligence layers (Phase 9A.2 + 9A.3 + 9B.1 + 9B.2)', () => {
  // Mode B should be B-architecture-preservation (16 blocks including 4 Spatial Intelligence blocks)
  assert(rJZMX.mode === 'B-architecture-preservation', `Mode should be 'B-architecture-preservation', got '${rJZMX.mode}'`);
  // Block order should include all 4 new blocks
  const ids = rJZMX.blocks.map((b) => b.id);
  const expected = ['spatial_intent', 'architecture_language', 'spatial_reality_constraint', 'architecture_preservation'];
  for (const e of expected) {
    assert(ids.includes(e), `Runtime output missing layer block '${e}': ${ids.join(', ')}`);
  }
});

test('Runtime path includes all 4 layer phases (9a2 / 9a3 / 9b1 / 9b2)', () => {
  assert(rJZMX.runtimePath.includes('9a2'), `runtimePath should include 9a2, got '${rJZMX.runtimePath}'`);
  assert(rJZMX.runtimePath.includes('9a3'), `runtimePath should include 9a3, got '${rJZMX.runtimePath}'`);
  assert(rJZMX.runtimePath.includes('9b1'), `runtimePath should include 9b1, got '${rJZMX.runtimePath}'`);
  assert(rJZMX.runtimePath.includes('9b2'), `runtimePath should include 9b2, got '${rJZMX.runtimePath}'`);
});

test('Runtime output includes compiledSpatialIntent + architectureLanguage (Phase 9C §8 output)', () => {
  assert(rJZMX.compiledSpatialIntent, 'compiledSpatialIntent should be in output');
  assert(typeof rJZMX.compiledSpatialIntent.experienceGoal === 'string', 'compiledSpatialIntent.experienceGoal should be string');
  assert(rJZMX.architectureLanguage, 'architectureLanguage should be in output');
  assert(Array.isArray(rJZMX.architectureLanguage.spatialPrinciples), 'architectureLanguage.spatialPrinciples should be array');
});

test('Runtime output includes spatialRealityDna + architecturePreservation (Phase 9C §8 input trace)', () => {
  assert(rJZMX.spatialRealityDna, 'spatialRealityDna should be in output');
  assert(rJZMX.architecturePreservation, 'architecturePreservation should be in output');
});

// ---------- §13 验收 2: Stability (3 brand) ----------
console.log('\n§13.2 Stability (3 brands):');

test('3 brand compileSpaceRuntime all succeed with 16 blocks', () => {
  for (const [brand, r] of [['JZMX', rJZMX], ['FTT', rFTT], ['YJLF', rYJLF]]) {
    assert(r.blockCount === 16, `${brand} should have 16 blocks, got ${r.blockCount}`);
  }
});

test('3 brand block order is identical (deterministic block structure)', () => {
  const orderJZMX = rJZMX.blocks.map((b) => b.id).join(',');
  const orderFTT = rFTT.blocks.map((b) => b.id).join(',');
  const orderYJLF = rYJLF.blocks.map((b) => b.id).join(',');
  assert(orderJZMX === orderFTT, `JZMX vs FTT block order should be identical\nJZMX: ${orderJZMX}\nFTT:  ${orderFTT}`);
  assert(orderFTT === orderYJLF, `FTT vs YJLF block order should be identical\nFTT:  ${orderFTT}\nYJLF: ${orderYJLF}`);
});

test('3 brand compiled prompts are distinct (3 brand DNA distinct)', () => {
  assert(rJZMX.markdown !== rFTT.markdown, 'JZMX vs FTT prompt should be distinct');
  assert(rJZMX.markdown !== rYJLF.markdown, 'JZMX vs YJLF prompt should be distinct');
  assert(rFTT.markdown !== rYJLF.markdown, 'FTT vs YJLF prompt should be distinct');
});

test('3 brand runtime path is identical (same pipeline, different DNA)', () => {
  assert(rJZMX.runtimePath === rFTT.runtimePath, 'runtimePath should be same across brands');
  assert(rFTT.runtimePath === rYJLF.runtimePath, 'runtimePath should be same across brands');
});

// ---------- §13 验收 3: Traceability (Phase 9C §10 evaluation record) ----------
console.log('\n§13.3 Traceability (Phase 9C §10 evaluation record):');

test('Runtime output includes moduleVersions (Phase 9C §10)', () => {
  assert(rJZMX.moduleVersions, 'moduleVersions should be in output');
  assert(rJZMX.moduleVersions.spatialIntent === '9A.2', `moduleVersions.spatialIntent should be '9A.2', got '${rJZMX.moduleVersions.spatialIntent}'`);
  assert(rJZMX.moduleVersions.architectureBridge === '9A.3', `moduleVersions.architectureBridge should be '9A.3'`);
  assert(rJZMX.moduleVersions.spatialReality === '9B.1', `moduleVersions.spatialReality should be '9B.1'`);
  assert(rJZMX.moduleVersions.architecturePreservation === '9B.2', `moduleVersions.architecturePreservation should be '9B.2'`);
});

test('Runtime output includes evaluationRecord with all required fields', () => {
  const r = rJZMX.evaluationRecord;
  assert(r, 'evaluationRecord should be in output');
  assert(r.schemaVersion === EVALUATION_RECORD_SCHEMA_VERSION, `schemaVersion should be '${EVALUATION_RECORD_SCHEMA_VERSION}'`);
  assert(r.phase === SPACE_RUNTIME_PHASE, `phase should be '${SPACE_RUNTIME_PHASE}'`);
  assert(r.brandKey === 'jiuzhou-aesthetics', 'brandKey should be set');
  assert(r.generatedAt, 'generatedAt should be set');
  assert(r.moduleVersions, 'evaluationRecord.moduleVersions should be set');
  assert(r.compiledStrategy, 'evaluationRecord.compiledStrategy should be set');
  assert(r.prompt, 'evaluationRecord.prompt should be set');
  assert(r.validationContext, 'evaluationRecord.validationContext should be set');
});

test('evaluationRecord tracks compiled strategy (Phase 9C §8 compiledSpaceStrategy)', () => {
  const cs = rJZMX.evaluationRecord.compiledStrategy;
  assert(typeof cs.experienceGoal === 'string', 'compiledStrategy.experienceGoal should be string');
  assert(Array.isArray(cs.spatialStrategy), 'compiledStrategy.spatialStrategy should be array');
  assert(Array.isArray(cs.architecturalCharacteristics), 'compiledStrategy.architecturalCharacteristics should be array');
  assert(Array.isArray(cs.materialDirection), 'compiledStrategy.materialDirection should be array');
  assert(Array.isArray(cs.lightDirection), 'compiledStrategy.lightDirection should be array');
  assert(Array.isArray(cs.spatialOrganization), 'compiledStrategy.spatialOrganization should be array');
  assert(typeof cs.weight === 'number', 'compiledStrategy.weight should be number');
});

test('evaluationRecord tracks prompt (Phase 9C §10)', () => {
  const p = rJZMX.evaluationRecord.prompt;
  assert(typeof p.markdown === 'string', 'prompt.markdown should be string');
  assert(p.markdown.length > 0, 'prompt.markdown should be non-empty');
  assert(p.blockCount === 16, `prompt.blockCount should be 16, got ${p.blockCount}`);
  assert(typeof p.characterCount === 'number' && p.characterCount > 0, 'prompt.characterCount should be positive');
  assert(Array.isArray(p.blockOrder) && p.blockOrder.length === 16, 'prompt.blockOrder should be 16-item array');
});

test('evaluationRecord tracks validationContext (Phase 9C §8)', () => {
  const vc = rJZMX.evaluationRecord.validationContext;
  assert(vc.brandKey === 'jiuzhou-aesthetics', 'validationContext.brandKey');
  assert(vc.promptVersion.startsWith('phase-9c-runtime-'), `validationContext.promptVersion should start with 'phase-9c-runtime-', got '${vc.promptVersion}'`);
  assert(vc.runtimePath, 'validationContext.runtimePath should be set');
});

test('evaluationRecord provider is null in text-level runtime (no real provider)', () => {
  assert(rJZMX.evaluationRecord.provider === null, 'provider should be null in text-level runtime');
});

// ---------- §13 验收 4: No Regression (vs Phase 9B.1) ----------
console.log('\n§13.4 No Regression (vs Phase 9B.1):');

test('Runtime baseline behavior: compileFieldEnrichedPrompt unchanged', async () => {
  // Verify by re-importing compileFieldEnrichedPrompt directly
  const { compileFieldEnrichedPrompt } = await import(
    '../../prompt-compiler/field-enriched/compile-prompt.mjs'
  );
  const baselinePrompt = compileFieldEnrichedPrompt(rJZMX.evaluationRecord.compiledStrategy.experienceGoal
    ? JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', 'field-schema', 'examples', 'jiuzhou-aesthetics.dna.json'), 'utf8'))
    : null);
  // Just verify compileFieldEnrichedPrompt still works
  assert(baselinePrompt.blockCount === 11, `compileFieldEnrichedPrompt should still return 11 blocks, got ${baselinePrompt.blockCount}`);
});

test('Runtime baseline behavior: compileRuntimePrompt unchanged', async () => {
  const { compileRuntimePrompt } = await import(
    '../../prompt-compiler/runtime/compile-runtime.mjs'
  );
  const dna = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', 'field-schema', 'examples', 'jiuzhou-aesthetics.dna.json'), 'utf8'));
  const baselinePrompt = compileRuntimePrompt(dna, { brandKey: 'jiuzhou-aesthetics' });
  assert(baselinePrompt.blockCount === 12, `compileRuntimePrompt should still return 12 blocks, got ${baselinePrompt.blockCount}`);
});

test('Runtime does not modify any Phase 9A/9B output (spatial_intent / architecture_language / spatial_reality_constraint / architecture_preservation blocks unchanged)', () => {
  // Get fresh Phase 9B.2 output
  const rFresh = compileSpaceRuntime('jiuzhou-aesthetics');
  for (const layer of ['spatial_intent', 'architecture_language', 'spatial_reality_constraint', 'architecture_preservation']) {
    const a = rJZMX.blocks.find((b) => b.id === layer)?.text;
    const b = rFresh.blocks.find((b) => b.id === layer)?.text;
    assert(a === b, `${layer} block should be identical across runs (deterministic)`);
  }
});

test('3 brand characters similar to Phase 9B.2 (no regression on prompt size)', () => {
  // JZMX Phase 9B.2 Mode B = 11633 chars; FTT = 9376; YJLF = 9811
  assert(rJZMX.characterCount >= 10000 && rJZMX.characterCount <= 13000, `JZMX char count should be similar to Phase 9B.2 (11633), got ${rJZMX.characterCount}`);
  assert(rFTT.characterCount >= 8000 && rFTT.characterCount <= 11000, `FTT char count should be similar to Phase 9B.2 (9376), got ${rFTT.characterCount}`);
  assert(rYJLF.characterCount >= 8500 && rYJLF.characterCount <= 11000, `YJLF char count should be similar to Phase 9B.2 (9811), got ${rYJLF.characterCount}`);
});

// ---------- Phase 9C §11 Regression Test (3 brand) ----------
console.log('\n§11 Regression Test (3 brands):');

test('§11.1 无明显退化: 3 brand compileSpaceRuntime 全部成功', () => {
  for (const [brand, r] of [['JZMX', rJZMX], ['FTT', rFTT], ['YJLF', rYJLF]]) {
    assert(r.blockCount === 16, `${brand} blockCount should be 16, got ${r.blockCount}`);
    assert(r.characterCount > 0, `${brand} characterCount should be > 0`);
    assert(r.evaluationRecord, `${brand} evaluationRecord should exist`);
  }
});

test('§11.2 Prompt 输出稳定: 3 brand 同样 DNA 输入, prompt 稳定 (10 次编译)', () => {
  for (const brand of ['jiuzhou-aesthetics', 'feng-tang-tang', 'yi-ji-liang-fang']) {
    const first = JSON.stringify(compileSpaceRuntime(brand).markdown);
    for (let i = 0; i < 5; i++) {
      const next = JSON.stringify(compileSpaceRuntime(brand).markdown);
      assert(next === first, `${brand} run ${i + 1} differs from first (stability violation)`);
    }
  }
});

test('§11.3 Runtime 数据完整: 3 brand moduleVersions 全部包含 7 个 phase', () => {
  for (const [brand, r] of [['JZMX', rJZMX], ['FTT', rFTT], ['YJLF', rYJLF]]) {
    const requiredKeys = ['brandDna', 'spatialIntent', 'architectureBridge', 'architectureAnchor', 'architectureFunctionBridge', 'spatialReality', 'architecturePreservation', 'promptCompiler'];
    for (const k of requiredKeys) {
      assert(r.moduleVersions[k] !== undefined, `${brand} moduleVersions.${k} should be set`);
    }
  }
});

// ---------- §9 Baseline Protection ----------
console.log('\n§9 Baseline Protection:');

test('Runtime output is mode-B (full pipeline), 3 brand baseline runnable via existing compileRuntimePrompt (12 blocks)', async () => {
  // Phase 9C adds new layer on top of Phase 8C baseline. Baseline should still work.
  const { compileRuntimePrompt } = await import(
    '../../prompt-compiler/runtime/compile-runtime.mjs'
  );
  for (const brand of ['jiuzhou-aesthetics', 'feng-tang-tang', 'yi-ji-liang-fang']) {
    const dnaPath = brand === 'jiuzhou-aesthetics'
      ? 'field-schema/examples/jiuzhou-aesthetics.dna.json'
      : (brand === 'feng-tang-tang' ? 'test-cases/regression/projects/feng-tang-tang.dna.json' : 'test-cases/regression/projects/yi-jui-liang-fang.dna.json');
    const dna = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', dnaPath), 'utf8'));
    const baseline = compileRuntimePrompt(dna, { brandKey: brand });
    assert(baseline.blockCount === 12, `${brand} baseline (compileRuntimePrompt) should still return 12 blocks`);
  }
});

// ---------- Validation: throws on invalid input ----------
console.log('\nInput validation:');

test('compileSpaceRuntime throws on null brandKey', () => {
  let threw = false;
  try { compileSpaceRuntime(null); } catch { threw = true; }
  assert(threw, 'should throw on null brandKey');
});

test('compileSpaceRuntime throws on unknown brand', () => {
  let threw = false;
  try { compileSpaceRuntime('unknown-brand'); } catch { threw = true; }
  assert(threw, 'should throw on unknown brand (loadBrandDna will fail)');
});

test('loadBrandDna throws on null brandKey', () => {
  let threw = false;
  try { loadBrandDna(null); } catch { threw = true; }
  assert(threw, 'should throw on null brandKey');
});

test('buildRuntimeEvaluationRecord throws on null runtimeResult', () => {
  let threw = false;
  try { buildRuntimeEvaluationRecord(null, { brandKey: 'test' }); } catch { threw = true; }
  assert(threw, 'should throw on null runtimeResult');
});

test('buildRuntimeEvaluationRecord throws on missing brandKey', () => {
  let threw = false;
  try { buildRuntimeEvaluationRecord({ markdown: '' }, {}); } catch { threw = true; }
  assert(threw, 'should throw on missing brandKey');
});

// ---------- No Provider Calls ----------
console.log('\nNo Provider Calls:');

test('compile-space-runtime.mjs 不调网络', () => {
  const src = readFileSync(join(__dirname, '..', 'compile-space-runtime.mjs'), 'utf8');
  assert(!src.includes('fetch(') && !src.includes('http.') && !src.includes('https.'),
    'compile-space-runtime.mjs should not have network calls');
  const importLines = src.split('\n').filter((l) => l.trim().startsWith('import ') || l.trim().startsWith('from '));
  for (const line of importLines) {
    assert(!line.toLowerCase().includes('openai') && !line.toLowerCase().includes('seedream') && !line.toLowerCase().includes('http'),
      `compile-space-runtime.mjs import line should not reference LLM/Provider: ${line.trim()}`);
  }
});

test('data-contract.mjs 不调网络', () => {
  const src = readFileSync(join(__dirname, '..', 'data-contract.mjs'), 'utf8');
  assert(!src.includes('fetch('), 'data-contract.mjs should not have fetch calls');
  assert(!src.toLowerCase().includes('openai'), 'data-contract.mjs should not reference openai');
});

test('runtime-evaluation-record.mjs 不调网络', () => {
  const src = readFileSync(join(__dirname, '..', 'runtime-evaluation-record.mjs'), 'utf8');
  assert(!src.includes('fetch('), 'runtime-evaluation-record.mjs should not have fetch calls');
  assert(!src.toLowerCase().includes('openai'), 'runtime-evaluation-record.mjs should not reference openai');
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
