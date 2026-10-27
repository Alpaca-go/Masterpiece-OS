import {
  BRAND_MOTIF_TERMS,
  METAPHOR_MARKERS,
  COLOR_TERMS,
  GEOMETRY_ACTION_TERMS,
  ARCHITECTURE_TERMS,
  SPATIAL_PROPERTY_TERMS,
  COLOR_AS_ACCENT_MARKERS,
  DECORATIVE_OBJECT_TERMS
} from "./lexicons.js";
const SEMANTIC_CLASS = Object.freeze({
  ARCHITECTURAL: "architectural",
  BRAND_MOTIF: "brand_motif",
  AMBIGUOUS: "ambiguous",
  COLOR_ACCENT: "color_accent",
  COLOR_GEOMETRY: "color_geometry",
  FUNCTIONAL: "functional",
  DECORATIVE_IDENTITY: "decorative_identity",
  // R10.4.1: a decorative / artistic centerpiece or feature object. Allowed in
  // Brand Translation / optional styling as a subordinate element; NEVER as a
  // functional / operational / architectural hard requirement.
  DECORATIVE_OBJECT: "decorative_object"
});
function norm(s) {
  return String(s || "").toLowerCase().replace(/\s+/gu, " ").trim();
}
function countHits(text, terms) {
  let n = 0;
  for (const t of terms) if (text.includes(norm(t))) n += 1;
  return n;
}
function hasAny(text, terms) {
  return countHits(text, terms) > 0;
}
function hasTermAsWord(text, term) {
  if (!term) return false;
  if (/[一-鿿]/u.test(term)) return text.includes(term);
  try {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "iu");
    return re.test(text);
  } catch {
    return text.includes(term);
  }
}
const BRAND_PROVENANCE_FIELDS = /* @__PURE__ */ new Set([
  "brandIntegration",
  "brandRoleManifestation",
  "mustBeVisible",
  "positiveDifferentiators",
  "colorSystem"
]);
const FUNCTIONAL_PROVENANCE_FIELDS = /* @__PURE__ */ new Set([
  "sceneProgram",
  "functionalNetwork",
  "functionalRelationships",
  "peopleBehavior"
]);
// Scope is checked on the original proposition, before any brand clause is
// removed. These markers never grant evidence; an unresolved scope is retained.
function propositionScope(value) {
  const text = norm(value)
    // Complete architectural restrictions are not claims of absent activity.
    .replace(/\b(?:without showing room interiors|without crossing the entrance|rather than hidden in a corner)\b/gu, '')
    // Independently delimited, optional design adjuncts cannot establish the
    // subject's use. Their full grammar is still checked by the spatial gate.
    .replace(/; (?:at most one small service accessory may be included|a small blank direction carrier may sit on the threshold interface|service cues stay subordinate and may be reduced to protect the open hall)$/gu, '');
  if (/\b(?:if|unless|provided|assuming|unconfirmed|uncertain|maybe|perhaps|might|may|could|would)\b|如果|只有|除非|假如|倘若|未确认|尚未确认|待确认|不确定|可能|也许|希望|愿景|畅想/u.test(text)) return 'conditional_or_unconfirmed_scope';
  if (/\b(?:not|never|no|neither|nor|without|cannot)\b|\b(?:isn|aren|wasn|weren|don|doesn|didn|won|wouldn|can|couldn|shouldn)['’]t\b|没有|不会|尚未|未曾|并非|不是|不曾|不使用|不操作/u.test(text)) return 'negated_scope';
  return null;
}
// Modality describes the supplied wording, never its truth or confirmation.
// A prohibition marker is only a candidate: the field gate must still prove a
// complete constraint. Conditional scope takes precedence over that candidate.
function propositionModality(value) {
  const text = norm(value);
  if (/\b(?:unconfirmed|uncertain|unknown)\b|未确认|尚未确认|待确认|不确定|未知/u.test(text)) return 'unconfirmed';
  const scope = propositionScope(text);
  if (scope === 'conditional_or_unconfirmed_scope') return 'conditional';
  if (/\b(?:must not|shall not|should not|do not|cannot)\b|不得|不可|不应|禁止/u.test(text)
    || /\b(?:remain|remains|stay|stays) off frame\b/u.test(text)) return 'prohibition';
  return scope === 'negated_scope' ? 'negative_observation' : 'affirmative';
}
// A mixed visibility field needs positive evidence, not a brand/functional
// fallback. Recognize actor + concrete activity or physical effect + carrier
// relationships across service industries. These rules never infer a scene.
function visibleOperationEvidence(text) {
  if (propositionScope(text)) return null;
  // This recognizes a supplied affirmative proposition, NOT its truth or source
  // confirmation. Every operand and optional location consumes the whole unit.
  const whole = pattern => new RegExp(`^(?:${pattern})[。.!！]?$`, 'iu').test(text);
  const actor = String.raw`(?:(?:a|an|the|visible)\s+)?(?:staff|employees?|workers?|operators?|customers?|guests?|visitors?|clerks?|chefs?|receptionists?|attendants?|technicians?|servers?)\s+(?:(?:is|are)\s+)?`;
  const place = String.raw`(?:entrance|reception|storefront|kitchen|tables?|counter|(?:service|checkout|pickup|reception)\s+(?:area|counter)|retail\s+area|treatment\s+room|dining\s+area)`;
  const location = String.raw`(?:\s+(?:at|in)\s+(?:the\s+)?${place})?(?:\s+visible\s+through\s+(?:storefront|entrance)\s+glazing)?`;
  const activity = String.raw`(?:preparing\s+(?:food|dishes|equipment)|cooking\s+(?:food|dishes)|serving\s+(?:food|drinks|customers|guests)|(?:dining|eating)(?:\s+food)?|(?:browsing|selecting)\s+(?:products|merchandise|exhibits)|paying(?:\s+for\s+(?:food|products|merchandise))?|checking\s+in|(?:greeting|guiding|assisting)\s+(?:visitors|guests|customers)|handing\s+(?:parcels|food|drinks|products)\s+to\s+(?:visitors|guests|customers)|(?:packing|carrying)\s+(?:parcels|food|products)|cleaning\s+(?:tables|equipment|surfaces)|consulting\s+(?:staff|customers))`;
  const actorCjk = String.raw`(?:可见的?)?(?:厨师|店员|员工|服务员|顾客|客人|旅客|访客|接待员|工作人员|客户|技师|操作员)`;
  const placeCjk = String.raw`(?:入口|餐桌|柜台|厨房|就餐区|点餐区|等候区|门头室外|临街外侧|接待区|咨询区|工作台)`;
  const prefixCjk = String.raw`(?:正在|正|在${placeCjk}(?:旁|前|内)?)?`;
  const activityCjk = String.raw`(?:备餐|烹饪(?:食品|食物|菜品)?|制作(?:食品|食物|菜品|饮品)|用餐|就餐|点餐|(?:选购|挑选)(?:商品|产品)|结账|办理入住|(?:迎接|引导|接待|协助)(?:顾客|客人|访客)|(?:为(?:顾客|客人))?(?:递交|打包|搬运)(?:商品|包裹|食品|饮品)|清洁(?:餐桌|台面|设备)|咨询)`;
  const device = String.raw`(?:cash\s+register|payment\s+terminal|scanner|machine|equipment)`;
  const deviceAction = String.raw`(?:operating|using)\s+(?:(?:the|a|an)\s+)?${device}`;
  const action = `(?:${activity}|${deviceAction}|(?:reading|viewing)\\s+(?:(?:the|a)\\s+)?(?:menu|price list))`;
  const actionCjk = `(?:${activityCjk}|查看(?:菜单|价目表)|为(?:顾客|客人|旅客)办理入住|(?:使用|操作)(?:收银机|支付终端)收款)`;
  // Each coordinated predicate has its own known action/object and location.
  // Sharing an actor never grants an unknown second predicate permission.
  if (whole(`${actor}${action}${location}(?:\\s+and\\s+(?:${actor})?${action}${location})+`)
    || whole(`${actor}${activity}${location}`)
    || whole(`${actorCjk}${prefixCjk}${actionCjk}(?:(?:并|并且|且)${prefixCjk}${actionCjk})*`)) return 'visible_actor_activity';
  if (whole(`${actor}(?:operating|using)\\s+(?:(?:the|a|an)\\s+)?${device}${location}`)
    || whole(`${actorCjk}${prefixCjk}(?:操作|使用)(?:收银机|收银台|支付终端|扫描仪|检测设备|机器|设备)`)) return 'visible_device_operation';
  if (/^(?:(?:入口|入口处|点餐区|服务区|柜台)(?:的|处的)?\s*)?(?:菜单|价目表)(?:展示|查看|显示)?[。.!！]?$/u.test(text)
    || new RegExp(`^(?:(?:a|the)\\s+)?(?:menu|price\\s+list)(?:\\s+display|\\s+at\\s+(?:the\\s+)?${place})?[.!]?$`, 'iu').test(text)) return 'visible_service_artifact';
  const effect = String.raw`(?:visible\s+|hot\s+)?(?:steam|mist|foam|water|condensation|spray|bubbles)\s+(?:(?:rising|flowing|forming|emerging)\s+)?(?:above|over|from|on|into|in)\s+(?:(?:the|a|an)\s+)?(?:dishes|food|cups?|bowls?|trays?|products?|basins?|sinks?|glass|surfaces?|drinks?)`;
  const carrierCjk = '(?:菜品|食物|餐盘|杯|碗|托盘|商品|水槽|水池|玻璃|表面|饮品)';
  const effectCjk = '(?:蒸汽|热气|水流|水汽|泡沫|水雾|气泡)';
  if (whole(`${effect}${location}`) || whole(`${carrierCjk}(?:上方|上|中|内|表面)(?:升起|冒出|流动的|可见)?${effectCjk}`)
    || whole(`${effectCjk}(?:从|在|于)${carrierCjk}(?:上方|上|中|内|表面)?(?:升起|冒出|流出)?`)) return 'visible_effect_carrier_relation';
  // Explicit semicolon boundaries may combine evidenced operations and scoped
  // room/boundary statements. No unknown tail inherits the first clause's grant.
  const clauses = text.split(/[;；]/u).map(s => s.trim());
  if (clauses.length > 1 && clauses.every(clause => clause && (visibleOperationEvidence(clause)
    || /^(?:treatment|consultation|service) room contains (?:procedure beds|equipment)[.!]?$/iu.test(clause)
    || /^(?:reception|arrival|service) access to (?:treatment|consultation) protects privacy[.!]?$/iu.test(clause)))
    && clauses.some(clause => visibleOperationEvidence(clause))) return 'visible_actor_activity';
  return null;
}
function explicitObjectUseEvidence(text) {
  return /^(?:(?:two|paired)\s+)?(?:accessible\s+)?chairs?\s+face\s+each\s+other\s+across\s+(?:a|the)\s+(?:comparison\s+)?(?:work)?table[.!]?$/iu.test(text)
    || /^(?:an?\s+)?(?:independent\s+)?(?:comparison\s+)?worktable\s+separates\s+two\s+(?:accessible\s+)?chairs\s+facing\s+each\s+other\s+across\s+the\s+table[.!]?$/iu.test(text)
    || /^(?:service|reception) counter with an accessible staff side and customer handoff side(?: in (?:dining|service|reception) area)?[.!]?$/iu.test(text)
    || /^(?:wooden )?(?:dining|consultation) table and chairs with accessible service aisle on both sides(?: in (?:dining|consultation) area)?[.!]?$/iu.test(text)
    || /^(?:a|an) (?:pack|equipment) fitting platform and an independent comparison worktable are readable; two accessible chairs face each other across the worktable[.!]?$/iu.test(text)
    || /^separate (?:payment|service) and collection worktops remain visible, with a clear customer approach to each and an unobstructed entrance[.!]?$/iu.test(text)
    || /^two chairs sit on the same side of the (?:comparison )?worktable facing the same direction[.!]?$/iu.test(text)
    || /^两侧座椅隔台相向[，,]各自可进出[。！]?$/u.test(text);
}
function classifyPhrase(rawPhrase, sourceField = "") {
  const text = norm(rawPhrase);
  const field = String(sourceField || "");
  const motifHits = [...BRAND_MOTIF_TERMS].filter((t) => hasTermAsWord(text, t));
  // The compound for taking payment is not a silver finish specification.
  const colorText = text.replace(/收银/gu, '');
  const colorHits = [...COLOR_TERMS].filter((t) => hasTermAsWord(colorText, t));
  const archHits = countHits(text, ARCHITECTURE_TERMS);
  const propertyHits = countHits(text, SPATIAL_PROPERTY_TERMS);
  const metaphor = hasAny(text, METAPHOR_MARKERS);
  const accent = hasAny(text, COLOR_AS_ACCENT_MARKERS);
  const geometryAction = hasAny(text, GEOMETRY_ACTION_TERMS);
  const decorativeObjectHits = [...DECORATIVE_OBJECT_TERMS].filter((t) => hasTermAsWord(text, t));
  const hasMotif = motifHits.length > 0;
  const hasColor = colorHits.length > 0;
  const hasArch = archHits > 0 || propertyHits > 0 || isExplicitLayoutPhrase(rawPhrase, field);
  const hasDecorativeObject = decorativeObjectHits.length > 0;
  const brandProvenance = BRAND_PROVENANCE_FIELDS.has(field);
  const functionalProvenance = FUNCTIONAL_PROVENANCE_FIELDS.has(field);
  const visibleEvidence = field === 'mustBeVisible' ? visibleOperationEvidence(text) : null;
  let classification;
  const identityRe = /logo|wordmark|logotype|slogan|mascot|emblem|发光字|标识|标志|徽章|吉祥物|slogan艺术字|艺术字/iu;
  const hasIdentity = identityRe.test(text) || hasMotif && /logo|标识|标志|发光字/iu.test(text) || /\blogo\b/u.test(text)
    || field === 'mustBeVisible' && /signage\s+text|illuminated\s+letters|文字招牌|标语/iu.test(text);
  if (hasIdentity) {
    classification = SEMANTIC_CLASS.DECORATIVE_IDENTITY;
  } else if (!hasColor && /品牌(?:色彩|配色|视觉|图文|形象)(?:系统)?|brand\s+(?:colou?r|palette|visual|identity)(?:\s+system)?/iu.test(text)) {
    // A verbal description of a brand system does not become architecture
    // merely because it mentions layers or hierarchy.
    classification = SEMANTIC_CLASS.BRAND_MOTIF;
  } else if (hasDecorativeObject && functionalProvenance) {
    classification = SEMANTIC_CLASS.DECORATIVE_OBJECT;
  } else if (hasDecorativeObject) {
    classification = SEMANTIC_CLASS.DECORATIVE_OBJECT;
  } else if (hasColor && geometryAction && !accent) {
    classification = SEMANTIC_CLASS.COLOR_GEOMETRY;
  } else if (hasColor && accent && !hasMotif) {
    classification = SEMANTIC_CLASS.COLOR_ACCENT;
  } else if (hasMotif && (hasArch || metaphor)) {
    classification = SEMANTIC_CLASS.AMBIGUOUS;
  } else if (hasMotif || metaphor && brandProvenance && !hasArch) {
    classification = SEMANTIC_CLASS.BRAND_MOTIF;
  } else if (hasColor && !geometryAction) {
    classification = SEMANTIC_CLASS.COLOR_ACCENT;
  } else if (field === 'mustBeVisible' && explicitObjectUseEvidence(text)) {
    // Explicit object-use relationships retain their functional field authority.
    // Identity, motif, decoration and color checks above still take precedence.
    classification = SEMANTIC_CLASS.FUNCTIONAL;
  } else if (visibleEvidence) {
    classification = SEMANTIC_CLASS.FUNCTIONAL;
  } else if (!hasArch && functionalProvenance) {
    classification = SEMANTIC_CLASS.FUNCTIONAL;
  } else if (hasArch) {
    classification = SEMANTIC_CLASS.ARCHITECTURAL;
  } else {
    classification = field === 'mustBeVisible' ? SEMANTIC_CLASS.AMBIGUOUS : brandProvenance ? SEMANTIC_CLASS.BRAND_MOTIF : SEMANTIC_CLASS.FUNCTIONAL;
  }
  return {
    classification,
    ...field === 'mustBeVisible' ? {classificationReason: classification === SEMANTIC_CLASS.FUNCTIONAL
      ? visibleEvidence || 'explicit_object_use_relation'
      : classification === SEMANTIC_CLASS.AMBIGUOUS && !hasMotif && !metaphor ? 'unresolved_visible_requirement' : `existing_${classification}_rule`} : {},
    motifHits,
    colorHits,
    archHits,
    propertyHits,
    metaphor,
    accent,
    geometryAction
  };
}
// Only a complete layout statement in the dedicated structural field grants
// spatial meaning. Marketing, menu, risk and brand prose cannot use this path.
function isExplicitLayoutPhrase(text, sourceField) {
  return sourceField === 'structureLanguage' && /^(?:开放式(?:空间|布局|厨房|明档)?|明档(?:厨房|操作区)?|open[- ]plan(?: layout)?|open kitchen)[。.!！]?$/iu.test(String(text || '').trim());
}
function separateSpaceSemantics(items) {
  const buckets = {
    architectureSemantics: [],
    brandMotifSemantics: [],
    ambiguousSemantics: [],
    colorAccentSemantics: [],
    functionalSemantics: [],
    decorativeIdentitySemantics: []
  };
  for (const item of items) {
    const text = typeof item === "string" ? item : item.text;
    const sourceField = typeof item === "string" ? "" : item.sourceField;
    if (!text || !String(text).trim()) continue;
    const analysis = classifyPhrase(text, sourceField);
    const record = { text: String(text).trim(), sourceField, analysis };
    switch (analysis.classification) {
      case SEMANTIC_CLASS.ARCHITECTURAL:
        buckets.architectureSemantics.push(record);
        break;
      case SEMANTIC_CLASS.BRAND_MOTIF:
        buckets.brandMotifSemantics.push(record);
        break;
      case SEMANTIC_CLASS.AMBIGUOUS:
        buckets.ambiguousSemantics.push(record);
        break;
      case SEMANTIC_CLASS.COLOR_ACCENT:
        buckets.colorAccentSemantics.push(record);
        break;
      case SEMANTIC_CLASS.FUNCTIONAL:
        buckets.functionalSemantics.push(record);
        break;
      case SEMANTIC_CLASS.DECORATIVE_IDENTITY:
      case SEMANTIC_CLASS.COLOR_GEOMETRY:
      case SEMANTIC_CLASS.DECORATIVE_OBJECT:
      default:
        buckets.decorativeIdentitySemantics.push(record);
        break;
    }
  }
  return buckets;
}
export {
  propositionScope,
  propositionModality,
  visibleOperationEvidence,
  explicitObjectUseEvidence,
  isExplicitLayoutPhrase,
  SEMANTIC_CLASS,
  classifyPhrase,
  separateSpaceSemantics
};
