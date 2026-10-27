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
// A small compositional grammar for physical design requirements. Every noun
// phrase and relation is consumed; unknown predicates/tails cannot inherit a
// carrier's permission. This describes supplied requirements, not source truth.
function explicitSpatialRelationship(value) {
  const text = String(value).trim().replace(/[.!]$/u, '').toLowerCase();
  if (text.length > 1200) return false;
  const determiner = '(?:(?:a|an|the|one|two|each|its|at least one|one or two|at most one|a small amount of|these) )?';
  const modifiers = '(?:(?:staff and visitor|visitor and staff|reception and waiting|transparent, translucent or staggered|recessed and staggered|appropriately weighted|counter-to-waiting|conversation|curtain-like|single|blank|adjacent|closed|ordered|secondary|operational|functional|private|care|pearlescent|reception|service|consultation|waiting|arrival|visitor|staff|customer|payment|collection|comparison|equipment|pack|fitting|work|handoff|privacy|access|onward|transition|entrance|dining|retail|foreground|background|main|small|large|clear|usable|accessible|reachable|complete|entire|distinct|separate|independent|discreet|offset|screened|staggered|recessed|open|semi-open|lateral|visible|readable|legible|integrated|translucent|transparent|solid|curved|continuous|architectural|building|generous|grouped|paired|quiet|fine|thin|spaced|local|sparse|flat|clean|unlettered|real|office|neutral|warm|light|timber|restrained)(?:,? ))*';
  const noun = '(?:counter|worktops?|worktable|tables?|chairs?|seats?|seating|sofa and armchair (?:waiting )?group|sofa|armchair|group|area|zone|hall|space|approach|access|circulation|route|boundary|threshold|transition|entrances?|interface|partition|partitions|sheet interface|surfaces?|face|faces|gaps|sections|layers|edges|ceiling surfaces|wall panel|wall|return|platform|equipment|device|tablet|desk card|booklet|water tray|direction plaque|direction carrier|identity carrier|identity surface|building|art focus|pause space|waiting area seating|room interiors|interiors|sightlines|curve relationships|layering|upholstery|details|arrival|sheets|service cues|service accessory|carriers|areas)';
  const base = determiner + modifiers + noun;
  const group = base + '(?:(?:, | and | or )' + base + ')*';
  const relation = '(?:with|beside|around|across|behind|within|outside|near|on|of|to|from|toward|containing|facing|connected to|integrated with|integrated into|grouped around|continuing toward|screened by|readable from|visible from|revealing|revealing space behind|reserved as|unobstructed by)';
  const qualifier = '(?:partly free-standing|facing one another|facing each other|remain visible|are readable|without showing room interiors|without crossing the entrance|unobstructed|with circulation clear around it|with circulation around it|with clear circulation around the group|with onward room interiors hidden|rather than hidden in a corner)';
  // Optional accessories are only adjuncts to an already complete spatial unit.
  // They cannot establish the subject's visibility or become operation evidence.
  const adjunct = '(?:(?:a|one) small unlettered desk card is optional and secondary|at most one small service accessory may be included|a small blank direction carrier may sit on the threshold interface|service cues stay subordinate and may be reduced to protect the open hall|the service surface remains mostly clear|one closed unlettered service booklet and a small water tray make the stay readable|these sparse service details remain secondary to the building and the pearlescent art|private care interiors stay screened|small operational carriers remain subordinate to the complete functional areas)';
  const tail = '(?:(?:,? | and )' + relation + ' (?:' + group + '|it)|(?:,? | and )' + qualifier + '|; ' + adjunct + ')';
  // A spatial purpose or a complete relation is mandatory. A bare furniture or
  // equipment noun (including a sequence of adjectives) is never sufficient.
  // A second bare device/furniture noun cannot borrow the first subject's use.
  // Coordinated structural clauses may name their own boundary or circulation;
  // object groups are otherwise only allowed under an explicit relation.
  const structuralNoun = '(?:circulation|route|zone|threshold|transition|boundary|partitions|surfaces|sightlines|curve relationships|ceiling surfaces)';
  const subject = base + '(?:(?:, | and | or )' + determiner + modifiers + structuralNoun + ')*';
  const complete = new RegExp('^' + subject + tail + '*$', 'u');
  const qualifiedSubject = /^(?:(?:a|an|the|one|two|one or two) )?(?:(?:clear|open|lateral|foreground|complete|reachable|small|flat|clean|unlettered|legible|restrained|continuous|architectural)[:,]? )*(?:reception|consultation|waiting|visitor circulation|entrance arrival|identity surface|curve relationships|sofa and armchair waiting group)\b/u.test(text);
  const positioned = /\b(?:beside|across|behind|within|outside|near|connected to|integrated with|integrated into|grouped around|continuing toward|screened by)\b/u.test(text);
  return (qualifiedSubject || positioned) && complete.test(text);
}
function explicitVisibleCarrier(value) {
  const text = String(value).trim();
  if (explicitSpatialRelationship(text)) return true;
  // Bounded noun phrases: a named use/location must qualify the object. These
  // are supplied design requirements, not proof the object exists on site.
  const purpose = String.raw`(?:arrival|service|checkout|pickup|reception|consultation|treatment|waiting(?:\s+area)?|dining|display|retail)`;
  if (new RegExp(`^(?:(?:a|an|the)\\s+)?${purpose}\\s+(?:point|counter|area|zone|desk|table|chairs?|seats?|seating|equipment|scanner|terminal)[.!]?$`, 'iu').test(text)) return true;
  const location = '(?:入口(?:处)?|点餐区|服务区|柜台|等候区|就餐区|厨房(?:区域|区)?|咨询区|明档)';
  const object = '(?:菜单|价目表|咨询设备|专业设备|座位|座椅|桌椅|桌面|餐桌|取餐台|点餐台|砂锅)';
  if (new RegExp(`^${location}(?:内|处)?的(?:舒适)?${object}(?:(?:和|与|、)${object})?(?:/热气)?[。！]?$`, 'u').test(text)) return true;
  return /^(?:咨询桌或低桌|(?:\d+(?:[–—-]\d+)?\s*人)?咨询座位|咨询设备或轻量专业设备)[。！]?$/u.test(text)
    || /^(?:点餐|服务|取餐)区的清晰指示[。！]?$/u.test(text)
    || /^(?:厨房|操作)(?:区|区域)的部分可见性[。！]?$/u.test(text)
    || /^(?:半私密或私密边界|(?:医疗\s*\/\s*)?产品信息展示面|清晰入口与落座关系)[。！]?$/u.test(text)
    || /^(?:privacy partitions|open kitchen|(?:complex |thin |layered |curved |translucent )*(?:ceiling surfaces|partitions|wall surfaces))[.!]?$/iu.test(text);
}
function visibleRequirementAllowed(value, analysis) {
  // In particular, ambiguous motif + architecture may NEVER use carrier fallback.
  if (analysis.motifHits.length || analysis.colorHits.length || analysis.metaphor
    || GRAPHIC_IDENTITY.test(value)
    || [SEMANTIC_CLASS.DECORATIVE_IDENTITY, SEMANTIC_CLASS.DECORATIVE_OBJECT, SEMANTIC_CLASS.BRAND_MOTIF].includes(analysis.classification)) return false;
  return analysis.classification === SEMANTIC_CLASS.FUNCTIONAL || explicitVisibleCarrier(value);
}
function validateSpatialSemantics(spatial = {}) {
  const findings = [];
  for (const field of FUNCTIONAL_FIELDS) {
    for (const [index, value] of list(spatial?.[field]).entries()) {
      const analysis = classifyPhrase(value, field);
      const graphicIdentity = GRAPHIC_IDENTITY.test(value);
      const visible = field === 'mustBeVisible';
      if (visible && visibleRequirementAllowed(value, analysis)) continue;
      if (!visible && !graphicIdentity && !BLOCKED_CLASSES.has(analysis.classification)) continue;
      if (!visible && analysis.classification === SEMANTIC_CLASS.DECORATIVE_OBJECT && isSubordinateDecorativeObject(value)) {
        continue;
      }
      const classification = analysis.classification === SEMANTIC_CLASS.DECORATIVE_OBJECT ? SEMANTIC_CLASS.DECORATIVE_OBJECT : graphicIdentity ? "graphic_identity" : analysis.classification;
      findings.push({
        code: findingCode(field, analysis.classification),
        severity: "block",
        field,
        path: `mediaTranslations.spatial.${field}[${index}]`,
        classification,
        ...(visible ? {reason: 'complete_visible_evidence_required', analysis} : {})
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
  // A veto on demotion, never a positive permission: inseparable styled
  // equipment/furniture must not disappear into the brand layer either.
  const operation = /菜单|价目表|进入|离开|到达|点餐|等候|取餐|用餐|就餐|厨房|出餐|清洁|外带|座位|座椅|桌|设备|柜台|砂锅|照明|通道|通行|动线|服务|接待|办理|操作|查看|\b(?:menu|arrival|entry|entrance|exit|waiting|counter|tables?|desks?|chairs?|seats?|seating|reception|service|access|circulation|checkout|payment|staff|customers?|guests?|equipment|scanner|terminal)\b/iu;
  const brandExpression = /品牌(?:标识|符号|色彩|配色|影像|元素|内容|视觉|形象)|brand\s+(?:identity|colou?r|palette|visual|imagery|content)|^吸引力$/iu;
  function functionalFragment(text) {
    const steps = text.split(/\s*(?:→|->|⇒)\s*/u);
    if (steps.length > 1) return steps.every(functionalFragment);
    const unit = text.replace(/^(?:品牌入口|入口|点餐区|等候区|就餐区|厨房区|外带区|服务区|咨询区)[:：]\s*/u, '');
    return /^(?:(?:顾客|客人)?(?:进入|离开|到达)|菜单(?:查看|展示)?|价目表|点餐|等候|取餐(?:提示)?|用餐|就餐|厨房|出餐|清洁|外带|座位|座椅|桌椅|桌面|照明|通道|通行|接待|咨询设备|arrival|entry|entrance|exit|waiting|counter|seating|reception|service|access|circulation|checkout|payment|menu)[。.!！]?$/iu.test(unit);
  }
  function kind(text, field) {
    const analysis = classifyPhrase(text, field);
    if (brandClasses.has(analysis.classification) || brandExpression.test(text)) return 'brand';
    if (field === 'mustBeVisible') return visibleRequirementAllowed(text, analysis) ? 'functional' : 'unresolved';
    if (functionalFragment(text)
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
        return {sourceFragment:part,value,kind:kind(part,field)==='brand'?'brand':kind(value,field),analysis:classifyPhrase(value,field)};
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
  // Validate all retained values again, not only the clauses we changed. Never
  // discard a failed remainder or turn an unresolved result into a clean packet.
  const validation = validateSpatialSemantics(next);
  for (const finding of validation.findings) {
    if (!unresolved.some(item => item.field === finding.field && item.index === Number(finding.path.match(/\[(\d+)\]$/u)?.[1]))) {
      unresolved.push({field:finding.field,index:Number(finding.path.match(/\[(\d+)\]$/u)?.[1]),reason:'retained_fragment_failed_validation',finding});
    }
  }
  const evidence = ['functionalNetwork','functionalRelationships','mustBeVisible','sceneProgram'].flatMap(field =>
    list(next[field]).map((value,index) => ({field,index,value,analysis:classifyPhrase(value,field),
      semanticOnly:true,sourceConfirmation:'unchanged',
      validation:validation.findings.some(f => f.field === field && f.path.endsWith(`[${index}]`)) ? 'block'
        : field === 'sceneProgram' ? 'separation_only' : 'pass'})));
  return {spatial:next,changes,unresolved,validation,evidence};
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
