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
  DocumentVisualContext,
  ProjectVisualContext,
  ReferenceAnchorWarning,
  ReferenceCurrentProjectContext,
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

// ── 合并当前项目上下文（§11）──

export interface MergedCurrentProject {
  brandName: string;
  industry: string;
  logoLocked: boolean;
  logoAssetIds: string[];
  lockedFacts: string[];
  coreProducts: string[];
  businessTouchpoints: string[];
  /** 文档与视觉上下文冲突的字段说明，进入 uncertainties。 */
  conflicts: string[];
}

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

  const touchpoints = [
    ...cleanList(visual.businessTouchpoints?.packaging),
    ...cleanList(visual.businessTouchpoints?.viApplications),
    ...cleanList(visual.businessTouchpoints?.spatial),
    ...cleanList(visual.businessTouchpoints?.digital)
  ];
  const documentTouchpoints = cleanList(document?.requiredTouchpoints);

  return {
    brandName,
    industry,
    logoLocked: Boolean(visual.lockedAssets?.logoLocked),
    logoAssetIds: cleanList(visual.lockedAssets?.logoAssetIds),
    lockedFacts: [
      ...cleanList(visual.lockedAssets?.lockedFacts),
      ...cleanList(document?.lockedFacts).filter((fact) => !cleanList(visual.lockedAssets?.lockedFacts).includes(fact))
    ].slice(0, 24),
    coreProducts: mergedProducts,
    businessTouchpoints: [...new Set([...touchpoints, ...documentTouchpoints])].slice(0, 24),
    conflicts
  };
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
  now?: string;
}

export interface CompileCapsuleOutput {
  capsule: ReferenceStyleCapsule;
  warnings: ReferenceAnchorWarning[];
}

/** 编译参考风格胶囊：每类 3–5 条、参考身份进入禁止项、冲突进入 uncertainties。 */
export function compileReferenceStyleCapsule(input: CompileCapsuleInput): CompileCapsuleOutput {
  const { merged, referenceStyle } = input;
  const warnings: ReferenceAnchorWarning[] = [];

  const color = topRules(referenceStyle.colorSystem);
  const layoutAndTypography = [
    ...topRules(referenceStyle.compositionSystem, 3),
    ...topRules(referenceStyle.typographySystem, 2)
  ].slice(0, MAX_RULES_PER_CATEGORY);
  const graphicLanguage = topRules(referenceStyle.graphicLanguage);
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
  if (!graphicLanguage.length || graphicLanguage.every((rule) => rule.length < 8)) {
    warnings.push({ code: 'GRAPHIC_DIRECTION_GENERIC', message: '参考图形语言方向较弱或过于通用' });
  }

  const uncertainties = [...merged.conflicts];
  if (!merged.coreProducts.length) uncertainties.push('当前项目核心产品未确认，Anchor 中的产品内容需人工复核');
  if (!merged.industry) uncertainties.push('当前项目行业未确认');

  const anchorGoal = buildAnchorGoal(merged, input.userPreference || null, color, graphicLanguage);
  if (!color.length && !graphicLanguage.length) {
    warnings.push({ code: 'ANCHOR_DIRECTION_WEAK', message: '参考色彩与图形规则均为空，Anchor 方向可能不明确' });
  }

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
    inheritedStyle: { color, layoutAndTypography, graphicLanguage, materialAndPhotography, extensionMechanism },
    userPreference: String(input.userPreference || '').trim() || null,
    userAvoidance: cleanList(input.userAvoidance, 12),
    prohibitedReferenceIdentity: {
      brandNames: cleanList(referenceStyle.excludedIdentityTerms, 16),
      logos: ['参考方案中的任何 Logo 图形与字标'],
      slogans: ['参考方案中的任何 Slogan、广告语与品牌文案'],
      signatureGraphics: ['参考方案的专属图形、吉祥物与识别性图案'],
      proprietaryPatterns: ['参考方案的专属纹样与专有装饰体系']
    },
    anchorGoal,
    uncertainties
  };
  return { capsule, warnings };
}

function buildAnchorGoal(
  merged: MergedCurrentProject,
  preference: string | null,
  color: string[],
  graphicLanguage: string[]
): string {
  const parts: string[] = [];
  parts.push(`为「${merged.brandName || '当前项目'}」（${merged.industry || '行业待确认'}）生成一张方向基本正确的 Anchor Candidate 主视觉`);
  if (color.length) parts.push(`继承参考方案的色彩关系（如：${color[0]}）`);
  if (graphicLanguage.length) parts.push(`借鉴其图形组织方式（如：${graphicLanguage[0]}）`);
  if (preference) parts.push(`并优先体现用户继承重点：${preference}`);
  parts.push('品牌名称、Logo 与产品事实必须完全来自当前项目');
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
  return { valid: errors.length === 0, errors };
}

// ── 胶囊 Markdown（§8）──

function mdList(items: string[], empty = '- （无）'): string {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : empty;
}

export function compileCapsuleMarkdown(capsule: ReferenceStyleCapsule): string {
  const project = capsule.currentProject;
  const style = capsule.inheritedStyle;
  const prohibited = capsule.prohibitedReferenceIdentity;
  const lockedAssets = [
    ...(project.logoLocked ? ['当前项目 Logo（锁定，不可重绘）'] : []),
    ...project.lockedFacts
  ];
  const attention = [
    ...(capsule.userPreference ? [`用户继承重点：${capsule.userPreference}`] : []),
    ...capsule.userAvoidance.map((item) => `用户避免项：${item}`),
    ...capsule.uncertainties
  ];
  return [
    '# 参考风格胶囊',
    '',
    '## 1. 当前项目',
    `- 品牌：${project.brandName || '（待确认）'}`,
    `- 行业：${project.industry || '（待确认）'}`,
    `- 核心产品：${project.coreProducts.join('、') || '（待确认）'}`,
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
    `- 产品内容：只呈现当前项目真实产品（${project.coreProducts.slice(0, 3).join('、') || '以项目资料为准'}）`,
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
  const style = capsule.inheritedStyle;
  const invariants = [
    `品牌名称固定为「${project.brandName || '当前项目品牌'}」，出现在主视觉的清晰位置`,
    project.logoLocked ? '使用当前项目已锁定的 Logo 原始图形，不重绘、不变形、不换色' : '如需展示 Logo，必须使用当前项目自己的 Logo',
    ...(project.industry ? [`整体气质必须符合「${project.industry}」的行业语义`] : []),
    ...project.lockedFacts.slice(0, 4)
  ];
  const allowedChanges = [
    '背景色与辅助色可以在继承的色彩关系内灵活调整',
    '构图与版式可以在继承的版式语法内探索不同布局',
    '图形细节允许围绕当前项目元素重新绘制与延展',
    '摄影或质感表现可以按触点需要调整强度'
  ];
  const prohibitions = [
    ...(capsule.prohibitedReferenceIdentity.brandNames.length
      ? [`禁止出现参考品牌的名称与文字：${capsule.prohibitedReferenceIdentity.brandNames.join('、')}`]
      : ['禁止出现任何参考品牌的名称与文字']),
    '禁止复制参考方案的 Logo、Slogan、专属图形与专属纹样',
    '禁止把参考方案中的产品照片或产品结构当作当前项目产品',
    ...capsule.userAvoidance.map((item) => `禁止：${item}`)
  ];
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
    `- 核心产品：${project.coreProducts.join('、') || '（以项目资料为准）'}`,
    `- 业务触点：${project.businessTouchpoints.slice(0, 8).join('、') || '主视觉'}`,
    '',
    '## B. Locked Assets',
    project.logoLocked
      ? '- 当前项目 Logo 已锁定：生成时必须原样使用，不得重绘或替换'
      : '- 当前项目 Logo 未锁定：如出现 Logo，只能使用当前项目自己的标识',
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
    '- 比例 3:4 或 1:1，构图完整、主体清晰，可用于人工方向判断',
    '- 画面中的所有文字只使用当前项目品牌名称与真实产品信息',
    '- 本图仅用于确认方向：设计师确认后才进入系列延展，不作为最终交付',
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
  for (const block of ['## A.', '## B.', '## C.', '## D.', '## E.', '## F.', '## G.']) {
    if (!text.includes(block)) errors.push(`缺少 Brief 区块 ${block.replace('## ', '')}`);
  }
  for (const { pattern, label } of FORBIDDEN_BRIEF_PATTERNS) {
    if (pattern.test(text)) errors.push(`Brief 中出现禁止内容：${label}`);
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

  return {
    schemaVersion: '1.0',
    sourceRunId: probeString(run.id, root.runId) || 'legacy-run',
    currentProjectId: probeString(currentProfile.projectId, run.projectId) || 'legacy-project',
    generatedAt: new Date().toISOString(),
    currentProject: {
      brandName,
      industry: probeString(currentProfile.industry),
      logoLocked: probeStringArray(currentProfile.lockedAssets).some((item) => /logo/iu.test(item)),
      logoAssetIds: [],
      lockedFacts: probeStringArray(currentProfile.lockedAssets, currentProfile.confirmedFacts),
      coreProducts: probeStringArray(currentProfile.coreProducts),
      businessTouchpoints: probeStringArray(currentProfile.businessTouchpoints)
    },
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
      || `为「${brandName || '当前项目'}」生成一张方向基本正确的 Anchor Candidate 主视觉（由旧结果转换）。`,
    uncertainties
  };
}
