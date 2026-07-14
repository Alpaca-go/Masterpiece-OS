import { unique } from './utils.js';

const PENDING = '待确认（需逐张查看视觉素材后补充）';

function clean(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function strings(value) {
  return unique((Array.isArray(value) ? value : value ? [value] : [])
    .map((item) => clean(item))
    .filter(Boolean));
}

function configuredSection(value, fallbackSummary, fallbackEvidence = []) {
  if (typeof value === 'string') return { summary: value.trim(), evidence: strings(fallbackEvidence) };
  return {
    summary: clean(value?.summary || value?.type || value?.direction) || fallbackSummary,
    evidence: strings(value?.evidence || fallbackEvidence)
  };
}

function inspectionStatus(inventory, config) {
  const inspection = config.visualInspection || {};
  const namedFiles = strings(inspection.inspectedImages || inspection.files);
  const inspectedImageCount = Math.max(0, Number(inspection.inspectedImageCount) || namedFiles.length);
  const verified = inspection.verified === true && inventory.imageCount > 0 && inspectedImageCount >= inventory.imageCount;
  return {
    verified,
    inspectedImageCount,
    totalImages: inventory.imageCount,
    findings: strings(inspection.findings || inspection.notes),
    status: verified
      ? `已记录逐张画面核验：${inspectedImageCount}/${inventory.imageCount} 张图片。`
      : `视觉核验未闭环：已记录 ${inspectedImageCount}/${inventory.imageCount} 张；未确认内容必须保持“待确认”，不得仅凭文件名、OCR、尺寸或元数据补写。`
  };
}

function fallbackKeywords(brand, benchmarks) {
  const values = [];
  const temperamentWords = strings((brand.fontTemperament || '').split(/[、，,；;\s]+/)).slice(0, 3);
  for (const keyword of temperamentWords) values.push({ keyword, reason: `来自 Brand Lock 的字体与视觉气质：“${brand.fontTemperament}”。` });
  const industry = benchmarks.industry.value || '';
  const industryKeyword = /餐饮|食品/.test(industry) ? '食欲感' : /文旅|文化|文创/.test(industry) ? '文化感' : /科技|互联网/.test(industry) ? '理性' : '高识别';
  values.push({ keyword: industryKeyword, reason: `项目行业被识别为“${industry}”，视觉语言需要服务该品类的核心体验。` });
  if (brand.coreVisualAssets.length) values.push({ keyword: '系统化', reason: `已识别 ${brand.coreVisualAssets.length} 项核心视觉资产，需要以同一规则跨触点复用。` });
  return values.filter((item, index, items) => items.findIndex((candidate) => candidate.keyword === item.keyword) === index).slice(0, 6);
}

function normalizeKeywords(value, brand, benchmarks) {
  if (!Array.isArray(value) || !value.length) return fallbackKeywords(brand, benchmarks);
  return value.map((item) => typeof item === 'string'
    ? { keyword: item, reason: '由项目负责人写入 Creative Reasoning 配置。' }
    : { keyword: clean(item.keyword || item.name) || '待确认', reason: clean(item.reason) || '原因待确认。' });
}

function dnaDirection(value, fallback) {
  return clean(typeof value === 'string' ? value : value?.direction || value?.summary) || fallback;
}

function normalizeRisk(item) {
  return {
    problem: clean(item?.problem) || '待确认的设计风险',
    reason: clean(item?.reason) || '当前视觉证据不足，原因待确认。',
    prevention: clean(item?.prevention || item?.avoid || item?.solution) || '补充逐张视觉核验后再决定，当前不得自行推断。'
  };
}

function fallbackRisks(inspection, brand) {
  const risks = [];
  if (!inspection.verified) risks.push(normalizeRisk({
    problem: 'Creative Reasoning 缺少完整逐张视觉核验',
    reason: inspection.status,
    prevention: '完整查看每张图片并在 visualInspection 中记录核验数量与画面发现，再冻结视觉 DNA。'
  }));
  if (!brand.logo.files.length) risks.push(normalizeRisk({
    problem: '新增画面可能虚构或误用 Logo',
    reason: '当前没有已确认的 Logo 素材。',
    prevention: '在获得授权 Logo 文件前只保留后期置入区，不生成、不重绘标志。'
  }));
  if (!brand.primaryColor) risks.push(normalizeRisk({
    problem: '系列图片容易发生色彩漂移',
    reason: 'Brand Lock 尚未确认主色。',
    prevention: '先确认主辅色值和使用比例，再开始系列图片生产。'
  }));
  if (brand.packaging.some((item) => /待确认/.test(item))) risks.push(normalizeRisk({
    problem: '包装结构可能被效果图反向发明',
    reason: '现有包装描述包含待确认的结构、材质或用途。',
    prevention: '未确认结构不得生成；先冻结盒型、尺寸、材质、封口和装载关系。'
  }));
  risks.push(normalizeRisk({
    problem: '图片任务可能只追求单张效果而脱离品牌',
    reason: '任务数量增加时，色彩、构图、摄影和资产层级容易各自变化。',
    prevention: '每张任务默认继承同一品牌设计意图，并按视觉 DNA 进行系列验收。'
  }));
  return risks.slice(0, 5);
}

export function buildCreativeReasoning(inventory, brand, benchmarks, config = {}) {
  const supplied = config.creativeReasoning || {};
  const inspection = inspectionStatus(inventory, config);
  const positioning = configuredSection(supplied.positioning,
    benchmarks.projectType.value || '品牌类型待确认',
    [`行业：${benchmarks.industry.value}`, `项目类型：${benchmarks.projectType.value}`, ...inspection.findings.slice(0, 3)]);
  const temperament = configuredSection(supplied.temperament,
    clean(brand.fontTemperament) || PENDING,
    inspection.findings.length ? inspection.findings.slice(0, 3) : ['来自 Brand Lock；仍需用实际画面复核。']);
  const dna = supplied.visualDNA || {};
  const colors = [brand.primaryColor, ...brand.secondaryColors].filter(Boolean);
  const visualDNA = {
    color: dnaDirection(dna.color, colors.length ? `以 ${colors.join('、')} 为已确认色彩锚点，并固定主辅色层级。` : PENDING),
    composition: dnaDirection(dna.composition, clean(config.brand?.layoutStyle) || '主体、信息层级与构图规律待逐张视觉确认。'),
    whitespace: dnaDirection(dna.whitespace, clean(config.brand?.whitespaceStyle) || '留白比例与安全区待逐张视觉确认，不得用通用模板替代。'),
    photography: dnaDirection(dna.photography, clean(config.brand?.photographyStyle) || '摄影主体、光线和镜头规律待逐张视觉确认。'),
    packaging: dnaDirection(dna.packaging, brand.packaging.length ? `只沿用已确认包装：${brand.packaging.join('、')}。` : '包装结构待确认，不得自行发明。'),
    craft: dnaDirection(dna.craft, clean(config.brand?.craftLanguage) || '工艺与物理材质证据待确认，不得凭效果图推断。'),
    mustKeep: strings(dna.mustKeep || supplied.mustKeep).length
      ? strings(dna.mustKeep || supplied.mustKeep)
      : unique([brand.primaryColor ? `主色 ${brand.primaryColor}` : null, ...brand.coreVisualAssets, ...brand.logo.files.map((file) => `授权 Logo：${file}`)].filter(Boolean)),
    mustAvoid: strings(dna.mustAvoid || supplied.mustAvoid).length
      ? strings(dna.mustAvoid || supplied.mustAvoid)
      : ['未经确认的新 Logo、品牌文字或包装结构', '与 Brand Lock 冲突的色彩和核心资产', '只追求单张效果、忽略系列一致性的视觉方向']
  };
  const photo = supplied.photographyLanguage || {};
  const photographyLanguage = {
    lighting: clean(photo.lighting || photo.light) || '光线方向与软硬关系待逐张视觉确认。',
    lens: clean(photo.lens) || '镜头焦段、机位与景别待逐张视觉确认。',
    materials: clean(photo.materials || photo.material) || '主体与环境材质待确认，优先保持真实物理质感。',
    atmosphere: clean(photo.atmosphere || photo.mood) || `氛围应服从“${temperament.summary}”，具体表现待视觉确认。`
  };
  const creativeDirection = clean(supplied.creativeDirection)
    || `所有新增图片都应围绕“${positioning.summary}”，以 ${visualDNA.color} 为色彩约束，并保持核心资产、构图与摄影语言连续。`;
  const configuredRisks = Array.isArray(supplied.designRisks) ? supplied.designRisks.map(normalizeRisk) : [];
  return {
    evidenceStatus: inspection.status,
    visualInspection: inspection,
    positioning,
    keywords: normalizeKeywords(supplied.keywords, brand, benchmarks),
    temperament,
    visualDNA,
    photographyLanguage,
    creativeDirection,
    designRisks: configuredRisks.length ? configuredRisks : fallbackRisks(inspection, brand)
  };
}

