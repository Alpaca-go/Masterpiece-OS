export const CREATIVE_DIRECTION_RUNTIME_VERSION = '18.1.0';

const REQUIRED_ARRAY_FIELDS = [
  'oldVisualProblems',
  'visualKeywords',
  'thingsToRemove',
  'thingsToKeep',
  'generationRules',
];

const REQUIRED_TEXT_FIELDS = [
  'projectTransformation',
  'designStrategy',
  'primaryConcept',
  'colorStrategy',
  'materialStrategy',
  'compositionStrategy',
  'photographyStrategy',
];

function text(value) {
  return String(value ?? '').trim();
}

function strings(value) {
  return [...new Set((Array.isArray(value) ? value : []).map(text).filter(Boolean))];
}

export function buildCreativeDirectionPrompt(input) {
  const userDirection = text(input.directionBrief);
  return `你现在是该品牌项目的创意总监。

你已经获得经过校验的 Creative Understanding 与视觉分析升级报告。现在不要生成图片，也不要重新读取或猜测任何原始图片。

你的任务不是延展旧 VI，而是判断旧方案的问题，制定一套明显不同、同时保持品牌身份准确的新视觉方向。

禁止：
- 原 VI 换场景
- 原海报换产品或重新排列
- 原包装只换材质
- 原空间只替换表面装饰
- 输出多个备选方向
- 输出图片、Markdown 或 JSON 之外的解释

必须输出且只输出一个 JSON 对象：
{
  "schemaVersion": "1.0",
  "projectTransformation": string,
  "oldVisualProblems": string[],
  "designStrategy": string,
  "primaryConcept": string,
  "visualKeywords": string[],
  "thingsToRemove": string[],
  "thingsToKeep": string[],
  "colorStrategy": string,
  "materialStrategy": string,
  "compositionStrategy": string,
  "photographyStrategy": string,
  "spaceStrategy": string,
  "packagingStrategy": string,
  "posterStrategy": string,
  "generationRules": string[]
}

要求：
1. thingsToKeep 只能保留品牌身份与真正有价值的资产，不能把旧构图、旧版式、旧场景整体保留。
2. thingsToRemove 必须明确列出停止沿用的旧视觉机制。
3. designStrategy 与 primaryConcept 必须给出一条可执行的新方向，而不是“更高级、更现代”等空泛形容词。
4. generationRules 必须明确禁止复制旧 VI、旧海报换内容、旧包装换皮和旧空间重新排列。
5. 空间、包装、海报策略必须分别说明如何建立新系统。

${userDirection
    ? `用户要求的下一版变化方向（必须落实，但仍需由你扩展成完整系统）：\n${userDirection}\n`
    : ''}

Creative Understanding：
${JSON.stringify(input.understanding, null, 2)}

视觉分析升级报告：
${text(input.analysisReport)}`;
}

export function parseCreativeDirectionResponse(rawText) {
  if (rawText && typeof rawText === 'object') return rawText;
  const stripped = text(rawText).replace(/```(?:json)?/giu, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw Object.assign(new Error('Creative Direction 输出中未找到 JSON。'), {
      code: 'CREATIVE_DIRECTION_PARSE_FAILED',
    });
  }
  try {
    return JSON.parse(stripped.slice(start, end + 1));
  } catch (error) {
    throw Object.assign(new Error(`Creative Direction JSON 解析失败：${error.message}`), {
      code: 'CREATIVE_DIRECTION_PARSE_FAILED',
    });
  }
}

export function normalizeCreativeDirection(value, metadata, now = new Date().toISOString()) {
  const direction = {
    schemaVersion: '1.0',
    id: text(metadata.id),
    projectId: text(metadata.projectId),
    sessionId: text(metadata.sessionId),
    version: text(metadata.version),
    status: 'ready',
    projectTransformation: text(value?.projectTransformation),
    oldVisualProblems: strings(value?.oldVisualProblems),
    designStrategy: text(value?.designStrategy),
    primaryConcept: text(value?.primaryConcept),
    visualKeywords: strings(value?.visualKeywords),
    thingsToRemove: strings(value?.thingsToRemove),
    thingsToKeep: strings(value?.thingsToKeep),
    colorStrategy: text(value?.colorStrategy),
    materialStrategy: text(value?.materialStrategy),
    compositionStrategy: text(value?.compositionStrategy),
    photographyStrategy: text(value?.photographyStrategy),
    ...(text(value?.spaceStrategy) ? { spaceStrategy: text(value.spaceStrategy) } : {}),
    ...(text(value?.packagingStrategy) ? { packagingStrategy: text(value.packagingStrategy) } : {}),
    ...(text(value?.posterStrategy) ? { posterStrategy: text(value.posterStrategy) } : {}),
    generationRules: strings(value?.generationRules),
    source: {
      understandingGeneratedAt: text(metadata.understandingGeneratedAt),
      reportPath: text(metadata.reportPath),
      runtimeVersion: CREATIVE_DIRECTION_RUNTIME_VERSION,
    },
    generatedAt: now,
  };
  return validateCreativeDirection(direction);
}

export function validateCreativeDirection(direction) {
  if (!direction || direction.schemaVersion !== '1.0') {
    throw Object.assign(new Error('Creative Direction Schema 版本无效。'), {
      code: 'CREATIVE_DIRECTION_INVALID',
    });
  }
  for (const field of ['id', 'projectId', 'sessionId', 'version', ...REQUIRED_TEXT_FIELDS]) {
    if (!text(direction[field])) {
      throw Object.assign(new Error(`Creative Direction 缺少 ${field}。`), {
        code: 'CREATIVE_DIRECTION_INVALID',
      });
    }
  }
  for (const field of REQUIRED_ARRAY_FIELDS) {
    if (!strings(direction[field]).length) {
      throw Object.assign(new Error(`Creative Direction 缺少 ${field}。`), {
        code: 'CREATIVE_DIRECTION_INVALID',
      });
    }
  }
  if (!['ready', 'superseded'].includes(direction.status)) {
    throw Object.assign(new Error('Creative Direction 状态无效。'), {
      code: 'CREATIVE_DIRECTION_INVALID',
    });
  }
  const keep = new Set(strings(direction.thingsToKeep).map((item) => item.toLowerCase()));
  if (strings(direction.thingsToRemove).some((item) => keep.has(item.toLowerCase()))) {
    throw Object.assign(new Error('Creative Direction 的保留项与删除项冲突。'), {
      code: 'CREATIVE_DIRECTION_CONFLICT',
    });
  }
  const antiCopy = strings(direction.generationRules).join('\n');
  if (!/旧|原|复制|复刻|换皮|重新排列/iu.test(antiCopy)) {
    throw Object.assign(new Error('Creative Direction 缺少反复刻生成规则。'), {
      code: 'CREATIVE_DIRECTION_ANTI_COPY_MISSING',
    });
  }
  return direction;
}

export function compileCreativeDirectionMarkdown(direction) {
  const list = (values) => values.map((item) => `- ${item}`).join('\n');
  return [
    `# Creative Direction ${direction.version}`,
    `## 项目转型\n\n${direction.projectTransformation}`,
    `## 核心概念\n\n${direction.primaryConcept}`,
    `## 设计策略\n\n${direction.designStrategy}`,
    `## 当前问题\n\n${list(direction.oldVisualProblems)}`,
    `## 停止沿用\n\n${list(direction.thingsToRemove)}`,
    `## 必须保留\n\n${list(direction.thingsToKeep)}`,
    `## 视觉关键词\n\n${list(direction.visualKeywords)}`,
    `## 色彩\n\n${direction.colorStrategy}`,
    `## 材质\n\n${direction.materialStrategy}`,
    `## 构图\n\n${direction.compositionStrategy}`,
    `## 摄影\n\n${direction.photographyStrategy}`,
    `## 生成规则\n\n${list(direction.generationRules)}`,
  ].join('\n\n');
}
