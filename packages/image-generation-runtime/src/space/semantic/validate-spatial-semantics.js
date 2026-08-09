import { classifyPhrase, SEMANTIC_CLASS } from './separate-space-semantics.js';

export const SPATIAL_SEMANTIC_GATE_VERSION = 'space-spatial-semantic-gate@1.1.0';

const FUNCTIONAL_FIELDS = Object.freeze([
  'functionalNetwork',
  'functionalRelationships',
  'mustBeVisible',
  // R10.4.1: operationConstraints / requiredSpatialElements are also hard
  // functional fields that must never host a decorative-object requirement.
  'operationConstraints',
  'requiredSpatialElements',
]);

const BLOCKED_CLASSES = new Set([
  SEMANTIC_CLASS.BRAND_MOTIF,
  SEMANTIC_CLASS.AMBIGUOUS,
  SEMANTIC_CLASS.COLOR_GEOMETRY,
  SEMANTIC_CLASS.DECORATIVE_IDENTITY,
  SEMANTIC_CLASS.DECORATIVE_OBJECT,
]);

const GRAPHIC_IDENTITY = /brand\s+(?:graphic|story|visual)|graphic\s+identity|品牌(?:理念)?图文|品牌主图|视觉主图|图形识别/iu;

// R10.4.1: a decorative object phrased as a SUBORDINATE / optional / secondary
// element ("作为次级视觉点缀", "小型艺术陈设", "弱化视觉装置") is an optional
// styling note, not a functional hard requirement — it must be allowed in the
// functional layer as an explicit subordinate clause.
const SUBORDINATE_DECORATIVE = /(?:次级|次要|小型|轻量|弱化|辅助|局部|点缀性)?(?:艺术陈设|艺术物件|视觉点缀|装饰点缀|轻量装置)|(?:optional|subordinate|secondary)\s+(?:decoration|art|installation)/iu;

function isSubordinateDecorativeObject(value) {
  const text = String(value ?? '');
  return SUBORDINATE_DECORATIVE.test(text);
}

function list(value) {
  return (Array.isArray(value) ? value : [])
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function findingCode(field, classification) {
  if (field === 'mustBeVisible' && classification === SEMANTIC_CLASS.DECORATIVE_IDENTITY) {
    return 'INVALID_SPACE_MUST_BE_VISIBLE_SEMANTICS';
  }
  if (classification === SEMANTIC_CLASS.COLOR_GEOMETRY) {
    return 'INVALID_COLOR_GEOMETRY_SEMANTICS';
  }
  return 'INVALID_SPACE_FUNCTIONAL_SEMANTICS';
}

export function validateSpatialSemantics(spatial = {}) {
  const findings = [];
  for (const field of FUNCTIONAL_FIELDS) {
    for (const [index, value] of list(spatial?.[field]).entries()) {
      // `mustBeVisible` is a required scene-fixture list at this gate. Treat
      // an otherwise neutral fixture as functional while still allowing the
      // classifier to catch explicit motifs, identity marks, color-driven
      // geometry and decorative objects.
      const semanticSourceField = field === 'mustBeVisible'
        ? 'functionalNetwork'
        : field;
      const analysis = classifyPhrase(value, semanticSourceField);
      const graphicIdentity = GRAPHIC_IDENTITY.test(value);
      if (!graphicIdentity && !BLOCKED_CLASSES.has(analysis.classification)) continue;
      // R10.4.1: a decorative object explicitly marked as a subordinate / optional
      // / secondary element is an optional styling note, NOT a functional hard
      // requirement — allow it in the functional layer.
      if (analysis.classification === SEMANTIC_CLASS.DECORATIVE_OBJECT && isSubordinateDecorativeObject(value)) {
        continue;
      }
      const classification = analysis.classification === SEMANTIC_CLASS.DECORATIVE_OBJECT
        ? SEMANTIC_CLASS.DECORATIVE_OBJECT
        : graphicIdentity
          ? 'graphic_identity'
          : analysis.classification;
      findings.push({
        code: findingCode(field, analysis.classification),
        severity: 'block',
        field,
        path: `mediaTranslations.spatial.${field}[${index}]`,
        classification,
      });
    }
  }
  return {
    schemaVersion: '1.0',
    version: SPATIAL_SEMANTIC_GATE_VERSION,
    status: findings.length ? 'block' : 'pass',
    findings,
  };
}

export function normalizeSpatialFunctionalValue(value, field) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (validateSpatialSemantics({ [field]: [text] }).status === 'pass') return text;

  // Remove an identity label only when the remaining sentence still carries
  // a valid zone, fixture, circulation or boundary statement. Literal motifs
  // and decorative objects are not normalized because stripping them would
  // invent an unsupported spatial instruction.
  const withoutIdentity = text
    .replace(/(?:简洁|清晰|统一|品牌|门店|导向)?(?:logo|wordmark|logotype|slogan|标识|标志|字标|品牌文字)(?:系统)?(?:与|、)?/giu, '')
    .replace(/\s+/gu, ' ')
    .replace(/[，,]{2,}/gu, '，')
    .trim();
  if (
    withoutIdentity
    && withoutIdentity !== text
    && validateSpatialSemantics({ [field]: [withoutIdentity] }).status === 'pass'
  ) {
    return withoutIdentity;
  }

  if (field !== 'functionalRelationships') return null;
  const safe = text.split(/[，,；;。]/u)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => validateSpatialSemantics({ [field]: [segment] }).status === 'pass');
  return safe.length ? safe.join('，') : null;
}

// ---- R10.4.1 Decorative Object Functional Demotion ------------------------
//
// Deterministic rewriting (no LLM) that removes a decorative-object dependency
// from a functional/operational phrase while preserving the spatial intent,
// the function, the circulation and the visual-hierarchy intent.
//
// Decorative objects (艺术装置 / 雕塑 / centerpiece) are NOT banned — they may
// stay in Brand Translation / optional styling as a subordinate element. What
// is removed here is only their role as a FUNCTIONAL hard requirement
// (e.g. "接待台正对入口，视线引导至艺术装置" must not force the provider to
// generate a central art piece).

// Phrase patterns that couple a functional action to a decorative object.
const DECORATIVE_DEPENDENCY_PATTERNS = [
  {
    // 视线引导至艺术装置 / 视线聚焦到雕塑 -> 建立清晰入口视觉焦点和空间导向
    re: /(视线|目光|视觉)(?:引导|聚焦|望向|看向)?至?(?:于|向|到)?(?:大型|中央|主要)?(?:艺术装置|雕塑|装饰装置|视觉装置|中心装置|艺术品|艺术陈设)/u,
    replace: '建立清晰入口视觉焦点和空间导向',
  },
  {
    // 围绕(大型)雕塑/艺术装置(展开|组织|布局) -> 组织主要到达路径与空间层次
    re: /围绕(?:大型|中央)?(?:艺术装置|雕塑|装饰装置|艺术品|艺术陈设)(?:展开|组织|布局|规划)/u,
    replace: '组织主要到达路径与空间层次',
  },
  {
    // 引导至艺术装置 -> 引导至主要到达区域
    re: /引导至(?:大型|中央|主要)?(?:艺术装置|雕塑|装饰装置|视觉装置|中心装置|艺术品)/u,
    replace: '引导至主要到达区域',
  },
  {
    // 以艺术装置/雕塑为(视觉)?中心 -> 以主要到达空间为中心
    re: /以(?:大型|中央)?(?:艺术装置|雕塑|装饰装置|视觉装置|中心装置|艺术品|艺术陈设)为(?:视觉)?中心/u,
    replace: '以主要到达空间为中心',
  },
  {
    // 依托/衬托(品牌)?艺术装置/雕塑 -> 建立清晰空间层次与品牌气质
    re: /依托|衬托|呈现|展现(?:大型|中央)?(?:艺术装置|雕塑|装饰装置|视觉装置|中心装置|艺术品|艺术陈设)/u,
    replace: '建立清晰空间层次与品牌气质',
  },
];

/**
 * Deterministically demote a decorative object from a functional/operational
 * phrase, preserving spatial intent, function and circulation.
 *
 * @param {string} value
 * @param {string} field  functional field name (functionalNetwork / ... )
 * @returns {string|null} demoted safe phrase, or null when no safe rewrite exists
 */
export function demoteDecorativeObjectFromFunctionalLayer(value, field) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (validateSpatialSemantics({ [field]: [text] }).status === 'pass') return text;

  let demoted = text;
  for (const { re, replace } of DECORATIVE_DEPENDENCY_PATTERNS) {
    demoted = demoted.replace(re, replace);
  }
  demoted = demoted.replace(/\s+/gu, ' ').replace(/[，,]{2,}/gu, '，').trim();

  if (demoted && demoted !== text && validateSpatialSemantics({ [field]: [demoted] }).status === 'pass') {
    return demoted;
  }

  // Last resort: drop segments that still reference a decorative object,
  // keeping any segment that carries a genuine functional/spatial intent.
  if (field !== 'functionalRelationships') return null;
  const safe = text.split(/[，,；;。]/u)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => validateSpatialSemantics({ [field]: [segment] }).status === 'pass');
  return safe.length ? safe.join('，') : null;
}

/**
 * A single entry point that applies the full functional-layer sanitization:
 * first the existing identity normalization, then decorative-object demotion.
 * Returns null when no safe value exists (caller should drop the item).
 */
export function normalizeFunctionalHardConstraint(value, field) {
  const viaIdentity = normalizeSpatialFunctionalValue(value, field);
  if (viaIdentity !== null && viaIdentity !== value) return viaIdentity;
  return demoteDecorativeObjectFromFunctionalLayer(value, field);
}
