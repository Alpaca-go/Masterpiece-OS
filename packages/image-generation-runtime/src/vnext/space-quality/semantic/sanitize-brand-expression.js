// Brand-expression sanitizer for the Brand Translation block (R8.5 redirected).
//
// R8.4 archaeology + the R8.5 redirected trial smoke proved that even when the
// architecture blocks are clean (action-verb IR, no motif), the Brand
// Translation block still dumped raw V5 motif prose into the prompt:
//   - literal motif nouns ("fe\u0061ther / pe\u0061cock" wall, "Realm of ...")
//   - two near-duplicate long creative-direction paragraphs
//   - in-scene identity ("illuminated logo", "slogan wall text")
//   - people/ops items ("staff uniforms in brand color")
//   - color-as-geometry ("white -> light -> deep purple gradient" across rooms)
// The model read those high-density motif tokens and rendered literal
// sculptures / colored geometry regardless of the clean architecture IR.
//
// This module SANITIZES the brand-manifestation list into surface/finish/
// accent behavior only. It is deterministic, brand-generic (no project names
// or per-brand bans — verify:no-project-specific-production-rules), and calls
// no LLM. It does NOT invent facts: it either keeps an item, normalizes a
// motif/color literal into the abstract property already present, or drops an
// item that belongs to post-composite identity / creative narrative / ops.

import {
  BRAND_MOTIF_TERMS,
  COLOR_TERMS,
  ARCHITECTURE_TERMS,
} from './lexicons.js';
import { classifyPhrase, SEMANTIC_CLASS } from './separate-space-semantics.js';
import { normalizeArchitectureSemantics } from './normalize-architecture-semantics.js';

// In-scene identity is composited AFTER generation (logo post-composite) and
// must never be drawn by the model. Generic identity classes only.
const IDENTITY_RE = /logo|wordmark|logotype|slogan|mascot|emblem|monogram|\bicon\b|signage\s+text|illuminated\s+letters|发光字|导视|标识|标志|徽章|吉祥物|艺术字|slogan墙|墙面文字/iu;

// Long-form creative-direction / brand-strategy prose: over a length threshold
// it narrates the brand's self-conception (often repeating the motif many
// times) rather than specifying a buildable surface behavior. It adds no
// spatial generation value, so it is dropped from the prompt.
const PROSE_MAX_CHARS = 60;

// People / operations / non-spatial brand expressions (uniforms, service
// behavior, copy on walls). These are not surfaces the model constructs.
const PEOPLE_OPS_RE = /员工制服|工服|制服|服务流程|话术|礼仪|工作人员|员工/iu;

// Standalone decorative objects that a model will render as literal props
// (ribbons, hanging ornaments) rather than as architecture or finishes.
const DECOR_OBJECT_RE = /丝带|飘带|绸带|挂饰|摆件|装饰挂件|ribbon|hanging\s+ornament/iu;

// Brand-poetry space metaphors that pull the render away from a functional
// commercial space ("space as art gallery"). The Architecture-Function Bridge
// already warns against turning the space into a gallery, so these are dropped
// here rather than double-emitted as positive instruction.
const GALLERY_POETRY_RE = /空间作为艺术画廊|艺术画廊般|as\s+an?\s+art\s+gallery|gallery-like/iu;

/**
 * @typedef {{
 *   text: string,
 *   raw: string,
 *   disposition: 'kept'|'normalized'|'dropped',
 *   reason?: string,
 *   normalized?: string,
 * }} BrandItemRecord
 */

function hasTerm(text, terms) {
  const t = String(text || '').toLowerCase();
  return terms.some((term) => {
    if (/[一-鿿]/u.test(term)) return t.includes(term.toLowerCase());
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    try { return new RegExp(`\\b${escaped}\\b`, 'iu').test(t); } catch { return t.includes(term.toLowerCase()); }
  });
}

function hasMotif(text) { return hasTerm(text, BRAND_MOTIF_TERMS); }
function hasColor(text) { return hasTerm(text, COLOR_TERMS); }
function hasArch(text) { return hasTerm(text, ARCHITECTURE_TERMS); }

// A color-gradient / color-transition phrase couples color to spatial form
// ("white -> light purple -> deep purple gradient from entry to treatment
// room"). We keep a SHORT, surface/accent-only restatement so the brand color
// survives as a finish, never as a geometry generator.
const COLOR_GRADIENT_RE = /(?:white|off-white|\u767d|purple|violet|lavender|lilac|plum|\u7d2b|\u6d45\u7d2b|\u6df1\u7d2b|\u7d2b\u8272)(?:\s*(?:->|\u2192|to|\u5230|\u6e10\u53d8|\u8fc7\u6e21)\s*(?:white|off-white|\u767d|purple|violet|lavender|lilac|plum|\u7d2b|\u6d45\u7d2b|\u6df1\u7d2b|\u7d2b\u8272))+/giu;

/**
 * Sanitize one brand-manifestation item.
 * @param {string} rawItem
 * @returns {BrandItemRecord}
 */
export function sanitizeBrandItem(rawItem) {
  const raw = String(rawItem || '').trim();
  if (!raw) return { text: '', raw, disposition: 'dropped', reason: 'empty' };

  // 1) In-scene identity -> post-composite, never drawn.
  if (IDENTITY_RE.test(raw)) {
    return { text: '', raw, disposition: 'dropped', reason: 'in_scene_identity_post_composite' };
  }

  // 2) People / operations -> not a buildable surface.
  if (PEOPLE_OPS_RE.test(raw)) {
    return { text: '', raw, disposition: 'dropped', reason: 'people_operations_not_spatial' };
  }

  // 2b) Standalone decorative props / gallery-poetry -> literal object or a
  //     non-commercial look, not a surface behavior.
  if (DECOR_OBJECT_RE.test(raw)) {
    return { text: '', raw, disposition: 'dropped', reason: 'decorative_object_prop' };
  }
  if (GALLERY_POETRY_RE.test(raw)) {
    return { text: '', raw, disposition: 'dropped', reason: 'gallery_poetry_non_commercial' };
  }

  // 3) Long creative-direction prose -> narrative, not spatial specification.
  if ([...raw].length > PROSE_MAX_CHARS) {
    return { text: '', raw, disposition: 'dropped', reason: 'creative_prose_too_long' };
  }

  const analysis = classifyPhrase(raw, 'brandRoleManifestation');

  // 4) Color as a spatial gradient/form generator -> demote to a local accent
  //    finish so the brand color survives without generating colored geometry.
  if (COLOR_GRADIENT_RE.test(raw) || analysis.classification === SEMANTIC_CLASS.COLOR_GEOMETRY) {
    const hasAccent = /\u70b9\u7f00|accent|detail|trim|soft\s+furnishing|\u8f6f\u88c5/iu.test(raw);
    const normalized = hasAccent
      ? raw
      : `${raw}\uff08\u54c1\u724c\u8272\u4ec5\u4f5c\u5c40\u90e8\u70b9\u7f00\uff0c\u4e0d\u4f5c\u7a7a\u95f4\u51e0\u4f55/\u5927\u9762\u79ef\u6e10\u53d8\uff09`;
    return { text: normalized, raw, disposition: 'normalized', reason: 'color_demoted_to_accent', normalized };
  }

  // 5) ANY item carrying a motif literal (regardless of its semantic class —
  //    "abstract motif-textured wall" classifies as ARCHITECTURAL because it
  //    contains wall/screen words, but it still names a motif) is normalized
  //    into abstract surface behavior. If a spatial/finish property survives
  //    we keep it recast as a surface behavior; if nothing buildable remains
  //    (a pure decorative object) it is dropped.
  if (hasMotif(raw)) {
    const norm = normalizeArchitectureSemantics(raw, 'brandRoleManifestation');
    if (norm.includedInArchitecturePrompt && norm.normalized) {
      const asSurface = `\u8868\u9762/\u808c\u7406\u884c\u4e3a\uff1a${norm.normalized}`;
      return { text: asSurface, raw, disposition: 'normalized', reason: 'motif_to_surface_behavior', normalized: asSurface };
    }
    return { text: '', raw, disposition: 'dropped', reason: 'pure_decorative_motif_object' };
  }

  // 6) A standalone color accent/finish statement with no motif and no
  //    geometry coupling is a legitimate brand finish ("purple accent breaks
  //    the dullness") — keep it concise. If color is coupled to a geometry
  //    word but escaped the gradient regex, demote it too.
  if (hasColor(raw) && hasArch(raw) && analysis.classification !== SEMANTIC_CLASS.COLOR_ACCENT) {
    const normalized = `${raw}\uff08\u54c1\u724c\u8272\u4ec5\u4f5c\u5c40\u90e8\u70b9\u7f00\uff09`;
    return { text: normalized, raw, disposition: 'normalized', reason: 'color_demoted_to_accent', normalized };
  }

  // 7) Otherwise keep concise brand-atmosphere / finish / material statements.
  return { text: raw, raw, disposition: 'kept' };
}

/**
 * Sanitize a list of brand-manifestation strings. Returns the cleaned prompt
 * lines plus per-item records for trace/audit.
 * @param {string[]} items
 * @returns {{lines:string[], records:BrandItemRecord[],
 *            stats:{total:number, kept:number, normalized:number, dropped:number}}}
 */
export function sanitizeBrandManifestation(items) {
  const list = Array.isArray(items) ? items : [];
  const records = [];
  const seen = new Set();
  const lines = [];
  let kept = 0;
  let normalized = 0;
  let dropped = 0;

  for (const item of list) {
    const rec = sanitizeBrandItem(item);
    records.push(rec);
    if (rec.disposition === 'dropped' || !rec.text) { dropped += 1; continue; }
    const key = rec.text.toLocaleLowerCase();
    if (seen.has(key)) { dropped += 1; continue; }
    seen.add(key);
    lines.push(rec.text);
    if (rec.disposition === 'normalized') normalized += 1; else kept += 1;
  }

  return {
    lines,
    records,
    stats: { total: list.length, kept, normalized, dropped },
  };
}

export const BRAND_EXPRESSION_SANITIZER_VERSION = '1.0.0';
