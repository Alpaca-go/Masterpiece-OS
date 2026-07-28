export const CREATIVE_READING_PROMPT_VERSION = '18.0.0';

function text(value) { return String(value ?? '').trim(); }
function strings(value) {
  return [...new Set((Array.isArray(value) ? value : []).map(text).filter(Boolean))];
}

export function buildCreativeReadingPrompt(input) {
  const assets = input.assets.map((asset) => `- ${asset.id} | ${asset.name}`).join('\n');
  return `你是负责该项目视觉升级的创意总监。完整阅读原始视觉设计方案、视觉分析升级报告和项目上下文。

本阶段只理解项目，禁止生成图片，禁止输出三个方向、包装/海报/空间方案，禁止把所有旧图视为 Locked Assets 或最终生图参考。

必须输出且只输出一个 JSON 对象：
{
  "schemaVersion": "1.0",
  "projectIdentity": { "brandName": string, "industry": string, "products": string[] },
  "identityLocks": string[],
  "valuableAssets": string[],
  "currentProblems": string[],
  "upgradePrinciples": string[],
  "oldPatternsToAvoid": string[],
  "creativeFreedom": string[],
  "assetReadingSummary": [{
    "assetId": string,
    "summary": string,
    "recommendedUsage": "identity_reference" | "structure_reference" | "reading_only" | "exclude"
  }]
}

规则：
1. Logo、品牌名和已确认必要结构必须进入 identityLocks，不得标记为可修改。
2. 每个输入图片 assetId 必须且只能出现一次。
3. 大多数旧海报、VI 拼贴、物料合集应为 reading_only；只有身份或必要结构证据可成为 reference。
4. 不得虚构输入中不存在的 assetId。
5. 不要输出 finalPrompt 或 Final Generation Instruction。

项目上下文：
${JSON.stringify(input.visualContext)}

已确认 Locked Assets：
${JSON.stringify(input.lockedAssets)}

视觉分析升级报告：
${input.reportText}

全部原图清单：
${assets}`;
}

export function parseCreativeReadingResponse(rawText) {
  const stripped = text(rawText).replace(/```(?:json)?/giu, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw Object.assign(new Error('Creative Reading 输出中未找到 JSON。'), {
      code: 'CREATIVE_UNDERSTANDING_MISSING',
    });
  }
  try {
    return JSON.parse(stripped.slice(start, end + 1));
  } catch (error) {
    throw Object.assign(new Error(`Creative Reading JSON 解析失败：${error.message}`), {
      code: 'CREATIVE_UNDERSTANDING_MISSING',
    });
  }
}

export function normalizeCreativeUnderstanding(value, assetIds, now = new Date().toISOString()) {
  const understanding = {
    schemaVersion: '1.0',
    projectIdentity: {
      ...(text(value?.projectIdentity?.brandName) ? { brandName: text(value.projectIdentity.brandName) } : {}),
      ...(text(value?.projectIdentity?.industry) ? { industry: text(value.projectIdentity.industry) } : {}),
      products: strings(value?.projectIdentity?.products),
    },
    identityLocks: strings(value?.identityLocks),
    valuableAssets: strings(value?.valuableAssets),
    currentProblems: strings(value?.currentProblems),
    upgradePrinciples: strings(value?.upgradePrinciples),
    oldPatternsToAvoid: strings(value?.oldPatternsToAvoid),
    creativeFreedom: strings(value?.creativeFreedom),
    assetReadingSummary: (Array.isArray(value?.assetReadingSummary) ? value.assetReadingSummary : []).map((item) => ({
      assetId: text(item?.assetId),
      summary: text(item?.summary),
      recommendedUsage: text(item?.recommendedUsage),
    })),
    generatedAt: now,
  };
  return validateCreativeUnderstanding(understanding, assetIds);
}

export function validateCreativeUnderstanding(understanding, assetIds = []) {
  if (!understanding || understanding.schemaVersion !== '1.0') {
    throw Object.assign(new Error('Creative Understanding 缺失。'), { code: 'CREATIVE_UNDERSTANDING_MISSING' });
  }
  if (!text(understanding.projectIdentity?.brandName) && !text(understanding.projectIdentity?.industry)) {
    throw Object.assign(new Error('Creative Understanding 缺少项目身份。'), { code: 'PROJECT_IDENTITY_MISSING' });
  }
  if (!understanding.identityLocks?.length) {
    throw Object.assign(new Error('Creative Understanding 缺少身份锁定。'), { code: 'IDENTITY_LOCKS_EMPTY' });
  }
  if (!understanding.oldPatternsToAvoid?.length) {
    throw Object.assign(new Error('Creative Understanding 缺少旧模式禁用项。'), {
      code: 'OLD_PATTERNS_TO_AVOID_EMPTY',
    });
  }
  const summaries = understanding.assetReadingSummary ?? [];
  const expected = new Set(assetIds);
  const actual = new Set();
  for (const item of summaries) {
    if (!expected.has(item.assetId) || actual.has(item.assetId) || !text(item.summary)
      || !['identity_reference', 'structure_reference', 'reading_only', 'exclude'].includes(item.recommendedUsage)) {
      throw Object.assign(new Error('Creative Understanding 的原图使用分类无效。'), {
        code: 'ASSET_READING_SUMMARY_INVALID',
      });
    }
    actual.add(item.assetId);
  }
  if (actual.size !== expected.size) {
    throw Object.assign(new Error('Creative Understanding 未覆盖全部原图。'), {
      code: 'ASSET_READING_SUMMARY_INVALID',
    });
  }
  if (summaries.length > 1 && summaries.every((item) =>
    ['identity_reference', 'structure_reference'].includes(item.recommendedUsage))) {
    throw Object.assign(new Error('不能把全部原图标记为最终参考。'), {
      code: 'ALL_ASSETS_MARKED_FINAL_REFERENCE',
    });
  }
  if (understanding.creativeFreedom.some((rule) => /logo|标志|品牌名|标准字/iu.test(rule))) {
    throw Object.assign(new Error('Logo 或品牌身份被错误标记为可修改。'), {
      code: 'LOGO_MARKED_CHANGEABLE',
    });
  }
  return understanding;
}

export function compileCreativeUnderstandingMarkdown(value) {
  const section = (title, items) => `## ${title}\n\n${items.length ? items.map((item) => `- ${item}`).join('\n') : '- 无'}`;
  return [
    '# Creative Understanding',
    `品牌：${value.projectIdentity.brandName || '待确认'}`,
    `行业：${value.projectIdentity.industry || '待确认'}`,
    section('必须锁定', value.identityLocks),
    section('值得保留', value.valuableAssets),
    section('当前问题', value.currentProblems),
    section('升级原则', value.upgradePrinciples),
    section('禁止继续沿用', value.oldPatternsToAvoid),
    section('可以自由重构', value.creativeFreedom),
    '## 原图后续用途',
    ...value.assetReadingSummary.map((item) => `- ${item.assetId} · ${item.recommendedUsage} · ${item.summary}`),
  ].join('\n\n');
}
