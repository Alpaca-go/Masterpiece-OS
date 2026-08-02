import { createShortChainTaskContract } from './task-contract.js';
import { routeShortChainTemplates } from './template-router.js';
import { compileShortChainPrompt } from './prompt-compiler.js';
import { createSeedreamShortChainAdapter } from './seedream-adapter.js';
import { runPromptPreflightGate } from '../gates/prompt-preflight-gate.js';

export function compileShortChainImageGeneration(input) {
  const started = performance.now();
  const adapter = input.adapter || createSeedreamShortChainAdapter({ model: input.model });
  const packetLogoAssetIds = input.projectContext?.visualDecisionPacket?.lockedAssets
    ?.filter((item) => item?.type === 'logo')
    .map((item) => item.assetId)
    || [];
  const logoAssetIds = packetLogoAssetIds.length
    ? packetLogoAssetIds
    : input.projectContext?.promptSourceObject?.lockedAssets?.logoAssetIds
    || input.projectContext?.lockedAssets?.logoAssetIds
    || [];
  const preferredLogoAssetId = packetLogoAssetIds[0]
    || input.projectContext?.promptSourceObject?.lockedAssets?.preferredLogoAssetId
    || logoAssetIds[0]
    || null;
  const inferredLogoUsageMode = preferredLogoAssetId ? 'post_composite' : 'blank_area';
  const logoUsageMode = input.task?.logoUsageMode || inferredLogoUsageMode;
  if (preferredLogoAssetId && logoUsageMode !== 'post_composite') {
    throw Object.assign(new Error(
      'LOGO_POST_COMPOSITE_ROUTE_NOT_ENFORCED: confirmed Logo must use post-composite mode.',
    ), { code: 'LOGO_POST_COMPOSITE_ROUTE_NOT_ENFORCED' });
  }
  const requestedReferenceIds = Array.isArray(input.task?.referenceAssetIds)
    ? input.task.referenceAssetIds
    : [];
  const referenceAssetIds = logoUsageMode === 'reference' && preferredLogoAssetId
    ? [...new Set([preferredLogoAssetId, ...requestedReferenceIds])]
    : requestedReferenceIds.filter((assetId) => !logoAssetIds.includes(assetId));
  const taskContract = createShortChainTaskContract({
    ...input.task,
    logoUsageMode,
    referenceAssetIds,
  }, { now: input.now });
  const route = routeShortChainTemplates(taskContract, { model: adapter.id });
  const compiledPrompt = compileShortChainPrompt({
    projectContext: input.projectContext,
    taskContract,
    route,
    adapter,
    projectPromptAsset: input.projectPromptAsset,
    approvedCreativeDecision: input.approvedCreativeDecision,
    userConfirmedVisualDecision: input.userConfirmedVisualDecision,
  });
  compiledPrompt.preflightReport = runPromptPreflightGate({
    finalPrompt: compiledPrompt.finalPrompt,
    taskContract,
    projectContract: compiledPrompt.projectGenerationContract,
    packagingTranslation: compiledPrompt.packagingTranslation,
    spatialTranslation: compiledPrompt.spatialTranslation,
    requireProjectContract: Boolean(input.projectContext?.visualDecisionPacket),
  });
  const payload = adapter.compile(compiledPrompt);
  compiledPrompt.trace.promptCharacters = [...compiledPrompt.finalPrompt].length;
  compiledPrompt.trace.compileDurationMs = Number((performance.now() - started).toFixed(3));
  return { taskContract, route, compiledPrompt, payload };
}
