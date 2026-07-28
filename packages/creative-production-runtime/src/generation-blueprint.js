import crypto from 'node:crypto';

export const GENERATION_BLUEPRINT_COMPILER_VERSION = '1.0.0';

const PURPOSES = Object.freeze([
  'interior_scene',
  'storefront_scene',
  'packaging_render',
  'brand_poster',
  'vi_application',
  'illustration',
]);

function text(value) {
  return String(value ?? '').trim();
}

function unique(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(text).filter(Boolean))];
}

function purposeRules(imagePurpose, direction) {
  const rules = {
    interior_scene: {
      scene: '一个完整、可进入、具有真实商业尺度的品牌室内空间；同时呈现地面、墙面、顶面、纵深、动线与服务设施',
      camera: '单一人眼高度的广角透视，约 24–28mm 等效焦段，保持垂直线与真实空间比例',
      composition: '以顾客路径和核心服务场景建立前中后景，品牌标识只作为空间身份线索',
      strategy: direction.spaceStrategy,
      avoid: ['VI 展示板', 'Logo 墙代替完整空间', '材质样板拼贴', '正交立面排版'],
    },
    storefront_scene: {
      scene: '一个完整可营业的品牌门店外立面，包含入口、橱窗、建筑界面、街道关系与尺度参照',
      camera: '街道行人视角的单一建筑摄影机位，校正垂直线，保留真实环境纵深',
      composition: '以入口体验为焦点，建筑、招牌与街道环境形成清晰层级',
      strategy: direction.spaceStrategy,
      avoid: ['孤立 Logo 墙', '立面设计展板', '多方案并排', '无建筑尺度的平面贴图'],
    },
    packaging_render: {
      scene: '一个真实、完整、可生产的包装成品，清楚呈现结构、开合关系、表面工艺与使用尺度',
      camera: '单一三分之四产品摄影视角，结构边缘清晰，透视克制',
      composition: '单一主包装为绝对焦点，辅助物只用于说明尺度和使用情境',
      strategy: direction.packagingStrategy,
      avoid: ['旧包装换材质', '包装展开图与成品混排', '包装合集', 'VI 提案板'],
    },
    brand_poster: {
      scene: '一张具有单一叙事事件和明确传播焦点的完整品牌海报',
      camera: '按核心视觉事件选择可信的商业摄影或图形视角，不使用作品集展示视角',
      composition: '单一主视觉焦点、清晰信息层级和有意图的留白，建立远近阅读节奏',
      strategy: direction.posterStrategy,
      avoid: ['旧海报换内容', 'Logo 加产品照片模板', '多张海报并排', 'VI 展示板'],
    },
    vi_application: {
      scene: '一种明确、真实可用的品牌应用物料，以实际使用情境展示新的识别机制',
      camera: '单一商业产品摄影视角，避免俯拍物料集合',
      composition: '只呈现一种应用结果，以功能和识别机制为焦点',
      strategy: direction.designStrategy,
      avoid: ['物料合集', '品牌规范页', '多格 Mockup', '旧版式直接套用'],
    },
    illustration: {
      scene: '一张服务于品牌叙事的完整商业插画，具有明确主体、环境与动作关系',
      camera: '使用与叙事匹配的单一观察视角，保持空间和主体关系可信',
      composition: '单一叙事焦点，背景与品牌图形只支持主体',
      strategy: direction.designStrategy,
      avoid: ['角色设定表', '多格分镜', '风格样张合集', '复制原方案插画构图'],
    },
  };
  return rules[imagePurpose];
}

export function compileGenerationBlueprint(input, now = new Date().toISOString()) {
  const direction = input?.creativeDirection;
  const imagePurpose = text(input?.imagePurpose);
  const userRequest = text(input?.userRequest);
  if (!direction || direction.status !== 'ready') {
    throw Object.assign(new Error('生成 Blueprint 前必须存在 ready Creative Direction。'), {
      code: 'CREATIVE_DIRECTION_NOT_READY',
    });
  }
  if (!PURPOSES.includes(imagePurpose)) {
    throw Object.assign(new Error('Generation Blueprint 的 imagePurpose 无效。'), {
      code: 'GENERATION_BLUEPRINT_PURPOSE_INVALID',
    });
  }
  if (!userRequest) {
    throw Object.assign(new Error('Generation Blueprint 缺少用户生图任务。'), {
      code: 'GENERATION_TASK_EMPTY',
    });
  }
  const task = purposeRules(imagePurpose, direction);
  const strategy = text(task.strategy) || text(direction.designStrategy);
  return validateGenerationBlueprint({
    schemaVersion: '1.0',
    id: text(input.id) || `generation-blueprint-${crypto.randomUUID()}`,
    projectId: text(input.projectId),
    sessionId: text(input.sessionId),
    creativeDirectionId: text(direction.id),
    creativeDirectionVersion: text(direction.version),
    imagePurpose,
    sceneDescription: `${userRequest}。${task.scene}。执行策略：${strategy}`,
    camera: task.camera,
    composition: `${task.composition}。${direction.compositionStrategy}`,
    materials: unique([
      direction.materialStrategy,
      ...(input.materialRules ?? []),
    ]),
    lighting: direction.photographyStrategy,
    colorDirection: direction.colorStrategy,
    brandAssetRules: unique([
      ...(direction.keepAssets ?? direction.thingsToKeep ?? []),
      ...(input.brandAssetRules ?? []),
    ]),
    avoid: unique([
      ...task.avoid,
      ...(direction.removeAssets ?? direction.thingsToRemove ?? []),
      ...(direction.generationRules ?? []),
      ...(input.avoid ?? []),
      '完整视觉方案图片合集',
      '大量原海报或全部包装图作为风格参考',
    ]),
    compilerVersion: GENERATION_BLUEPRINT_COMPILER_VERSION,
    generatedAt: now,
  });
}

export function validateGenerationBlueprint(blueprint) {
  const textFields = [
    'id', 'projectId', 'sessionId', 'creativeDirectionId', 'creativeDirectionVersion',
    'imagePurpose', 'sceneDescription', 'camera', 'composition', 'lighting',
    'colorDirection', 'compilerVersion', 'generatedAt',
  ];
  if (!blueprint || blueprint.schemaVersion !== '1.0') {
    throw Object.assign(new Error('Generation Blueprint Schema 版本无效。'), {
      code: 'GENERATION_BLUEPRINT_INVALID',
    });
  }
  for (const field of textFields) {
    if (!text(blueprint[field])) {
      throw Object.assign(new Error(`Generation Blueprint 缺少 ${field}。`), {
        code: 'GENERATION_BLUEPRINT_INVALID',
      });
    }
  }
  if (!PURPOSES.includes(blueprint.imagePurpose)) {
    throw Object.assign(new Error('Generation Blueprint imagePurpose 无效。'), {
      code: 'GENERATION_BLUEPRINT_INVALID',
    });
  }
  for (const field of ['materials', 'brandAssetRules', 'avoid']) {
    if (!unique(blueprint[field]).length) {
      throw Object.assign(new Error(`Generation Blueprint 缺少 ${field}。`), {
        code: 'GENERATION_BLUEPRINT_INVALID',
      });
    }
  }
  return blueprint;
}

export function compileGenerationBlueprintPrompt(blueprint) {
  const list = (values) => unique(values).map((value) => `- ${value}`).join('\n');
  return [
    'Role:',
    'You are a senior brand designer executing an approved Generation Blueprint.',
    'Creative Direction:',
    `${blueprint.creativeDirectionId}@${blueprint.creativeDirectionVersion}`,
    'Scene:',
    blueprint.sceneDescription,
    'Camera:',
    blueprint.camera,
    'Composition:',
    blueprint.composition,
    'Materials:',
    list(blueprint.materials),
    'Lighting:',
    blueprint.lighting,
    'Color Direction:',
    blueprint.colorDirection,
    'Brand Rules:',
    list(blueprint.brandAssetRules),
    'Avoid:',
    list(blueprint.avoid),
    'Output:',
    'Generate exactly one finished commercial image. Do not output a design board, explanation, collage, or alternatives.',
  ].join('\n\n');
}

