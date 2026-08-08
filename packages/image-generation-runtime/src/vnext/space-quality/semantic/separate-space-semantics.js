// Separate-space-semantics
//
// Compiler-time semantic separation (R8.5.1 §6, §9, §10). Given a raw phrase
// plus its source-field provenance, deterministically classify it into one of:
//
//   architectural   — describes geometry/boundary/circulation/enclosure/
//                     transition/scale/function/spatial behavior; may drive
//                     the Architecture IR.
//   brand_motif     — names a literal symbolic/decorative/animal/floral/graphic
//                     form; must route to Brand Translation, never generate an
//                     architecture action.
//   ambiguous       — carries BOTH a motif literal and spatial properties; must
//                     be normalized (strip motif, preserve spatial relation).
//   color_accent    — color applied as a controlled accent/finish; allowed in
//                     Lighting/Brand Color, not a geometry generator.
//   color_geometry  — COUPLING RISK: a color term is the form generator. Stripped
//                     from Architecture IR; the spatial path (if any) is kept.
//   functional      — operational/program content (routes to function bridge);
//                     not an architecture mechanism by itself.
//   decorative_identity — literal in-scene identity/decor (logo, slogan text,
//                     mascot); never generated in-scene (post-composite/guard).
//
// This is a Generation-Runtime IR only. It does NOT change the V5 packet,
// ProjectGenerationContract, or any upstream schema, and it calls no LLM.

import {
  BRAND_MOTIF_TERMS,
  METAPHOR_MARKERS,
  COLOR_TERMS,
  GEOMETRY_ACTION_TERMS,
  ARCHITECTURE_TERMS,
  SPATIAL_PROPERTY_TERMS,
  COLOR_AS_ACCENT_MARKERS,
} from './lexicons.js';

export const SEMANTIC_CLASS = Object.freeze({
  ARCHITECTURAL: 'architectural',
  BRAND_MOTIF: 'brand_motif',
  AMBIGUOUS: 'ambiguous',
  COLOR_ACCENT: 'color_accent',
  COLOR_GEOMETRY: 'color_geometry',
  FUNCTIONAL: 'functional',
  DECORATIVE_IDENTITY: 'decorative_identity',
});

// Lowercase, collapse whitespace. CJK stays as-is; substring matching handles
// it without word boundaries.
function norm(s) {
  return String(s || '').toLowerCase().replace(/\s+/gu, ' ').trim();
}

function countHits(text, terms) {
  let n = 0;
  for (const t of terms) if (text.includes(norm(t))) n += 1;
  return n;
}

function hasAny(text, terms) {
  return countHits(text, terms) > 0;
}

// For terms that are short and likely to be substrings of unrelated words
// ("red" inside "layered", "blue" inside "subtle"), require word boundaries
// on the English side. CJK terms (no word boundary) keep substring match.
function hasTermAsWord(text, term) {
  if (!term) return false;
  // CJK characters (no word boundary in CJK): substring match.
  if (/[一-鿿]/u.test(term)) return text.includes(term);
  // English: word-boundary match (case-insensitive). Falls back to substring
  // only when the term is multi-word and contains no word char break.
  try {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'iu');
    return re.test(text);
  } catch {
    return text.includes(term);
  }
}

function countHitsAsWord(text, terms) {
  let n = 0;
  for (const t of terms) if (hasTermAsWord(text, t)) n += 1;
  return n;
}

// Source fields that are, by provenance, primarily about brand/decor rather
// than building form. Phrases from these fields start with a brand-leaning
// prior (field provenance is a signal, per recovery doc §10).
const BRAND_PROVENANCE_FIELDS = new Set([
  'brandIntegration',
  'brandRoleManifestation',
  'mustBeVisible',
  'positiveDifferentiators',
  'colorSystem',
]);

const FUNCTIONAL_PROVENANCE_FIELDS = new Set([
  'sceneProgram',
  'functionalNetwork',
  'functionalRelationships',
  'peopleBehavior',
]);

/**
 * Classify one raw phrase.
 * @param {string} rawPhrase
 * @param {string} [sourceField]  V5 field path this phrase came from.
 * @returns {{classification:string, motifHits:string[], colorHits:string[],
 *            archHits:number, propertyHits:number, metaphor:boolean,
 *            accent:boolean, geometryAction:boolean}}
 */
export function classifyPhrase(rawPhrase, sourceField = '') {
  const text = norm(rawPhrase);
  const field = String(sourceField || '');

  const motifHits = [...BRAND_MOTIF_TERMS].filter((t) => hasTermAsWord(text, t));
  const colorHits = [...COLOR_TERMS].filter((t) => hasTermAsWord(text, t));
  const archHits = countHits(text, ARCHITECTURE_TERMS);
  const propertyHits = countHits(text, SPATIAL_PROPERTY_TERMS);
  const metaphor = hasAny(text, METAPHOR_MARKERS);
  const accent = hasAny(text, COLOR_AS_ACCENT_MARKERS);
  const geometryAction = hasAny(text, GEOMETRY_ACTION_TERMS);

  const hasMotif = motifHits.length > 0;
  const hasColor = colorHits.length > 0;
  const hasArch = archHits > 0 || propertyHits > 0;
  const brandProvenance = BRAND_PROVENANCE_FIELDS.has(field);
  const functionalProvenance = FUNCTIONAL_PROVENANCE_FIELDS.has(field);

  let classification;

  // 1) In-scene identity (logo / wordmark / slogan text / mascot) — never
  //    generated in-scene (post-composite route).
  const identityRe = /logo|wordmark|logotype|slogan|mascot|emblem|发光字|标识|标志|徽章|吉祥物|slogan艺术字|艺术字/u;
  // "X logo" / "发光Logo" even when split by Chinese adjective.
  const hasIdentity = identityRe.test(text)
    || (hasMotif && /logo|标识|标志|发光字/u.test(text))
    || /\blogo\b/u.test(text);
  if (hasIdentity) {
    classification = SEMANTIC_CLASS.DECORATIVE_IDENTITY;
  }
  // 2) Color as the form generator → coupling risk.
  else if (hasColor && geometryAction && !accent) {
    classification = SEMANTIC_CLASS.COLOR_GEOMETRY;
  }
  // 3) Color explicitly applied as accent/finish → safe brand color.
  else if (hasColor && accent && !hasMotif) {
    classification = SEMANTIC_CLASS.COLOR_ACCENT;
  }
  // 4) Motif that ALSO carries spatial/architecture properties → ambiguous,
  //    must be normalized rather than compiled or dropped wholesale.
  else if (hasMotif && (hasArch || metaphor)) {
    classification = SEMANTIC_CLASS.AMBIGUOUS;
  }
  // 5) Pure motif / symbolic / decorative → brand translation.
  else if (hasMotif || (metaphor && brandProvenance && !hasArch)) {
    classification = SEMANTIC_CLASS.BRAND_MOTIF;
  }
  // 6) Color without geometry action and without accent marker: treat as color
  //    accent (it is descriptive color, not a building mechanism).
  else if (hasColor && !geometryAction) {
    classification = SEMANTIC_CLASS.COLOR_ACCENT;
  }
  // 7) Operational/program content from functional fields.
  else if (!hasArch && functionalProvenance) {
    classification = SEMANTIC_CLASS.FUNCTIONAL;
  }
  // 8) Genuine architectural/spatial content.
  else if (hasArch) {
    classification = SEMANTIC_CLASS.ARCHITECTURAL;
  }
  // 9) Fallback: if it came from a brand field with no spatial content, it is
  //    brand expression; otherwise functional/ambivalent content is treated as
  //    functional (program/experience) and kept out of architecture geometry.
  else {
    classification = brandProvenance
      ? SEMANTIC_CLASS.BRAND_MOTIF
      : SEMANTIC_CLASS.FUNCTIONAL;
  }

  return {
    classification,
    motifHits,
    colorHits,
    archHits,
    propertyHits,
    metaphor,
    accent,
    geometryAction,
  };
}

/**
 * Separate a list of {text, sourceField} items into semantic buckets.
 * @returns {{architectureSemantics:object[], brandMotifSemantics:object[],
 *            ambiguousSemantics:object[], colorAccentSemantics:object[],
 *            functionalSemantics:object[], decorativeIdentitySemantics:object[]}}
 */
export function separateSpaceSemantics(items) {
  const buckets = {
    architectureSemantics: [],
    brandMotifSemantics: [],
    ambiguousSemantics: [],
    colorAccentSemantics: [],
    functionalSemantics: [],
    decorativeIdentitySemantics: [],
  };
  for (const item of items) {
    const text = typeof item === 'string' ? item : item.text;
    const sourceField = typeof item === 'string' ? '' : item.sourceField;
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
      default:
        // color_geometry + decorative_identity both route out of architecture
        // into the brand/decor bucket (decorative identity) so they never
        // generate a geometry action; their spatial residue is recovered by the
        // normalizer and appended to architectureSemantics there.
        buckets.decorativeIdentitySemantics.push(record);
        break;
    }
  }
  return buckets;
}
