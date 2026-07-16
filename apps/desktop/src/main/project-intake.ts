import path from 'node:path';
import type { ProjectNameSource } from '../shared/types';

export interface IntakeSource {
  sourcePath: string;
  isDirectory: boolean;
}

export interface IntakeIdentity {
  projectName: string;
  projectNameSource: ProjectNameSource;
  detectedBrandName: string;
  detectedIndustry: string;
  factConfidence: {
    brandName: number;
    industry: number;
  };
}

const INDUSTRY_SIGNALS: Array<{ pattern: RegExp; industry: string; confidence: number }> = [
  { pattern: /医美|医疗美容|医学美学|整形|皮肤管理|口腔|医院|诊所/i, industry: '医学美学 / 医疗健康', confidence: 0.82 },
  { pattern: /食品|餐饮|零食|饮料|咖啡|茶饮|烘焙|酒|调味|乳业/i, industry: '食品 / 餐饮消费', confidence: 0.78 },
  { pattern: /文旅|旅游|景区|酒店|民宿|度假|城市文创/i, industry: '文化旅游 / 文创', confidence: 0.8 },
  { pattern: /美妆|护肤|香氛|彩妆|个护/i, industry: '美妆 / 个人护理', confidence: 0.8 },
  { pattern: /服装|服饰|时尚|鞋履|珠宝|配饰/i, industry: '时尚 / 服饰', confidence: 0.76 },
  { pattern: /教育|学校|课程|培训|学院/i, industry: '教育 / 培训', confidence: 0.76 },
  { pattern: /金融|银行|保险|证券|基金|财富/i, industry: '金融服务', confidence: 0.8 },
  { pattern: /科技|软件|智能|机器人|数据|云计算|AI|SaaS/i, industry: '科技 / 数字服务', confidence: 0.7 },
  { pattern: /地产|住宅|商业空间|建筑|家居|家具/i, industry: '地产 / 空间 / 家居', confidence: 0.74 }
];

function timestampName(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `未命名视觉项目-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function filenameStem(sourcePath: string): string {
  return path.parse(sourcePath).name.trim();
}

function commonPrefix(values: string[]): string {
  if (!values.length) return '';
  let prefix = values[0] || '';
  for (const value of values.slice(1)) {
    let index = 0;
    while (index < prefix.length && index < value.length && prefix[index]?.toLowerCase() === value[index]?.toLowerCase()) index += 1;
    prefix = prefix.slice(0, index);
    if (!prefix) break;
  }
  return prefix
    .replace(/[\s._\-—–()（）【】\[\]0-9]+$/g, '')
    .trim();
}

export function deriveProjectName(sources: IntakeSource[], now = new Date()): { projectName: string; projectNameSource: ProjectNameSource } {
  const archive = sources.find((source) => !source.isDirectory && path.extname(source.sourcePath).toLowerCase() === '.zip');
  if (archive && filenameStem(archive.sourcePath)) {
    return { projectName: filenameStem(archive.sourcePath), projectNameSource: 'uploaded-archive-name' };
  }
  const folder = sources.find((source) => source.isDirectory);
  if (folder && path.basename(folder.sourcePath).trim()) {
    return { projectName: path.basename(folder.sourcePath).trim(), projectNameSource: 'uploaded-folder-name' };
  }
  const stems = sources.filter((source) => !source.isDirectory).map((source) => filenameStem(source.sourcePath)).filter(Boolean);
  const prefix = commonPrefix(stems);
  if (prefix.length >= 2) return { projectName: prefix, projectNameSource: 'common-file-prefix' };
  if (stems.length === 1 && stems[0]) return { projectName: stems[0], projectNameSource: 'common-file-prefix' };
  return { projectName: timestampName(now), projectNameSource: 'fallback-datetime' };
}

function detectBrandName(projectName: string): string {
  const cleaned = projectName
    .replace(/(?:品牌)?(?:视觉方案|设计方案|品牌手册|视觉手册|VI手册|VI|design|proposal|presentation|最终版|终稿)+$/gi, '')
    .replace(/[\s._\-—–()（）【】\[\]]+$/g, '')
    .trim();
  return cleaned || projectName;
}

export function detectIntakeIdentity(
  sources: IntakeSource[],
  labels: string[],
  now = new Date()
): IntakeIdentity {
  const named = deriveProjectName(sources, now);
  const evidence = [named.projectName, ...labels].join('\n');
  const industryMatch = INDUSTRY_SIGNALS.find((signal) => signal.pattern.test(evidence));
  const detectedBrandName = detectBrandName(named.projectName);
  const brandConfidence = named.projectNameSource === 'fallback-datetime'
    ? 0
    : named.projectNameSource === 'common-file-prefix' ? 0.62 : 0.72;
  return {
    ...named,
    detectedBrandName,
    detectedIndustry: industryMatch?.industry || '待确认（基于现有素材推断）',
    factConfidence: {
      brandName: brandConfidence,
      industry: industryMatch?.confidence || 0
    }
  };
}
