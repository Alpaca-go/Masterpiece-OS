// Space Multi-brand Evaluation Layer v1 (Phase 8D)
// 评估 §5 4 个 multi-brand 指标:
//   1. Architecture Generalization Score — 衡量 architecture principles 是否 transferable
//   2. Brand Adaptation Score — 衡量品牌身份翻译到空间
//   3. Anchor Decoupling Score — 衡量 anchor 是否独立于某个 brand (无 brand-specific 元素)
//   4. Concept Drift Score — 跟踪 (Phase 8B.1 / 8C 已经有, 这里复用作 Phase 8D 验证)
//
// 不调 Provider, 不污染生产代码, 不动 v1-baseline.
// 基于 DNA 字段 + anchor registry 字段做确定性评分, 任何 v0.1 / v0.3 DNA 都能跑出 multi-brand 评估.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..');

/**
 * Architecture Language 4 categories (Phase 8D §6 / §7).
 * 与 architecture-language/registry.json 4 个 category 对应.
 */
const ARCH_LANGUAGE_CATEGORIES = [
  'organic-flow',
  'translucent-boundary',
  'soft-light-system',
  'material-continuity',
];

/**
 * Brand-specific markers (Phase 8D §4 Test A/B/C + Phase 8D §9 forbidden markers).
 * 用于 Anchor Decoupling Score: anchor 描述里包含 brand-specific marker 减分.
 */
const BRAND_SPECIFIC_MARKERS = {
  'jiuzhou-aesthetics': [
    'membrane ceiling', 'membrane_structure', 'translucent_membrane', 'soft_continuity',
    'layered_biomorphic_flow', 'purple_lavender', 'soft_lavender', 'visibleButNotHospitalLike',
    'medical_compliance', 'consultation_station', 'frosted_glass', 'mineral_plaster',
  ],
  'feng-tang-tang': [
    'kitchen_pass_visible', 'open_kitchen_window', 'red_brick_wall', 'terracotta_tile',
    'warm_wood_booth', 'booth_seating', 'high_density_booth', 'active_dining_circulation',
    'spice_display', 'casual_dining',
  ],
  'yi-ji-liang-fang': [
    'wooden_grid', 'rice_paper', 'paper_screen', 'tea_corner', 'herbal_display_wall',
    'consultation_desk', 'tcm_consultation', 'brass_fitting', 'matte_clay_wall',
    'linen_fabric', 'warm_amber_pendant',
  ],
};

/**
 * Architecture Generalization Score (Phase 8D §5.1).
 * 衡量 architecture principles 是否 transferable.
 *
 * 输入: anchor registry 中所有 anchor 的 applicability.industries 数量
 * 输出: 0-1 score, 越高 = architecture language 越 transferable (跨 industry).
 *
 * 实现: 计算 brand anchors 跨 industry 适用性.
 * - JZMX anchors: applicability.industries = ['medical_aesthetics'] -> 不跨 industry -> generalization 较低 (但 anchor 内的 mechanism 属于 architecture-language 类别, 这里 0.5+)
 * - FTT anchors: applicability.industries = ['restaurant'] -> 不跨 industry
 * - YJLF anchors: applicability.industries = ['health_management'] -> 不跨 industry
 *
 * Phase 8D 实际: 3 brand 各 own industry, generalization 反映 "brand anchors 是行业特定的, 但 anchor 内部 mechanism 属于 architecture-language 类别 (transferable)".
 */
function scoreArchitectureGeneralization(brandKey, anchors) {
  if (anchors.length === 0) {
    return { score: 0, max: 1, reason: 'no anchors loaded' };
  }
  // 计算每个 anchor 的跨 industry 适用性
  const crossIndustryCount = anchors.filter((a) => {
    const industries = a.applicability?.industries ?? [];
    return industries.length > 1;
  }).length;
  const crossIndustryRatio = crossIndustryCount / anchors.length;
  // Phase 8D 设计: 期望 anchor 不跨 industry (防 overfit), 但 anchor 内的 mechanism 属于 architecture-language 类别.
  // 所以 generalization score = 1 - crossIndustryRatio + mechanismCategoryCoverage.
  // mechanismCategoryCoverage: anchor mechanism 文本中包含多少 architecture-language 关键词.
  const allMechanisms = anchors.map((a) => `${a.primaryMechanism} ${a.secondaryMechanism ?? ''}`).join(' ').toLowerCase();
  const matchedCategories = ARCH_LANGUAGE_CATEGORIES.filter((cat) => {
    // 简化: 检查 category 关键词在 mechanism 文本中出现
    const keywords = {
      'organic-flow': ['flow', 'curve', 'continuous', 'biomorphic', 'wood', 'booth'],
      'translucent-boundary': ['translucent', 'membrane', 'paper', 'glass', 'frosted'],
      'soft-light-system': ['light', 'glow', 'integrated', 'wall_glow', 'ceiling_cavity'],
      'material-continuity': ['material', 'continuity', 'wood', 'brick', 'terracotta', 'clay'],
    };
    const kws = keywords[cat] ?? [];
    return kws.some((kw) => allMechanisms.includes(kw));
  });
  const mechanismCoverage = matchedCategories.length / ARCH_LANGUAGE_CATEGORIES.length;
  // generalization = 0.5 * (1 - crossIndustryRatio) + 0.5 * mechanismCoverage
  // 注意: (1 - crossIndustryRatio) 让 anchor 收紧的 brand 得分较高
  // 但 Phase 8D 实际是 3 brand 各 own industry, crossIndustryRatio = 0, 所以 (1 - 0) = 1
  const score = 0.5 * (1 - crossIndustryRatio) + 0.5 * mechanismCoverage;
  return {
    score: Math.min(score, 1),
    max: 1,
    reason: `crossIndustryRatio=${crossIndustryRatio.toFixed(2)} (anchor 不跨 industry 防 overfit) + mechanismCategoryCoverage=${mechanismCoverage.toFixed(2)} (mechanism 属于 ${matchedCategories.length}/4 architecture-language 类别)`,
  };
}

/**
 * Brand Adaptation Score (Phase 8D §5.2).
 * 衡量品牌身份翻译到空间.
 *
 * 输入: dna.brandSpaceDna.brandSpirit (5 维) + dna.brandTranslationRules (5 维) (v0.3)
 * 输出: 0-1 score, 越高 = 品牌身份翻译越好.
 *
 * 实现:
 * - brandSpirit 5 维 >= 0.5 计数
 * - brandTranslationRules 5 维 spiritToSpaceMechanism 完整度
 * - brandSpaceDna.brandGrammar 5 维有值
 * - brandSpaceDna.motifFamily 有 candidates
 */
function scoreBrandAdaptation(dna) {
  let score = 0;
  const breakdown = [];
  // 1. brandSpirit 5 维有值 (max 0.25)
  const spirit = dna.brandSpaceDna?.brandSpirit ?? {};
  const spiritKeys = ['scientific', 'elegant', 'healing', 'futuristic', 'premium'];
  const spiritCount = spiritKeys.filter((k) => typeof spirit[k] === 'number').length;
  score += (spiritCount / 5) * 0.25;
  breakdown.push(`brandSpirit ${spiritCount}/5 维有值: +${((spiritCount / 5) * 0.25).toFixed(3)}`);

  // 2. brandGrammar 5 维有值 (max 0.20)
  const grammar = dna.brandSpaceDna?.brandGrammar ?? {};
  const grammarKeys = ['organicGrowth', 'visualLightness', 'controlledGlow', 'refinedOrder', 'decorativeDensity'];
  const grammarCount = grammarKeys.filter((k) => grammar[k] != null).length;
  score += (grammarCount / 5) * 0.20;
  breakdown.push(`brandGrammar ${grammarCount}/5 维有值: +${((grammarCount / 5) * 0.20).toFixed(3)}`);

  // 3. motifFamily 有 candidates (max 0.15)
  const mf = dna.brandSpaceDna?.motifFamily ?? [];
  if (mf.length > 0) {
    score += 0.15;
    breakdown.push(`motifFamily 有 ${mf.length} candidates: +0.15`);
  } else {
    breakdown.push('motifFamily 空: +0');
  }

  // 4. brandTranslationRules 完整 (v0.3) (max 0.40)
  const btr = dna.brandTranslationRules;
  if (btr) {
    const spirit = btr.spiritToSpaceMechanism ?? {};
    const btrSpiritCount = spiritKeys.filter((k) => spirit[k]).length;
    score += (btrSpiritCount / 5) * 0.20;
    breakdown.push(`brandTranslationRules.spiritToSpaceMechanism ${btrSpiritCount}/5: +${((btrSpiritCount / 5) * 0.20).toFixed(3)}`);
    const motifRules = btr.motifToSpaceMechanism ?? [];
    if (motifRules.length >= 3) {
      score += 0.20;
      breakdown.push(`brandTranslationRules.motifToSpaceMechanism ${motifRules.length} rules: +0.20`);
    } else {
      breakdown.push(`brandTranslationRules.motifToSpaceMechanism ${motifRules.length} rules (< 3): +0`);
    }
  } else {
    breakdown.push('brandTranslationRules missing (v0.1 baseline): +0');
  }

  return {
    score: Math.min(score, 1),
    max: 1,
    breakdown,
  };
}

/**
 * Anchor Decoupling Score (Phase 8D §5.3).
 * 衡量 anchor 是否独立于某个 brand (无 brand-specific 元素).
 *
 * 输入: anchor registry 中所有 anchor 的 primaryMechanism 文本
 * 输出: 0-1 score, 越高 = anchor 描述 reusable architectural principles.
 *
 * 实现: 检查 anchor mechanism 文本中包含多少 brand-specific marker.
 * 包含 = 减分. 不包含 = 满分.
 */
function scoreAnchorDecoupling(brandKey, anchors) {
  if (anchors.length === 0) {
    return { score: 1, max: 1, reason: 'no anchors (no leakage risk)' };
  }
  // 注: 这里是检查 anchor 描述的 brand-specific leakage. 自身的 brandKey 不应被算 leakage.
  // 但理论上 JZMX anchor 描述里不应出现 JZMX 行业标志, 因为 anchor 是 architecture mechanism, 不是 brand element.
  const ownMarkers = BRAND_SPECIFIC_MARKERS[brandKey] ?? [];
  const otherBrands = Object.keys(BRAND_SPECIFIC_MARKERS).filter((k) => k !== brandKey);
  let leakageCount = 0;
  const leakageDetails = [];
  for (const a of anchors) {
    const text = `${a.primaryMechanism ?? ''} ${a.secondaryMechanism ?? ''}`.toLowerCase();
    for (const marker of ownMarkers) {
      if (text.includes(marker.toLowerCase())) {
        leakageCount += 1;
        leakageDetails.push(`${a.id} contains own-brand marker "${marker}"`);
      }
    }
    for (const other of otherBrands) {
      const otherMarkers = BRAND_SPECIFIC_MARKERS[other] ?? [];
      for (const marker of otherMarkers) {
        if (text.includes(marker.toLowerCase())) {
          leakageCount += 1;
          leakageDetails.push(`${a.id} contains cross-brand marker "${marker}" (from ${other})`);
        }
      }
    }
  }
  // 期望: 0 leakage
  const totalMarkers = anchors.length * (ownMarkers.length + otherBrands.reduce((s, k) => s + (BRAND_SPECIFIC_MARKERS[k] ?? []).length, 0));
  // score = 1 - (leakage / totalMarkers)
  // 简化: 如果 leakage > 0, score 减 0.5; 否则 score = 1
  let score = 1;
  if (leakageCount > 0) {
    score = Math.max(0, 1 - (leakageCount / anchors.length) * 0.2);
  }
  return {
    score: Math.min(score, 1),
    max: 1,
    reason: leakageCount === 0
      ? `${anchors.length} anchors, 0 brand-specific marker leakage (reusable)`
      : `${leakageCount} leakage(s): ${leakageDetails.slice(0, 3).join('; ')}${leakageDetails.length > 3 ? '...' : ''}`,
  };
}

/**
 * Concept Drift Score (Phase 8D §5.4).
 * 跟踪 unrealistic structures / exhibition-only architecture / poor commercial usability.
 * 复用了 architectureFunctionBridge.conceptDriftGuards (Phase 8B.1).
 */
function scoreConceptDrift(dna) {
  const afb = dna.architectureFunctionBridge;
  const guardCount = afb?.conceptDriftGuards?.length ?? 0;
  if (guardCount === 0) {
    return {
      score: 0,
      max: 1,
      reason: 'no conceptDriftGuards (Concept Drift unprotected)',
    };
  }
  if (guardCount < 5) {
    return {
      score: 0.5,
      max: 1,
      reason: `conceptDriftGuards has ${guardCount} items (< 5, partial protection)`,
    };
  }
  return {
    score: 1,
    max: 1,
    reason: `conceptDriftGuards has ${guardCount} items (>= 5, full Phase 8B.1 §7 protection)`,
  };
}

/**
 * Multi-brand evaluation entry.
 *
 * @param dna        Space DNA instance
 * @param brandKey   brand key for anchor registry lookup
 * @returns { architectureGeneralization, brandAdaptation, anchorDecoupling, conceptDrift }
 */
export function evaluateMultiBrand(dna, brandKey) {
  if (!dna || typeof dna !== 'object') {
    throw new TypeError('evaluateMultiBrand: dna must be a non-null object');
  }
  // 加载 anchor registry
  const registryPath = join(
    repoRoot, 'space-generator', 'v1-experimental', 'architecture-anchors', 'registry.json',
  );
  if (!existsSync(registryPath)) {
    throw new Error(`Anchor registry not found: ${registryPath}`);
  }
  const reg = JSON.parse(readFileSync(registryPath, 'utf8'));
  const brandAnchors = reg.brands?.[brandKey]?.anchors ?? [];
  return {
    architectureGeneralization: scoreArchitectureGeneralization(brandKey, brandAnchors),
    brandAdaptation: scoreBrandAdaptation(dna),
    anchorDecoupling: scoreAnchorDecoupling(brandKey, brandAnchors),
    conceptDrift: scoreConceptDrift(dna),
  };
}
