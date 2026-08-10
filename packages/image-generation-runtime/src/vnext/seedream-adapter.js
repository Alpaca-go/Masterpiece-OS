export const SEEDREAM_SHORT_CHAIN_ADAPTER_ID = 'seedream-5.0-pro';
export const SEEDREAM_SHORT_CHAIN_ADAPTER_VERSION = 'seedream-short-chain-adapter@1.1.0';
// Phase 9B recovery: the golden Mode B space prompt runs ~9.5k chars (JZMX).
// The legacy 7500 cap rejected it at compile time. The real provider ceiling
// is enforced by the space-quality prompt budget (block > 12000); packaging
// and vnext_legacy prompts stay well under this. Keep the adapter as a
// last-resort guard aligned with the budget hard block.
const MAX_PROMPT_CHARACTERS = 12_000;

// r2.0 §4.10 / B-2: honest capability declaration. Until the adapter
// author verifies ref_strength / ref_mode on the live Seedream 5.0 Pro
// endpoint, both controls are reported unsupported. The Reference Boundary
// (B-3) reads this and MUST not pretend to apply strength control in
// Trace when supported=false. maxReferenceImages = 2 matches the current
// production behavior; bumping it requires end-to-end verification.
const SEEDREAM_REFERENCE_CAPABILITY = Object.freeze({
  maxReferenceImages: 2,
  referenceStrengthControl: Object.freeze({
    supported: false,
    controlParameter: null,
    note: 'Seedream 5.0 Pro ref_strength / equivalent weight parameter has not been verified end to end at integration time. Path A capability is reported unsupported; Reference Boundary (B-3) will fall back to the text block alone, and Paths B / C remain available if the image still dominates the prompt.',
  }),
  referenceRoleControl: Object.freeze({
    supported: false,
    controlParameter: null,
    note: 'Seedream 5.0 Pro ref_mode / equivalent role parameter has not been verified end to end at integration time. Same fallback as referenceStrengthControl.',
  }),
});

const SEEDREAM_ADAPTER_CAPABILITY = Object.freeze({
  adapterId: SEEDREAM_SHORT_CHAIN_ADAPTER_ID,
  adapterVersion: SEEDREAM_SHORT_CHAIN_ADAPTER_VERSION,
  reference: SEEDREAM_REFERENCE_CAPABILITY,
});

export function createSeedreamVNextAdapter(options = {}) {
  const model = options.model || 'doubao-seedream-5-0-pro-260628';
  return Object.freeze({
    id: SEEDREAM_SHORT_CHAIN_ADAPTER_ID,
    version: SEEDREAM_SHORT_CHAIN_ADAPTER_VERSION,
    model,
    capability: SEEDREAM_ADAPTER_CAPABILITY,
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

