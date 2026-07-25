import type {
  GenerationOutputType,
  ProjectRecord,
  ProjectRuntimeContext,
  UserLockedAsset,
  UserRetainedCopy
} from '../../../shared/types.ts';

export function buildProjectRuntimeContext(input: {
  project: ProjectRecord;
  outputTasks: GenerationOutputType[];
  referenceAssetIds: string[];
  userLockedAssets?: UserLockedAsset[];
  userRetainedCopy?: UserRetainedCopy[];
  userConfirmedRealAssets?: string[];
  projectMetadata?: Record<string, unknown>;
}): ProjectRuntimeContext {
  return {
    projectId: input.project.id,
    brandName: input.project.brandName || input.project.detectedBrandName || undefined,
    industry: input.project.industry || input.project.detectedIndustry || undefined,
    productFacts: [...(input.project.lockedFacts || [])],
    userLockedAssets: input.userLockedAssets || [],
    userRetainedCopy: input.userRetainedCopy || [],
    userConfirmedRealAssets: input.userConfirmedRealAssets || [],
    outputTasks: [...new Set(input.outputTasks)],
    referenceAssetIds: [...new Set(input.referenceAssetIds)],
    projectMetadata: {
      ...(input.projectMetadata || {}),
      projectName: input.project.projectName,
      logoLocked: input.project.logoLocked
    }
  };
}
