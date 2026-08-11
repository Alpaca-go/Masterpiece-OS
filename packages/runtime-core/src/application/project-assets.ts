import type { ProjectAsset } from '../shared/types.ts';

export function isAnalysisSourceAsset(asset: ProjectAsset): boolean {
  return asset.usage !== 'generation_reference';
}
