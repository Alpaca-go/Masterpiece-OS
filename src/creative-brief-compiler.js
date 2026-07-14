const ANALYSIS_LANGUAGE = /(?:判断依据|定位依据|推导过程|行业对标|行业基准|竞品|竞争对手|competitor|benchmark|evidence|reasoning)/i;
const GENERIC_COMPETITOR_ALIASES = new Set(['案例', '品牌', '升级', '设计', '系统', 'brand', 'design', 'case']);

function clean(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function truncate(value, limit) {
  const text = clean(value);
  if (text.length <= limit) return text;
  const shortened = text.slice(0, Math.max(1, limit - 1));
  const boundary = Math.max(shortened.lastIndexOf('。'), shortened.lastIndexOf('；'), shortened.lastIndexOf('，'));
  return `${(boundary >= limit * 0.55 ? shortened.slice(0, boundary) : shortened).trim()}…`;
}

function competitorNames(analysis) {
  const aliases = [];
  for (const item of analysis.competitorAnalysis || []) {
    const name = clean(item.name);
    if (!name) continue;
    const withoutSuffix = name.replace(/(?:品牌升级|品牌设计|设计案例|品牌系统|升级|设计|案例|系统)$/u, '').trim();
    const parts = name.split(/[·・|/()（）—–-]|\s+/u).map((part) => part.trim()).filter((part) => part.length >= 2);
    const firstCjk = name.match(/^[\p{Script=Han}]{2,}/u)?.[0];
    aliases.push(name, withoutSuffix, ...parts);
    if (firstCjk && firstCjk.length > 4) aliases.push(firstCjk.slice(0, 3));
  }
  return [...new Set(aliases.filter((name) => name.length >= 2 && !GENERIC_COMPETITOR_ALIASES.has(name.toLowerCase())))];
}

function designOnly(value, analysis, limit) {
  const names = competitorNames(analysis);
  const sentences = clean(value).split(/(?<=[。！？；])/).map((item) => item.trim()).filter(Boolean);
  const usable = sentences.filter((sentence) => !ANALYSIS_LANGUAGE.test(sentence)
    && !names.some((name) => sentence.includes(name)));
  if (sentences.length && !usable.length) return '';
  return truncate(usable.join(''), limit);
}

function compactList(values, analysis, options = {}) {
  const { maxItems = 6, itemLimit = 120 } = options;
  return (values || [])
    .map((item) => designOnly(item, analysis, itemLimit))
    .filter(Boolean)
    .slice(0, maxItems);
}

function avoidRules(risks, analysis) {
  return (risks || []).slice(0, 6).map((risk) => {
    const problem = designOnly(risk.problem, analysis, 90).replace(/^[：:、，,\s]+/, '').replace('容易', '');
    return /^避免/.test(problem) ? problem : `避免${problem}`;
  }).filter((item) => item !== '避免');
}

/**
 * Information compression only. All values are selected from the approved
 * analysis record; this compiler performs no new brand reasoning and never
 * changes a decision.
 */
export function compileCreativeBrief(analysis, options = {}) {
  const reasoning = analysis.reasoning;
  const brief = {
    creativeVision: {
      statement: designOnly(reasoning.brandIdentity.statement, analysis, 140),
      direction: designOnly(reasoning.designGoal, analysis, 180)
    },
    brandPersonality: {
      statement: designOnly(reasoning.emotionalDirection.statement, analysis, 110),
      desired: compactList(reasoning.emotionalDirection.desiredFeelings, analysis, { maxItems: 4, itemLimit: 30 }),
      avoid: compactList(reasoning.emotionalDirection.avoidFeelings, analysis, { maxItems: 4, itemLimit: 30 })
    },
    approvedBrandDNA: Object.fromEntries(Object.entries(analysis.approvedBrandDNA || {})
      .map(([key, value]) => [key, designOnly(value, analysis, 70)])),
    creativePrinciples: {
      statement: designOnly(reasoning.designLanguage.statement, analysis, 130),
      principles: compactList(reasoning.designLanguage.principles, analysis, { maxItems: 4, itemLimit: 50 }),
      avoidRules: avoidRules(analysis.designRisks, analysis).slice(0, 4).map((item) => truncate(item, 45))
    },
    mustKeep: compactList(analysis.mustKeep, analysis, { maxItems: 4, itemLimit: 60 }),
    canExplore: compactList(analysis.canExplore, analysis, { maxItems: 4, itemLimit: 60 }),
    photographyDirection: Object.fromEntries(Object.entries(reasoning.photographyDirection || {})
      .map(([key, value]) => [key, designOnly(value, analysis, 65)])),
    designGoal: designOnly(reasoning.designGoal, analysis, 180),
    compilation: {
      source: 'Analysis',
      changesDecisions: false,
      maxCharacters: options.maxCharacters || 3000
    }
  };
  brief.runtimeGptBrief = compileGptBrief(brief, { maxCharacters: options.gptMaxCharacters || 1500 });
  return brief;
}

export function compileGptBrief(brief, options = {}) {
  const dna = Object.entries(brief.approvedBrandDNA || {}).map(([key, value]) => `${key}: ${value}`).join('；');
  const photo = Object.entries(brief.photographyDirection || {}).map(([key, value]) => `${key}: ${value}`).join('；');
  const content = [
    `Creative Vision: ${brief.creativeVision.statement} ${brief.creativeVision.direction}`,
    `Brand Personality: ${brief.brandPersonality.statement}；希望：${brief.brandPersonality.desired.join('、')}；避免：${brief.brandPersonality.avoid.join('、')}`,
    `Approved Brand DNA: ${dna}`,
    `Creative Principles: ${brief.creativePrinciples.statement}；${brief.creativePrinciples.principles.join('；')}`,
    `Avoid Rules: ${brief.creativePrinciples.avoidRules.join('；')}`,
    `Must Keep: ${brief.mustKeep.join('；')}`,
    `Can Explore: ${brief.canExplore.join('；')}`,
    `Photography Direction: ${photo}`,
    `Design Goal: ${brief.designGoal}`
  ].join('\n');
  return truncate(content, options.maxCharacters || 1500);
}
