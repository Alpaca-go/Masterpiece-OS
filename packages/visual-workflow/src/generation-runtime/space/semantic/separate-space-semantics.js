import {
  BRAND_MOTIF_TERMS,
  METAPHOR_MARKERS,
  COLOR_TERMS,
  GEOMETRY_ACTION_TERMS,
  ARCHITECTURE_TERMS,
  SPATIAL_PROPERTY_TERMS,
  COLOR_AS_ACCENT_MARKERS,
  DECORATIVE_OBJECT_TERMS
} from "./lexicons.js";
const SEMANTIC_CLASS = Object.freeze({
  ARCHITECTURAL: "architectural",
  BRAND_MOTIF: "brand_motif",
  AMBIGUOUS: "ambiguous",
  COLOR_ACCENT: "color_accent",
  COLOR_GEOMETRY: "color_geometry",
  FUNCTIONAL: "functional",
  DECORATIVE_IDENTITY: "decorative_identity",
  // R10.4.1: a decorative / artistic centerpiece or feature object. Allowed in
  // Brand Translation / optional styling as a subordinate element; NEVER as a
  // functional / operational / architectural hard requirement.
  DECORATIVE_OBJECT: "decorative_object"
});
function norm(s) {
  return String(s || "").toLowerCase().replace(/\s+/gu, " ").trim();
}
function countHits(text, terms) {
  let n = 0;
  for (const t of terms) if (text.includes(norm(t))) n += 1;
  return n;
}
function hasAny(text, terms) {
  return countHits(text, terms) > 0;
}
function hasTermAsWord(text, term) {
  if (!term) return false;
  if (/[一-鿿]/u.test(term)) return text.includes(term);
  try {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "iu");
    return re.test(text);
  } catch {
    return text.includes(term);
  }
}
const BRAND_PROVENANCE_FIELDS = /* @__PURE__ */ new Set([
  "brandIntegration",
  "brandRoleManifestation",
  "mustBeVisible",
  "positiveDifferentiators",
  "colorSystem"
]);
const FUNCTIONAL_PROVENANCE_FIELDS = /* @__PURE__ */ new Set([
  "sceneProgram",
  "functionalNetwork",
  "functionalRelationships",
  "peopleBehavior"
]);
// A mixed visibility field needs positive evidence, not a brand/functional
// fallback. Recognize actor + concrete activity or physical effect + carrier
// relationships across service industries. These rules never infer a scene.
function visibleOperationEvidence(text) {
  if (/\b(?:maybe|might|could|wish|dream|symbolic|metaphor|imaginary)\b|也许|可能|希望|象征|意境|灵魂/iu.test(text)) return null;
  const actor = /^(?:(?:a|an|the|visible)\s+)?(?:staff|employees?|workers?|operators?|customers?|guests?|visitors?|clerks?|chefs?|receptionists?|attendants?|technicians?|servers?)\s+(?:(?:is|are)\s+)?(?:preparing|cooking|serving|dining|eating|browsing|selecting|paying|checking\s+in|greeting|guiding|assisting|handing|packing|carrying|cleaning|consulting)\b\s+\S/iu;
  const actorCjk = /^(?:可见的?)?(?:厨师|店员|员工|服务员|顾客|客人|旅客|访客|接待员|工作人员|客户|技师).{0,16}(?:备餐|烹饪|制作|用餐|就餐|点餐|选购|挑选|结账|办理入住|迎接|引导|接待|协助|递交|打包|搬运|清洁|咨询)/u;
  if (actor.test(text) || actorCjk.test(text)) return "visible_actor_activity";
  const effect = /^(?:visible\s+|hot\s+)?(?:steam|mist|foam|water|condensation|spray|bubbles)\s+(?:(?:rising|flowing|forming|emerging)\s+)?(?:above|over|from|on|into|in)\s+(?:(?:the|a|an)\s+)?(?:dishes|food|cups?|bowls?|trays?|products?|basins?|sinks?|glass|surfaces?|drinks?)\b/iu;
  const effectCjk = /(?:菜品|食物|餐盘|杯|碗|托盘|商品|水槽|水池|玻璃|表面|饮品)(?:上方|上|中|内|表面).{0,6}(?:蒸汽|热气|水流|水汽|泡沫|水雾|气泡)|^(?:蒸汽|热气|水流|水汽|泡沫|水雾|气泡)(?:从|在|于).{0,12}(?:菜品|食物|餐盘|杯|碗|水槽|水池|玻璃|表面|饮品)/u;
  return effect.test(text) || effectCjk.test(text) ? "visible_effect_carrier_relation" : null;
}
function classifyPhrase(rawPhrase, sourceField = "") {
  const text = norm(rawPhrase);
  const field = String(sourceField || "");
  const motifHits = [...BRAND_MOTIF_TERMS].filter((t) => hasTermAsWord(text, t));
  const colorHits = [...COLOR_TERMS].filter((t) => hasTermAsWord(text, t));
  const archHits = countHits(text, ARCHITECTURE_TERMS);
  const propertyHits = countHits(text, SPATIAL_PROPERTY_TERMS);
  const metaphor = hasAny(text, METAPHOR_MARKERS);
  const accent = hasAny(text, COLOR_AS_ACCENT_MARKERS);
  const geometryAction = hasAny(text, GEOMETRY_ACTION_TERMS);
  const decorativeObjectHits = [...DECORATIVE_OBJECT_TERMS].filter((t) => hasTermAsWord(text, t));
  const hasMotif = motifHits.length > 0;
  const hasColor = colorHits.length > 0;
  const hasArch = archHits > 0 || propertyHits > 0 || isExplicitLayoutPhrase(rawPhrase, field);
  const hasDecorativeObject = decorativeObjectHits.length > 0;
  const brandProvenance = BRAND_PROVENANCE_FIELDS.has(field);
  const functionalProvenance = FUNCTIONAL_PROVENANCE_FIELDS.has(field);
  const visibleEvidence = field === 'mustBeVisible' ? visibleOperationEvidence(text) : null;
  let classification;
  const identityRe = /logo|wordmark|logotype|slogan|mascot|emblem|发光字|标识|标志|徽章|吉祥物|slogan艺术字|艺术字/iu;
  const hasIdentity = identityRe.test(text) || hasMotif && /logo|标识|标志|发光字/iu.test(text) || /\blogo\b/u.test(text)
    || field === 'mustBeVisible' && /signage\s+text|illuminated\s+letters|文字招牌|标语/iu.test(text);
  if (hasIdentity) {
    classification = SEMANTIC_CLASS.DECORATIVE_IDENTITY;
  } else if (hasDecorativeObject && functionalProvenance) {
    classification = SEMANTIC_CLASS.DECORATIVE_OBJECT;
  } else if (hasDecorativeObject) {
    classification = SEMANTIC_CLASS.DECORATIVE_OBJECT;
  } else if (hasColor && geometryAction && !accent) {
    classification = SEMANTIC_CLASS.COLOR_GEOMETRY;
  } else if (hasColor && accent && !hasMotif) {
    classification = SEMANTIC_CLASS.COLOR_ACCENT;
  } else if (hasMotif && (hasArch || metaphor)) {
    classification = SEMANTIC_CLASS.AMBIGUOUS;
  } else if (hasMotif || metaphor && brandProvenance && !hasArch) {
    classification = SEMANTIC_CLASS.BRAND_MOTIF;
  } else if (hasColor && !geometryAction) {
    classification = SEMANTIC_CLASS.COLOR_ACCENT;
  } else if (field === 'mustBeVisible' && /\b(?:table|worktable|worktop|chair|seat|platform|counter|shelf|shelves|aisle)\b|台面|座椅|座位|货架|通道/iu.test(text) && /\b(?:across|facing|face|side|accessible|access|separates?|around|opposing)\b|相向|对侧|两侧|朝向|通行|进出|分隔/iu.test(text)) {
    // Explicit object-use relationships retain their functional field authority.
    // Identity, motif, decoration and color checks above still take precedence.
    classification = SEMANTIC_CLASS.FUNCTIONAL;
  } else if (visibleEvidence) {
    classification = SEMANTIC_CLASS.FUNCTIONAL;
  } else if (!hasArch && functionalProvenance) {
    classification = SEMANTIC_CLASS.FUNCTIONAL;
  } else if (hasArch) {
    classification = SEMANTIC_CLASS.ARCHITECTURAL;
  } else {
    classification = field === 'mustBeVisible' ? SEMANTIC_CLASS.AMBIGUOUS : brandProvenance ? SEMANTIC_CLASS.BRAND_MOTIF : SEMANTIC_CLASS.FUNCTIONAL;
  }
  return {
    classification,
    ...field === 'mustBeVisible' ? {classificationReason: classification === SEMANTIC_CLASS.FUNCTIONAL
      ? visibleEvidence || 'explicit_object_use_relation'
      : classification === SEMANTIC_CLASS.AMBIGUOUS && !hasMotif && !metaphor ? 'unresolved_visible_requirement' : `existing_${classification}_rule`} : {},
    motifHits,
    colorHits,
    archHits,
    propertyHits,
    metaphor,
    accent,
    geometryAction
  };
}
// Only a complete layout statement in the dedicated structural field grants
// spatial meaning. Marketing, menu, risk and brand prose cannot use this path.
function isExplicitLayoutPhrase(text, sourceField) {
  return sourceField === 'structureLanguage' && /^(?:开放式(?:空间|布局|厨房|明档)?|明档(?:厨房|操作区)?|open[- ]plan(?: layout)?|open kitchen)[。.!！]?$/iu.test(String(text || '').trim());
}
function separateSpaceSemantics(items) {
  const buckets = {
    architectureSemantics: [],
    brandMotifSemantics: [],
    ambiguousSemantics: [],
    colorAccentSemantics: [],
    functionalSemantics: [],
    decorativeIdentitySemantics: []
  };
  for (const item of items) {
    const text = typeof item === "string" ? item : item.text;
    const sourceField = typeof item === "string" ? "" : item.sourceField;
    if (!text || !String(text).trim()) continue;
    const analysis = classifyPhrase(text, sourceField);
    const record = { text: String(text).trim(), sourceField, analysis };
    switch (analysis.classification) {
      case SEMANTIC_CLASS.ARCHITECTURAL:
        buckets.architectureSemantics.push(record);
        break;
      case SEMANTIC_CLASS.BRAND_MOTIF:
        buckets.brandMotifSemantics.push(record);
        break;
      case SEMANTIC_CLASS.AMBIGUOUS:
        buckets.ambiguousSemantics.push(record);
        break;
      case SEMANTIC_CLASS.COLOR_ACCENT:
        buckets.colorAccentSemantics.push(record);
        break;
      case SEMANTIC_CLASS.FUNCTIONAL:
        buckets.functionalSemantics.push(record);
        break;
      case SEMANTIC_CLASS.DECORATIVE_IDENTITY:
      case SEMANTIC_CLASS.COLOR_GEOMETRY:
      case SEMANTIC_CLASS.DECORATIVE_OBJECT:
      default:
        buckets.decorativeIdentitySemantics.push(record);
        break;
    }
  }
  return buckets;
}
export {
  isExplicitLayoutPhrase,
  SEMANTIC_CLASS,
  classifyPhrase,
  separateSpaceSemantics
};
