export function createImageGenerationOperations({ service, vnextService }) {
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
  if (vnextService) {
    Object.assign(operations, {
      'image-generation:vnext-options': () => vnextService.listOptions(),
      'image-generation:vnext-compile': (_context, input) => vnextService.compile(input),
      'image-generation:vnext-start': (_context, input) => vnextService.start(input),
      'image-generation:vnext-start-validated': (_context, input) => vnextService.startValidated(input),
      'image-generation:vnext-session': (_context, projectId) => vnextService.getSession(projectId),
      'image-generation:vnext-confirm-direction': (_context, projectId, runId, imageId) => vnextService.confirmDirection(projectId, runId, imageId),
      'image-generation:vnext-confirm-generated-output': (_context, projectId, runId, imageId) => vnextService.confirmGeneratedOutput(projectId, runId, imageId),
      'image-generation:vnext-revoke-generated-output': (_context, projectId, assetId) => vnextService.revokeGeneratedOutput(projectId, assetId),
      'image-generation:vnext-confirmed-generated-outputs': (_context, projectId) => vnextService.getConfirmedGeneratedOutputs(projectId),
      'image-generation:vnext-continue-same-type': (_context, projectId, instruction, apiProfileId, dryRun) => vnextService.continueSameType(projectId, instruction, apiProfileId, dryRun),
      'image-generation:vnext-save-prompt-asset': (_context, input) => vnextService.saveProjectPromptAsset(input),
      'image-generation:vnext-post-composite-logo': (_context, input) => vnextService.postCompositeLogo(input),
    });
    if (vnextService.preflightReferenceAssets) {
      operations['image-generation:preflight-reference-assets'] = (_context, input) => vnextService.preflightReferenceAssets(input);
    }
  }
  return Object.freeze(operations);
}
