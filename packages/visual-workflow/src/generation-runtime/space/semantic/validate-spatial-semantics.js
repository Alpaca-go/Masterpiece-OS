import { classifyPhrase, SEMANTIC_CLASS } from "./separate-space-semantics.js";
const SPATIAL_SEMANTIC_GATE_VERSION = "space-spatial-semantic-gate@1.1.0";
// A wayfinding sign is part of a route, not a decorative-identity requirement.
// These helpers are deliberately narrow: they only exempt a complete walking
// route whose remaining steps are all functional, and a located sign at an
// entrance/threshold. A sign without a route, a dominating logo wall, or an
// identity term outside these fields stays blocked exactly as before.
const IDENTITY_TERM = /logo|wordmark|logotype|slogan|mascot|emblem|发光字|标识|标志|徽标|徽章|吉祥物|字标|品牌文字|艺术字|招牌/iu;
const FLOW_STEP = /(?:进入|到达|进门|入店|点餐|下单|付款|结账|支付|等候|等待|排队|取餐|取货|就餐|用餐|入座|离开|打包|外带|选购|浏览|查看|洗手|如厕|出餐|备餐|制作|收银|接待|引导|送餐|点单|落座|通行|经过)/u;
const ROUTE_ARROW = /(?:→|->|⇒|»)/u;
const ROUTE_SPLIT = /\s*(?:→|->|⇒|»)\s*/u;
const SIGNAGE_PLACE = /(?:入口|门头|店门|店面|外立面|立面|前厅|前台|接待处|接待区|通道|门口|街面)/u;
const IDENTITY_DOMINANCE = /(?:主视觉|视觉中心|视觉焦点|唯一焦点|放大|满墙|整墙|整面|大面积|占据|覆盖|作为(?:空间|墙面|背景)?主景|背景墙)/u;
function isWayfindingIdentityStep(step) {
  return IDENTITY_TERM.test(step) && !FLOW_STEP.test(step);
}
function isWayfindingRoute(value) {
  const text = String(value ?? "").trim();
  if (!ROUTE_ARROW.test(text)) return false;
  const steps = text.split(ROUTE_SPLIT).map((step) => step.trim()).filter(Boolean);
  if (steps.length < 4) return false;
  const kept = steps.filter((step) => !isWayfindingIdentityStep(step));
  if (kept.length === steps.length) return false;
  if (kept.length < 3) return false;
  return kept.every((step) => FLOW_STEP.test(step));
}
function stripWayfindingIdentitySteps(value) {
  if (!isWayfindingRoute(value)) return null;
  return String(value).split(ROUTE_SPLIT).map((step) => step.trim()).filter(Boolean).filter((step) => !isWayfindingIdentityStep(step)).join("→");
}
function isLocatedVisibleSign(value) {
  const text = String(value ?? "").trim();
  if (!IDENTITY_TERM.test(text)) return false;
  if (!SIGNAGE_PLACE.test(text)) return false;
  return !IDENTITY_DOMINANCE.test(text);
}
const FUNCTIONAL_FIELDS = Object.freeze([
  "functionalNetwork",
  "functionalRelationships",
  "mustBeVisible",
  // R10.4.1: operationConstraints / requiredSpatialElements are also hard
  // functional fields that must never host a decorative-object requirement.
  "operationConstraints",
  "requiredSpatialElements"
]);
const BLOCKED_CLASSES = /* @__PURE__ */ new Set([
  SEMANTIC_CLASS.BRAND_MOTIF,
  SEMANTIC_CLASS.AMBIGUOUS,
  SEMANTIC_CLASS.COLOR_GEOMETRY,
  SEMANTIC_CLASS.DECORATIVE_IDENTITY,
  SEMANTIC_CLASS.DECORATIVE_OBJECT
]);
const GRAPHIC_IDENTITY = /brand\s+(?:graphic|story|visual)|graphic\s+identity|品牌(?:理念)?图文|品牌主图|视觉主图|图形识别/iu;
const SUBORDINATE_DECORATIVE = /(?:次级|次要|小型|轻量|弱化|辅助|局部|点缀性)?(?:艺术陈设|艺术物件|视觉点缀|装饰点缀|轻量装置)|(?:optional|subordinate|secondary)\s+(?:decoration|art|installation)/iu;
function isSubordinateDecorativeObject(value) {
  const text = String(value ?? "");
  return SUBORDINATE_DECORATIVE.test(text);
}
function list(value) {
  return (Array.isArray(value) ? value : []).filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}
function findingCode(field, classification) {
  if (field === "mustBeVisible" && classification === SEMANTIC_CLASS.DECORATIVE_IDENTITY) {
    return "INVALID_SPACE_MUST_BE_VISIBLE_SEMANTICS";
  }
  if (classification === SEMANTIC_CLASS.COLOR_GEOMETRY) {
    return "INVALID_COLOR_GEOMETRY_SEMANTICS";
  }
  return "INVALID_SPACE_FUNCTIONAL_SEMANTICS";
}
function validateSpatialSemantics(spatial = {}) {
  const findings = [];
  for (const field of FUNCTIONAL_FIELDS) {
    for (const [index, value] of list(spatial?.[field]).entries()) {
      if (field === "mustBeVisible" && isLocatedVisibleSign(value)) continue;
      if ((field === "functionalNetwork" || field === "functionalRelationships") && isWayfindingRoute(value)) continue;
      const semanticSourceField = field === "mustBeVisible" ? "functionalNetwork" : field;
      const analysis = classifyPhrase(value, semanticSourceField);
      const graphicIdentity = GRAPHIC_IDENTITY.test(value);
      if (!graphicIdentity && !BLOCKED_CLASSES.has(analysis.classification)) continue;
      if (analysis.classification === SEMANTIC_CLASS.DECORATIVE_OBJECT && isSubordinateDecorativeObject(value)) {
        continue;
      }
      const classification = analysis.classification === SEMANTIC_CLASS.DECORATIVE_OBJECT ? SEMANTIC_CLASS.DECORATIVE_OBJECT : graphicIdentity ? "graphic_identity" : analysis.classification;
      findings.push({
        code: findingCode(field, analysis.classification),
        severity: "block",
        field,
        path: `mediaTranslations.spatial.${field}[${index}]`,
        classification
      });
    }
  }
  return {
    schemaVersion: "1.0",
    version: SPATIAL_SEMANTIC_GATE_VERSION,
    status: findings.length ? "block" : "pass",
    findings
  };
}
function normalizeSpatialFunctionalValue(value, field) {
  const rawText = String(value ?? "").trim();
  if (!rawText) return null;
  // A route that only uses a sign as a wayfinding step keeps its functional
  // steps; the identity step is not forwarded to the prompt.
  const text = stripWayfindingIdentitySteps(rawText) ?? rawText;
  if (validateSpatialSemantics({ [field]: [text] }).status === "pass") return text;
  const withoutIdentity = text.replace(/(?:简洁|清晰|统一|品牌|门店|导向)?(?:logo|wordmark|logotype|slogan|标识|标志|字标|品牌文字)(?:系统)?(?:与|、)?/giu, "").replace(/\s+/gu, " ").replace(/[，,]{2,}/gu, "\uFF0C").trim();
  if (withoutIdentity && withoutIdentity !== text && validateSpatialSemantics({ [field]: [withoutIdentity] }).status === "pass") {
    return withoutIdentity;
  }
  if (field !== "functionalRelationships") return null;
  const safe = text.split(/[，,；;。]/u).map((segment) => segment.trim()).filter(Boolean).filter((segment) => validateSpatialSemantics({ [field]: [segment] }).status === "pass");
  return safe.length ? safe.join("\uFF0C") : null;
}
const DECORATIVE_DEPENDENCY_PATTERNS = [
  {
    // 视线引导至艺术装置 / 视线聚焦到雕塑 -> 建立清晰入口视觉焦点和空间导向
    re: /(视线|目光|视觉)(?:引导|聚焦|望向|看向)?至?(?:于|向|到)?(?:大型|中央|主要)?(?:艺术装置|雕塑|装饰装置|视觉装置|中心装置|艺术品|艺术陈设)/u,
    replace: "\u5EFA\u7ACB\u6E05\u6670\u5165\u53E3\u89C6\u89C9\u7126\u70B9\u548C\u7A7A\u95F4\u5BFC\u5411"
  },
  {
    // 围绕(大型)雕塑/艺术装置(展开|组织|布局) -> 组织主要到达路径与空间层次
    re: /围绕(?:大型|中央)?(?:艺术装置|雕塑|装饰装置|艺术品|艺术陈设)(?:展开|组织|布局|规划)/u,
    replace: "\u7EC4\u7EC7\u4E3B\u8981\u5230\u8FBE\u8DEF\u5F84\u4E0E\u7A7A\u95F4\u5C42\u6B21"
  },
  {
    // 引导至艺术装置 -> 引导至主要到达区域
    re: /引导至(?:大型|中央|主要)?(?:艺术装置|雕塑|装饰装置|视觉装置|中心装置|艺术品)/u,
    replace: "\u5F15\u5BFC\u81F3\u4E3B\u8981\u5230\u8FBE\u533A\u57DF"
  },
  {
    // 以艺术装置/雕塑为(视觉)?中心 -> 以主要到达空间为中心
    re: /以(?:大型|中央)?(?:艺术装置|雕塑|装饰装置|视觉装置|中心装置|艺术品|艺术陈设)为(?:视觉)?中心/u,
    replace: "\u4EE5\u4E3B\u8981\u5230\u8FBE\u7A7A\u95F4\u4E3A\u4E2D\u5FC3"
  },
  {
    // 依托/衬托(品牌)?艺术装置/雕塑 -> 建立清晰空间层次与品牌气质
    re: /依托|衬托|呈现|展现(?:大型|中央)?(?:艺术装置|雕塑|装饰装置|视觉装置|中心装置|艺术品|艺术陈设)/u,
    replace: "\u5EFA\u7ACB\u6E05\u6670\u7A7A\u95F4\u5C42\u6B21\u4E0E\u54C1\u724C\u6C14\u8D28"
  }
];
function demoteDecorativeObjectFromFunctionalLayer(value, field) {
  const rawText = String(value ?? "").trim();
  if (!rawText) return null;
  const text = stripWayfindingIdentitySteps(rawText) ?? rawText;
  if (validateSpatialSemantics({ [field]: [text] }).status === "pass") return text;
  let demoted = text;
  for (const { re, replace } of DECORATIVE_DEPENDENCY_PATTERNS) {
    demoted = demoted.replace(re, replace);
  }
  demoted = demoted.replace(/\s+/gu, " ").replace(/[，,]{2,}/gu, "\uFF0C").trim();
  if (demoted && demoted !== text && validateSpatialSemantics({ [field]: [demoted] }).status === "pass") {
    return demoted;
  }
  if (field !== "functionalRelationships") return null;
  const safe = text.split(/[，,；;。]/u).map((segment) => segment.trim()).filter(Boolean).filter((segment) => validateSpatialSemantics({ [field]: [segment] }).status === "pass");
  return safe.length ? safe.join("\uFF0C") : null;
}
function normalizeFunctionalHardConstraint(value, field) {
  const viaIdentity = normalizeSpatialFunctionalValue(value, field);
  if (viaIdentity !== null && viaIdentity !== value) return viaIdentity;
  return demoteDecorativeObjectFromFunctionalLayer(value, field);
}
export {
  SPATIAL_SEMANTIC_GATE_VERSION,
  demoteDecorativeObjectFromFunctionalLayer,
  normalizeFunctionalHardConstraint,
  normalizeSpatialFunctionalValue,
  validateSpatialSemantics
};
