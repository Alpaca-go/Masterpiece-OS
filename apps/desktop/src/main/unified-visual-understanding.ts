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
    "toneBoundaries": [{ "target": "", "avoid": [] }],
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
      "sceneMisreadRisks": []
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
    if (!packet.creativeDecision.toneBoundaries.length) issues.push('creativeDecision.toneBoundaries');
    if (issues.length) {
      throw Object.assign(new Error(`PROMPT_SOURCE_INSUFFICIENT: ${issues.join(', ')}`), {
        code: 'PROMPT_SOURCE_INSUFFICIENT',
        issues,
      });
    }
  }
  return { core, packet };
}
