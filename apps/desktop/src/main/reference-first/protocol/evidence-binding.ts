import type {
  EvidenceBoundFact,
  FactEvidenceSource
} from '../../../shared/types.ts';

export function resolveFactStatus(
  sources: FactEvidenceSource[]
): EvidenceBoundFact['status'] {
  if (sources.some((source) => [
    'user_input',
    'project_metadata',
    'locked_config',
    'human_confirmation'
  ].includes(source.type))) {
    return 'confirmed';
  }
  if (sources.some((source) => source.type === 'visual_asset')) return 'confirmed';
  return 'unverified';
}

export function bindFact(input: {
  id: string;
  key: string;
  value: string;
  classification: NonNullable<EvidenceBoundFact['classification']>;
  sources: FactEvidenceSource[];
  entersGenerationIdentityPack?: boolean;
  influencesGenerationStyle?: boolean;
}): EvidenceBoundFact {
  const sources = input.sources.filter((source) => source.value.trim().length > 0);
  const sourceAssetIds = [...new Set(
    sources
      .filter((source) => source.type === 'visual_asset' && source.sourceId)
      .map((source) => source.sourceId!)
  )];
  const confidence = sources.length
    ? Math.max(...sources.map((source) => Math.max(0, Math.min(1, source.confidence))))
    : 0;
  return {
    id: input.id,
    key: input.key,
    value: input.value,
    sourceAssetIds,
    evidenceAssetIds: sourceAssetIds,
    sources,
    classification: input.classification,
    confidence,
    status: resolveFactStatus(sources),
    entersGenerationIdentityPack: Boolean(input.entersGenerationIdentityPack),
    influencesGenerationStyle: Boolean(input.influencesGenerationStyle)
  };
}

export function detectBroadcastEvidence(
  facts: EvidenceBoundFact[],
  allProjectAssetIds: string[]
): string[] {
  if (allProjectAssetIds.length < 2) return [];
  const completeSet = new Set(allProjectAssetIds);
  return facts
    .filter((fact) => {
      const bound = new Set(fact.evidenceAssetIds || fact.sourceAssetIds);
      return bound.size === completeSet.size && [...completeSet].every((id) => bound.has(id));
    })
    .map((fact) => fact.id || fact.key || fact.value);
}
