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

export function createImageGenerationAdapter(config = {}) {
  const provider = config.provider ?? 'wan';
  if (provider !== 'wan') {
    throw new Error(`Unsupported image generation provider "${provider}". Select an installed adapter explicitly.`);
  }
  return createWanImageGenerationAdapter(config);
}
