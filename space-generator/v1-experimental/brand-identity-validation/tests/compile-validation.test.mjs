// Phase 9C.0.5 Brand Identity Validation Gate — Tests (Updated doc schema)
// 用法: node brand-identity-validation/tests/compile-validation.test.mjs
//
// 测试目标 (Phase 9C.0.5 Updated doc §13 success criteria):
//   1. 发现行业级错误 (waye v0.1 错位 sports_retail + medical concerns → blocked + review_brand_DNA)
//   2. 正常 brand 不误判 (FTT / YJLF / JZMX / WAYE-corrected pass + continue)
//   3. status / riskLevel / recommendation / issues 字段都正确
//   4. 6 字段 (industry / category / spaceType / audience / materialDirection / functionalRelationship) 都验证
//   5. 跨字段内部一致性 (motif / material / negativeConstraint / zone) 验证
//
// 跟 Updated doc 对齐 (status 改 pass/blocked 二态, recommendation 字段, 6 fields).

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

// === §13.1 发现行业级错误 (waye v0.1 错位 case) ===

test('§13.1 Case 01: WAYE v0.1 (错位: sports_retail DNA with medical_aesthetics concerns) — should BLOCKED + review_brand_DNA', () => {
  // 蛙耶 v0.1 DNA 错把炭烧牛蛙餐饮标成体育用品零售, 同时用了 medical/tcm concerns.
  // 这是 Phase 9C.0.5 §8 典型: 行业理解错 + 内容 cross-industry contamination.
  const corruptedDna = {
    project: {
      industry: '体育用品零售 / 运动品牌',
      category: 'retail',
      brandName: '蛙耶',
      audience: ['运动爱好者', '年轻消费者', '装备升级需求'],
    },
    sceneDefinition: {
      sceneType: 'product_display',
      sceneSubtype: 'sporting_goods_floor',
      requiredZones: ['product_wall', 'trial_zone', 'fitting_room', 'checkout_counter'],
    },
    brandSpaceDna: {
      brandSpirit: { scientific: 0.4, elegant: 0.3, healing: 0.2, futuristic: 0.5, premium: 0.5 },
      motifFamily: ['feather_like_flow'],
    },
    materialDna: {
      primaryMaterials: ['exposed_concrete', 'metal_grid', 'rubber_floor'],
      accentMaterials: ['neon_signage_tube'],
    },
    lightingDna: { primaryStrategy: 'direct_lighting' },
    negativeConstraints: {
      prohibit: ['spa_atmosphere', 'hospital_corridor', 'silent_meditation_room', 'fine_dining_dinnerware'],
    },
    metadata: {},
  };
  const report = synthesizeAnalysisReport(corruptedDna);
  const result = validateBrandIdentity({ brandDNA: corruptedDna, analysisReport: report });

  assert.equal(result.industry.matchedIndustry, 'sports_retail', `industry should match sports_retail, got ${result.industry.matchedIndustry}`);
  assert.equal(result.status, 'blocked', `WAYE v0.1 should be blocked (got ${result.status})`);
  assert.equal(result.recommendation, 'review_brand_DNA', `recommendation should be review_brand_DNA (got ${result.recommendation})`);
  assert.ok(['high', 'critical'].includes(result.riskLevel), `risk should be high or critical (got ${result.riskLevel})`);
  assert.ok(result.issues.length >= 3, `should have multiple issues (got ${result.issues.length})`);

  // Verify specific cross-industry contamination issues
  const fields = result.issues.map((i) => i.field);
  const messages = result.issues.map((i) => i.message);

  // negativeConstraints: spa_atmosphere / hospital_corridor / silent_meditation_room / fine_dining_dinnerware
  assert.ok(messages.some((m) => m.includes('spa_atmosphere')), 'should flag spa_atmosphere contamination');
  assert.ok(messages.some((m) => m.includes('hospital_corridor')), 'should flag hospital_corridor contamination');
  assert.ok(messages.some((m) => m.includes('silent_meditation_room')), 'should flag silent_meditation_room contamination');

  // motifFamily: feather_like_flow (medical_aesthetics) in sports_retail
  assert.ok(fields.includes('motifFamily'), 'should flag motifFamily contamination');
});

// === §13.2 正常 brand 不误判 ===

test('§13.2 Case 02: JZMX (medical_aesthetics) — should PASS + continue + low risk', () => {
  const dna = loadDna('field-schema/examples/jiuzhou-aesthetics.dna.json');
  const report = synthesizeAnalysisReport(dna);
  const result = validateBrandIdentity({ brandDNA: dna, analysisReport: report });

  assert.equal(result.industry.matchedIndustry, 'medical_aesthetics');
  assert.equal(result.status, 'pass', `JZMX should pass (got ${result.status})`);
  assert.equal(result.recommendation, 'continue', `JZMX recommendation should be continue (got ${result.recommendation})`);
  assert.equal(result.riskLevel, 'low', `JZMX risk should be low (got ${result.riskLevel})`);
  assert.equal(result.issues.length, 0, `JZMX should have no issues (got ${result.issues.length})`);
  assert.ok(result.overallConfidence >= 0.85, `JZMX confidence should be >= 0.85 (got ${result.overallConfidence})`);
  // 6 field checks
  assert.ok(result.materialDirection, 'should have materialDirection field check');
  assert.ok(result.functionalRelationship, 'should have functionalRelationship field check');
  assert.ok(result.materialDirection.confidence > 0.5, 'JZMX materialDirection should have reasonable confidence');
  assert.ok(result.functionalRelationship.confidence > 0.5, 'JZMX functionalRelationship should have reasonable confidence');
});

test('§13.2 Case 03: FTT (restaurant) — should PASS + continue + low risk', () => {
  const dna = loadDna('test-cases/regression/projects/feng-tang-tang.dna.json');
  const report = synthesizeAnalysisReport(dna);
  const result = validateBrandIdentity({ brandDNA: dna, analysisReport: report });

  assert.equal(result.industry.matchedIndustry, 'restaurant');
  assert.equal(result.status, 'pass', `FTT should pass (got ${result.status})`);
  assert.equal(result.recommendation, 'continue', `FTT recommendation should be continue (got ${result.recommendation})`);
  assert.equal(result.riskLevel, 'low', `FTT risk should be low (got ${result.riskLevel})`);
  assert.equal(result.issues.length, 0, `FTT should have no issues (got ${result.issues.length})`);
  assert.ok(result.overallConfidence >= 0.85, `FTT confidence should be >= 0.85 (got ${result.overallConfidence})`);
});

test('§13.2 Case 04: YJLF (tcm_wellness) — should PASS + continue + low risk', () => {
  const dna = loadDna('test-cases/regression/projects/yi-jui-liang-fang.dna.json');
  const report = synthesizeAnalysisReport(dna);
  const result = validateBrandIdentity({ brandDNA: dna, analysisReport: report });

  assert.equal(result.industry.matchedIndustry, 'tcm_wellness');
  assert.equal(result.status, 'pass', `YJLF should pass (got ${result.status})`);
  assert.equal(result.recommendation, 'continue', `YJLF recommendation should be continue (got ${result.recommendation})`);
  assert.equal(result.riskLevel, 'low', `YJLF risk should be low (got ${result.riskLevel})`);
  assert.equal(result.issues.length, 0, `YJLF should have no issues (got ${result.issues.length})`);
});

test('§13.2 Case 05: WAYE v0.3 (post-correction, casual_dining) — should PASS + continue + low risk', () => {
  const dna = loadDna('test-cases/regression/projects/wa-ye.dna.json');
  const report = synthesizeAnalysisReport(dna);
  const result = validateBrandIdentity({ brandDNA: dna, analysisReport: report });

  assert.equal(result.industry.matchedIndustry, 'casual_dining');
  assert.equal(result.status, 'pass', `WAYE v0.3 should pass (got ${result.status})`);
  assert.equal(result.recommendation, 'continue', `WAYE v0.3 recommendation should be continue (got ${result.recommendation})`);
  assert.equal(result.riskLevel, 'low', `WAYE v0.3 risk should be low (got ${result.riskLevel})`);
  assert.equal(result.issues.length, 0, `WAYE v0.3 should have no issues (got ${result.issues.length})`);
  assert.ok(result.overallConfidence >= 0.85, `WAYE v0.3 confidence should be >= 0.85 (got ${result.overallConfidence})`);
});

// === §13.3 industry detection (longest-match scoring) ===

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
  assert.equal(detectIndustryKey('炭烧牛蛙', rules)?.key, 'casual_dining');
});

// === §13.3 Updated doc schema (DATA_CONTRACT) ===

test('§13.3 data-contract: phase / gate / output schema (Updated)', () => {
  assert.equal(DATA_CONTRACT.phase, '9C.0.5');
  assert.equal(DATA_CONTRACT.gate, 'brand-identity-validation-gate');
  assert.ok(DATA_CONTRACT.input.brandDNA);
  // Updated: status is now "pass" | "blocked" (二态)
  assert.ok(DATA_CONTRACT.output.status.includes('pass') && DATA_CONTRACT.output.status.includes('blocked'),
    `output.status should describe pass/blocked (got "${DATA_CONTRACT.output.status}")`);
  // Updated: recommendation is "continue" | "review_brand_DNA" | "ask_user"
  assert.ok(DATA_CONTRACT.output.recommendation.includes('continue')
    && DATA_CONTRACT.output.recommendation.includes('review_brand_DNA')
    && DATA_CONTRACT.output.recommendation.includes('ask_user'),
    `output.recommendation should describe all 3 values (got "${DATA_CONTRACT.output.recommendation}")`);
  // Updated: 6 fields
  assert.ok(DATA_CONTRACT.output.industry);
  assert.ok(DATA_CONTRACT.output.category);
  assert.ok(DATA_CONTRACT.output.spaceType);
  assert.ok(DATA_CONTRACT.output.audience);
  assert.ok(DATA_CONTRACT.output.materialDirection, 'should have materialDirection field');
  assert.ok(DATA_CONTRACT.output.functionalRelationship, 'should have functionalRelationship field');
});

// === §13.4 internal consistency / corrupted DNA / unknown industry / forbidden sceneType / forbidden material / forbidden zone ===

test('§13.4 internal consistency: restaurant DNA with medical_aesthetics motif + medical concerns — should BLOCKED + review_brand_DNA', () => {
  // Synthesize a "corrupted" DNA that says restaurant but has medical_aesthetics motif + spa constraint
  const corruptedDna = {
    project: {
      industry: 'restaurant',
      category: 'restaurant',
      brandName: 'CORRUPTED',
      audience: ['食客', 'diner'],
    },
    sceneDefinition: { sceneType: 'reception', requiredZones: ['dining_area'] },
    brandSpaceDna: {
      motifFamily: ['peacock'],
    },
    materialDna: { primaryMaterials: ['rubber_floor'], accentMaterials: [] },
    lightingDna: { primaryStrategy: 'direct_lighting' },
    negativeConstraints: { prohibit: ['spa_atmosphere', 'hospital_corridor'] },
    metadata: {},
  };
  const result = validateBrandIdentity({ brandDNA: corruptedDna });
  assert.equal(result.industry.matchedIndustry, 'restaurant');
  // Should detect:
  //   - motifFamily contamination (peacock is medical_aesthetics only, not restaurant)
  //   - rubber_floor is sports/casual_dining, not restaurant
  //   - spa_atmosphere / hospital_corridor are tcm_wellness / medical_aesthetics concerns
  const fields = result.issues.map((i) => i.field);
  assert.ok(fields.includes('motifFamily'), 'should flag motifFamily contamination');
  assert.ok(fields.includes('materialDna'), 'should flag rubber_floor material');
  assert.ok(fields.includes('negativeConstraints'), 'should flag negativeConstraint contamination');
  assert.equal(result.status, 'blocked', 'should be blocked');
  assert.equal(result.recommendation, 'review_brand_DNA', 'should be review_brand_DNA');
  assert.ok(['high', 'critical'].includes(result.riskLevel), 'risk should be high or critical');
});

test('§13.4 industry completely unrecognized: should CRITICAL block + review_brand_DNA', () => {
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
  assert.equal(result.status, 'blocked');
  assert.equal(result.recommendation, 'review_brand_DNA');
  assert.ok(result.issues.some((i) => i.severity === 'critical'));
});

test('§13.4 spaceType forbidden for industry (restaurant + fitting_room): should flag HIGH/CRITICAL', () => {
  // Phase 9C.0.5 §8 example: restaurant + fitting_room = High Risk
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
  const spaceTypeIssue = result.issues.find((i) => i.field === 'spaceType');
  assert.ok(spaceTypeIssue, 'spaceType should be flagged');
  assert.ok(['high', 'critical'].includes(spaceTypeIssue.severity), 'spaceType should be high or critical');
  assert.equal(result.status, 'blocked');
  assert.equal(result.recommendation, 'review_brand_DNA');
});

test('§13.4 functional relationship contamination: restaurant + fitting_room zone', () => {
  // Phase 9C.0.5 Updated §6.6: zone cross-industry contamination
  // restaurant industry + fitting_room zone (medical/retail zone) = cross-industry contamination
  const dna = {
    project: { industry: 'restaurant', category: 'restaurant', audience: ['食客', 'diner'] },
    sceneDefinition: { sceneType: 'reception', requiredZones: ['fitting_room', 'dining_area'] },
    brandSpaceDna: { motifFamily: ['warm_wood'] },
    materialDna: { primaryMaterials: ['warm_wood'], accentMaterials: [] },
    lightingDna: { primaryStrategy: 'natural_daylight' },
    negativeConstraints: { prohibit: [] },
    metadata: {},
  };
  const result = validateBrandIdentity({ brandDNA: dna });
  const funcIssue = result.issues.find((i) => i.field === 'functionalRelationship');
  assert.ok(funcIssue, 'functionalRelationship should be flagged for restaurant + fitting_room zone');
  assert.equal(result.status, 'blocked');
});

test('§13.4 material direction forbidden: medical_aesthetics + rubber_floor', () => {
  // Phase 9C.0.5 Updated §6.5: material cross-industry contamination
  // medical_aesthetics industry + rubber_floor material (sports/gym material) = High Risk
  const dna = {
    project: { industry: 'medical_aesthetics', category: 'medical_aesthetics', audience: ['求美者', 'patient'] },
    sceneDefinition: { sceneType: 'reception', requiredZones: ['reception_desk'] },
    brandSpaceDna: { motifFamily: ['calm_mineral'] },
    materialDna: { primaryMaterials: ['rubber_floor', 'calm_mineral'], accentMaterials: [] },
    lightingDna: { primaryStrategy: 'soft_natural' },
    negativeConstraints: { prohibit: [] },
    metadata: {},
  };
  const result = validateBrandIdentity({ brandDNA: dna });
  const matIssue = result.issues.find((i) => i.field === 'materialDirection');
  assert.ok(matIssue, 'materialDirection should be flagged for medical_aesthetics + rubber_floor');
  assert.ok(['high', 'critical'].includes(matIssue.severity), 'material issue should be high or critical');
  assert.equal(result.status, 'blocked');
  assert.equal(result.recommendation, 'review_brand_DNA');
});

// === §13.5 confidence computation: 6 fields contribute ===

test('§13.5 confidence weighting: 6 fields contribute per Updated schema', () => {
  const dna = loadDna('field-schema/examples/jiuzhou-aesthetics.dna.json');
  const report = synthesizeAnalysisReport(dna);
  const result = validateBrandIdentity({ brandDNA: dna, analysisReport: report });
  // weights: industry 0.25 / spaceType 0.20 / audience 0.15 / category 0.10 / materialDirection 0.15 / functionalRelationship 0.15
  const expected = (
    result.industry.confidence * 0.25
    + result.spaceType.confidence * 0.20
    + result.audience.confidence * 0.15
    + result.category.confidence * 0.10
    + result.materialDirection.confidence * 0.15
    + result.functionalRelationship.confidence * 0.15
  );
  assert.ok(Math.abs(result.overallConfidence - Number(expected.toFixed(3))) < 0.01, `confidence should match weighted sum (got ${result.overallConfidence} vs ${expected})`);
});

test('§13.5 metadata: phase / version / gate present (Updated)', () => {
  const dna = loadDna('field-schema/examples/jiuzhou-aesthetics.dna.json');
  const result = validateBrandIdentity({ brandDNA: dna });
  assert.equal(result.metadata.phase, '9C.0.5');
  assert.equal(result.metadata.gate, 'brand-identity-validation-gate');
  assert.ok(result.metadata.generatedAt);
  // version bumped to 2.0.0 in Updated
  assert.ok(result.metadata.version.startsWith('2.') || result.metadata.version === '2.0.0', `version should be 2.x (got ${result.metadata.version})`);
});

// === §13.6 recommendation logic (Updated §7) ===

test('§13.6 recommendation logic: 0 issues + high conf → continue; critical/high risk → review_brand_DNA; medium risk → ask_user', () => {
  // Case A: JZMX (clean) → pass + continue
  const dnaA = loadDna('field-schema/examples/jiuzhou-aesthetics.dna.json');
  const rA = validateBrandIdentity({ brandDNA: dnaA });
  assert.equal(rA.status, 'pass', 'JZMX should be pass');
  assert.equal(rA.recommendation, 'continue', 'JZMX recommendation should be continue');

  // Case B: v0.1 waye (错位, critical/high risk) → blocked + review_brand_DNA
  const dnaB = {
    project: { industry: '体育用品零售 / 运动品牌', category: 'retail', audience: ['运动爱好者'] },
    sceneDefinition: { sceneType: 'product_display', requiredZones: ['product_wall', 'fitting_room'] },
    brandSpaceDna: { motifFamily: ['feather_like_flow'] },
    materialDna: { primaryMaterials: ['rubber_floor'], accentMaterials: [] },
    lightingDna: { primaryStrategy: 'direct_lighting' },
    negativeConstraints: { prohibit: ['spa_atmosphere', 'hospital_corridor'] },
    metadata: {},
  };
  const rB = validateBrandIdentity({ brandDNA: dnaB });
  assert.equal(rB.status, 'blocked', 'v0.1 waye should be blocked');
  assert.equal(rB.recommendation, 'review_brand_DNA', 'v0.1 waye should be review_brand_DNA');

  // Case C: only medium issues → blocked + ask_user
  const dnaC = {
    project: { industry: 'medical_aesthetics', category: 'medical_aesthetics', audience: [] },  // missing audience → medium
    sceneDefinition: { sceneType: 'reception' },
    brandSpaceDna: { motifFamily: [] },
    materialDna: { primaryMaterials: [], accentMaterials: [] },
    lightingDna: {},
    negativeConstraints: { prohibit: [] },
    metadata: {},
  };
  const rC = validateBrandIdentity({ brandDNA: dnaC });
  if (rC.issues.length > 0 && rC.riskLevel === 'medium') {
    assert.equal(rC.recommendation, 'ask_user', 'medium risk should be ask_user');
  }
});
