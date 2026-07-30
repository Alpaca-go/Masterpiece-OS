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
      "materialLanguage": [{ "material": "", "behavior": [], "brandRole": "", "forbidden": [] }],
      "lightingLanguage": { "source": [], "contrast": "", "interactionWithMaterials": [], "forbidden": [] },
      "colorBehavior": {
        "primary": [{ "name": "", "ratio": 70, "role": "" }],
        "secondary": [{ "name": "", "ratio": 20, "role": "" }],
        "accent": [{ "name": "", "ratio": 10, "role": "" }],
        "forbidden": []
      },
      "brandIntegration": [],
      "functionalExperience": [],
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
    if (packet.mediaTranslations.spatial.sceneMisreadRisks.length < 4) {
      issues.push('mediaTranslations.spatial.sceneMisreadRisks requires 4 adjacent-scene risks');
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
