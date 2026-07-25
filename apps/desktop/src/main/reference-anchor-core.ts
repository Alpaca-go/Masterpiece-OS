/**
 * Phase 3「参考视觉转换 Anchor 工作流」纯逻辑核心。
 *
 * 职责（零 IO、零模型调用、完全确定性）：
 * - 只读合并当前项目视觉上下文与可选文档上下文（§11 文档不得覆盖项目身份）
 * - 从参考风格分析结果编译 Reference Style Capsule（§7，每类规则 3–5 条上限）
 * - 参考品牌身份隔离的确定性兜底检测（§10：品牌名 / Logo / Slogan / 专属图形）
 * - 编译胶囊 Markdown（§8）与 Anchor Generation Brief（§9，七块，1200–2500 字）
 * - Legacy 适配器：旧参考转译结果 → ReferenceStyleCapsule（§14）
 *
 * 关键词分类不作为主要创意引擎（§10）：视觉关系由模型识别（pipeline.analyzeReferenceStyle），
 * 本模块的确定性规则只负责身份污染检测、Schema 校验与禁止项兜底。
 */
import type {
  AnchorAspectRatio,
  DocumentVisualContext,
  GenerationOutputType,
  NormalizedProjectFacts,
  ProjectVisualContext,
  ReferenceAnchorWarning,
  ReferenceCurrentProjectContext,
  ReferenceMechanismRule,
  ReferenceStyleCapsule,
  ReferenceStyleProfile,
  ReferenceStyleRule
} from '../shared/types';

export const REFERENCE_STYLE_CAPSULE_SCHEMA_VERSION = '1.0';

/** §7 每类继承规则的最大条数（禁止输出几十条碎片规则）。 */
export const MAX_RULES_PER_CATEGORY = 5;

/** §9 Anchor Brief 建议长度（中文字符）。 */
export const BRIEF_MIN_LENGTH = 1200;
export const BRIEF_MAX_LENGTH = 2500;

/** §10 Anchor 默认输出比例（单值）。 */
export const DEFAULT_ANCHOR_ASPECT_RATIO: AnchorAspectRatio = '16:9';
const VALID_ASPECT_RATIOS: readonly AnchorAspectRatio[] = ['16:9', '4:5', '3:4', '1:1'];

// ── v5.3.1 §3 当前项目事实分类词表 ──

/** VI 应用物料（不得作为核心产品）。 */
const VI_APPLICATION_TERMS = [
  '名片', '工牌', '菜单', '海报', '手提袋', '贴纸', '工作服', '桌牌', '员工服饰',
  '门头', '门店招牌', 'x展架', '易拉宝', '宣传单', '折页', '优惠券', '会员卡', '台卡', '灯箱'
];
/** 服务物料（不得作为核心产品）。 */
const SERVICE_MATERIAL_TERMS = [
  '筷子套', '纸巾', '调料包', '餐具包', '湿巾包装', '湿巾', '餐垫', '杯套', '外卖袋', '打包盒', '一次性餐具'
];
/** 设计建议标记（这些不是产品事实，属于设计意见）。 */
const DESIGN_ADVICE_MARKERS = [
  '简洁设计', '突出 logo', '突出logo', '使用特种纸', '特种纸', '统一色彩', '佩戴方便',
  '高质量图片', '高质量菜品图片', '高质量菜品', '使用耐用材质', '耐用材质', '方便携带',
  '建议', '应当', '应该', '需要', '优先', '避免', '注重', '强调', '保证', '确保', '尽量'
];

function cleanList(values: unknown, limit = 24): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
    if (result.length >= limit) break;
  }
  return result;
}

function matchesAny(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some((term) => term && lower.includes(term.toLowerCase()));
}

function splitClauses(text: string): string[] {
  return String(text || '')
    .split(/[，,、;；]/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** 把一条候选事实拆成「头部主体 + 附带子句」（用于剥离「名片：简洁设计，突出 Logo」中的建议）。 */
function splitHeadAndClauses(entry: string): { head: string; clauses: string[] } {
  const parts = String(entry || '').split(/[：:]/u);
  if (parts.length >= 2 && parts[0]!.trim()) {
    return { head: parts[0]!.trim(), clauses: splitClauses(parts.slice(1).join(':')) };
  }
  const clauses = splitClauses(entry);
  return { head: clauses[0] || String(entry || '').trim(), clauses: clauses.slice(1) };
}

/** v5.3.1 §3 分类校验错误码。 */
export interface ProjectFactsClassification {
  facts: NormalizedProjectFacts;
  /** 分类过程中触发的审计码（CORE_PRODUCTS_CONTAIN_TOUCHPOINTS 等）。 */
  auditCodes: string[];
}

export interface ClassifyProjectFactsInput {
  /** 上游被误当作核心产品的候选（来自 visual.products.coreProducts / 文档 products）。 */
  candidateProducts: string[];
  services?: string[];
  packaging?: string[];
  viApplications?: string[];
  serviceMaterials?: string[];
  spatial?: string[];
  digital?: string[];
}

/**
 * v5.3.1 §3 当前项目事实分类：
 * - 名片/工牌/菜单等 → touchpoints.viApplications（不得进入 coreProducts）
 * - 筷子套/纸巾/调料包 → touchpoints.serviceMaterials
 * - 简洁设计/突出 Logo/使用特种纸 等 → designAdvice
 * - 无核心产品证据 → coreProducts=[] + uncertainties（绝不用触点补位）
 */
export function classifyProjectFacts(input: ClassifyProjectFactsInput): ProjectFactsClassification {
  const facts: NormalizedProjectFacts = {
    coreProducts: [],
    services: cleanList(input.services),
    touchpoints: {
      packaging: cleanList(input.packaging),
      viApplications: cleanList(input.viApplications),
      serviceMaterials: cleanList(input.serviceMaterials),
      spatial: cleanList(input.spatial),
      digital: cleanList(input.digital)
    },
    designAdvice: [],
    uncertainties: []
  };
  const auditSet = new Set<string>();
  let reroutedTouchpoint = false;
  let extractedAdvice = false;

  for (const raw of cleanList(input.candidateProducts, 48)) {
    const { head, clauses } = splitHeadAndClauses(raw);
    // 附带子句中的设计建议单独抽出
    for (const clause of clauses) {
      if (matchesAny(clause, DESIGN_ADVICE_MARKERS)) {
        if (!facts.designAdvice.includes(clause)) facts.designAdvice.push(clause);
        extractedAdvice = true;
      }
    }
    if (!head) continue;
    if (matchesAny(head, VI_APPLICATION_TERMS)) {
      if (!facts.touchpoints.viApplications.includes(head)) facts.touchpoints.viApplications.push(head);
      reroutedTouchpoint = true;
    } else if (matchesAny(head, SERVICE_MATERIAL_TERMS)) {
      if (!facts.touchpoints.serviceMaterials.includes(head)) facts.touchpoints.serviceMaterials.push(head);
      reroutedTouchpoint = true;
    } else if (matchesAny(head, DESIGN_ADVICE_MARKERS)) {
      if (!facts.designAdvice.includes(head)) facts.designAdvice.push(head);
      extractedAdvice = true;
    } else if (!facts.coreProducts.includes(head)) {
      facts.coreProducts.push(head);
    }
  }

  if (reroutedTouchpoint) auditSet.add('CORE_PRODUCTS_CONTAIN_TOUCHPOINTS');
  if (extractedAdvice) auditSet.add('CORE_PRODUCTS_CONTAIN_DESIGN_ADVICE');
  if (!facts.coreProducts.length) {
    auditSet.add('CORE_PRODUCTS_EMPTY_WITH_FALSE_FALLBACK');
    facts.uncertainties.push('核心产品待确认（当前素材未提供充分的真实产品证据，不得用 VI 触点补位）');
  }

  return { facts, auditCodes: [...auditSet] };
}

// ── 合并当前项目上下文（§11）──

export interface MergedCurrentProject {
  brandName: string;
  industry: string;
  logoLocked: boolean;
  logoAssetIds: string[];
  lockedFacts: string[];
  coreProducts: string[];
  businessTouchpoints: string[];
  /** v5.3.1 §3 分类后的当前项目事实（核心产品 / 触点 / 设计建议分离）。 */
  facts: NormalizedProjectFacts;
  /** v5.3.1 §3 事实分类审计码（进入 Warning Compiler）。 */
  factsAudit: string[];
  /** 文档与视觉上下文冲突的字段说明，进入 uncertainties。 */
  conflicts: string[];
}

/** 从既有 merged 视图兜底重建事实分类（用于旧缓存无 facts 的情况）。 */
export function ensureProjectFacts(merged: MergedCurrentProject): NormalizedProjectFacts {
  if (merged.facts && Array.isArray(merged.facts.coreProducts)) return merged.facts;
  return classifyProjectFacts({
    candidateProducts: merged.coreProducts,
    viApplications: merged.businessTouchpoints
  }).facts;
}

/**
 * §11 合并只读视图：优先当前项目 Visual Context；文档上下文只补充空缺，
 * 不得覆盖品牌名 / Logo / Locked Assets / 真实产品结构。冲突进入 conflicts。
 */
export function mergeCurrentProjectContext(context: ReferenceCurrentProjectContext): MergedCurrentProject {
  const visual = context.visual;
  const document = context.document;
  const conflicts: string[] = [];

  const brandName = String(visual.identity?.brandName || '').trim();
  const industry = String(visual.identity?.industry || '').trim()
    || String(document?.industry || '').trim();

  if (document) {
    const documentBrand = String(document.brandName || '').trim();
    if (documentBrand && brandName && documentBrand !== brandName) {
      conflicts.push(`文档上下文中的品牌名「${documentBrand}」与当前项目品牌名「${brandName}」不一致，以当前项目为准`);
    }
    const documentIndustry = String(document.industry || '').trim();
    const visualIndustry = String(visual.identity?.industry || '').trim();
    if (documentIndustry && visualIndustry && documentIndustry !== visualIndustry) {
      conflicts.push(`文档上下文中的行业「${documentIndustry}」与当前项目行业「${visualIndustry}」不一致，以当前项目为准`);
    }
  }

  const coreProducts = cleanList(visual.products?.coreProducts);
  const documentProducts = cleanList(document?.products);
  const mergedProducts = coreProducts.length ? coreProducts : documentProducts;
  if (coreProducts.length && documentProducts.length) {
    const missing = documentProducts.filter((item) => !coreProducts.includes(item));
    if (missing.length) {
      conflicts.push(`文档提到的产品「${missing.slice(0, 3).join('、')}」未出现在当前视觉方案中，以当前视觉方案为准`);
    }
  }

  const documentTouchpoints = cleanList(document?.requiredTouchpoints);

  // v5.3.1 §3 对候选产品与触点做严格分类：名片/工牌/菜单 等触点绝不进入 coreProducts。
  const classification = classifyProjectFacts({
    candidateProducts: mergedProducts,
    packaging: cleanList(visual.businessTouchpoints?.packaging),
    viApplications: [...cleanList(visual.businessTouchpoints?.viApplications), ...documentTouchpoints],
    spatial: cleanList(visual.businessTouchpoints?.spatial),
    digital: cleanList(visual.businessTouchpoints?.digital)
  });
  const facts = classification.facts;
  const flatTouchpoints = [
    ...facts.touchpoints.packaging,
    ...facts.touchpoints.viApplications,
    ...facts.touchpoints.serviceMaterials,
    ...facts.touchpoints.spatial,
    ...facts.touchpoints.digital
  ];

  return {
    brandName,
    industry,
    logoLocked: Boolean(visual.lockedAssets?.logoLocked),
    logoAssetIds: cleanList(visual.lockedAssets?.logoAssetIds),
    lockedFacts: [
      ...cleanList(visual.lockedAssets?.lockedFacts),
      ...cleanList(document?.lockedFacts).filter((fact) => !cleanList(visual.lockedAssets?.lockedFacts).includes(fact))
    ].slice(0, 24),
    coreProducts: facts.coreProducts,
    businessTouchpoints: [...new Set(flatTouchpoints)].slice(0, 24),
    facts,
    factsAudit: classification.auditCodes,
    conflicts
  };
}

// ── v5.3.1 §4/§5 参考专属元素抽象与回流检测 ──

/** 参考方案专属的表层元素（不得进入正向规则）。 */
const REFERENCE_SIGNATURE_SURFACE_TERMS = [
  '砂锅轮廓', '砂锅', '印章', '连纹', '专属纹样', '纹样', '吉祥物', '主海报完整构图'
];
/** §4.3 图形组织的抽象机制（只保留方法，不保留表层元素）。 */
export const ABSTRACT_GRAPHIC_MECHANISM =
  '从核心产品器物或动作中提炼单一强符号，并通过放大、裁切和重复建立系列识别';

/**
 * §5 把一条可能含表层专属元素的图形规则抽象为机制；
 * 命中表层元素时返回抽象机制 + 该表层元素（进入 prohibitedSurfaceElements）。
 */
export function abstractGraphicRule(rule: string): { rule: string; prohibitedSurface: string[] } {
  const text = String(rule || '').trim();
  const matched = REFERENCE_SIGNATURE_SURFACE_TERMS.filter((term) => text.includes(term));
  if (matched.length) return { rule: ABSTRACT_GRAPHIC_MECHANISM, prohibitedSurface: matched };
  return { rule: text, prohibitedSurface: [] };
}

export interface PositiveNegativeConflict {
  value: string;
  positivePaths: string[];
  prohibitedPaths: string[];
}

/**
 * §4.4 参考专属元素回流检测：任一正向规则中出现禁止的表层元素即为冲突（blocking）。
 * 返回冲突列表；空列表表示通过。
 */
export function detectReferenceSignatureReentry(
  positiveRules: string[],
  prohibitedSurfaceElements: string[]
): PositiveNegativeConflict[] {
  const prohibited = [...new Set(prohibitedSurfaceElements.map((item) => String(item || '').trim()).filter(Boolean))];
  const conflicts: PositiveNegativeConflict[] = [];
  for (const term of prohibited) {
    const hits = positiveRules.filter((rule) => String(rule || '').includes(term));
    if (hits.length) {
      conflicts.push({ value: term, positivePaths: hits, prohibitedPaths: ['prohibitedReferenceIdentity'] });
    }
  }
  return conflicts;
}

// ── 参考身份隔离（§10 确定性兜底）──

const LOGO_COPY_PATTERN = /(直接使用|沿用|复制|保留)[^。；\n]{0,20}(参考|对方|原)[^。；\n]{0,10}logo/iu;
const SLOGAN_PATTERN = /slogan|广告语|口号|标语/iu;
const SIGNATURE_COPY_PATTERN = /(直接使用|沿用|复制|照搬)[^。；\n]{0,20}(参考|对方)[^。；\n]{0,14}(图形|纹样|图案|符号|吉祥物|IP)/iu;

export interface IdentityLeakFinding {
  code:
    | 'REFERENCE_BRAND_IDENTITY_LEAK'
    | 'REFERENCE_LOGO_DIRECT_COPY'
    | 'REFERENCE_SLOGAN_LEAK'
    | 'REFERENCE_SIGNATURE_GRAPHIC_DIRECT_COPY';
  message: string;
  rule: string;
}

/**
 * §12 硬阻断检测：正向继承规则中不得出现参考品牌身份。
 * currentIdentityTerms 用于排除与当前项目同名的词（不算泄漏）。
 */
export function detectReferenceIdentityLeaks(
  inheritedRules: string[],
  anchorGoal: string,
  excludedIdentityTerms: string[],
  currentIdentityTerms: string[]
): IdentityLeakFinding[] {
  const findings: IdentityLeakFinding[] = [];
  const currentTerms = new Set(currentIdentityTerms.map((term) => term.toLowerCase()).filter(Boolean));
  const terms = [...new Set(excludedIdentityTerms.map((term) => String(term || '').trim()).filter(Boolean))]
    .filter((term) => term.length >= 2 && !currentTerms.has(term.toLowerCase()));
  const texts = [...inheritedRules, anchorGoal].filter(Boolean);
  for (const text of texts) {
    const lower = text.toLowerCase();
    for (const term of terms) {
      if (lower.includes(term.toLowerCase())) {
        findings.push({
          code: 'REFERENCE_BRAND_IDENTITY_LEAK',
          message: `继承规则中出现参考品牌身份词「${term}」`,
          rule: text
        });
        break;
      }
    }
    if (LOGO_COPY_PATTERN.test(text)) {
      findings.push({ code: 'REFERENCE_LOGO_DIRECT_COPY', message: '继承规则要求直接使用参考 Logo', rule: text });
    }
    if (SLOGAN_PATTERN.test(text) && /(参考|对方|原品牌)/u.test(text) && /(使用|沿用|保留|复制)/u.test(text)) {
      findings.push({ code: 'REFERENCE_SLOGAN_LEAK', message: '继承规则要求沿用参考 Slogan / 文案', rule: text });
    }
    if (SIGNATURE_COPY_PATTERN.test(text)) {
      findings.push({
        code: 'REFERENCE_SIGNATURE_GRAPHIC_DIRECT_COPY',
        message: '继承规则要求直接复制参考专属图形',
        rule: text
      });
    }
  }
  return findings;
}

// ── v5.3.1 §8 规则去重 ──

/**
 * §8.3 去重：标准化标点、去除重复前缀、合并语义相同规则、保留最具体的一条。
 * 用于 Locked Assets、视觉不变量、人工注意事项等，避免同一条锁定规则多处重复。
 */
export function dedupeBriefRules(values: string[]): string[] {
  const normalizeKey = (text: string): string =>
    String(text || '')
      .trim()
      .replace(/^[-•\d.、）)\s]+/u, '')
      .replace(/[，,。；;：:！!？?\s「」【】（）()"'`]/gu, '')
      .toLowerCase();

  const result: string[] = [];
  const kept: Array<{ key: string; index: number }> = [];
  for (const raw of values) {
    const text = String(raw || '').trim();
    if (!text) continue;
    const key = normalizeKey(text);
    if (!key) continue;
    const existingIdx = kept.findIndex((item) => item.key === key || item.key.includes(key) || key.includes(item.key));
    if (existingIdx === -1) {
      kept.push({ key, index: result.length });
      result.push(text);
      continue;
    }
    // 语义重复：保留更具体（更长）的一条。
    const existing = kept[existingIdx]!;
    if (text.length > result[existing.index]!.length) {
      result[existing.index] = text;
      existing.key = key;
    }
  }
  return result;
}

// ── v5.3.1 §6 Anchor 任务级规则过滤 ──

/** anchor_vi_system 禁止作为主规则的表达（厨师/烹饪/火焰/微距主导/空间氛围/食品广告…）。 */
const ANCHOR_BLACKLIST_TERMS = [
  '厨师', '烹饪', '下厨', '炒制', '火焰', '火苗', '锅气', '蒸汽腾腾',
  '食品微距', '食物微距', '菜品微距', '微距主导', '特写主导',
  '用餐空间', '用餐环境', '空间氛围', '空间主导', '室内氛围', '堂食氛围',
  '食品广告', '广告感', '食欲', '增强食欲', '动态抓拍', '抓拍', '动态过程'
];
/** anchor_vi_system 中降级为可选（非主导）的表达（少量真实食物辅助）。 */
const ANCHOR_OPTIONAL_TERMS = [
  '真实食物', '少量食物', '食物辅助', '食材点缀', '菜品点缀', '少量菜品'
];

export interface TaskStyleCapsule {
  outputType: GenerationOutputType;
  inheritedStyle: ReferenceStyleCapsule['inheritedStyle'];
  /** 降级为可选、不得作为画面主导的规则。 */
  optionalRules: string[];
  /** 因与任务类型冲突而移除的规则。 */
  removedRules: string[];
}

/**
 * §6.3 任务级过滤：对 anchor_vi_system，保留色彩/版式/图形组织/天然材质/静物摄影/系列延展；
 * 把「少量真实食物辅助」降级为 optional；移除烹饪过程、厨师、食品微距主导与空间氛围。
 * 其他 outputType 暂不裁剪（原样返回）。
 */
export function filterStyleCapsuleForTask(
  capsule: ReferenceStyleCapsule,
  outputType: GenerationOutputType
): TaskStyleCapsule {
  const style = capsule.inheritedStyle;
  if (outputType !== 'anchor_vi_system') {
    return { outputType, inheritedStyle: style, optionalRules: [], removedRules: [] };
  }
  const optionalRules: string[] = [];
  const removedRules: string[] = [];
  const filterCategory = (rules: string[]): string[] => {
    const kept: string[] = [];
    for (const rule of rules) {
      if (matchesAny(rule, ANCHOR_BLACKLIST_TERMS)) {
        removedRules.push(rule);
      } else if (matchesAny(rule, ANCHOR_OPTIONAL_TERMS)) {
        optionalRules.push(rule);
      } else {
        kept.push(rule);
      }
    }
    return kept;
  };
  const inheritedStyle: ReferenceStyleCapsule['inheritedStyle'] = {
    color: filterCategory(style.color),
    layoutAndTypography: filterCategory(style.layoutAndTypography),
    graphicLanguage: filterCategory(style.graphicLanguage),
    materialAndPhotography: filterCategory(style.materialAndPhotography),
    extensionMechanism: filterCategory(style.extensionMechanism)
  };
  return {
    outputType,
    inheritedStyle,
    optionalRules: dedupeBriefRules(optionalRules),
    removedRules: dedupeBriefRules(removedRules)
  };
}

// ── Capsule 编译（§7）──

function topRules(rules: ReferenceStyleRule[] | undefined, max = MAX_RULES_PER_CATEGORY): string[] {
  if (!Array.isArray(rules)) return [];
  return [...rules]
    .filter((item) => item && String(item.rule || '').trim())
    .sort((left, right) => (right.confidence || 0) - (left.confidence || 0))
    .slice(0, max)
    .map((item) => String(item.rule).trim());
}

export interface CompileCapsuleInput {
  runId: string;
  projectId: string;
  merged: MergedCurrentProject;
  referenceStyle: ReferenceStyleProfile;
  userPreference?: string | null;
  userAvoidance?: string[];
  /** v5.3.1 §10 输出比例（单值）；缺省使用系统默认 16:9。 */
  aspectRatio?: AnchorAspectRatio;
  now?: string;
}

export interface CompileCapsuleOutput {
  capsule: ReferenceStyleCapsule;
  warnings: ReferenceAnchorWarning[];
  /** v5.3.1 §5 抽象机制中间结构（图形组织已剥离表层专属元素）。 */
  mechanismRules: ReferenceMechanismRule[];
  /** v5.3.1 §4 汇总的参考表层专属元素（进入回流检测）。 */
  prohibitedSurfaceElements: string[];
}

/** v5.3.1 §10 归一化输出比例：只允许单值，缺省 16:9。 */
export function normalizeAspectRatio(input: AnchorAspectRatio | string | null | undefined): AnchorAspectRatio {
  const value = String(input || '').trim() as AnchorAspectRatio;
  return VALID_ASPECT_RATIOS.includes(value) ? value : DEFAULT_ANCHOR_ASPECT_RATIO;
}

/**
 * v5.3.1 §7 Warning Compiler：聚合事实分类审计、上下文冲突、参考表层元素风险、
 * 包装结构状态、行业置信度与 Logo 生图误差风险，产出「人工注意事项」。
 * 存在任一风险时列表非空（渲染层不得输出「暂无」）。
 */
export function compileHumanNotes(params: {
  merged: MergedCurrentProject;
  prohibitedSurfaceElements: string[];
  userPreference?: string | null;
  userAvoidance?: string[];
  extraUncertainties?: string[];
}): string[] {
  const { merged } = params;
  const notes: string[] = [];
  const audit = new Set(merged.factsAudit);
  if (audit.has('CORE_PRODUCTS_CONTAIN_TOUCHPOINTS')) {
    notes.push('当前核心产品字段曾混入名片、工牌、菜单等 VI 应用物料，已自动清洗并归类为业务触点。');
  }
  if (audit.has('CORE_PRODUCTS_CONTAIN_DESIGN_ADVICE')) {
    notes.push('当前核心产品字段曾混入「简洁设计、突出 Logo、使用特种纸」等设计建议，已自动移出为设计建议。');
  }
  if (audit.has('CORE_PRODUCTS_EMPTY_WITH_FALSE_FALLBACK') || !merged.coreProducts.length) {
    notes.push('当前核心产品待确认：现有素材未提供充分的真实产品证据，Anchor 中的产品内容需人工确认，不得用 VI 触点补位。');
  }
  if (!merged.industry) {
    notes.push('当前行业为基于现有素材推断或缺失，建议人工确认。');
  }
  const surface = [...new Set(params.prohibitedSurfaceElements.map((item) => String(item || '').trim()).filter(Boolean))];
  if (surface.length) {
    notes.push(`参考方案中的「${surface.slice(0, 4).join('、')}」等具有较强专属性，只继承其组织机制，不得直接迁移。`);
  }
  if (!merged.facts.touchpoints.packaging.length) {
    notes.push('当前包装结构未确认，Anchor 阶段只作为方向探索，不作为最终包装稿。');
  }
  notes.push('Logo 在概念生图中可能出现字形误差，正式设计阶段需由设计师人工校正。');
  for (const conflict of merged.conflicts) notes.push(conflict);
  for (const note of params.extraUncertainties || []) {
    const text = String(note || '').trim();
    if (text) notes.push(text);
  }
  return dedupeBriefRules(notes);
}

/** 编译参考风格胶囊：每类 3–5 条、参考身份进入禁止项、图形机制抽象、Warning 汇总。 */
export function compileReferenceStyleCapsule(input: CompileCapsuleInput): CompileCapsuleOutput {
  const { merged, referenceStyle } = input;
  const warnings: ReferenceAnchorWarning[] = [];
  const mechanismRules: ReferenceMechanismRule[] = [];
  const prohibitedSurfaceElements: string[] = [];

  const color = topRules(referenceStyle.colorSystem);
  const layoutAndTypography = [
    ...topRules(referenceStyle.compositionSystem, 3),
    ...topRules(referenceStyle.typographySystem, 2)
  ].slice(0, MAX_RULES_PER_CATEGORY);

  // v5.3.1 §4/§5：图形语言必须抽象为机制，剥离参考表层专属元素（砂锅/印章/连纹…）。
  const rawGraphic = topRules(referenceStyle.graphicLanguage);
  const graphicLanguage: string[] = [];
  rawGraphic.forEach((rule, index) => {
    const { rule: abstracted, prohibitedSurface } = abstractGraphicRule(rule);
    if (prohibitedSurface.length) {
      prohibitedSurfaceElements.push(...prohibitedSurface);
      mechanismRules.push({
        id: `graphic-${index + 1}`,
        category: 'graphic_organization',
        sourceDescription: rule,
        abstractMechanism: ABSTRACT_GRAPHIC_MECHANISM,
        transferMode: 'mechanism_only',
        prohibitedSurfaceElements: prohibitedSurface
      });
    }
    if (!graphicLanguage.includes(abstracted)) graphicLanguage.push(abstracted);
  });
  const dedupedGraphic = dedupeBriefRules(graphicLanguage).slice(0, MAX_RULES_PER_CATEGORY);

  const materialAndPhotography = [
    ...topRules(referenceStyle.materialSystem, 2),
    ...topRules(referenceStyle.lightingSystem, 1),
    ...topRules(referenceStyle.photographySystem, 2)
  ].slice(0, MAX_RULES_PER_CATEGORY);
  const extensionMechanism = [
    ...topRules(referenceStyle.viExtensionSystem, 3),
    ...topRules(referenceStyle.packagingPresentation, 1),
    ...topRules(referenceStyle.posterPresentation, 1)
  ].slice(0, MAX_RULES_PER_CATEGORY);

  const lowConfidence = [
    ...(referenceStyle.colorSystem || []),
    ...(referenceStyle.graphicLanguage || []),
    ...(referenceStyle.compositionSystem || [])
  ].filter((rule) => (rule?.confidence ?? 1) < 0.5);
  if (lowConfidence.length) {
    warnings.push({ code: 'STYLE_RULE_CONFIDENCE_LOW', message: `有 ${lowConfidence.length} 条参考风格规则置信度低于 0.5，建议人工复核` });
  }
  if (!dedupedGraphic.length || dedupedGraphic.every((rule) => rule.length < 8)) {
    warnings.push({ code: 'GRAPHIC_DIRECTION_GENERIC', message: '参考图形语言方向较弱或过于通用' });
  }

  const uncertainties = [...merged.conflicts];
  if (!merged.coreProducts.length) uncertainties.push('当前项目核心产品未确认，Anchor 中的产品内容需人工复核');
  if (!merged.industry) uncertainties.push('当前项目行业未确认');

  const aspectRatio = normalizeAspectRatio(input.aspectRatio);
  const anchorGoal = buildAnchorGoal(merged, input.userPreference || null, color, dedupedGraphic, aspectRatio);
  if (!color.length && !dedupedGraphic.length) {
    warnings.push({ code: 'ANCHOR_DIRECTION_WEAK', message: '参考色彩与图形规则均为空，Anchor 方向可能不明确' });
  }

  const uniqueSurface = [...new Set(prohibitedSurfaceElements)];
  const humanNotes = compileHumanNotes({
    merged,
    prohibitedSurfaceElements: uniqueSurface,
    userPreference: input.userPreference,
    userAvoidance: input.userAvoidance
  });

  const capsule: ReferenceStyleCapsule = {
    schemaVersion: '1.0',
    sourceRunId: input.runId,
    currentProjectId: input.projectId,
    generatedAt: input.now || new Date().toISOString(),
    currentProject: {
      brandName: merged.brandName,
      industry: merged.industry,
      logoLocked: merged.logoLocked,
      logoAssetIds: merged.logoAssetIds,
      lockedFacts: merged.lockedFacts,
      coreProducts: merged.coreProducts,
      businessTouchpoints: merged.businessTouchpoints
    },
    projectFacts: merged.facts,
    inheritedStyle: { color, layoutAndTypography, graphicLanguage: dedupedGraphic, materialAndPhotography, extensionMechanism },
    userPreference: String(input.userPreference || '').trim() || null,
    userAvoidance: cleanList(input.userAvoidance, 12),
    prohibitedReferenceIdentity: {
      brandNames: cleanList(referenceStyle.excludedIdentityTerms, 16),
      logos: ['参考方案中的任何 Logo 图形与字标'],
      slogans: ['参考方案中的任何 Slogan、广告语与品牌文案'],
      signatureGraphics: ['参考方案的专属图形、吉祥物与识别性图案', ...uniqueSurface],
      proprietaryPatterns: ['参考方案的专属纹样与专有装饰体系']
    },
    anchorGoal,
    aspectRatio,
    humanNotes,
    uncertainties
  };
  return { capsule, warnings, mechanismRules, prohibitedSurfaceElements: uniqueSurface };
}

function buildAnchorGoal(
  merged: MergedCurrentProject,
  preference: string | null,
  color: string[],
  graphicLanguage: string[],
  aspectRatio: AnchorAspectRatio
): string {
  const parts: string[] = [];
  parts.push(`为「${merged.brandName || '当前项目'}」（${merged.industry || '行业待确认'}）生成一张 ${aspectRatio} 的方向基本正确的 Anchor Candidate 主视觉`);
  if (color.length) parts.push(`继承参考方案的色彩关系（如：${color[0]}）`);
  if (graphicLanguage.length) parts.push(`借鉴其图形组织方法（如：${graphicLanguage[0]}）`);
  if (preference) parts.push(`并优先体现用户继承重点：${preference}`);
  parts.push('品牌名称、Logo 与产品事实必须完全来自当前项目；图形锚点须从当前项目自身产品与动作中重建');
  return `${parts.join('；')}。`;
}

// ── Schema 校验 ──

export function validateReferenceStyleCapsule(input: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const value = input as Partial<ReferenceStyleCapsule> | null | undefined;
  if (!value || typeof value !== 'object') return { valid: false, errors: ['胶囊必须是对象'] };
  if (value.schemaVersion !== '1.0') errors.push('schemaVersion 必须为 "1.0"');
  for (const key of ['sourceRunId', 'currentProjectId', 'generatedAt', 'anchorGoal'] as const) {
    if (typeof value[key] !== 'string' || !value[key]) errors.push(`${key} 必须为非空字符串`);
  }
  if (!value.currentProject || typeof value.currentProject !== 'object') {
    errors.push('currentProject 缺失');
  } else {
    if (typeof value.currentProject.brandName !== 'string') errors.push('currentProject.brandName 必须为字符串');
    if (typeof value.currentProject.logoLocked !== 'boolean') errors.push('currentProject.logoLocked 必须为布尔值');
    for (const key of ['logoAssetIds', 'lockedFacts', 'coreProducts', 'businessTouchpoints'] as const) {
      if (!Array.isArray(value.currentProject[key])) errors.push(`currentProject.${key} 必须为数组`);
    }
  }
  if (!value.inheritedStyle || typeof value.inheritedStyle !== 'object') {
    errors.push('inheritedStyle 缺失');
  } else {
    for (const key of ['color', 'layoutAndTypography', 'graphicLanguage', 'materialAndPhotography', 'extensionMechanism'] as const) {
      const rules = value.inheritedStyle[key];
      if (!Array.isArray(rules)) errors.push(`inheritedStyle.${key} 必须为数组`);
      else if (rules.length > MAX_RULES_PER_CATEGORY) errors.push(`inheritedStyle.${key} 超过 ${MAX_RULES_PER_CATEGORY} 条上限`);
    }
  }
  if (value.userPreference !== null && typeof value.userPreference !== 'string') errors.push('userPreference 必须为字符串或 null');
  if (!Array.isArray(value.userAvoidance)) errors.push('userAvoidance 必须为数组');
  if (!value.prohibitedReferenceIdentity || typeof value.prohibitedReferenceIdentity !== 'object') {
    errors.push('prohibitedReferenceIdentity 缺失');
  } else {
    for (const key of ['brandNames', 'logos', 'slogans', 'signatureGraphics', 'proprietaryPatterns'] as const) {
      if (!Array.isArray(value.prohibitedReferenceIdentity[key])) errors.push(`prohibitedReferenceIdentity.${key} 必须为数组`);
    }
  }
  if (!Array.isArray(value.uncertainties)) errors.push('uncertainties 必须为数组');

  // v5.3.1 新增必填字段校验
  if (!value.projectFacts || typeof value.projectFacts !== 'object') {
    errors.push('projectFacts 缺失');
  } else {
    for (const key of ['coreProducts', 'services', 'designAdvice', 'uncertainties'] as const) {
      if (!Array.isArray(value.projectFacts[key])) errors.push(`projectFacts.${key} 必须为数组`);
    }
    const touchpoints = value.projectFacts.touchpoints;
    if (!touchpoints || typeof touchpoints !== 'object') {
      errors.push('projectFacts.touchpoints 缺失');
    } else {
      for (const key of ['packaging', 'viApplications', 'serviceMaterials', 'spatial', 'digital'] as const) {
        if (!Array.isArray(touchpoints[key])) errors.push(`projectFacts.touchpoints.${key} 必须为数组`);
      }
    }
  }
  if (!VALID_ASPECT_RATIOS.includes(value.aspectRatio as AnchorAspectRatio)) {
    errors.push(`aspectRatio 必须为单值（${VALID_ASPECT_RATIOS.join(' / ')}），不得为「3:4 或 1:1」这类不确定表述`);
  }
  if (!Array.isArray(value.humanNotes)) errors.push('humanNotes 必须为数组');
  return { valid: errors.length === 0, errors };
}

// ── 胶囊 Markdown（§8）──

function mdList(items: string[], empty = '- （无）'): string {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : empty;
}

export function compileCapsuleMarkdown(capsule: ReferenceStyleCapsule): string {
  const project = capsule.currentProject;
  const facts = capsule.projectFacts;
  const style = capsule.inheritedStyle;
  const prohibited = capsule.prohibitedReferenceIdentity;
  // §8 Locked Assets 只列一次（品牌名称 / Logo / 固定文案 / 语言 / 其他锁定资产）。
  const lockedAssets = dedupeBriefRules([
    ...(project.brandName ? [`品牌名称：${project.brandName}`] : []),
    ...(project.logoLocked ? ['当前项目 Logo（锁定，不可重绘）'] : []),
    '简体中文输出',
    ...project.lockedFacts
  ]);
  const viApplications = facts.touchpoints.viApplications;
  // §7 人工注意事项来自 Warning Compiler（humanNotes），存在风险时非空。
  const attention = dedupeBriefRules([
    ...capsule.humanNotes,
    ...(capsule.userPreference ? [`用户继承重点：${capsule.userPreference}`] : []),
    ...capsule.userAvoidance.map((item) => `用户避免项：${item}`)
  ]);
  return [
    '# 参考风格胶囊',
    '',
    '## 1. 当前项目',
    `- 品牌：${project.brandName || '（待确认）'}`,
    `- 行业：${project.industry || '（待确认）'}`,
    `- 核心产品：${facts.coreProducts.join('、') || '（待确认）'}`,
    `- VI 应用：${viApplications.join('、') || '（待确认）'}`,
    `- Locked Assets：${lockedAssets.join('、') || '（无）'}`,
    '',
    '## 2. 本次主要继承',
    '### 色彩',
    mdList(style.color),
    '### 版式与字体',
    mdList(style.layoutAndTypography),
    '### 图形关系',
    mdList(style.graphicLanguage),
    '### 材质与摄影',
    mdList(style.materialAndPhotography),
    '### 系列延展',
    mdList(style.extensionMechanism),
    '',
    '## 3. 当前项目必须重建',
    '- 核心图形：基于当前项目自身元素重新设计，不迁移参考专属图形',
    `- 行业语义：所有视觉表达必须符合「${project.industry || '当前项目行业'}」`,
    `- 产品内容：只呈现当前项目真实产品（${facts.coreProducts.slice(0, 3).join('、') || '以项目资料为准'}）`,
    '- 品牌文案：全部使用当前项目品牌名称与文案，不出现参考品牌任何文字',
    '',
    '## 4. 禁止复制',
    `- 参考品牌名称：${prohibited.brandNames.join('、') || '（参考未检出品牌词，仍禁止出现任何参考品牌名）'}`,
    ...prohibited.logos.map((item) => `- 参考 Logo：${item}`),
    ...prohibited.slogans.map((item) => `- 参考 Slogan：${item}`),
    ...prohibited.signatureGraphics.map((item) => `- 参考专属图形：${item}`),
    ...prohibited.proprietaryPatterns.map((item) => `- 参考专属纹样：${item}`),
    '',
    '## 5. Anchor Image 目标',
    capsule.anchorGoal,
    '',
    '## 6. 人工注意事项',
    mdList(attention, '- 暂无需要特别注意的事项'),
    ''
  ].join('\n');
}

// ── Anchor Generation Brief（§9）──

const FORBIDDEN_BRIEF_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/iu, label: '内部 UUID' },
  { pattern: /PTM-?\d+/iu, label: 'PTM 编号' },
  { pattern: /Style Carrier 排名|styleCarrierRanking/iu, label: 'Style Carrier 排名表' },
  { pattern: /质量总分|quality score/iu, label: '自动质量总分' }
];

export function compileAnchorBrief(capsule: ReferenceStyleCapsule): string {
  const project = capsule.currentProject;
  const facts = capsule.projectFacts;
  // §6 Anchor 任务级过滤：只保留 anchor_vi_system 相关规则。
  const task = filterStyleCapsuleForTask(capsule, 'anchor_vi_system');
  const style = task.inheritedStyle;
  const aspectRatio = normalizeAspectRatio(capsule.aspectRatio);
  // §8/§9 视觉不变量不重复 Locked Assets；Logo 表述改为非伪精确。
  const invariants = dedupeBriefRules([
    ...(project.industry ? [`整体气质必须符合「${project.industry}」的行业语义`] : []),
    '色彩、版式、图形、材质与摄影关系在继承范围内保持一致',
    '品牌气质与当前项目定位保持统一',
    ...facts.coreProducts.slice(0, 3).map((item) => `产品呈现只使用当前项目真实产品：${item}`)
  ]);
  const allowedChanges = [
    '背景色与辅助色可以在继承的色彩关系内灵活调整',
    '构图与版式可以在继承的版式语法内探索不同布局',
    '图形细节允许围绕当前项目元素重新绘制与延展',
    '摄影或质感表现可以按触点需要调整强度'
  ];
  const prohibitions = dedupeBriefRules([
    ...(capsule.prohibitedReferenceIdentity.brandNames.length
      ? [`禁止出现参考品牌的名称与文字：${capsule.prohibitedReferenceIdentity.brandNames.join('、')}`]
      : ['禁止出现任何参考品牌的名称与文字']),
    '禁止复制参考方案的 Logo、Slogan、专属图形与专属纹样',
    ...capsule.prohibitedReferenceIdentity.signatureGraphics
      .filter((item) => !item.includes('专属图形、吉祥物'))
      .map((item) => `禁止迁移参考专属表层元素：${item}`),
    '禁止把参考方案中的产品照片或产品结构当作当前项目产品',
    '禁止以厨师、烹饪动态、火焰锅气、食品微距或用餐空间氛围作为画面主导',
    ...capsule.userAvoidance.map((item) => `禁止：${item}`)
  ]);
  const inheritedBlocks = [
    ['色彩', style.color],
    ['版式与字体', style.layoutAndTypography],
    ['图形语言', style.graphicLanguage],
    ['材质与摄影', style.materialAndPhotography],
    ['系列延展', style.extensionMechanism]
  ] as const;

  const lines: string[] = [
    '# Anchor Generation Brief',
    '',
    '## A. 当前项目身份',
    `- 品牌名称：${project.brandName || '（以项目资料为准）'}`,
    `- 行业：${project.industry || '（待人工确认）'}`,
    `- 核心产品：${facts.coreProducts.join('、') || '（待人工确认，不得用 VI 触点补位）'}`,
    `- VI 应用：${facts.touchpoints.viApplications.slice(0, 8).join('、') || '（待确认）'}`,
    '',
    '## B. Locked Assets',
    project.brandName ? `- 品牌名称：${project.brandName}（固定文案）` : '- 品牌名称：以项目资料为准',
    project.logoLocked
      ? '- 当前项目 Logo：已锁定，不得主动重新设计、替换或仿造；概念图中应保留原 Logo 的位置与基本形态，生图模型造成的字形误差由设计师在后期校正'
      : '- 当前项目 Logo：未锁定，如出现只能使用当前项目自己的标识',
    '- 语言：简体中文输出',
    mdList(project.lockedFacts, '- 无其他锁定事实'),
    '',
    '## C. 视觉不变量',
    mdList(invariants),
    '',
    '## D. 本次 Anchor 任务',
    capsule.anchorGoal,
    '',
    '本次继承的参考风格要点：',
    ...inheritedBlocks.flatMap(([label, rules]) =>
      rules.length ? [`### ${label}`, mdList(rules)] : []),
    ...(task.optionalRules.length ? ['', '可选（非主导）：', mdList(task.optionalRules)] : []),
    ...(capsule.userPreference ? ['', `用户继承重点：${capsule.userPreference}`] : []),
    '',
    '## E. 允许变化',
    mdList(allowedChanges),
    '',
    '## F. 禁止事项',
    mdList(prohibitions),
    '',
    '## G. 输出规格',
    '- 输出 1 张 Anchor Candidate 主视觉，方向正确优先于细节完美',
    `- 比例 ${aspectRatio}，构图完整、主体清晰，可用于人工方向判断`,
    '- 画面中的所有文字只使用当前项目品牌名称与真实产品信息',
    '- 本图仅用于确认方向：设计师确认后才进入系列延展，不作为最终交付',
    '',
    '## H. 人工注意事项',
    mdList(dedupeBriefRules(capsule.humanNotes), '- 暂无需要特别注意的事项'),
    ''
  ];
  return lines.join('\n');
}

export interface BriefValidation {
  valid: boolean;
  errors: string[];
  lengthChars: number;
}

/** §9 Brief 校验：七块齐全、无内部 ID/PTM/排名表、长度受控（上限硬校验，下限告警由调用方决定）。 */
export function validateAnchorBrief(markdown: string): BriefValidation {
  const errors: string[] = [];
  const text = String(markdown || '');
  if (!text.trim()) return { valid: false, errors: ['Anchor Brief 为空'], lengthChars: 0 };
  for (const block of ['## A.', '## B.', '## C.', '## D.', '## E.', '## F.', '## G.', '## H.']) {
    if (!text.includes(block)) errors.push(`缺少 Brief 区块 ${block.replace('## ', '')}`);
  }
  for (const { pattern, label } of FORBIDDEN_BRIEF_PATTERNS) {
    if (pattern.test(text)) errors.push(`Brief 中出现禁止内容：${label}`);
  }
  // §10 输出规格必须只有一个明确比例，禁止「3:4 或 1:1」这类不确定表述。
  if (/\d+\s*[:：]\s*\d+\s*(或|\/|、)\s*\d+\s*[:：]\s*\d+/u.test(text)) {
    errors.push('ANCHOR_ASPECT_RATIO_AMBIGUOUS：输出比例不明确，Brief 只允许一个比例值');
  }
  const lengthChars = text.replace(/\s/gu, '').length;
  if (lengthChars > BRIEF_MAX_LENGTH * 2) {
    errors.push(`Brief 过长（${lengthChars} 字符），超过 ${BRIEF_MAX_LENGTH * 2} 硬上限`);
  }
  return { valid: errors.length === 0, errors, lengthChars };
}

// ── Legacy 适配器（§14）──

function probeStringArray(...candidates: unknown[]): string[] {
  for (const candidate of candidates) {
    const list = cleanList(candidate);
    if (list.length) return list;
  }
  return [];
}

function probeString(...candidates: unknown[]): string {
  for (const candidate of candidates) {
    const text = String(candidate ?? '').trim();
    if (text && candidate !== undefined && candidate !== null && typeof candidate !== 'object') return text;
  }
  return '';
}

/**
 * 旧参考转译结果（reference-translation-profile / reference-style-reconstruction /
 * quality-validation 等形态）→ ReferenceStyleCapsule。
 * 尽力提取；无法识别的字段进入 uncertainties，绝不编造。
 */
export function adaptLegacyReferenceResultToStyleCapsule(input: unknown): ReferenceStyleCapsule {
  const root = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const reconstruction = (root.reconstruction && typeof root.reconstruction === 'object'
    ? root.reconstruction
    : root) as Record<string, unknown>;
  const currentProfile = (reconstruction.currentProjectProfile && typeof reconstruction.currentProjectProfile === 'object'
    ? reconstruction.currentProjectProfile
    : {}) as Record<string, unknown>;
  const referenceStyle = (reconstruction.referenceStyleProfile && typeof reconstruction.referenceStyleProfile === 'object'
    ? reconstruction.referenceStyleProfile
    : {}) as Record<string, unknown>;
  const direction = (reconstruction.visualReconstructionDirection && typeof reconstruction.visualReconstructionDirection === 'object'
    ? reconstruction.visualReconstructionDirection
    : {}) as Record<string, unknown>;
  const run = (root.run && typeof root.run === 'object' ? root.run : {}) as Record<string, unknown>;

  const legacyRules = (value: unknown, max = MAX_RULES_PER_CATEGORY): string[] => {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          return String(record.rule || record.translatedMechanism || record.mechanism || record.name || '').trim();
        }
        return '';
      })
      .filter(Boolean)
      .slice(0, max);
  };

  const brandName = probeString(currentProfile.brandName, root.brandName);
  const uncertainties: string[] = ['本胶囊由旧参考转译结果转换生成，建议人工复核后再用于 Anchor 生成'];
  if (!brandName) uncertainties.push('旧结果中未找到当前项目品牌名');

  const color = legacyRules(referenceStyle.colorSystem).length
    ? legacyRules(referenceStyle.colorSystem)
    : legacyRules(direction.colorSystem);
  const layout = [
    ...legacyRules(referenceStyle.compositionSystem, 3),
    ...legacyRules(referenceStyle.typographySystem, 2)
  ].slice(0, MAX_RULES_PER_CATEGORY);
  const graphic = legacyRules(referenceStyle.graphicLanguage).length
    ? legacyRules(referenceStyle.graphicLanguage)
    : legacyRules(direction.graphicSystem);
  const material = [
    ...legacyRules(referenceStyle.materialSystem, 3),
    ...legacyRules(referenceStyle.photographySystem, 2)
  ].slice(0, MAX_RULES_PER_CATEGORY);
  const extension = legacyRules(referenceStyle.viExtensionSystem);

  if (!color.length && !graphic.length) uncertainties.push('旧结果中未提取到可继承的色彩或图形规则');

  // v5.3.1：旧结果的 coreProducts / touchpoints 也要经过事实分类，避免名片/工牌回流。
  const legacyProducts = probeStringArray(currentProfile.coreProducts);
  const legacyTouchpoints = probeStringArray(currentProfile.businessTouchpoints);
  const classification = classifyProjectFacts({
    candidateProducts: legacyProducts,
    viApplications: legacyTouchpoints
  });
  const facts = classification.facts;
  const flatTouchpoints = [
    ...facts.touchpoints.packaging,
    ...facts.touchpoints.viApplications,
    ...facts.touchpoints.serviceMaterials,
    ...facts.touchpoints.spatial,
    ...facts.touchpoints.digital
  ];
  const logoLocked = probeStringArray(currentProfile.lockedAssets).some((item) => /logo/iu.test(item));
  const lockedFacts = probeStringArray(currentProfile.lockedAssets, currentProfile.confirmedFacts);
  const mergedLike: MergedCurrentProject = {
    brandName,
    industry: probeString(currentProfile.industry),
    logoLocked,
    logoAssetIds: [],
    lockedFacts,
    coreProducts: facts.coreProducts,
    businessTouchpoints: [...new Set(flatTouchpoints)].slice(0, 24),
    facts,
    factsAudit: classification.auditCodes,
    conflicts: []
  };
  const humanNotes = compileHumanNotes({ merged: mergedLike, prohibitedSurfaceElements: [], extraUncertainties: uncertainties });

  return {
    schemaVersion: '1.0',
    sourceRunId: probeString(run.id, root.runId) || 'legacy-run',
    currentProjectId: probeString(currentProfile.projectId, run.projectId) || 'legacy-project',
    generatedAt: new Date().toISOString(),
    currentProject: {
      brandName,
      industry: mergedLike.industry,
      logoLocked,
      logoAssetIds: [],
      lockedFacts,
      coreProducts: facts.coreProducts,
      businessTouchpoints: mergedLike.businessTouchpoints
    },
    projectFacts: facts,
    inheritedStyle: {
      color,
      layoutAndTypography: layout,
      graphicLanguage: graphic,
      materialAndPhotography: material,
      extensionMechanism: extension
    },
    userPreference: probeString(run.preference) || null,
    userAvoidance: [],
    prohibitedReferenceIdentity: {
      brandNames: probeStringArray(referenceStyle.excludedIdentityTerms),
      logos: ['参考方案中的任何 Logo 图形与字标'],
      slogans: ['参考方案中的任何 Slogan、广告语与品牌文案'],
      signatureGraphics: ['参考方案的专属图形、吉祥物与识别性图案'],
      proprietaryPatterns: ['参考方案的专属纹样与专有装饰体系']
    },
    anchorGoal: probeString(direction.coreProposition)
      || `为「${brandName || '当前项目'}」生成一张 ${DEFAULT_ANCHOR_ASPECT_RATIO} 的方向基本正确的 Anchor Candidate 主视觉（由旧结果转换）。`,
    aspectRatio: DEFAULT_ANCHOR_ASPECT_RATIO,
    humanNotes,
    uncertainties
  };
}
