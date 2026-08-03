import crypto from 'node:crypto';
import { createShortChainTaskContract } from './task-contract.js';
import { routeShortChainTemplates } from './template-router.js';
import { compileShortChainPrompt } from './prompt-compiler.js';
import { createSeedreamShortChainAdapter } from './seedream-adapter.js';
import { runPromptPreflightGate } from '../gates/prompt-preflight-gate.js';
import { planLockedAssetPlacements } from './locked-asset-placement-planner.js';

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
  const requestedReferenceIds = Array.isArray(input.task?.referenceAssetIds)
    ? input.task.referenceAssetIds
    : [];
  const selectedLogoAssetIds = logoAssetIds.filter((assetId) => requestedReferenceIds.includes(assetId));
  const selectedLogoAssetId = selectedLogoAssetIds[0];
  const legacyLogoUsageMode = input.task?.logoUsageMode;
  const brandMarkRenderMode = input.task?.brandMarkRenderMode
    || input.projectContext?.promptSourceObject?.lockedAssets?.brandMarkRenderMode
    || (legacyLogoUsageMode === 'blank_area' ? 'no_logo_preview' : 'locked_asset_render');
  const materialMode = input.task?.materialMode
    || input.projectContext?.promptSourceObject?.lockedAssets?.materialMode
    || 'auto';
  const brandIntensity = input.task?.brandIntensity
    || input.projectContext?.promptSourceObject?.lockedAssets?.brandIntensity
    || 'balanced';
  const logoUsageMode = brandMarkRenderMode === 'no_logo_preview'
    ? 'blank_area'
    : selectedLogoAssetId ? 'reference' : 'blank_area';
  const referenceAssetIds = logoUsageMode === 'reference'
    ? [...new Set(requestedReferenceIds)]
    : requestedReferenceIds.filter((assetId) => !logoAssetIds.includes(assetId));
  if (logoUsageMode === 'reference' && !referenceAssetIds.some((assetId) => logoAssetIds.includes(assetId))) {
    throw Object.assign(new Error(
      'Logo reference mode requires the confirmed Logo to be selected.',
    ), { code: 'SHORT_CHAIN_LOGO_REFERENCE_MISSING' });
  }
  const taskContract = createShortChainTaskContract({
    ...input.task,
    brandMarkRenderMode,
    materialMode,
    brandIntensity,
    logoUsageMode,
    referenceAssetIds,
  }, { now: input.now });
  const route = routeShortChainTemplates(taskContract, { model: adapter.id });
  const selectedAssets = referenceAssetIds.map((assetId) => {
    const asset = input.projectContext?.sourceAssetRefs?.find((item) => item.assetId === assetId);
    return {
      assetId,
      type: logoAssetIds.includes(assetId)
        ? 'logo'
        : asset?.lockedAssetType
          || (asset?.role === 'identity' ? 'ip_character'
            : asset?.role === 'product' || asset?.role === 'package_structure' ? 'packaging_front'
              : 'other'),
    };
  });
  const lockedAssetPlacementPlan = planLockedAssetPlacements({
    taskContract,
    selectedAssets,
  });
  const compiledPrompt = compileShortChainPrompt({
    projectContext: input.projectContext,
    taskContract,
    route,
    adapter,
    projectPromptAsset: input.projectPromptAsset,
    approvedCreativeDecision: input.approvedCreativeDecision,
    userConfirmedVisualDecision: input.userConfirmedVisualDecision,
    lockedAssetPlacementPlan,
  });
  compiledPrompt.preflightReport = runPromptPreflightGate({
    finalPrompt: compiledPrompt.finalPrompt,
    taskContract,
    projectContract: compiledPrompt.projectGenerationContract,
    packagingTranslation: compiledPrompt.packagingTranslation,
    spatialTranslation: compiledPrompt.spatialTranslation,
    requireProjectContract: Boolean(input.projectContext?.visualDecisionPacket),
    maxPromptCharacters: adapter.maxPromptCharacters,
  });
  const payload = adapter.compile(compiledPrompt);
  compiledPrompt.trace.promptCharacters = [...compiledPrompt.finalPrompt].length;
  compiledPrompt.trace.maxPromptCharacters = adapter.maxPromptCharacters;
  compiledPrompt.trace.compileDurationMs = Number((performance.now() - started).toFixed(3));
  return { taskContract, route, compiledPrompt, payload };
}

export function validateShortChainEffectivePrompt({ compiledPrompt, effectivePrompt }) {
  const prompt = String(effectivePrompt ?? '').trim();
  const report = runPromptPreflightGate({
    finalPrompt: prompt,
    taskContract: compiledPrompt.taskContract,
    projectContract: compiledPrompt.projectGenerationContract,
    packagingTranslation: compiledPrompt.packagingTranslation,
    spatialTranslation: compiledPrompt.spatialTranslation,
    requireProjectContract: Boolean(compiledPrompt.effectiveVisualDecisionPacket),
    maxPromptCharacters: compiledPrompt.trace?.maxPromptCharacters,
  });
  return {
    prompt,
    promptFingerprint: crypto.createHash('sha256').update(prompt).digest('hex'),
    promptCharacters: [...prompt].length,
    report,
  };
}
