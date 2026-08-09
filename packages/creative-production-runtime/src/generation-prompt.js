import crypto from 'node:crypto';
import path from 'node:path';
import {
  compileGenerationBlueprint,
  compileGenerationBlueprintPrompt,
  validateGenerationBlueprint,
} from './generation-blueprint.js';
import { compileVisualMemoryPrompt, validateVisualMemory } from './visual-memory.js';
import {
  selectProviderReferencesFromPack,
  validateReferencePack,
} from './reference-pack.js';
import {
  compileDeliverableGenerationBlueprint,
  validateDeliverableGenerationBlueprint,
} from '../../image-generation-runtime/src/prompt-templates/deliverable-template-system.js';
import {
  PROMPT_TEMPLATE_COMPILER_VERSION,
  compilePromptTemplate,
  verifyPromptTemplateFingerprint,
} from '../../image-generation-runtime/src/prompt-templates/prompt-template-compiler.js';

export const GENERATION_PROMPT_COMPILER_VERSION = 'visual-upgrade-1.0.0';
export const VISUAL_MEMORY_PROMPT_COMPILER_VERSION = 'visual-memory-1.0.0';
export const ANCHOR_VISUAL_ONLY_POLICY = Object.freeze({
  mode: 'visual_rules_only',
  ruleSources: Object.freeze(['visual_memory', 'visual_canon']),
  providerImageReferenceAllowed: false,
  forbiddenInheritance: Object.freeze([
    'logo',
    'brand_text',
    'title_typography',
    'poster_copy',
    'concrete_layout',
  ]),
});
const ANCHOR_VISUAL_ONLY_NEGATIVE_RULES = Object.freeze([
  'Anchor Image 只用于提取色彩关系、材质语言、光线、空间关系、构图规则与品牌气质。',
  '禁止把 Anchor Image 作为后续 Image Provider 的图片参考。',
  '禁止从 Anchor Image 继承、重绘或仿制 Logo 与品牌文字。',
  '禁止继承 Anchor Image 的标题排版、海报文案与图片内具体布局。',
]);
const TEMPLATE_OUTPUT_TYPES = new Set([
  'interior_scene', 'packaging_render', 'brand_poster', 'illustration',
]);

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
  if (/产品场景|产品摄影|产品情境|商品场景/iu.test(task)) return 'brand_poster';
  if (/海报|主视觉|KV/iu.test(task)) return 'brand_poster';
  if (/IP\s*场景|插画|角色|人物设定/iu.test(task)) return 'illustration';
  if (/VI|名片|菜单|工牌|物料|应用/iu.test(task)) return 'vi_application';
  throw Object.assign(new Error('无法从用户任务判断单一结果类型，请明确说明要生成空间、门店、包装、海报、VI 应用或插画。'), {
    code: 'GENERATION_OUTPUT_AMBIGUOUS',
  });
}

export function resolveGenerationTemplateType(outputType, userRequest) {
  if (outputType === 'illustration') return 'ip_scene';
  if (outputType === 'brand_poster'
    && /产品场景|产品摄影|产品情境|商品场景/iu.test(text(userRequest))) {
    return 'product_scene';
  }
  return outputType;
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
 * Short-Chain 默认小参考集：最多一张身份、一张必要结构、一张核心 Canon。
 * reading_only / exclude 资产从不由此函数接收，因此不会误发给 Image Provider。
 */
export function selectGenerationReferences(lockedAssets, outputType) {
  if (outputType === 'vi_application') {
    const logo = lockedAssets.find((asset) => asset.type === 'logo' && asset.sourceFile);
    return logo ? [{
      id: logo.sourceAssetId || logo.id,
      role: 'identity_reference',
      projectRelativePath: relative(logo.thumbnail || `input/${logo.sourceFile}`),
    }] : [];
  }
  if (outputType !== 'packaging_render') return [];
  const structure = lockedAssets.find((asset) => asset.type === 'packaging_structure' && asset.sourceFile);
  return [
    ...(structure ? [{
      id: structure.sourceAssetId || structure.id,
      role: 'structure_reference',
      projectRelativePath: relative(`input/${structure.sourceFile}`),
    }] : []),
  ];
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
  const visualMemory = input.visualMemory ? validateVisualMemory(input.visualMemory) : null;
  const referencePack = input.referencePack ? validateReferencePack(input.referencePack) : null;
  if (Boolean(visualMemory) !== Boolean(referencePack)
    || (visualMemory && referencePack
      && (visualMemory.project_id !== text(input.projectId)
        || referencePack.project_id !== text(input.projectId)
        || referencePack.visual_memory_id !== visualMemory.id))) {
    throw Object.assign(new Error('Visual Memory 与 Reference Pack 不匹配。'), {
      code: 'VISUAL_MEMORY_STALE',
    });
  }
  const blueprint = input.generationBlueprint
    ? validateGenerationBlueprint(input.generationBlueprint)
    : compileGenerationBlueprint({
        projectId: input.projectId,
        sessionId: input.sessionId,
        creativeDirection: direction,
        imagePurpose: outputType,
        userRequest,
        materialRules: input.styleProfile.materialAndTexture.materials,
        brandAssetRules: input.visualCanon.sharedRules,
        avoid: input.styleProfile.forbiddenVariations,
      }, now);
  if (blueprint.projectId !== text(input.projectId)
    || blueprint.sessionId !== text(input.sessionId)
    || blueprint.creativeDirectionId !== direction.id
    || blueprint.creativeDirectionVersion !== direction.version
    || blueprint.imagePurpose !== outputType) {
    throw Object.assign(new Error('Generation Blueprint 与当前任务或 Creative Direction 不匹配。'), {
      code: 'GENERATION_BLUEPRINT_STALE',
    });
  }
  const canonImages = resolveCanonImagesForTask(input.visualCanon, outputType);
  const lockedAssets = input.lockedAssets ?? [];
  const critical = lockedAssets.filter((asset) => asset.priority === 'critical');
  if (critical.some((asset) => !asset.rule || !asset.forbiddenChanges?.length)) {
    throw Object.assign(new Error('critical Locked Asset 规则不完整。'), { code: 'CRITICAL_LOCK_RULE_MISSING' });
  }
  const references = referencePack
    ? selectProviderReferencesFromPack(referencePack, outputType).map((reference) => ({
        id: reference.asset_id,
        role: reference.role === 'anchor'
          ? 'core_reference'
          : reference.signals.some((signal) => /structure_reference|packaging_structure/iu.test(signal))
            ? 'structure_reference'
            : 'identity_reference',
        projectRelativePath: reference.pack_path,
      }))
    : selectGenerationReferences(lockedAssets, outputType);
  const recentContext = unique(input.recentContext).slice(-5);
  const preserve = unique([
    ...blueprint.brandAssetRules,
    ...critical.map((asset) => asset.rule),
    ...(visualMemory?.generation_rules.preserve ?? []),
  ]);
  const avoid = unique([
    ...blueprint.avoid,
    ...lockedAssets.flatMap((asset) => asset.forbiddenChanges),
    ...(visualMemory?.visual_problems ?? []),
    ...(visualMemory?.generation_rules.avoid ?? []),
    ...ANCHOR_VISUAL_ONLY_NEGATIVE_RULES,
  ]);
  const sceneDescription = blueprint.sceneDescription;
  const composition = blueprint.composition;
  const materialAndLighting = unique([
    ...blueprint.materials,
    blueprint.lighting,
  ]).join('；');
  const typographyAndGraphicUse = unique([
    direction.primaryConcept,
    ...input.styleProfile.typographyCompatibility,
    ...input.styleProfile.graphicLanguage.coreMotifs,
  ]).join('；');
  const templateBlueprint = visualMemory && TEMPLATE_OUTPUT_TYPES.has(outputType)
      ? compileDeliverableGenerationBlueprint({
        visualMemory,
        visualCanon: input.visualCanon,
        deliverableType: outputType,
        templateType: resolveGenerationTemplateType(outputType, userRequest),
        userIntent: userRequest,
        referenceAssets: references.map((reference) => ({
          assetId: reference.id,
          role: reference.role,
          rationale: `仅作为 ${reference.role} 使用，不继承其他构图或旧视觉语言。`,
        })),
      })
    : null;
  const templateCompilation = templateBlueprint
      ? compilePromptTemplate({
        blueprint: templateBlueprint,
        visualMemory,
        visualCanon: input.visualCanon,
        modelConstraints: {
          preserve,
          executionRules: unique([
            responsibility(outputType),
            blueprint.sceneDescription,
            blueprint.camera,
            blueprint.composition,
            blueprint.colorDirection,
            ...blueprint.brandAssetRules,
            typographyAndGraphicUse,
          ]),
          textSafety: [
            '不伪造品牌名称、价格、二维码、法律信息或不可读的小字。',
            '仅保留少量可控占位文字；品牌文字必须来自已锁定资产。',
            ...ANCHOR_VISUAL_ONLY_NEGATIVE_RULES,
          ],
          outputSpec: ['单张图片', '无水印', '完整商业画面'],
        },
      })
    : null;
  const legacyFinalPrompt = [
    '# User Task — highest priority',
    userRequest,
    ...(recentContext.length ? ['# Recent Session Feedback', list(recentContext)] : []),
    '# Approved Generation Blueprint — execute, do not redesign',
    ...(visualMemory ? [compileVisualMemoryPrompt(visualMemory)] : []),
    ...(referencePack ? [
      '# Reference Pack Policy',
      `Audited pack: ${referencePack.id} (${referencePack.items.length} candidates).`,
      `Task-selected Provider references: ${references.length}; never use excluded or unselected assets.`,
    ] : []),
    '# Anchor Visual Only Policy',
    list(ANCHOR_VISUAL_ONLY_NEGATIVE_RULES),
    compileGenerationBlueprintPrompt(blueprint),
  ].join('\n\n');
  const finalPrompt = templateCompilation
    ? [
        '# User Task — highest priority',
        userRequest,
        ...(recentContext.length ? ['# Recent Session Feedback', list(recentContext)] : []),
        '# Anchor Visual Only Policy',
        list(ANCHOR_VISUAL_ONLY_NEGATIVE_RULES),
        templateCompilation.finalPrompt,
      ].join('\n\n')
    : legacyFinalPrompt;
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
    generationBlueprintId: blueprint.id,
    ...(visualMemory ? { visualMemoryId: visualMemory.id, visualMemory } : {}),
    ...(referencePack ? { referencePackId: referencePack.id, referencePack } : {}),
    ...(templateBlueprint && templateCompilation ? {
      deliverableTemplateId: templateBlueprint.templateId,
      deliverableTemplateVersion: templateBlueprint.templateVersion,
      deliverableTemplateBlueprint: templateBlueprint,
      templateCompiledPrompt: templateCompilation.finalPrompt,
      promptVersion: templateCompilation.promptVersion,
      promptFingerprint: templateCompilation.promptFingerprint,
      promptSourceMap: templateCompilation.promptSourceMap,
    } : {}),
    creativeDirectionSnapshot: direction,
    generationBlueprint: blueprint,
    outputType,
    styleProfileId: input.styleProfile.id,
    styleProfileVersion: input.styleProfile.version,
    visualCanonId: input.visualCanon.id,
    visualCanonVersion: input.visualCanon.version,
    anchorReferencePolicy: ANCHOR_VISUAL_ONLY_POLICY,
    lockedAssetIds: lockedAssets.map((asset) => asset.id),
    selectedReferences: references,
    instruction,
    negativePrompt: avoid.join(', '),
    compilerVersion: templateCompilation
      ? PROMPT_TEMPLATE_COMPILER_VERSION
      : visualMemory
        ? VISUAL_MEMORY_PROMPT_COMPILER_VERSION
      : GENERATION_PROMPT_COMPILER_VERSION,
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
  if (snapshot.compilerVersion === GENERATION_PROMPT_COMPILER_VERSION
    && !text(snapshot.generationBlueprintId)) {
    throw Object.assign(new Error('Visual Upgrade Prompt Snapshot 缺少 Generation Blueprint。'), {
      code: 'GENERATION_BLUEPRINT_MISSING',
    });
  }
  if (snapshot.compilerVersion === VISUAL_MEMORY_PROMPT_COMPILER_VERSION) {
    if (!text(snapshot.generationBlueprintId)
      || !text(snapshot.visualMemoryId)
      || !text(snapshot.referencePackId)
      || !snapshot.visualMemory
      || !snapshot.referencePack) {
      throw Object.assign(new Error('Visual Memory Prompt Snapshot 缺少不可变上下文。'), {
        code: 'VISUAL_MEMORY_SNAPSHOT_MISSING',
      });
    }
    const memory = validateVisualMemory(snapshot.visualMemory);
    const pack = validateReferencePack(snapshot.referencePack);
    if (memory.id !== snapshot.visualMemoryId
      || pack.id !== snapshot.referencePackId
      || pack.visual_memory_id !== memory.id
      || memory.project_id !== snapshot.projectId
      || pack.project_id !== snapshot.projectId) {
      throw Object.assign(new Error('Visual Memory Prompt Snapshot 的版本关系无效。'), {
        code: 'VISUAL_MEMORY_STALE',
      });
    }
  }
  if (snapshot.compilerVersion === PROMPT_TEMPLATE_COMPILER_VERSION) {
    if (!text(snapshot.visualMemoryId)
      || !text(snapshot.referencePackId)
      || !text(snapshot.deliverableTemplateId)
      || !text(snapshot.deliverableTemplateVersion)
      || !snapshot.deliverableTemplateBlueprint
      || !text(snapshot.templateCompiledPrompt)
      || !text(snapshot.promptVersion)
      || !/^[a-f0-9]{64}$/u.test(text(snapshot.promptFingerprint))
      || !snapshot.promptSourceMap) {
      throw Object.assign(new Error('Prompt Template Snapshot 缺少版本化编译产物。'), {
        code: 'PROMPT_TEMPLATE_SNAPSHOT_MISSING',
      });
    }
    const memory = validateVisualMemory(snapshot.visualMemory);
    const pack = validateReferencePack(snapshot.referencePack);
    const templateBlueprint = validateDeliverableGenerationBlueprint(
      snapshot.deliverableTemplateBlueprint,
    );
    if (memory.id !== snapshot.visualMemoryId
      || pack.id !== snapshot.referencePackId
      || templateBlueprint.visualMemoryId !== memory.id
      || templateBlueprint.templateId !== snapshot.deliverableTemplateId
      || templateBlueprint.templateVersion !== snapshot.deliverableTemplateVersion
      || !verifyPromptTemplateFingerprint({
        blueprint: templateBlueprint,
        promptVersion: snapshot.promptVersion,
        finalPrompt: snapshot.templateCompiledPrompt,
        promptSourceMap: snapshot.promptSourceMap,
        promptFingerprint: snapshot.promptFingerprint,
      })) {
      throw Object.assign(new Error('Prompt Template Snapshot 的版本关系无效。'), {
        code: 'PROMPT_TEMPLATE_SNAPSHOT_STALE',
      });
    }
  }
  if (!Array.isArray(snapshot.selectedReferences) || snapshot.selectedReferences.length > 2) {
    throw Object.assign(new Error('Generation Reference 超过 Short-Chain 小参考集上限。'), {
      code: 'GENERATION_REFERENCE_LIMIT_EXCEEDED',
    });
  }
  if (snapshot.anchorReferencePolicy) {
    const policy = snapshot.anchorReferencePolicy;
    if (policy.mode !== 'visual_rules_only'
      || policy.providerImageReferenceAllowed !== false
      || !Array.isArray(policy.ruleSources)
      || !['visual_memory', 'visual_canon'].every((source) => policy.ruleSources.includes(source))
      || !Array.isArray(policy.forbiddenInheritance)
      || !ANCHOR_VISUAL_ONLY_POLICY.forbiddenInheritance.every(
        (rule) => policy.forbiddenInheritance.includes(rule),
      )) {
      throw Object.assign(new Error('Anchor Visual Only Policy 无效。'), {
        code: 'ANCHOR_REFERENCE_POLICY_INVALID',
      });
    }
  }
  if (snapshot.selectedReferences.some((reference) => reference.role === 'core_reference')) {
    throw Object.assign(new Error('Anchor Image 不得进入后续 Provider 图片参考。'), {
      code: 'ANCHOR_PROVIDER_REFERENCE_FORBIDDEN',
    });
  }
  for (const reference of snapshot.selectedReferences) relative(reference.projectRelativePath);
  return snapshot;
}
