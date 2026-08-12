import {
  DASHSCOPE_CAPABILITIES,
  createDashScopeProvider,
} from '../../image-provider-dashscope/src/index.js';

export const WAN_ADAPTER_ID = 'wan';
export const WAN_ADAPTER_VERSION = '1.0.0';

const RATIO_TO_SIZE = Object.freeze({
  '1:1': '1440*1440',
  '16:9': '2048*1152',
  '9:16': '1152*2048',
});

export class ImageGenerationAdapterError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ImageGenerationAdapterError';
    this.code = code;
  }
}

export function resolveWanSize(ratio) {
  if (DASHSCOPE_CAPABILITIES.supportedSizes.includes(ratio)) return ratio;
  const size = RATIO_TO_SIZE[ratio];
  if (!size) {
    throw new ImageGenerationAdapterError(
      'IMAGE_RATIO_UNSUPPORTED',
      `Wan adapter does not support ratio "${ratio}". Supported ratios: ${Object.keys(RATIO_TO_SIZE).join(', ')}.`,
    );
  }
  return size;
}

function validateGenerationInput(input) {
  if (!input || typeof input !== 'object') {
    throw new ImageGenerationAdapterError('IMAGE_INPUT_INVALID', 'Image generation input must be an object.');
  }
  if (typeof input.prompt !== 'string' || !input.prompt.trim()) {
    throw new ImageGenerationAdapterError('IMAGE_PROMPT_REQUIRED', 'A non-empty compiled prompt is required.');
  }
  if (typeof input.model !== 'string' || !input.model.trim()) {
    throw new ImageGenerationAdapterError('IMAGE_MODEL_REQUIRED', 'An explicit image model is required.');
  }
  if (typeof input.promptVersion !== 'string' || !input.promptVersion.trim()) {
    throw new ImageGenerationAdapterError('PROMPT_VERSION_REQUIRED', 'promptVersion is required for traceability.');
  }
  if (!Array.isArray(input.references)) {
    throw new ImageGenerationAdapterError('IMAGE_REFERENCES_INVALID', 'references must be an array.');
  }
  if (input.references.length > DASHSCOPE_CAPABILITIES.maxReferenceImages) {
    throw new ImageGenerationAdapterError(
      'IMAGE_REFERENCES_EXCEEDED',
      `Wan accepts at most ${DASHSCOPE_CAPABILITIES.maxReferenceImages} reference images.`,
    );
  }
  if (input.references.some((reference) => !reference || typeof reference.localPath !== 'string')) {
    throw new ImageGenerationAdapterError(
      'IMAGE_REFERENCE_PATH_REQUIRED',
      'Each Wan reference must include a localPath.',
    );
  }
  if (input.count !== 1) {
    throw new ImageGenerationAdapterError('IMAGE_COUNT_UNSUPPORTED', 'Wan v1 supports exactly one output image.');
  }
}

/**
 * Wraps the current Wan/DashScope transport behind the provider-neutral adapter boundary.
 * The lifecycle methods remain exposed so the Runtime Host can persist and resume long-running tasks.
 */
export function createWanImageGenerationAdapter(config = {}) {
  const provider = createDashScopeProvider(config);
  const now = config.now ?? (() => new Date().toISOString());
  const sleep = config.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const pollIntervalMs = config.pollIntervalMs ?? 3000;
  const maxPollAttempts = config.maxPollAttempts ?? 200;

  async function generateImage(input, signal) {
    validateGenerationInput(input);
    const size = resolveWanSize(input.ratio);
    const generatedId = `adapter-${Date.now()}`;
    const task = {
      schemaVersion: '1.0',
      taskId: input.taskId ?? generatedId,
      runId: input.runId ?? generatedId,
      outputType: input.outputType ?? 'concept_image',
      modelId: input.model,
      compiledPrompt: input.prompt.trim(),
      references: input.references,
      parameters: {
        size,
        outputCount: input.count,
        watermark: false,
      },
    };

    const submitted = await provider.submit(task, signal);
    let status = submitted.initialStatus;
    let attempts = 0;
    while (!status || ['pending', 'running'].includes(status.state)) {
      if (attempts >= maxPollAttempts) {
        throw new ImageGenerationAdapterError(
          'IMAGE_GENERATION_TIMEOUT',
          `Wan generation did not finish after ${maxPollAttempts} poll attempts.`,
        );
      }
      if (attempts > 0 || status) await sleep(pollIntervalMs);
      status = await provider.getStatus(submitted.providerTaskId);
      attempts += 1;
    }

    if (status.state !== 'succeeded' || !Array.isArray(status.images) || status.images.length === 0) {
      throw new ImageGenerationAdapterError(
        status.error?.code ?? `IMAGE_GENERATION_${String(status.state).toUpperCase()}`,
        status.error?.message ?? `Wan generation ended with state "${status.state}".`,
      );
    }

    return {
      images: status.images,
      model: input.model,
      promptVersion: input.promptVersion,
      timestamp: now(),
    };
  }

  return {
    adapterId: WAN_ADAPTER_ID,
    adapterVersion: WAN_ADAPTER_VERSION,
    getCapabilities: provider.getCapabilities,
    submit: provider.submit,
    getStatus: provider.getStatus,
    cancel: provider.cancel,
    generateImage,
    _meta: provider._meta,
  };
}
