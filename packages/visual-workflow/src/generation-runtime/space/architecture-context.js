import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
const __dirname = dirname(fileURLToPath(import.meta.url));
const ANCHOR_ASSET_ROOT = resolve(__dirname, "..", "..", "assets", "architecture-anchors");
const REGISTRY_PATH = join(ANCHOR_ASSET_ROOT, "registry.json");
let registryCache = null;
const INDUSTRY_NORMALIZATIONS = [
  [/medical[\s_-]?aesthetics?|医疗美容|医美/iu, "medical_aesthetics"],
  [/restaurant|餐饮|餐厅/iu, "restaurant"],
  [/beauty[\s_-]?salon|美容(?:院|会所)?/iu, "beauty_salon"],
  [/tea[\s_-]?space|茶空间/iu, "tea_space"],
  [/sales[\s_-]?office|售楼处/iu, "sales_office"]
];
function normalizeAnchorIndustry(value) {
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  if (!trimmed) return void 0;
  for (const [pattern, slug] of INDUSTRY_NORMALIZATIONS) {
    if (pattern.test(trimmed)) return slug;
  }
  if (/^[a-z][a-z0-9_-]+$/u.test(trimmed)) return trimmed;
  return void 0;
}
function loadArchitectureAnchorRegistry() {
  if (registryCache) return registryCache;
  if (!existsSync(REGISTRY_PATH)) {
    throw new Error(`Architecture anchor registry not found at ${REGISTRY_PATH}`);
  }
  registryCache = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
  return registryCache;
}
function resolveArchitectureAnchorBrandKey(brandName) {
  if (typeof brandName !== "string") return null;
  const normalizedName = brandName.normalize("NFKC").trim().toLocaleLowerCase();
  if (!normalizedName) return null;
  const registry = loadArchitectureAnchorRegistry();
  for (const [brandKey, entry] of Object.entries(registry.brands ?? {})) {
    const displayName = typeof entry?.brandDisplayName === "string" ? entry.brandDisplayName.normalize("NFKC").trim().toLocaleLowerCase() : "";
    if (displayName === normalizedName) return brandKey;
  }
  return null;
}
function __setArchitectureAnchorRegistryForTest(registry) {
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
  const industryScore = criteria.industry && Array.isArray(appl.industries) && appl.industries.includes(criteria.industry) ? 1 : 0;
  const sceneScore = criteria.sceneType && Array.isArray(appl.sceneTypes) && appl.sceneTypes.includes(criteria.sceneType) ? 1 : 0;
  const ctxScore = criteria.commercialContext && Array.isArray(appl.commercialContexts) && appl.commercialContexts.includes(criteria.commercialContext) ? 1 : 0;
  let funcScore = 0;
  if (anchor.strength?.function != null) {
    const required = criteria.operationalRealism === "high" ? 0.85 : criteria.operationalRealism === "medium" ? 0.7 : 0;
    funcScore = anchor.strength.function >= required ? 1 : anchor.strength.function;
  }
  const weightScore = anchor.weight ?? 1;
  const total = industryScore * weights.industryMatch + sceneScore * weights.sceneTypeMatch + ctxScore * weights.commercialContextMatch + funcScore * weights.functionalAlignment + weightScore * weights.weight;
  return {
    industry: industryScore,
    sceneType: sceneScore,
    commercialContext: ctxScore,
    functionalAlignment: funcScore,
    weight: weightScore,
    total
  };
}
function selectArchitectureAnchors(brandKey, criteria = {}, maxCount) {
  if (!brandKey || typeof brandKey !== "string") {
    throw new TypeError("selectArchitectureAnchors: brandKey must be a non-empty string");
  }
  const reg = loadArchitectureAnchorRegistry();
  const cap = maxCount ?? reg.selectionPolicy?.defaultMaxCount ?? reg.inContextPolicy?.maxReferencesPerPrompt ?? 3;
  const weights = reg.selectionPolicy?.scoringWeights ?? {
    industryMatch: 0.35,
    sceneTypeMatch: 0.3,
    commercialContextMatch: 0.15,
    functionalAlignment: 0.1,
    weight: 0.1
  };
  const anchors = listAnchors(brandKey);
  if (anchors.length === 0) return [];
  const scored = [];
  for (const anchor of anchors) {
    const applicability = anchor.applicability ?? {};
    // Optional examples must match the requested scene, not merely industry.
    if (!criteria.sceneType || !applicability.sceneTypes?.includes(criteria.sceneType)) continue;
    if (criteria.selectedAnchorIds && !criteria.selectedAnchorIds.includes(anchor.id)) continue;
    const evidence = (criteria.mechanismEvidence ?? []).join(" ");
    const mechanism = [anchor.primaryMechanism, anchor.secondaryMechanism].filter(Boolean).join(" ");
    const features = [/curv|曲线|弧形|曲面/iu, /layer|层叠|多层/iu, /translucen|transparent|半透明|透光/iu, /membrane|膜/iu, /radial|radiat|放射/iu, /wood|木/iu, /metal|金属/iu];
    if (!evidence.trim() || features.some(pattern => pattern.test(mechanism) && !pattern.test(evidence))) continue;
    const breakdown = scoreAnchor(anchor, criteria, weights);
    let hasAnyMatch = breakdown.industry > 0 || breakdown.sceneType > 0 || breakdown.commercialContext > 0;
    let score = breakdown.total;
    if (criteria.industry != null) {
      const appl = anchor.applicability ?? {};
      const industryMatch = Array.isArray(appl.industries) && appl.industries.includes(criteria.industry);
      if (!industryMatch) {
        hasAnyMatch = false;
        score = 0;
      }
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
function resolveArchitectureAnchorImagePath(anchor) {
  if (!anchor || !anchor.imagePath) return null;
  return resolve(ANCHOR_ASSET_ROOT, anchor.imagePath);
}
function renderArchitectureContextBlock(anchors) {
  if (!Array.isArray(anchors) || anchors.length === 0) return "";
  const lines = [
    "# Architecture Context (in-context reference)",
    "",
    "> Optional architecture examples considered through an explicit request; these are not project facts or approved design decisions.",
    "> User-confirmed intent, source evidence, artistic hierarchy and operational requirements take priority.",
    ""
  ];
  anchors.forEach((a, i) => {
    lines.push(`## Anchor ${i + 1}: ${a.id} (role=${a.role})`);
    lines.push("");
    if (a.primaryMechanism) lines.push(`- **Primary Mechanism**: ${a.primaryMechanism}`);
    if (a.secondaryMechanism) lines.push(`- **Secondary Mechanism**: ${a.secondaryMechanism}`);
    lines.push("");
  });
  lines.push("## Usage in this prompt");
  lines.push("");
  lines.push("Use a compatible example only as subordinate support. Discard conflicting example details; never override project intent or color scope.");
  lines.push("Do not reproduce literal concrete objects (specific ceiling curves, glass grids, membrane shapes).");
  return lines.join("\n");
}
const ARCHITECTURE_CONTEXT_VERSION = "1.0.0";
export {
  ARCHITECTURE_CONTEXT_VERSION,
  __setArchitectureAnchorRegistryForTest,
  loadArchitectureAnchorRegistry,
  normalizeAnchorIndustry,
  renderArchitectureContextBlock,
  resolveArchitectureAnchorBrandKey,
  resolveArchitectureAnchorImagePath,
  selectArchitectureAnchors
};
