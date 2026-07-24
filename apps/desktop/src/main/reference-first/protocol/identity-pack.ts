import type {
  AnalysisEvidencePack,
  AssetAuthenticityDecision,
  BrandCopyRecord,
  CurrentProjectAssetDecision,
  EvidenceBoundFact,
  GenerationIdentityAsset,
  GenerationIdentityPack,
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
}): GenerationIdentityPack {
  const authenticity = new Map(input.authenticityDecisions.map((item) => [item.assetId, item]));
  const assets: GenerationIdentityAsset[] = [];
  for (const decision of input.assetDecisions) {
    const proof = authenticity.get(decision.assetId);
    if (!proof?.includeInGenerationIdentityPack) continue;
    const roles = rolesOf(decision);
    const usage: GenerationIdentityAsset['usage'] = roles.includes('locked_asset_evidence')
      ? 'locked_asset'
      : roles.includes('confirmed_structure_evidence')
        ? 'structure_only'
        : roles.some((role) => ['product_fact_evidence', 'service_fact_evidence'].includes(role))
          ? 'product_or_service'
          : 'identity';
    assets.push({ assetId: decision.assetId, usage, reason: decision.keepReason });
  }
  const byUsage = (usage: GenerationIdentityAsset['usage']) => assets.filter((item) => item.usage === usage);
  return {
    identityFacts: input.facts.filter((fact) =>
      fact.classification === 'identity_fact' && fact.status === 'confirmed'
    ),
    productOrServiceFacts: input.facts.filter((fact) =>
      ['product_or_service_fact', 'product_fact'].includes(fact.classification || '')
      && fact.status === 'confirmed'
    ),
    logoAssets: assets.filter((asset) => input.assetDecisions.some((decision) =>
      decision.assetId === asset.assetId && rolesOf(decision).includes('logo_evidence')
    )),
    logoTypographyAssets: assets.filter((asset) => input.assetDecisions.some((decision) =>
      decision.assetId === asset.assetId && rolesOf(decision).includes('logo_typography_evidence')
    )),
    confirmedStructureAssets: byUsage('structure_only'),
    lockedAssets: input.runtime.userLockedAssets.map((item) => ({ ...item })),
    retainedCopy: input.copy.filter((item) =>
      (item.status === 'user_retained' || item.status === 'locked') && item.useInGeneration
    ),
    structurePolicy: input.structurePolicy,
    assets
  };
}
