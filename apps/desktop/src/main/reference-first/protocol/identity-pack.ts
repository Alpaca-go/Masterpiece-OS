import type {
  AnalysisEvidencePack,
  AssetAuthenticityDecision,
  BrandCopyRecord,
  CurrentProjectAssetDecision,
  DerivedIdentityAsset,
  EvidenceBoundFact,
  GenerationIdentityAsset,
  GenerationIdentityPack,
  GenerationIdentityUsage,
  IdentityPackGranularityValidation,
  ProjectRuntimeContext,
  StructurePolicy
} from '../../../shared/types.ts';

function rolesOf(decision: CurrentProjectAssetDecision): string[] {
  return [...new Set([decision.role, ...(decision.roles || [])])];
}

export function buildAnalysisEvidencePack(
  decisions: CurrentProjectAssetDecision[],
  authenticity: AssetAuthenticityDecision[]
): AnalysisEvidencePack {
  const byId = new Map(authenticity.map((item) => [item.assetId, item]));
  const included = decisions.filter((item) => byId.get(item.assetId)?.includeInAnalysisEvidencePack !== false);
  const roles = included.flatMap(rolesOf);
  return {
    assetIds: included.map((item) => item.assetId),
    evidenceCoverage: {
      identity: roles.some((role) => ['brand_identity_evidence', 'logo_evidence', 'logo_typography_evidence'].includes(role)),
      productOrService: roles.some((role) => ['product_fact_evidence', 'service_fact_evidence'].includes(role)),
      structure: roles.includes('confirmed_structure_evidence'),
      lockedAssets: roles.includes('locked_asset_evidence'),
      copy: roles.includes('observed_copy')
    },
    uncertainAssetIds: included
      .filter((item) => item.requiresHumanReview || byId.get(item.assetId)?.requiresHumanReview)
      .map((item) => item.assetId)
  };
}

export function buildGenerationIdentityPack(input: {
  runtime: ProjectRuntimeContext;
  assetDecisions: CurrentProjectAssetDecision[];
  authenticityDecisions: AssetAuthenticityDecision[];
  facts: EvidenceBoundFact[];
  copy: BrandCopyRecord[];
  structurePolicy: StructurePolicy;
  /** §9.3 完整视觉方案页资产 id，默认不得进入 Identity Pack（除非用户显式锁定）。 */
  fullPageAssetIds?: string[];
}): GenerationIdentityPack {
  const authenticity = new Map(input.authenticityDecisions.map((item) => [item.assetId, item]));
  const fullPages = new Set(input.fullPageAssetIds || []);
  const lockedAssetIds = new Set(input.runtime.userLockedAssets.map((item) => item.assetId));
  const assets: GenerationIdentityAsset[] = [];
  for (const decision of input.assetDecisions) {
    const proof = authenticity.get(decision.assetId);
    if (!proof?.includeInGenerationIdentityPack) continue;
    // §9.3 完整视觉方案页默认排除；仅当用户显式锁定整页时才保留。
    if (fullPages.has(decision.assetId) && !lockedAssetIds.has(decision.assetId)) continue;
    const roles = rolesOf(decision);
    const usage: GenerationIdentityUsage = roles.includes('locked_asset_evidence')
      ? 'user_locked_asset'
      : roles.includes('confirmed_structure_evidence')
        ? 'confirmed_structure'
        : roles.includes('logo_typography_evidence')
          ? 'logo_wordmark'
          : roles.includes('logo_evidence')
            ? 'logo_graphic'
            : roles.some((role) => ['product_fact_evidence', 'service_fact_evidence'].includes(role))
              ? 'product_or_service_fact'
              : 'brand_name';
    assets.push({
      assetId: decision.assetId,
      usage,
      reason: decision.keepReason,
      containsLegacyStyle: Boolean(roles.includes('legacy_visual_only') || roles.includes('legacy_visual_style_only')),
      confidence: proof.confidence
    });
  }
  const byUsage = (usage: GenerationIdentityUsage) => assets.filter((item) => item.usage === usage);
  const derived: DerivedIdentityAsset[] = assets
    .filter((asset) => ['logo_graphic', 'logo_wordmark', 'brand_name'].includes(asset.usage))
    .map((asset, index) => ({
      id: `derived-${asset.assetId}-${index}`,
      sourceAssetId: asset.assetId,
      usage: asset.usage,
      containsLegacyStyle: Boolean(asset.containsLegacyStyle),
      confidence: asset.confidence ?? 0
    }));
  return {
    identityFacts: input.facts.filter((fact) =>
      fact.classification === 'identity_fact' && fact.status === 'confirmed'
    ),
    productOrServiceFacts: input.facts.filter((fact) =>
      ['product_or_service_fact', 'product_fact'].includes(fact.classification || '')
      && fact.status === 'confirmed'
    ),
    logoAssets: byUsage('logo_graphic'),
    logoTypographyAssets: byUsage('logo_wordmark'),
    confirmedStructureAssets: byUsage('confirmed_structure'),
    lockedAssets: input.runtime.userLockedAssets.map((item) => ({ ...item })),
    retainedCopy: input.copy.filter((item) =>
      (item.status === 'user_retained' || item.status === 'locked') && item.useInGeneration
    ),
    structurePolicy: input.structurePolicy,
    assets,
    derivedAssets: derived
  };
}

/**
 * §9.4 Identity Pack 粒度校验。
 * locked_asset 不得成为兜底角色；整页旧视觉不得进入；资产不得含旧视觉污染。
 */
export function validateIdentityPackGranularity(pack: GenerationIdentityPack): IdentityPackGranularityValidation {
  const derivedIds = new Set((pack.derivedAssets || []).map((item) => item.sourceAssetId));
  const fullPageAssetIds = pack.assets
    .filter((item) =>
      item.usage === 'user_locked_asset'
      && item.containsLegacyStyle
      && !derivedIds.has(item.assetId)
    )
    .map((item) => item.assetId);
  const broadLockedAssetIds = pack.assets
    .filter((item) =>
      item.usage === 'user_locked_asset'
      && /整页|整张|整体|全部视觉|完整方案|full[_ ]?page|whole[_ ]?page/iu.test(item.reason || '')
    )
    .map((item) => item.assetId);
  const legacyStyleContaminatedAssetIds = pack.assets
    .filter((item) => item.containsLegacyStyle && item.usage !== 'user_locked_asset')
    .map((item) => item.assetId);
  const missingRequiredIdentityUsages: string[] = [];
  if (pack.assets.length === 0) missingRequiredIdentityUsages.push('identity');
  return {
    fullPageAssetIds,
    broadLockedAssetIds,
    legacyStyleContaminatedAssetIds,
    missingRequiredIdentityUsages,
    passed: fullPageAssetIds.length === 0
      && broadLockedAssetIds.length === 0
      && legacyStyleContaminatedAssetIds.length === 0
      && missingRequiredIdentityUsages.length === 0
  };
}
