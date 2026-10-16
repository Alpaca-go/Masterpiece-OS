const SEEDREAM_SHORT_CHAIN_ADAPTER_ID = "seedream-5.0-pro";
const SEEDREAM_SHORT_CHAIN_ADAPTER_VERSION = "seedream-short-chain-adapter@1.1.0";
const SEEDREAM_MAX_PROMPT_CHARACTERS = 12e3;
const SEEDREAM_REFERENCE_CAPABILITY = Object.freeze({
  maxReferenceImages: 2,
  referenceStrengthControl: Object.freeze({
    supported: false,
    controlParameter: null,
    note: "Seedream 5.0 Pro ref_strength / equivalent weight parameter has not been verified end to end at integration time. Path A capability is reported unsupported; Reference Boundary (B-3) will fall back to the text block alone, and Paths B / C remain available if the image still dominates the prompt."
  }),
  referenceRoleControl: Object.freeze({
    supported: false,
    controlParameter: null,
    note: "Seedream 5.0 Pro ref_mode / equivalent role parameter has not been verified end to end at integration time. Same fallback as referenceStrengthControl."
  })
});
const SEEDREAM_PROMPT_CAPABILITY = Object.freeze({
  maxCharacters: SEEDREAM_MAX_PROMPT_CHARACTERS
});
const SEEDREAM_ADAPTER_CAPABILITY = Object.freeze({
  adapterId: SEEDREAM_SHORT_CHAIN_ADAPTER_ID,
  adapterVersion: SEEDREAM_SHORT_CHAIN_ADAPTER_VERSION,
  prompt: SEEDREAM_PROMPT_CAPABILITY,
  reference: SEEDREAM_REFERENCE_CAPABILITY
});
import { renderReferenceBoundary, resolveProviderStrengthControlLabel } from "../space/reference-boundary.js";
function createSeedreamShortChainAdapter(options = {}) {
  const model = options.model || "doubao-seedream-5-0-pro-260628";
  return Object.freeze({
    id: SEEDREAM_SHORT_CHAIN_ADAPTER_ID,
    version: SEEDREAM_SHORT_CHAIN_ADAPTER_VERSION,
    model,
    capability: SEEDREAM_ADAPTER_CAPABILITY,
    orderSections(sections) {
      return sections;
    },
    compile(compiledPrompt) {
      const compiledText = String(compiledPrompt.editablePrompt || compiledPrompt.finalPrompt).trim();
      if (!compiledText) throw new Error("Seedream prompt cannot be empty");
      const taskContract = compiledPrompt.taskContract ?? {};
      const generationBasis = taskContract.generationBasis ?? "standard";
      const referenceSceneRelation = taskContract.referenceSceneRelation ?? "unknown";
      const targetSceneLabel = taskContract.subtype ?? "";
      const boundary = renderReferenceBoundary({
        generationBasis,
        referenceSceneRelation,
        targetSceneLabel,
        adapterCapability: SEEDREAM_ADAPTER_CAPABILITY
      });
      const prompt = boundary ? `${compiledText}

${boundary}` : compiledText;
      const promptCharacters = [...prompt].length;
      if (promptCharacters > SEEDREAM_MAX_PROMPT_CHARACTERS) {
        throw new Error(
          `Seedream prompt exceeds ${SEEDREAM_MAX_PROMPT_CHARACTERS} characters (${promptCharacters})`
        );
      }
      return {
        adapterId: SEEDREAM_SHORT_CHAIN_ADAPTER_ID,
        adapterVersion: SEEDREAM_SHORT_CHAIN_ADAPTER_VERSION,
        model,
        prompt,
        size: "2K",
        aspectRatio: taskContract.aspectRatio,
        count: taskContract.count,
        referenceAssetIds: [...taskContract.referenceAssetIds ?? []],
        referenceBoundary: {
          applied: Boolean(boundary),
          version: boundary ? "space-reference-boundary@1.0.0" : null,
          providerStrengthControl: resolveProviderStrengthControlLabel(SEEDREAM_ADAPTER_CAPABILITY),
          promptCharacters
        }
      };
    }
  });
}
export {
  SEEDREAM_ADAPTER_CAPABILITY,
  SEEDREAM_MAX_PROMPT_CHARACTERS,
  SEEDREAM_SHORT_CHAIN_ADAPTER_ID,
  SEEDREAM_SHORT_CHAIN_ADAPTER_VERSION,
  createSeedreamShortChainAdapter
};
