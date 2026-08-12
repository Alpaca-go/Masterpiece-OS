// Visual Analysis A2-B — Volcengine / Ark Analysis Provider.
//
// One canonical Analysis Provider (per A1 contract) for the
// Volcengine / Ark platform, supporting the
// `openai-chat-multimodal` protocol used by Doubao multimodal
// chat completions.
//
// This provider is opt-in: it is not part of the default
// Analysis Provider Registry. Callers that want a Volcengine
// candidate must pass it explicitly via
// `createDefaultAnalysisProviderRegistry({ additionalProviders: [...] })`
// or `createAnalysisProviderRegistry([...])`.
//
// The provider does NOT own:
//   - Prompt semantics
//   - Masterpiece analysis methodology
//   - project persistence
//   - Reference First / Space / Packaging
//   - report authority
//   - evaluation scoring
//
// It owns only Provider identity + the multimodal HTTP reasoner
// bound to the configured Profile / Credential.

import { createVolcengineReasoner } from './volcengine-reasoner.js';

function normalized(value) {
  return String(value || '').trim().toLowerCase();
}

const SUPPORTED_PROTOCOLS = Object.freeze(['openai-chat-multimodal']);

export function createVolcengineAnalysisProvider(options = {}) {
  const reasonerFactory = options.reasonerFactory || createVolcengineReasoner;
  return Object.freeze({
    id: 'volcengine',
    capabilities: Object.freeze(['multimodal-analysis', 'structured-output']),
    supports(configuration = {}) {
      const provider = normalized(configuration.provider);
      const protocol = normalized(configuration.protocol || 'openai-chat-multimodal');
      const model = normalized(configuration.model);
      if (!SUPPORTED_PROTOCOLS.includes(protocol)) return false;
      if (provider === 'volcengine' || provider === 'ark') return true;
      // Allow openai-compatible or unset provider to be matched on
      // the model prefix used by Doubao multimodal endpoints.
      if (provider === 'openai-compatible' || !provider) {
        return model.startsWith('doubao-');
      }
      return false;
    },
    createReasoner(configuration) {
      return reasonerFactory({
        apiKey: configuration.apiKey,
        model: configuration.model,
        baseUrl: configuration.baseUrl,
      });
    },
  });
}
