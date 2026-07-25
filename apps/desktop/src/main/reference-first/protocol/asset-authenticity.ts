import type {
  AssetAuthenticity,
  AssetAuthenticityDecision,
  ProjectRuntimeContext
} from '../../../shared/types.ts';

const FACTUAL_AUTHENTICITY = new Set<AssetAuthenticity>([
  'brand_original',
  'user_confirmed_real',
  'user_confirmed_locked'
]);

export interface AssetAuthenticityInput {
  assetId: string;
  observedAuthenticity?: AssetAuthenticity;
  observedCapabilities?: Partial<Pick<
    AssetAuthenticityDecision,
    'canProveIdentity' | 'canProveProductFact' | 'canProveStructure' | 'canProveLockedAsset'
  >>;
  confidence?: number;
  reason?: string;
}

function bounded(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value!)) : fallback;
}

export function resolveAssetAuthenticity(
  input: AssetAuthenticityInput,
  runtime: ProjectRuntimeContext
): AssetAuthenticityDecision {
  const locked = runtime.userLockedAssets.some((item) => item.assetId === input.assetId);
  const confirmedReal = runtime.userConfirmedRealAssets.includes(input.assetId);
  const authenticity: AssetAuthenticity = locked
    ? 'user_confirmed_locked'
    : confirmedReal
      ? 'user_confirmed_real'
      : input.observedAuthenticity || 'unknown';
  const factual = FACTUAL_AUTHENTICITY.has(authenticity);
  const capability = input.observedCapabilities || {};
  const confidence = bounded(input.confidence, locked || confirmedReal ? 1 : 0.5);

  return {
    assetId: input.assetId,
    authenticity,
    confidence,
    reason: input.reason
      || (locked ? '用户已锁定该资产' : confirmedReal ? '用户已确认该资产真实' : '依据当前资产观察结果'),
    canProveIdentity: factual && capability.canProveIdentity === true,
    canProveProductFact: factual && capability.canProveProductFact === true,
    canProveStructure: factual && capability.canProveStructure === true,
    canProveLockedAsset: locked && capability.canProveLockedAsset !== false,
    includeInAnalysisEvidencePack: true,
    includeInGenerationIdentityPack: factual && (
      capability.canProveIdentity === true
      || capability.canProveProductFact === true
      || capability.canProveStructure === true
      || locked
    ),
    requiresHumanReview: authenticity === 'unknown' || confidence < 0.8
  };
}

export function canUseAsFactEvidence(decision: AssetAuthenticityDecision): boolean {
  return FACTUAL_AUTHENTICITY.has(decision.authenticity);
}

export function validateAuthenticityDecisions(
  decisions: AssetAuthenticityDecision[]
): string[] {
  const errors: string[] = [];
  for (const decision of decisions) {
    if (!canUseAsFactEvidence(decision) && decision.includeInGenerationIdentityPack) {
      errors.push(`UNVERIFIED_ASSET_ENTERED_GENERATION_PACK:${decision.assetId}`);
    }
    if (!canUseAsFactEvidence(decision) && decision.canProveStructure) {
      errors.push(`UNVERIFIED_ASSET_USED_AS_STRUCTURE_EVIDENCE:${decision.assetId}`);
    }
  }
  return errors;
}
