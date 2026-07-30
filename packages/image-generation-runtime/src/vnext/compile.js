import { createVNextTaskContract } from './task-contract.js';
import { routeVNextTemplates } from './template-router.js';
import { compileVNextPrompt } from './prompt-compiler.js';
import { createSeedreamVNextAdapter } from './seedream-adapter.js';
import { assertPromptPreflight, runPromptPreflightGate } from '../gates/prompt-preflight-gate.js';

export function compileVNextImageGeneration(input) {
  const started = performance.now();
  const adapter = input.adapter || createSeedreamVNextAdapter({ model: input.model });
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
  const inferredLogoUsageMode = packetLogoAssetIds.length
    ? 'reference'
    : input.projectContext?.promptSourceObject?.lockedAssets?.logoUsageMode
      || (preferredLogoAssetId ? 'reference' : 'blank_area');
  const logoUsageMode = input.task?.logoUsageMode || inferredLogoUsageMode;
  const requestedReferenceIds = Array.isArray(input.task?.referenceAssetIds)
    ? input.task.referenceAssetIds
    : [];
  const referenceAssetIds = logoUsageMode === 'reference' && preferredLogoAssetId
    ? [...new Set([preferredLogoAssetId, ...requestedReferenceIds])]
    : requestedReferenceIds.filter((assetId) => !logoAssetIds.includes(assetId));
  const taskContract = createVNextTaskContract({
    ...input.task,
    logoUsageMode,
    referenceAssetIds,
  }, { now: input.now });
  const route = routeVNextTemplates(taskContract, { model: adapter.id });
  const compiledPrompt = compileVNextPrompt({
    projectContext: input.projectContext,
    taskContract,
    route,
    adapter,
    projectPromptAsset: input.projectPromptAsset,
  });
  if (compiledPrompt.projectGenerationContract) {
    compiledPrompt.preflightReport = assertPromptPreflight(runPromptPreflightGate({
      finalPrompt: compiledPrompt.finalPrompt,
      taskContract,
      projectContract: compiledPrompt.projectGenerationContract,
      packagingTranslation: compiledPrompt.packagingTranslation,
    }));
  }
  const payload = adapter.compile(compiledPrompt);
  compiledPrompt.trace.promptCharacters = [...compiledPrompt.finalPrompt].length;
  compiledPrompt.trace.compileDurationMs = Number((performance.now() - started).toFixed(3));
  return { taskContract, route, compiledPrompt, payload };
}
