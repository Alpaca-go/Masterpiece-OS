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
  let classification;
  const identityRe = /logo|wordmark|logotype|slogan|mascot|emblem|发光字|标识|标志|徽章|吉祥物|slogan艺术字|艺术字/iu;
  const hasIdentity = identityRe.test(text) || hasMotif && /logo|标识|标志|发光字/iu.test(text) || /\blogo\b/u.test(text);
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
  } else if (!hasArch && functionalProvenance) {
    classification = SEMANTIC_CLASS.FUNCTIONAL;
  } else if (hasArch) {
    classification = SEMANTIC_CLASS.ARCHITECTURAL;
  } else {
    classification = brandProvenance ? SEMANTIC_CLASS.BRAND_MOTIF : SEMANTIC_CLASS.FUNCTIONAL;
  }
  return {
    classification,
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
