// Spatial Regression Score v1 (Phase 9D)
// 用途: Phase 9D §8 Spatial Regression Score 6 维 / 100 分 text-level 评估.
//       不调真实 Provider, 不修改 baseline 行为, 不污染生产代码.
//
// Phase 9D §8 评分维度 (6 维, 每维 0-100, 总分 100 分 = 平均):
//   1. Industry Accuracy         — DNA industry / category / sceneType 跟 9C.0.5 gate 一致
//   2. Brand Translation         — brand_translation 块覆盖 brand key 关键 DNA 字段
//   3. Architecture Quality      — architecture_dna 块覆盖 material / lighting / boundary 关键字段
//   4. Functional Reality        — spatial_reality_constraint 块覆盖 requiredZones / scale / operation
//   5. Intent Alignment          — preset 4 维 intent 跟 9C.0.5 gate / DNA 行业特征一致
//   6. Cross-space Consistency    — 同一 brand 不同 preset 下 architecture_dna / brand_translation
//                                 byte-equal (Phase v1.0 Spatial Intent Presets §principles)
//
// Phase 9D §10 Level 0 文本验证: DNA / Prompt / Runtime Strategy 全过,
// 无需生成图片.
//
// Phase 9D §11 完成标准: 5 行业验证 / 4 preset / Cross Industry Gate 有效 /
// 无重大品牌污染 / 不同 brand 保持差异 / 同 brand 空间保持一致.

import { compileSpaceRuntime } from '../../space-runtime/compile-space-runtime.mjs';
import { validateBrandIdentity, synthesizeAnalysisReport } from '../../brand-identity-validation/compile-validation.mjs';
import { SUPPORTED_PRESETS, loadPreset } from '../../spatial-intent-presets/data-contract.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// evaluation/regression/spatial-regression-score.mjs -> 3 levels up to repo root D:\Masterpiece-OS
const repoRoot = join(__dirname, '..', '..', '..', '..');

/**
 * Compute Spatial Regression Score for one (brand, preset) case.
 * 6 dimensions, each 0-100, total = average = 0-100.
 *
 * @param {string} brandKey - 'jiuzhou-aesthetics' | 'feng-tang-tang' | 'yi-ji-liang-fang' | 'wa-ye' | 'jin-xiu'
 * @param {string} preset - 'brand_driven' | 'architecture_driven' | 'reference_driven' | 'balanced'
 * @returns {Object} SpatialRegressionScoreRecord
 */
export function computeSpatialRegressionScore(brandKey, preset) {
  // 1. compileSpaceRuntime with the preset (9C.1 + v1.0 preset)
  const r = compileSpaceRuntime(brandKey, { preset });

  // 2. validateBrandIdentity (9C.0.5 brand identity gate)
  const dna = r.compiledSpatialIntent?.primaryEmotion ? null : null; // not needed
  // We need the DNA — load it directly via the brand key
  const dnaPath = join(repoRoot, 'space-generator/v1-experimental/test-cases/regression/projects', `${brandKey === 'jiuzhou-aesthetics' ? 'jiuzhou-aesthetics' : (brandKey === 'jin-xiu' ? 'jin-xiu' : brandKey === 'wa-ye' ? 'wa-ye' : (brandKey === 'feng-tang-tang' ? 'feng-tang-tang' : 'yi-ji-liang-fang'))}.dna.json`);
  const dnaFilePath = brandKey === 'jiuzhou-aesthetics'
    ? join(repoRoot, 'space-generator/v1-experimental/field-schema/examples/jiuzhou-aesthetics.dna.json')
    : dnaPath;
  const dnaContent = JSON.parse(readFileSync(dnaFilePath, 'utf8'));
  const gateResult = validateBrandIdentity({ brandDNA: dnaContent, analysisReport: synthesizeAnalysisReport(dnaContent) });

  // === Dimension 1: Industry Accuracy (Phase 9C.0.5) ===
  const industryMatch = gateResult.industry.matchedIndustry;
  const industryAccurate = industryMatch !== null && gateResult.status === 'pass';
  const industryScore = industryAccurate
    ? (gateResult.overallConfidence >= 0.85 ? 100 : Math.round(gateResult.overallConfidence * 100))
    : (gateResult.riskLevel === 'critical' ? 0 : gateResult.riskLevel === 'high' ? 30 : 60);

  // === Dimension 2: Brand Translation ===
  // 提取 brand_translation block, 检查是否包含 brand name + 关键 brand DNA 字段 (audience, brandPositioning)
  const brandTransBlock = r.blocks.find((b) => b.id === 'brand_translation')?.text ?? '';
  const brandName = dnaContent.project?.brandName ?? '';
  const audience = dnaContent.project?.audience ?? [];
  const brandPos = dnaContent.project?.brandPositioning ?? [];
  const hasBrandName = brandTransBlock.includes(brandName);
  const hasAudience = audience.some((a) => brandTransBlock.includes(a));
  const hasBrandPos = brandPos.some((p) => brandTransBlock.includes(p));
  const brandTransScore = Math.round(((hasBrandName ? 40 : 0) + (hasAudience ? 30 : 0) + (hasBrandPos ? 30 : 0)));

  // === Dimension 3: Architecture Quality ===
  // 提取 architecture_dna block, 检查 material / lighting / boundary 关键字段
  const archDnaBlock = r.blocks.find((b) => b.id === 'architecture_dna')?.text ?? '';
  const primaryMats = dnaContent.materialDna?.primaryMaterials ?? [];
  const lightingStrategy = dnaContent.lightingDna?.primaryStrategy ?? '';
  const boundary = dnaContent.architectureDna?.boundaryLanguage?.enclosure ?? '';
  const hasMaterials = primaryMats.slice(0, 2).some((m) => archDnaBlock.includes(m));
  const hasLighting = lightingStrategy && archDnaBlock.toLowerCase().includes(lightingStrategy.toLowerCase().split('_')[0]);
  const hasBoundary = boundary && archDnaBlock.toLowerCase().includes(boundary.toLowerCase().split('_')[0]);
  const archDnaScore = Math.round(((hasMaterials ? 40 : 0) + (hasLighting ? 30 : 0) + (hasBoundary ? 30 : 0)));

  // === Dimension 4: Functional Reality ===
  // 提取 spatial_reality_constraint block, 检查 requiredZones / scale / operation
  const spatialRealityBlock = r.blocks.find((b) => b.id === 'spatial_reality_constraint')?.text ?? '';
  const requiredZones = dnaContent.sceneDefinition?.requiredZones ?? [];
  const scale = dnaContent.sceneDefinition?.scale ?? '';
  const hasZones = requiredZones.slice(0, 2).some((z) => spatialRealityBlock.toLowerCase().includes(z.toLowerCase().split('_')[0]));
  const hasScale = scale && spatialRealityBlock.toLowerCase().includes(scale.toLowerCase());
  const spatialRealityScore = Math.round(((hasZones ? 50 : 0) + (hasScale ? 50 : 0)));

  // === Dimension 5: Intent Alignment ===
  // 验证 preset 4 维 intent 跟 9C.0.5 gate / DNA 行业特征一致
  const intent = r.compiledSpatialIntentPreset?.spatialIntentPreset?.intent;
  const intentAlignment = computeIntentAlignment(intent, industryMatch, preset);
  const intentScore = intentAlignment.score;

  // === Dimension 6: Cross-space Consistency ===
  // 同一 brand 不同 preset 下 architecture_dna / brand_translation byte-equal
  // (Phase v1.0 Spatial Intent Presets §principles 验证)
  const crossSpaceScore = computeCrossSpaceConsistency(brandKey);

  // === Total Score ===
  const totalScore = Math.round((industryScore + brandTransScore + archDnaScore + spatialRealityScore + intentScore + crossSpaceScore) / 6);

  return {
    brandKey,
    preset,
    industryMatched: industryMatch,
    gateStatus: gateResult.status,
    gateRiskLevel: gateResult.riskLevel,
    gateRecommendation: gateResult.recommendation,
    gateConfidence: gateResult.overallConfidence,
    gateIssueCount: gateResult.issues.length,
    blockCount: r.blockCount,
    characterCount: r.characterCount,
    runtimePath: r.runtimePath,
    intent: intent ?? null,
    scores: {
      industryAccuracy: industryScore,
      brandTranslation: brandTransScore,
      architectureQuality: archDnaScore,
      functionalReality: spatialRealityScore,
      intentAlignment: intentScore,
      crossSpaceConsistency: crossSpaceScore,
    },
    totalScore,
    evidence: {
      hasBrandNameInTransBlock: hasBrandName,
      hasAudienceInTransBlock: hasAudience,
      hasBrandPosInTransBlock: hasBrandPos,
      hasMaterialsInArchDnaBlock: hasMaterials,
      hasLightingInArchDnaBlock: hasLighting,
      hasBoundaryInArchDnaBlock: hasBoundary,
      hasZonesInRealityBlock: hasZones,
      hasScaleInRealityBlock: hasScale,
      intentAlignmentNotes: intentAlignment.notes,
    },
  };
}

/**
 * Dimension 5 helper: validate preset 4 维 intent 跟 9C.0.5 industry / preset 推荐一致性
 */
function computeIntentAlignment(intent, industry, preset) {
  if (!intent) return { score: 0, notes: 'no intent (preset not specified)' };

  const notes = [];
  let score = 100;

  // industryConstraint 永远 maintain (Phase v1.0 §3 永远不 drop 行业逻辑)
  if (intent.industryConstraint !== 'maintain') {
    score -= 30;
    notes.push(`industryConstraint should be 'maintain' (got '${intent.industryConstraint}')`);
  } else {
    notes.push('industryConstraint=maintain ✓');
  }

  // preset 推荐品牌 vs industry 行业匹配
  const presetIntent = loadPreset(preset)?.intent;
  if (presetIntent) {
    // preset 必须 match loadPreset 的 intent (sanity check)
    if (intent.brandExpression !== presetIntent.brandExpression) score -= 5;
    if (intent.architectureExpression !== presetIntent.architectureExpression) score -= 5;
  }

  // preset 推荐 industry (per Phase v1.0 §11):
  //   brand_driven × wa-ye (casual_dining)
  //   architecture_driven × jiuzhou-aesthetics (medical_aesthetics)
  //   balanced × feng-tang-tang (restaurant) / yi-ji-liang-fang (tcm_wellness)
  //   reference_driven × 任意
  if (industry === 'casual_dining' && preset === 'brand_driven') {
    notes.push('casual_dining + brand_driven: matches §11 recommended pairing');
  } else if (industry === 'medical_aesthetics' && preset === 'architecture_driven') {
    notes.push('medical_aesthetics + architecture_driven: matches §11 recommended pairing');
  } else if ((industry === 'restaurant' || industry === 'tcm_wellness') && preset === 'balanced') {
    notes.push(`${industry} + balanced: matches §11 recommended pairing`);
  } else if (preset === 'reference_driven') {
    notes.push('reference_driven: applicable to any strong-reference project');
  } else {
    notes.push(`${industry} + ${preset}: not the §11 recommended pairing, but not invalid`);
  }

  return { score: Math.max(0, score), notes: notes.join('; ') };
}

/**
 * Dimension 6 helper: 同一 brand 不同 preset 下 architecture_dna / brand_translation byte-equal
 */
function computeCrossSpaceConsistency(brandKey) {
  // 取 4 preset 的 compileSpaceRuntime 结果
  const results = {};
  for (const preset of SUPPORTED_PRESETS) {
    const r = compileSpaceRuntime(brandKey, { preset });
    results[preset] = {
      archDna: r.blocks.find((b) => b.id === 'architecture_dna')?.text,
      brandTrans: r.blocks.find((b) => b.id === 'brand_translation')?.text,
    };
  }

  // 跟 balanced preset 比 (baseline)
  const baseline = results.balanced;
  let archDnaAllEqual = true;
  let brandTransAllEqual = true;
  for (const preset of SUPPORTED_PRESETS) {
    if (preset === 'balanced') continue;
    if (results[preset].archDna !== baseline.archDna) archDnaAllEqual = false;
    if (results[preset].brandTrans !== baseline.brandTrans) brandTransAllEqual = false;
  }

  // Phase v1.0 §principles: architecture_dna + brand_translation byte-equal across presets within same brand
  // 4 preset 内 archDna / brandTrans 全 byte-equal = 100 分
  // 否则扣分
  let score = 100;
  if (!archDnaAllEqual) score -= 50;
  if (!brandTransAllEqual) score -= 50;

  return Math.max(0, score);
}

/**
 * Compute Spatial Regression Score for one brand, all 4 presets.
 * @param {string} brandKey
 * @returns {Array<Object>} 4 preset cases
 */
export function computeBrandRegression(brandKey) {
  return SUPPORTED_PRESETS.map((preset) => computeSpatialRegressionScore(brandKey, preset));
}

/**
 * Compute Spatial Regression Score for all brands × all presets (4 × N).
 * @param {Array<string>} brandKeys
 * @returns {Array<Object>} N × 4 cases
 */
export function computeAllRegression(brandKeys) {
  const all = [];
  for (const brand of brandKeys) {
    for (const preset of SUPPORTED_PRESETS) {
      all.push(computeSpatialRegressionScore(brand, preset));
    }
  }
  return all;
}
