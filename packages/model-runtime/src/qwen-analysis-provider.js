import { createQwenReasoner } from './qwen-reasoner.js';

function normalized(value) {
  return String(value || '').trim().toLowerCase();
}

export function createQwenAnalysisProvider(options = {}) {
  const reasonerFactory = options.reasonerFactory || createQwenReasoner;
  return Object.freeze({
    id: 'qwen',
    capabilities: Object.freeze(['multimodal-analysis', 'structured-output']),
    supports(configuration = {}) {
      const provider = normalized(configuration.provider);
      const protocol = normalized(configuration.protocol || 'openai-chat-multimodal');
      const model = normalized(configuration.model);
      if (protocol !== 'openai-chat-multimodal') return false;
      if (provider === 'qwen' || provider === 'dashscope') return true;
      if (provider === 'openai-compatible' || !provider) return model.startsWith('qwen');
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
