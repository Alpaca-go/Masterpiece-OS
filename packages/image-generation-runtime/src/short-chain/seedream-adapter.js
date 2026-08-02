export const SEEDREAM_SHORT_CHAIN_ADAPTER_ID = 'seedream-5.0-pro';
export const SEEDREAM_SHORT_CHAIN_ADAPTER_VERSION = '1.0.0';
export const SEEDREAM_SHORT_CHAIN_MAX_PROMPT_CHARACTERS = 7_500;

export function createSeedreamShortChainAdapter(options = {}) {
  const model = options.model || 'doubao-seedream-5-0-pro-260628';
  return Object.freeze({
    id: SEEDREAM_SHORT_CHAIN_ADAPTER_ID,
    version: SEEDREAM_SHORT_CHAIN_ADAPTER_VERSION,
    model,
    maxPromptCharacters: SEEDREAM_SHORT_CHAIN_MAX_PROMPT_CHARACTERS,
    orderSections(sections) {
      return sections;
    },
    compile(compiledPrompt) {
      const prompt = String(compiledPrompt.editablePrompt || compiledPrompt.finalPrompt).trim();
      if (!prompt) throw new Error('Seedream prompt cannot be empty');
      const promptCharacters = [...prompt].length;
      if (promptCharacters > SEEDREAM_SHORT_CHAIN_MAX_PROMPT_CHARACTERS) {
        throw new Error(
          `Seedream prompt exceeds ${SEEDREAM_SHORT_CHAIN_MAX_PROMPT_CHARACTERS} characters (${promptCharacters})`,
        );
      }
      return {
        adapterId: SEEDREAM_SHORT_CHAIN_ADAPTER_ID,
        adapterVersion: SEEDREAM_SHORT_CHAIN_ADAPTER_VERSION,
        model,
        prompt,
        size: '2K',
        aspectRatio: compiledPrompt.taskContract.aspectRatio,
        count: compiledPrompt.taskContract.count,
        referenceAssetIds: [...compiledPrompt.referenceAssetIds],
      };
    },
  });
}

