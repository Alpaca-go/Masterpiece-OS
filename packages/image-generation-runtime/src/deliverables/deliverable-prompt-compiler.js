import { getDeliverableNegativeRules } from './deliverable-negative-rules.js';
import { resolveDeliverablePolicy } from './deliverable-policies.js';
import { resolveUserIntent } from './user-intent-resolver.js';

const SOURCE_LABELS = {
  visual_analysis: '视觉分析上下文',
  document_context: '文档上下文',
  reference_anchor: 'Reference Anchor',
  integrated_context: '完整上下文',
};

const list = (items, fallback = '无') => {
  const values = (items ?? []).map((item) => String(item).trim()).filter(Boolean);
  return values.length ? values.map((item) => `- ${item}`).join('\n') : `- ${fallback}`;
};

function referenceInstruction(references) {
  return (references ?? []).map((reference) => {
    const role = reference.generationRole ?? reference.role ?? 'unknown';
    return `${reference.assetId}: ${role}；仅承担该角色，不得继承不相关的物料类型或构图。`;
  });
}

export function compileDeliverablePrompt(input) {
  const {
    sourcePreset,
    purpose,
    deliverable,
    userIntent = {},
    lockedAssets = [],
    identity = [],
    upstreamContext = [],
    references = [],
    textSafety = [],
    outputSpec = [],
  } = input ?? {};
  const policy = resolveDeliverablePolicy(deliverable, { sourcePreset, purpose });
  const resolution = resolveUserIntent({ prompt: userIntent.prompt, deliverable });
  if (resolution.conflicts.length) {
    throw Object.assign(new Error(resolution.conflicts[0].message), {
      code: 'DELIVERABLE_USER_INTENT_CONFLICT',
      resolution,
    });
  }

  const sections = [
    ['A', '本次唯一输出任务', [
      `生成一张${policy.displayName}。`,
      `用户本次明确要求：${resolution.normalizedPrompt || '按当前交付类型生成。'}`,
      '如果上游上下文、参考图片或默认模板与本次任务冲突，必须优先服从本次交付类型与用户明确要求。',
    ].join('\n')],
    ['B', '必须呈现', list(policy.requiredPromptConcepts)],
    ['C', '严禁生成', list([...policy.forbiddenPromptConcepts, ...getDeliverableNegativeRules(deliverable)])],
    ['D', 'Locked Assets', list(lockedAssets)],
    ['E', '当前项目身份', list(identity)],
    ['F', '上游上下文', [`来源：${SOURCE_LABELS[sourcePreset] ?? sourcePreset ?? '未提供'}`, list(upstreamContext)].join('\n')],
    ['G', '参考图角色', list(referenceInstruction(references), '无参考图')],
    ['H', '文字安全', list(textSafety)],
    ['I', '输出规格', list(outputSpec)],
  ];
  const compiledPromptMarkdown = `# ${policy.displayName}生成任务\n\n${sections
    .map(([id, title, content]) => `## ${id}. ${title}\n${content}`)
    .join('\n\n')}\n`;
  const priorityOrder = [
    'deliverable',
    'userIntent',
    'lockedAssets',
    'identity',
    'upstreamContext',
    'references',
    'defaults',
  ];
  const promptSourceMap = {
    schemaVersion: '3.0',
    sourcePreset,
    deliverable,
    priorityOrder,
    sections: [
      { id: 'A', source: ['deliverable', 'userIntent'], priority: 1 },
      { id: 'B', source: ['deliverablePolicy.requiredPromptConcepts'], priority: 1 },
      { id: 'C', source: ['deliverablePolicy.forbiddenPromptConcepts', 'negativeRules'], priority: 1 },
      { id: 'D', source: ['lockedAssets'], priority: 2 },
      { id: 'E', source: ['identity'], priority: 3 },
      { id: 'F', source: ['sourcePreset', 'upstreamContext'], priority: 4 },
      { id: 'G', source: ['references'], priority: 5 },
      { id: 'H', source: ['textSafety'], priority: 6 },
      { id: 'I', source: ['outputSpec'], priority: 6 },
    ],
  };
  return {
    compiledPromptMarkdown,
    promptSourceMap,
    promptVersion: 3,
    userIntentResolution: resolution,
    deliverablePolicy: policy,
  };
}
