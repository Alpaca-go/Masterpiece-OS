// Architecture Context — production port of the Phase 9B anchor selection.
//
// The experimental module lives at
// space-generator/v1-experimental/architecture-anchors/loader/load-anchors.mjs
// and loads registry.json from that experimental tree. Production code must not
// deep-import the experimental tree (workspace boundary gate), so this module:
//   1. Loads the SAME registry.json (frozen baseline) via a resolved path.
//   2. Reimplements the Phase 8C/8D selection scoring (industry/scene/context/
//      function/weight, with the Phase 8D anti-overfit industry hard-gate).
//   3. Renders the "Architecture Context" prompt block that Phase 9B Mode B
//      places before the architecture-function bridge (recovery doc §7.2).
//
// No brand is hardcoded: the brandKey is supplied by the caller (resolved from
// project data), and the registry is the single source of truth. This keeps
// verify:no-project-specific-production-rules clean.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// packages/image-generation-runtime/src/space/
//   -> ../../../../ = repo root
const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');
const REGISTRY_PATH = join(
  REPO_ROOT,
  'space-generator',
  'v1-experimental',
  'architecture-anchors',
  'registry.json',
);

let registryCache = null;

/**
 * Normalize a projectFacts.industry value into the slug vocabulary used by
 * the architecture-anchor registry (medical_aesthetics, restaurant, ...).
 * The registry is the source of truth for valid slugs; this map only
 * bridges localized labels recorded by V5 analysis. It is intentionally
 * generic and does NOT hardcode any brand or project name.
 */
const INDUSTRY_NORMALIZATIONS = [
  [/medical[\s_-]?aesthetics?|医疗美容|医美/iu, 'medical_aesthetics'],
  [/restaurant|餐饮|餐厅/iu, 'restaurant'],
  [/beauty[\s_-]?salon|美容(?:院|会所)?/iu, 'beauty_salon'],
  [/tea[\s_-]?space|茶空间/iu, 'tea_space'],
  [/sales[\s_-]?office|售楼处/iu, 'sales_office'],
];

export function normalizeAnchorIndustry(value) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  for (const [pattern, slug] of INDUSTRY_NORMALIZATIONS) {
    if (pattern.test(trimmed)) return slug;
  }
  // Already a slug-like value (lowercase, ascii, underscores/hyphens).
  if (/^[a-z][a-z0-9_-]+$/u.test(trimmed)) return trimmed;
  return undefined;
}

export function loadArchitectureAnchorRegistry() {
  if (registryCache) return registryCache;
  if (!existsSync(REGISTRY_PATH)) {
    throw new Error(`Architecture anchor registry not found at ${REGISTRY_PATH}`);
  }
  registryCache = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
  return registryCache;
}

// Test-only registry override (not exported via the package index).
export function __setArchitectureAnchorRegistryForTest(registry) {
  registryCache = registry;
}

function listAnchors(brandKey) {
  const reg = loadArchitectureAnchorRegistry();
  const entry = reg.brands?.[brandKey];
  if (!entry) return [];
  return Array.isArray(entry.anchors) ? entry.anchors : [];
}

function scoreAnchor(anchor, criteria, weights) {
  const appl = anchor.applicability ?? {};
  const industryScore = criteria.industry
    && Array.isArray(appl.industries) && appl.industries.includes(criteria.industry)
    ? 1.0 : 0.0;
  const sceneScore = criteria.sceneType
    && Array.isArray(appl.sceneTypes) && appl.sceneTypes.includes(criteria.sceneType)
    ? 1.0 : 0.0;
  const ctxScore = criteria.commercialContext
    && Array.isArray(appl.commercialContexts) && appl.commercialContexts.includes(criteria.commercialContext)
    ? 1.0 : 0.0;
  let funcScore = 0;
  if (anchor.strength?.function != null) {
    const required = criteria.operationalRealism === 'high' ? 0.85
      : criteria.operationalRealism === 'medium' ? 0.70
        : 0.0;
    funcScore = anchor.strength.function >= required ? 1.0 : anchor.strength.function;
  }
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

/**
 * Select architecture anchors for a brand using Phase 8C/8D scoring.
 * Mirrors experimental selectAnchors() including the anti-overfit hard gate.
 *
 * @param {string} brandKey
 * @param {object} criteria { industry, sceneType, commercialContext, operationalRealism, requireFunctionStrength }
 * @param {number} [maxCount]
 * @returns {Array<{ anchor: object, score: number, breakdown: object }>}
 */
export function selectArchitectureAnchors(brandKey, criteria = {}, maxCount) {
  if (!brandKey || typeof brandKey !== 'string') {
    throw new TypeError('selectArchitectureAnchors: brandKey must be a non-empty string');
  }
  const reg = loadArchitectureAnchorRegistry();
  const cap = maxCount
    ?? reg.selectionPolicy?.defaultMaxCount
    ?? reg.inContextPolicy?.maxReferencesPerPrompt
    ?? 3;
  const weights = reg.selectionPolicy?.scoringWeights ?? {
    industryMatch: 0.35,
    sceneTypeMatch: 0.30,
    commercialContextMatch: 0.15,
    functionalAlignment: 0.10,
    weight: 0.10,
  };

  const anchors = listAnchors(brandKey);
  if (anchors.length === 0) return [];

  const scored = [];
  for (const anchor of anchors) {
    const breakdown = scoreAnchor(anchor, criteria, weights);
    let hasAnyMatch = breakdown.industry > 0 || breakdown.sceneType > 0 || breakdown.commercialContext > 0;
    let score = breakdown.total;
    // Phase 8D anti-overfit: an explicit industry that the anchor doesn't cover
    // zeroes it out regardless of other matches.
    if (criteria.industry != null) {
      const appl = anchor.applicability ?? {};
      const industryMatch = Array.isArray(appl.industries) && appl.industries.includes(criteria.industry);
      if (!industryMatch) { hasAnyMatch = false; score = 0; }
    }
    const minFunction = criteria.requireFunctionStrength ?? 0;
    if (anchor.strength?.function != null && anchor.strength.function < minFunction) {
      continue;
    }
    if (hasAnyMatch) scored.push({ anchor, score, breakdown });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, cap);
}

/**
 * Resolve the absolute on-disk path of an anchor's reference image, or null
 * when the anchor is concept-only (imagePath null — FTT/YJLF at baseline).
 */
export function resolveArchitectureAnchorImagePath(anchor) {
  if (!anchor || !anchor.imagePath) return null;
  // Registry imagePath values are relative to space-generator/
  // (e.g. "v1-experimental/architecture-anchors/.../JZMX-ARCH-01.png").
  return resolve(REPO_ROOT, 'space-generator', anchor.imagePath);
}

/**
 * Render the Architecture Context prompt block (Phase 8A format, reproduced
 * from experimental anchor-aware compiler). Returns '' when no anchors.
 */
export function renderArchitectureContextBlock(anchors) {
  if (!Array.isArray(anchors) || anchors.length === 0) return '';
  const lines = [
    '# Architecture Context (in-context reference, Phase 8A / Phase 9B)',
    '',
    '> Building-mechanism prior: the following are architecture-language samples accepted for this brand.',
    '> Use them as a mechanism PRIOR, not as a literal object to copy.',
    '',
  ];
  anchors.forEach((a, i) => {
    lines.push(`## Anchor ${i + 1}: ${a.id} (role=${a.role})`);
    lines.push('');
    if (a.primaryMechanism) lines.push(`- **Primary Mechanism**: ${a.primaryMechanism}`);
    if (a.secondaryMechanism) lines.push(`- **Secondary Mechanism**: ${a.secondaryMechanism}`);
    lines.push('');
  });
  lines.push('## Usage in this prompt');
  lines.push('');
  lines.push('Treat the anchor mechanisms as a prior, placed before the architectural concept.');
  lines.push('The spatial concept must be consistent with these mechanisms, never conflicting.');
  lines.push('Do not reproduce literal concrete objects (specific ceiling curves, glass grids, membrane shapes).');
  return lines.join('\n');
}

export const ARCHITECTURE_CONTEXT_VERSION = '1.0.0';
