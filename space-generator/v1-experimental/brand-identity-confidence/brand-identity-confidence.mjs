// Brand Identity Confidence — Phase 9C.2 v2 §5
// 用途: 5 指标 weighted Brand Identity Confidence Score 0-100.
//       内部使用, 不开放用户 (per doc §1 流程).
//       跟 Phase 9C.0.5 gate (pass/blocked) 互补: 9C.0.5 是 binary gate, 9C.2 v2 是 continuous score.
//
// 5 指标 (per doc §5):
//   - Industry Match         30
//   - Asset Preservation     25
//   - Color Match            15
//   - Motif Match            15
//   - Narrative Match         15
//                                          --- (sum = 100)
//
// 不调真实 Provider, 不修改 baseline 行为, 不污染生产代码.

import {
  loadBrandDna,
} from '../space-runtime/data-contract.mjs';
import { validateBrandIdentity } from '../brand-identity-validation/compile-validation.mjs';

const WEIGHTS = {
  industry: 30,
  asset: 25,
  color: 15,
  motif: 15,
  narrative: 15,
};
const TOTAL_WEIGHT = Object.values(WEIGHTS).reduce((s, v) => s + v, 0); // 100

/**
 * Score Industry Match 0-1.
 * 来源: 9C.0.5 gateResult.industry.matchedIndustry + overallConfidence.
 * - matched industry + confidence >= 0.85 → 1.0
 * - matched + confidence >= 0.6 → 0.6-1.0 linear
 * - matched + confidence < 0.6 → 0.3-0.6
 * - unmatched → 0
 */
function scoreIndustry(gateResult) {
  const ind = gateResult.industry;
  if (!ind || !ind.matchedIndustry) return 0;
  const c = ind.confidence ?? gateResult.overallConfidence ?? 0;
  if (c >= 0.85) return 1.0;
  if (c >= 0.6) return 0.6 + (c - 0.6) * (0.4 / 0.25); // 0.6 → 1.0 over [0.6, 0.85]
  return 0.3 + (c / 0.6) * 0.3; // 0.3 → 0.6 over [0, 0.6]
}

/**
 * Score Asset Preservation 0-1.
 * 评估 brandSpaceDna / literalAssetUsage / brandSpirit 强度.
 * - 有 brandSpirit 多维 (>=3 fields >= 0.6) → 高
 * - literalAssetUsage 至少 1 个 'medium'/'low'/'optional' → 中
 * - 没有 → 低
 */
function scoreAsset(dna) {
  const brandSpace = dna?.brandSpaceDna;
  if (!brandSpace) return 0.1;
  const spirit = brandSpace.brandSpirit ?? {};
  const literalUsage = brandSpace.literalAssetUsage ?? {};
  const spiritKeys = Object.keys(spirit);
  const strongSpirit = spiritKeys.filter((k) => (spirit[k] ?? 0) >= 0.6).length;
  const literalFields = Object.keys(literalUsage).length;
  const strongLiteral = Object.values(literalUsage).filter((v) =>
    v === 'medium' || v === 'low' || v === 'optional' || (typeof v === 'number' && v >= 0.3)
  ).length;

  // Brand spirit with >= 3 strong dimensions + literal asset usage
  if (strongSpirit >= 3 && literalFields >= 2) return 1.0;
  if (strongSpirit >= 2 && literalFields >= 1) return 0.7;
  if (strongSpirit >= 1 || literalFields >= 1) return 0.4;
  return 0.1;
}

/**
 * Score Color Match 0-1.
 * 评估 brandLight.hueFamily / primaryMaterials 跟 industry 是否明确.
 * - brandLight.hueFamily >= 3 colors AND specific (含 #hex 或 brand_ 命名) → 1.0
 * - 2 colors → 0.6
 * - 1 color → 0.3
 * - 无 → 0.1
 */
function scoreColor(dna) {
  const hueFamily = dna?.lightingDna?.brandLight?.hueFamily ?? [];
  if (!Array.isArray(hueFamily) || hueFamily.length === 0) return 0.1;
  const specificCount = hueFamily.filter((c) =>
    typeof c === 'string' && (c.includes('#') || c.startsWith('brand_') || /^[a-z]+_[a-z]+$/.test(c))
  ).length;
  if (hueFamily.length >= 3 && specificCount >= 2) return 1.0;
  if (hueFamily.length >= 3 || specificCount >= 2) return 0.7;
  if (hueFamily.length === 2) return 0.5;
  return 0.3;
}

/**
 * Score Motif Match 0-1.
 * 评估 motifFamily 是否定义, 是否 generic (per 9C.0.5 motif origin check).
 * - motifFamily >= 3 specific motifs (含 "cartoon_" / "frog_" / "mineral_" 等具体名, 不是 "feather_like_flow" 跨行业) → 1.0
 * - 1-2 specific motifs → 0.6
 * - generic 单一 motif (e.g. only "feather_like_flow") → 0.3
 * - 无 motifFamily → 0.1
 */
function scoreMotif(dna) {
  const motifFamily = dna?.brandSpaceDna?.motifFamily;
  if (!Array.isArray(motifFamily) || motifFamily.length === 0) return 0.1;
  // Check if motifs are specific (contain industry-specific keywords) vs generic
  const specificKeywords = ['frog', 'cartoon', 'tcm', 'medicine', 'cabinet', 'tcm_wellness',
    'trading_market', 'sichuan', 'kitchen', 'dining', 'service_counter', 'lotus', 'medical_aesthetics',
    'wellness', 'casual_dining', 'fashion', 'retail', 'editorial'];
  const specificCount = motifFamily.filter((m) =>
    specificKeywords.some((k) => m.toLowerCase().includes(k))
  ).length;
  if (specificCount >= 2) return 1.0;
  if (specificCount === 1) return 0.7;
  // Check for the specific "WAYE v0.1" anti-pattern (generic cross-industry motifs)
  const genericCrossIndustry = ['feather_like_flow', 'peacock', 'petal_like_expansion',
    'flowing_membrane', 'optical_crystal', 'translucent_fiber'];
  const onlyGeneric = motifFamily.every((m) => genericCrossIndustry.includes(m));
  if (onlyGeneric) return 0.2;
  return 0.4;
}

/**
 * Score Narrative Match 0-1.
 * 评估 brandSpaceDna.brandGrammar / architectureFunctionBridge.spatialTranslation 是不是有清晰叙事.
 * - architectureFunctionBridge.spatialTranslation >= 3 entries with concrete mechanisms → 1.0
 * - 1-2 entries → 0.6
 * - 仅有 brandGrammar (no spatialTranslation) → 0.4
 * - 无 → 0.1
 */
function scoreNarrative(dna) {
  const bridge = dna?.architectureFunctionBridge;
  const brandGrammar = dna?.brandSpaceDna?.brandGrammar;
  const spatialTranslation = bridge?.spatialTranslation ?? [];
  const operationConstraints = bridge?.operationConstraints ?? [];

  const narrativeDensity = spatialTranslation.length + operationConstraints.length;
  if (narrativeDensity >= 5) return 1.0;
  if (narrativeDensity >= 3) return 0.7;
  if (narrativeDensity >= 1) return 0.5;
  // Has brandGrammar (4-dim) but no spatialTranslation
  if (brandGrammar && Object.keys(brandGrammar).length >= 2) return 0.3;
  return 0.1;
}

/**
 * Compute Brand Identity Confidence for a brand (5 indicators, 0-100 total).
 * @param {string} brandKey
 * @returns {Promise<{
 *   schemaVersion: '1.0',
 *   phase: '9C.2',
 *   brandKey: string,
 *   industry: string,
 *   scores: { industry: number, asset: number, color: number, motif: number, narrative: number },
 *   weights: { industry: 30, asset: 25, color: 15, motif: 15, narrative: 15 },
 *   total: number,
 *   gateStatus: string,
 *   gateRiskLevel: string,
 *   computedAt: string,
 * }>}
 */
export async function computeBrandIdentityConfidence(brandKey) {
  const loaded = await loadBrandDna(brandKey);
  const dna = loaded?.dna;
  const analysisReport = synthesizeAnalysisReportFromDna(dna);
  const gateResult = validateBrandIdentity({ brandDNA: dna, analysisReport });
  const industry = dna?.project?.industry ?? '?';

  const scores = {
    industry: scoreIndustry(gateResult),
    asset: scoreAsset(dna),
    color: scoreColor(dna),
    motif: scoreMotif(dna),
    narrative: scoreNarrative(dna),
  };

  const total = Math.round(
    (scores.industry * WEIGHTS.industry +
      scores.asset * WEIGHTS.asset +
      scores.color * WEIGHTS.color +
      scores.motif * WEIGHTS.motif +
      scores.narrative * WEIGHTS.narrative)
  );

  return {
    schemaVersion: '1.0',
    phase: '9C.2',
    brandKey,
    industry,
    scores,
    weights: { ...WEIGHTS },
    total,
    gateStatus: gateResult.status,
    gateRiskLevel: gateResult.riskLevel,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Build a minimal analysisReport from a brand DNA.
 * (Adapter: compile-validation expects analysisReport shape, but we only have dna.)
 */
function synthesizeAnalysisReportFromDna(dna) {
  return {
    industry: dna?.project?.industry ?? null,
    category: dna?.project?.category ?? null,
    sceneType: dna?.sceneDefinition?.sceneType ?? null,
    audience: dna?.project?.audience ?? [],
    primaryMaterials: dna?.materialDna?.primaryMaterials ?? [],
    secondaryMaterials: dna?.materialDna?.secondaryMaterials ?? [],
    accentMaterials: dna?.materialDna?.accentMaterials ?? [],
    requiredZones: dna?.sceneDefinition?.requiredZones ?? [],
    optionalZones: dna?.sceneDefinition?.optionalZones ?? [],
    brandSpirit: dna?.brandSpaceDna?.brandSpirit ?? {},
    motifFamily: dna?.brandSpaceDna?.motifFamily ?? [],
    brandLightHueFamily: dna?.lightingDna?.brandLight?.hueFamily ?? [],
    literalAssetUsage: dna?.brandSpaceDna?.literalAssetUsage ?? {},
    brandGrammar: dna?.brandSpaceDna?.brandGrammar ?? {},
    spatialTranslation: dna?.architectureFunctionBridge?.spatialTranslation ?? [],
    operationConstraints: dna?.architectureFunctionBridge?.operationConstraints ?? [],
    industryAttributable: !!dna?.project?.industry,
    matchedIndustry: null, // gate will set
  };
}

export { WEIGHTS, TOTAL_WEIGHT, scoreIndustry, scoreAsset, scoreColor, scoreMotif, scoreNarrative };
