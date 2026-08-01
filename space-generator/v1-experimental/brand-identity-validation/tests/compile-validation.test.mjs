// Phase 9C.0.5 Brand Identity Validation Gate — Tests
// 用法: node brand-identity-validation/tests/compile-validation.test.mjs
//
// 测试目标 (§13 success criteria):
//   1. 发现行业级错误 (WAYE sports_retail DNA with medical_aesthetics concerns)
//   2. 正常 brand 不误判 (FTT / YJLF / JZMX pass)
//   3. status / riskLevel / confidence / issues 字段都正确
//   4. 4 字段 (industry / category / spaceType / audience) 都验证
//   5. 跨字段内部一致性 (motif / material / negativeConstraint) 验证

import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBrandIdentity, synthesizeAnalysisReport, detectIndustryKey, loadRules, DATA_CONTRACT } from '../compile-validation.mjs';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..', '..');
// test file path: D:/Masterpiece-OS/space-generator/v1-experimental/brand-identity-validation/tests/compile-validation.test.mjs
// __dirname = D:/Masterpiece-OS/space-generator/v1-experimental/brand-identity-validation
// 3 levels up to repo root D:/Masterpiece-OS
const repoRoot = join(__dirname, '..', '..', '..');

function loadDna(relPath) {
  return JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', relPath), 'utf8'));
}

// === §13.1 发现行业级错误 ===

test('§13.1 Case 01: WAYE (casual_dining DNA, post-correction) — should PASS', () => {
  // 蛙耶 DNA 在 9C.0.5 + 9C.1 阶段被修正 (v0.3-waye-casual-dining):
  //  旧 (v0.1) 把蛙耶错标为 sports_retail / retail, gate 报 6 issues (FAIL)
  //  新 (v0.3) 改回 餐饮 / 炭烧牛蛙 / 潮流快餐 / casual_dining, gate 应 PASS
  //  gate catch 能力由 §13.4 internal-consistency / corrupted-DNA / unrecognized-industry 3 个
  //  反向 case 继续覆盖, 不依赖 WAYE 这一个 case.
  const dna = loadDna('test-cases/regression/projects/wa-ye.dna.json');
  const report = synthesizeAnalysisReport(dna);
  const result = validateBrandIdentity({ brandDNA: dna, analysisReport: report });

  assert.equal(result.industry.matchedIndustry, 'casual_dining', `industry should match casual_dining, got ${result.industry.matchedIndustry}`);
  assert.equal(result.status, 'pass', `WAYE (corrected) should pass (got ${result.status})`);
  assert.equal(result.riskLevel, 'low', `WAYE (corrected) risk should be low (got ${result.riskLevel})`);
  assert.equal(result.issues.length, 0, `WAYE (corrected) should have no issues (got ${result.issues.length})`);
  assert.ok(result.overallConfidence >= 0.85, `WAYE (corrected) confidence should be >= 0.85, got ${result.overallConfidence}`);
});

// === §13.2 正常 brand 不误判 ===

test('§13.2 Case 02: JZMX (medical_aesthetics) — should PASS', () => {
  const dna = loadDna('field-schema/examples/jiuzhou-aesthetics.dna.json');
  const report = synthesizeAnalysisReport(dna);
  const result = validateBrandIdentity({ brandDNA: dna, analysisReport: report });

  assert.equal(result.industry.matchedIndustry, 'medical_aesthetics');
  assert.equal(result.status, 'pass', `JZMX should pass (got ${result.status})`);
  assert.equal(result.riskLevel, 'low', `JZMX risk should be low (got ${result.riskLevel})`);
  assert.equal(result.issues.length, 0, `JZMX should have no issues (got ${result.issues.length})`);
  assert.ok(result.overallConfidence >= 0.85, `JZMX confidence should be >= 0.85 (got ${result.overallConfidence})`);
});

test('§13.2 Case 03: FTT (restaurant) — should PASS', () => {
  const dna = loadDna('test-cases/regression/projects/feng-tang-tang.dna.json');
  const report = synthesizeAnalysisReport(dna);
  const result = validateBrandIdentity({ brandDNA: dna, analysisReport: report });

  assert.equal(result.industry.matchedIndustry, 'restaurant');
  assert.equal(result.status, 'pass', `FTT should pass (got ${result.status})`);
  assert.equal(result.riskLevel, 'low', `FTT risk should be low (got ${result.riskLevel})`);
  assert.equal(result.issues.length, 0, `FTT should have no issues (got ${result.issues.length})`);
  assert.ok(result.overallConfidence >= 0.85, `FTT confidence should be >= 0.85 (got ${result.overallConfidence})`);
});

test('§13.2 bonus: YJLF (tcm_wellness) — should PASS', () => {
  const dna = loadDna('test-cases/regression/projects/yi-jui-liang-fang.dna.json');
  const report = synthesizeAnalysisReport(dna);
  const result = validateBrandIdentity({ brandDNA: dna, analysisReport: report });

  assert.equal(result.industry.matchedIndustry, 'tcm_wellness');
  assert.equal(result.status, 'pass', `YJLF should pass (got ${result.status})`);
  assert.equal(result.riskLevel, 'low', `YJLF risk should be low (got ${result.riskLevel})`);
  assert.equal(result.issues.length, 0, `YJLF should have no issues (got ${result.issues.length})`);
});

// === §13.3 Field validation ===

test('§13.3 industry detection: matches known industry keys', () => {
  const rules = loadRules();
  const r1 = detectIndustryKey('医疗美容与医美生态服务', rules);
  assert.equal(r1.key, 'medical_aesthetics');
  assert.equal(r1.label, '医疗美容 / 医美');
  const r2 = detectIndustryKey('餐饮 / 川菜 / 跷脚牛肉', rules);
  assert.equal(r2.key, 'restaurant');
  assert.equal(r2.label, '餐厅 / 餐饮');
  const r3 = detectIndustryKey('中医养生与健康管理', rules);
  assert.equal(r3.key, 'tcm_wellness');
  assert.equal(r3.label, '中医养生 / 健康管理');
  const r4 = detectIndustryKey('体育用品零售', rules);
  assert.equal(r4.key, 'sports_retail');
  assert.equal(r4.label, '体育用品零售');
  assert.equal(detectIndustryKey('unknown industry', rules), null);
});

test('§13.3 industry detection: matches synonyms', () => {
  const rules = loadRules();
  assert.equal(detectIndustryKey('医美', rules)?.key, 'medical_aesthetics');
  assert.equal(detectIndustryKey('中医', rules)?.key, 'tcm_wellness');
  assert.equal(detectIndustryKey('运动品牌', rules)?.key, 'sports_retail');
  assert.equal(detectIndustryKey('潮流餐饮', rules)?.key, 'casual_dining');
});

test('§13.3 data-contract: schema structure', () => {
  assert.equal(DATA_CONTRACT.phase, '9C.0.5');
  assert.equal(DATA_CONTRACT.gate, 'brand-identity-validation-gate');
  assert.ok(DATA_CONTRACT.input.brandDNA);
  assert.ok(DATA_CONTRACT.output.status);
  assert.equal(DATA_CONTRACT.thresholds.pass, 0.85);
  assert.equal(DATA_CONTRACT.thresholds.review, 0.65);
});

// === §13.4 内部一致性 ===

test('§13.4 internal consistency: DNA without industry should not be silently passed', () => {
  // Synthesize a "corrupted" DNA that says restaurant but has medical_aesthetics motif + spa constraint
  const corruptedDna = {
    project: {
      industry: 'restaurant',
      category: 'restaurant',
      brandName: 'CORRUPTED',
      audience: ['食客', 'diner'],
    },
    sceneDefinition: { sceneType: 'reception' },
    brandSpaceDna: {
      motifFamily: ['feather_like_flow', 'peacock'],
    },
    materialDna: { primaryMaterials: ['rubber_floor'], accentMaterials: [] },
    lightingDna: { primaryStrategy: 'direct_lighting' },
    negativeConstraints: { prohibit: ['spa_atmosphere', 'hospital_corridor'] },
    metadata: {},
  };
  const result = validateBrandIdentity({ brandDNA: corruptedDna });
  assert.equal(result.industry.matchedIndustry, 'restaurant');
  // Should detect: motifFamily contamination (peacock is medical_aesthetics only, not restaurant)
  // Should detect: rubber_floor is sports/casual_dining, not restaurant
  // Should detect: spa_atmosphere / hospital_corridor are tcm_wellness / medical_aesthetics concerns
  const fields = result.issues.map((i) => i.field);
  assert.ok(fields.includes('motifFamily'), 'should flag motifFamily contamination');
  assert.ok(fields.includes('materialDna'), 'should flag rubber_floor material');
  assert.ok(fields.includes('negativeConstraints'), 'should flag negativeConstraint contamination');
  assert.ok(['high', 'critical'].includes(result.riskLevel), 'risk should be high or critical');
  assert.ok(['review', 'fail'].includes(result.status), 'status should be review or fail');
});

test('§13.4 industry completely unrecognized: should CRITICAL fail', () => {
  const dna = {
    project: { industry: 'underwater basket weaving', category: 'weaving', audience: [] },
    sceneDefinition: { sceneType: 'reception' },
    brandSpaceDna: { motifFamily: [] },
    materialDna: { primaryMaterials: [], accentMaterials: [] },
    lightingDna: {},
    negativeConstraints: { prohibit: [] },
    metadata: {},
  };
  const result = validateBrandIdentity({ brandDNA: dna });
  assert.equal(result.industry.matchedIndustry, null);
  assert.equal(result.industry.confidence, 0);
  assert.equal(result.riskLevel, 'critical');
  assert.equal(result.status, 'fail');
  assert.ok(result.issues.some((i) => i.severity === 'critical'));
});

test('§13.4 spaceType forbidden for industry: should flag HIGH', () => {
  // restaurant + fitting_room (forbidden for restaurant)
  const dna = {
    project: { industry: 'restaurant', category: 'restaurant', audience: ['食客', 'diner'] },
    sceneDefinition: { sceneType: 'fitting_room' },
    brandSpaceDna: { motifFamily: ['warm_wood'] },
    materialDna: { primaryMaterials: ['warm_wood'], accentMaterials: [] },
    lightingDna: { primaryStrategy: 'natural_daylight' },
    negativeConstraints: { prohibit: [] },
    metadata: {},
  };
  const result = validateBrandIdentity({ brandDNA: dna });
  // The spaceType should be flagged
  const spaceTypeIssue = result.issues.find((i) => i.field === 'spaceType');
  assert.ok(spaceTypeIssue, 'spaceType should be flagged');
  assert.ok(['high', 'critical'].includes(spaceTypeIssue.severity), 'spaceType should be high or critical');
  assert.ok(['high', 'critical'].includes(result.riskLevel), 'risk should be high or critical');
});

// === §13.5 confidence computation ===

test('§13.5 confidence weighting: 4 fields contribute per schema', () => {
  const dna = loadDna('field-schema/examples/jiuzhou-aesthetics.dna.json');
  const report = synthesizeAnalysisReport(dna);
  const result = validateBrandIdentity({ brandDNA: dna, analysisReport: report });
  // weights: industry 0.35, category 0.15, spaceType 0.30, audience 0.20
  const expected = (
    result.industry.confidence * 0.35
    + result.category.confidence * 0.15
    + result.spaceType.confidence * 0.30
    + result.audience.confidence * 0.20
  );
  assert.ok(Math.abs(result.overallConfidence - Number(expected.toFixed(3))) < 0.01, `confidence should match weighted sum (got ${result.overallConfidence} vs ${expected})`);
});

test('§13.5 metadata: phase / version / gate present', () => {
  const dna = loadDna('field-schema/examples/jiuzhou-aesthetics.dna.json');
  const result = validateBrandIdentity({ brandDNA: dna });
  assert.equal(result.metadata.phase, '9C.0.5');
  assert.equal(result.metadata.version, '1.0.0');
  assert.equal(result.metadata.gate, 'brand-identity-validation-gate');
  assert.ok(result.metadata.generatedAt);
});
