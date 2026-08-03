import crypto from 'node:crypto';
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
  const requestedReferenceIds = Array.isArray(input.task?.referenceAssetIds)
    ? input.task.referenceAssetIds
    : [];
  const selectedLogoAssetId = logoAssetIds.find((assetId) => requestedReferenceIds.includes(assetId));
  const inferredLogoUsageMode = selectedLogoAssetId ? 'reference' : 'blank_area';
  const logoUsageMode = input.task?.logoUsageMode === 'post_composite'
    ? 'post_composite'
    : inferredLogoUsageMode;
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
