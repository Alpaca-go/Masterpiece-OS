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
  const bytes = new TextEncoder().encode(JSON.stringify(canonicalize(snapshot)));
  const bitLength = bytes.length * 8;
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x1_0000_0000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);
  const state = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const constants = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const rotateRight = (value, bits) => (value >>> bits) | (value << (32 - bits));
  for (let offset = 0; offset < paddedLength; offset += 64) {
    const words = new Uint32Array(64);
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + (index * 4), false);
    }
    for (let index = 16; index < 64; index += 1) {
      const left = words[index - 15];
      const right = words[index - 2];
      const sigma0 = rotateRight(left, 7) ^ rotateRight(left, 18) ^ (left >>> 3);
      const sigma1 = rotateRight(right, 17) ^ rotateRight(right, 19) ^ (right >>> 10);
      words[index] = (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = state;
    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temporary1 = (h + sum1 + choice + constants[index] + words[index]) >>> 0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporary2 = (sum0 + majority) >>> 0;
      h = g; g = f; f = e; e = (d + temporary1) >>> 0;
      d = c; c = b; b = a; a = (temporary1 + temporary2) >>> 0;
    }
    state[0] = (state[0] + a) >>> 0;
    state[1] = (state[1] + b) >>> 0;
    state[2] = (state[2] + c) >>> 0;
    state[3] = (state[3] + d) >>> 0;
    state[4] = (state[4] + e) >>> 0;
    state[5] = (state[5] + f) >>> 0;
    state[6] = (state[6] + g) >>> 0;
    state[7] = (state[7] + h) >>> 0;
  }
  return [...state].map((word) => word.toString(16).padStart(8, '0')).join('');
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
