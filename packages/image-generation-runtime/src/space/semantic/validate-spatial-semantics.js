import { classifyPhrase, SEMANTIC_CLASS } from './separate-space-semantics.js';

export const SPATIAL_SEMANTIC_GATE_VERSION = 'space-spatial-semantic-gate@1.0.0';

const FUNCTIONAL_FIELDS = Object.freeze([
  'functionalNetwork',
  'functionalRelationships',
  'mustBeVisible',
]);

const BLOCKED_CLASSES = new Set([
  SEMANTIC_CLASS.BRAND_MOTIF,
  SEMANTIC_CLASS.AMBIGUOUS,
  SEMANTIC_CLASS.COLOR_GEOMETRY,
  SEMANTIC_CLASS.DECORATIVE_IDENTITY,
]);

const DECORATIVE_OBJECT = /art\s+installation|decorative\s+(?:object|sculpture)|sculpture|艺术装置|装饰(?:物|雕塑)|雕塑/iu;
const GRAPHIC_IDENTITY = /brand\s+(?:graphic|story|visual)|graphic\s+identity|品牌(?:理念)?图文|品牌主图|视觉主图|图形识别/iu;

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
      // classifier to catch explicit motifs, identity marks, and color-driven
      // geometry. The compiler's broader brand provenance remains unchanged.
      const semanticSourceField = field === 'mustBeVisible'
        ? 'functionalNetwork'
        : field;
      const analysis = classifyPhrase(value, semanticSourceField);
      const decorativeObject = DECORATIVE_OBJECT.test(value);
      const graphicIdentity = GRAPHIC_IDENTITY.test(value);
      if (!decorativeObject && !graphicIdentity && !BLOCKED_CLASSES.has(analysis.classification)) continue;
      const classification = decorativeObject
        ? 'decorative_object'
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
