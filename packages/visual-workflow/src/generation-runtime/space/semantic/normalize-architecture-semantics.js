import {
  SPATIAL_PROPERTY_TERMS,
  ARCHITECTURE_TERMS
} from "./lexicons.js";
import { classifyPhrase, SEMANTIC_CLASS } from "./separate-space-semantics.js";
const MOTIF_SUBSTITUTIONS = Object.freeze([
  // Order matters: longest / most specific phrases first so a compound is not
  // partially matched by a shorter term.
  // avian
  { pattern: /\bfe\u0061ther\b/giu, replacement: "layered, softly overlapping curved" },
  { pattern: /\bplum\u0065\b/giu, replacement: "layered, softly overlapping curved" },
  { pattern: /\bquill\b/giu, replacement: "layered, softly overlapping curved" },
  { pattern: /\bpe\u0061cock\b/giu, replacement: "layered radial" },
  { pattern: /\bfeather[-\s]?like\b/giu, replacement: "layered, softly overlapping curved" },
  { pattern: /\bpeacock\b/giu, replacement: "layered radial" },
  { pattern: /\u7fce\u7fbd\u4e4b\u5883/g, replacement: "\u5C42\u53E0\u3001\u8212\u5C55\u7684\u66F2\u9762" },
  { pattern: /\u7fce\u7fbd/g, replacement: "\u5C42\u53E0\u3001\u8212\u5C55\u7684\u66F2\u9762" },
  { pattern: /\u7fbd\u6bdb/g, replacement: "\u5C42\u53E0\u3001\u8212\u5C55\u7684\u66F2\u9762" },
  { pattern: /\u5b54\u96c0/g, replacement: "\u653E\u5C04\u72B6\u5C42\u53E0" },
  // floral
  { pattern: /\bflower\b|\bfloral\b|\bpetal\b|\bbloom\b|\bblossom\b|\blotus\b/giu, replacement: "soft layered surface relief" },
  { pattern: /\u82b1\u74e3|\u82b1\u5349|\u83ca\u82b1|\u83b2\u82b1|\u82b1\u6735/g, replacement: "\u67D4\u548C\u5C42\u53E0\u7684\u66F2\u9762\u808C\u7406" },
  // generic graphic motif -> abstract surface pattern (allowed as surface,
  // never as structure)
  { pattern: /graphic motif|\bmotif\b/giu, replacement: "abstract surface pattern" },
  { pattern: /\u7eb9\u6837|\u7eb9\u9970|\u82b1\u7eb9|\u56fe\u6848|\u56fe\u817e/g, replacement: "\u62BD\u8C61\u8868\u9762\u808C\u7406" }
]);
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
  /\u7075\u611f\u6e90?\u81ea?[^，。；,]*/gu
]);
const COLOR_GEOMETRY_STRIP = Object.freeze([
  /(?:white|off-white|purple|violet|lavender|lilac|plum|light\s+\w+|deep\s+\w+)(?:\s*(?:->|→|to|渐变过渡到|过渡到|到)?\s*(?:white|off-white|purple|violet|lavender|lilac|plum|light\s+\w+|deep\s+\w+))*/giu,
  /(?:\u6e10\u53d8)?\u8272\u5f69?\u8fc7\u6e21/giu,
  /(?:\u767d|\u6d45\u7d2b|\u6df1\u7d2b|\u7d2b|\u7d2b\u7f57\u5170)(?:\s*(?:->|→|到|渐变|过渡)?\s*(?:\u767d|\u6d45\u7d2b|\u6df1\u7d2b|\u7d2b|\u7d2b\u7f57\u5170))*/gu,
  /\(\s*(?:->|→|-)\s*\)/gu,
  /（\s*(?:->|→|-)\s*）/gu
]);
const PAREN_MOTIF = /\((?:realm|world|fe\u0061ther|plum\u0065|pe\u0061cock|petal|flower)[^)]*\)/giu;
function cleanText(s) {
  return String(s || "").replace(/[（(]\s*[）)]/gu, "").replace(/\s+/gu, " ").replace(/[，,]{2,}/gu, "\uFF0C").replace(/[；;]{2,}/gu, "\uFF1B").replace(/^[\s，,、；;：:]+/u, "").replace(/[\s，,、；;：:]+$/u, "").trim();
}
function hasSpatialContent(s) {
  const t = s.toLowerCase();
  return SPATIAL_PROPERTY_TERMS.some((p) => t.includes(p.toLowerCase())) || ARCHITECTURE_TERMS.some((p) => t.includes(p.toLowerCase()));
}
function normalizeArchitectureSemantics(rawPhrase, sourceField = "") {
  const raw = String(rawPhrase || "").trim();
  const analysis = classifyPhrase(raw, sourceField);
  const stripped = [];
  let text = raw;
  text = text.replace(PAREN_MOTIF, (m) => {
    stripped.push(`parenthetical:${m.trim()}`);
    return "";
  });
  if (analysis.classification === SEMANTIC_CLASS.AMBIGUOUS || analysis.classification === SEMANTIC_CLASS.BRAND_MOTIF || analysis.motifHits.length > 0) {
    for (const re of METAPHOR_STRIP) {
      text = text.replace(re, (m) => {
        stripped.push(`metaphor:${m.trim()}`);
        return "";
      });
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
      text = text.replace(re, (m) => {
        stripped.push(`color-geometry:${m.trim()}`);
        return "";
      });
    }
  }
  text = cleanText(text);
  const included = analysis.classification !== SEMANTIC_CLASS.BRAND_MOTIF && Boolean(text) && hasSpatialContent(text);
  return {
    raw,
    normalized: included ? text : null,
    classification: analysis.classification,
    stripped,
    includedInArchitecturePrompt: included
  };
}
export {
  normalizeArchitectureSemantics
};
