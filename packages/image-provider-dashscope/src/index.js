// @masterpiece/image-provider-dashscope
// DashScope wan2.7-image-pro Provider 适配器（§10）。
// 职责：请求格式转换、区域/Endpoint 解析、同步优先提交、异步任务状态查询、远程取消、
//       Provider 错误归一化、Capability 返回。
// 不得负责：项目上下文读取、Prompt 决策、参考身份隔离、本地文件结构、人工评价。
//
// 全部网络访问经由可注入的 fetchImpl / fileReader，便于契约测试用 Mock 覆盖。

import fs from 'node:fs/promises';
import path from 'node:path';

/** §10.5 区域 → Endpoint。 */
export const REGION_ENDPOINTS = {
  beijing: 'https://dashscope.aliyuncs.com',
  singapore: 'https://dashscope-intl.aliyuncs.com',
};

// Wan 2.7 的同步与异步接口路径不同。同步是官方推荐路径；只有服务端明确
// 表示不支持同步时，才回退到异步任务接口。
const SYNC_SUBMIT_PATH = '/api/v1/services/aigc/multimodal-generation/generation';
const ASYNC_SUBMIT_PATH = '/api/v1/services/aigc/image-generation/generation';
const TASK_PATH = (taskId) => `/api/v1/tasks/${encodeURIComponent(taskId)}`;
const CANCEL_PATH = (taskId) => `/api/v1/tasks/${encodeURIComponent(taskId)}/cancel`;

/** §6.1 DashScope wan2.7-image-pro 静态能力（无需 API Key 即可获取，用于 dry-run 与 Gate 校验）。 */
export const DASHSCOPE_CAPABILITIES = Object.freeze({
  providerId: 'dashscope',
  modelId: 'wan2.7-image-pro',
  supportsTextToImage: true,
  supportsMultiImageReference: true,
  supportsNegativePrompt: false,
  supportsRemoteCancel: true,
  maxReferenceImages: 9,
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

export function resolveDashScopeEndpoint(region, baseUrlOverride) {
  if (baseUrlOverride) {
    let parsed;
    try {
      parsed = new URL(baseUrlOverride);
    } catch {
      throw new DashScopeProviderError('PROVIDER_ENDPOINT_INVALID', 'DashScope Base URL 格式无效。', false);
    }
    if (!['https:', 'http:'].includes(parsed.protocol)) {
      throw new DashScopeProviderError('PROVIDER_ENDPOINT_INVALID', 'DashScope Base URL 必须使用 HTTP(S)。', false);
    }
    // API Profile 允许保存 OpenAI 兼容根、/api/v1 根或完整原生接口地址。
    // Provider 内部的路径常量已经包含 /api/v1，因此这里只保留业务空间 origin。
    const knownApiPath = /\/(?:compatible-mode\/v1|api\/v1)(?:\/.*)?$/i;
    parsed.pathname = parsed.pathname.replace(knownApiPath, '') || '/';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().replace(/\/$/, '');
  }
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
  const detail = body?.message
    || body?.error?.message
    || body?.code
    || body?.error?.code
    || `HTTP ${status}`;
  if (status === 403 && /does not support asynchronous calls/i.test(detail)) {
    return new DashScopeProviderError('PROVIDER_ASYNC_UNSUPPORTED', '当前 API 端点不支持异步调用。', false);
  }
  if (status === 403 && /does not support synchronous calls/i.test(detail)) {
    return new DashScopeProviderError('PROVIDER_SYNC_UNSUPPORTED', '当前 API 端点不支持同步调用。', false);
  }
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

function isSynchronousUnsupported(error) {
  return error instanceof DashScopeProviderError
    && error.code === 'PROVIDER_SYNC_UNSUPPORTED';
}

function resultImages(output) {
  const results = Array.isArray(output?.results) ? output.results : [];
  const choiceContent = Array.isArray(output?.choices)
    ? output.choices.flatMap((choice) => Array.isArray(choice?.message?.content) ? choice.message.content : [])
    : [];
  return [...results, ...choiceContent]
    .filter((item) => item && (item.url || item.b64_image || item.image))
    .map((item) => ({ url: item.url || item.image, b64: item.b64_image, mimeType: 'image/png' }));
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
  const extension = path.extname(localPath).toLowerCase();
  const mimeType = extension === '.jpg' || extension === '.jpeg'
    ? 'image/jpeg'
    : extension === '.webp'
      ? 'image/webp'
      : extension === '.bmp'
        ? 'image/bmp'
        : 'image/png';
  return `data:${mimeType};base64,${Buffer.from(buf).toString('base64')}`;
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
  // 官方 Wan 2.7 图像编辑示例先传图片、最后传编辑指令；图 N 即图片数组顺序。
  const content = refImages.map((image) => ({ image }));
  content.push({ text: task.compiledPrompt });
  return {
    model: task.modelId,
    input: { messages: [{ role: 'user', content }] },
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
  const endpoint = resolveDashScopeEndpoint(region, baseUrl);

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
      let json;
      try {
        json = await request('POST', SYNC_SUBMIT_PATH, { body, signal });
      } catch (error) {
        if (!isSynchronousUnsupported(error)) throw error;
        json = await request('POST', ASYNC_SUBMIT_PATH, {
          body,
          signal,
          headers: { 'X-DashScope-Async': 'enable' },
        });
        const providerTaskId = json?.output?.task_id;
        if (!providerTaskId) {
          throw new DashScopeProviderError('PROVIDER_TASK_ID_MISSING', 'DashScope 异步调用未返回 task_id。', false);
        }
        return {
          providerTaskId,
          requestId: json?.request_id,
          executionMode: 'asynchronous',
        };
      }

      const images = resultImages(json?.output);
      if (images.length > 0) {
        const requestId = json?.request_id;
        const providerTaskId = `sync:${requestId || task.runId || task.taskId}`;
        return {
          providerTaskId,
          requestId,
          executionMode: 'synchronous',
          initialStatus: {
            providerTaskId,
            requestId,
            state: 'succeeded',
            images,
            usage: json?.usage,
          },
        };
      }
      const providerTaskId = json?.output?.task_id;
      if (!providerTaskId) {
        throw new DashScopeProviderError('PROVIDER_RESPONSE_INVALID', 'DashScope 同步调用未返回生成图片。', false);
      }
      return {
        providerTaskId,
        requestId: json?.request_id,
        executionMode: 'asynchronous',
      };
    },

    async getStatus(providerTaskId) {
      const json = await request('GET', TASK_PATH(providerTaskId));
      const output = json?.output ?? {};
      const state = normalizeTaskState(output.task_status);
      const images = resultImages(output);

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
