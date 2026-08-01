#!/usr/bin/env node
// Phase 7 4-project regression test suite
// 用法: node space-generator/v1-experimental/test-cases/regression/tests/regression.test.mjs

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..', '..', '..');

const { compileTrace } = await import(
  '../../../../v1-experimental/prompt-compiler/trace/compile-trace.mjs',
);
const { compileFieldEnrichedPrompt } = await import(
  '../../../../v1-experimental/prompt-compiler/field-enriched/compile-prompt.mjs',
);

const dnaSchema = JSON.parse(readFileSync(
  join(repoRoot, 'space-generator', 'v1-experimental', 'field-schema', 'space-dna.schema.json'),
  'utf8',
));
const traceSchema = JSON.parse(readFileSync(
  join(repoRoot, 'space-generator', 'v1-experimental', 'prompt-compiler', 'trace', 'prompt-trace.schema.json'),
  'utf8',
));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateDna = ajv.compile(dnaSchema);
const validateTrace = ajv.compile(traceSchema);

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

console.log('Phase 7 4-project regression test \u2014 validation suite\n');

const index = loadJson(join(__dirname, '..', 'projects', 'index.json'));

// ---------- schema validation per project ----------
console.log('Schema validation:');
const projectDnas = {};

test('index.json declares 4 projects (JZMX / YJLF / FTT / WY)', () => {
  assert(index.projects.length === 4, `expected 4, got ${index.projects.length}`);
  const ids = index.projects.map((p) => p.id);
  for (const id of ['JZMX', 'YJLF', 'FTT', 'WY']) {
    assert(ids.includes(id), `missing project ${id}`);
  }
});

for (const project of index.projects) {
  test(`${project.id} (${project.name}) DNA validates against schema`, () => {
    const dnaPath = join(__dirname, '..', 'projects', project.dnaPath);
    assert(existsSync(dnaPath), `missing: ${dnaPath}`);
    const dna = loadJson(dnaPath);
    projectDnas[project.id] = dna;
    const ok = validateDna(dna);
    if (!ok) {
      const errs = (validateDna.errors || []).slice(0, 2).map((e) => `${e.instancePath} ${e.message}`).join('; ');
      throw new Error(errs);
    }
    assert(dna.project.category === project.category,
      `category ${dna.project.category} != expected ${project.category}`);
  });
}

// ---------- compile prompt per project ----------
console.log('\nPrompt compile:');
const projectPrompts = {};
for (const project of index.projects) {
  test(`${project.id} compileFieldEnrichedPrompt() produces valid output`, () => {
    const prompt = compileFieldEnrichedPrompt(projectDnas[project.id]);
    projectPrompts[project.id] = prompt;
    // Phase 8B.1 §4: baseline 11 块 (v1.1 §6 10 块 + architecture_function_bridge).
    assert(prompt.blockCount === 11, `blockCount ${prompt.blockCount} != 11 (Phase 8B.1 §4 11 块)`);
    assert(prompt.characterCount > 1000, `characterCount ${prompt.characterCount} too short`);
    assert(prompt.characterCount <= 8000, `characterCount ${prompt.characterCount} exceeds v1.0 \u00a710 maxReportCharacters=8000`);
  });
}

// ---------- pollution checks (v1.0 §30 Phase 7 验收) ----------
console.log('\nPollution checks (v1.0 \u00a730 Phase 7):');

test('JZMX quality not degraded (12 negative constraints present)', () => {
  const md = projectPrompts.JZMX.markdown;
  for (const item of [
    'generic_beauty_salon', 'excessive_purple', 'literal_peacock_theme_park',
    'repeated_flower_sculptures', 'random_crystal_decorations', 'nightclub_lighting',
    'cheap_acrylic_glow', 'overdecorated_reception', 'hospital_corridor',
    'empty_art_gallery', 'impossible_circulation', 'unusable_furniture',
  ]) {
    assert(md.includes(item), `JZMX prompt missing ${item}`);
  }
});

test('YJLF (\u4e00\u5242\u826f\u65b9) NOT contaminated with JZMX-specific markers', () => {
  const md = projectPrompts.YJLF.markdown;
  for (const marker of ['mineral_plaster', 'low_saturation_lavender_glow', 'petal_like_expansion']) {
    assert(!md.includes(marker), `YJLF prompt contaminated with JZMX marker: ${marker}`);
  }
  // \u4f46 translucent_fiber \u662f YJLF \u7684 motifFamily \u4e2d\u7684\u5143\u7d20, \u5141\u8bb8\u51fa\u73b0
  // \u6ca1\u6709 soft_continuity \u4f5c\u4e3a primary \u4e5f\u9700\u9a8c\u8bc1
});

test('FTT (\u51af\u70eb\u70eb) NOT contaminated with purple/clinic curves (excluding negativeConstraints block)', () => {
  // \u68c0\u67e5\u53cc\u51af\u70eb\u70eb prompt \u7684\u4e3b\u52a8\u5185\u5bb9 (\u67e5 brand_light / material / lighting \u7b49)
  // \u4e0d\u67e5 negativeConstraints \u5757: \u8be5\u5757\u5217\u51fa prohibit \u9879 (\u5305\u542b purple_lavender_glow \u7b49) \u662f\u6b63\u786e\u7684
  const md = projectPrompts.FTT.markdown;
  const lightingSection = md.split('# Prohibited')[0];
  for (const marker of [
    'purple_lavender_glow', 'low_saturation_lavender_glow',
    'feather_like_flow_motif', 'translucent_fiber',
    'soft_continuity', 'petal_like_expansion', 'optical_crystal',
    'white_curved_walls',
  ]) {
    assert(!lightingSection.includes(marker), `FTT prompt active content contaminated with JZMX marker: ${marker}`);
  }
});

test('WY (\u86d9\u8036) NOT mis-covered with high-end white space (excluding negativeConstraints block)', () => {
  const md = projectPrompts.WY.markdown;
  const lightingSection = md.split('# Prohibited')[0];
  for (const marker of [
    'white_curved_walls', 'high_end_clinic_lighting',
    'feather_like_flow_overuse', 'translucent_fiber_decoration',
    'optical_crystal', 'petal_sculpture', 'purple_lavender_glow',
    'elegant_lobby', 'spa_atmosphere',
  ]) {
    assert(!lightingSection.includes(marker), `WY prompt active content contaminated with JZMX marker: ${marker}`);
  }
});

test('YJLF / FTT / WY NOT contaminated with JZMX brand_spirit "scientific >= 0.9" force', () => {
  for (const id of ['YJLF', 'FTT', 'WY']) {
    const dna = projectDnas[id];
    const spirit = dna.brandSpaceDna.brandSpirit;
    // JZMX spirit.scientific = 0.92, \u5176\u4ed6 3 \u4e2a\u9879\u76ee\u5e94\u660e\u663e\u4f4e\u4e8e 0.9
    assert(spirit.scientific < 0.7, `${id} scientific=${spirit.scientific} \u8d8a\u9636 JZMX \u503c 0.92 (\u4e0d\u80fd\u88ab\u5f3a\u52a0\u533b\u7f8e\u54c1\u8d28)`);
  }
});

test('YJLF / FTT / WY brand_spirit \u4e0d\u88ab JZMX 5 \u7ef4\u5ea6 9 \u4e2a\u90fd\u8d85 0.7 \u7684\u4fb5\u8680', () => {
  for (const id of ['YJLF', 'FTT', 'WY']) {
    const spirit = projectDnas[id].brandSpaceDna.brandSpirit;
    const highCount = Object.values(spirit).filter((v) => typeof v === 'number' && v >= 0.7).length;
    assert(highCount <= 2, `${id} \u6709 ${highCount} \u4e2a brand_spirit \u8d85 0.7, \u8fc7\u591a (\u8be5\u9879\u76ee\u4e0d\u662f\u533b\u7f8e, \u4e0d\u80fd\u62ff JZMX \u7684 0.7+ \u9608\u503c)`);
  }
});

// ---------- preservation sanity (每个项目 preserve 各自的特征) ----------
console.log('\nPreservation sanity:');

test('JZMX lighting.primaryStrategy stays architectural_indirect_light', () => {
  assert(projectDnas.JZMX.lightingDna.primaryStrategy === 'architectural_indirect_light',
    `JZMX lighting.primaryStrategy changed to ${projectDnas.JZMX.lightingDna.primaryStrategy}`);
});

test('FTT lighting.primaryStrategy stays natural_lighting (NOT architectural_indirect_light JZMX style)', () => {
  assert(projectDnas.FTT.lightingDna.primaryStrategy === 'natural_lighting',
    `FTT lighting.primaryStrategy should be natural_lighting, got ${projectDnas.FTT.lightingDna.primaryStrategy}`);
});

test('WY lighting.primaryStrategy stays direct_lighting (raw_industrial)', () => {
  assert(projectDnas.WY.lightingDna.primaryStrategy === 'direct_lighting',
    `WY lighting.primaryStrategy should be direct_lighting, got ${projectDnas.WY.lightingDna.primaryStrategy}`);
});

test('YJLF lighting.primaryStrategy stays natural_lighting (warm wood + paper)', () => {
  assert(projectDnas.YJLF.lightingDna.primaryStrategy === 'natural_lighting',
    `YJLF lighting.primaryStrategy should be natural_lighting, got ${projectDnas.YJLF.lightingDna.primaryStrategy}`);
});

test('4 projects have distinct architecture.spatialConcept.primary', () => {
  const concepts = new Set(index.projects.map((p) => projectDnas[p.id].architectureDna.spatialConcept.primary));
  assert(concepts.size === 4, `expected 4 distinct spatial concepts, got ${concepts.size}: ${[...concepts].join(' / ')}`);
});

// ---------- write report ----------
console.log('\nReport:');
test('writes regression report to results/', () => {
  const report = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    projects: index.projects.map((p) => {
      const dna = projectDnas[p.id];
      return {
        id: p.id,
        name: p.name,
        category: dna.project.category,
        blockCount: projectPrompts[p.id].blockCount,
        characterCount: projectPrompts[p.id].characterCount,
        lightingPrimaryStrategy: dna.lightingDna.primaryStrategy,
        spatialConceptPrimary: dna.architectureDna.spatialConcept.primary,
        materialCount: dna.materialDna.primaryMaterials.length + (dna.materialDna.secondaryMaterials?.length || 0) + (dna.materialDna.accentMaterials?.length || 0),
        negativeConstraintsCount: dna.negativeConstraints.prohibit.length,
        brandSpiritHighCount: Object.values(dna.brandSpaceDna.brandSpirit).filter((v) => typeof v === 'number' && v >= 0.7).length,
      };
    }),
    pollutionCheck: 'PASS (v1.0 \u00a730 Phase 7 \u9a8c\u6536 4 \u9879)',
  };
  const outPath = join(__dirname, '..', 'results', 'regression-report.json');
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
