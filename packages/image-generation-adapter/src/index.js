import {
  createWanImageGenerationAdapter,
} from './wan.js';

export {
  ImageGenerationAdapterError,
  WAN_ADAPTER_ID,
  WAN_ADAPTER_VERSION,
  createWanImageGenerationAdapter,
  resolveWanSize,
} from './wan.js';
export {
  MULTI_MODEL_ADAPTER_VERSION,
  createMultiModelImageAdapter,
  listMultiModelAdapters,
} from './multi-model.js';

export function createImageGenerationAdapter(config = {}) {
  const provider = config.provider ?? 'wan';
  if (provider === 'wan') return createWanImageGenerationAdapter(config);
  throw new Error(
    `Unsupported image generation provider "${provider}". Use createMultiModelImageAdapter for registered multi-model providers.`,
  );
}
