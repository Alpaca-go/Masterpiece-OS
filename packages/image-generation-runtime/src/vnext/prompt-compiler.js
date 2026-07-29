import crypto from 'node:crypto';
import { assertVNextProjectPromptAsset } from './project-prompt-asset.js';

export const VNEXT_PROMPT_COMPILER_ID = 'vnext-prompt-compiler';
export const VNEXT_PROMPT_COMPILER_VERSION = '2.0.0';

const REQUIRED_BLOCK_IDS = Object.freeze([
  'deliverable_identity',
  'task_contract',
  'project_identity',
  'upgrade_thesis',
  'tone_boundary',
  'professional_contract',
  'brand_translation',
  'color_system',
  'material_system',
  'lighting_system',
  'camera_composition',
  'logo_text_and_negatives',
]);

function cleanList(...values) {
  const result = [];
  const seen = new Set();
  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value !== 'string') return;
    const clean = value.trim().replace(/\s+/gu, ' ');
    const key = clean.toLocaleLowerCase();
    if (clean && !seen.has(key)) {
      seen.add(key);
      result.push(clean);
    }
  };
  values.forEach(visit);
  return result;
}

function comparable(value) {
  return String(value).toLocaleLowerCase().replace(/[\s.,，。:：;；\-_/()[\]{}]+/gu, '');
}

function exactConflicts(includes, avoids) {
  const avoided = new Map(avoids.map((item) => [comparable(item), item]));
  return includes
    .filter((item) => avoided.has(comparable(item)))
    .map((item) => ({ value: item, conflictingValue: avoided.get(comparable(item)) }));
}

function renderBlock(block) {
  return `【${block.title}】\n${block.items.map((item) => `- ${item}`).join('\n')}`;
}

function formatColorUsage(group, label) {
  return cleanList(group?.map((item) => {
    const ratio = Number.isFinite(item?.ratio) ? `，建议占比 ${item.ratio}%` : '';
    return `${label}：${item?.name || '未命名色'}，用途为 ${item?.role || '按品牌层级使用'}${ratio}`;
  }));
}

function transformationItems(transformations) {
  return cleanList(transformations?.flatMap((item) => [
    item?.sourceAsset ? `从“${item.sourceAsset}”提取抽象属性：${cleanList(item.abstractProperties).join('、')}` : '',
    cleanList(item?.newExpression).length
      ? `将其转译为：${cleanList(item.newExpression).join('；')}`
      : '',
    cleanList(item?.forbiddenLiteralUse).length
      ? `不得照搬：${cleanList(item.forbiddenLiteralUse).join('；')}`
      : '',
  ]));
}

function toneItems(boundaries, fallback) {
  const values = cleanList(boundaries?.map((item) => {
    const avoids = cleanList(item?.avoid);
    return item?.target
      ? `目标气质：${item.target}${avoids.length ? `；避免：${avoids.join('、')}` : ''}`
      : '';
  }));
  return values.length ? values : cleanList(fallback, '保持品牌气质清晰、克制且一致。');
}

function materialItems(materials, fallback) {
  const values = cleanList(materials?.map((item) => {
    const behavior = cleanList(item?.behavior).join('、');
    const forbidden = cleanList(item?.forbidden).join('、');
    return `${item?.material || '材料'}：${behavior || '呈现真实物理属性'}；品牌作用：${item?.brandRole || '承载品牌气质'}${forbidden ? `；避免：${forbidden}` : ''}`;
  }));
  return values.length ? values : cleanList(fallback, '材料、接缝、厚度与表面响应必须真实可建造。');
}

function createBlock(id, title, items, sources, fallback) {
  return {
    id,
    title,
    items: cleanList(items).length ? cleanList(items) : [fallback],
    sources: cleanList(sources),
  };
}

export function compileVNextPrompt({ projectContext, taskContract, route, adapter, projectPromptAsset }) {
  if (projectContext.schemaVersion !== '2.0') {
    throw new Error('vNext prompt compiler requires Project Visual Context 2.0');
  }
  if (projectContext.projectId !== taskContract.projectId) {
    throw new Error('Task Contract and Project Visual Context belong to different projects');
  }

  const promptAsset = projectPromptAsset
    ? assertVNextProjectPromptAsset(
      projectPromptAsset,
      taskContract.projectId,
      taskContract.deliverableFamily,
    )
    : null;
  const templates = route.templates;
  const templateSections = (key) => cleanList(
    templates.map((template) => template.sections?.[key] ?? []),
  );
  const source = projectContext.promptSourceObject;
  const conflicts = exactConflicts(taskContract.mustInclude, taskContract.mustAvoid);
  if (conflicts.length) {
    throw new Error(`Task Contract contains the same requirement in mustInclude and mustAvoid: ${conflicts.map((item) => item.value).join(', ')}`);
  }

  const negativeConstraints = cleanList(
    taskContract.mustAvoid,
    source?.negativeRules?.project,
    projectContext.styleBoundaries.mustAvoid,
    promptAsset?.negativeConstraints,
    source?.negativeRules?.model,
    templateSections('negative'),
  );
  const colorItems = cleanList(
    formatColorUsage(source?.renderLanguage?.colorBehavior?.primary, '主色'),
    formatColorUsage(source?.renderLanguage?.colorBehavior?.secondary, '辅助色'),
    formatColorUsage(source?.renderLanguage?.colorBehavior?.accent, '点缀色'),
    source?.renderLanguage?.colorBehavior?.forbidden?.map((item) => `色彩禁用：${item}`),
    projectContext.lockedAssets.confirmedColors.map((item) => `已确认品牌色：${item}`),
    projectContext.visualIdentity.colorBehavior,
  );
  const lighting = source?.renderLanguage?.lightingBehavior;
  const logoAssetIds = cleanList(
    source?.lockedAssets?.logoAssetIds,
    projectContext.lockedAssets.logoAssetIds,
  );

  // Fixed block order is part of the provider contract. Within each block the
  // priority is task > locked facts > extracted translation > context > template.
  const blocks = [
    createBlock(
      'deliverable_identity',
      '01 Deliverable Identity',
      [
        `Generate exactly one ${taskContract.deliverableFamily} / ${taskContract.subtype} / ${taskContract.shot} result.`,
        templateSections('definition'),
      ],
      ['task_contract', ...templates.map((item) => item.id)],
      'Generate one clearly identifiable formal deliverable.',
    ),
    createBlock(
      'task_contract',
      '02 Current Task — Highest Priority',
      [
        taskContract.currentInstruction,
        taskContract.mustInclude.map((item) => `Must include: ${item}`),
        `Aspect ratio: ${taskContract.aspectRatio}`,
      ],
      ['task_contract'],
      'Execute the current user instruction without changing deliverable type.',
    ),
    createBlock(
      'project_identity',
      '03 Project Identity',
      [
        `Brand: ${projectContext.brandCore.name}`,
        projectContext.brandCore.industry !== 'unknown' ? `Industry: ${projectContext.brandCore.industry}` : '',
        source?.projectFacts?.brandRole || projectContext.brandCore.brandRole
          ? `Brand role: ${source?.projectFacts?.brandRole || projectContext.brandCore.brandRole}`
          : '',
        source?.projectFacts?.primaryOfferings?.length
          ? `Primary offerings: ${source.projectFacts.primaryOfferings.join('、')}`
          : '',
        projectContext.brandCore.audience.length
          ? `Audience: ${projectContext.brandCore.audience.join('、')}`
          : '',
      ],
      ['project_record', 'structured_analysis'],
      'Preserve the confirmed project identity.',
    ),
    createBlock(
      'upgrade_thesis',
      '04 Upgrade Thesis',
      [
        source?.upgradeTranslation?.preserve?.map((item) => `Preserve: ${item}`),
        source?.upgradeTranslation?.weaken?.map((item) => `Weaken: ${item}`),
        source?.upgradeTranslation?.remove?.map((item) => `Remove: ${item}`),
        source?.upgradeTranslation?.targetWorldview?.map((item) => `Target worldview: ${item}`),
        promptAsset?.promptFragments,
      ],
      ['prompt_source.upgradeTranslation', ...(promptAsset ? [`project_prompt_asset:${promptAsset.id}`] : [])],
      'Upgrade the existing identity through relationships, proportion and behavior rather than literal decoration.',
    ),
    createBlock(
      'tone_boundary',
      '05 Tone Boundaries',
      toneItems(source?.upgradeTranslation?.toneBoundaries, projectContext.visualIdentity.tone),
      ['prompt_source.upgradeTranslation.toneBoundaries', 'project_context.visualIdentity.tone'],
      'Keep the intended brand tone while avoiding generic industry clichés.',
    ),
    createBlock(
      'professional_contract',
      taskContract.deliverableFamily === 'space' ? '06 Spatial Contract' : '06 Professional Contract',
      templateSections('professionalRequirements'),
      templates.map((item) => item.id),
      'Make the requested result physically credible, usable and professionally resolved.',
    ),
    createBlock(
      'brand_translation',
      '07 Brand Translation',
      [
        projectContext.lockedAssets.mustPreserve.map((item) => `Locked — preserve: ${item}`),
        source?.lockedAssets?.mustPreserve?.map((item) => `Locked — preserve: ${item}`),
        transformationItems(source?.upgradeTranslation?.transformations),
        source?.renderLanguage?.graphicBehavior,
        projectContext.visualIdentity.graphicBehavior,
      ],
      ['locked_assets', 'prompt_source.upgradeTranslation.transformations', 'project_context.visualIdentity'],
      'Translate identity into form, rhythm, detail and spatial or object behavior; do not paste symbols as decoration.',
    ),
    createBlock(
      'color_system',
      '08 Color System',
      colorItems,
      ['locked_assets.confirmedColors', 'prompt_source.renderLanguage.colorBehavior', 'project_context.visualIdentity.colorBehavior'],
      'Use a controlled brand-led palette with clear dominant, secondary and accent hierarchy.',
    ),
    createBlock(
      'material_system',
      '09 Material System',
      materialItems(source?.renderLanguage?.materialBehavior, projectContext.visualIdentity.materialBehavior),
      ['prompt_source.renderLanguage.materialBehavior', 'project_context.visualIdentity.materialBehavior'],
      'Use physically credible materials with controlled junctions and scale.',
    ),
    createBlock(
      'lighting_system',
      '10 Lighting System',
      [
        lighting?.source?.length ? `Light sources: ${lighting.source.join('、')}` : '',
        lighting?.contrast ? `Contrast: ${lighting.contrast}` : '',
        lighting?.interactionWithMaterials?.map((item) => `Light/material behavior: ${item}`),
        lighting?.forbidden?.map((item) => `Lighting prohibition: ${item}`),
        projectContext.visualIdentity.lightingBehavior,
      ],
      ['prompt_source.renderLanguage.lightingBehavior', 'project_context.visualIdentity.lightingBehavior'],
      'Use physically plausible layered lighting with readable material response and no blown highlights.',
    ),
    createBlock(
      'camera_composition',
      '11 Camera, Composition and Realism',
      [
        templateSections('composition'),
        projectContext.visualIdentity.compositionBehavior,
        templateSections('realism'),
        `Output ratio: ${taskContract.aspectRatio}`,
      ],
      [...templates.map((item) => item.id), 'project_context.visualIdentity.compositionBehavior'],
      'Use a credible commercial camera view with controlled perspective, hierarchy, depth and scale.',
    ),
    createBlock(
      'logo_text_and_negatives',
      '12 Logo, Text and Strict Negatives',
      [
        logoAssetIds.length
          ? `Use the supplied logo asset as the only identity reference; preserve its structure and do not redesign it.`
          : 'Do not invent a logo. Reserve a clean identity placement area when signage is needed.',
        taskContract.mustAvoid.map((item) => `User prohibition: ${item}`),
        negativeConstraints.map((item) => `Strict negative: ${item}`),
      ],
      ['task_contract.mustAvoid', 'locked_assets.logoAssetIds', 'prompt_source.negativeRules', ...templates.map((item) => item.id)],
      'Do not invent logos, text, brand marks or unrequested deliverables.',
    ),
  ];

  const missingBlocks = REQUIRED_BLOCK_IDS.filter((id) =>
    !blocks.some((block) => block.id === id && block.items.length));
  if (missingBlocks.length) {
    throw new Error(`vNext prompt is incomplete; missing blocks: ${missingBlocks.join(', ')}`);
  }

  const renderedBlocks = blocks.map(renderBlock);
  const finalPrompt = adapter.orderSections(renderedBlocks).join('\n\n');
  const sourceMap = Object.fromEntries(blocks.map((block) => [block.id, [...block.sources]]));
  const traceValue = {
    projectContextFingerprint: projectContext.provenance.sourceFingerprint,
    promptSourceFingerprint: source?.provenance?.sourceFingerprint ?? null,
    taskContract,
    route: {
      familyTemplateId: route.familyTemplateId,
      subtypeTemplateId: route.subtypeTemplateId,
      shotTemplateId: route.shotTemplateId,
      templateVersions: route.templateVersions,
    },
    projectPromptAsset: promptAsset
      ? { id: promptAsset.id, version: promptAsset.version }
      : null,
    blocks,
    finalPrompt,
  };

  return {
    schemaVersion: '1.0',
    taskContract,
    projectContextVersion: projectContext.version,
    route: {
      familyTemplateId: route.familyTemplateId,
      subtypeTemplateId: route.subtypeTemplateId,
      shotTemplateId: route.shotTemplateId,
      templateVersions: route.templateVersions,
    },
    blocks,
    sourceMap,
    completeness: {
      complete: true,
      requiredBlockIds: [...REQUIRED_BLOCK_IDS],
      missingBlockIds: [],
      conflictCount: conflicts.length,
    },
    finalPrompt,
    editablePrompt: finalPrompt,
    negativeConstraints,
    referenceAssetIds: taskContract.referenceAssetIds,
    compiledAt: new Date().toISOString(),
    trace: {
      compilerId: VNEXT_PROMPT_COMPILER_ID,
      compilerVersion: VNEXT_PROMPT_COMPILER_VERSION,
      adapterId: adapter.id,
      adapterVersion: adapter.version,
      sourceFingerprint: crypto.createHash('sha256').update(JSON.stringify(traceValue)).digest('hex'),
      ...(promptAsset ? {
        projectPromptAssetId: promptAsset.id,
        projectPromptAssetVersion: promptAsset.version,
      } : {}),
    },
  };
}
