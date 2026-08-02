// Spatial Strategy Selector — Phase 9C.2 v2 §6
// 用途: 根据 Brand Identity Confidence + DNA 自动选 4 个 internal strategy 之一 (brand_driven /
//       architecture_driven / reference_driven / balanced). 不开放用户 (per doc §6 + §10).
//
// 决策规则 (per doc §7 例子 + Phase 9C.2 v2 §6):
//   - 强视觉资产 (asset 强) AND 不强 reference  → brand_driven
//   - 强建筑 (statementStrength / boundary / material / lighting 结构强) → architecture_driven
//   - 强 reference (有 reference image) AND asset 不强 → reference_driven
//   - 否则 / 都不强 → balanced
//
// Per doc §8 Runtime Output: {spatialStrategy: {brand, architecture, reference} (sum = 1.0) }
//
// 不调真实 Provider, 不修改 baseline 行为, 不污染生产代码.

import { computeBrandIdentityConfidence } from '../brand-identity-confidence/brand-identity-confidence.mjs';
import { loadBrandDna } from '../space-runtime/data-contract.mjs';

const STRATEGY = {
  BRAND: 'brand_driven',
  ARCH: 'architecture_driven',
  REFERENCE: 'reference_driven',
  BALANCED: 'balanced',
};

const DEFAULT_WEIGHTS = {
  brand_driven: { brand: 0.55, architecture: 0.30, reference: 0.10, industry: 0.05 },
  architecture_driven: { brand: 0.30, architecture: 0.55, reference: 0.10, industry: 0.05 },
  reference_driven: { brand: 0.30, architecture: 0.30, reference: 0.35, industry: 0.05 },
  balanced: { brand: 0.30, architecture: 0.30, reference: 0.30, industry: 0.10 },
};

/**
 * Score how strong a brand is on a specific axis (0-1).
 */
function scoreBrandAxis(dna) {
  // brand_drive: brandSpirit strong + literalAssetUsage + color + motif specific
  if (!dna?.brandSpaceDna) return 0;
  const spirit = dna.brandSpaceDna.brandSpirit ?? {};
  const literal = dna.brandSpaceDna.literalAssetUsage ?? {};
  const motif = dna.brandSpaceDna.motifFamily ?? [];
  const hueFamily = dna.lightingDna?.brandLight?.hueFamily ?? [];
  const strongSpirit = Object.values(spirit).filter((v) => (v ?? 0) >= 0.6).length;
  const literalFields = Object.keys(literal).length;
  return Math.min(1, (strongSpirit / 4) * 0.4 + (literalFields / 3) * 0.3 + (motif.length / 3) * 0.2 + (hueFamily.length / 3) * 0.1);
}

function scoreArchAxis(dna) {
  // architecture_drive: statementStrength high + material hierarchy + lighting structure
  if (!dna?.architectureDna) return 0;
  const statement = dna.architectureDna.statementStrength ?? 'medium';
  const matCount = (dna.materialDna?.primaryMaterials?.length ?? 0) + (dna.materialDna?.secondaryMaterials?.length ?? 0);
  const hasLighting = dna.lightingDna?.primaryStrategy && dna.lightingDna.primaryStrategy !== 'direct_lighting';
  const boundary = dna.architectureDna.boundaryLanguage?.enclosure ?? 'medium';
  const statementScore = statement === 'high' ? 1 : statement === 'medium' ? 0.5 : 0.2;
  const boundaryScore = boundary === 'soft' ? 1 : boundary === 'medium' ? 0.6 : 0.3;
  return Math.min(1, statementScore * 0.5 + boundaryScore * 0.3 + (matCount / 4) * 0.1 + (hasLighting ? 0.1 : 0));
}

function scoreReferenceAxis(dna, hasReferenceImage = false) {
  // reference_drive: needs reference image; with brand IP that can be learned from
  if (hasReferenceImage) return 1.0;
  // No reference image → no reference drive (force other strategy)
  return 0;
}

/**
 * Auto-select spatial strategy for a brand.
 * @param {string} brandKey
 * @param {Object} [options] - { hasReferenceImage: bool (default false) }
 * @returns {Promise<{
 *   brandKey: string,
 *   selectedStrategy: 'brand_driven' | 'architecture_driven' | 'reference_driven' | 'balanced',
 *   confidence: { industry, asset, color, motif, narrative, total },
 *   axisScores: { brand, architecture, reference },
 *   weights: { brand, architecture, reference, industry },
 *   reason: string,
 * }>}
 */
export async function selectSpatialStrategy(brandKey, options = {}) {
  const { dna } = await loadBrandDna(brandKey);
  const confidence = await computeBrandIdentityConfidence(brandKey);

  const axisScores = {
    brand: scoreBrandAxis(dna),
    architecture: scoreArchAxis(dna),
    reference: scoreReferenceAxis(dna, options.hasReferenceImage),
  };

  // Decision logic
  let selectedStrategy;
  let reason;

  // Strong reference + weak brand/arch → reference_driven
  if (axisScores.reference >= 0.9 && axisScores.brand < 0.5 && axisScores.architecture < 0.5) {
    selectedStrategy = STRATEGY.REFERENCE;
    reason = 'strong reference image + weak brand/arch → reference_driven';
  }
  // Strong brand (IP / asset / color / motif specific) → brand_driven
  else if (axisScores.brand >= 0.7 && axisScores.brand > axisScores.architecture + 0.1) {
    selectedStrategy = STRATEGY.BRAND;
    reason = `strong brand axis (${axisScores.brand.toFixed(2)}) > arch (${axisScores.architecture.toFixed(2)}) → brand_driven`;
  }
  // Strong arch (statementStrength high + lighting structure) → architecture_driven
  else if (axisScores.architecture >= 0.6 && axisScores.architecture > axisScores.brand + 0.1) {
    selectedStrategy = STRATEGY.ARCH;
    reason = `strong arch axis (${axisScores.architecture.toFixed(2)}) > brand (${axisScores.brand.toFixed(2)}) → architecture_driven`;
  }
  // Reference image + decent brand/arch → reference_driven (mixed-strategy as §7 example)
  else if (axisScores.reference >= 0.9 && (axisScores.brand >= 0.5 || axisScores.architecture >= 0.5)) {
    selectedStrategy = STRATEGY.REFERENCE;
    reason = 'reference image + decent brand/arch → reference_driven';
  }
  // All weak / balanced → balanced
  else {
    selectedStrategy = STRATEGY.BALANCED;
    reason = `no dominant axis (brand=${axisScores.brand.toFixed(2)}, arch=${axisScores.architecture.toFixed(2)}, ref=${axisScores.reference.toFixed(2)}) → balanced`;
  }

  // Get weight distribution for selected strategy
  const weights = { ...DEFAULT_WEIGHTS[selectedStrategy] };

  return {
    brandKey,
    selectedStrategy,
    confidence: {
      industry: confidence.scores.industry,
      asset: confidence.scores.asset,
      color: confidence.scores.color,
      motif: confidence.scores.motif,
      narrative: confidence.scores.narrative,
      total: confidence.total,
    },
    gateStatus: confidence.gateStatus,
    gateRiskLevel: confidence.gateRiskLevel,
    axisScores,
    weights,
    reason,
  };
}

export { STRATEGY, DEFAULT_WEIGHTS, scoreBrandAxis, scoreArchAxis, scoreReferenceAxis };
