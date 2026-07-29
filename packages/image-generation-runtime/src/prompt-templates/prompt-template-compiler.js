import crypto from 'node:crypto';
import {
  DELIVERABLE_TEMPLATE_VERSION,
  validateDeliverableGenerationBlueprint,
} from './deliverable-template-system.js';

export const PROMPT_TEMPLATE_COMPILER_VERSION = 'prompt-template-1.0.0';

function text(value) {
  return String(value ?? '').trim();
}

function unique(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(text).filter(Boolean))];
}

function list(values, fallback = '无') {
  const items = unique(values);
  return items.length ? items.map((item) => `- ${item}`).join('\n') : `- ${fallback}`;
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function compilePromptTemplate(input) {
  const blueprint = validateDeliverableGenerationBlueprint(input?.blueprint);
  const visualMemory = input?.visualMemory;
  if (!visualMemory || visualMemory.schema_version !== '1.0'
    || blueprint.visualMemoryId !== visualMemory.id) {
    throw Object.assign(new Error('Prompt Template Compiler received stale Visual Memory.'), {
      code: 'PROMPT_TEMPLATE_VISUAL_MEMORY_STALE',
    });
  }
  const modelConstraints = input?.modelConstraints ?? {};
  const sections = [
    ['1', 'Task Definition', [
      blueprint.task.definition,
      `用户目标：${blueprint.task.userGoal}`,
      `使用场景：${blueprint.task.usageScenario}`,
      `商业用途：${blueprint.task.commercialUse}`,
    ].join('\n')],
    ['2', 'Brand Context', [
      `品牌定位：${blueprint.brandContext.positioning}`,
      `行业属性：${blueprint.brandContext.industry}`,
      `品牌气质：${unique(blueprint.brandContext.temperament).join('；')}`,
    ].join('\n')],
    ['3', 'Visual Mechanism', list(blueprint.visualDirection)],
    ['4', 'Color System', [
      list(blueprint.color.palette),
      `使用比例：${blueprint.color.usageRule}`,
      `禁止颜色：${unique(blueprint.color.forbidden).join('；') || '无额外禁止颜色'}`,
    ].join('\n')],
    ['5', 'Material System', list(blueprint.material)],
    ['6', 'Composition / Structure', list(blueprint.composition)],
    ['7', 'Photography Direction', list(blueprint.photography)],
    ['8', 'Reference Conditioning', blueprint.referenceAssets.length
      ? blueprint.referenceAssets.map((reference, index) =>
          `${index + 1}. ${reference.assetId} | ${reference.role} | ${reference.rationale || '仅按指定角色使用'}`)
        .join('\n')
      : '无参考图；只根据已批准的品牌视觉记忆执行。'],
    ['9', 'Negative Rules', list(blueprint.negativeRules)],
    ['10', 'Model Execution Constraints', [
      `唯一交付物：${blueprint.deliverableType}`,
      `必须保留：\n${list(modelConstraints.preserve)}`,
      `补充执行规则：\n${list(modelConstraints.executionRules)}`,
      `文字安全：\n${list(modelConstraints.textSafety)}`,
      `输出规格：\n${list(modelConstraints.outputSpec)}`,
      '只输出一张完成的商业图片，不输出解释、提案板、拼贴或候选方向。',
    ].join('\n')],
  ];
  const finalPrompt = [
    `# ${blueprint.templateId} Deliverable Generation Prompt`,
    `Template: ${blueprint.templateId}@${blueprint.templateVersion}`,
    `Compiler: ${PROMPT_TEMPLATE_COMPILER_VERSION}`,
    ...sections.map(([id, title, content]) => `## ${id}. ${title}\n${content}`),
  ].join('\n\n') + '\n';
  const promptSourceMap = {
    schemaVersion: '1.0',
    templateId: blueprint.templateId,
    templateVersion: blueprint.templateVersion,
    compilerVersion: PROMPT_TEMPLATE_COMPILER_VERSION,
    sections: [
      { id: '1', sources: ['blueprint.task'] },
      { id: '2', sources: ['visualMemory.brand_core'] },
      { id: '3', sources: ['visualMemory.visual_dna.graphic_language', 'visualMemory.visual_opportunities', 'template.visualMechanism'] },
      { id: '4', sources: ['visualMemory.visual_dna.colors', 'template.colorUsageRule'] },
      { id: '5', sources: ['visualMemory.visual_dna.materials', 'template.materialBehavior'] },
      { id: '6', sources: ['template.composition'] },
      { id: '7', sources: ['visualMemory.visual_dna.photography', 'template.photography'] },
      { id: '8', sources: ['referenceAssets'] },
      { id: '9', sources: ['visualMemory.visual_problems', 'visualMemory.generation_rules.avoid', 'template.negativeRules'] },
      { id: '10', sources: ['modelConstraints'] },
    ],
  };
  const promptVersion = `${PROMPT_TEMPLATE_COMPILER_VERSION}/${blueprint.templateId}@${DELIVERABLE_TEMPLATE_VERSION}`;
  const promptFingerprint = stableHash({
    blueprint,
    promptVersion,
    finalPrompt,
    promptSourceMap,
  });
  return {
    finalPrompt,
    promptVersion,
    compilerVersion: PROMPT_TEMPLATE_COMPILER_VERSION,
    templateVersion: DELIVERABLE_TEMPLATE_VERSION,
    promptFingerprint,
    promptSourceMap,
  };
}

export function verifyPromptTemplateFingerprint(input) {
  return text(input?.promptFingerprint) === stableHash({
    blueprint: input?.blueprint,
    promptVersion: input?.promptVersion,
    finalPrompt: input?.finalPrompt,
    promptSourceMap: input?.promptSourceMap,
  });
}
