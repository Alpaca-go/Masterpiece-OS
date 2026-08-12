import { createAnalysisProviderRegistry } from './analysis-provider.js';
import { createQwenAnalysisProvider } from './qwen-analysis-provider.js';

export function createDefaultAnalysisProviderRegistry(options = {}) {
  return createAnalysisProviderRegistry([
    createQwenAnalysisProvider(options.qwen),
    ...(options.additionalProviders || []),
  ]);
}

export function createDefaultAnalysisReasoner(configuration, options = {}) {
  return createDefaultAnalysisProviderRegistry(options).createReasoner(configuration);
}
