import { classifyPhrase, SEMANTIC_CLASS, propositionScope, propositionModality, visibleOperationEvidence, explicitObjectUseEvidence } from "./separate-space-semantics.js";
const SPATIAL_SEMANTIC_GATE_VERSION = "space-spatial-semantic-gate@1.1.0";
const FUNCTIONAL_FIELDS = Object.freeze([
  "functionalNetwork",
  "functionalRelationships",
  "mustBeVisible",
  // R10.4.1: operationConstraints / requiredSpatialElements are also hard
  // functional fields that must never host a decorative-object requirement.
  "operationConstraints",
  "requiredSpatialElements",
  "sceneProgram"
]);
const BLOCKED_CLASSES = /* @__PURE__ */ new Set([
  SEMANTIC_CLASS.BRAND_MOTIF,
  SEMANTIC_CLASS.AMBIGUOUS,
  SEMANTIC_CLASS.COLOR_GEOMETRY,
  SEMANTIC_CLASS.DECORATIVE_IDENTITY,
  SEMANTIC_CLASS.DECORATIVE_OBJECT
]);
const GRAPHIC_IDENTITY = /brand\s+(?:graphic|story|visual)|graphic\s+identity|品牌(?:理念)?图文|品牌主图|视觉主图|图形识别/iu;
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
  // A pronoun cannot supply the target of a relation. Only the bounded
  // qualifiers above refer back to a fully parsed subject inside this unit.
  const tail = '(?:(?:,? | and )' + relation + ' ' + group + '|(?:,? | and )' + qualifier + '|; ' + adjunct + ')';
  // A spatial purpose or a complete relation is mandatory. A bare furniture or
  // equipment noun (including a sequence of adjectives) is never sufficient.
  // A second bare device/furniture noun cannot borrow the first subject's use.
  // Coordinated structural clauses may name their own boundary or circulation;
  // object groups are otherwise only allowed under an explicit relation.
  const structuralNoun = '(?:circulation|route|zone|threshold|transition|boundary|partitions|surfaces|sightlines|curve relationships|ceiling surfaces)';
  const subject = base + '(?:(?:, | and | or )' + determiner + modifiers + structuralNoun + ')*';
  // Here "it" has a locally parsed interface/partition antecedent, and only
  // denotes the space behind that boundary; it is not a free relation target.
  const boundBoundary = new RegExp('^' + determiner + modifiers + '(?:interface|sheet interface|partition)' + tail + '* revealing (?:the transition|space) behind it$', 'u');
  const complete = new RegExp('^' + subject + tail + '*$', 'u');
  const boundCounter = /^(?:reception|service) (?:service )?counter /u.test(text)
    && /with (?:a )?visitor service face /u.test(text)
    && /staff work face behind it$/u.test(text)
    && complete.test(text.replace(/behind it$/u, 'behind the counter'));
  const qualifiedSubject = /^(?:(?:a|an|the|one|two|one or two) )?(?:(?:clear|open|lateral|foreground|complete|reachable|small|flat|clean|unlettered|legible|restrained|continuous|architectural)[:,]? )*(?:reception|consultation|waiting|visitor circulation|entrance arrival|identity surface|curve relationships|sofa and armchair waiting group)\b/u.test(text);
  const positioned = /\b(?:beside|across|behind|within|outside|near|connected to|integrated with|integrated into|grouped around|continuing toward|screened by)\b/u.test(text);
  return boundBoundary.test(text) || boundCounter || (qualifiedSubject || positioned) && complete.test(text);
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
  if (new RegExp(`^${object}(?:位于|设在|放置在)${location}(?:旁|内|前|后|附近)?[。！]?$`, 'u').test(text)) return true;
  if (new RegExp(`^${location}(?:内|处)?的(?:舒适)?${object}(?:(?:和|与|、)${object})?(?:/热气)?[。！]?$`, 'u').test(text)) return true;
  return /^(?:咨询桌或低桌|(?:\d+(?:[–—-]\d+)?\s*人)?咨询座位|咨询设备或轻量专业设备)[。！]?$/u.test(text)
    || /^(?:点餐|服务|取餐)区的清晰指示[。！]?$/u.test(text)
    || /^(?:厨房|操作)(?:区|区域)的部分可见性[。！]?$/u.test(text)
    || /^(?:半私密或私密边界|(?:医疗\s*\/\s*)?产品信息展示面|清晰入口与落座关系)[。！]?$/u.test(text)
    || /^(?:privacy partitions|open kitchen|(?:complex |thin |layered |curved |translucent )*(?:ceiling surfaces|partitions|wall surfaces))[.!]?$/iu.test(text);
}
// Typed nodes and relations for the non-visibility field contracts. Source-field
// provenance and architectural keywords are classifications, never permissions.
function functionalRequirementEvidence(value, field) {
  const text = String(value).trim().replace(/[。.!！]$/u, '');
  if (propositionScope(text)) return null;
  const activity = visibleOperationEvidence(text.toLowerCase());
  if (activity) return activity;
  if (explicitObjectUseEvidence(text) || explicitSpatialRelationship(text) || explicitVisibleCarrier(text)) return 'explicit_spatial_requirement';
  const enNode = '(?:(?:the|a|an) )?(?:(?:food preparation|takeaway packaging|browsing|ordering|pickup|bakery|bread|equipment|pack|comparison|separate|payment|collection|reception|service|consultation|treatment|recovery|waiting|arrival|dining|retail|display|customer|staff|visitor|open|private|public|fitting) )*(?:arrival|entry|entrance|exit|reception|service|consultation|treatment|waiting|completion|checkout|payment|collection|fitting|seating|counter|point|zone|area|room|lounge|display|worktable|platform|aisle|queue|access|circulation|privacy boundary)';
  const zhNode = '(?:品牌入口|顾客进入|进入|离开|到达|入口(?:区|到达)?|出口(?:区)?|菜单(?:查看|展示)?|价目表|点餐(?:区|台)?|等候(?:区)?|取餐(?:区|口|台|提示)?|用餐(?:区)?|就餐(?:区)?|堂食(?:区域|就餐区)?|厨房(?:区)?|出餐(?:口)?|清洁(?:区)?|外带(?:区|取餐区|包装区|包装)?|座位|座椅|桌椅|桌面|照明|通道|通行|接待(?:区)?|咨询(?:区|设备)?|自助点餐机|人工点餐台|部分开放|烹饪展示|明档(?:展示|制作区)?|包装区)';
  const whole = pattern => new RegExp('^(?:'+pattern+')$', 'iu').test(text);
  const node = new RegExp('^(?:'+enNode+'|'+zhNode+')$', 'iu');
  if (['sceneProgram','functionalNetwork','requiredSpatialElements'].includes(field) && node.test(text)) return 'named_functional_node';
  if (field === 'sceneProgram') {
    const [label,...body] = text.split(/[:：]/u);
    if (body.length === 1 && node.test(label) && body[0].split(/[、,，]/u).every(part=>node.test(part.trim()))) return 'scoped_scene_program';
  }
  if (['functionalNetwork','functionalRelationships','operationConstraints'].includes(field)) {
    const flow = text.replace(/^(?:员工|顾客|外带)动线[:：]/u, '').replace(/，与(?:顾客动线最小交叉|堂食区域部分分离)$/u, '');
    const steps = flow.split(/\s*(?:→|->|⇒|\bto\b)\s*/u);
    if (steps.length > 1 && steps.every(step=>node.test(step))) return 'explicit_functional_sequence';
    if (whole(`guests? enter through ${enNode}(?:,|;) see ${enNode}(?:, continue to ${enNode})?`)
      || whole(`service flow loops guests? back to ${enNode} before ${enNode}`)) return 'explicit_person_route';
  }
  if (whole(`${enNode} (?:connects to|leads to|is adjacent to|is separated from) ${enNode}`)
    || whole(`guests? sees? ${enNode} from ${enNode}`)
    || whole('preserve (?:visitor|customer|patient) privacy')) return 'explicit_functional_relationship';
  if (whole(`${enNode} (?:links to|connects to) ${enNode}(?: and ${enNode})?(?:, then ${enNode}(?: and ${enNode})?|, with ${enNode} beside ${enNode}| through (?:a|an) (?:screened access route|acoustic boundary))?`)
    || whole(`${enNode} (?:contains (?:procedure beds|equipment)|supports confidential discussion)`)
    || whole(`${enNode} access (?:to ${enNode} (?:must protect (?:patient|visitor|customer) privacy|protects privacy)|protects privacy before ${enNode})`)
    || whole(`${zhNode}连接${zhNode}的通道保持通畅`)) return 'explicit_functional_relationship';
  // Position and access clauses compose only when each clause is complete.
  const position = `${enNode} (?:stays beside|remains outside) ${enNode}`;
  const access = `${enNode} separates (?:staff and visitor|visitor and staff) sides with access on both sides`;
  const approach = '(?:collection|payment|service) customers approach from the other side without crossing the entrance';
  if (whole(`(?:${position}|${access}|${approach})(?:; (?:${position}|${access}|${approach}))*`)) return 'explicit_access_relationship';
  const zhTargets = `${zhNode}(?:(?:及|和)${zhNode})*`;
  const zhRelation = `${zhNode}与${zhTargets}(?:直接|紧密|部分)?(?:相连|相邻|分隔|分离|可见|视觉统一)`;
  const zhPurpose = '(?:视觉引导清晰|便于顾客停留|减少干扰|减少交叉|形成高效服务动线|支持多场景消费)';
  if (whole(`${zhRelation}(?:，(?:${zhPurpose}|与${zhNode}(?:部分)?可见))?(?:；${zhRelation}(?:，${zhPurpose})?)?`)
    || whole(`${zhNode}独立设置`)) return 'explicit_functional_relationship';
  // Constraints are prescriptions, not evidence that an activity occurred.
  if (field === 'operationConstraints' && (whole('(?:keep|maintain) (?:the )?(?:entrance|exit|aisle|circulation) (?:clear|unobstructed)')
    || whole('保持(?:入口|出口|通道|动线)(?:畅通|清晰)'))) return 'operational_constraint';
  return null;
}
// Field permissions do not confer source truth, confirmation or shot authority.
// Bare nodes in a relationship/constraint need parent context from the caller;
// this gate never reconstructs a parent discarded by a projection adapter.
const FIELD_TYPES = Object.freeze({
  functionalNetwork: Object.freeze(['node', 'activity', 'relation', 'constraint', 'visibility_request']),
  functionalRelationships: Object.freeze(['relation', 'constraint', 'visibility_request']),
  mustBeVisible: Object.freeze(['node', 'activity', 'relation', 'visibility_request']),
  operationConstraints: Object.freeze(['relation', 'constraint', 'visibility_request']),
  requiredSpatialElements: Object.freeze(['node', 'relation', 'constraint', 'visibility_request']),
  sceneProgram: Object.freeze(['node', 'activity', 'relation', 'constraint', 'visibility_request'])
});
const NODE_EN = '(?:(?:the|a|an) )?(?:(?:food preparation|takeaway packaging|waiting area|private room|semi-private|semi-open|lightweight|secondary|flowing|clear|usable|readable|accessible|grouped|open|public|private|staff|visitor|customer|arrival|reception|waiting|service|consultation|treatment|dining|kitchen|retail|display|comparison|takeaway|storefront|entrance|privacy|main|lateral|transition) ){0,8}(?:entrance|entry|exit|arrival|reception|waiting|service|consultation|treatment|kitchen|counter|tables?|chairs?|seating|worktable|area|zone|hall|room|interiors|circulation|route|access|boundary|threshold|transition|handoff|preparation|activity|equipment|information display)';
const NODE_ROLE_ZH = '(?:入口|接待|候客|等候|咨询|点餐|取餐|就餐|外带|厨房|服务|比较|展示|艺术|到达|通行|停留|过渡|后续|洽谈|员工工作|短时交流|局部服务)';
const NODE_ZH = `(?:(?:半开放|半私密|私密|公共|正式|成组|清晰|两侧|主厅内|受屏蔽)){0,3}(?:${NODE_ROLE_ZH}{1,3}(?:与${NODE_ROLE_ZH}{1,3}){0,2})?(?:入口|出口|大厅|区|厨房|界面|通道|动线|路径|座位|座椅|餐桌|菜单|价目表|柜台|工作台|边界)`;
function matches(text, pattern) {
  return new RegExp(`^(?:${pattern})$`, 'iu').test(text);
}
function typedNode(text) {
  return matches(text, NODE_EN) || matches(text, NODE_ZH);
}
function completeConstraint(text) {
  const group = `${NODE_EN}(?: (?:and|or) ${NODE_EN})*`;
  if (matches(text, `${NODE_EN} (?:must not|shall not|should not|cannot) (?:expose|block|obstruct) ${group}`)
    || matches(text, `(?:do not|never) (?:expose|block|obstruct) ${group}`)
    || matches(text, `${group} (?:remain|remains|stay|stays) off frame`)
    || matches(text, `${NODE_ZH}(?:不得|不可|不应)(?:暴露|遮挡|堵塞)${NODE_ZH}`)
    || matches(text, `禁止(?:暴露|遮挡|堵塞)${NODE_ZH}`)) return 'prohibition';
  if (matches(text, `(?:keep|maintain) ${NODE_EN} (?:clear|unobstructed|accessible)`)
    || matches(text, `${NODE_EN} (?:keeps?|maintains?) ${NODE_EN}`)
    || matches(text, `${NODE_EN} (?:remain|remains|stay|stays) (?:accessible|clear|unobstructed)`)
    || matches(text, `${NODE_EN} is (?:primary|secondary)`)
    || matches(text, `${NODE_EN} supports (?:confidential discussion|1-to-1 / 1-to-2)`)
    || matches(text, 'preserve (?:visitor|customer|patient|consultation) privacy(?: boundary)?')
    || matches(text, `保持${NODE_ZH}(?:畅通|清晰)`)) return 'affirmative';
  return null;
}
function completeRelation(text) {
  const group = `${NODE_EN}(?: (?:and|or) ${NODE_EN})*`;
  return matches(text, `${group} (?:connects? to|leads? to|is adjacent to|is separated from|share|shares|remain visually linked across|remains visually linked across) ${group}(?: through ${NODE_EN})?`)
    || matches(text, `${NODE_EN} (?:within|beside|near|across|behind) ${NODE_EN}`)
    || matches(text, `${NODE_ZH}(?:连接|邻接|毗邻)${NODE_ZH}`)
    || matches(text, `${NODE_ZH}(?:位于|设在)${NODE_ZH}(?:旁|内|前|后|两侧)?`)
    || matches(text, `${NODE_ZH}(?:位于|设在)两侧`);
}
function visibilityRequest(text) {
  const match = text.match(/^(.+?)(?:并)?透过((?:临街)?(?:橱窗)?玻璃|橱窗)可见$/u);
  return Boolean(match && visibleOperationEvidence(match[1]))
    || matches(text, `${NODE_ZH}视线可见${NODE_ZH}(?:制作活动|服务活动)`);
}
function sourceSpan(original, text, offset = 0) {
  const start = original.indexOf(text, offset);
  return {start, end:start + text.length};
}
// Consume the complete unit before trying independent clauses. Delimiters alone
// never terminate conditional/negative scope, and unknown tails remain failures.
function recognizeUnit(value, field) {
  const text = value.trim().replace(/[。.!！]$/u, '');
  const constraint = completeConstraint(text);
  if (constraint) return {type:'constraint', modality:constraint, basis:'complete_design_constraint'};
  const modality = propositionModality(value);
  if (!['affirmative','prohibition'].includes(modality)) return null;
  if (visibilityRequest(text)) return {type:'visibility_request', basis:'explicit_sightline_request'};
  const activity = visibleOperationEvidence(text.toLowerCase());
  if (activity) return {type:activity === 'visible_service_artifact' ? 'node' : 'activity', basis:activity};
  if (explicitObjectUseEvidence(text)) return {type:'relation', basis:'explicit_object_use_relation'};
  if (explicitSpatialRelationship(text)) return {type:/(?:\b(?:with|beside|across|behind|within|near|facing|revealing)\b)/iu.test(text) ? 'relation' : 'node', basis:'explicit_spatial_requirement'};
  if (explicitVisibleCarrier(text)) return {type:/位于|设在|放置在/u.test(text) ? 'relation' : 'node', basis:'explicit_visible_carrier'};
  if (typedNode(text)) return {type:'node', basis:'named_functional_node'};
  if (completeRelation(text)) return {type:'relation', basis:'complete_spatial_relation'};
  const existing = functionalRequirementEvidence(text, field);
  if (existing) return {type:existing === 'named_functional_node' || existing === 'scoped_scene_program' ? 'node' : 'relation', basis:existing};
  // A declared scene prefix scopes the supplied body, never an invented actor.
  const prefix = text.match(/^([^:：]+)[:：]\s*(.+)$/u);
  if (prefix && typedNode(prefix[1])) {
    const body = recognizeUnit(prefix[2], field);
    if (body) return {...body, basis:'explicit_scene_scope', scopedBy:prefix[1]};
  }
  const parts = text.split(/[;；，]/u).map(s=>s.trim());
  if (parts.length > 1 && parts.every(Boolean)) {
    const units = parts.map(part=>recognizeUnit(part,field));
    if (units.every(unit=>unit && FIELD_TYPES[field]?.includes(unit.type))) {
      let cursor=0;
      const clauses=parts.map((part,i)=>{const range=sourceSpan(value,part,cursor);cursor=range.end;return {...units[i],text:part,...range};});
      return {type:units.every(u=>u.type===units[0].type) ? units[0].type : 'relation',
        types:[...new Set(units.map(u=>u.type))],basis:'complete_independent_clauses',clauses};
    }
  }
  return null;
}
function spatialSemanticEvidence(value, field, index = 0, source = null) {
  const original=typeof value === 'string' ? value : structuredClone(value);
  const path=`mediaTranslations.spatial.${field}[${index}]`;
  const parent={original,field,index,start:0,end:typeof value === 'string' ? value.length : 0};
  const modality=typeof value === 'string' ? propositionModality(value) : 'unconfirmed';
  const result={original,value:original,field,index,path,parent,source:source == null ? {kind:'source_field',path,confirmation:'unspecified'} : structuredClone(source),
    semanticOnly:true,sourceConfirmation:'unchanged',type:'unresolved',types:['unresolved'],modality,
    validation:'block',reason:null,clauses:[]};
  if (typeof value !== 'string' || !value.trim()) return {...result,reason:'invalid_semantic_unit'};
  if (value.length > 4000) return {...result,reason:'semantic_unit_too_long'};
  const analysis=classifyPhrase(value,field);
  result.analysis=analysis;
  if (['conditional','unconfirmed','negative_observation'].includes(modality)) {
    const negativeActivity=modality==='negative_observation' && (/^(?:员工|店员|工作人员|操作员)(?:没有|不会|尚未|未曾)(?:使用|操作)(?:设备|收银机|支付终端)[。！]?$/u.test(value)
      || /^(?:staff|employees|workers) (?:are not |not |never )(?:operating|using) (?:equipment|a cash register|a payment terminal)[.!]?$/iu.test(value));
    return {...result,...negativeActivity?{type:'activity',types:['activity']}:{},
      reason:modality === 'negative_observation' ? 'negated_scope' : 'conditional_or_unconfirmed_scope'};
  }
  const visible=field === 'mustBeVisible';
  const blocked=GRAPHIC_IDENTITY.test(value) || (visible
    ? analysis.motifHits.length || analysis.colorHits.length || analysis.metaphor
      || [SEMANTIC_CLASS.DECORATIVE_IDENTITY,SEMANTIC_CLASS.DECORATIVE_OBJECT,SEMANTIC_CLASS.BRAND_MOTIF].includes(analysis.classification)
    : BLOCKED_CLASSES.has(analysis.classification));
  if (blocked) return {...result,reason:'non_functional_semantics'};
  const unit=recognizeUnit(value,field);
  if (!unit) return {...result,reason:visible ? 'complete_visible_evidence_required' : 'complete_functional_evidence_required'};
  const types=unit.types??[unit.type];
  const clauses=(unit.clauses??[{...unit,text:value.trim(),...sourceSpan(value,value.trim())}])
    .map(clause=>({...clause,modality:clause.modality??modality,parent:{...parent}}));
  const allowed=types.every(type=>FIELD_TYPES[field]?.includes(type));
  return {...result,...unit,types,clauses,modality:unit.modality??modality,
    validation:allowed ? 'pass' : 'block',reason:allowed ? null : 'semantic_type_not_allowed_in_field'};
}
function validateSpatialSemantics(spatial = {}, sources = {}) {
  const findings = [];
  const evidence = [];
  for (const field of FUNCTIONAL_FIELDS) {
    if (!Object.hasOwn(spatial, field)) continue;
    if (!Array.isArray(spatial[field])) {
      const typed={...spatialSemanticEvidence(spatial[field],field,null,sources[field]),reason:'invalid_field_shape',type:'unresolved',types:['unresolved'],validation:'block'};
      evidence.push(typed);
      findings.push({code:'INVALID_SPACE_FUNCTIONAL_SEMANTICS',severity:'block',field,path:`mediaTranslations.spatial.${field}`,original:spatial[field],reason:'invalid_field_shape',evidence:typed});
      continue;
    }
    for (const [index, value] of spatial[field].entries()) {
      if (typeof value !== 'string' || !value.trim()) {
        const typed=spatialSemanticEvidence(value,field,index,sources[field]?.[index]);
        evidence.push(typed);
        findings.push({code:'INVALID_SPACE_FUNCTIONAL_SEMANTICS',severity:'block',field,path:`mediaTranslations.spatial.${field}[${index}]`,original:value,reason:'invalid_semantic_unit',evidence:typed});
        continue;
      }
      const typed = spatialSemanticEvidence(value, field, index, sources[field]?.[index]);
      evidence.push(typed);
      const analysis = typed.analysis ?? classifyPhrase(value,field);
      const graphicIdentity = GRAPHIC_IDENTITY.test(value);
      if (typed.validation === 'pass') continue;
      const classification = analysis.classification === SEMANTIC_CLASS.DECORATIVE_OBJECT ? SEMANTIC_CLASS.DECORATIVE_OBJECT : graphicIdentity ? "graphic_identity" : analysis.classification;
      findings.push({
        code: findingCode(field, analysis.classification),
        severity: "block",
        field,
        path: `mediaTranslations.spatial.${field}[${index}]`,
        classification,
        original:value,
        reason: typed.reason, analysis, evidence:typed
      });
    }
  }
  return {
    schemaVersion: "1.0",
    version: SPATIAL_SEMANTIC_GATE_VERSION,
    status: findings.length ? "block" : "pass",
    findings, evidence
  };
}
// Separate only explicit source clauses. Never remove a keyword from inside
// an inseparable proposition, invent a node, or promote a brand clause to a
// functional requirement. The original spatial object is never mutated.
function separateSpatialFunctionalSemantics(spatial = {}, sources = {}) {
  const next = structuredClone(spatial);
  const changes = [];
  const unresolved = [];
  const origins = {};
  const brand = list(spatial.brandRoleManifestation);
  const brandClasses = new Set([SEMANTIC_CLASS.DECORATIVE_IDENTITY, SEMANTIC_CLASS.BRAND_MOTIF,
    SEMANTIC_CLASS.DECORATIVE_OBJECT, SEMANTIC_CLASS.COLOR_ACCENT, SEMANTIC_CLASS.COLOR_GEOMETRY]);
  // A veto on demotion, never a positive permission: inseparable styled
  // equipment/furniture must not disappear into the brand layer either.
  const operation = /菜单|价目表|进入|离开|到达|点餐|等候|取餐|用餐|就餐|厨房|出餐|清洁|外带|座位|座椅|桌|设备|柜台|砂锅|照明|通道|通行|动线|服务|接待|办理|操作|查看|\b(?:menu|arrival|entry|entrance|exit|waiting|counter|tables?|desks?|chairs?|seats?|seating|reception|service|access|circulation|checkout|payment|staff|customers?|guests?|equipment|scanner|terminal)\b/iu;
  const brandExpression = /品牌(?:标识|符号|色彩|配色|影像|元素|内容|视觉|形象)|brand\s+(?:identity|colou?r|palette|visual|imagery|content)|^吸引力$/iu;
  function kind(text, field) {
    const typed=spatialSemanticEvidence(text,field);
    if (typed.validation === 'pass') return 'functional';
    if (typed.modality !== 'affirmative') return 'unresolved';
    const analysis = classifyPhrase(text, field);
    if (brandClasses.has(analysis.classification) || brandExpression.test(text)) return 'brand';
    return 'unresolved';
  }
  for (const field of FUNCTIONAL_FIELDS) {
    if (!Array.isArray(spatial[field])) continue;
    origins[field]=[];
    const candidates = spatial[field].map((text,index) => {
      const typed=spatialSemanticEvidence(text,field,index,sources[field]?.[index]);
      if (typeof text !== 'string' || !text.trim() || ['conditional','unconfirmed','negative_observation'].includes(typed.modality)) {
        unresolved.push({field,index,original:text,reason:typed.reason,evidence:typed});
        return {index,text,retained:[text],brand:[],split:false};
      }
      if (kind(text,field) !== 'brand') return {index,text,retained:[text],brand:[],split:false};
      const arrow = /→|->|⇒/u.test(text);
      const parts = text.split(arrow ? /\s*(?:→|->|⇒)\s*/u : /\s*(?:[；;、]|和|与|\band\b)\s*/iu).filter(Boolean);
      // Only an explicit location prefix can be shared by coordinated items.
      const prefix = !arrow ? parts[0]?.match(/^(.+?[:：]\s*)/u)?.[1]
        || parts[0]?.match(/^(.+?(?:处|区域|区)(?:的)?)(?=.+)/u)?.[1] || '' : '';
      let cursor=0;
      const classified = parts.map((part,i) => {
        const range=sourceSpan(text,part,cursor);cursor=range.end;
        const value = prefix && i>0 ? prefix+part : part;
        const brandPart = kind(part,field)==='brand';
        const content = i===0 && prefix ? part.slice(prefix.length) : part;
        // A brand-classified tail may still contain an unfinished shared-actor
        // predicate. Such a clause cannot be discarded as independent decor.
        const mixedPredicate = operation.test(content)
          || /\b(?:serving|preparing|operating|using|cleaning|checking|paying|dining|reading|viewing|assisting|browsing|cooking|guiding)\b|烹饪|收款|办理|制作/iu.test(content);
        return {sourceFragment:part,sourceRange:range,parent:{original:text,field,index,start:0,end:text.length},
          ...(prefix && i>0 ? {sharedPrefix:{text:prefix,...sourceSpan(text,prefix)}} : {}),
          value,kind:brandPart ? mixedPredicate ? 'unresolved' : 'brand' : kind(value,field),analysis:classifyPhrase(value,field),
          evidence:spatialSemanticEvidence(value,field,index,sources[field]?.[index])};
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
    const hasFunctional = candidates.some(c=>c.retained.some(v=>typeof v === 'string' && kind(v,field)==='functional'));
    next[field] = candidates.flatMap(c=> {
      const keep=values=>{for(const value of values)origins[field].push({index:c.index,original:c.text,value,fragments:c.evidenceFragments??[]});return values;};
      if (!c.brand.length) return keep(c.retained);
      if (!hasFunctional) {
        unresolved.push({field,index:c.index,original:c.text,reason:'no_remaining_functional_evidence'});
        return keep([c.text]);
      }
      for (const text of c.brand) if (!brand.includes(text)) brand.push(text);
      changes.push({field,index:c.index,original:c.text,retained:c.retained,
        routedTo:'brandRoleManifestation',brand:c.brand,method:c.split?'explicit_clause_separation':'brand_demotion',
          sourceEvidence:spatialSemanticEvidence(c.text,field,c.index,sources[field]?.[c.index]),
        ...c.evidenceFragments?{evidenceFragments:c.evidenceFragments}:{}});
      return keep(c.retained);
    });
  }
  if(changes.length) next.brandRoleManifestation=brand;
  // Validate all retained values again, not only the clauses we changed. Never
  // discard a failed remainder or turn an unresolved result into a clean packet.
  const retainedSources=Object.fromEntries(FUNCTIONAL_FIELDS.map(field=>[field,origins[field]?.map(origin=>sources[field]?.[origin.index]) ?? sources[field]]));
  const validation = validateSpatialSemantics(next,retainedSources);
  for (const finding of validation.findings) {
    if (!unresolved.some(item => item.field === finding.field && item.index === Number(finding.path.match(/\[(\d+)\]$/u)?.[1]))) {
      unresolved.push({field:finding.field,index:Number(finding.path.match(/\[(\d+)\]$/u)?.[1]),original:finding.original,reason:'retained_fragment_failed_validation',finding});
    }
  }
  const evidence = validation.evidence.map(item=>{
    const origin=origins[item.field]?.[item.index];
    if(!origin)return item;
    return {...item,outputIndex:item.index,index:origin.index,original:origin.original,
      path:`mediaTranslations.spatial.${item.field}[${origin.index}]`,
      parent:{original:origin.original,field:item.field,index:origin.index,start:0,end:typeof origin.original==='string'?origin.original.length:0},
      sourceFragments:origin.fragments};
  });
  return {spatial:next,changes,unresolved,validation,evidence};
}
function normalizeSpatialFunctionalValue(value, field) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (validateSpatialSemantics({ [field]: [text] }).status === "pass") return text;
  const separated = separateSpatialFunctionalSemantics({[field]:[text]});
  // A legacy normalizer cannot erase unresolved input. The caller's final gate
  // must see the original invalid unit, including its scope and unknown tails.
  return separated.unresolved.length ? text : separated.spatial[field].join('; ');
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
  if (propositionScope(text)) return text;
  let demoted = text;
  for (const { re, replace } of DECORATIVE_DEPENDENCY_PATTERNS) {
    demoted = demoted.replace(re, replace);
  }
  demoted = demoted.replace(/\s+/gu, " ").replace(/[，,]{2,}/gu, "\uFF0C").trim();
  if (demoted && demoted !== text && validateSpatialSemantics({ [field]: [demoted] }).status === "pass") {
    return demoted;
  }
  const analysis = classifyPhrase(text, field);
  // Preserve unknown functional prose for the final blocking gate. Do not
  // cherry-pick a valid clause and discard the rest of the proposition.
  return BLOCKED_CLASSES.has(analysis.classification) ? null : text;
}
function normalizeFunctionalHardConstraint(value, field) {
  const viaIdentity = normalizeSpatialFunctionalValue(value, field);
  if (viaIdentity !== null && viaIdentity !== value) return viaIdentity;
  return demoteDecorativeObjectFromFunctionalLayer(value, field);
}
export {
  FIELD_TYPES,
  spatialSemanticEvidence,
  SPATIAL_SEMANTIC_GATE_VERSION,
  demoteDecorativeObjectFromFunctionalLayer,
  normalizeFunctionalHardConstraint,
  normalizeSpatialFunctionalValue,
  separateSpatialFunctionalSemantics,
  validateSpatialSemantics
};
