// @masterpiece/image-provider-dashscope
// DashScope wan2.7-image-pro Provider 适配器（§10）。
// 职责：请求格式转换、区域/Endpoint 解析、异步提交、任务状态查询、远程取消、
//       Provider 错误归一化、Capability 返回。
// 不得负责：项目上下文读取、Prompt 决策、参考身份隔离、本地文件结构、人工评价。
//
// 全部网络访问经由可注入的 fetchImpl / fileReader，便于契约测试用 Mock 覆盖。

import fs from 'node:fs/promises';

/** §10.5 区域 → Endpoint。 */
export const REGION_ENDPOINTS = {
  beijing: 'https://dashscope.aliyuncs.com',
  singapore: 'https://dashscope-intl.aliyuncs.com',
};

const SUBMIT_PATH = '/api/v1/services/aigc/text2image/image-synthesis';
const TASK_PATH = (taskId) => `/api/v1/tasks/${encodeURIComponent(taskId)}`;
const CANCEL_PATH = (taskId) => `/api/v1/tasks/${encodeURIComponent(taskId)}/cancel`;

/** §6.1 DashScope wan2.7-image-pro 静态能力（无需 API Key 即可获取，用于 dry-run 与 Gate 校验）。 */
export const DASHSCOPE_CAPABILITIES = Object.freeze({
  providerId: 'dashscope',
  modelId: 'wan2.7-image-pro',
  supportsTextToImage: true,
  supportsMultiImageReference: true,
  supportsNegativePrompt: true,
  supportsRemoteCancel: true,
  maxReferenceImages: 6,
  maxOutputCount: 1,
  supportedSizes: ['2048*1152', '1152*2048', '1440*1440', '1024*1024'],
  outputMimeTypes: ['image/png'],
});

export class DashScopeProviderError extends Error {
  /**
   * @param {string} code 归一化错误码
   * @param {string} message
   * @param {boolean} retryable §10.4：网络/限流可重试；鉴权/参数不可重试
   */
  constructor(code, message, retryable) {
    super(message);
    this.name = 'DashScopeProviderError';
    this.code = code;
    this.retryable = retryable;
  }
}

function resolveEndpoint(region, baseUrlOverride) {
  if (baseUrlOverride) return baseUrlOverride.replace(/\/$/, '');
  const endpoint = REGION_ENDPOINTS[region];
  if (!endpoint) {
    throw new DashScopeProviderError('PROVIDER_REGION_INVALID', `未知区域：${region}`, false);
  }
  return endpoint;
}

/** §11.4 脱敏：绝不回传 Authorization / 完整 API Key。 */
function redactHeaders(headers) {
  const clone = { ...headers };
  if (clone.Authorization) clone.Authorization = 'Bearer [REDACTED]';
  return clone;
}

/**
 * 将 HTTP 响应归一化为 Provider 错误（§10.4 重试策略）。
 */
function normalizeHttpError(status, body) {
  const detail = body?.message || body?.code || `HTTP ${status}`;
  if (status === 401 || status === 403) {
    return new DashScopeProviderError('PROVIDER_AUTH_FAILED', `鉴权失败：${detail}`, false);
  }
  if (status === 400 || status === 422) {
    return new DashScopeProviderError('PROVIDER_REQUEST_INVALID', `参数错误：${detail}`, false);
  }
  if (status === 429) {
    return new DashScopeProviderError('PROVIDER_RATE_LIMITED', `触发限流：${detail}`, true);
  }
  if (status >= 500) {
    return new DashScopeProviderError('PROVIDER_SERVER_ERROR', `服务端错误：${detail}`, true);
  }
  return new DashScopeProviderError('PROVIDER_UNKNOWN_ERROR', `未知错误（HTTP ${status}）：${detail}`, status >= 500);
}

/** DashScope task_status → 归一化 ProviderTaskState。 */
export function normalizeTaskState(taskStatus) {
  switch (String(taskStatus || '').toUpperCase()) {
    case 'PENDING':
      return 'pending';
    case 'RUNNING':
      return 'running';
    case 'SUCCEEDED':
      return 'succeeded';
    case 'FAILED':
    case 'UNKNOWN':
      return 'failed';
    case 'CANCELED':
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'pending';
  }
}

async function encodeReferenceImage(localPath, fileReader) {
  const buf = await fileReader(localPath);
  return `data:image/png;base64,${Buffer.from(buf).toString('base64')}`;
}

/**
 * 构造 DashScope 异步提交 body（§10.3）。参考图按已排序顺序编码为 base64。
 * @returns {Promise<object>}
 */
export async function buildSubmitBody(task, { fileReader } = {}) {
  const reader = fileReader ?? ((p) => fs.readFile(p));
  const refImages = [];
  for (const ref of task.references ?? []) {
    refImages.push(await encodeReferenceImage(ref.localPath, reader));
  }
  const input = { prompt: task.compiledPrompt };
  if (refImages.length > 0) {
    input.ref_img = refImages.length === 1 ? refImages[0] : refImages;
  }
  return {
    model: task.modelId,
    input,
    parameters: {
      size: task.parameters?.size,
      n: task.parameters?.outputCount ?? 1,
      watermark: task.parameters?.watermark ?? false,
    },
  };
}

/**
 * 创建 DashScope Provider。
 * @param {object} config
 * @param {string} config.apiKey
 * @param {'beijing'|'singapore'} config.region
 * @param {string} config.modelId  默认 wan2.7-image-pro
 * @param {string} [config.baseUrl]  覆盖 Endpoint（测试用）
 * @param {typeof fetch} [config.fetchImpl]
 * @param {(p:string)=>Promise<Buffer|Uint8Array>} [config.fileReader]
 * @returns {import('@masterpiece/image-generation-contracts').ImageGenerationProvider}
 */
export function createDashScopeProvider(config = {}) {
  const { apiKey, region = 'beijing', modelId = 'wan2.7-image-pro', baseUrl, fileReader } = config;
  const fetchImpl = config.fetchImpl ?? globalThis.fetch;
  const endpoint = resolveEndpoint(region, baseUrl);

  if (!apiKey) {
    throw new DashScopeProviderError('PROVIDER_CONFIG_MISSING', '缺少 DashScope API Key。', false);
  }

  function authHeaders(extra = {}) {
    return {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...extra,
    };
  }

  async function request(method, path, { body, signal, headers } = {}) {
    let response;
    try {
      response = await fetchImpl(`${endpoint}${path}`, {
        method,
        headers: authHeaders(headers),
        body: body ? JSON.stringify(body) : undefined,
        signal,
      });
    } catch (error) {
      // 网络错误（§10.4 可短暂重试）
      throw new DashScopeProviderError('PROVIDER_NETWORK_ERROR', `网络请求失败：${error?.message ?? error}`, true);
    }
    const raw = await response.text();
    let parsed = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      /* fall through */
    }
    if (!response.ok) {
      throw normalizeHttpError(response.status, parsed);
    }
    if (!parsed) {
      throw new DashScopeProviderError('PROVIDER_RESPONSE_INVALID', 'DashScope 返回了无效 JSON。', false);
    }
    return parsed;
  }

  return {
    async getCapabilities() {
      return { ...DASHSCOPE_CAPABILITIES, modelId };
    },

    async submit(task, signal) {
      const body = await buildSubmitBody(task, { fileReader });
      const json = await request('POST', SUBMIT_PATH, {
        body,
        signal,
        headers: { 'X-DashScope-Async': 'enable' },
      });
      const providerTaskId = json?.output?.task_id;
      if (!providerTaskId) {
        throw new DashScopeProviderError('PROVIDER_TASK_ID_MISSING', 'DashScope 未返回 task_id。', false);
      }
      return { providerTaskId, requestId: json?.request_id };
    },

    async getStatus(providerTaskId) {
      const json = await request('GET', TASK_PATH(providerTaskId));
      const output = json?.output ?? {};
      const state = normalizeTaskState(output.task_status);
      const results = Array.isArray(output.results) ? output.results : [];
      const images = results
        .filter((r) => r && (r.url || r.b64_image))
        .map((r) => ({ url: r.url, b64: r.b64_image, mimeType: 'image/png' }));

      /** @type {import('@masterpiece/image-generation-contracts').ProviderTaskStatus} */
      const status = {
        providerTaskId,
        requestId: json?.request_id,
        state,
        images: images.length > 0 ? images : undefined,
        usage: json?.usage,
      };
      if (state === 'failed') {
        const code = output.code || 'PROVIDER_TASK_FAILED';
        status.error = {
          code,
          message: output.message || 'DashScope 任务失败。',
          retryable: false,
        };
      }
      return status;
    },

    async cancel(providerTaskId) {
      await request('POST', CANCEL_PATH(providerTaskId));
    },

    // 暴露元信息（脱敏）便于运行时记录（§11.4）。
    _meta: {
      endpoint,
      region,
      modelId,
      redactedHeaders: redactHeaders(authHeaders()),
    },
  };
}
