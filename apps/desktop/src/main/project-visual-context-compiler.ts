import fs from 'node:fs/promises';
import path from 'node:path';
import type { ProjectRecord, ProjectVisualContext } from '../shared/types';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write';
import type { AtomicWriteOptions } from './runtime/atomic-write';
import { isAnalysisSourceAsset } from './project-assets.ts';

/**
 * Project Visual Context Compiler
 *
 * 本地确定性编译器：在视觉方案升级报告成功保存之后运行。
 * 不调用任何模型，不改变现有报告内容，不修改 ProjectRecord 已确认事实。
 * 缺失信息进入 uncertainties；不因非关键字段缺失而失败。
 *
 * 对应开发文档：Phase 1 视觉分析接口稳定化。
 */

export const PROJECT_VISUAL_CONTEXT_SCHEMA_VERSION = '1.0';
export const PROJECT_VISUAL_CONTEXT_COMPILER_VERSION = '1.0.0';

export interface CompileProjectVisualContextInput {
  project: ProjectRecord;
  sourceRunId: string;
  analysisStructuredResult?: unknown;
  reportMarkdown: string;
  reportPath: string;
  runtimeReportPath: string;
  assetCount: number;
  imageCount: number;
  provider: string;
  model: string;
}

export interface ValidateResult {
  valid: boolean;
  errors: string[];
}

const UNKNOWN = 'unknown';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

// ---------------------------------------------------------------------------
// 报告解析辅助（纯文本启发式，失败只进 uncertainties，绝不影响主流程）
// ---------------------------------------------------------------------------

interface ReportSection {
  heading: string;
  text: string;
}

function parseReportSections(markdown: string): ReportSection[] {
  const sections: ReportSection[] = [];
  let current: ReportSection | null = null;
  for (const line of markdown.split(/\r?\n/)) {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (match) {
      const heading = match[2];
      if (heading) {
        current = { heading: heading.trim(), text: '' };
        sections.push(current);
      }
    } else if (current) {
      current.text += `${line}\n`;
    } else {
      // 文件开头的无标题内容归入一个匿名段，避免丢失信息。
      current = { heading: '', text: `${line}\n` };
      sections.push(current);
    }
  }
  return sections;
}

function sectionsMatching(sections: ReportSection[], pattern: RegExp): ReportSection[] {
  return sections.filter((section) => pattern.test(section.heading));
}

function cleanInline(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/[*`_~]/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractBullets(text: string): string[] {
  const items: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const bullet = /^\s*[-*·]\s+(.*)$/.exec(line) || /^\s*\d+[.、)]\s+(.*)$/.exec(line);
    if (bullet) {
      const value = bullet[1];
      if (value) items.push(cleanInline(value));
    }
  }
  return items;
}

function extractTableRows(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.includes('|')) continue;
    if (/^\s*\|?[\s:-]+\|?\s*$/.test(line)) continue; // 分隔行
    const cells = line
      .replace(/^\s*\|/, '')
      .replace(/\|\s*$/, '')
      .split('|')
      .map((cell) => cleanInline(cell));
    if (cells.length >= 2) rows.push(cells);
  }
  return rows;
}

function extractBoldLeads(text: string): string[] {
  const items: string[] = [];
  const regex = /\*\*([^*：:]+)[：:]\*\*/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const value = match[1];
    if (value) items.push(cleanInline(value));
  }
  return items;
}

function collectTokens(text: string, tokens: string[]): string[] {
  const found: string[] = [];
  for (const token of tokens) {
    if (text.includes(token)) found.push(token);
  }
  return found;
}

const CONFIRMED_STRUCTURE_PATTERNS = [
  /明确确认/i,
  /已确认.*(结构|包装)/i,
  /确认包装结构/i,
  /刀版图/i,
  /结构图/i,
  /真实产品实拍/i,
  /人工审核确认/i,
  /结构已锁定/i
];

const STRUCTURE_KEYWORDS = [
  '陶罐', '罐', '盒', '袋', '瓶', '杯', '碗', '桶', '礼盒', '标签', '瓶贴',
  '封签', '筷套', '餐巾', '手提袋', '罐体', '盒型', '包装', '结构'
];

const COLOR_TOKENS = [
  '辣椒红', '炭黑', '米纸白', '米白', '亚光黑', '搪瓷白', '搪瓷', '米纸',
  '红', '黑', '白', '金', '银', '蓝', '绿', '青', '橙', '黄', '紫', '灰', '粉'
];

const GRAPHIC_TOKENS = [
  '印章', '符号', '脸谱', '牛剪影', '碗口圆弧', '蒸汽', '波纹', '书法', '插画',
  '纹理', '底纹', '网格', '超级图形', '圆形冯符号', '川菜小馆章', '图案'
];

const TYPOGRAPHY_TOKENS = [
  '书写体', '手写体', '宋体', '衬线', '黑体', '粗黑', '轮廓英文', '罗马字',
  '书法', '字体家族', '标准字'
];

const MATERIAL_TOKENS = [
  '米纸', '亚光', '搪瓷', '金属', '丝印', '压凹', '发光字', '单色反白',
  '工艺', '材质', '塑料', '木', '皮革'
];

const PHOTOGRAPHY_TOKENS = [
  '实拍', '摄影', '热汤', '牛肉碗', '近景', '45度', '食欲', '真实餐食',
  '食物特写', '场景', '光线', '逆光', '蒸汽'
];

const PACKAGING_TOKENS = ['包装', '外卖包装', '餐巾', '筷套', '袋子', '礼盒', '标签', '瓶贴', '封签'];
const VI_TOKENS = ['门店招牌', '菜单', '点餐屏', '海报', '社交媒体', '封签', '名片', '主海报'];
const SPATIAL_TOKENS = ['门店', '空间', '招牌', '陈列', '环境', '墙面', '门头'];
const DIGITAL_TOKENS = ['网站', '小程序', 'App', '客户端', '社交媒体', '公众号', '电商', '官网', 'H5'];

// ---------------------------------------------------------------------------
// 身份解析（优先级：用户确认 → ProjectRecord 已保存 → Locked Facts → 报告明确事实 → detected → unknown）
// ---------------------------------------------------------------------------

function looksLikeUncertainPhrase(value: string): boolean {
  return /确认|待确认|未知|不确定|尚待|待定|待补充|不明确|暂无|信息不足|尚\b|待核实|待品牌方/.test(value);
}

function resolveIdentity(project: ProjectRecord, reportText: string): {
  projectName: string;
  brandName: string;
  industry: string;
} {
  const placeholderIndustry = '待确认（基于现有素材推断）';

  const projectName = isNonEmptyString(project.projectName)
    ? project.projectName.trim()
    : isNonEmptyString(project.detectedProjectName)
      ? project.detectedProjectName.trim()
      : UNKNOWN;

  // 品牌名：已保存字段优先，绝不拿压缩包文件名或参考方案品牌名覆盖。
  let brandName = UNKNOWN;
  if (isNonEmptyString(project.brandName)) brandName = project.brandName.trim();
  else if (isNonEmptyString(project.detectedBrandName)) brandName = project.detectedBrandName.trim();
  else {
    const fromReport = /品牌[与：:]\s*([^；;。\n]+)/.exec(reportText);
    const captured = fromReport?.[1];
    if (captured && !looksLikeUncertainPhrase(captured) && isNonEmptyString(captured)) {
      brandName = cleanInline(captured);
    }
  }

  let industry = UNKNOWN;
  if (isNonEmptyString(project.industry) && project.industry.trim() !== placeholderIndustry) {
    industry = project.industry.trim();
  } else if (isNonEmptyString(project.detectedIndustry) && project.detectedIndustry.trim() !== placeholderIndustry) {
    industry = project.detectedIndustry.trim();
  } else {
    const fromReport =
      /现有素材指向([^；;。\n]+?)(?:行业|餐饮|经营|品牌)/.exec(reportText) ||
      /行业[：:]\s*([^；;。\n]+)/.exec(reportText);
    const captured = fromReport?.[1];
    if (captured && !looksLikeUncertainPhrase(captured) && isNonEmptyString(captured)) {
      industry = cleanInline(captured);
    }
  }

  return { projectName, brandName, industry };
}

// ---------------------------------------------------------------------------
// 主编译函数
// ---------------------------------------------------------------------------

export function compileProjectVisualContext(input: CompileProjectVisualContextInput): ProjectVisualContext {
  const { project, reportMarkdown } = input;
  const allText = reportMarkdown || '';
  const sections = parseReportSections(allText);
  const uncertainties: string[] = [];

  const identity = resolveIdentity(project, allText);

  const confidence = {
    projectName: typeof project.projectNameConfidence === 'number' ? project.projectNameConfidence : identity.projectName !== UNKNOWN ? 0.9 : 0,
    brandName:
      isNonEmptyString(project.brandName) && project.factConfidence?.brandName != null
        ? project.factConfidence.brandName
        : identity.brandName !== UNKNOWN
          ? 0.6
          : 0,
    industry:
      isNonEmptyString(project.industry) && project.factConfidence?.industry != null
        ? project.factConfidence.industry
        : identity.industry !== UNKNOWN
          ? 0.6
          : 0
  };

  // Locked Assets：仅来自 logoLocked / logoFiles / lockedFacts / 人工确认资产 / 项目配置声明。
  const logoLocked = project.logoLocked !== false;
  const logoAssetIds: string[] = [];
  const lockedAssetIds = new Set<string>();
  for (const logoFile of project.logoFiles || []) {
    const asset = (project.assets || []).filter(isAnalysisSourceAsset).find(
      (candidate) => candidate.originalName === logoFile || candidate.relativePath.endsWith(logoFile)
    );
    if (asset) {
      logoAssetIds.push(asset.id);
      lockedAssetIds.add(asset.id);
    } else {
      logoAssetIds.push(logoFile);
    }
  }
  const lockedFacts = (project.lockedFacts || []).map((fact) => fact.trim()).filter(Boolean);

  // 产品
  const coreProducts = dedupe([
    ...extractBullets(sectionsMatching(sections, /核心产品|主营业务|主营产品|招牌产品|核心业务|产品线/).map((s) => s.text).join('\n')),
    ...extractBullets(sectionsMatching(sections, /产品|业务|品类|招牌/).map((s) => s.text).join('\n'))
  ]);
  const secondaryProducts = dedupe(
    extractBullets(sectionsMatching(sections, /次要产品|衍生|辅助产品|其他产品/).map((s) => s.text).join('\n'))
  );

  // 当前视觉系统
  const existingVisualAssets = (project.assets || [])
    .filter(isAnalysisSourceAsset)
    .map((asset) => asset.relativePath || asset.originalName || asset.id);
  const primaryColors = dedupe(collectTokens(allText, COLOR_TOKENS));
  const supportingColors: string[] = [];
  const graphicAssets = dedupe(collectTokens(allText, GRAPHIC_TOKENS));
  const typographySignals = dedupe(collectTokens(allText, TYPOGRAPHY_TOKENS));
  const materialSignals = dedupe(collectTokens(allText, MATERIAL_TOKENS));
  const photographySignals = dedupe(collectTokens(allText, PHOTOGRAPHY_TOKENS));

  // 包装结构：普通旧样机（陶罐/盒子/袋子等）只能为 legacy_observed，绝不自动 confirmed。
  const structures = dedupe(
    STRUCTURE_KEYWORDS.filter((keyword) => allText.includes(keyword))
  );
  const confirmedEvidence = [...lockedFacts, allText].some((candidate) =>
    CONFIRMED_STRUCTURE_PATTERNS.some((pattern) => pattern.test(candidate))
  );
  let packagingStatus: ProjectVisualContext['packaging']['status'] = 'unknown';
  const packagingEvidence: string[] = [];
  if (confirmedEvidence) {
    packagingStatus = 'confirmed';
    packagingEvidence.push('confirmed_by_locked_fact_or_explicit_statement');
  } else if (structures.length > 0 || /包装|样机|应用延展|门店应用|包装应用/.test(allText)) {
    packagingStatus = 'legacy_observed';
    packagingEvidence.push('legacy_observed_from_report_or_assets');
  } else {
    packagingEvidence.push('no_structural_evidence');
  }

  // 业务触点
  const touchPackaging = dedupe(collectTokens(allText, PACKAGING_TOKENS));
  const touchVi = dedupe(collectTokens(allText, VI_TOKENS));
  const touchSpatial = dedupe(collectTokens(allText, SPATIAL_TOKENS));
  const touchDigital = dedupe(collectTokens(allText, DIGITAL_TOKENS));

  // 评估
  const strengthSections = sectionsMatching(sections, /优势|价值|记忆|亮点|强项/);
  const visualStrengths = dedupe([
    ...extractBullets(strengthSections.map((s) => s.text).join('\n')),
    ...extractBoldLeads(strengthSections.map((s) => s.text).join('\n'))
  ]);
  const problemSections = sectionsMatching(sections, /问题|不足|缺陷|痛点/);
  const visualProblems = dedupe([
    ...extractBullets(problemSections.map((s) => s.text).join('\n')),
    ...extractBoldLeads(problemSections.map((s) => s.text).join('\n'))
  ]);
  const modifiableAssets = dedupe(
    extractTableRows(allText)
      .filter((row) => /升级|替换|新增/.test(row[1] || ''))
      .map((row) => cleanInline(row[0] || ''))
      .filter(Boolean)
  );

  // uncertainties：缺失字段进入 uncertainties（非阻断）。
  if (identity.projectName === UNKNOWN) uncertainties.push('PROJECT_VISUAL_CONTEXT_FIELD_UNKNOWN:projectName');
  if (identity.brandName === UNKNOWN) uncertainties.push('PROJECT_VISUAL_CONTEXT_FIELD_UNKNOWN:brandName');
  if (identity.industry === UNKNOWN) uncertainties.push('PROJECT_VISUAL_CONTEXT_FIELD_UNKNOWN:industry');
  if (coreProducts.length === 0) uncertainties.push('PROJECT_VISUAL_CONTEXT_FIELD_UNKNOWN:coreProducts');
  if (primaryColors.length === 0) uncertainties.push('PROJECT_VISUAL_CONTEXT_FIELD_UNKNOWN:primaryColors');
  if (packagingStatus !== 'confirmed') uncertainties.push('PACKAGING_STRUCTURE_UNCONFIRMED');
  if (logoLocked && lockedFacts.length === 0 && logoAssetIds.length === 0) {
    uncertainties.push('LOCKED_ASSET_SOURCE_UNCLEAR');
  }
  if (touchPackaging.length === 0 && touchVi.length === 0 && touchSpatial.length === 0 && touchDigital.length === 0) {
    uncertainties.push('BUSINESS_TOUCHPOINTS_INCOMPLETE');
  }

  return {
    schemaVersion: PROJECT_VISUAL_CONTEXT_SCHEMA_VERSION,
    projectId: project.id,
    sourceRunId: input.sourceRunId,
    generatedAt: new Date().toISOString(),
    identity,
    confidence,
    lockedAssets: {
      logoLocked,
      logoAssetIds,
      lockedAssetIds: [...lockedAssetIds],
      lockedFacts
    },
    products: { coreProducts, secondaryProducts },
    currentVisualSystem: {
      existingVisualAssets,
      primaryColors,
      supportingColors,
      graphicAssets,
      typographySignals,
      materialSignals,
      photographySignals
    },
    packaging: {
      structures,
      status: packagingStatus,
      evidenceSources: packagingEvidence
    },
    businessTouchpoints: {
      packaging: touchPackaging,
      viApplications: touchVi,
      spatial: touchSpatial,
      digital: touchDigital
    },
    evaluation: {
      visualStrengths,
      visualProblems,
      modifiableAssets
    },
    uncertainties,
    source: {
      reportPath: input.reportPath,
      runtimeReportPath: input.runtimeReportPath,
      assetCount: input.assetCount,
      imageCount: input.imageCount,
      provider: input.provider,
      model: input.model
    }
  };
}

// ---------------------------------------------------------------------------
// Schema 校验（轻量、可定位：每个错误带字段路径）
// ---------------------------------------------------------------------------

export function validateProjectVisualContext(context: ProjectVisualContext): ValidateResult {
  const errors: string[] = [];

  function requireString(value: unknown, field: string): void {
    if (typeof value !== 'string' || value.length === 0) errors.push(`${field} 必须是非空字符串`);
  }
  function requireNumber(value: unknown, field: string): void {
    if (typeof value !== 'number' || Number.isNaN(value)) errors.push(`${field} 必须是数字`);
  }
  function requireArray(value: unknown, field: string): void {
    if (!Array.isArray(value)) errors.push(`${field} 必须是数组`);
  }

  if (context.schemaVersion !== '1.0') errors.push('schemaVersion 必须为 "1.0"');
  requireString(context.projectId, 'projectId');
  requireString(context.sourceRunId, 'sourceRunId');
  requireString(context.generatedAt, 'generatedAt');

  if (context.identity) {
    requireString(context.identity.projectName, 'identity.projectName');
    requireString(context.identity.brandName, 'identity.brandName');
    requireString(context.identity.industry, 'identity.industry');
  } else errors.push('identity 缺失');

  if (context.confidence) {
    requireNumber(context.confidence.projectName, 'confidence.projectName');
    requireNumber(context.confidence.brandName, 'confidence.brandName');
    requireNumber(context.confidence.industry, 'confidence.industry');
  } else errors.push('confidence 缺失');

  if (context.lockedAssets) {
    if (typeof context.lockedAssets.logoLocked !== 'boolean') errors.push('lockedAssets.logoLocked 必须是布尔');
    requireArray(context.lockedAssets.logoAssetIds, 'lockedAssets.logoAssetIds');
    requireArray(context.lockedAssets.lockedAssetIds, 'lockedAssets.lockedAssetIds');
    requireArray(context.lockedAssets.lockedFacts, 'lockedAssets.lockedFacts');
  } else errors.push('lockedAssets 缺失');

  if (context.products) {
    requireArray(context.products.coreProducts, 'products.coreProducts');
    requireArray(context.products.secondaryProducts, 'products.secondaryProducts');
  } else errors.push('products 缺失');

  if (context.currentVisualSystem) {
    requireArray(context.currentVisualSystem.existingVisualAssets, 'currentVisualSystem.existingVisualAssets');
    requireArray(context.currentVisualSystem.primaryColors, 'currentVisualSystem.primaryColors');
    requireArray(context.currentVisualSystem.supportingColors, 'currentVisualSystem.supportingColors');
    requireArray(context.currentVisualSystem.graphicAssets, 'currentVisualSystem.graphicAssets');
    requireArray(context.currentVisualSystem.typographySignals, 'currentVisualSystem.typographySignals');
    requireArray(context.currentVisualSystem.materialSignals, 'currentVisualSystem.materialSignals');
    requireArray(context.currentVisualSystem.photographySignals, 'currentVisualSystem.photographySignals');
  } else errors.push('currentVisualSystem 缺失');

  if (context.packaging) {
    requireArray(context.packaging.structures, 'packaging.structures');
    if (!['confirmed', 'legacy_observed', 'unknown'].includes(context.packaging.status)) {
      errors.push('packaging.status 取值非法');
    }
    requireArray(context.packaging.evidenceSources, 'packaging.evidenceSources');
  } else errors.push('packaging 缺失');

  if (context.businessTouchpoints) {
    requireArray(context.businessTouchpoints.packaging, 'businessTouchpoints.packaging');
    requireArray(context.businessTouchpoints.viApplications, 'businessTouchpoints.viApplications');
    requireArray(context.businessTouchpoints.spatial, 'businessTouchpoints.spatial');
    requireArray(context.businessTouchpoints.digital, 'businessTouchpoints.digital');
  } else errors.push('businessTouchpoints 缺失');

  if (context.evaluation) {
    requireArray(context.evaluation.visualStrengths, 'evaluation.visualStrengths');
    requireArray(context.evaluation.visualProblems, 'evaluation.visualProblems');
    requireArray(context.evaluation.modifiableAssets, 'evaluation.modifiableAssets');
  } else errors.push('evaluation 缺失');

  requireArray(context.uncertainties, 'uncertainties');

  if (context.source) {
    requireString(context.source.reportPath, 'source.reportPath');
    requireString(context.source.runtimeReportPath, 'source.runtimeReportPath');
    requireNumber(context.source.assetCount, 'source.assetCount');
    requireNumber(context.source.imageCount, 'source.imageCount');
    requireString(context.source.provider, 'source.provider');
    requireString(context.source.model, 'source.model');
  } else errors.push('source 缺失');

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// 原子写入：写入前执行 Schema 校验；写入失败不影响旧文件。
// ---------------------------------------------------------------------------

export class ProjectVisualContextError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'ProjectVisualContextError';
    this.code = code;
  }
}

export async function writeProjectVisualContext(
  filePath: string,
  context: ProjectVisualContext,
  options: Partial<AtomicWriteOptions> = {}
): Promise<void> {
  const { valid, errors } = validateProjectVisualContext(context);
  if (!valid) {
    throw new ProjectVisualContextError(
      'PROJECT_VISUAL_CONTEXT_SCHEMA_INVALID',
      `Context Schema 校验失败：${errors.join('; ')}`
    );
  }
  const resolved = path.resolve(filePath);
  const result = await atomicWriteJsonWithRetry(resolved, context, {
    maxAttempts: 3,
    baseDelayMs: 20,
    maxDelayMs: 200,
    ...options
  });
  if (!result.success) {
    throw new ProjectVisualContextError(
      'PROJECT_VISUAL_CONTEXT_WRITE_FAILED',
      `Context 原子写入失败：${result.errorMessage || 'unknown'}`
    );
  }
}

export async function readProjectVisualContextFile(filePath: string): Promise<ProjectVisualContext> {
  const raw = await fs.readFile(path.resolve(filePath), 'utf8');
  const parsed = JSON.parse(raw) as ProjectVisualContext;
  const { valid, errors } = validateProjectVisualContext(parsed);
  if (!valid) {
    throw new ProjectVisualContextError(
      'PROJECT_VISUAL_CONTEXT_SCHEMA_INVALID',
      `Context 文件 Schema 校验失败：${errors.join('; ')}`
    );
  }
  return parsed;
}
