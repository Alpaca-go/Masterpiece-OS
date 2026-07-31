import type {
  ApiProtocol,
  ConnectionTestResult,
  ModelType,
  ProviderKind,
} from '../shared/types.ts';

export interface ProviderConnectionTestCredentials {
  provider: ProviderKind;
  protocol: ApiProtocol;
  modelType: ModelType;
  baseUrl: string;
  model: string;
  apiKey: string;
}

interface ConnectionRequestSpec {
  serviceName: string;
  requestInterface: ConnectionTestResult['requestInterface'];
  url: string;
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  body?: Record<string, unknown>;
  timeoutMs: number;
}

interface ConnectionTestOptions {
  fetchImpl?: typeof fetch;
  logFailure?: (record: Record<string, unknown>) => void;
}

function parseBaseUrl(baseUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl.trim());
  } catch {
    throw new Error('Base URL 格式无效');
  }
  if (!['https:', 'http:'].includes(parsed.protocol)) {
    throw new Error('Base URL 必须使用 HTTP(S)');
  }
  return parsed;
}

function endpointUrl(baseUrl: string, suffix: string): string {
  const parsed = parseBaseUrl(baseUrl);
  const knownSuffixes = [
    '/chat/completions',
    '/images/generations',
    '/interactions',
    '/videos',
  ];
  let pathname = parsed.pathname.replace(/\/+$/, '');
  for (const known of knownSuffixes) {
    if (pathname.toLowerCase().endsWith(known)) {
      pathname = pathname.slice(0, -known.length);
      break;
    }
  }
  parsed.pathname = `${pathname}${suffix}`.replace(/\/{2,}/g, '/');
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString();
}

function dashScopeApiBaseUrl(baseUrl: string): string {
  const parsed = parseBaseUrl(baseUrl);
  const pathname = parsed.pathname.replace(/\/$/, '');
  parsed.pathname = /\/compatible-mode\/v1$/i.test(pathname)
    ? pathname.replace(/\/compatible-mode\/v1$/i, '/api/v1')
    : (pathname === '' || pathname === '/' ? '/api/v1' : pathname);
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/$/, '');
}

function requestSpec(credentials: ProviderConnectionTestCredentials): ConnectionRequestSpec {
  const authorization = { Authorization: `Bearer ${credentials.apiKey}` };
  const jsonHeaders = { ...authorization, 'Content-Type': 'application/json' };
  const serviceName = credentials.provider.trim() || 'unknown-provider';

  if (credentials.modelType === 'analysis') {
    if (credentials.protocol !== 'openai-chat-multimodal') {
      throw Object.assign(new Error('Chat 模型必须使用 Chat Completions 协议。'), {
        code: 'MODEL_PROFILE_INCOMPATIBLE',
      });
    }
    return {
      serviceName,
      requestInterface: 'chat_completions',
      url: endpointUrl(credentials.baseUrl, '/chat/completions'),
      method: 'POST',
      headers: jsonHeaders,
      body: {
        model: credentials.model,
        messages: [{ role: 'user', content: 'Reply with OK.' }],
        max_tokens: 1,
        stream: false,
      },
      timeoutMs: 25_000,
    };
  }

  if (credentials.modelType === 'video_generation') {
    if (credentials.protocol !== 'openai-video-generation') {
      throw Object.assign(new Error('Video 模型必须使用视频生成协议。'), {
        code: 'MODEL_PROFILE_INCOMPATIBLE',
      });
    }
    return {
      serviceName,
      requestInterface: 'video_generation',
      url: endpointUrl(credentials.baseUrl, '/videos'),
      method: 'POST',
      headers: jsonHeaders,
      body: {
        model: credentials.model,
        prompt: 'A static blue circle centered on a plain white background.',
      },
      timeoutMs: 120_000,
    };
  }

  if (credentials.modelType !== 'image_generation') {
    throw Object.assign(new Error(`不支持的模型类型：${credentials.modelType}`), {
      code: 'MODEL_TYPE_INVALID',
    });
  }

  if (credentials.protocol === 'dashscope-wan-image') {
    return {
      serviceName,
      requestInterface: 'image_generation_native_probe',
      url: `${dashScopeApiBaseUrl(credentials.baseUrl)}/tasks/00000000-0000-0000-0000-000000000000`,
      method: 'GET',
      headers: jsonHeaders,
      timeoutMs: 25_000,
    };
  }

  if (credentials.protocol === 'google-gemini-image') {
    return {
      serviceName,
      requestInterface: 'image_generation',
      url: endpointUrl(credentials.baseUrl, '/interactions'),
      method: 'POST',
      headers: {
        'x-goog-api-key': credentials.apiKey,
        'Content-Type': 'application/json',
      },
      body: {
        model: credentials.model,
        input: 'Generate a simple blue circle centered on a plain white background.',
        response_format: {
          type: 'image',
          mime_type: 'image/png',
          aspect_ratio: '1:1',
          image_size: '1K',
        },
      },
      timeoutMs: 120_000,
    };
  }

  if (['seedream-image', 'openai-image-generation'].includes(credentials.protocol)) {
    return {
      serviceName,
      requestInterface: 'image_generation',
      url: endpointUrl(credentials.baseUrl, '/images/generations'),
      method: 'POST',
      headers: jsonHeaders,
      body: {
        model: credentials.model,
        prompt: 'Generate a simple blue circle centered on a plain white background.',
      },
      timeoutMs: 120_000,
    };
  }

  throw Object.assign(new Error(`图片模型协议不受支持：${credentials.protocol}`), {
    code: 'MODEL_PROFILE_INCOMPATIBLE',
  });
}

function safeResponseBody(raw: string, apiKey: string): string {
  return raw
    .replaceAll(apiKey, '[REDACTED]')
    .replace(/(authorization|api[_-]?key)\s*[:=]\s*["']?[^"',\s}]+/gi, '$1=[REDACTED]')
    .slice(0, 16_384);
}

function recordFromBody(raw: string, statusText: string, headers?: Headers): {
  responseBody: string;
  errorCode?: string;
  errorMessage: string;
  requestId?: string;
} {
  let body: Record<string, any> = {};
  try {
    body = raw ? JSON.parse(raw) as Record<string, any> : {};
  } catch {
    // Non-JSON upstream bodies remain available verbatim.
  }
  const providerError = body.error && typeof body.error === 'object' ? body.error : {};
  const errorCode = String(
    providerError.code ?? body.code ?? body.error_code ?? '',
  ).trim() || undefined;
  const errorMessage = String(
    providerError.message ?? body.message ?? body.error_message ?? raw ?? statusText,
  ).trim() || statusText || '上游服务返回未知错误';
  const requestIdFromMessage = errorMessage.match(/request\s*id\s*[:：]\s*([a-zA-Z0-9_-]+)/i)?.[1];
  const requestId = String(
    headers?.get?.('x-request-id')
      ?? headers?.get?.('x-tt-logid')
      ?? providerError.request_id
      ?? providerError.requestId
      ?? body.request_id
      ?? body.requestId
      ?? body.id
      ?? requestIdFromMessage
      ?? '',
  ).trim() || undefined;
  return { responseBody: raw, errorCode, errorMessage, requestId };
}

export async function runProviderConnectionTest(
  credentials: ProviderConnectionTestCredentials,
  options: ConnectionTestOptions = {},
): Promise<ConnectionTestResult> {
  const spec = requestSpec(credentials);
  const started = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), spec.timeoutMs);
  const fetchImpl = options.fetchImpl ?? fetch;
  const logFailure = options.logFailure ?? ((record) => console.error(JSON.stringify(record)));
  try {
    const response = await fetchImpl(spec.url, {
      method: spec.method,
      headers: spec.headers,
      ...(spec.body ? { body: JSON.stringify(spec.body) } : {}),
      signal: controller.signal,
    });
    const raw = await response.text();
    const safeRaw = safeResponseBody(raw, credentials.apiKey);
    const details = recordFromBody(safeRaw, response.statusText, response.headers);

    // The native DashScope probe intentionally targets a nonexistent task.
    const nativeProbeAccepted = spec.requestInterface === 'image_generation_native_probe'
      && ![401, 403].includes(response.status)
      && response.status < 500;
    if (!response.ok && !nativeProbeAccepted) {
      const result: ConnectionTestResult = {
        ok: false,
        message: '连接测试失败',
        provider: spec.serviceName,
        requestInterface: spec.requestInterface,
        httpStatus: response.status,
        upstreamErrorCode: details.errorCode,
        upstreamErrorMessage: details.errorMessage,
        requestId: details.requestId,
        responseBody: details.responseBody,
        model: credentials.model,
        supportsImages: credentials.modelType === 'image_generation',
        elapsedMs: Math.round(performance.now() - started),
      };
      logFailure({
        event: 'PROVIDER_CONNECTION_TEST_FAILED',
        provider: result.provider,
        requestInterface: result.requestInterface,
        httpStatus: result.httpStatus,
        upstreamErrorCode: result.upstreamErrorCode,
        upstreamErrorMessage: result.upstreamErrorMessage,
        requestId: result.requestId,
        responseBody: result.responseBody,
      });
      return result;
    }

    return {
      ok: true,
      message: spec.requestInterface === 'chat_completions'
        ? 'Chat Completions 连接测试成功'
        : spec.requestInterface === 'video_generation'
          ? '视频生成接口已接受最小测试任务'
          : '图片生成接口已接受最小测试任务',
      provider: spec.serviceName,
      requestInterface: spec.requestInterface,
      httpStatus: response.status,
      requestId: details.requestId,
      model: credentials.model,
      supportsImages: credentials.modelType === 'image_generation',
      elapsedMs: Math.round(performance.now() - started),
    };
  } catch (error) {
    const isTimeout = (error as Error).name === 'AbortError';
    const upstreamErrorMessage = safeResponseBody(
      isTimeout ? '连接测试超时，请检查网络、Base URL 和模型状态' : (error as Error).message,
      credentials.apiKey,
    );
    const result: ConnectionTestResult = {
      ok: false,
      message: '连接测试失败',
      provider: spec.serviceName,
      requestInterface: spec.requestInterface,
      upstreamErrorCode: isTimeout ? 'CONNECTION_TEST_TIMEOUT' : 'CONNECTION_TEST_NETWORK_ERROR',
      upstreamErrorMessage,
      responseBody: '',
      model: credentials.model,
      supportsImages: credentials.modelType === 'image_generation',
      elapsedMs: Math.round(performance.now() - started),
    };
    logFailure({
      event: 'PROVIDER_CONNECTION_TEST_FAILED',
      provider: result.provider,
      requestInterface: result.requestInterface,
      upstreamErrorCode: result.upstreamErrorCode,
      upstreamErrorMessage: result.upstreamErrorMessage,
      requestId: result.requestId,
      responseBody: result.responseBody,
    });
    return result;
  } finally {
    clearTimeout(timeout);
  }
}
