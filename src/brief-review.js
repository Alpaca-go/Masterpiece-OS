const PENDING_PATTERN = /待.*(?:确认|补充|验证|打样)|仍需.*确认|尚未|未完成|不得仅凭|视觉核验未闭环/;
const FORBIDDEN = ['Reasoning', 'Industry Benchmark', 'Competitor', 'Evidence', '判断依据', '推导过程'];
const GENERIC_COMPETITOR_ALIASES = new Set(['案例', '品牌', '升级', '设计', '系统', 'brand', 'design', 'case']);

function competitorAliases(analysis) {
  const aliases = [];
  for (const item of analysis.competitorAnalysis || []) {
    const name = String(item.name || '').trim();
    if (!name) continue;
    const withoutSuffix = name.replace(/(?:品牌升级|品牌设计|设计案例|品牌系统|升级|设计|案例|系统)$/u, '').trim();
    const parts = name.split(/[·・|/()（）—–-]|\s+/u).map((part) => part.trim()).filter((part) => part.length >= 2);
    const firstCjk = name.match(/^[\p{Script=Han}]{2,}/u)?.[0];
    aliases.push(name, withoutSuffix, ...parts);
    if (firstCjk && firstCjk.length > 4) aliases.push(firstCjk.slice(0, 3));
  }
  return [...new Set(aliases.filter((name) => name.length >= 2 && !GENERIC_COMPETITOR_ALIASES.has(name.toLowerCase())))];
}

function populated(value) {
  if (Array.isArray(value)) return value.length > 0 && value.every(populated);
  if (value && typeof value === 'object') return Object.entries(value)
    .filter(([key]) => key !== 'compilation' && key !== 'runtimeGptBrief')
    .every(([, item]) => populated(item));
  return typeof value === 'string' ? Boolean(value.trim()) && !PENDING_PATTERN.test(value) : value !== null && value !== undefined;
}

function check(section, value, nextStep) {
  const ready = populated(value);
  return { section, status: ready ? 'Ready' : 'Needs Evidence', evidence: ready ? '内容已编译并可执行' : '存在空值或待确认内容', nextStep };
}

function contentCharacters(brief) {
  return JSON.stringify(brief, (key, value) => ['compilation', 'runtimeGptBrief'].includes(key) ? undefined : value).length;
}

export function buildBriefReview(result) {
  const brief = result.creativeBrief;
  const serialized = JSON.stringify(brief, (key, value) => ['compilation', 'runtimeGptBrief'].includes(key) ? undefined : value);
  const competitorMentions = competitorAliases(result.analysis).filter((name) => serialized.includes(name));
  const forbiddenTerms = [...FORBIDDEN.filter((term) => serialized.includes(term)), ...competitorMentions.map((name) => `Competitor:${name}`)];
  const checks = [
    check('Creative Vision', brief.creativeVision, '明确一个能直接指导设计的未来方向。'),
    check('Brand Personality', brief.brandPersonality, '补齐希望与避免的品牌感受。'),
    check('Approved Brand DNA', brief.approvedBrandDNA, '完成九个维度与显式批准。'),
    check('Creative Principles', brief.creativePrinciples, '保留可执行原则和简洁 Avoid Rules。'),
    check('Must Keep', brief.mustKeep, '明确不可改变的长期资产。'),
    check('Can Explore', brief.canExplore, '为创意团队保留探索空间。'),
    check('Photography Direction', brief.photographyDirection, '明确光线、取景、景深、材质与氛围。'),
    check('Design Goal', brief.designGoal, '用一句话冻结设计目标。')
  ];
  const readyCount = checks.filter((item) => item.status === 'Ready').length;
  const separationReady = forbiddenTerms.length === 0;
  const completeness = Math.round(((readyCount + (separationReady ? 1 : 0)) / (checks.length + 1)) * 100);
  const openQuestions = checks.filter((item) => item.status !== 'Ready').map((item) => `${item.section}：${item.nextStep}`);
  if (!separationReady) openQuestions.push(`Information Architecture：移除 ${forbiddenTerms.join('、')}。`);
  const analysis = result.analysis;
  const strengths = [
    ...(analysis.evidence.assets.visualInspectionVerified ? [`逐张视觉核验已覆盖 ${analysis.evidence.assets.inspectedImageCount}/${analysis.evidence.assets.imageCount} 张图片。`] : []),
    ...(analysis.competitorAnalysis.length >= 3 ? [`Analysis 已记录 ${analysis.competitorAnalysis.length} 个同类案例，Brief 未复制研究过程。`] : []),
    ...(brief.mustKeep.length >= 3 ? ['Must Keep 已形成长期资产边界。'] : []),
    ...(brief.canExplore.length >= 2 ? ['Can Explore 保留了明确创意空间。'] : [])
  ];
  return {
    completeness,
    readiness: completeness === 100 ? 'Ready for Creative Development' : 'Needs Evidence Before Creative Development',
    summary: completeness === 100
      ? '八部分 Creative Brief 已完成信息压缩，与 Analysis 分离，可直接交给设计团队或作为 GPT 运行时输入。'
      : 'Creative Brief 已完成结构编译，但仍存在证据缺口或分析语言残留。',
    checks,
    strengths,
    openQuestions,
    separationReady,
    forbiddenTerms,
    briefCharacters: contentCharacters(brief)
  };
}
