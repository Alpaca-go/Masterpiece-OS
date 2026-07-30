export const SEEDREAM_VNEXT_ADAPTER_ID = 'seedream-5.0-pro';
export const SEEDREAM_VNEXT_ADAPTER_VERSION = '1.0.0';
const MAX_PROMPT_CHARACTERS = 7_500;

export function createSeedreamVNextAdapter(options = {}) {
  const model = options.model || 'doubao-seedream-5-0-pro-260628';
  return Object.freeze({
    id: SEEDREAM_VNEXT_ADAPTER_ID,
    version: SEEDREAM_VNEXT_ADAPTER_VERSION,
    model,
    orderSections(sections) {
      return sections;
    },
    compile(compiledPrompt) {
      const prompt = String(compiledPrompt.editablePrompt || compiledPrompt.finalPrompt).trim();
      if (!prompt) throw new Error('Seedream prompt cannot be empty');
      const promptCharacters = [...prompt].length;
      if (promptCharacters > MAX_PROMPT_CHARACTERS) {
        throw new Error(
          `Seedream prompt exceeds ${MAX_PROMPT_CHARACTERS} characters (${promptCharacters})`,
        );
      }
      return {
        adapterId: SEEDREAM_VNEXT_ADAPTER_ID,
        adapterVersion: SEEDREAM_VNEXT_ADAPTER_VERSION,
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

