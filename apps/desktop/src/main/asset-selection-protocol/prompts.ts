import type { ProjectAsset, ProjectRecord } from '../../shared/types.ts';
import {
  ASSET_AUTHENTICITIES,
  CURRENT_PROJECT_ASSET_ROLES,
  GENERATION_OUTPUT_TYPES,
  GENERATION_USAGES,
  REFERENCE_ASSET_ROLES,
  STYLE_CARRIER_CATEGORIES
} from '../model-schema/schema-values.ts';

const JSON_ONLY = `
只返回合法 JSON，不要 Markdown、代码围栏或解释。必须为每个 assetId 返回且仅返回一条决定，不得遗漏、合并或虚构资产。
confidence 使用 0 到 1。低于 0.8 时 requiresHumanReview 必须为 true。`;

function manifest(assets: ProjectAsset[]) {
  return assets.map((asset) => ({
    assetId: asset.id,
    filename: asset.originalName,
    mimeType: asset.mimeType,
    sha256: asset.sha256
  }));
}

export function buildCurrentProjectAssetSelectionPrompt(
  project: ProjectRecord,
  assets: ProjectAsset[]
): string {
  return `你正在执行通用的 Current Project Asset Authenticity Selector。
协议层只定义通用判断机制；项目事实只能来自下方运行时上下文、当前资产的视觉证据或用户确认。
分析证据包用于理解事实和观察旧视觉。生图身份包只允许进入可证明身份、产品或服务事实、已确认结构、Locked Asset 的真实资产。
未确认样机、第三方样机、概念方案、参考素材和未知资产不得证明真实结构，不得进入生图身份包。
旧视觉默认仅供观察，不能影响新输出。观察到的文案默认不保留，除非运行时上下文明确确认。

Project Runtime Context：
${JSON.stringify({
    projectId: project.id,
    brandName: project.brandName || project.detectedBrandName,
    industry: project.industry || project.detectedIndustry,
    userLockedAssets: [
      ...(project.logoLocked ? project.logoFiles || [] : []),
      ...(project.lockedFacts || [])
    ],
    projectMetadata: {
      description: project.description
    }
  }, null, 2)}

资产清单：
${JSON.stringify(manifest(assets), null, 2)}

输出：
{"decisions":[{
  "assetId":"清单中的 ID",
  "filename":"清单中的文件名",
  "role":"${CURRENT_PROJECT_ASSET_ROLES.join(' | ')}",
  "roles":["允许同一资产具有多个上述角色"],
  "authenticity":"${ASSET_AUTHENTICITIES.join(' | ')}",
  "keepInCorePack":true,
  "includeInAnalysisEvidencePack":true,
  "includeInGenerationIdentityPack":false,
  "canProveIdentity":false,
  "canProveProductFact":false,
  "canProveStructure":false,
  "canInfluenceGenerationStyle":false,
  "generationUsage":"${GENERATION_USAGES.join(' | ')}",
  "keepReason":"基于可观察内容与运行时事实的理由",
  "extractedFacts":["只写明确事实"],
  "lockedEvidence":["只写用户明确锁定的内容"],
  "containsLegacyStyle":false,
  "legacyStyleShouldInfluenceOutput":false,
  "confidence":0.0,
  "requiresHumanReview":false
}]}

角色必须根据图像内容与运行时上下文判断，不得根据项目名称或行业猜测。
irrelevant 不得进入任一包。legacy_visual_only 可以进入分析包，但不得进入生图身份包。
legacyStyleShouldInfluenceOutput 永远为 false。
${JSON_ONLY}`;
}

export function buildReferenceAssetSelectionPrompt(assets: ProjectAsset[]): string {
  return `你正在执行通用 Reference Master Set Selector。
参考资产只提供视觉形式证据，不得向当前项目泄漏参考身份、文案和专属图形。
每个资产可有一个主角色和多个次角色；任务适配必须根据视觉内容、角色、可用输出类型和 Style Carrier 覆盖判断。
Style Carrier 必须写成具体、可读、可执行的视觉规则，不得返回类别占位语。

资产清单：
${JSON.stringify(manifest(assets), null, 2)}

输出：
{"decisions":[{
  "assetId":"清单中的 ID",
  "filename":"清单中的文件名",
  "role":"${REFERENCE_ASSET_ROLES.join(' | ')}",
  "primaryRole":"与 role 相同的主角色",
  "secondaryRoles":["图中明确存在的其他角色"],
  "styleCarrierStrength":"high | medium | low",
  "includeInMasterSet":true,
  "eligibleOutputTypes":["只能从 ${GENERATION_OUTPUT_TYPES.join(' | ')} 中选择"],
  "representedStyleCarriers":["${STYLE_CARRIER_CATEGORIES.join(' | ')}"],
  "styleCarrierRules":[{"category":"layout","readableRule":"具体视觉规则","confidence":0.0}],
  "duplicationGroupId":"近重复组 ID，可省略",
  "confidence":0.0,
  "reason":"基于可观察内容的理由",
  "requiresHumanReview":false
}]}

duplicate、irrelevant、uncertain 必须 includeInMasterSet=false。
eligibleOutputTypes 的每一项都必须严格使用上述八个枚举值，不得自造 brand_guidelines、mockups、social_media、packaging_design 等近义任务名。
同一 duplicationGroupId 最多只能有一个资产进入母集。
${JSON_ONLY}`;
}
