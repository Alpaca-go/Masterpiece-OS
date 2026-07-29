export const MULTI_MODEL_ADAPTER_VERSION = '2.0.0';

const ADAPTERS = Object.freeze({
  'gpt-image-2': Object.freeze({
    id: 'gpt-image-2',
    protocol: 'openai-image-generation',
    defaultBaseUrl: 'https://api.openai.com/v1',
    maxReferences: 16,
  }),
  'nano-banana': Object.freeze({
    id: 'nano-banana',
    protocol: 'google-gemini-image',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    maxReferences: 10,
  }),
  'seedream-5.0-pro': Object.freeze({
    id: 'seedream-5.0-pro',
    protocol: 'seedream-image',
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    maxReferences: 10,
  }),
});

function text(value) {
  return String(value ?? '').trim();
}

function trimSlash(value) {
  return text(value).replace(/\/+$/u, '');
}

function assertUniversalInput(input, adapter) {
  if (!input || !text(input.prompt)) {
    throw Object.assign(new Error('Universal Prompt is required.'), {
      code: 'UNIVERSAL_PROMPT_REQUIRED',
    });
  }
  if (input.outputCount !== 1) {
    throw Object.assign(new Error('Multi-model generation requires exactly one output per task.'), {
      code: 'MODEL_OUTPUT_COUNT_UNSUPPORTED',
    });
  }
  if (!['1:1', '16:9', '9:16', '4:5', '3:4', '4:3', '3:2', '2:3'].includes(input.aspectRatio)) {
    throw Object.assign(new Error(`Unsupported aspect ratio: ${input.aspectRatio || 'missing'}`), {
      code: 'MODEL_ASPECT_RATIO_UNSUPPORTED',
    });
  }
  const references = Array.isArray(input.references) ? input.references : [];
  if (references.length > adapter.maxReferences
    || references.some((reference) => !text(reference?.data) || !text(reference?.mimeType))) {
    throw Object.assign(new Error(`Invalid reference payload for ${adapter.id}.`), {
      code: 'MODEL_REFERENCE_INVALID',
    });
  }
  return references;
}

function modelPrompt(adapterId, input) {
  const negative = Array.isArray(input.negativeRules)
    ? input.negativeRules.map(text).filter(Boolean)
    : [];
  const wrappers = {
    'gpt-image-2': [
      'Create one complete production-ready commercial image.',
      'Follow the approved brand system and spatial/material relationships exactly.',
    ],
    'nano-banana': [
      'Generate or edit one image while preserving only the explicitly approved reference identities.',
      'Use reference images as conditioning inputs; do not copy unrelated text or layouts.',
    ],
    'seedream-5.0-pro': [
      '生成一张完整、可商用的品牌视觉图片。',
      '准确执行已确认的品牌规则、中文商业设计语境与交付物职责。',
    ],
  };
  return [
    ...wrappers[adapterId],
    input.prompt,
    ...(negative.length ? ['Negative rules:', ...negative.map((rule) => `- ${rule}`)] : []),
  ].join('\n');
}

function openAiSize(aspectRatio) {
  if (['16:9', '4:3', '3:2'].includes(aspectRatio)) return '1536x1024';
  if (['9:16', '4:5', '3:4', '2:3'].includes(aspectRatio)) return '1024x1536';
  return '1024x1024';
}

function dataUri(reference) {
  return `data:${reference.mimeType};base64,${reference.data}`;
}

function buildGptRequest(config, input, references) {
  const baseUrl = trimSlash(config.baseUrl || ADAPTERS['gpt-image-2'].defaultBaseUrl);
  const fields = {
    model: config.modelId || 'gpt-image-2',
    prompt: modelPrompt('gpt-image-2', input),
    n: 1,
    size: openAiSize(input.aspectRatio),
    quality: input.quality || 'high',
    output_format: 'png',
  };
  if (!references.length) {
    return {
      method: 'POST',
      url: `${baseUrl}/images/generations`,
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      bodyKind: 'json',
      body: fields,
    };
  }
  return {
    method: 'POST',
    url: `${baseUrl}/images/edits`,
    headers: { Authorization: `Bearer ${config.apiKey}` },
    bodyKind: 'multipart',
    body: {
      fields,
      files: references.map((reference, index) => ({
        field: 'image[]',
        name: reference.name || `reference-${index + 1}.${reference.mimeType.split('/')[1] || 'png'}`,
        mimeType: reference.mimeType,
        data: reference.data,
      })),
    },
  };
}

function buildNanoRequest(config, input, references) {
  const baseUrl = trimSlash(config.baseUrl || ADAPTERS['nano-banana'].defaultBaseUrl);
  const modelId = config.modelId === 'nano-banana' || !config.modelId
    ? 'gemini-3.1-flash-image'
    : config.modelId;
  return {
    method: 'POST',
    url: `${baseUrl}/interactions`,
    headers: { 'x-goog-api-key': config.apiKey, 'Content-Type': 'application/json' },
    bodyKind: 'json',
    body: {
      model: modelId,
      input: [
        { type: 'text', text: modelPrompt('nano-banana', input) },
        ...references.map((reference) => ({
          type: 'image',
          data: reference.data,
          mime_type: reference.mimeType,
        })),
      ],
      response_format: {
        type: 'image',
        mime_type: 'image/png',
        aspect_ratio: input.aspectRatio,
        image_size: input.imageSize || '2K',
      },
    },
  };
}

function buildSeedreamRequest(config, input, references) {
  const baseUrl = trimSlash(config.baseUrl || ADAPTERS['seedream-5.0-pro'].defaultBaseUrl);
  return {
    method: 'POST',
    url: `${baseUrl}/images/generations`,
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    bodyKind: 'json',
    body: {
      model: config.modelId || 'seedream-5.0-pro',
      prompt: modelPrompt('seedream-5.0-pro', input),
      image: references.map(dataUri),
      size: input.aspectRatio,
      quality: input.quality || 'high',
      response_format: 'b64_json',
      watermark: false,
      sequential_image_generation: 'disabled',
    },
  };
}

export function listMultiModelAdapters() {
  return Object.values(ADAPTERS).map((adapter) => structuredClone(adapter));
}

export function createMultiModelImageAdapter(config = {}) {
  const adapterId = text(config.adapterId);
  const adapter = ADAPTERS[adapterId];
  if (!adapter) {
    throw Object.assign(new Error(`Unsupported multi-model adapter: ${adapterId || 'missing'}`), {
      code: 'MODEL_ADAPTER_UNSUPPORTED',
    });
  }

  function compileRequest(input) {
    const references = assertUniversalInput(input, adapter);
    if (!text(config.apiKey)) {
      throw Object.assign(new Error(`${adapterId} API Key is required.`), {
        code: 'MODEL_ADAPTER_AUTH_REQUIRED',
      });
    }
    if (adapterId === 'gpt-image-2') return buildGptRequest(config, input, references);
    if (adapterId === 'nano-banana') return buildNanoRequest(config, input, references);
    return buildSeedreamRequest(config, input, references);
  }

  function parseResponse(response) {
    const data = Array.isArray(response?.data) ? response.data : [];
    const interactionImage = response?.output_image;
    const geminiParts = response?.candidates?.[0]?.content?.parts ?? [];
    const images = [
      ...data.map((image) => ({
        ...(text(image?.url) ? { url: text(image.url) } : {}),
        ...(text(image?.b64_json) ? { b64: text(image.b64_json) } : {}),
        mimeType: text(image?.mime_type) || 'image/png',
      })),
      ...(interactionImage?.data ? [{
        b64: text(interactionImage.data),
        mimeType: text(interactionImage.mime_type) || 'image/png',
      }] : []),
      ...geminiParts.filter((part) => part?.inlineData?.data).map((part) => ({
        b64: text(part.inlineData.data),
        mimeType: text(part.inlineData.mimeType) || 'image/png',
      })),
    ].filter((image) => image.url || image.b64);
    if (!images.length) {
      throw Object.assign(new Error(`${adapterId} response does not contain an image.`), {
        code: 'MODEL_ADAPTER_RESPONSE_INVALID',
      });
    }
    return {
      status: 'succeeded',
      adapterId,
      modelId: text(response?.model) || text(config.modelId) || adapterId,
      requestId: text(response?.id) || text(response?.request_id) || undefined,
      images,
    };
  }

  async function execute(input, options = {}) {
    const request = compileRequest(input);
    const fetchImpl = options.fetchImpl || fetch;
    let body;
    let headers = { ...request.headers };
    if (request.bodyKind === 'multipart') {
      const form = new FormData();
      for (const [key, value] of Object.entries(request.body.fields)) form.append(key, String(value));
      for (const file of request.body.files) {
        form.append(file.field, new Blob([Buffer.from(file.data, 'base64')], {
          type: file.mimeType,
        }), file.name);
      }
      body = form;
    } else {
      body = JSON.stringify(request.body);
    }
    const response = await fetchImpl(request.url, {
      method: request.method,
      headers,
      body,
      signal: options.signal,
    });
    const raw = await response.text();
    let parsed;
    try {
      parsed = raw ? JSON.parse(raw) : {};
    } catch {
      throw Object.assign(new Error(`${adapterId} returned invalid JSON.`), {
        code: 'MODEL_ADAPTER_RESPONSE_INVALID',
      });
    }
    if (!response.ok) {
      const message = text(parsed?.error?.message || parsed?.message || response.statusText);
      throw Object.assign(new Error(`${adapterId} request failed (${response.status}): ${message}`), {
        code: response.status === 401 || response.status === 403
          ? 'MODEL_ADAPTER_AUTH_FAILED'
          : response.status === 429
            ? 'MODEL_ADAPTER_RATE_LIMITED'
            : 'MODEL_ADAPTER_REQUEST_FAILED',
        retryable: response.status === 429 || response.status >= 500,
      });
    }
    return parseResponse(parsed);
  }

  return {
    id: adapterId,
    protocol: adapter.protocol,
    version: MULTI_MODEL_ADAPTER_VERSION,
    compileRequest,
    parseResponse,
    execute,
  };
}
