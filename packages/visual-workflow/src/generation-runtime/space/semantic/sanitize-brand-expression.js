import { BRAND_MOTIF_TERMS } from "./lexicons.js";
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
  // Explicit physical installations belong to brand expression. They must
  // still pass identity, operations, prop and prose checks above.
  if (analysis.classification === SEMANTIC_CLASS.DECORATIVE_OBJECT) {
    return { text: raw, raw, disposition: "kept" };
  }
  if (hasMotif(raw)) {
    const norm = normalizeArchitectureSemantics(raw, "brandRoleManifestation");
    if (norm.includedInArchitecturePrompt && norm.normalized) {
      const asSurface = `\u8868\u9762/\u808C\u7406\u884C\u4E3A\uFF1A${norm.normalized}`;
      return { text: asSurface, raw, disposition: "normalized", reason: "motif_to_surface_behavior", normalized: asSurface };
    }
    return { text: "", raw, disposition: "dropped", reason: "pure_decorative_motif_object" };
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
function sanitizeMaterial(m) {
  if (!m || typeof m.material !== "string" || !m.material) return m;
  // Color identity cannot overwrite the carrier, optical behavior or role.
  // Palette scope is handled separately from material optical behavior.
  return { ...m, behavior: [...(Array.isArray(m.behavior) ? m.behavior : [])] };
}
function sanitizeMaterials(items) {
  return (Array.isArray(items) ? items : []).map(sanitizeMaterial);
}
const LIGHT_IDENTITY_RE = /\u80cc\u5149\u53d1\u5149\u5b57|\u53d1\u5149\u5b57|illuminated\s+letters|backlit\s+sign/iu;
function sanitizeLighting(l) {
  if (!l) return l;
  const source = (Array.isArray(l.source) ? l.source : []).filter((s) => !LIGHT_IDENTITY_RE.test(s));
  const interaction = [...(Array.isArray(l.interactionWithMaterials) ? l.interactionWithMaterials : [])];
  return { ...l, source, interactionWithMaterials: interaction };
}
function sanitizeDifferentiators(items) {
  return (Array.isArray(items) ? items : []).map((raw) => {
    const t = String(raw || "").trim();
    if (!t) return t;
    if (hasMotif(t)) {
      return sanitizeBrandItem(t).text;
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
