export function createImageGenerationOperations({ service, shortChainService }) {
  const operations = {
    'image-generation:get-capabilities': () => service.getCapabilities(),
    'image-generation:get-preset-capabilities': () => service.getPresetCapabilities(),
    'image-generation:get-source-preview': (_context, input) => service.getSourcePreview(input),
    'image-generation:compile': async (_context, input) => (await service.compile(input)).result,
    'image-generation:start': (_context, input) => service.start(input),
    'image-generation:get-run': (_context, runId) => service.getRun(runId),
    'image-generation:list-runs': (_context, projectId) => service.listRuns(projectId),
    'image-generation:cancel': (_context, runId) => service.cancel(runId),
    'image-generation:retry': (_context, input) => service.retry({
      runId: input.runId,
      mode: input.mode,
      editedPrompt: input.editedPrompt,
      apiProfileId: input.apiProfileId,
    }),
    'image-generation:save-review': (_context, review) => service.saveReview(review),
    'image-generation:get-image-data-url': (_context, runId, imageId) => service.readImageDataUrl(runId, imageId),
  };
  if (shortChainService) {
    const shortChainOperations = {
      'image-generation:short-chain-options': () => shortChainService.listOptions(),
      'image-generation:short-chain-compile': (_context, input) => shortChainService.compile(input),
      'image-generation:short-chain-start': (_context, input) => shortChainService.start(input),
      'image-generation:short-chain-start-validated': (_context, input) => shortChainService.startValidated(input),
      'image-generation:short-chain-session': (_context, projectId) => shortChainService.getSession(projectId),
      'image-generation:short-chain-confirm-direction': (_context, projectId, runId, imageId) => shortChainService.confirmDirection(projectId, runId, imageId),
      'image-generation:short-chain-confirm-generated-output': (_context, projectId, runId, imageId) => shortChainService.confirmGeneratedOutput(projectId, runId, imageId),
      'image-generation:short-chain-revoke-generated-output': (_context, projectId, assetId) => shortChainService.revokeGeneratedOutput(projectId, assetId),
      'image-generation:short-chain-confirmed-generated-outputs': (_context, projectId) => shortChainService.getConfirmedGeneratedOutputs(projectId),
      'image-generation:short-chain-continue-same-type': (_context, projectId, instruction, apiProfileId, dryRun) => shortChainService.continueSameType(projectId, instruction, apiProfileId, dryRun),
      'image-generation:short-chain-save-prompt-asset': (_context, input) => shortChainService.saveProjectPromptAsset(input),
      'image-generation:short-chain-post-composite-logo': (_context, input) => shortChainService.postCompositeLogo(input),
    };
    Object.assign(operations, shortChainOperations);

    if (shortChainService.preflightReferenceAssets) {
      operations['image-generation:preflight-reference-assets'] = (_context, input) => shortChainService.preflightReferenceAssets(input);
    }
  }
  return Object.freeze(operations);
}
