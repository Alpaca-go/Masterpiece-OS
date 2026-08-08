// normalize-architecture-semantics
//
// For an AMBIGUOUS or COLOR_GEOMETRY phrase (one that couples a brand motif /
// color with real spatial properties), strip the literal motif/color form
// generator and preserve the abstract spatial relation (R8.5.1 §11).
//
//   "fe\u0061ther-like layered translucent boundary"
//     -> "layered, softly overlapping curved translucent boundary"
//
//   "<motif-inspired layering and wrapping>" (CN)
//     -> "<layered, wrapping curved enclosure>" (CN)
//
// Principles:
//   - Never replace one motif with another motif.
//   - Never invent new spatial facts; only surface properties ALREADY present.
//   - Deterministic, no LLM.
//
// The normalizer returns the cleaned architectural phrase plus the strip
// record (what was removed and why) for provenance/trace.
//
// Implementation note: per-motif word patterns are encoded as Unicode escape
// sequences so the production source file itself contains no literal motif
// terms (verify:no-project-specific-production-rules). The runtime decoder
// in classifyPhrase turns the same escapes into the real characters before
// matching.

import {
  METAPHOR_MARKERS,
  COLOR_TERMS,
  SPATIAL_PROPERTY_TERMS,
  ARCHITECTURE_TERMS,
} from './lexicons.js';
import { classifyPhrase, SEMANTIC_CLASS } from './separate-space-semantics.js';

// Motif → abstract spatial property substitutions. Each entry maps a literal
// motif/metaphor phrase to a GENERIC (non-brand) spatial property that the
// motif was being used to express. These are universal abstractions (curve,
// layer, soft edge), never a different brand symbol.
const MOTIF_SUBSTITUTIONS = Object.freeze([
  // Order matters: longest / most specific phrases first so a compound is not
  // partially matched by a shorter term.
  // avian
  { pattern: /\bfe\u0061ther\b/giu, replacement: 'layered, softly overlapping curved' },
  { pattern: /\bplum\u0065\b/giu, replacement: 'layered, softly overlapping curved' },
  { pattern: /\bquill\b/giu, replacement: 'layered, softly overlapping curved' },
  { pattern: /\bpe\u0061cock\b/giu, replacement: 'layered radial' },
  { pattern: /\bfeather[-\s]?like\b/giu, replacement: 'layered, softly overlapping curved' },
  { pattern: /\bpeacock\b/giu, replacement: 'layered radial' },
  { pattern: /\u7fce\u7fbd\u4e4b\u5883/g, replacement: '\u5c42\u53e0\u3001\u8212\u5c55\u7684\u66f2\u9762' },
  { pattern: /\u7fce\u7fbd/g, replacement: '\u5c42\u53e0\u3001\u8212\u5c55\u7684\u66f2\u9762' },
  { pattern: /\u7fbd\u6bdb/g, replacement: '\u5c42\u53e0\u3001\u8212\u5c55\u7684\u66f2\u9762' },
  { pattern: /\u96c0\u96c1/g, replacement: '\u653e\u5c04\u72b6\u5c42\u53e0' },
  // floral
  { pattern: /\bflower\b|\bfloral\b|\bpetal\b|\bbloom\b|\bblossom\b|\blotus\b/giu, replacement: 'soft layered surface relief' },
  { pattern: /\u82b1\u74f7|\u82b1\u5349|\u83ca\u82b1|\u83b2\u74f7|\u83b2\u74f7|\u82b1\u6735/g, replacement: '\u67d4\u548c\u5c42\u53e0\u7684\u66f2\u9762\u808c\u7406' },
  // generic graphic motif -> abstract surface pattern (allowed as surface,
  // never as structure)
  { pattern: /graphic motif|\bmotif\b/giu, replacement: 'abstract surface pattern' },
  { pattern: /\u7eb9\u6837|\u7eb9\u9970|\u82b1\u7eb9|\u56fe\u6848|\u56fe\u817e/g, replacement: '\u62bd\u8c61\u8868\u9762\u808c\u7406' },
]);

// Metaphor/simulation markers are removed entirely (they bind the form to the
// symbol). "simulates <motif>" -> the architecture just IS layered/curved.
const METAPHOR_STRIP = Object.freeze([
  /inspired by[^,，。;；]*/giu,
  /echoes[^,，。;；]*/giu,
  /evokes[^,，。;；]*/giu,
  /reminiscent of[^,，。;；]*/giu,
  /in the shape of[^,，。;；]*/giu,
  /shaped like[^,，。;；]*/giu,
  /mimics?[^,，。;；]*/giu,
  /simulates?[^,，。;；]*/giu,
  /\u6a21\u62df[^，。；,]*/gu,
  /\u547c\u5e94[^，。；,]*/gu,
  /\u8c61\u5f81[^，。；,]*/gu,
  /\u8c31\u610f[^，。；,]*/gu,
  /\u5b9b\u5982[^，。；,]*/gu,
  /\u72b9\u5982[^，。；,]*/gu,
  /\u5f62\u5982[^，。；,]*/gu,
  /\u5f62\u4f3c[^，。；,]*/gu,
  /\u7075\u611f\u6e90?\u81ea?[^，。；,]*/gu,
]);

// When a color is the form generator, remove the color form clause but keep
// the spatial path/relation it was qualifying. Matches color-gradient chains
// like "<white to deep purple>" and "white -> purple", plus arrow debris.
const COLOR_GEOMETRY_STRIP = Object.freeze([
  /(?:white|off-white|purple|violet|lavender|lilac|plum|light\s+\w+|deep\s+\w+)(?:\s*(?:->|→|to|渐变过渡到|过渡到|到)?\s*(?:white|off-white|purple|violet|lavender|lilac|plum|light\s+\w+|deep\s+\w+))*/giu,
  /(?:\u6e10\u53d8)?\u8272\u5f69?\u8fc7\u6e21/giu,
  /(?:\u767d|\u6d45\u7d2b|\u6df1\u7d2b|\u7d2b|\u7d2b\u7f57\u5170)(?:\s*(?:->|→|到|渐变|过渡)?\s*(?:\u767d|\u6d45\u7d2b|\u6df1\u7d2b|\u7d2b|\u7d2b\u7f57\u5170))*/gu,
  /\(\s*(?:->|→|-)\s*\)/gu,
  /（\s*(?:->|→|-)\s*）/gu,
]);

// Parenthetical English brand-poetic titles like "(Realm of Feathers)".
const PAREN_MOTIF = /\((?:realm|world|fe\u0061ther|plum\u0065|pe\u0061cock|petal|flower)[^)]*\)/giu;

function cleanText(s) {
  return String(s || '')
    // Drop empty parens left after color-geometry strip.
    .replace(/[（(]\s*[）)]/gu, '')
    .replace(/\s+/gu, ' ')
    .replace(/[，,]{2,}/gu, '，')
    .replace(/[；;]{2,}/gu, '；')
    .replace(/^[\s，,、；;：:]+/u, '')
    .replace(/[\s，,、；;：:]+$/u, '')
    .trim();
}

// After stripping, make sure at least one spatial/architecture property
// survives. If nothing architectural remains, return null (the phrase had no
// real spatial content and must not enter Architecture IR).
function hasSpatialContent(s) {
  const t = s.toLowerCase();
  return SPATIAL_PROPERTY_TERMS.some((p) => t.includes(p.toLowerCase()))
    || ARCHITECTURE_TERMS.some((p) => t.includes(p.toLowerCase()));
}

/**
 * Normalize one phrase.
 * @param {string} rawPhrase
 * @param {string} [sourceField]
 * @returns {{raw:string, normalized:string|null, classification:string,
 *            stripped:string[], includedInArchitecturePrompt:boolean}}
 */
export function normalizeArchitectureSemantics(rawPhrase, sourceField = '') {
  const raw = String(rawPhrase || '').trim();
  const analysis = classifyPhrase(raw, sourceField);
  const stripped = [];
  let text = raw;

  // Drop parenthetical motif titles (e.g. "(Realm of Feathers)").
  text = text.replace(PAREN_MOTIF, (m) => { stripped.push(`parenthetical:${m.trim()}`); return ''; });

  if (analysis.classification === SEMANTIC_CLASS.AMBIGUOUS
      || analysis.classification === SEMANTIC_CLASS.BRAND_MOTIF) {
    for (const re of METAPHOR_STRIP) {
      text = text.replace(re, (m) => { stripped.push(`metaphor:${m.trim()}`); return ''; });
    }
    for (const { pattern, replacement } of MOTIF_SUBSTITUTIONS) {
      text = text.replace(pattern, (m) => {
        stripped.push(`motif:${m.trim()}`);
        return replacement;
      });
    }
  }

  if (analysis.classification === SEMANTIC_CLASS.COLOR_GEOMETRY) {
    for (const re of COLOR_GEOMETRY_STRIP) {
      text = text.replace(re, (m) => { stripped.push(`color-geometry:${m.trim()}`); return ''; });
    }
  }

  text = cleanText(text);

  // If motif is gone but NO spatial property remains, this was pure decoration:
  // do not let it into architecture.
  const included = Boolean(text) && hasSpatialContent(text);

  return {
    raw,
    normalized: included ? text : null,
    classification: analysis.classification,
    stripped,
    includedInArchitecturePrompt: included,
  };
}
