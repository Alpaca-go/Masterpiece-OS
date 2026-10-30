#!/usr/bin/env node
// Read-only retrieval prototype over the curated knowledge base.
//
// It does NOT call a model, does NOT write anything, and never injects into a
// generation request. It answers one question: given a brief, which three
// precedents, which one counter-example and which two style references are
// worth reading, and why.
//
// Matching is keyword based on purpose: a user must be able to see why a card
// was returned and check it. Semantic similarity would hide the reason.
//
// Usage:
//   node scripts/knowledge-search.mjs --category 社区粉面 --tier 平价 \
//     --constraints 小面积,外带 --direction 老招牌 --json
//
// Output: markdown (default) or JSON (--json).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const CASES = path.join(ROOT, 'docs/knowledge/restaurant-cases');
const ATLAS = path.join(ROOT, 'docs/knowledge/reference-atlas');
const FRAMEWORK = path.join(ROOT, 'docs/knowledge/style-framework');

const SECTION_WEIGHTS = [
  [/^##\s*九维/u, 2.2],
  [/^##\s*基本信息/u, 2.0],
  [/^##\s*设计动作/u, 1.4],
  [/^##\s*成立前提/u, 1.2],
  [/^##\s*禁止/u, 1.0],
  [/^##\s*不确定项/u, 0.4],
  [/^##\s*证据/u, 0.6],
];

const SYNONYMS = {
  奶茶: ['茶饮', '饮品', '果汁', '果茶', '档口'],
  饮品: ['茶饮', '果汁', '奶茶', '档口', '外带'],
  点心: ['糕点', '烘焙', '酥点', '面包', '零售'],
  烘焙: ['点心', '糕点', '面包', '零售'],
  社区: ['街边', '底商', '街面', '邻里', '烟火气'],
  街边: ['社区', '底商', '街面'],
  商场: ['mall', '购物中心', '商场店'],
  小面积: ['档口', '柜台', '外带', '小店', '紧凑'],
  外带: ['打包', '即取即走', '档口', '外卖'],
  平价: ['快餐', '低客单', '大众', '社区'],
  日式: ['居酒屋', '和风'],
  老招牌: ['老店', '匾额', '招牌', '年代感', '手作'],
  烟火气: ['暖光', '密度', '明档', '生活细节'],
  火锅: ['炭锅', '牛蛙', '老火锅', '锅底'],
  正餐: ['宴请', '聚餐', '包厢', '桌边'],
  高端: ['中高端', '商务', '精致'],
};

function parseArgs(argv) {
  const out = { constraints: '' };
  for (let index = 2; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith('--')) continue;
    const name = key.slice(2);
    if (name === 'json') { out.json = true; continue; }
    out[name] = argv[index + 1] && !argv[index + 1].startsWith('--') ? argv[++index] : '';
  }
  return out;
}

function expandTerms(text) {
  const base = String(text || '')
    .split(/[,，、/;；\s]+/u)
    .map((item) => item.trim())
    .filter(Boolean);
  const terms = new Set();
  for (const item of base) {
    terms.add(item);
    for (const extra of SYNONYMS[item] || []) terms.add(extra);
    // A long Chinese phrase is also probed by its halves, which catches
    // "社区底商小馆" against a card that only says "社区".
    if (item.length >= 4 && /^[\u4e00-\u9fa5]+$/u.test(item)) {
      terms.add(item.slice(0, Math.ceil(item.length / 2)));
      terms.add(item.slice(Math.floor(item.length / 2)));
    }
  }
  return [...terms];
}

function readCard(file) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/u);
  const title = (lines.find((line) => line.startsWith('# ')) || '').replace(/^#\s+/u, '').trim();
  const rawStatus = (lines.find((line) => line.startsWith('状态：')) || '').replace(/^状态：/u, '').trim();
  // Keep the status readable: the first sentence only, and never the source path.
  const status = rawStatus.split(/[。；]/u)[0].slice(0, 40);
  const sections = {};
  let current = 'header';
  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/u);
    if (heading) { current = heading[1].trim(); sections[current] = []; continue; }
    if (sections[current]) sections[current].push(line);
  }
  return { slug: path.basename(file, '.md'), title, status, sections, file };
}

function sectionText(card, pattern) {
  const key = Object.keys(card.sections).find((name) => pattern.test(name));
  return key ? card.sections[key].join('\n') : '';
}

function scoreCard(card, terms) {
  const weighted = [
    [card.title, 3.0],
    [card.status, 1.5],
    [sectionText(card, /基本信息/u), 2.0],
    [sectionText(card, /九维/u), 2.2],
    [sectionText(card, /设计动作/u), 1.4],
    [sectionText(card, /成立前提/u), 1.2],
    [sectionText(card, /禁止/u), 1.0],
  ];
  let score = 0;
  const hits = [];
  for (const term of terms) {
    let best = 0;
    let weight = 0;
    for (const [text, value] of weighted) {
      if (!text) continue;
      const occurrences = Math.min(3, text.split(term).length - 1);
      if (occurrences > 0) { best += occurrences; weight = Math.max(weight, value); }
    }
    if (best > 0) {
      const contribution = Math.min(3, best) * weight;
      score += contribution;
      hits.push({ term, contribution: Number(contribution.toFixed(1)) });
    }
  }
  return { score: Number(score.toFixed(1)), hits: hits.sort((a, b) => b.contribution - a.contribution) };
}

function firstLine(text, pattern) {
  return text.split(/\r?\n/u).map((line) => line.trim()).find((line) => line && pattern.test(line)) || '';
}

function bullet(text, index = 0) {
  const lines = text.split(/\r?\n/u).map((line) => line.trim()).filter((line) => line.startsWith('- ') || line.startsWith('| ') || line.startsWith('1. '));
  return lines[index] || '';
}

function readAtlas() {
  if (!fs.existsSync(ATLAS)) return [];
  const entries = [];
  for (const directory of fs.readdirSync(ATLAS, { withFileTypes: true })) {
    if (!directory.isDirectory()) continue;
    const notes = path.join(ATLAS, directory.name, 'notes.md');
    if (!fs.existsSync(notes)) continue;
    const text = fs.readFileSync(notes, 'utf8');
    entries.push({
      slug: directory.name,
      title: (text.split(/\r?\n/u).find((line) => line.startsWith('# ')) || '').replace(/^#\s+/u, '').trim(),
      text,
    });
  }
  return entries;
}

function readPresets() {
  const file = path.join(FRAMEWORK, 'README.md');
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file, 'utf8');
}

function main() {
  const args = parseArgs(process.argv);
  const query = [args.category, args.tier, args.direction, args.constraints].filter(Boolean).join(' ');
  if (!query.trim()) {
    console.error('用法：node scripts/knowledge-search.mjs --category 品类 --tier 档位 --direction 方向 --constraints 约束,逗号分隔 [--json]');
    process.exitCode = 2;
    return;
  }
  const terms = expandTerms(query);
  const cards = fs.readdirSync(CASES)
    .filter((name) => name.endsWith('.md') && !['README.md', 'candidate-rules.md'].includes(name))
    .map((name) => readCard(path.join(CASES, name)))
    .map((card) => ({ ...card, ...scoreCard(card, terms) }))
    .sort((a, b) => b.score - a.score);

  const owned = cards.filter((card) => /自有项目/u.test(card.title) || /自有/u.test(card.status));
  const precedents = cards.slice(0, 3).map((card) => ({
    slug: card.slug,
    title: card.title,
    status: card.status,
    score: card.score,
    why: card.hits.slice(0, 4).map((hit) => hit.term),
    premise: firstLine(sectionText(card, /成立前提/u), /^- /u) || '(卡片未写成立前提)',
    forbidden: firstLine(sectionText(card, /禁止/u), /^- /u) || '(卡片未写禁用边界)',
  }));

  const chosen = new Set(precedents.map((item) => item.slug));
  const counterCandidates = cards.filter((card) => !chosen.has(card.slug) && card.score > 0);
  const counter = counterCandidates
    .map((card) => ({
      card,
      boundary: card.hits.filter((hit) => /商场|高端|正餐|宴请|平价|社区|档口|外带/u.test(hit.term)).length,
    }))
    .sort((a, b) => b.boundary - a.boundary || b.card.score - a.card.score)[0];

  const atlas = readAtlas()
    .map((entry) => ({ entry, ...scoreCard({ slug: entry.slug, title: entry.title, status: '', sections: { header: [entry.text] }, file: '' }, terms) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => ({ slug: item.entry.slug, title: item.entry.title, why: item.hits.slice(0, 3).map((hit) => hit.term) }));

  const result = {
    schemaVersion: '1.0',
    mode: 'read-only',
    note: '关键词匹配，不是语义检索；返回的是候选阅读清单，不自动注入任何生成请求。',
    query,
    terms: terms.slice(0, 24),
    precedents,
    counterExample: counter ? {
      slug: counter.card.slug,
      title: counter.card.title,
      status: counter.card.status,
      why: counter.card.hits.slice(0, 4).map((hit) => hit.term),
      boundary: firstLine(sectionText(counter.card, /禁止/u), /^- /u) || '(卡片未写禁用边界)',
      caution: '这条是"看起来像但你这里可能不成立"的候选，由人判断，不是自动结论。',
    } : null,
    atlas,
    ownedCases: owned.map((card) => card.slug),
    presetsAvailable: /community-street-smoke/u.test(readPresets()),
  };

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  const lines = [
    `# 检索结果（只读）`,
    '',
    `- brief：${result.query}`,
    `- 命中的词：${result.terms.join('、')}`,
    `- 自有验收案例：${result.ownedCases.length ? result.ownedCases.join('、') : '无'}`,
    '',
    '## 3 条先例',
    '',
    ...result.precedents.flatMap((item, index) => [
      `${index + 1}. **${item.title}**（\`${item.slug}\`，${item.status || '状态未写'}）`,
      `   - 为什么：命中 ${item.why.join('、') || '(无)'}（score ${item.score}）`,
      `   - 前提：${item.premise}`,
      `   - 边界：${item.forbidden}`,
    ]),
    '',
    '## 1 条反例候选',
    '',
    result.counterExample
      ? `- **${result.counterExample.title}**（\`${result.counterExample.slug}\`）\n  - 为什么是它：命中 ${result.counterExample.why.join('、') || '(无)'}\n  - 边界：${result.counterExample.boundary}\n  - ${result.counterExample.caution}`
      : '- 本 brief 没有找到可用的反例候选（知识库里没有相关卡）。',
    '',
    '## 2 条风格参考',
    '',
    ...(result.atlas.length
      ? result.atlas.map((item) => `- **${item.title}**（\`${item.slug}\`）：命中 ${item.why.join('、')}`)
      : ['- 图集里没有匹配条目。']),
    '',
    '> 只读候选：不自动注入。要使用，请人工把相关条目抄进 `knowledgeContext`（或选一个气质预设）。',
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
}

main();
