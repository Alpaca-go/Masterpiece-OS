import crypto from 'node:crypto';
import path from 'node:path';

export const GENERATION_PROMPT_COMPILER_VERSION = '1.0.0';

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
export function selectGenerationReferences(lockedAssets, canonImages) {
  const logo = lockedAssets.find((asset) => asset.type === 'logo' && asset.sourceFile);
  const structure = lockedAssets.find((asset) => asset.type === 'packaging_structure' && asset.sourceFile);
  const core = canonImages[0];
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
    ...(core ? [{
      id: core.id,
      role: 'core_reference',
      projectRelativePath: relative(core.imagePath),
    }] : []),
  ].slice(0, 3);
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

export function compileGenerationPromptSnapshot(input, now = new Date().toISOString()) {
  const userRequest = text(input?.userRequest);
  if (!userRequest) throw Object.assign(new Error('生成任务不能为空。'), { code: 'GENERATION_TASK_EMPTY' });
  if (!OUTPUT_TYPES.includes(input?.outputType)) {
    throw Object.assign(new Error('生成输出类型无效。'), { code: 'GENERATION_OUTPUT_INVALID' });
  }
  if (input?.styleProfile?.status !== 'confirmed') {
    throw Object.assign(new Error('生成前必须确认 Style Profile。'), { code: 'STYLE_PROFILE_NOT_CONFIRMED' });
  }
  const canonImages = resolveCanonImagesForTask(input.visualCanon, input.outputType);
  const lockedAssets = input.lockedAssets ?? [];
  const critical = lockedAssets.filter((asset) => asset.priority === 'critical');
  if (critical.some((asset) => !asset.rule || !asset.forbiddenChanges?.length)) {
    throw Object.assign(new Error('critical Locked Asset 规则不完整。'), { code: 'CRITICAL_LOCK_RULE_MISSING' });
  }
  const references = selectGenerationReferences(lockedAssets, canonImages);
  const preserve = unique([
    ...critical.map((asset) => asset.rule),
    ...input.styleProfile.promptComponents.required,
    ...input.visualCanon.sharedRules,
  ]);
  const avoid = unique([
    ...lockedAssets.flatMap((asset) => asset.forbiddenChanges),
    ...input.styleProfile.promptComponents.negative,
    ...input.styleProfile.forbiddenVariations,
  ]);
  const sceneDescription = `${userRequest}；${responsibility(input.outputType)}`;
  const composition = unique([
    ...input.styleProfile.compositionSystem.hierarchy,
    ...input.styleProfile.compositionSystem.focalPointRules,
  ]).join('；');
  const materialAndLighting = unique([
    ...input.styleProfile.materialAndTexture.materials,
    input.styleProfile.lightingSystem.type,
    input.styleProfile.lightingSystem.contrast,
  ]).join('；');
  const typographyAndGraphicUse = unique([
    ...input.styleProfile.typographyCompatibility,
    ...input.styleProfile.graphicLanguage.coreMotifs,
  ]).join('；');
  const finalPrompt = [
    '# User Task — highest priority',
    userRequest,
    '# Output Responsibility',
    responsibility(input.outputType),
    '# Preserve',
    list(preserve),
    '# Visual Canon',
    list(canonImages.map((image) => `${image.role}；图像仅作视觉基准，不复制无关物料组合`)),
    '# Composition',
    composition || '遵循 Primary Canon 的层级、密度与单一焦点。',
    '# Material and Lighting',
    materialAndLighting || '遵循 Primary Canon 的材质与光线。',
    '# Typography and Graphic Use',
    typographyAndGraphicUse || '仅在任务需要时使用品牌图形与文字。',
    '# Avoid',
    list(avoid),
    '# Single-output rule',
    '禁止拼贴、禁止多格合集、禁止一次生成多个结果类型。',
  ].join('\n\n');
  const instruction = {
    schemaVersion: '1.0',
    task: userRequest,
    outputResponsibility: responsibility(input.outputType),
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
    outputType: input.outputType,
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
    || !text(snapshot.requestId) || !OUTPUT_TYPES.includes(snapshot.outputType)) {
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
  if (!Array.isArray(snapshot.selectedReferences) || snapshot.selectedReferences.length > 3) {
    throw Object.assign(new Error('Generation Reference 超过 V18 小参考集上限。'), {
      code: 'GENERATION_REFERENCE_LIMIT_EXCEEDED',
    });
  }
  for (const reference of snapshot.selectedReferences) relative(reference.projectRelativePath);
  return snapshot;
}
