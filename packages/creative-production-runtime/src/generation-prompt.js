import crypto from 'node:crypto';
import path from 'node:path';

export const GENERATION_PROMPT_COMPILER_VERSION = '18.1.0';

const OUTPUT_TYPES = [
  'interior_scene', 'storefront_scene', 'packaging_render',
  'brand_poster', 'vi_application', 'illustration',
];

const CANON_TYPE_BY_OUTPUT = {
  interior_scene: 'spatial',
  storefront_scene: 'spatial',
  packaging_render: 'packaging',
  brand_poster: 'poster_graphic',
  vi_application: 'vi_application',
  illustration: 'illustration',
};

export function inferGenerationOutputType(userRequest) {
  const task = text(userRequest);
  if (!task) throw Object.assign(new Error('生成任务不能为空。'), { code: 'GENERATION_TASK_EMPTY' });
  if (/包装|包材|盒型|袋装|瓶装/iu.test(task)) return 'packaging_render';
  if (/门头|店招|外立面|店面外观/iu.test(task)) return 'storefront_scene';
  if (/店内|室内|空间|装修|展厅/iu.test(task)) return 'interior_scene';
  if (/海报|主视觉|KV/iu.test(task)) return 'brand_poster';
  if (/插画|角色|人物设定/iu.test(task)) return 'illustration';
  if (/VI|名片|菜单|工牌|物料|应用/iu.test(task)) return 'vi_application';
  throw Object.assign(new Error('无法从用户任务判断单一结果类型，请明确说明要生成空间、门店、包装、海报、VI 应用或插画。'), {
    code: 'GENERATION_OUTPUT_AMBIGUOUS',
  });
}

function text(value) { return String(value ?? '').trim(); }
function unique(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(text).filter(Boolean))];
}
function list(values) { return unique(values).map((value) => `- ${value}`).join('\n') || '- 无'; }
function relative(value) {
  const normalized = text(value).replaceAll('\\', '/');
  if (!normalized || path.posix.isAbsolute(normalized) || /^[a-z]:\//iu.test(normalized)
    || normalized.split('/').includes('..')) {
    throw Object.assign(new Error('Generation Reference 必须使用项目内相对路径。'), {
      code: 'GENERATION_REFERENCE_PATH_INVALID',
    });
  }
  return normalized;
}

export function resolveCanonImagesForTask(canon, outputType) {
  if (canon?.status !== 'confirmed') {
    throw Object.assign(new Error('生成前必须存在 confirmed Visual Canon。'), { code: 'VISUAL_CANON_NOT_CONFIRMED' });
  }
  const primary = canon.canonImages.find((image) => image.id === canon.primaryCanonImageId);
  const targetType = CANON_TYPE_BY_OUTPUT[outputType];
  const supporting = canon.canonImages.find((image) => image.priority === 'supporting' && image.type === targetType);
  return [primary, supporting].filter(Boolean);
}

/**
 * V18 默认小参考集：最多一张身份、一张必要结构、一张核心 Canon。
 * reading_only / exclude 资产从不由此函数接收，因此不会误发给 Image Provider。
 */
export function selectGenerationReferences(lockedAssets) {
  const logo = lockedAssets.find((asset) => asset.type === 'logo' && asset.sourceFile);
  const structure = lockedAssets.find((asset) => asset.type === 'packaging_structure' && asset.sourceFile);
  return [
    ...(logo ? [{
      id: logo.sourceAssetId || logo.id,
      role: 'identity_reference',
      projectRelativePath: relative(`input/${logo.sourceFile}`),
    }] : []),
    ...(structure ? [{
      id: structure.sourceAssetId || structure.id,
      role: 'structure_reference',
      projectRelativePath: relative(`input/${structure.sourceFile}`),
    }] : []),
  ].slice(0, 2);
}

function responsibility(outputType) {
  const map = {
    interior_scene: '只生成一个完整室内空间，不生成 VI 合集或多格拼贴。',
    storefront_scene: '只生成一个完整门店外立面场景。',
    packaging_render: '只生成一个真实包装渲染结果。',
    brand_poster: '只生成一张单一主画面的品牌海报。',
    vi_application: '只生成一种明确的 VI 应用物料。',
    illustration: '只生成一张完整插画。',
  };
  return map[outputType];
}

function directionStrategy(direction, outputType) {
  if (['interior_scene', 'storefront_scene'].includes(outputType)) {
    return direction.spaceStrategy || direction.designStrategy;
  }
  if (outputType === 'packaging_render') {
    return direction.packagingStrategy || direction.designStrategy;
  }
  if (outputType === 'brand_poster') {
    return direction.posterStrategy || direction.designStrategy;
  }
  return direction.designStrategy;
}

export function compileGenerationPromptSnapshot(input, now = new Date().toISOString()) {
  const userRequest = text(input?.userRequest);
  if (!userRequest) throw Object.assign(new Error('生成任务不能为空。'), { code: 'GENERATION_TASK_EMPTY' });
  const outputType = input?.outputType || inferGenerationOutputType(userRequest);
  if (!OUTPUT_TYPES.includes(outputType)) {
    throw Object.assign(new Error('生成输出类型无效。'), { code: 'GENERATION_OUTPUT_INVALID' });
  }
  if (input?.styleProfile?.status !== 'confirmed') {
    throw Object.assign(new Error('生成前必须确认 Style Profile。'), { code: 'STYLE_PROFILE_NOT_CONFIRMED' });
  }
  if (input?.creativeDirection?.status !== 'ready') {
    throw Object.assign(new Error('生成前必须存在 ready Creative Direction。'), {
      code: 'CREATIVE_DIRECTION_NOT_READY',
    });
  }
  const direction = input.creativeDirection;
  const canonImages = resolveCanonImagesForTask(input.visualCanon, outputType);
  const lockedAssets = input.lockedAssets ?? [];
  const critical = lockedAssets.filter((asset) => asset.priority === 'critical');
  if (critical.some((asset) => !asset.rule || !asset.forbiddenChanges?.length)) {
    throw Object.assign(new Error('critical Locked Asset 规则不完整。'), { code: 'CRITICAL_LOCK_RULE_MISSING' });
  }
  const references = selectGenerationReferences(lockedAssets);
  const recentContext = unique(input.recentContext).slice(-5);
  const preserve = unique([
    ...critical.map((asset) => asset.rule),
    ...direction.thingsToKeep,
    ...input.styleProfile.promptComponents.required,
    ...input.visualCanon.sharedRules,
  ]);
  const avoid = unique([
    ...direction.thingsToRemove,
    ...direction.generationRules,
    ...lockedAssets.flatMap((asset) => asset.forbiddenChanges),
    ...input.styleProfile.promptComponents.negative,
    ...input.styleProfile.forbiddenVariations,
  ]);
  const sceneDescription = `${userRequest}；${responsibility(outputType)}`;
  const composition = unique([
    direction.compositionStrategy,
    ...input.styleProfile.compositionSystem.hierarchy,
    ...input.styleProfile.compositionSystem.focalPointRules,
  ]).join('；');
  const materialAndLighting = unique([
    direction.materialStrategy,
    direction.photographyStrategy,
    ...input.styleProfile.materialAndTexture.materials,
    input.styleProfile.lightingSystem.type,
    input.styleProfile.lightingSystem.contrast,
  ]).join('；');
  const typographyAndGraphicUse = unique([
    direction.primaryConcept,
    ...input.styleProfile.typographyCompatibility,
    ...input.styleProfile.graphicLanguage.coreMotifs,
  ]).join('；');
  const finalPrompt = [
    '# User Task — highest priority',
    userRequest,
    ...(recentContext.length ? ['# Recent Session Feedback', list(recentContext)] : []),
    '# Output Responsibility',
    responsibility(outputType),
    '# Creative Direction — defines the new visual language',
    list([
      direction.projectTransformation,
      direction.designStrategy,
      `Primary concept: ${direction.primaryConcept}`,
      `Task strategy: ${directionStrategy(direction, outputType)}`,
      ...direction.visualKeywords,
    ]),
    '# Brand Identity — preserve only',
    list(preserve),
    '# Must stop carrying over from the old visual system',
    list(direction.thingsToRemove),
    '# Visual Canon — rules only, no Canon image is sent by default',
    list([
      ...(input.visualCanon.sharedRules ?? []),
      ...(input.visualCanon.variationRules ?? []),
    ]),
    '# Composition',
    composition || '遵循 Primary Canon 的层级、密度与单一焦点。',
    '# Material and Lighting',
    materialAndLighting || '遵循 Primary Canon 的材质与光线。',
    '# Typography and Graphic Use',
    typographyAndGraphicUse || '仅在任务需要时使用品牌图形与文字。',
    '# Avoid',
    list(avoid),
    '# Anti-copy rules',
    '原方案只负责品牌身份。禁止复制旧 VI、旧海报换内容、旧包装换皮、旧空间重新排列。',
    '# Single-output rule',
    '禁止拼贴、禁止多格合集、禁止一次生成多个结果类型。',
  ].join('\n\n');
  const instruction = {
    schemaVersion: '1.0',
    task: userRequest,
    outputResponsibility: responsibility(outputType),
    preserve,
    avoid,
    sceneDescription,
    composition,
    materialAndLighting,
    typographyAndGraphicUse,
    referenceAssetIds: references.map((reference) => reference.id),
    finalPrompt,
    generatedAt: now,
  };
  return validateGenerationPromptSnapshot({
    schemaVersion: '6.0',
    id: input.id || `prompt-snapshot-${crypto.randomUUID()}`,
    projectId: text(input.projectId),
    sessionId: text(input.sessionId),
    requestId: text(input.requestId) || `request-${crypto.randomUUID()}`,
    userRequest,
    creativeDirectionId: direction.id,
    creativeDirectionVersion: direction.version,
    outputType,
    styleProfileId: input.styleProfile.id,
    styleProfileVersion: input.styleProfile.version,
    visualCanonId: input.visualCanon.id,
    visualCanonVersion: input.visualCanon.version,
    lockedAssetIds: lockedAssets.map((asset) => asset.id),
    selectedReferences: references,
    instruction,
    negativePrompt: avoid.join(', '),
    compilerVersion: GENERATION_PROMPT_COMPILER_VERSION,
    createdAt: now,
  });
}

export function validateGenerationPromptSnapshot(snapshot) {
  if (!snapshot || snapshot.schemaVersion !== '6.0'
    || !text(snapshot.id) || !text(snapshot.projectId) || !text(snapshot.sessionId)
    || !text(snapshot.requestId) || !text(snapshot.creativeDirectionId)
    || !text(snapshot.creativeDirectionVersion) || !OUTPUT_TYPES.includes(snapshot.outputType)) {
    throw Object.assign(new Error('Generation Prompt Snapshot 基础字段无效。'), {
      code: 'GENERATION_SNAPSHOT_INVALID',
    });
  }
  if (!text(snapshot.instruction?.finalPrompt) || snapshot.instruction?.schemaVersion !== '1.0'
    || snapshot.instruction?.task !== snapshot.userRequest) {
    throw Object.assign(new Error('Final Generation Instruction 无效。'), {
      code: 'FINAL_GENERATION_INSTRUCTION_MISSING',
    });
  }
  if (!Array.isArray(snapshot.selectedReferences) || snapshot.selectedReferences.length > 2) {
    throw Object.assign(new Error('Generation Reference 超过 v18.1 小参考集上限。'), {
      code: 'GENERATION_REFERENCE_LIMIT_EXCEEDED',
    });
  }
  for (const reference of snapshot.selectedReferences) relative(reference.projectRelativePath);
  return snapshot;
}
