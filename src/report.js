import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureDir, mdCell, writeText } from './utils.js';
import { renderCandidateReport, renderKnowledgeAnalysis } from './knowledge-analysis.js';

const LEGACY_OUTPUTS = [
  '00-素材清单.md', '01-Brand-Lock.md', '02-视觉方案优化报告.md', '03-缺图分析.md', '04-图片规划.md',
  'Chat生图任务包.md', 'Knowledge-Candidate.md', 'Knowledge-Analysis.md'
];
const CURRENT_OUTPUTS = ['01-项目分析报告.md', '02-Chat生图任务包.md', '03-Knowledge-Review.md', '04-Design-Review.md'];

function header(title, result) {
  return `# ${title}\n\n> Design Factory OS v${result.version} 自动生成  \n> 生成时间：${result.generatedAt}  \n> 项目：${result.brandLock.brandName}\n\n`;
}

function list(values, empty = '暂无') {
  return values?.length ? values.map((value) => `- ${value}`).join('\n') : `- ${empty}`;
}

function taskCard(card) {
  return `### ${card.id}｜${card.title}\n\n- 继承：完整继承“品牌设计意图”\n- 类别：${card.category}\n- 目标：${card.objective}\n- 场景与构图：${card.scene}\n- 画幅：${card.ratio}\n- 本任务必须包含：${card.mustHave.join('；')}\n- 本任务额外禁止：${card.avoid.join('；')}\n- 验收：${card.acceptance.join('；')}\n`;
}

function creativeReasoningSection(result) {
  const reasoning = result.creativeReasoning;
  const dna = reasoning.visualDNA;
  const photo = reasoning.photographyLanguage;
  return `## 品牌设计推理（Creative Reasoning）\n\n> ${reasoning.evidenceStatus}\n\n` +
    `### 品牌定位\n\n- 类型：${reasoning.positioning.summary}\n- 依据：${reasoning.positioning.evidence.join('；') || '待补充逐张视觉核验证据'}\n\n` +
    `### 品牌关键词\n\n${reasoning.keywords.map((item) => `- **${item.keyword}**：${item.reason}`).join('\n')}\n\n` +
    `### 品牌气质\n\n- 气质：${reasoning.temperament.summary}\n- 依据：${reasoning.temperament.evidence.join('；') || '待补充逐张视觉核验证据'}\n\n` +
    `### 品牌视觉 DNA\n\n| 维度 | 设计约束 |\n|---|---|\n| 色彩 | ${mdCell(dna.color)} |\n| 构图 | ${mdCell(dna.composition)} |\n| 留白 | ${mdCell(dna.whitespace)} |\n| 摄影语言 | ${mdCell(dna.photography)} |\n| 包装语言 | ${mdCell(dna.packaging)} |\n| 工艺语言 | ${mdCell(dna.craft)} |\n\n` +
    `### 摄影语言\n\n- 光线：${photo.lighting}\n- 镜头：${photo.lens}\n- 材质：${photo.materials}\n- 氛围：${photo.atmosphere}\n\n` +
    `### 创意方向\n\n> ${reasoning.creativeDirection}\n\n` +
    `### 必须保留\n\n${list(dna.mustKeep, '待确认品牌核心资产')}\n\n` +
    `### 必须避免\n\n${list(dna.mustAvoid)}\n\n`;
}

function designRisksSection(result) {
  return `## Design Risks\n\n${result.creativeReasoning.designRisks.map((risk, index) => `### ${index + 1}. ${risk.problem}\n\n- 问题：${risk.problem}\n- 原因：${risk.reason}\n- 避免方式：${risk.prevention}`).join('\n\n')}\n\n`;
}

function projectAnalysis(result) {
  const { brandLock: brand, benchmarks, gaps, imagePlan } = result;
  const cases = benchmarks.cases.map((item, index) => `| ${index + 1} | ${mdCell(item.name)} | ${mdCell(item.reason)} | ${item.url ? `[查看](${item.url})` : '—'} |`).join('\n');
  const gapsRows = gaps.matrix.map((item) => `| ${item.type} | ${item.current} | ${item.target} | ${item.gap} | ${item.priorityScore} |`).join('\n');
  return header('项目分析报告', result) +
    `## 项目概览\n\n- 运行模式：${result.mode}\n- 项目类型：${benchmarks.projectType.value}\n- 判断依据：${benchmarks.projectType.evidence.join('、') || '待补充项目证据'}\n- 行业：${benchmarks.industry.value}\n- 素材：${result.inventory.totalFiles} 个文件，其中图片 ${result.inventory.imageCount} 张\n- 创意方向：${result.creativeReasoning.creativeDirection}\n\n` +
    `## Brand Lock\n\n> 自动识别结果是设计约束候选；待确认内容不得直接投产。\n\n- 品牌：${brand.brandName}\n- Logo：${brand.logo.files.join('、') || '缺失/待提供'}\n- 主色：${brand.primaryColor || '待人工确认'}\n- 辅助色：${brand.secondaryColors.join('、') || '待人工确认'}\n- 字体气质：${brand.fontTemperament}\n- 已识别字体：${brand.fonts.join('、') || '未识别'}\n- 包装形态：${brand.packaging.join('、') || '待确认'}\n- 核心视觉资产：${brand.coreVisualAssets.join('、') || '待补充'}\n\n` +
    `## Benchmark Analysis\n\n- 对标状态：${benchmarks.search.status}\n\n| # | 案例 | 为什么优秀/入选 | 来源 |\n|---:|---|---|---|\n${cases}\n\n### 优秀案例共同特点\n\n${list(benchmarks.commonTraits)}\n\n` +
    creativeReasoningSection(result) +
    designRisksSection(result) +
    `## Image Planning\n\n### 缺图矩阵\n\n| 图片类型 | 当前 | 建议 | 缺口 | 优先分 |\n|---|---:|---:|---:|---:|\n${gapsRows}\n\n### 最值得补充的 3 张\n\n${gaps.topThree.map((item) => `${item.rank}. **${item.type}**：${item.reason}`).join('\n')}\n\n### 图片规划摘要\n\n- 总数：${imagePlan.count} 张\n- 顺序：${imagePlan.sequenceRule}\n- 分类：${[...new Set(imagePlan.cards.map((card) => card.category))].map((category) => `${category} ${imagePlan.cards.filter((card) => card.category === category).length} 张`).join('；')}\n`;
}

function chatPackage(result) {
  const brand = result.brandLock;
  const plan = result.imagePlan;
  const reasoning = result.creativeReasoning;
  const dna = reasoning.visualDNA;
  const photo = reasoning.photographyLanguage;
  return header('Chat 生图任务包', result) +
    `> 本文件为自包含执行包。遇到“待确认”项必须暂停并请求确认，不得自行发明品牌资产。\n\n` +
    `## 品牌设计意图\n\n> 以下设计意图是所有图片任务的共同上层约束。每张图片默认完整继承，不再重复解释品牌。\n\n` +
    `### Brand Lock\n\n- 品牌：${brand.brandName}\n- Logo：${brand.logo.files.join('、') || '待提供，不得虚构'}\n- 主色：${brand.primaryColor || '待确认'}\n- 辅助色：${brand.secondaryColors.join('、') || '待确认'}\n- 字体气质：${brand.fontTemperament}\n- 包装盒型：${brand.packaging.join('、') || '待确认，不得擅自改变结构'}\n- 核心视觉资产：${brand.coreVisualAssets.join('、') || '暂无已确认资产'}\n\n` +
    `### 品牌定位\n\n- ${reasoning.positioning.summary}\n- 依据：${reasoning.positioning.evidence.join('；') || '待补充逐张视觉核验证据'}\n\n` +
    `### 品牌关键词\n\n${reasoning.keywords.map((item) => `- **${item.keyword}**：${item.reason}`).join('\n')}\n\n` +
    `### 品牌气质\n\n- ${reasoning.temperament.summary}\n- 依据：${reasoning.temperament.evidence.join('；') || '待补充逐张视觉核验证据'}\n\n` +
    `### 品牌视觉 DNA\n\n- 色彩：${dna.color}\n- 构图：${dna.composition}\n- 留白：${dna.whitespace}\n- 摄影：${dna.photography}\n- 包装：${dna.packaging}\n- 工艺：${dna.craft}\n\n` +
    `### 摄影语言\n\n- 光线：${photo.lighting}\n- 镜头：${photo.lens}\n- 材质：${photo.materials}\n- 氛围：${photo.atmosphere}\n\n` +
    `### 创意方向\n\n> ${reasoning.creativeDirection}\n\n` +
    `### 必须保留\n\n${list(dna.mustKeep, '待确认品牌核心资产')}\n\n` +
    `### 禁止出现\n\n${list(dna.mustAvoid)}\n\n` +
    `## Chat 执行规则\n\n1. 严格按图片队列顺序执行，一次只处理一张图。\n2. 每张任务默认继承“品牌设计意图”；冲突时以上层意图为准。\n3. 不生成可读品牌文字，需要文字的区域只保留安全留白。\n4. Logo 仅能使用已提供源文件，不得重绘、变形或猜测。\n5. 保持系列包装结构、材质、主辅色、光线逻辑一致。\n6. 每张完成后按任务卡验收；未通过则记录原因并重做。\n7. 输出文件以“编号-图片名称”命名，并记录版本。\n\n` +
    `## 图片任务\n\n### 图片队列\n\n${plan.cards.map((card, index) => `${index + 1}. ${card.id}｜${card.title}｜${card.ratio}`).join('\n')}\n\n### 任务卡\n\n${plan.cards.map(taskCard).join('\n')}\n` +
    `## 全局验收标准\n\n- [ ] 共输出 ${plan.count} 张，编号、顺序和文件名完整\n- [ ] 每张图均符合对应画幅，主体未被裁断\n- [ ] 所有任务均继承同一品牌设计意图\n- [ ] Logo、包装结构、主辅色与 Brand Lock 一致\n- [ ] 系列光线、材质、镜头语言和后期质感一致\n- [ ] 无伪文字、水印、畸形结构、悬浮或穿模\n- [ ] 重点缺图真正补齐缺图矩阵，不与现有素材重复\n- [ ] 所有“待确认”项已由项目负责人确认并回填\n`;
}

function withoutTitle(markdown) {
  return markdown.replace(/^# [^\n]+\n+/, '');
}

function knowledgeReview(result) {
  return header('Knowledge Review', result) +
    `> 本报告只提供候选与人工审核建议，不会修改 knowledge/approved/、Rule、Prompt 或 Template。\n\n` +
    `## Knowledge Candidate\n\n${withoutTitle(renderCandidateReport(result.knowledgeCandidates, result))}\n` +
    `## Knowledge Analysis\n\n${withoutTitle(renderKnowledgeAnalysis(result.knowledgeAnalysis, result))}`;
}

function reviewItems(items, empty = '暂无') {
  return items.length ? items.map((item) => `### ${item.problem}\n\n- 问题：${item.problem}\n- 影响：${item.impact}\n- 建议：${item.suggestion}\n- 参考方向：${item.referenceDirection}\n- 预计改善效果：${item.expectedEffect}`).join('\n\n') : empty;
}

function designReview(result) {
  const review = result.designReview;
  const checksTable = (module) => `| 检查项 | 状态 | 证据 | 下一步 |\n|---|---|---|---|\n${module.checks.map((item) => `| ${item.item} | ${item.status} | ${mdCell(item.evidence)} | ${mdCell(item.suggestion)} |`).join('\n')}`;
  const moduleSection = (title, module) => `## ${title}\n\n- 模块评分：${module.score}/100\n- 评分依据：${module.basis}\n\n### 检查明细\n\n${checksTable(module)}\n\n### 优点\n\n${module.strengths.length ? module.strengths.map((item) => `- ${item.strength}：${item.reason}`).join('\n') : '- 暂无足够证据形成独立优点，建议补充可评审素材。'}\n\n### 问题\n\n${module.problems.length ? module.problems.map((item) => `- ${item.problem}：${item.impact}`).join('\n') : '- 暂无阻塞问题。'}\n\n### 建议\n\n${list(module.suggestions)}\n\n`;
  const prioritySection = ['P0', 'P1', 'P2'].map((priority) => `### ${priority}\n\n${review.priorities[priority].length ? review.priorities[priority].map((item) => `- **${item.problem}**：${item.suggestion}`).join('\n') : '- 无'}`).join('\n\n');
  const trendRows = result.growth.trends.map((item) => `| ${item.dimension} | ${item.currentScore} | ${item.historicalAverage ?? '—'} | ${item.direction} | ${item.delta ?? '—'} |`).join('\n');
  return header('Design Review & Growth', result) +
    `> 定位：AI 设计导师，而不是 AI 打分器。${review.scoringNote}\n\n` +
    `## 1. 项目总体评价\n\n- 总体评分：${review.overallScore}/100\n- 一句话总结：${review.summary}\n- 项目完成度：${review.completion}%\n\n` +
    moduleSection('2. Brand Review', review.modules.brand) +
    `## 3. Packaging Review\n\n- 模块评分：${review.modules.packaging.score}/100\n- 评分依据：${review.modules.packaging.basis}\n\n### 检查明细\n\n${checksTable(review.modules.packaging)}\n\n### 问题、影响与建议\n\n${reviewItems(review.modules.packaging.problems)}\n\n` +
    moduleSection('4. Visual System Review', review.modules.visualSystem) +
    `## 5. Portfolio Review\n\n- 作品集完整度：${review.portfolio.completeness}%\n\n### 已有\n\n${list(review.portfolio.present)}\n\n### 缺失\n\n${list(review.portfolio.missing)}\n\n### 应该补充\n\n${list(review.portfolio.shouldAdd)}\n\n` +
    `## 6. Benchmark Review\n\n### 优秀案例共同特点\n\n${list(review.benchmark.commonTraits)}\n\n### 当前项目差距\n\n${list(review.benchmark.gaps)}\n\n### 最值得学习的 3 点\n\n${review.benchmark.learnTopThree.map((item, index) => `${index + 1}. **${item.point}**\n   - 为什么优秀：${item.why}\n   - 可执行练习：${item.action}`).join('\n')}\n\n` +
    `## 7. P0 / P1 / P2\n\n${prioritySection}\n\n` +
    `## 8. Strengths\n\n${review.strengths.map((item, index) => `### ${index + 1}. ${item.strength}\n\n- 优点：${item.strength}\n- 原因：${item.reason}\n- 建议继续保持：${item.keep}`).join('\n\n')}\n\n` +
    `## 9. Improvement\n\n${review.improvements.map((item, index) => `### ${index + 1}. ${item.problem}\n\n- 问题：${item.problem}\n- 影响：${item.impact}\n- 建议：${item.suggestion}\n- 预计改善效果：${item.expectedEffect}\n- 优先级：${item.priority}`).join('\n\n')}\n\n` +
    `## 10. Growth Engine\n\n${result.growth.status}\n\n| 能力 | 本次 | 历史均值 | 趋势 | 差值 |\n|---|---:|---:|:---:|---:|\n${trendRows}\n\n` +
    `## 11. 能力雷达\n\n| 维度 | 评分 | 理由 | 建议 |\n|---|---:|---|---|\n${review.radar.map((item) => `| ${item.dimension} | ${item.score} | ${mdCell(item.reason)} | ${mdCell(item.suggestion)} |`).join('\n')}\n\n` +
    `## 12. 下一阶段成长建议\n\n- 最值得训练：${result.growth.nextStage.focus}\n- 为什么：${result.growth.nextStage.why}\n- 预计提升：${result.growth.nextStage.improves.join('、')}\n\n` +
    `## 13. Top 3 训练路线\n\n${result.growth.training.map((item) => `${item.rank}. **${item.direction}**：${item.reason} 建议连续完成 ${item.recommendedProjects} 个项目；预计提升 ${item.improves.join('、')}。`).join('\n')}\n\n` +
    `## 14. Action Items\n\n${result.actionItems.map((item) => `- [${item.selected ? 'x' : ' '}] ${item.action}：${item.reason}`).join('\n')}\n\n> 所有系统资产修改都必须由人工审核并另行执行。本引擎不会自动修改 Knowledge、Rule、Prompt 或 Template。\n`;
}

export async function renderAll(result, output, options = {}) {
  await ensureDir(output);
  for (const name of [...LEGACY_OUTPUTS, ...CURRENT_OUTPUTS]) await fs.rm(path.join(output, name), { force: true });
  if (!options.debug) await fs.rm(path.join(output, 'design-factory-result.json'), { force: true });
  const files = {
    '01-项目分析报告.md': projectAnalysis(result),
    '02-Chat生图任务包.md': chatPackage(result)
  };
  if ((options.mode || result.mode) !== 'fast') {
    files['03-Knowledge-Review.md'] = knowledgeReview(result);
    files['04-Design-Review.md'] = designReview(result);
  }
  result.outputFiles = Object.keys(files);
  for (const [name, content] of Object.entries(files)) await writeText(path.join(output, name), content);
  if (options.debug) await writeText(path.join(output, 'design-factory-result.json'), `${JSON.stringify(result, null, 2)}\n`);
  return Object.keys(files);
}
