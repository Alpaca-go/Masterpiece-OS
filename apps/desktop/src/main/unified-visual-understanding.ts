import type {
  VisualDecisionPacket,
  VisualUnderstandingCore,
} from '@masterpiece/project-contracts/index.ts';
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

跨项目深度标准（具体答案只能来自当前项目证据）：
- brandRole 只记录证据支持的业务角色，不得由行业词、品牌名称或抽象概念补写场景功能。
- diagnosis 分别记录历史资产价值、过度或过时表达、品类陈词滥调、项目误读风险和跨媒介断层。
- brandMisreadRisks 每项必须包含稳定 code、可执行 description、适用的任务 family/subtype/scene、证据、置信度和确认状态；无法确认适用范围时标记 probable。
- creativeDecision 说明保留、削弱、移除和升级关系；不得用通用气质词替代当前项目判断。
- abstractions 仅从当前资产证据提取语义、形式、节奏、材料和光线潜力，并明确禁止字面复制。
- spatial 的结构、材料、光线、色彩和品牌整合必须是当前项目的结构化决策，不能由行业名称或品牌角色补齐。
- brandRoleManifestation、signatureSpatialMechanism、functionalNetwork、positiveDifferentiators 和 mustBeVisible 只能来自当前项目证据或用户确认；不得从项目名、行业或通用模板推断。
- signatureSpatialMechanism 必须描述一个可以被直接画出并在多个服务节点连续追踪的核心空间组织机制；mustBeVisible 说明单张结果中必须可见的证据。
- functionalRelationships 只列证据明确支持的功能关系；sceneProgram 只列当前成果物所需的空间程序；peopleBehavior 为空即表示不要求人物。
- 颜色层级、材料物理行为和光线互动必须可执行，但不得套用固定比例、固定材质或固定气质答案。
- 项目误读风险不得写入无关任务；appliesTo 是后续 Compiler 是否应用该风险的唯一场景边界。

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
    "brandMisreadRisks": [{
      "code": "",
      "description": "",
      "target": "",
      "observation": "",
      "whyItMatters": "",
      "appliesTo": { "taskFamilies": [], "subtypes": [], "scenes": [] },
      "evidenceRefs": [],
      "confidence": 0.0,
      "status": "confirmed|probable"
    }],
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
      {
        "target": "",
        "avoid": [""]
      },
      {
        "target": "",
        "avoid": [""]
      }
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
      "brandRoleManifestation": [],
      "signatureSpatialMechanism": [],
      "functionalNetwork": [],
      "positiveDifferentiators": [],
      "mustBeVisible": [],
      "structureLanguage": [],
      "materialLanguage": [
        { "material": "当前项目证据支持的材料", "behavior": ["可观察的物理行为"], "brandRole": "该材料在当前设计决策中的作用", "forbidden": [] }
      ],
      "lightingLanguage": {
        "source": ["当前场景的光源决策"],
        "contrast": "当前项目的对比关系",
        "interactionWithMaterials": ["光线与已选材料的物理互动"],
        "forbidden": []
      },
      "colorBehavior": {
        "primary": [{ "name": "当前项目主色", "role": "当前证据支持的作用" }],
        "secondary": [{ "name": "当前项目辅助色", "role": "当前证据支持的作用" }],
        "accent": [{ "name": "当前项目强调色", "role": "当前证据支持的作用" }],
        "forbidden": []
      },
      "brandIntegration": [],
      "functionalRelationships": [],
      "sceneProgram": [],
      "peopleBehavior": [],
      "functionalExperience": [],
      "sceneMisreadRisks": []
    },
    "packaging": {
      "packagingConcept": "",
      "productAndCategoryRole": [],
      "structureStrategy": [{ "structure": "", "purpose": "", "locked": false, "evidenceRefs": [] }],
      "openingExperience": [],
      "productArrangement": [],
      "graphicTranslation": [{ "sourceMeaning": "", "packagingExpression": [], "forbiddenLiteralUse": [] }],
      "informationHierarchy": [],
      "substrateLanguage": [],
      "craftLanguage": [{ "craft": "", "purpose": "", "forbiddenUse": [] }],
      "colorBehavior": { "base": [], "identity": [], "accent": [], "forbidden": [] },
      "logoPolicy": [],
      "seriesArchitecture": [],
      "photographyDirection": [],
      "packagingMisreadRisks": []
    },
    "poster": { "concept": "", "expressionLanguage": [], "misreadRisks": [] },
    "vi": { "concept": "", "expressionLanguage": [], "misreadRisks": [] }
  }
}

数组资产项使用以下字段：
{ "assetId": "", "name": "", "occurrenceRefs": [], "frequency": 1, "visualFeatures": [], "possibleBrandMeaning": [], "isOriginalAsset": true, "userConfirmed": false, "editable": null, "contextRole": "brand_asset|mockup_environment|reference_case|display_decoration|unknown", "confidence": 0.0 }

普通诊断项使用以下字段：
{ "target": "", "observation": "", "whyItMatters": "", "evidenceRefs": [], "confidence": 0.0 }

brandMisreadRisks 使用以下字段：
{ "code": "", "description": "", "target": "", "observation": "", "whyItMatters": "", "appliesTo": { "taskFamilies": [], "subtypes": [], "scenes": [] }, "evidenceRefs": [], "confidence": 0.0, "status": "confirmed|probable" }

强制规则：
1. 每个硬事实和诊断必须携带可定位 evidenceRefs；无法确认就标 unknown，禁止编造行业替代答案。
2. Mockup 背景材质、展示页装饰和参考案例必须与真实品牌资产分开。
3. model_inference 不得伪装成 confirmed，也不得提出 Locked Assets；Locked Assets 由本地系统根据 ProjectRecord 构建。
4. 诊断必须区分“有历史识别价值”与“使用过度/过时”；误读风险必须提供任务适用范围，禁止输出无场景边界的行业默认限制。
5. uniqueUpgradeThesis 必须同时回答原来是什么、为什么不足、保留什么、升级成什么、如何避免新误读。
6. 抽象不得只输出“几何纹理”；必须同时覆盖语义、形式、节奏、材料潜力、光线潜力和禁止字面复制。
7. spatial 必须把抽象属性转成真实空间结构、材料行为、光线行为、色彩行为和显式场景程序；没有证据时人物和功能关系保持空数组。
8. 不得根据行业词、品牌角色词、项目名称或抽象气质词推断具体材料、人物、功能关系、空间程序或负面场景。
9. packaging 必须把项目决策转译为包装结构、开合、内装、图形信息、基材、工艺、色彩与产品摄影语言；没有包装结构证据时 structureStrategy 留空，禁止猜测盒型。poster/vi 本轮仍可留空。
10. 不得复制 Golden Prompt 或任何固定项目答案；所有结论必须由当前项目证据推出。
11. toneBoundaries 至少输出 2 项；每项必须同时包含非空 target 与至少 1 个 avoid。target 与 avoid 必须由当前项目证据、误读风险或战略负面项推出，禁止填写通用行业模板。`;
}

export function normalizeUnifiedVisualUnderstanding(input: {
  project: ProjectRecord;
  extracted: unknown;
  generatedAt?: string;
  modelId?: string;
  sourceRefs?: string[];
  enforceExecutionSufficiency?: boolean;
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
  const enforceExecutionSufficiency = input.enforceExecutionSufficiency !== false;
  if (
    enforceExecutionSufficiency
    && packet.validation.hardFactStatus === 'pass'
    && packet.validation.executionDataStatus !== 'ready'
  ) {
    throw Object.assign(
      new Error(`VISUAL_DECISION_PACKET_INSUFFICIENT: ${packet.validation.missingExecutionFields.join(', ')}`),
      {
        code: 'VISUAL_DECISION_PACKET_INSUFFICIENT',
        issues: packet.validation.missingExecutionFields,
      },
    );
  }
  if (enforceExecutionSufficiency && packet.validation.hardFactStatus === 'pass') {
    const issues: string[] = [];
    if (!packet.diagnosis.valuableAssets.length) issues.push('diagnosis.valuableAssets');
    if (!packet.creativeDecision.uniqueUpgradeThesis) issues.push('creativeDecision.uniqueUpgradeThesis');
    if (!packet.colorSystem.primary.length
      || !packet.colorSystem.secondary.length
      || !packet.colorSystem.accent.length) {
      issues.push('mediaTranslations.spatial.colorBehavior requires primary/secondary/accent');
    }
    if (issues.length) {
      throw Object.assign(new Error(`VISUAL_DECISION_PACKET_INSUFFICIENT: ${issues.join(', ')}`), {
        code: 'VISUAL_DECISION_PACKET_INSUFFICIENT',
        issues,
      });
    }
  }
  return { core, packet };
}
