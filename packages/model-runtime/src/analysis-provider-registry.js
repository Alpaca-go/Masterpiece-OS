import { createAnalysisProviderRegistry } from './analysis-provider.js';
import { createQwenAnalysisProvider } from './qwen-analysis-provider.js';
import { createVolcengineAnalysisProvider } from './volcengine-analysis-provider.js';

export function createDefaultAnalysisProviderRegistry(options = {}) {
  return createAnalysisProviderRegistry([
    // A2-H: Volcengine is the new DEFAULT Visual Analysis provider
    // (A2-G decision: CHANGE_DEFAULT_TO_VOLCENGINE; A2-H spec §9/§10).
    // Qwen is preserved as ALTERNATIVE / FALLBACK / REGRESSION_BASELINE
    // (A2-H spec §11). The dispatch order in the array is informational;
    // the actual provider is selected by `supports(configuration)`
    // filtering on `provider` field and `model` prefix. The default
    // resolution is therefore driven by the caller's `configuration`,
    // not by the array position.
    createVolcengineAnalysisProvider(options.volcengine),
    createQwenAnalysisProvider(options.qwen),
    ...(options.additionalProviders || []),
  ]);
}

export function createDefaultAnalysisReasoner(configuration, options = {}) {
  return createDefaultAnalysisProviderRegistry(options).createReasoner(configuration);
}
