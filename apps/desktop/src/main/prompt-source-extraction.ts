import type {
  PromptSourceColorBehavior,
  PromptSourceLightingBehavior,
  PromptSourceMaterialBehavior,
  PromptSourceObject,
  PromptSourceToneBoundary,
  PromptSourceVisualTransformation,
} from '../../../../packages/project-contracts/src/index.ts';
import type { ProjectRecord } from '../shared/types.ts';

type UnknownRecord = Record<string, unknown>;

export type PromptSourceExtraction = Omit<
  PromptSourceObject,
  'schemaVersion' | 'projectId' | 'generatedAt' | 'provenance'
>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/gu, ' ') : '';
}

function strings(value: unknown, limit = 24): string[] {
  const result: string[] = [];
  const values = Array.isArray(value) ? value : [];
  for (const item of values) {
    const clean = text(item);
    if (clean && !result.includes(clean)) result.push(clean);
    if (result.length >= limit) break;
  }
  return result;
}

function score(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(1, numeric));
}

function colorUsage(value: unknown): PromptSourceColorBehavior['primary'] {
  return (Array.isArray(value) ? value : []).flatMap((item) => {
    const source = record(item);
    const name = text(source.name);
    const role = text(source.role);
    if (!name || !role) return [];
    const ratio = Number(source.ratio);
    return [{
      name,
      role,
      ...(Number.isFinite(ratio) && ratio >= 0 && ratio <= 100 ? { ratio } : {}),
    }];
  }).slice(0, 12);
}

function toneBoundaries(value: unknown): PromptSourceToneBoundary[] {
  return (Array.isArray(value) ? value : []).flatMap((item) => {
    const source = record(item);
    const target = text(source.target);
    if (!target) return [];
    return [{ target, avoid: strings(source.avoid, 12) }];
  }).slice(0, 12);
}

function transformations(value: unknown): PromptSourceVisualTransformation[] {
  return (Array.isArray(value) ? value : []).flatMap((item) => {
    const source = record(item);
    const sourceAsset = text(source.sourceAsset);
    const abstractProperties = strings(source.abstractProperties, 12);
    const newExpression = strings(source.newExpression, 12);
    if (!sourceAsset || !abstractProperties.length || !newExpression.length) return [];
    return [{
      sourceAsset,
      abstractProperties,
      newExpression,
      forbiddenLiteralUse: strings(source.forbiddenLiteralUse, 12),
    }];
  }).slice(0, 12);
}

function materials(value: unknown): PromptSourceMaterialBehavior[] {
  return (Array.isArray(value) ? value : []).flatMap((item) => {
    const source = record(item);
    const material = text(source.material);
    const behavior = strings(source.behavior, 12);
    const brandRole = text(source.brandRole);
    if (!material || !behavior.length || !brandRole) return [];
    return [{
      material,
      behavior,
      brandRole,
      forbidden: strings(source.forbidden, 12),
    }];
  }).slice(0, 16);
}

function lighting(value: unknown): PromptSourceLightingBehavior {
  const source = record(value);
  return {
    source: strings(source.source, 12),
    contrast: text(source.contrast),
    interactionWithMaterials: strings(source.interactionWithMaterials, 12),
    forbidden: strings(source.forbidden, 12),
  };
}

export function buildPromptSourceExtractionPrompt(
  project: ProjectRecord,
  assetIds: string[],
): string {
  return `你正在从原始项目素材中提取“直接服务于生图”的结构化 Prompt Source。
不得引用、猜测或总结任何分析报告；只允许使用本消息中的项目硬事实和随附原始视觉素材。
不要创作长文，不要把旧视觉原样当成未来答案。区分：硬事实、原方案现状诊断、升级转译、渲染语言。

项目硬事实（优先级高于视觉推断）：
- projectId: ${project.id}
- brandName: ${project.brandName || project.projectName || 'unknown'}
- industry: ${project.industry || project.detectedIndustry || 'unknown'}
- logoLocked: ${project.logoLocked !== false}
- userLockedFacts: ${JSON.stringify(project.lockedFacts || [])}
- attachedAssetIds: ${JSON.stringify(assetIds)}

只返回一个 JSON 对象，严格使用以下结构：
{
  "projectFacts": {
    "brandName": "string",
    "industry": "string",
    "brandRole": "string",
    "businessModel": "string or empty",
    "primaryOfferings": ["string"]
  },
  "lockedAssets": {
    "confirmedColors": ["only explicit/strongly evidenced colors"],
    "mustPreserve": ["immutable identity facts"],
    "immutableStructures": ["only explicitly confirmed physical structures"]
  },
  "sourceVisualState": {
    "valuableAssets": ["what carries durable brand equity"],
    "overusedElements": ["what is overused"],
    "outdatedExpressions": ["what looks dated"],
    "genericIndustryCliches": ["category clichés visible in the source"],
    "brandMisreadRisks": ["specific wrong directions a generator may take"]
  },
  "upgradeTranslation": {
    "preserve": ["what meaning/identity must remain"],
    "weaken": ["what should become secondary"],
    "remove": ["what should disappear"],
    "targetWorldview": ["project-specific future visual worldview"],
    "toneBoundaries": [
      { "target": "positive target", "avoid": ["nearby but wrong interpretation"] }
    ],
    "transformations": [
      {
        "sourceAsset": "source symbol/material/graphic",
        "abstractProperties": ["shape, rhythm, structure, meaning"],
        "newExpression": ["how those properties translate into a new medium"],
        "forbiddenLiteralUse": ["literal copying to avoid"]
      }
    ]
  },
  "renderLanguage": {
    "colorBehavior": {
      "primary": [{ "name": "color", "ratio": 70, "role": "behavior and brand role" }],
      "secondary": [{ "name": "color", "ratio": 20, "role": "behavior and brand role" }],
      "accent": [{ "name": "color", "ratio": 10, "role": "behavior and brand role" }],
      "forbidden": ["wrong color behavior"]
    },
    "materialBehavior": [
      {
        "material": "material",
        "behavior": ["surface/light/tactility behavior"],
        "brandRole": "why it belongs to this brand",
        "forbidden": ["wrong material behavior"]
      }
    ],
    "lightingBehavior": {
      "source": ["light direction/type"],
      "contrast": "contrast behavior",
      "interactionWithMaterials": ["material-light interaction"],
      "forbidden": ["wrong light behavior"]
    },
    "graphicBehavior": ["graphic behavior, not a list of mockups"]
  },
  "negativeRules": {
    "project": ["project-specific wrong categories or readings"],
    "model": ["random text, logo, rendering failure risks"]
  },
  "confidence": {
    "projectFacts": 0.0,
    "lockedAssets": 0.0,
    "sourceVisualState": 0.0,
    "upgradeTranslation": 0.0
  }
}

要求：
1. 不得把“东方”自动等同于木格栅、茶室、书法、古典中式或日式侘寂；
2. 不得把“未来”自动等同于科技蓝、霓虹灯、科幻实验室或金属舱体；
3. 不得把“高端”自动等同于售楼处、奢华会所或生活方式零售店；
4. 视觉无法确认的字段输出空数组/空字符串并降低 confidence，禁止编造；
5. transformations 必须是“原资产 → 抽象特征 → 新媒介表达”，不得只写风格词；
6. 不要输出 Markdown、解释或代码围栏。`;
}

export function normalizePromptSourceExtraction(value: unknown): PromptSourceExtraction {
  const source = record(value);
  const projectFacts = record(source.projectFacts);
  const lockedAssets = record(source.lockedAssets);
  const sourceVisualState = record(source.sourceVisualState);
  const upgradeTranslation = record(source.upgradeTranslation);
  const renderLanguage = record(source.renderLanguage);
  const colorBehavior = record(renderLanguage.colorBehavior);
  const negativeRules = record(source.negativeRules);
  const confidence = record(source.confidence);
  return {
    projectFacts: {
      brandName: text(projectFacts.brandName),
      industry: text(projectFacts.industry),
      brandRole: text(projectFacts.brandRole),
      businessModel: text(projectFacts.businessModel) || null,
      primaryOfferings: strings(projectFacts.primaryOfferings),
    },
    lockedAssets: {
      logoAssetIds: [],
      preferredLogoAssetId: null,
      logoUsageMode: 'blank_area',
      confirmedColors: strings(lockedAssets.confirmedColors),
      mustPreserve: strings(lockedAssets.mustPreserve),
      immutableStructures: strings(lockedAssets.immutableStructures),
    },
    sourceVisualState: {
      valuableAssets: strings(sourceVisualState.valuableAssets),
      overusedElements: strings(sourceVisualState.overusedElements),
      outdatedExpressions: strings(sourceVisualState.outdatedExpressions),
      genericIndustryCliches: strings(sourceVisualState.genericIndustryCliches),
      brandMisreadRisks: strings(sourceVisualState.brandMisreadRisks),
    },
    upgradeTranslation: {
      preserve: strings(upgradeTranslation.preserve),
      weaken: strings(upgradeTranslation.weaken),
      remove: strings(upgradeTranslation.remove),
      targetWorldview: strings(upgradeTranslation.targetWorldview),
      toneBoundaries: toneBoundaries(upgradeTranslation.toneBoundaries),
      transformations: transformations(upgradeTranslation.transformations),
    },
    renderLanguage: {
      colorBehavior: {
        primary: colorUsage(colorBehavior.primary),
        secondary: colorUsage(colorBehavior.secondary),
        accent: colorUsage(colorBehavior.accent),
        forbidden: strings(colorBehavior.forbidden),
      },
      materialBehavior: materials(renderLanguage.materialBehavior),
      lightingBehavior: lighting(renderLanguage.lightingBehavior),
      graphicBehavior: strings(renderLanguage.graphicBehavior),
    },
    negativeRules: {
      project: strings(negativeRules.project),
      model: strings(negativeRules.model),
    },
    confidence: {
      projectFacts: score(confidence.projectFacts),
      lockedAssets: score(confidence.lockedAssets),
      sourceVisualState: score(confidence.sourceVisualState),
      upgradeTranslation: score(confidence.upgradeTranslation),
    },
  };
}

export function validatePromptSourceExtraction(
  value: PromptSourceExtraction,
): PromptSourceExtraction {
  const issues: string[] = [];
  if (!value.projectFacts.brandName) issues.push('projectFacts.brandName is required');
  if (!value.projectFacts.industry) issues.push('projectFacts.industry is required');
  if (!value.sourceVisualState.valuableAssets.length) {
    issues.push('sourceVisualState.valuableAssets requires visual evidence');
  }
  if (!value.upgradeTranslation.targetWorldview.length) {
    issues.push('upgradeTranslation.targetWorldview is required');
  }
  if (!value.upgradeTranslation.toneBoundaries.length) {
    issues.push('upgradeTranslation.toneBoundaries is required');
  }
  if (!value.upgradeTranslation.transformations.length) {
    issues.push('upgradeTranslation.transformations is required');
  }
  if (![
    ...value.renderLanguage.colorBehavior.primary,
    ...value.renderLanguage.colorBehavior.secondary,
    ...value.renderLanguage.colorBehavior.accent,
  ].length) issues.push('renderLanguage.colorBehavior requires at least one color usage');
  if (!value.renderLanguage.materialBehavior.length) {
    issues.push('renderLanguage.materialBehavior is required');
  }
  if (!value.renderLanguage.lightingBehavior.source.length) {
    issues.push('renderLanguage.lightingBehavior.source is required');
  }
  if (issues.length) {
    throw Object.assign(new Error(`Prompt Source extraction invalid: ${issues.join('; ')}`), {
      code: 'PROMPT_SOURCE_EXTRACTION_INVALID',
      issues,
    });
  }
  return value;
}
