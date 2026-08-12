export const SEEDREAM_SHORT_CHAIN_ADAPTER_ID = 'seedream-5.0-pro';
export const SEEDREAM_SHORT_CHAIN_ADAPTER_VERSION = 'seedream-short-chain-adapter@1.1.0';
// Phase 9B recovery: the golden Mode B space prompt runs ~9.5k chars (JZMX),
// so the legacy 7500 compile-time cap was retired. This is the REAL provider
// hard ceiling and the SINGLE source of truth for it: the space-quality
// prompt budget, Gate A (compile integrity) and Gate B (provider prompt) all
// read it through the adapter capability below instead of re-declaring the
// number. The 7500 figure survives only as a quality / bloat monitoring
// budget (warn + trace flag), never as a fail-closed gate.
export const SEEDREAM_MAX_PROMPT_CHARACTERS = 12_000;

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

// r10.4 regression repair: the prompt hard limit is part of the adapter
// capability so the space-quality budget and the route gates read ONE source
// instead of each hard-coding a ceiling. maxCharacters is the provider-side
// fail-closed cap; exceeding it blocks, exceeding the (smaller) quality budget
// only warns.
const SEEDREAM_PROMPT_CAPABILITY = Object.freeze({
  maxCharacters: SEEDREAM_MAX_PROMPT_CHARACTERS,
});

export const SEEDREAM_ADAPTER_CAPABILITY = Object.freeze({
  adapterId: SEEDREAM_SHORT_CHAIN_ADAPTER_ID,
  adapterVersion: SEEDREAM_SHORT_CHAIN_ADAPTER_VERSION,
  prompt: SEEDREAM_PROMPT_CAPABILITY,
  reference: SEEDREAM_REFERENCE_CAPABILITY,
});

// r2.0 §4.10 / B-3: Reference Boundary text block. Imported here so the
// adapter can append it for Reference-First. Continuation's world_consistency
// role is more specific and is used as-is; Standard emits no block.
import { renderReferenceBoundary, resolveProviderStrengthControlLabel } from '../space/reference-boundary.js';

export function createSeedreamShortChainAdapter(options = {}) {
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
      const compiledText = String(compiledPrompt.editablePrompt || compiledPrompt.finalPrompt).trim();
      if (!compiledText) throw new Error('Seedream prompt cannot be empty');
      const taskContract = compiledPrompt.taskContract ?? {};
      const generationBasis = taskContract.generationBasis ?? 'standard';
      const referenceSceneRelation = taskContract.referenceSceneRelation ?? 'unknown';
      const targetSceneLabel = taskContract.subtype ?? '';

      // r2.0 §4.10 / B-3: append the Reference Boundary block when the
      // generation has a reference image AND the block is meaningful for
      // the basis. The block is appended (not prepended) so the existing
      // r8_6_golden output order is preserved; the boundary labels itself
      // as "high-priority instruction" so the model reads it as a top
      // directive regardless of position.
      const boundary = renderReferenceBoundary({
        generationBasis,
        referenceSceneRelation,
        targetSceneLabel,
        adapterCapability: SEEDREAM_ADAPTER_CAPABILITY,
      });

      const prompt = boundary
        ? `${compiledText}\n\n${boundary}`
        : compiledText;

      const promptCharacters = [...prompt].length;
      if (promptCharacters > SEEDREAM_MAX_PROMPT_CHARACTERS) {
        throw new Error(
          `Seedream prompt exceeds ${SEEDREAM_MAX_PROMPT_CHARACTERS} characters (${promptCharacters})`,
        );
      }
      return {
        adapterId: SEEDREAM_SHORT_CHAIN_ADAPTER_ID,
        adapterVersion: SEEDREAM_SHORT_CHAIN_ADAPTER_VERSION,
        model,
        prompt,
        size: '2K',
        aspectRatio: taskContract.aspectRatio,
        count: taskContract.count,
        referenceAssetIds: [...(taskContract.referenceAssetIds ?? [])],
        referenceBoundary: {
          applied: Boolean(boundary),
          version: boundary ? 'space-reference-boundary@1.0.0' : null,
          providerStrengthControl: resolveProviderStrengthControlLabel(SEEDREAM_ADAPTER_CAPABILITY),
          promptCharacters,
        },
      };
    },
  });
}

