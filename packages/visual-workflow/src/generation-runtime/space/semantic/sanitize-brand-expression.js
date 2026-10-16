import {
  BRAND_MOTIF_TERMS,
  ARCHITECTURE_TERMS
} from "./lexicons.js";
import { classifyPhrase, SEMANTIC_CLASS } from "./separate-space-semantics.js";
import { normalizeArchitectureSemantics } from "./normalize-architecture-semantics.js";
const IDENTITY_RE = /logo|wordmark|logotype|slogan|mascot|emblem|monogram|\bicon\b|signage\s+text|illuminated\s+letters|发光字|导视|标识|标志|徽章|吉祥物|艺术字|slogan墙|墙面文字/iu;
const PROSE_MAX_CHARS = 60;
const PEOPLE_OPS_RE = /员工制服|工服|制服|服务流程|话术|礼仪|工作人员|员工/iu;
const DECOR_OBJECT_RE = /丝带|飘带|绸带|挂饰|摆件|装饰挂件|ribbon|hanging\s+ornament/iu;
const GALLERY_POETRY_RE = /空间作为艺术画廊|艺术画廊般|as\s+an?\s+art\s+gallery|gallery-like/iu;
function hasTerm(text, terms) {
  const t = String(text || "").toLowerCase();
  return terms.some((term) => {
    if (/[一-鿿]/u.test(term)) return t.includes(term.toLowerCase());
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    try {
      return new RegExp(`\\b${escaped}\\b`, "iu").test(t);
    } catch {
      return t.includes(term.toLowerCase());
    }
  });
}
function hasMotif(text) {
  return hasTerm(text, BRAND_MOTIF_TERMS);
}
function hasArch(text) {
  return hasTerm(text, ARCHITECTURE_TERMS);
}
const COLOR_GRADIENT_RE = /(?:white|off-white|\u767d|purple|violet|lavender|lilac|plum|\u7d2b|\u6d45\u7d2b|\u6df1\u7d2b|\u7d2b\u8272)(?:\s*(?:->|\u2192|to|\u5230|\u6e10\u53d8|\u8fc7\u6e21)\s*(?:white|off-white|\u767d|purple|violet|lavender|lilac|plum|\u7d2b|\u6d45\u7d2b|\u6df1\u7d2b|\u7d2b\u8272))+/giu;
function sanitizeBrandItem(rawItem) {
  const raw = String(rawItem || "").trim();
  if (!raw) return { text: "", raw, disposition: "dropped", reason: "empty" };
  if (IDENTITY_RE.test(raw)) {
    return { text: "", raw, disposition: "dropped", reason: "in_scene_identity_post_composite" };
  }
  if (PEOPLE_OPS_RE.test(raw)) {
    return { text: "", raw, disposition: "dropped", reason: "people_operations_not_spatial" };
  }
  if (DECOR_OBJECT_RE.test(raw)) {
    return { text: "", raw, disposition: "dropped", reason: "decorative_object_prop" };
  }
  if (GALLERY_POETRY_RE.test(raw)) {
    return { text: "", raw, disposition: "dropped", reason: "gallery_poetry_non_commercial" };
  }
  if ([...raw].length > PROSE_MAX_CHARS) {
    return { text: "", raw, disposition: "dropped", reason: "creative_prose_too_long" };
  }
  const analysis = classifyPhrase(raw, "brandRoleManifestation");
  if (COLOR_GRADIENT_RE.test(raw) || analysis.classification === SEMANTIC_CLASS.COLOR_GEOMETRY) {
    const hasAccent = /\u70b9\u7f00|accent|detail|trim|soft\s+furnishing|\u8f6f\u88c5/iu.test(raw);
    const normalized = hasAccent ? raw : `${raw}\uFF08\u54C1\u724C\u8272\u4EC5\u4F5C\u5C40\u90E8\u70B9\u7F00\uFF0C\u4E0D\u4F5C\u7A7A\u95F4\u51E0\u4F55/\u5927\u9762\u79EF\u6E10\u53D8\uFF09`;
    return { text: normalized, raw, disposition: "normalized", reason: "color_demoted_to_accent", normalized };
  }
  if (hasMotif(raw)) {
    const norm = normalizeArchitectureSemantics(raw, "brandRoleManifestation");
    if (norm.includedInArchitecturePrompt && norm.normalized) {
      const asSurface = `\u8868\u9762/\u808C\u7406\u884C\u4E3A\uFF1A${norm.normalized}`;
      return { text: asSurface, raw, disposition: "normalized", reason: "motif_to_surface_behavior", normalized: asSurface };
    }
    return { text: "", raw, disposition: "dropped", reason: "pure_decorative_motif_object" };
  }
  if (containsChromaticColor(raw) && hasArch(raw) && analysis.classification !== SEMANTIC_CLASS.COLOR_ACCENT) {
    const normalized = `${raw}\uFF08\u54C1\u724C\u8272\u4EC5\u4F5C\u5C40\u90E8\u70B9\u7F00\uFF09`;
    return { text: normalized, raw, disposition: "normalized", reason: "color_demoted_to_accent", normalized };
  }
  return { text: raw, raw, disposition: "kept" };
}
function sanitizeBrandManifestation(items) {
  const list = Array.isArray(items) ? items : [];
  const records = [];
  const seen = /* @__PURE__ */ new Set();
  const lines = [];
  let kept = 0;
  let normalized = 0;
  let dropped = 0;
  for (const item of list) {
    const rec = sanitizeBrandItem(item);
    records.push(rec);
    if (rec.disposition === "dropped" || !rec.text) {
      dropped += 1;
      continue;
    }
    const key = rec.text.toLocaleLowerCase();
    if (seen.has(key)) {
      dropped += 1;
      continue;
    }
    seen.add(key);
    lines.push(rec.text);
    if (rec.disposition === "normalized") normalized += 1;
    else kept += 1;
  }
  return {
    lines,
    records,
    stats: { total: list.length, kept, normalized, dropped }
  };
}
const BRAND_EXPRESSION_SANITIZER_VERSION = "1.1.0";
const PRIMARY_SURFACE_RE = /ceiling|soffit|wall|partition|facade|membrane|canopy|enclosure|primary|main|dominant|\u5929\u82b1|\u540a\u9876|\u9876\u9762|\u5899|\u5899\u9762|\u9694\u65ad|\u7acb\u9762|\u4e3b\u8981|\u4e3b\u8c03|\u4e3b\u5bfc|\u5927\u9762|\u89c6\u89c9\u7126\u70b9/iu;
const ACCENT_ONLY_ROLE = "\u54C1\u724C\u8272\u4EC5\u4F5C\u5C40\u90E8\u70B9\u7F00/\u6536\u8FB9/\u5C0F\u4EF6\u9970\u9762\uFF0C\u4E0D\u5F97\u7528\u4E8E\u5929\u82B1\u3001\u5899\u9762\u3001\u9694\u65AD\u6216\u4E3B\u4F53\u7ED3\u6784";
const CHROMATIC_COLOR_RE = /\b(purple|violet|lavender|lilac|plum|magenta|amethyst|blue|teal|green|red|orange|pink|rose|indigo|crimson)\b|\u7d2b|\u6d45\u7d2b|\u6df1\u7d2b|\u7d2b\u8272|\u84dd|\u9752|\u7eff|\u7ea2|\u6a59|\u7c89|\u73ab\u7ea2/iu;
function containsChromaticColor(text) {
  const t = String(text || "");
  if (CHROMATIC_COLOR_RE.test(t)) return true;
  return /\u54c1\u724c\u8272|colored\s+(?:acrylic|glass|resin)/iu.test(t);
}
function sanitizeMaterial(m) {
  if (!m || typeof m.material !== "string" || !m.material) return m;
  const colorInMaterial = containsChromaticColor(m.material);
  if (!colorInMaterial) return m;
  const behavior = Array.isArray(m.behavior) ? m.behavior : [];
  const sanitized = {
    ...m,
    behavior: behavior.map((b) => PRIMARY_SURFACE_RE.test(b) ? ACCENT_ONLY_ROLE : b),
    brandRole: ACCENT_ONLY_ROLE,
    colorAccent: true
  };
  if (!sanitized.behavior.includes(ACCENT_ONLY_ROLE)) sanitized.behavior.push(ACCENT_ONLY_ROLE);
  return sanitized;
}
function sanitizeMaterials(items) {
  return (Array.isArray(items) ? items : []).map(sanitizeMaterial);
}
const LIGHT_IDENTITY_RE = /\u80cc\u5149\u53d1\u5149\u5b57|\u53d1\u5149\u5b57|illuminated\s+letters|backlit\s+sign/iu;
function sanitizeLighting(l) {
  if (!l) return l;
  const source = (Array.isArray(l.source) ? l.source : []).filter((s) => !LIGHT_IDENTITY_RE.test(s));
  const interaction = (Array.isArray(l.interactionWithMaterials) ? l.interactionWithMaterials : []).map((s) => containsChromaticColor(s) ? `${s}\uFF08\u54C1\u724C\u8272\u5149\u4EC5\u4F5C\u5C40\u90E8\u70B9\u7F00\uFF0C\u4E0D\u67D3\u8272\u5929\u82B1/\u5927\u9762\u8868\u9762\uFF09` : s);
  return { ...l, source, interactionWithMaterials: interaction };
}
function sanitizeDifferentiators(items) {
  return (Array.isArray(items) ? items : []).map((raw) => {
    const t = String(raw || "").trim();
    if (!t) return t;
    if (hasMotif(t)) {
      return sanitizeBrandItem(t).text;
    }
    if (containsChromaticColor(t) && !/surface|texture|\u6750\u8d28|\u89e6\u611f/u.test(t)) {
      return `${t}\uFF08\u4EC5\u4F5C\u5C40\u90E8\u914D\u8272\u70B9\u7F00\uFF0C\u4E0D\u4F5C\u7A7A\u95F4\u4E3B\u8272\u8C03\uFF09`;
    }
    return t;
  }).filter(Boolean);
}
export {
  BRAND_EXPRESSION_SANITIZER_VERSION,
  sanitizeBrandItem,
  sanitizeBrandManifestation,
  sanitizeDifferentiators,
  sanitizeLighting,
  sanitizeMaterial,
  sanitizeMaterials
};
