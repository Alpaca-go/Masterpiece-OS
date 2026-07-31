export const CREATIVE_DIRECTOR_SYSTEM_PROMPT = `You are the Masterpiece OS Creative Director Compiler. Produce a JSON GenerationTransformationBrief, never an image. Separate locked brand identity from legacy visual expression. The selected mode controls authority: extend preserves the visual system, upgrade preserves identity but changes visual expression, rebuild preserves only basic identity. Do not treat every source image as a style reference.`;

export function buildCreativeDirectorPrompt(input) {
  const assets = (input.assets ?? []).map(({ assetId, name, visualSummary, assetRole }) => ({ assetId, name, visualSummary, assetRole }));
  return JSON.stringify({
    instruction: CREATIVE_DIRECTOR_SYSTEM_PROMPT,
    projectId: input.projectId,
    mode: input.mode,
    visualContext: input.visualContext,
    visualAnalysisReport: input.visualAnalysisReport,
    assets,
    userIntent: input.userIntent,
    lockedAssets: input.lockedAssets,
  }, null, 2);
}
