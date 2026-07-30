import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compileVNextImageGeneration,
  generateGoldenBacktraceAudit,
} from '../../packages/image-generation-runtime/src/vnext/index.js';

function packet(overrides = {}) {
  return {
    schemaVersion: '1.0',
    projectId: 'jiuzhou-packet',
    projectFacts: {
      brandName: { value: '九州美学', source: 'project_record', evidenceRefs: ['project_record:brandName'], confidence: 1, status: 'confirmed' },
      industry: { value: '医美', source: 'project_record', evidenceRefs: ['project_record:industry'], confidence: 1, status: 'confirmed' },
      brandRole: { value: '医美全链生态平台', source: 'source_document', evidenceRefs: ['asset:05'], confidence: 0.98, status: 'confirmed' },
    },
    lockedAssets: [
      { assetId: 'real-logo', type: 'logo', value: '真实logo.png', lockSource: 'user_confirmed', evidenceRefs: ['asset:logo'] },
      { assetId: 'brand-name', type: 'brand_name', value: '九州美学', lockSource: 'source_fact', evidenceRefs: ['project_record:brandName'] },
    ],
    assetInventory: {},
    diagnosis: {
      valuableAssets: [{ target: '孔雀羽毛', observation: '生命、生长、精密与层叠具有长期价值', whyItMatters: '形成跨媒介识别', evidenceRefs: ['asset:08'], confidence: 0.95 }],
      overusedExpressions: [],
      outdatedExpressions: [],
      weakSystemAreas: [],
      categoryCliches: [],
      brandMisreadRisks: [
        {
          code: 'consumer_beauty_salon',
          description: '不要呈现普通美容院或普通消费型美容门店',
          target: '普通美容院',
          observation: '甜美装饰导致误读',
          whyItMatters: '削弱平台角色',
          appliesTo: { taskFamilies: ['space'], subtypes: ['reception'], scenes: ['flagship_reception'] },
          evidenceRefs: ['asset:12'],
          confidence: 0.9,
          status: 'confirmed',
        },
        {
          code: 'treatment_room',
          description: '不要呈现传统医院诊室、注射操作、护理床或护理场景',
          target: '传统医院诊室',
          observation: '只强调医疗会过冷',
          whyItMatters: '失去品牌生命美学',
          appliesTo: { taskFamilies: ['space'], subtypes: ['reception'], scenes: ['flagship_reception'] },
          evidenceRefs: ['asset:05'],
          confidence: 0.9,
          status: 'confirmed',
        },
        ...['茶空间', '生活方式零售', '售楼处', '霓虹空间'].map((target, index) => ({
          code: `scene_misread_${index + 1}`,
          description: `禁止${target}`,
          target,
          observation: `${target}会造成错误项目理解`,
          whyItMatters: '偏离当前旗舰接待场景',
          appliesTo: { taskFamilies: ['space'], subtypes: ['reception'], scenes: ['flagship_reception'] },
          evidenceRefs: ['asset:12'],
          confidence: 0.9,
          status: 'confirmed',
        })),
      ],
      crossMediaGaps: [],
    },
    creativeDecision: {
      brandRoleStatement: '高端医美全链生态平台',
      upgradeFrom: ['传统紫色医美', '具象孔雀羽毛', '发光渐变'],
      preserveCore: ['生命生长', '精密层叠', '历史紫色识别'],
      upgradeTo: ['东方生命美学', '现代医疗专业感', '未来材料科技感'],
      uniqueUpgradeThesis: '从传统紫色医美、具象孔雀羽毛和发光渐变的表面装饰，升级为生命结构、医疗专业、未来材料与东方秩序共同构成的高端医美生态平台视觉世界。',
      targetWorldview: ['东方生命美学', '现代医疗专业感', '未来材料科技感'],
      toneBoundaries: [
        { target: '东方生命美学', avoid: ['古典中式', '木格栅茶空间'] },
        { target: '未来材料科技感', avoid: ['科幻实验室', '科技蓝', '霓虹夜店'] },
        { target: '专业可信赖', avoid: ['普通办公室', '售楼处'] },
        { target: '有人文温度', avoid: ['柔弱甜美', '网红美容院'] },
      ],
      strategicNegatives: ['生活方式零售'],
    },
    abstractions: [{
      sourceAsset: '孔雀羽毛',
      semanticMeaning: ['生命生长', '精密', '层叠'],
      formalProperties: ['柔性曲线', '放射', '渐进尺度'],
      rhythmProperties: ['有序重复', '由密到疏'],
      materialPotential: ['半透明树脂', '磨砂玻璃'],
      lightingPotential: ['透射', '漫反射'],
      forbiddenLiteralUse: ['直接贴孔雀图', '满墙羽毛壁纸'],
      evidenceRefs: ['asset:08'],
      confidence: 0.95,
    }],
    mediaTranslations: {
      sharedBrandCore: ['生命生长', '医疗专业', '未来材料', '东方秩序'],
      spatial: {
        status: 'ready',
        spatialConcept: '将羽毛的层叠、生长、精密和轻盈转化为可进入的半透明生物组织空间。',
        structureLanguage: ['柔性层叠曲面隔断', '渐进尺度天花节奏'],
        materialLanguage: [{
          material: '微水泥、哑光石材、珍珠涂层、磨砂玻璃、半透明树脂与拉丝冷银金属',
          behavior: ['低反射', '透射', '漫反射', '真实厚度', '精细接缝与收边'],
          brandRole: '建立医疗专业基底与生命结构层次',
          forbidden: ['廉价塑料感', '过度镜面'],
        }],
        lightingLanguage: {
          source: ['柔和自然侧光'],
          contrast: '低对比',
          interactionWithMaterials: ['穿过半透明结构形成细腻生物光泽', '大面积漫反射'],
          forbidden: ['霓虹灯', '舞台灯', '强紫色灯带'],
        },
        colorBehavior: {
          primary: [{ name: '珍珠白与暖灰', ratio: 70, role: '专业稳定主体' }],
          secondary: [{ name: '浅矿物灰与半透明材质', ratio: 20, role: '材料层次' }],
          accent: [{ name: '低饱和矿物紫与冷银', ratio: 10, role: '品牌识别点缀' }],
          forbidden: ['大面积亮紫', '霓虹紫', '高饱和渐变'],
        },
        brandIntegration: [
          '羽毛抽象分散进入半透明隔断、曲面墙体与天花层次',
          'Logo 小面积位于后方内部服务节点或保留干净识别位',
        ],
        functionalRelationships: ['接待连接等候、咨询与后方服务'],
        sceneProgram: ['前景到达、中景咨询、背景接待与后场'],
        peopleBehavior: ['访客自然等候，工作人员处理接待'],
        functionalExperience: [
          '前景为到达与等候，中景为咨询、展示和半透明分区，背景为接待识别与后方服务空间',
          '动线从入口进入、停留、咨询展示并前往后方',
        ],
        sceneMisreadRisks: ['茶空间', '生活方式零售', '售楼处', '普通办公室', '霓虹空间'],
      },
      packaging: { status: 'interface_only', concept: '', expressionLanguage: [], misreadRisks: [] },
      poster: { status: 'interface_only', concept: '', expressionLanguage: [], misreadRisks: [] },
      vi: { status: 'interface_only', concept: '', expressionLanguage: [], misreadRisks: [] },
    },
    colorSystem: {
      primary: [{ name: '珍珠白与暖灰', ratio: 70, role: '专业稳定主体' }],
      secondary: [{ name: '浅矿物灰与半透明材质', ratio: 20, role: '材料层次' }],
      accent: [{ name: '低饱和矿物紫与冷银', ratio: 10, role: '品牌识别点缀' }],
      forbidden: ['大面积亮紫', '霓虹紫', '高饱和渐变'],
    },
    materialSystem: [{
      material: '微水泥、哑光石材、珍珠涂层、磨砂玻璃、半透明树脂与拉丝冷银金属',
      behavior: ['低反射', '透射', '漫反射', '真实厚度', '精细接缝与收边'],
      brandRole: '建立医疗专业基底与生命结构层次',
      forbidden: ['廉价塑料感', '过度镜面'],
    }],
    lightingSystem: {
      source: ['柔和自然侧光'],
      contrast: '低对比',
      interactionWithMaterials: ['穿过半透明结构形成细腻生物光泽', '大面积漫反射'],
      forbidden: ['霓虹灯', '舞台灯', '强紫色灯带'],
    },
    provenance: {
      createdFrom: ['asset:05', 'asset:08'],
      generatedAt: '2026-07-30T00:00:00.000Z',
      modelId: 'test',
      sourceFingerprint: 'jiuzhou-packet-fingerprint',
    },
    validation: {
      hardFactStatus: 'pass',
      mode: 'formal_upgrade',
      missingRequiredFacts: [],
      conflicts: [],
      executionDataStatus: 'ready',
      missingExecutionFields: [],
    },
    ...overrides,
  };
}

function context(packetValue = packet()) {
  const logoAssetIds = packetValue.lockedAssets
    .filter((item) => item.type === 'logo')
    .map((item) => item.assetId);
  return {
    schemaVersion: '2.0',
    projectId: packetValue.projectId,
    version: 1,
    generatedAt: '2026-07-30T00:00:00.000Z',
    brandCore: {
      name: packetValue.projectFacts.brandName.value,
      industry: packetValue.projectFacts.industry.value,
      brandRole: packetValue.projectFacts.brandRole.value,
      audience: [],
    },
    lockedAssets: {
      logoAssetIds,
      brandNameLocked: true,
      confirmedColors: [],
      packageStructures: [],
      productAssetIds: [],
      lockedAssetIds: logoAssetIds,
      mustPreserve: [],
    },
    visualIdentity: {
      tone: ['POISONED LEGACY TONE'],
      colorBehavior: ['POISONED LEGACY COLOR'],
      graphicBehavior: ['POISONED LEGACY GRAPHIC'],
      materialBehavior: ['POISONED LEGACY MATERIAL'],
      compositionBehavior: [],
      lightingBehavior: ['POISONED LEGACY LIGHT'],
    },
    styleBoundaries: { mustAvoid: ['POISONED LEGACY NEGATIVE'], uncertainItems: [] },
    confirmedDecisions: [],
    sourceAssetRefs: [],
    provenance: {
      builderId: 'test',
      builderVersion: '1',
      sourceKinds: ['project_record', 'original_asset', 'structured_analysis'],
      sourceFingerprint: 'context-fingerprint',
    },
    visualDecisionPacket: packetValue,
    promptSourceObject: {
      schemaVersion: '1.0',
      projectId: packetValue.projectId,
      generatedAt: '',
      projectFacts: { brandName: 'WRONG', industry: 'WRONG', brandRole: 'WRONG', businessModel: null, primaryOfferings: [] },
      lockedAssets: { logoAssetIds: [], preferredLogoAssetId: null, logoUsageMode: 'blank_area', confirmedColors: [], mustPreserve: ['WRONG'], immutableStructures: [] },
      sourceVisualState: { valuableAssets: [], overusedElements: [], outdatedExpressions: [], genericIndustryCliches: [], brandMisreadRisks: [] },
      upgradeTranslation: { preserve: ['WRONG'], weaken: [], remove: [], targetWorldview: [], toneBoundaries: [], transformations: [] },
      renderLanguage: { colorBehavior: { primary: [], secondary: [], accent: [], forbidden: [] }, materialBehavior: [], lightingBehavior: { source: [], contrast: '', interactionWithMaterials: [], forbidden: [] }, graphicBehavior: [] },
      negativeRules: { project: ['WRONG'], model: [] },
      confidence: { projectFacts: 0, lockedAssets: 0, sourceVisualState: 0, upgradeTranslation: 0 },
      provenance: { sourceKinds: ['legacy_migration'], sourceFingerprint: 'wrong' },
    },
  };
}

function compile(overrides = {}) {
  const projectContext = context(overrides.packet || packet());
  return compileVNextImageGeneration({
    projectContext,
    task: {
      projectId: projectContext.projectId,
      deliverableFamily: 'space',
      subtype: 'reception',
      scene: 'flagship_reception',
      shot: 'entrance_three_quarter_wide',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: '生成旗舰店入口接待空间，明确前台、入口与后场动线。',
      ...overrides.task,
    },
  });
}

test('compiler reads Visual Decision Packet directly and covers all project blocks', () => {
  const result = compile();
  for (const signal of [
    '医美全链生态平台',
    'Unique upgrade thesis',
    '东方生命美学',
    '柔性曲线',
    '半透明生物组织空间',
    '珍珠白与暖灰',
    '建议占比 70%',
    '微水泥、哑光石材、珍珠涂层、磨砂玻璃、半透明树脂与拉丝冷银金属',
    '柔和自然侧光',
    '茶空间',
    'controlled post-compositing',
  ]) assert.match(result.compiledPrompt.finalPrompt, new RegExp(signal, 'u'));
  assert.doesNotMatch(result.compiledPrompt.finalPrompt, /WRONG|POISONED LEGACY/u);
  assert.equal(result.compiledPrompt.trace.compilerVersion, '4.1.0');
  assert.deepEqual(result.compiledPrompt.completeness.coverage, {
    hardFacts: 1,
    upgradeThesis: 1,
    brandTranslation: 1,
    toneBoundaries: 1,
    colorMaterialLighting: 1,
    taskContract: 1,
  });
});

test('formal Packet does not invent tone boundaries when no approved decision supplies them', () => {
  const packetValue = packet();
  packetValue.creativeDecision.toneBoundaries = [];
  assert.throws(
    () => compile({ packet: packetValue }),
    /PROJECT_GENERATION_CONTRACT_INSUFFICIENT.*toneBoundaries/u,
  );
});

test('formal Packet blocks compilation when execution data is insufficient', () => {
  const incomplete = packet({
    validation: {
      ...packet().validation,
      executionDataStatus: 'insufficient',
      missingExecutionFields: ['abstractions'],
    },
  });
  assert.throws(() => compile({ packet: incomplete }), /VISUAL_DECISION_PACKET_INSUFFICIENT/u);
});

test('compiler enforces post-composite Logo, text and saturation conflicts', () => {
  assert.doesNotThrow(
    () => compile({ task: { mustAvoid: ['禁止任何 Logo'] } }),
  );
  assert.throws(
    () => compile({ task: { mustInclude: ['准确标题文字'] } }),
    /PROMPT_CONFLICT.*requires text/iu,
  );
  assert.throws(
    () => compile({ task: { mustInclude: ['高饱和霓虹紫'] } }),
    /PROMPT_CONFLICT.*high-saturation/iu,
  );
});

test('interface-only media translation cannot enter formal generation', () => {
  const projectContext = context();
  assert.throws(
    () => compileVNextImageGeneration({
      projectContext,
      task: {
        projectId: projectContext.projectId,
        deliverableFamily: 'poster',
        subtype: 'brand_key_visual',
        shot: 'subject_centered',
        count: 1,
        aspectRatio: '16:9',
        currentInstruction: '生成品牌海报',
      },
    }),
    /VISUAL_DECISION_PACKET_INSUFFICIENT.*interface-only/u,
  );
});

test('Jiuzhou automatic Prompt meets all 22 Golden backtrace atoms', () => {
  const packetValue = packet();
  const result = compile({ packet: packetValue });
  const audit = generateGoldenBacktraceAudit({
    items: [
      { id: 'JZ-01', goldenContent: '高端医美全链生态平台', matchGroups: [['医美全链生态平台']], contentType: 'source_fact' },
      { id: 'JZ-02', goldenContent: '不是普通美容院', matchGroups: [['普通美容院']], contentType: 'diagnosis' },
      { id: 'JZ-03', goldenContent: '不是传统医院诊室', matchGroups: [['传统医院诊室']], contentType: 'diagnosis' },
      { id: 'JZ-04', goldenContent: '东方生命美学', contentType: 'creative_decision' },
      { id: 'JZ-05', goldenContent: '现代医疗专业感', contentType: 'creative_decision' },
      { id: 'JZ-06', goldenContent: '未来材料科技感', contentType: 'creative_decision' },
      { id: 'JZ-07', goldenContent: '从传统紫色医美中跳脱', matchGroups: [['传统紫色医美']], contentType: 'diagnosis' },
      { id: 'JZ-08', goldenContent: '从具象孔雀羽毛装饰中跳脱', matchGroups: [['具象孔雀羽毛']], contentType: 'diagnosis' },
      { id: 'JZ-09', goldenContent: '羽毛转译为柔性层叠曲线', matchGroups: [['柔性曲线'], ['层叠']], contentType: 'visual_abstraction' },
      { id: 'JZ-10', goldenContent: '羽毛转译为半透明生物组织结构', matchGroups: [['半透明生物组织']], contentType: 'media_translation' },
      { id: 'JZ-11', goldenContent: '羽毛转译为光线穿透渐变层次', matchGroups: [['穿过半透明结构', '透射'], ['层次', '光泽']], contentType: 'media_translation' },
      { id: 'JZ-12', goldenContent: '东方但不古典', matchGroups: [['东方生命美学'], ['古典中式']], contentType: 'creative_decision' },
      { id: 'JZ-13', goldenContent: '未来但不科幻', matchGroups: [['未来材料科技感'], ['科幻实验室']], contentType: 'creative_decision' },
      { id: 'JZ-14', goldenContent: '有人文温度但不柔弱甜美', matchGroups: [['有人文温度'], ['柔弱甜美']], contentType: 'creative_decision' },
      { id: 'JZ-15', goldenContent: '珍珠白、暖灰、矿物灰', matchGroups: [['珍珠白'], ['暖灰'], ['矿物灰']], contentType: 'media_translation' },
      { id: 'JZ-16', goldenContent: '低饱和矿物紫', contentType: 'media_translation' },
      { id: 'JZ-17', goldenContent: '70/20/10 色彩关系', matchGroups: [['70%', '"ratio":70'], ['20%', '"ratio":20'], ['10%', '"ratio":10']], contentType: 'media_translation' },
      { id: 'JZ-18', goldenContent: '微水泥/哑光石材/磨砂玻璃/半透明树脂', matchGroups: [['微水泥'], ['哑光石材'], ['磨砂玻璃'], ['半透明树脂']], contentType: 'media_translation' },
      { id: 'JZ-19', goldenContent: '自然侧光/低对比漫反射', matchGroups: [['自然侧光'], ['低对比'], ['漫反射']], contentType: 'media_translation' },
      { id: 'JZ-20', goldenContent: '专业、稳定、可信赖和长期价值', matchGroups: [['专业'], ['稳定'], ['可信赖']], contentType: 'creative_decision' },
      { id: 'JZ-21', goldenContent: 'Logo 小面积呈现或保留识别留白', matchGroups: [['Logo 小面积', 'logo asset']], contentType: 'model_adapter' },
      { id: 'JZ-22', goldenContent: '禁止茶空间、生活方式零售、售楼处和霓虹空间', matchGroups: [['茶空间'], ['生活方式零售'], ['售楼处'], ['霓虹空间']], contentType: 'diagnosis' },
    ],
    packet: packetValue,
    finalPrompt: result.compiledPrompt.finalPrompt,
  });
  assert.deepEqual(audit.items.filter((item) => !item.decisionPacketFound).map((item) => item.id), []);
  assert.deepEqual(audit.items.filter((item) => !item.finalPromptFound).map((item) => item.id), []);
  assert.equal(audit.summary.conflictCount, 0);
});

test('Logo preservation rule routes a confirmed Logo to post-composite', () => {
  const result = compile({ task: { mustAvoid: ['禁止将 Logo 变形或拆解'] } });
  assert.equal(result.taskContract.logoUsageMode, 'post_composite');
  assert.match(result.compiledPrompt.finalPrompt, /禁止将 Logo 变形或拆解/u);
  assert.equal(result.compiledPrompt.completeness.conflictCount, 0);
});

function alternatePacket({
  projectId,
  brandName,
  industry,
  brandRole,
  sourceAsset,
  thesis,
  worldview,
  structure,
  colors,
  material,
  risks,
}) {
  const value = packet();
  value.projectId = projectId;
  value.projectFacts.brandName.value = brandName;
  value.projectFacts.industry.value = industry;
  value.projectFacts.brandRole.value = brandRole;
  value.lockedAssets = [
    { assetId: `${projectId}-logo`, type: 'logo', value: `${brandName}-logo.png`, lockSource: 'user_confirmed', evidenceRefs: ['asset:logo'] },
    { assetId: `${projectId}-name`, type: 'brand_name', value: brandName, lockSource: 'source_fact', evidenceRefs: ['project_record:brandName'] },
  ];
  value.diagnosis.valuableAssets[0] = {
    target: sourceAsset,
    observation: `${sourceAsset}具有可延展的品牌价值`,
    whyItMatters: '形成项目专属跨媒介识别',
    evidenceRefs: ['asset:1'],
    confidence: 0.95,
  };
  value.diagnosis.brandMisreadRisks = risks.map((target, index) => ({
    code: `project_risk_${index + 1}`,
    description: `避免${target}`,
    target,
    observation: `${target}会造成错误品类理解`,
    whyItMatters: '削弱真实商业角色',
    appliesTo: { taskFamilies: ['space'], subtypes: ['exhibition'] },
    evidenceRefs: ['asset:2'],
    confidence: 0.9,
    status: 'confirmed',
  }));
  value.creativeDecision = {
    brandRoleStatement: brandRole,
    upgradeFrom: ['旧有表面装饰'],
    preserveCore: [sourceAsset],
    upgradeTo: worldview,
    uniqueUpgradeThesis: thesis,
    targetWorldview: worldview,
    toneBoundaries: [{ target: worldview[0], avoid: risks }],
    strategicNegatives: risks,
  };
  value.abstractions = [{
    sourceAsset,
    semanticMeaning: [worldview[0]],
    formalProperties: [structure],
    rhythmProperties: ['有序重复'],
    materialPotential: [material],
    lightingPotential: ['自然光响应'],
    forbiddenLiteralUse: [`直接复制${sourceAsset}`],
    evidenceRefs: ['asset:1'],
    confidence: 0.95,
  }];
  const colorBehavior = {
    primary: [{ name: colors[0], ratio: 70, role: '主体基底' }],
    secondary: [{ name: colors[1], ratio: 20, role: '结构层次' }],
    accent: [{ name: colors[2], ratio: 10, role: '识别点缀' }],
    forbidden: ['无关项目配色'],
  };
  const materialBehavior = [{
    material,
    behavior: ['真实触感', '自然光响应'],
    brandRole: `表达${worldview[0]}`,
    forbidden: ['廉价仿制'],
  }];
  value.mediaTranslations.spatial = {
    ...value.mediaTranslations.spatial,
    spatialConcept: `${thesis}，形成真实可进入的品牌空间。`,
    structureLanguage: [structure],
    materialLanguage: materialBehavior,
    lightingLanguage: {
      source: ['自然漫射光'],
      contrast: '中低对比',
      interactionWithMaterials: ['呈现真实材料层次'],
      forbidden: ['舞台灯'],
    },
    colorBehavior,
    brandIntegration: ['小面积真实 Logo'],
    functionalRelationships: [],
    sceneProgram: ['当前项目证据确认的品牌体验程序'],
    peopleBehavior: [],
    functionalExperience: ['清晰到达与服务动线'],
    sceneMisreadRisks: risks,
  };
  value.colorSystem = colorBehavior;
  value.materialSystem = materialBehavior;
  value.lightingSystem = value.mediaTranslations.spatial.lightingLanguage;
  value.provenance.sourceFingerprint = `${projectId}-packet`;
  return value;
}

test('restaurant and Mid-Autumn consumer projects do not inherit Jiuzhou answers', () => {
  const cases = [
    alternatePacket({
      projectId: 'restaurant-project',
      brandName: '山火小馆',
      industry: '地域餐饮',
      brandRole: '城市社区川味小馆',
      sourceAsset: '灶火与碗口弧线',
      thesis: '从堆叠民俗符号升级为围炉共享、鲜活烟火与现代街坊秩序',
      worldview: ['鲜活烟火', '社区共享'],
      structure: '围合弧线与开放厨房节奏',
      colors: ['炭黑', '米纸白', '辣椒红'],
      material: '深色钢板、粗陶与暖色灰泥',
      risks: ['日式居酒屋', '网红火锅店'],
    }),
    alternatePacket({
      projectId: 'mooncake-project',
      brandName: '望月礼序',
      industry: '节庆消费礼赠',
      brandRole: '当代中秋礼赠品牌',
      sourceAsset: '月相与开合礼序',
      thesis: '从传统纹样堆砌升级为月相变化、开合仪式与当代留白共同构成的礼赠体验',
      worldview: ['当代节庆仪式', '克制礼赠'],
      structure: '月相序列与开合层级',
      colors: ['夜蓝', '宣纸白', '铜金'],
      material: '细纹纸、压凹纸浆与哑光铜',
      risks: ['古装道具', '廉价大红礼盒'],
    }),
  ];
  for (const packetValue of cases) {
    const projectContext = context(packetValue);
    const result = compileVNextImageGeneration({
      projectContext,
      task: {
        projectId: packetValue.projectId,
        deliverableFamily: 'space',
        subtype: 'exhibition',
        shot: 'three_quarter_wide',
        count: 1,
        aspectRatio: '16:9',
        currentInstruction: `生成${packetValue.projectFacts.brandName.value}的品牌体验空间。`,
      },
    });
    assert.match(result.compiledPrompt.finalPrompt, new RegExp(packetValue.projectFacts.brandName.value, 'u'));
    assert.doesNotMatch(
      result.compiledPrompt.finalPrompt,
      /九州美学|医美|孔雀羽毛|矿物紫|半透明生物组织|医疗专业感/u,
    );
  }
});

test('technology platform keywords do not create people, collaboration or medical rules', () => {
  const packetValue = alternatePacket({
    projectId: 'industrial-collaboration-platform',
    brandName: '联创引擎',
    industry: '工业创新服务',
    brandRole: '制造业协作与能力连接平台',
    sourceAsset: '互锁节点',
    thesis: '从孤立展项升级为能力连接、项目协作与共享制造秩序',
    worldview: ['开放协作', '精密制造'],
    structure: '互锁框架与连续路径',
    colors: ['石墨灰', '雾白', '信号橙'],
    material: '再生铝、深灰石材与吸音织物',
    risks: ['传统企业展厅', '产品零售门店'],
  });
  packetValue.mediaTranslations.spatial.colorBehavior = {
    primary: [{ name: '石墨灰', ratio: 60, role: '主体基底' }],
    secondary: [{ name: '雾白', ratio: 30, role: '结构层次' }],
    accent: [{ name: '信号橙', ratio: 10, role: '识别点缀' }],
    forbidden: ['医疗紫'],
  };
  packetValue.colorSystem = packetValue.mediaTranslations.spatial.colorBehavior;
  packetValue.mediaTranslations.spatial.brandIntegration = [
    '互锁节点分散进入墙体、展示界面与动线节点',
    'Logo 小面积位于后方协作服务台',
  ];
  packetValue.mediaTranslations.spatial.functionalExperience = [
    '前景为到达，中景为项目协作，背景为共享制造能力区',
    '连续动线连接接待、协作和后方支持空间',
  ];
  packetValue.mediaTranslations.spatial.lightingLanguage = {
    source: ['顶部漫射照明'],
    contrast: '中低对比',
    interactionWithMaterials: ['在再生铝和石材上形成柔和反射与阴影'],
    forbidden: ['舞台灯'],
  };
  packetValue.lightingSystem = packetValue.mediaTranslations.spatial.lightingLanguage;

  const result = compileVNextImageGeneration({
    projectContext: context(packetValue),
    task: {
      projectId: packetValue.projectId,
      deliverableFamily: 'space',
      subtype: 'exhibition',
      shot: 'three_quarter_wide',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: '生成联创引擎制造业协作平台的能力连接与合作空间。',
    },
  });

  assert.doesNotMatch(result.compiledPrompt.finalPrompt, /Functional relationship:|People behavior:/u);
  assert.doesNotMatch(
    result.compiledPrompt.finalPrompt,
    /consumer beauty store|injections|treatment beds|nursing|医美|美容院|珍珠白|矿物紫|孔雀羽毛/u,
  );
});

test('medical treatment scene does not inherit reception-only treatment negatives', () => {
  const result = compile({
    task: {
      subtype: 'interior_panorama',
      scene: 'treatment_room',
      currentInstruction: '生成医美诊疗室，明确包含护理床和必要医疗设备。',
    },
  });
  assert.equal(result.taskContract.scene, 'treatment_room');
  assert.match(result.compiledPrompt.finalPrompt, /护理床和必要医疗设备/u);
  assert.doesNotMatch(result.compiledPrompt.finalPrompt, /Strict negative:.*(?:注射|护理床|护理场景)/u);
});

test('non-platform medical brand does not receive platform collaboration behavior', () => {
  const packetValue = alternatePacket({
    projectId: 'consumer-medical-brand',
    brandName: '清颜',
    industry: 'medical_aesthetics',
    brandRole: 'consumer_service_brand',
    sourceAsset: '柔和圆角标识',
    thesis: '从通用促销表达升级为证据支持的克制服务体验',
    worldview: ['清晰服务', '可信沟通'],
    structure: '柔和圆角界面',
    colors: ['暖白', '浅灰', '珊瑚色'],
    material: '浅色石材与细纹饰面',
    risks: ['无关零售陈列', '夸张广告人像'],
  });
  const result = compileVNextImageGeneration({
    projectContext: context(packetValue),
    task: {
      projectId: packetValue.projectId,
      deliverableFamily: 'space',
      subtype: 'exhibition',
      shot: 'three_quarter_wide',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: '生成清颜的消费服务体验空间。',
    },
  });
  assert.doesNotMatch(result.compiledPrompt.finalPrompt, /Functional relationship:|People behavior:|全链协同|合作伙伴/u);
});

test('education and food platform words compile only explicit structured scene decisions', () => {
  for (const [projectId, industry, role] of [
    ['education-hub', '教育', '学习资源协作平台'],
    ['food-supply', '餐饮供应链', '供应网络与服务平台'],
  ]) {
    const packetValue = alternatePacket({
      projectId,
      brandName: projectId,
      industry,
      brandRole: role,
      sourceAsset: '连接节点',
      thesis: '从分散信息升级为当前证据支持的连续体验',
      worldview: ['清晰连接', '开放秩序'],
      structure: '连续路径',
      colors: ['中性白', '浅灰', '橙色'],
      material: '木纤维板与哑光饰面',
      risks: ['无关展陈', '错误功能分区'],
    });
    packetValue.mediaTranslations.spatial.functionalRelationships = [];
    packetValue.mediaTranslations.spatial.peopleBehavior = [];
    const result = compileVNextImageGeneration({
      projectContext: context(packetValue),
      task: {
        projectId,
        deliverableFamily: 'space',
        subtype: 'exhibition',
        shot: 'three_quarter_wide',
        count: 1,
        aspectRatio: '16:9',
        currentInstruction: `生成${role}的空间。`,
      },
    });
    assert.doesNotMatch(result.compiledPrompt.finalPrompt, /Functional relationship:|People behavior:/u);
    assert.doesNotMatch(result.compiledPrompt.finalPrompt, /医美|注射|护理床|珍珠白|矿物紫|孔雀|羽毛/u);
  }
});

test('confirmed scoped risk and structured scene behavior compile only for their matching task', () => {
  const result = compile();
  assert.match(result.compiledPrompt.finalPrompt, /Functional relationship: 接待连接等候、咨询与后方服务/u);
  assert.match(result.compiledPrompt.finalPrompt, /People behavior: 访客自然等候/u);
  assert.match(result.compiledPrompt.finalPrompt, /Strict negative: 不要呈现传统医院诊室、注射操作、护理床或护理场景/u);
});

test('risk stays non-executable without confirmed facts and confirmed task scope', () => {
  const probableRiskPacket = packet();
  probableRiskPacket.diagnosis.brandMisreadRisks[1].status = 'probable';
  assert.doesNotMatch(
    compile({ packet: probableRiskPacket }).compiledPrompt.finalPrompt,
    /Strict negative:.*护理床/u,
  );

  const probableRolePacket = packet();
  probableRolePacket.projectFacts.brandRole.status = 'probable';
  assert.doesNotMatch(
    compile({ packet: probableRolePacket }).compiledPrompt.finalPrompt,
    /Strict negative:.*护理床/u,
  );
});
