// Architecture Anchor Loader v1 (Phase 8A) + Phase 8C Runtime Integration
// 用法:
//   import { loadArchitectureAnchors, getAnchorsAsInContextReference, selectAnchors } from '.../load-anchors.mjs';
//   const anchors = loadArchitectureAnchors('jiuzhou-aesthetics');
//   const refList = getAnchorsAsInContextReference('jiuzhou-aesthetics', 3);
//   const selected = selectAnchors('jiuzhou-aesthetics', { industry: 'medical_aesthetics', sceneType: 'reception', ... });
//
// 不调 Provider, 不污染生产代码.
// Registry source: ../registry.json (Phase 8A + Phase 8C 增强).
// Source-of-truth: 各 brand 子目录的 metadata.yaml + architecture-dna-analysis.yaml (Phase 1+2 已存在).
//
// Phase 8C Runtime Integration:
//   - selectAnchors(brandKey, criteria) 根据 DNA 字段自动选 anchor, 不需要调用方手动指定.
//   - 评分维度: industry / sceneType / commercialContext / functionalAlignment / weight.
//   - 返回 top-K anchors, 按分数降序, 含 scoring breakdown.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const registryPath = join(__dirname, '..', 'registry.json');

let registryCache = null;

function loadRegistry() {
  if (registryCache) return registryCache;
  if (!existsSync(registryPath)) {
    throw new Error(`Anchor registry not found: ${registryPath}`);
  }
  registryCache = JSON.parse(readFileSync(registryPath, 'utf8'));
  return registryCache;
}

/**
 * Load architecture anchors for a given brand.
 * @param brandKey  e.g. 'jiuzhou-aesthetics'
 * @returns array of {id, role, primaryMechanism, secondaryMechanism, imagePath, weight}
 *          or [] if brand has no anchors
 */
export function loadArchitectureAnchors(brandKey) {
  if (!brandKey || typeof brandKey !== 'string') {
    throw new TypeError('loadArchitectureAnchors: brandKey must be a non-empty string');
  }
  const reg = loadRegistry();
  const brandEntry = reg.brands?.[brandKey];
  if (!brandEntry) return [];
  return Array.isArray(brandEntry.anchors) ? brandEntry.anchors : [];
}

/**
 * Get the N highest-weight anchors as a compact in-context reference list.
 * Used by prompt compiler to render an "Architecture Context" block.
 * @param brandKey   e.g. 'jiuzhou-aesthetics'
 * @param maxCount   max number of anchors to return; default registry default (3)
 * @returns array of anchors sorted by weight desc, capped at maxCount
 */
export function getAnchorsAsInContextReference(brandKey, maxCount) {
  const reg = loadRegistry();
  const cap = maxCount ?? reg.inContextPolicy?.maxReferencesPerPrompt ?? 3;
  const anchors = loadArchitectureAnchors(brandKey);
  // Stable sort by weight desc, then by role coverage order if present
  return [...anchors]
    .sort((a, b) => (b.weight ?? 1) - (a.weight ?? 1))
    .slice(0, cap);
}

/**
 * Resolve the absolute filesystem path of an anchor image.
 * Used by real-Provider integration only; prompt text uses mechanism strings.
 * @param brandKey  brand key
 * @param anchorId  anchor id
 * @returns absolute path or null
 */
export function resolveAnchorImagePath(brandKey, anchorId) {
  const reg = loadRegistry();
  const repoRoot = join(__dirname, '..', '..', '..', '..');
  const brandEntry = reg.brands?.[brandKey];
  if (!brandEntry) return null;
  const anchor = brandEntry.anchors?.find((a) => a.id === anchorId);
  if (!anchor) return null;
  return join(repoRoot, anchor.imagePath);
}

/**
 * List all known brand keys.
 * @returns array of brand keys
 */
export function listBrandKeys() {
  const reg = loadRegistry();
  return Object.keys(reg.brands ?? {});
}

/**
 * Phase 8C Runtime Integration: automatic anchor selection.
 * 根据 DNA 字段自动选 anchor, 不需要调用方手动指定.
 *
 * Input criteria (all optional):
 *   - industry: string (e.g. 'medical_aesthetics', 'restaurant')
 *   - sceneType: string (e.g. 'reception', 'consultation', 'exterior')
 *   - commercialContext: string (e.g. 'street_store', 'mall_store', 'flagship')
 *   - operationalRealism: 'low' | 'medium' | 'high' — higher means we want anchors with higher function strength
 *   - requireFunctionStrength: number [0, 1] — minimum function strength threshold
 *
 * Output: array of { anchor, score, breakdown } sorted by score desc, capped at maxCount.
 *         score is in [0, 1] where 1 = perfect match.
 *
 * 如果 brandKey 没有 anchors, 返回 [].
 * 如果 criteria 不匹配任何 anchor (所有 score = 0), 返回空数组 (graceful degradation).
 *
 * Phase 8C §4 关键约束: 不依赖手动 anchor 选择. Runtime 根据 dna.project.category / dna.sceneDefinition 自动选.
 *
 * @param brandKey   e.g. 'jiuzhou-aesthetics'
 * @param criteria   { industry, sceneType, commercialContext, operationalRealism, requireFunctionStrength }
 * @param maxCount   max number of anchors to return; default 3
 * @returns array of { anchor, score, breakdown } sorted by score desc
 */
export function selectAnchors(brandKey, criteria = {}, maxCount) {
  if (!brandKey || typeof brandKey !== 'string') {
    throw new TypeError('selectAnchors: brandKey must be a non-empty string');
  }
  const reg = loadRegistry();
  const cap = maxCount ?? reg.selectionPolicy?.defaultMaxCount ?? reg.inContextPolicy?.maxReferencesPerPrompt ?? 3;
  const weights = reg.selectionPolicy?.scoringWeights ?? {
    industryMatch: 0.35,
    sceneTypeMatch: 0.30,
    commercialContextMatch: 0.15,
    functionalAlignment: 0.10,
    weight: 0.10,
  };

  const anchors = loadArchitectureAnchors(brandKey);
  if (anchors.length === 0) return [];

  const scored = [];
  for (const anchor of anchors) {
    const breakdown = scoreAnchor(anchor, criteria, weights);
    // Phase 8C §4: score > 0 要求 industry / sceneType / commercialContext 至少一个匹配.
    // (weight 维度单独贡献不能成为 score > 0 的理由, 否则不相关 anchor 也会进 list.)
    const hasAnyMatch = breakdown.industry > 0 || breakdown.sceneType > 0 || breakdown.commercialContext > 0;
    const score = breakdown.total;
    // 应用 requireFunctionStrength 阈值
    const minFunction = criteria.requireFunctionStrength ?? 0;
    if (anchor.strength?.function != null && anchor.strength.function < minFunction) {
      continue;
    }
    if (hasAnyMatch) {
      scored.push({ anchor, score, breakdown });
    }
  }

  // 排序按 score desc
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, cap);
}

/**
 * Score a single anchor against criteria. Returns a breakdown object.
 * @param anchor    anchor entry from registry
 * @param criteria  selection criteria
 * @param weights   scoring weights
 * @returns { industry, sceneType, commercialContext, functionalAlignment, weight, total }
 */
function scoreAnchor(anchor, criteria, weights) {
  const appl = anchor.applicability ?? {};
  // 1. industry match: 1 if criteria.industry is in anchor.applicability.industries
  const industryScore = criteria.industry && Array.isArray(appl.industries) && appl.industries.includes(criteria.industry)
    ? 1.0
    : 0.0;
  // 2. sceneType match
  const sceneScore = criteria.sceneType && Array.isArray(appl.sceneTypes) && appl.sceneTypes.includes(criteria.sceneType)
    ? 1.0
    : 0.0;
  // 3. commercialContext match
  const ctxScore = criteria.commercialContext && Array.isArray(appl.commercialContexts) && appl.commercialContexts.includes(criteria.commercialContext)
    ? 1.0
    : 0.0;
  // 4. functionalAlignment: anchor.strength.function vs required (high realism -> high function strength needed)
  let funcScore = 0;
  if (anchor.strength?.function != null) {
    const required = criteria.operationalRealism === 'high' ? 0.85
      : criteria.operationalRealism === 'medium' ? 0.70
        : 0.0;
    funcScore = anchor.strength.function >= required ? 1.0 : anchor.strength.function;
  }
  // 5. weight contribution (anchor's own registry weight)
  const weightScore = anchor.weight ?? 1.0;

  const total = industryScore * weights.industryMatch
    + sceneScore * weights.sceneTypeMatch
    + ctxScore * weights.commercialContextMatch
    + funcScore * weights.functionalAlignment
    + weightScore * weights.weight;

  return {
    industry: industryScore,
    sceneType: sceneScore,
    commercialContext: ctxScore,
    functionalAlignment: funcScore,
    weight: weightScore,
    total,
  };
}
