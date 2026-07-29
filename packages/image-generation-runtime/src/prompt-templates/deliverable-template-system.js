export const DELIVERABLE_TEMPLATE_VERSION = '2.0.0';

const TEMPLATES = Object.freeze({
  interior_scene: Object.freeze({
    deliverableType: 'interior_scene',
    templateId: 'interior',
    sourcePath: 'prompt-templates/image-generation/interior.md',
    taskDefinition: '生成一个完整、可进入、具备真实商业尺度的品牌室内空间场景。',
    commercialUse: '品牌空间提案、门店设计评审与商业展示。',
    visualMechanism: [
      '把已批准的图形语言转译为空间节奏、导视、服务节点与克制的身份触点。',
      '品牌标志只承担身份识别，不得取代完整空间设计。',
    ],
    colorUsageRule: '环境基底为主色层，品牌色为辅助层，强调色不超过画面的 10%。',
    materialBehavior: [
      '说明真实建筑材料、表面工艺、收口、触感、反射行为与可施工性。',
      '材质必须参与空间功能和动线，不得只是表面换皮。',
    ],
    composition: [
      '同一连续透视中呈现前景、中景、后景与顾客动线。',
      '画面必须包含地面、墙面、天花、家具、服务设施和空间纵深。',
    ],
    photography: [
      '人眼高度的建筑摄影视角，受控广角，校正垂直线。',
      '曝光与光线真实可信，达到商业空间摄影完成度。',
    ],
    assetRules: [
      'Logo、品牌名称和已锁定识别资产只用于真实空间触点，不得改写或装饰化重绘。',
      '结构参考只约束空间尺度、动线与设施关系，不继承旧视觉表面。',
    ],
    negativeRules: [
      '禁止 VI 物料平铺、情绪板、分屏、作品集网格和孤立 Logo 墙。',
      '禁止只替换旧空间表面材质或复制旧视觉方案。',
    ],
  }),
  packaging_render: Object.freeze({
    deliverableType: 'packaging_render',
    templateId: 'packaging',
    sourcePath: 'prompt-templates/image-generation/packaging.md',
    taskDefinition: '生成一个结构可信、可生产、具有商业货架价值的包装主视觉渲染。',
    commercialUse: '包装设计提案、结构与工艺评审、商业展示。',
    visualMechanism: [
      '把已批准的图形语言应用到包装结构与信息层级。',
      '不得复制旧包装版式或仅替换材质。',
    ],
    colorUsageRule: '包装主视觉建立主色层、身份辅助层与不超过 10% 的强调层。',
    materialBehavior: [
      '说明基材、表面工艺、印刷行为、边缘、开合、触感与反光。',
      '材质选择必须支持品类属性和真实生产。',
    ],
    composition: [
      '只呈现一个主包装及其真实盒型、开合关系、尺度和产品摆放。',
      '使用受控的四分之三产品摄影视角，结构边缘清晰。',
    ],
    photography: [
      '高完成度商业产品摄影，透视准确，高光受控。',
      '保留可信的接触阴影、材质细节与真实比例。',
    ],
    assetRules: [
      '身份资产必须保持准确；包装结构参考约束盒型、开合、比例与承重逻辑。',
      '不得把结构参考误当成可复制的旧包装视觉。',
    ],
    negativeRules: [
      '禁止包装合集、展开图拼贴、提案板和随机占位文字。',
      '禁止旧包装换皮或复制旧包装信息层级。',
    ],
  }),
  brand_poster: Object.freeze({
    deliverableType: 'brand_poster',
    templateId: 'poster',
    sourcePath: 'prompt-templates/image-generation/poster.md',
    taskDefinition: '生成一张具有明确传播事件、视觉锚点和商业展示价值的完整品牌海报。',
    commercialUse: '品牌活动传播、设计提案与商业展示。',
    visualMechanism: [
      '把已批准的图形语言转化为可复用的活动传播机制。',
      '不得重新排列旧海报或套用 Logo 加产品模板。',
    ],
    colorUsageRule: '建立主导色场、身份辅助层与不超过 10% 的强调层，并服务信息对比。',
    materialBehavior: [
      '说明图像质感、印刷或屏幕表现、表面深度与必要的摄影材质线索。',
      '材质表现必须服务主叙事，不得成为无意义装饰。',
    ],
    composition: [
      '一个主视觉焦点、清晰信息层级、明确留白区和远近阅读节奏。',
      '画面四边即海报边缘，预留克制且可用的文案区域。',
    ],
    photography: [
      '选择一种可信的商业摄影或图形观察视角。',
      '光线、裁切和满版呈现必须服务唯一传播焦点。',
    ],
    assetRules: [
      '身份资产必须准确且克制地进入唯一主画面。',
      '参考资产只按指定角色约束身份、主体或结构，不得拼贴成提案板。',
    ],
    negativeRules: [
      '禁止海报合集、样机场景、作品集板式和随机大段文字。',
      '禁止复制旧海报构图或使用 Logo 加产品的模板化结构。',
    ],
  }),
  product_scene: Object.freeze({
    deliverableType: 'brand_poster',
    templateId: 'product_scene',
    sourcePath: 'prompt-templates/image-generation/product-scene.md',
    taskDefinition: '生成一张以单一产品为明确主体、具有真实使用语境和商业摄影完成度的产品场景图。',
    commercialUse: '产品发布、品牌电商、产品提案与商业传播。',
    visualMechanism: [
      '把 Visual Canon 转译为产品所处的环境、道具关系、色彩节奏与材质对比，不复刻 Anchor 的具体画面。',
      '产品始终是唯一视觉主体，品牌氛围由空间、光线与材质共同建立。',
    ],
    colorUsageRule: '以 Canon 主色建立环境基调，辅助色服务产品识别，强调色不超过画面的 10%。',
    materialBehavior: [
      '产品材质、接触面、道具和背景必须具有可信的尺度、纹理、反射与使用痕迹。',
      '场景材质服务于产品功能和品牌气质，不得用无关装饰掩盖产品。',
    ],
    composition: [
      '使用一个明确的产品主体、一个主要使用情境和克制的辅助道具，保持充足负空间。',
      '建立可读的前中后景与稳定视觉动线，不生成产品合集、拼贴或多方案板。',
    ],
    photography: [
      '使用可信的商业产品摄影机位、焦段、景深和接触阴影。',
      '光线应解释产品体积、材质与使用方式，同时符合 Canon Lighting System。',
    ],
    assetRules: [
      '产品与身份资产只按批准角色进入场景，必须保持结构、比例与可识别特征。',
      '场景参考只约束使用语境和空间关系，不继承旧构图、文案或品牌标识。',
    ],
    negativeRules: [
      '禁止产品合集、电商九宫格、悬浮拼贴、提案板和无使用逻辑的道具堆砌。',
      '禁止让环境压过产品主体，禁止复制 Anchor 的 Logo、文字和具体布局。',
    ],
  }),
  ip_scene: Object.freeze({
    deliverableType: 'illustration',
    templateId: 'ip_scene',
    sourcePath: 'prompt-templates/image-generation/ip-scene.md',
    taskDefinition: '生成一张角色身份稳定、具有明确叙事动作和品牌世界观的完整 IP 场景。',
    commercialUse: '品牌 IP 传播、角色世界观展示、活动内容与商业插画。',
    visualMechanism: [
      '把 Visual Canon 转译为角色所在世界的空间、色彩、材质、图形节奏与叙事气质。',
      '保持角色身份与比例稳定，用单一事件建立场景，不复制 Anchor 的具体构图。',
    ],
    colorUsageRule: '以 Canon 色彩系统统一角色与环境，强调色只用于叙事焦点且不超过画面的 10%。',
    materialBehavior: [
      '角色服装、道具、地面和环境表面应遵循统一材质语言并保持触感可信。',
      '材质细节服务角色动作和世界观，不得堆叠廉价卡通装饰。',
    ],
    composition: [
      '一个主要角色或已批准角色组合、一个清晰动作、一个完整场景和明确负空间。',
      '通过前中后景、视线与动作方向建立叙事动线，不生成角色设定表或分格合集。',
    ],
    photography: [
      '采用与叙事一致的镜头高度、景别、透视和景深，即使是插画也保持空间可信。',
      '光线明确角色轮廓、表情、动作和环境层次，并遵循 Canon Lighting System。',
    ],
    assetRules: [
      '角色身份资产必须保持轮廓、比例、面部特征、服装关键点和品牌识别稳定。',
      '其他参考只约束指定角色或场景功能，不得拼贴成角色设定板。',
    ],
    negativeRules: [
      '禁止角色设定表、表情九宫格、多格漫画、贴纸合集和无叙事动作的站桩图。',
      '禁止擅自改写角色身份、Logo、品牌文字，禁止复制 Anchor 的具体布局。',
    ],
  }),
});

function text(value) {
  return String(value ?? '').trim();
}

function unique(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(text).filter(Boolean))];
}

function resolveIndustryTemplate(industry) {
  const value = text(industry);
  const templates = [
    {
      id: 'food-and-hospitality',
      pattern: /餐饮|食品|饮品|烘焙|茶|咖啡|礼盒/u,
      rules: ['强调真实食欲、卫生可信度、服务场景与品类识别，不使用虚假食品结构。'],
    },
    {
      id: 'children-and-ip',
      pattern: /儿童|亲子|母婴|IP|玩具|教育/u,
      rules: ['保持角色与品牌识别稳定，控制亲和力、年龄适配与安全感，避免廉价卡通堆叠。'],
    },
    {
      id: 'culture-and-aesthetics',
      pattern: /文化|文创|美学|艺术|东方|家居|香氛/u,
      rules: ['以文化语义、材质克制与当代秩序建立高级感，避免传统符号直接堆砌。'],
    },
  ];
  const selected = templates.find((item) => item.pattern.test(value));
  return selected ?? {
    id: 'general-brand',
    rules: ['遵守当前行业的真实商业尺度、使用语境与合规表达，不制造未经确认的产品事实。'],
  };
}

export function getDeliverablePromptTemplate(deliverableType) {
  const template = TEMPLATES[deliverableType];
  if (!template) {
    throw Object.assign(new Error(`Deliverable template is not available: ${deliverableType || 'missing'}`), {
      code: 'DELIVERABLE_TEMPLATE_UNSUPPORTED',
    });
  }
  return structuredClone(template);
}

export function compileDeliverableGenerationBlueprint(input) {
  const visualMemory = input?.visualMemory;
  const deliverableType = text(input?.deliverableType);
  const template = getDeliverablePromptTemplate(text(input?.templateType) || deliverableType);
  if (template.deliverableType !== deliverableType) {
    throw Object.assign(new Error(
      `Template ${template.templateId} cannot compile output type ${deliverableType || 'missing'}.`,
    ), {
      code: 'DELIVERABLE_TEMPLATE_OUTPUT_MISMATCH',
    });
  }
  if (!visualMemory || visualMemory.schema_version !== '1.0') {
    throw Object.assign(new Error('Deliverable template requires Visual Memory v1.'), {
      code: 'VISUAL_MEMORY_REQUIRED',
    });
  }
  const visualCanon = input?.visualCanon;
  if (!visualCanon || visualCanon.schemaVersion !== '6.0' || visualCanon.status !== 'confirmed'
    || !text(visualCanon.id) || !text(visualCanon.version)) {
    throw Object.assign(new Error('Deliverable template requires a confirmed Visual Canon.'), {
      code: 'VISUAL_CANON_REQUIRED',
    });
  }
  const industryTemplate = resolveIndustryTemplate(
    visualCanon.visualDNA?.industryAttributes?.join('；') || visualMemory.brand_core?.industry,
  );
  const references = (Array.isArray(input?.referenceAssets) ? input.referenceAssets : [])
    .slice(0, 5)
    .map((reference) => ({
      assetId: text(reference.assetId ?? reference.asset_id),
      role: text(reference.generationRole ?? reference.role),
      rationale: text(reference.includeReason ?? reference.rationale),
    }))
    .filter((reference) => reference.assetId && reference.role);
  const blueprint = {
    schemaVersion: '1.0',
    templateId: template.templateId,
    templateVersion: DELIVERABLE_TEMPLATE_VERSION,
    templateSource: template.sourcePath,
    visualMemoryId: text(visualMemory.id),
    visualCanonId: text(visualCanon.id),
    visualCanonVersion: text(visualCanon.version),
    deliverableType,
    templateStack: {
      visualCanon: `${visualCanon.id}@${visualCanon.version}`,
      industry: `industry:${industryTemplate.id}`,
      asset: `asset:${template.templateId}`,
      photography: `photography:${template.templateId}`,
    },
    task: {
      definition: template.taskDefinition,
      userGoal: text(input?.userIntent) || template.taskDefinition,
      usageScenario: template.commercialUse,
      commercialUse: template.commercialUse,
    },
    brandContext: {
      positioning: text(visualMemory.brand_core?.positioning),
      industry: text(visualMemory.brand_core?.industry),
      temperament: unique([
        ...(visualCanon.visualDNA?.moodAttributes ?? []),
        ...(visualMemory.brand_core?.mood ?? []),
        ...(visualMemory.brand_core?.core_temperament ?? []),
      ]),
    },
    visualDirection: unique([
      visualCanon.visualDNA?.coreVisualMetaphor,
      ...(visualCanon.visualDNA?.brandKeywords ?? []),
      ...(visualCanon.sharedRules ?? []),
      ...(visualMemory.visual_dna?.graphic_language ?? []),
      ...(visualMemory.visual_opportunities ?? []),
      ...template.visualMechanism,
    ]),
    color: {
      palette: unique([
        ...(visualCanon.colorSystem?.primary ?? []),
        ...(visualCanon.colorSystem?.secondary ?? []),
        ...(visualCanon.colorSystem?.accent ?? []),
        ...(visualMemory.visual_dna?.colors ?? []),
      ]),
      usageRule: template.colorUsageRule,
      forbidden: unique([
        ...(visualCanon.colorSystem?.forbidden ?? []),
        ...(input?.forbiddenColors ?? []),
      ]),
    },
    industryRules: unique(industryTemplate.rules),
    assetRules: unique([
      ...template.assetRules,
      ...(input?.assetRules ?? []),
      ...references.map((reference) =>
        `${reference.role}：${reference.rationale || '仅按已批准角色使用，不继承未授权视觉特征。'}`),
    ]),
    material: unique([
      ...(visualCanon.materialSystem?.materialLanguage ?? []),
      ...(visualCanon.materialSystem?.surfaceTextures ?? []),
      ...(visualCanon.materialSystem?.craftRules ?? []),
      ...(visualMemory.visual_dna?.materials ?? []),
      ...template.materialBehavior,
    ]),
    composition: unique([
      ...(visualCanon.compositionSystem?.compositionMethods ?? []),
      ...(visualCanon.compositionSystem?.gridRules ?? []),
      ...(visualCanon.compositionSystem?.negativeSpaceRules ?? []),
      ...template.composition,
    ]),
    photography: unique([
      ...(visualCanon.lightingSystem?.direction ?? []),
      ...(visualCanon.lightingSystem?.contrast ?? []),
      ...(visualCanon.lightingSystem?.photographyAtmosphere ?? []),
      ...(visualMemory.visual_dna?.photography ?? []),
      ...template.photography,
    ]),
    referenceAssets: references,
    negativeRules: unique([
      ...(visualMemory.visual_problems ?? []),
      ...(visualMemory.generation_rules?.avoid ?? []),
      ...(visualCanon.colorSystem?.forbidden ?? []).map((item) => `禁止颜色：${item}`),
      ...template.negativeRules,
    ]),
  };
  return validateDeliverableGenerationBlueprint(blueprint);
}

export function validateDeliverableGenerationBlueprint(blueprint) {
  if (!blueprint || blueprint.schemaVersion !== '1.0'
    || blueprint.templateVersion !== DELIVERABLE_TEMPLATE_VERSION) {
    throw Object.assign(new Error('Deliverable Generation Blueprint version is invalid.'), {
      code: 'DELIVERABLE_BLUEPRINT_INVALID',
    });
  }
  for (const field of [
    'templateId', 'templateSource', 'visualMemoryId', 'visualCanonId',
    'visualCanonVersion', 'deliverableType',
  ]) {
    if (!text(blueprint[field])) {
      throw Object.assign(new Error(`Deliverable Generation Blueprint is missing ${field}.`), {
        code: 'DELIVERABLE_BLUEPRINT_INVALID',
      });
    }
  }
  for (const field of ['visualCanon', 'industry', 'asset', 'photography']) {
    if (!text(blueprint.templateStack?.[field])) {
      throw Object.assign(new Error(`Deliverable Generation Blueprint templateStack is missing ${field}.`), {
        code: 'DELIVERABLE_BLUEPRINT_INVALID',
      });
    }
  }
  for (const field of ['definition', 'userGoal', 'usageScenario', 'commercialUse']) {
    if (!text(blueprint.task?.[field])) {
      throw Object.assign(new Error(`Deliverable Generation Blueprint task is missing ${field}.`), {
        code: 'DELIVERABLE_BLUEPRINT_INVALID',
      });
    }
  }
  if (!text(blueprint.brandContext?.positioning) || !text(blueprint.brandContext?.industry)
    || !unique(blueprint.brandContext?.temperament).length) {
    throw Object.assign(new Error('Deliverable Generation Blueprint brandContext is incomplete.'), {
      code: 'DELIVERABLE_BLUEPRINT_INVALID',
    });
  }
  if (!unique(blueprint.color?.palette).length || !text(blueprint.color?.usageRule)) {
    throw Object.assign(new Error('Deliverable Generation Blueprint color system is incomplete.'), {
      code: 'DELIVERABLE_BLUEPRINT_INVALID',
    });
  }
  for (const field of [
    'visualDirection', 'industryRules', 'assetRules', 'material',
    'composition', 'photography', 'negativeRules',
  ]) {
    if (!unique(blueprint[field]).length) {
      throw Object.assign(new Error(`Deliverable Generation Blueprint ${field} must not be empty.`), {
        code: 'DELIVERABLE_BLUEPRINT_INVALID',
      });
    }
  }
  if (!Array.isArray(blueprint.referenceAssets) || blueprint.referenceAssets.length > 5) {
    throw Object.assign(new Error('Deliverable Generation Blueprint referenceAssets is invalid.'), {
      code: 'DELIVERABLE_BLUEPRINT_INVALID',
    });
  }
  return blueprint;
}
