import type {
  VisualDecisionPacket,
  VisualUnderstandingCore,
} from '../../../../packages/project-contracts/src/index.ts';
import type { ProjectRecord } from '../shared/types.ts';
import {
  buildVisualUnderstandingCore,
  validateVisualUnderstandingCore,
} from './visual-understanding-core.ts';
import {
  buildVisualDecisionPacket,
  validateVisualDecisionPacket,
} from './visual-decision-packet.ts';

export function buildUnifiedVisualUnderstandingPrompt(
  project: ProjectRecord,
  assetIds: string[],
): string {
  return `你是 Unified Visual Understanding 引擎。只基于本消息中的 ProjectRecord 硬事实和随附原始视觉资产工作，不得读取、引用或复述任何分析报告，也不得使用其他项目的结论。

项目硬事实（优先于视觉推断）：
- projectId: ${project.id}
- brandName: ${project.brandName || project.projectName || 'unknown'}
- industry: ${project.industry || project.detectedIndustry || 'unknown'}
- logoLocked: ${project.logoLocked !== false}
- userLockedFacts: ${JSON.stringify(project.lockedFacts || [])}
- attachedAssetIds: ${JSON.stringify(assetIds)}

跨项目深度标准（只能从当前项目证据推导具体答案）：
- brandRole 必须表达该品牌在其行业生态中的精确角色、业务层级与价值关系，明确判断它是单店/机构、产品品牌、连锁、平台、生态网络或其他角色；不能退化为“服务提供者”“高端品牌”等通用称谓；优先逐字识别原图中的定位文案，再做证据约束的归纳。
- diagnosis 必须分别识别历史资产价值、过度使用/过时表达、品类陈词滥调、相邻品类误读和跨媒介断层；不能因为 Schema 允许空数组就跳过视觉上可判断的问题。
- toneBoundaries 至少给出 4 组互不重复的“目标—避免”张力，分别覆盖文化语义、专业/可信度、未来材料/当代性、人文温度；每组必须同时说明“是什么”和“不能滑向什么”，具体措辞必须来自当前项目。
- abstractions 必须把核心具象资产转译为生长、组织、流动、层叠等可执行的形式关系（仅在证据支持时使用），并明确禁止照搬原图。
- spatial.sceneMisreadRisks 至少列出 4 个与当前项目真实相邻的错误场景或品类，主动检查：同品类俗套、机构/临床、文化/餐饮/会所、生活方式零售、地产展示/办公、科技展厅中与当前项目有关的误读；每项都应能转成明确负向约束，不能只写“避免廉价”。
- spatial 的 primary/secondary/accent 都必须有内容；不能把 VI 高识别色直接以 50% 以上铺满空间。除非当前证据明确要求沉浸式单色空间，primary 应是 60–80% 的低饱和环境基底，secondary 是 15–30% 的材料层次，品牌识别色通常作为 5–15% 的 accent。颜色名称应转成空间材料语义，不能只复述色卡名或 HEX。
- 核心抽象必须进入空间结构、界面、动线或光线机制，不能降级成“墙面装饰元素”。面向专业固定商业空间时，半透明核心结构优先考虑树脂、玻璃、复合板或可建造生物基材料；没有明确纺织证据时，不得使用纱幔、窗帘或舞台软装替代建筑结构。
- brandIntegration 必须说明核心抽象如何分散进入至少两个不同空间界面，例如隔断、曲面墙体、天花层次、光线过滤界面、展示结构或动线节奏；不得收敛为单一巨型雕塑、放大图标或打卡装置。
- Logo 只能作为小面积、次层级识别出现在后方接待墙、内部服务节点或干净预留位；不得位于画面顶部中央、入口门头或最大视觉中心，不得使用多个 Logo。
- functionalExperience 必须同时给出前景、中景、背景的功能分工，以及从入口进入、停留、咨询/展示、前往后方的动线；不能只列房间名称。
- 当 accent 是品牌识别色时，同一色相不得同时进入 primary 或 secondary；品牌识别色总视觉权重不得超过 15%。secondary 应承担半透明材料、浅矿物色或冷银结构层次。
- 专业空间材料必须给出真实厚度、接缝/收边、透射/漫反射等物理行为及品牌作用；半透明材料不得只是有颜色的装饰玻璃。
- 当硬事实表明项目是全链、生态或平台型专业服务空间，materialLanguage 必须把材料系统拆成可建造的不同角色：半透明树脂/亚克力结构、低铁磨砂玻璃界面、基于证据的浅色珠光漫反射表面、拉丝冷银金属细节，并分别写明厚度、接缝/收边和透射/漫反射行为；不得用一个笼统的“高级材料”条目代替。
- 上述平台型空间的 lightingLanguage 必须明确自然侧光、低对比漫反射，以及光线如何穿过半透明材料形成透射和空间纵深；sceneMisreadRisks 或 strategicNegatives 必须逐项明确排除普通美容院、医院/诊所、茶空间/会所、生活方式零售、售楼处等相邻业态，不能把多个业态藏在一个模糊合并项中。

只返回一个裸 JSON 对象，不要 Markdown、解释或代码围栏。结构如下：
{
  "projectFacts": {
    "brandName": { "value": "", "source": "project_record|source_document|visual_asset|user_input|file_metadata|model_inference", "evidenceRefs": [], "confidence": 0.0, "status": "confirmed|probable|unknown|conflict" },
    "industry": { "value": "", "source": "...", "evidenceRefs": [], "confidence": 0.0, "status": "..." },
    "brandRole": { "value": "", "source": "...", "evidenceRefs": [], "confidence": 0.0, "status": "..." }
  },
  "assetInventory": {
    "logoAssets": [],
    "colorAssets": [],
    "typographyAssets": [],
    "graphicMotifs": [],
    "imageryAssets": [],
    "layoutPatterns": [],
    "materialCues": [],
    "packagingStructures": [],
    "spatialCues": [],
    "copyAssets": []
  },
  "diagnosis": {
    "valuableAssets": [],
    "overusedExpressions": [],
    "outdatedExpressions": [],
    "weakSystemAreas": [],
    "categoryCliches": [],
    "brandMisreadRisks": [],
    "crossMediaGaps": []
  },
  "creativeDecision": {
    "brandRoleStatement": "",
    "upgradeFrom": [],
    "preserveCore": [],
    "upgradeTo": [],
    "uniqueUpgradeThesis": "",
    "targetWorldview": [],
    "toneBoundaries": [
      { "target": "当前项目的文化语义目标", "avoid": ["对应的符号化或复古化误读"] },
      { "target": "当前项目的专业/可信目标", "avoid": ["对应的冰冷或俗套误读"] },
      { "target": "当前项目的未来材料/当代性目标", "avoid": ["对应的科幻或廉价科技误读"] },
      { "target": "当前项目的人文温度目标", "avoid": ["对应的甜美、柔弱或疏离误读"] }
    ],
    "strategicNegatives": []
  },
  "abstractions": [{
    "sourceAsset": "",
    "semanticMeaning": [],
    "formalProperties": [],
    "rhythmProperties": [],
    "materialPotential": [],
    "lightingPotential": [],
    "forbiddenLiteralUse": [],
    "evidenceRefs": [],
    "confidence": 0.0
  }],
  "mediaTranslations": {
    "sharedBrandCore": [],
    "spatial": {
      "spatialConcept": "",
      "structureLanguage": [],
      "materialLanguage": [
        { "material": "基于当前证据的半透明结构材料", "behavior": ["真实厚度", "接缝与收边", "透射行为"], "brandRole": "", "forbidden": [] },
        { "material": "基于当前证据的磨砂玻璃界面", "behavior": ["低铁或中性颜色", "柔化视线", "透光不透明"], "brandRole": "", "forbidden": [] },
        { "material": "基于当前证据的浅色珠光表面", "behavior": ["低光泽", "细腻漫反射", "避免塑料感"], "brandRole": "", "forbidden": [] },
        { "material": "基于当前证据的拉丝冷银金属细节", "behavior": ["精确接缝", "结构收边", "小面积使用"], "brandRole": "", "forbidden": [] }
      ],
      "lightingLanguage": {
        "source": ["自然侧光", "克制的隐藏补光"],
        "contrast": "低对比、柔和漫反射",
        "interactionWithMaterials": ["光线穿过半透明结构形成透射、边缘亮度和空间纵深"],
        "forbidden": []
      },
      "colorBehavior": {
        "primary": [{ "name": "当前项目的低饱和环境基底色", "ratio": 70, "role": "墙地顶主体与专业稳定基底" }],
        "secondary": [{ "name": "当前项目的浅矿物/半透明/金属材料色", "ratio": 20, "role": "结构、材料与界面层次，不重复品牌强调色" }],
        "accent": [{ "name": "当前项目的品牌识别色", "ratio": 10, "role": "仅用于小面积识别、边缘反射与关键节点" }],
        "forbidden": []
      },
      "brandIntegration": [
        "核心抽象进入半透明隔断和光线过滤界面：基于当前项目填写",
        "核心抽象进入曲面墙体和天花层次：基于当前项目填写",
        "核心抽象进入展示结构或动线节奏：基于当前项目填写",
        "Logo 小面积位于后方内部服务节点或保留干净识别位"
      ],
      "functionalExperience": [
        "前景：到达、等候或咨询功能",
        "中景：半透明分区、展示或品牌沟通功能",
        "背景：克制接待识别与后方服务空间",
        "动线：从入口进入、停留、咨询/展示并前往后方"
      ],
      "sceneMisreadRisks": [
        "同品类俗套误读：基于当前项目填写",
        "机构或临床场景误读：基于当前项目填写",
        "文化/餐饮/会所等体验业态误读：基于当前项目填写",
        "零售/地产展示/办公/科技展厅误读：基于当前项目填写"
      ]
    },
    "packaging": { "concept": "", "expressionLanguage": [], "misreadRisks": [] },
    "poster": { "concept": "", "expressionLanguage": [], "misreadRisks": [] },
    "vi": { "concept": "", "expressionLanguage": [], "misreadRisks": [] }
  }
}

数组资产项使用以下字段：
{ "assetId": "", "name": "", "occurrenceRefs": [], "frequency": 1, "visualFeatures": [], "possibleBrandMeaning": [], "isOriginalAsset": true, "userConfirmed": false, "editable": null, "contextRole": "brand_asset|mockup_environment|reference_case|display_decoration|unknown", "confidence": 0.0 }

诊断项使用以下字段：
{ "target": "", "observation": "", "whyItMatters": "", "evidenceRefs": [], "confidence": 0.0 }

强制规则：
1. 每个硬事实和诊断必须携带可定位 evidenceRefs；无法确认就标 unknown，禁止编造行业替代答案。
2. Mockup 背景材质、展示页装饰和参考案例必须与真实品牌资产分开。
3. model_inference 不得伪装成 confirmed，也不得提出 Locked Assets；Locked Assets 由本地系统根据 ProjectRecord 构建。
4. 诊断必须区分“有历史识别价值”与“使用过度/过时”，并列出具体品类和场景误读风险。
5. uniqueUpgradeThesis 必须同时回答原来是什么、为什么不足、保留什么、升级成什么、如何避免新误读。
6. 抽象不得只输出“几何纹理”；必须同时覆盖语义、形式、节奏、材料潜力、光线潜力和禁止字面复制。
7. spatial 必须把抽象属性转成真实空间结构、材料行为、光线行为、色彩行为、功能体验和场景误读风险。
8. 不得把东方自动等同于木格栅、茶室、书法、古典中式或日式侘寂；不得把未来自动等同于科技蓝、霓虹或科幻实验室；不得把高端自动等同于售楼处、会所或生活方式零售。
9. packaging/poster/vi 本轮只保留接口，可以留空；spatial 在硬事实充分时不得留空。
10. 不得复制 Golden Prompt 或任何固定项目答案；所有结论必须由当前项目证据推出。`;
}

export function normalizeUnifiedVisualUnderstanding(input: {
  project: ProjectRecord;
  extracted: unknown;
  generatedAt?: string;
  modelId?: string;
  sourceRefs?: string[];
}): { core: VisualUnderstandingCore; packet: VisualDecisionPacket } {
  const core = buildVisualUnderstandingCore(input);
  const coreValidation = validateVisualUnderstandingCore(core);
  if (!coreValidation.valid) {
    throw Object.assign(new Error(`Visual Understanding Core invalid: ${coreValidation.errors.join('; ')}`), {
      code: 'VISUAL_UNDERSTANDING_INVALID',
      issues: coreValidation.errors,
    });
  }
  const packet = buildVisualDecisionPacket({ core, extracted: input.extracted });
  const packetValidation = validateVisualDecisionPacket(packet);
  if (!packetValidation.valid) {
    throw Object.assign(new Error(`Visual Decision Packet invalid: ${packetValidation.errors.join('; ')}`), {
      code: 'VISUAL_DECISION_PACKET_INVALID',
      issues: packetValidation.errors,
    });
  }
  if (packet.validation.hardFactStatus === 'pass' && packet.validation.executionDataStatus !== 'ready') {
    throw Object.assign(
      new Error(`PROMPT_SOURCE_INSUFFICIENT: ${packet.validation.missingExecutionFields.join(', ')}`),
      {
        code: 'PROMPT_SOURCE_INSUFFICIENT',
        issues: packet.validation.missingExecutionFields,
      },
    );
  }
  if (packet.validation.hardFactStatus === 'pass') {
    const issues: string[] = [];
    if (!packet.diagnosis.valuableAssets.length) issues.push('diagnosis.valuableAssets');
    if (!packet.diagnosis.brandMisreadRisks.length) issues.push('diagnosis.brandMisreadRisks');
    if (!packet.creativeDecision.uniqueUpgradeThesis) issues.push('creativeDecision.uniqueUpgradeThesis');
    if (packet.creativeDecision.toneBoundaries.length < 4) {
      issues.push('creativeDecision.toneBoundaries requires 4 distinct tension axes');
    }
    const toneBoundaryText = JSON.stringify(packet.creativeDecision.toneBoundaries);
    const requiredToneAxes: Array<[string, RegExp]> = [
      ['cultural semantics', /文化|东方|地域|传统|本土|cultur/iu],
      ['professional trust', /专业|可信|严谨|安全|科学|profession|trust|rigor/iu],
      ['future material or contemporary', /未来|当代|现代|前瞻|材料|创新|future|contempor|modern|material|innovation/iu],
      ['human warmth', /人文|温度|温暖|亲和|关怀|human|warm|care/iu],
    ];
    const missingToneAxes = requiredToneAxes
      .filter(([, pattern]) => !pattern.test(toneBoundaryText))
      .map(([name]) => name);
    if (missingToneAxes.length) {
      issues.push(`creativeDecision.toneBoundaries missing axes: ${missingToneAxes.join(', ')}`);
    }
    if (!packet.colorSystem.primary.length
      || !packet.colorSystem.secondary.length
      || !packet.colorSystem.accent.length) {
      issues.push('mediaTranslations.spatial.colorBehavior requires primary/secondary/accent');
    }
    const oversizedIdentityPrimary = packet.colorSystem.primary.some((item) =>
      Number(item.ratio || 0) >= 50
      && /品牌|识别|标志|logo|identity/iu.test(item.role));
    if (oversizedIdentityPrimary) {
      issues.push('spatial primary color cannot be a majority VI identity swatch');
    }
    if (packet.mediaTranslations.spatial.brandIntegration.some((item) =>
      /装饰元素|decorative element/iu.test(item))) {
      issues.push('brand abstraction cannot collapse into a decorative element');
    }
    const brandIntegrationText = packet.mediaTranslations.spatial.brandIntegration.join(' ');
    const distributedInterfaceKinds = [
      /隔断|partition/iu,
      /墙体|墙面|wall/iu,
      /天花|顶面|ceiling/iu,
      /光线|光过滤|lighting|light-filter/iu,
      /展示|display/iu,
      /动线|路径|circulation|path/iu,
    ].filter((pattern) => pattern.test(brandIntegrationText)).length;
    if (distributedInterfaceKinds < 2
      || /单一.*(?:雕塑|装置)|巨型.*(?:雕塑|装置)|放大.*(?:图标|符号)|打卡装置/iu.test(brandIntegrationText)) {
      issues.push('brandIntegration requires distributed translation across 2+ spatial interfaces');
    }
    if (!/(小面积|次层级|后方|内部|预留|留白|small|subtle|background|internal|reserved)/iu.test(brandIntegrationText)
      || /顶部中央|入口门头|主招牌|最大视觉中心|top center|storefront sign/iu.test(brandIntegrationText)) {
      issues.push('brandIntegration requires a subtle non-storefront Logo placement');
    }
    const functionalText = packet.mediaTranslations.spatial.functionalExperience.join(' ');
    for (const [name, pattern] of [
      ['foreground', /前景|foreground/iu],
      ['midground', /中景|midground/iu],
      ['background', /背景|background/iu],
      ['circulation', /动线|进入|前往后方|circulation|arrival.*consult/iu],
    ] as Array<[string, RegExp]>) {
      if (!pattern.test(functionalText)) {
        issues.push(`functionalExperience missing ${name} storytelling`);
      }
    }
    const accentColorFamilies = new Set(
      packet.colorSystem.accent.flatMap((item) =>
        [...item.name.matchAll(/[紫红蓝绿橙黄金粉]|purple|violet|red|blue|green|orange|gold|pink/giu)]
          .map((match) => match[0].toLowerCase())),
    );
    const repeatedAccentFamily = [...packet.colorSystem.primary, ...packet.colorSystem.secondary]
      .some((item) => [...accentColorFamilies].some((family) =>
        item.name.toLowerCase().includes(family)));
    const accentWeight = packet.colorSystem.accent.reduce(
      (sum, item) => sum + Number(item.ratio || 0),
      0,
    );
    if (repeatedAccentFamily || accentWeight > 15) {
      issues.push('brand accent color must remain exclusive to the 5-15% accent layer');
    }
    if (packet.mediaTranslations.spatial.sceneMisreadRisks.length < 4) {
      issues.push('mediaTranslations.spatial.sceneMisreadRisks requires 4 adjacent-scene risks');
    }
    const platformRoleText = [
      packet.projectFacts.brandRole.value,
      packet.creativeDecision.brandRoleStatement,
    ].join(' ');
    if (/全链|生态平台|产业平台|ecosystem|platform|network/iu.test(platformRoleText)) {
      const materialText = JSON.stringify(packet.mediaTranslations.spatial.materialLanguage);
      for (const [name, pattern] of [
        ['translucent resin/acrylic structure', /半透明.*(?:树脂|亚克力)|translucent.*(?:resin|acrylic)/iu],
        ['frosted glass interface', /磨砂玻璃|frosted glass/iu],
        ['pearl diffuse surface', /珍珠|珠光|pearl/iu],
        ['brushed cool-silver detail', /拉丝.*(?:冷银|银)|brushed.*silver/iu],
        ['physical thickness/joints/edges', /厚度|接缝|收边|thickness|joint|edge/iu],
        ['physical transmission/diffusion', /透射|漫反射|transmission|diffuse/iu],
      ] as Array<[string, RegExp]>) {
        if (!pattern.test(materialText)) {
          issues.push(`platform material system missing ${name}`);
        }
      }
      const lightingText = JSON.stringify(packet.mediaTranslations.spatial.lightingLanguage);
      for (const [name, pattern] of [
        ['natural side light', /自然侧光|侧向自然光|natural side light/iu],
        ['diffuse reflection', /漫反射|diffuse/iu],
        ['material transmission', /透射|穿透|穿过|transmission|through/iu],
      ] as Array<[string, RegExp]>) {
        if (!pattern.test(lightingText)) {
          issues.push(`platform lighting system missing ${name}`);
        }
      }
      const negativeText = [
        ...packet.mediaTranslations.spatial.sceneMisreadRisks,
        ...packet.creativeDecision.strategicNegatives,
        ...packet.diagnosis.brandMisreadRisks.map((item) => item.target),
      ].join(' ');
      for (const [name, pattern] of [
        ['beauty salon', /美容院|beauty salon/iu],
        ['hospital or clinic', /医院|诊所|临床|hospital|clinic/iu],
        ['tea space or club', /茶空间|茶室|会所|tea space|club/iu],
        ['lifestyle retail', /生活方式.*零售|零售店|lifestyle retail/iu],
        ['sales office', /售楼处|地产展示|sales office/iu],
      ] as Array<[string, RegExp]>) {
        if (!pattern.test(negativeText)) {
          issues.push(`platform scene negatives missing ${name}`);
        }
      }
    }
    if (issues.length) {
      throw Object.assign(new Error(`PROMPT_SOURCE_INSUFFICIENT: ${issues.join(', ')}`), {
        code: 'PROMPT_SOURCE_INSUFFICIENT',
        issues,
      });
    }
  }
  return { core, packet };
}
