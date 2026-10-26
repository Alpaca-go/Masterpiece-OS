import { classifyPhrase, SEMANTIC_CLASS } from "./separate-space-semantics.js";
const SPATIAL_SEMANTIC_GATE_VERSION = "space-spatial-semantic-gate@1.1.0";
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
function explicitVisibleCarrier(value) {
  const text=String(value).trim();
  if (/\b(?:maybe|might|could|wish|dream|unknown|unresolved|no|not|without)\b|也许|可能|希望|未知|待定|象征|灵魂|禁止|不得|无需/iu.test(text)) return false;
  if (/^(?:(?:a|an|the|visible)\s+)?(?:staff|employees?|workers?|operators?|customers?|guests?|visitors?|clerks?|chefs?|technicians?)\b|^(?:厨师|店员|员工|顾客|客人|访客|工作人员|技师|操作员)/iu.test(text)) return false;
  return /^(?:arrival|service|checkout|pickup)\s+(?:point|counter|area|zone)[.!]?$/iu.test(text)
    || /\b(?:table|worktable|chairs?|seats?|seating|counter|equipment|scanner|terminal|pots?)\b|桌|座位|座椅|设备|扫描仪|终端|砂锅/iu.test(text);
}
function validateSpatialSemantics(spatial = {}) {
  const findings = [];
  for (const field of FUNCTIONAL_FIELDS) {
    for (const [index, value] of list(spatial?.[field]).entries()) {
      const analysis = classifyPhrase(value, field);
      const graphicIdentity = GRAPHIC_IDENTITY.test(value);
      // A supplied physical carrier is sufficient for analysis validation, but
      // does not change the renderer's existing scope/ownership classification.
      if (!graphicIdentity && field==='mustBeVisible' && analysis.classification===SEMANTIC_CLASS.AMBIGUOUS
        && explicitVisibleCarrier(value)) continue;
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
// Separate only explicit source clauses. Never remove a keyword from inside
// an inseparable proposition, invent a node, or promote a brand clause to a
// functional requirement. The original spatial object is never mutated.
function separateSpatialFunctionalSemantics(spatial = {}) {
  const next = structuredClone(spatial);
  const changes = [];
  const unresolved = [];
  const brand = list(spatial.brandRoleManifestation);
  const brandClasses = new Set([SEMANTIC_CLASS.DECORATIVE_IDENTITY, SEMANTIC_CLASS.BRAND_MOTIF,
    SEMANTIC_CLASS.DECORATIVE_OBJECT, SEMANTIC_CLASS.COLOR_ACCENT, SEMANTIC_CLASS.COLOR_GEOMETRY]);
  const operation = /菜单|价目表|进入|离开|到达|点餐|等候|取餐|用餐|就餐|厨房|出餐|清洁|外带|座位|座椅|桌面|桌椅|照明|通道|通行|动线|服务|接待|办理|操作|查看|\b(?:menu|arrival|entry|entrance|exit|waiting|counter|seating|reception|service|access|circulation|checkout|payment|staff|customers?|guests?|equipment)\b/iu;
  const brandExpression = /品牌(?:标识|符号|色彩|配色|影像|元素|内容|视觉|形象)|brand\s+(?:identity|colou?r|palette|visual|imagery|content)|^吸引力$/iu;
  function kind(text, field) {
    const analysis = classifyPhrase(text, field);
    if (brandClasses.has(analysis.classification) || brandExpression.test(text)) return 'brand';
    if (field==='mustBeVisible' && [SEMANTIC_CLASS.AMBIGUOUS,SEMANTIC_CLASS.ARCHITECTURAL].includes(analysis.classification)
      && explicitVisibleCarrier(text)) return 'functional';
    if ((operation.test(text) || analysis.classificationReason?.startsWith('visible_'))
      && [SEMANTIC_CLASS.FUNCTIONAL,SEMANTIC_CLASS.ARCHITECTURAL].includes(analysis.classification)) return 'functional';
    return 'unresolved';
  }
  for (const field of ['functionalNetwork','functionalRelationships','mustBeVisible','sceneProgram']) {
    if (!Array.isArray(spatial[field])) continue;
    const candidates = list(spatial[field]).map((text,index) => {
      if (kind(text,field) !== 'brand') return {index,text,retained:[text],brand:[],split:false};
      const arrow = /→|->|⇒/u.test(text);
      const parts = text.split(arrow ? /\s*(?:→|->|⇒)\s*/u : /\s*(?:[；;、]|和|与|\band\b)\s*/iu).filter(Boolean);
      // Only an explicit location prefix can be shared by coordinated items.
      const prefix = !arrow ? parts[0]?.match(/^(.+?[:：]\s*)/u)?.[1]
        || parts[0]?.match(/^(.+?(?:处|区域|区)(?:的)?)(?=.+)/u)?.[1] || '' : '';
      const classified = parts.map((part,i) => {
        const value = prefix && i>0 ? prefix+part : part;
        return {sourceFragment:part,value,kind:kind(part,field)==='brand'?'brand':kind(value,field)};
      });
      const functional = classified.filter(p=>p.kind==='functional');
      const decorative = classified.filter(p=>p.kind==='brand');
      if (parts.length>1 && decorative.length && functional.length && (!arrow || functional.length>=2)
        && classified.every(p=>p.kind!=='unresolved')) {
        return {index,text,retained:arrow?[functional.map(p=>p.value).join('→')]:functional.map(p=>p.value),
          brand:decorative.map(p=>p.value),split:true,evidenceFragments:classified};
      }
      if (parts.length===1 && !operation.test(text)) return {index,text,retained:[],brand:[text],split:false};
      unresolved.push({field,index,original:text,reason:'inseparable_or_insufficient_functional_evidence'});
      return {index,text,retained:[text],brand:[],split:false};
    });
    // Demotion alone must never empty a field and manufacture a passing packet.
    const hasFunctional = candidates.some(c=>c.retained.some(v=>kind(v,field)==='functional'));
    next[field] = candidates.flatMap(c=> {
      if (!c.brand.length) return c.retained;
      if (!hasFunctional) {
        unresolved.push({field,index:c.index,original:c.text,reason:'no_remaining_functional_evidence'});
        return [c.text];
      }
      for (const text of c.brand) if (!brand.includes(text)) brand.push(text);
      changes.push({field,index:c.index,original:c.text,retained:c.retained,
        routedTo:'brandRoleManifestation',brand:c.brand,method:c.split?'explicit_clause_separation':'brand_demotion',
        ...c.evidenceFragments?{evidenceFragments:c.evidenceFragments}:{}});
      return c.retained;
    });
  }
  if(changes.length) next.brandRoleManifestation=brand;
  return {spatial:next,changes,unresolved};
}
function normalizeSpatialFunctionalValue(value, field) {
  const text = String(value ?? "").trim();
  if (!text) return null;
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
  const text = String(value ?? "").trim();
  if (!text) return null;
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
  separateSpatialFunctionalSemantics,
  validateSpatialSemantics
};
