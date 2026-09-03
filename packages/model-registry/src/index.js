import { createHash } from 'node:crypto';

export const MODEL_REGISTRY_VERSION = '3.0.0';
export const IMAGE_REFERENCE_CAPABILITY_SCHEMA = 'image-reference-capability/v1';
export const IMAGE_REFERENCE_CAPABILITY_VERSION = '1.0.0';

export const PROVIDER_CAPABILITY_NOT_FOUND = 'PROVIDER_CAPABILITY_NOT_FOUND';
export const PROVIDER_CAPABILITY_INCOMPLETE = 'PROVIDER_CAPABILITY_INCOMPLETE';
export const PROVIDER_CAPABILITY_CONTRACT_MISMATCH = 'PROVIDER_CAPABILITY_CONTRACT_MISMATCH';

const MODELS = Object.freeze([
  Object.freeze({
    id: 'qwen3.6-plus',
    name: 'Qwen3.6 Plus',
    type: 'analysis',
    provider: 'dashscope',
    protocol: 'openai-chat-multimodal',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    capabilities: Object.freeze([
      'brand_analysis', 'visual_understanding', 'visual_memory', 'creative_direction',
    ]),
    referenceSupport: true,
    enabledByDefault: true,
  }),
  Object.freeze({
    id: 'gpt-image-2',
    name: 'GPT-image-2',
    type: 'image_generation',
    provider: 'openai',
    protocol: 'openai-image-generation',
    defaultBaseUrl: 'https://api.openai.com/v1',
    capabilities: Object.freeze(['space', 'product', 'poster']),
    referenceSupport: true,
    enabledByDefault: true,
  }),
  Object.freeze({
    id: 'nano-banana',
    name: 'Nano Banana',
    type: 'image_generation',
    provider: 'google',
    protocol: 'google-gemini-image',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    capabilities: Object.freeze(['reference_conditioning', 'style_transfer', 'image_edit']),
    referenceSupport: true,
    enabledByDefault: true,
  }),
  Object.freeze({
    id: 'seedream-5.0-pro',
    name: 'Seedream 5.0 Pro',
    type: 'image_generation',
    provider: 'volcengine',
    protocol: 'seedream-image',
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    capabilities: Object.freeze(['packaging', 'poster', 'chinese_commercial_design']),
    referenceSupport: true,
    maxReferenceImages: 10,
    imageReferenceCapability: Object.freeze({
      capabilityVersion: IMAGE_REFERENCE_CAPABILITY_VERSION,
      supportsMultipleReferences: true,
      maxReferenceImages: 10,
      supportedReferenceMimeTypes: Object.freeze(['image/jpeg', 'image/png']),
    }),
    enabledByDefault: true,
  }),
  Object.freeze({
    id: 'wan2.7-image-pro',
    name: 'Wan 2.7 Image Pro',
    type: 'image_generation',
    provider: 'dashscope',
    protocol: 'dashscope-wan-image',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/api/v1',
    capabilities: Object.freeze(['space', 'product', 'poster', 'illustration']),
    referenceSupport: true,
    maxReferenceImages: 9,
    imageReferenceCapability: Object.freeze({
      capabilityVersion: IMAGE_REFERENCE_CAPABILITY_VERSION,
      supportsMultipleReferences: true,
      maxReferenceImages: 9,
      supportedReferenceMimeTypes: Object.freeze([
        'image/bmp', 'image/jpeg', 'image/png', 'image/webp',
      ]),
    }),
    enabledByDefault: false,
    legacyCompatible: true,
  }),
]);

function text(value) {
  return String(value ?? '').trim();
}

function capabilityError(code, message, details = {}) {
  return Object.assign(new Error(message), { code, ...details });
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  );
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function normalizeMimeTypes(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => text(value).toLowerCase()).filter(Boolean))].sort();
}

function fingerprintCapability(snapshot) {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(snapshot)))
    .digest('hex');
}

export function listRegisteredModels(filter = {}) {
  return MODELS
    .filter((model) => !filter.type || model.type === filter.type)
    .filter((model) => !filter.provider || model.provider === filter.provider)
    .map((model) => structuredClone(model));
}

export function getRegisteredModel(modelId) {
  const normalized = text(modelId).toLowerCase();
  const model = MODELS.find((item) => item.id.toLowerCase() === normalized);
  return model ? structuredClone(model) : null;
}

/**
 * Resolve the immutable, normalized image-reference capability owned by the
 * Model Registry. Provider adapters may consume this snapshot, but may not
 * supply or override any of its objective limits.
 */
export function resolveImageReferenceCapability(input = {}) {
  const registryModelId = text(input.registryModelId || input.modelId).toLowerCase();
  const model = MODELS.find((item) => item.id.toLowerCase() === registryModelId);
  if (!model || model.type !== 'image_generation') {
    throw capabilityError(
      PROVIDER_CAPABILITY_NOT_FOUND,
      `Image-reference capability was not found for ${registryModelId || 'missing model'}.`,
      { registryModelId: registryModelId || undefined },
    );
  }

  const requestedProvider = text(input.provider).toLowerCase();
  const requestedProtocol = text(input.protocol).toLowerCase();
  if ((requestedProvider && requestedProvider !== model.provider.toLowerCase())
    || (requestedProtocol && requestedProtocol !== model.protocol.toLowerCase())) {
    throw capabilityError(
      PROVIDER_CAPABILITY_CONTRACT_MISMATCH,
      `Capability identity does not match the registered contract for ${model.id}.`,
      { registryModelId: model.id },
    );
  }

  const capability = model.imageReferenceCapability;
  const mimeTypes = normalizeMimeTypes(capability?.supportedReferenceMimeTypes);
  if (model.referenceSupport !== true
    || !capability
    || !Number.isInteger(capability.maxReferenceImages)
    || capability.maxReferenceImages < 1
    || typeof capability.supportsMultipleReferences !== 'boolean'
    || !text(capability.capabilityVersion)
    || mimeTypes.length === 0) {
    throw capabilityError(
      PROVIDER_CAPABILITY_INCOMPLETE,
      `Image-reference capability is incomplete for ${model.id}.`,
      { registryModelId: model.id },
    );
  }

  const normalized = {
    schema: IMAGE_REFERENCE_CAPABILITY_SCHEMA,
    registryVersion: MODEL_REGISTRY_VERSION,
    capabilityVersion: text(capability.capabilityVersion),
    registryModelId: model.id,
    provider: model.provider,
    protocol: model.protocol,
    referenceSupport: true,
    supportsMultipleReferences: capability.supportsMultipleReferences,
    maxReferenceImages: capability.maxReferenceImages,
    supportedReferenceMimeTypes: mimeTypes,
    ...(capability.constraints ? { constraints: canonicalize(capability.constraints) } : {}),
  };
  return deepFreeze({
    ...normalized,
    capabilityFingerprint: fingerprintCapability(normalized),
  });
}

export function inferModelType(input = {}) {
  const registered = getRegisteredModel(input.registryModelId || input.modelId);
  if (registered) return registered.type;
  if (text(input.protocol) === 'openai-video-generation') return 'video_generation';
  return [
    'dashscope-wan-image',
    'openai-image-generation',
    'google-gemini-image',
    'seedream-image',
  ].includes(text(input.protocol))
    ? 'image_generation'
    : 'analysis';
}

export function validateModelProfile(input = {}) {
  const modelType = text(input.modelType) || inferModelType(input);
  if (!['analysis', 'image_generation', 'video_generation'].includes(modelType)) {
    throw Object.assign(new Error('Model type must be analysis, image_generation or video_generation.'), {
      code: 'MODEL_TYPE_INVALID',
    });
  }
  const registered = getRegisteredModel(input.registryModelId || input.modelId);
  if (registered && (registered.type !== modelType || registered.protocol !== text(input.protocol))) {
    throw Object.assign(new Error(
      `${registered.name} requires ${registered.type} with ${registered.protocol}.`,
    ), {
      code: 'MODEL_PROFILE_INCOMPATIBLE',
    });
  }
  if (modelType === 'analysis' && text(input.protocol) !== 'openai-chat-multimodal') {
    throw Object.assign(new Error('Analysis models must use the multimodal analysis protocol.'), {
      code: 'MODEL_PROFILE_INCOMPATIBLE',
    });
  }
  if (modelType === 'image_generation' && text(input.protocol) === 'openai-chat-multimodal') {
    throw Object.assign(new Error('Generation models cannot use the analysis protocol.'), {
      code: 'MODEL_PROFILE_INCOMPATIBLE',
    });
  }
  if (modelType === 'image_generation' && text(input.protocol) === 'openai-video-generation') {
    throw Object.assign(new Error('Image generation models cannot use the video generation protocol.'), {
      code: 'MODEL_PROFILE_INCOMPATIBLE',
    });
  }
  if (modelType === 'video_generation' && text(input.protocol) !== 'openai-video-generation') {
    throw Object.assign(new Error('Video generation models must use the video generation protocol.'), {
      code: 'MODEL_PROFILE_INCOMPATIBLE',
    });
  }
  return {
    modelType,
    registryModelId: registered?.id,
    capabilities: registered?.capabilities ?? [],
    referenceSupport: registered?.referenceSupport ?? false,
  };
}
