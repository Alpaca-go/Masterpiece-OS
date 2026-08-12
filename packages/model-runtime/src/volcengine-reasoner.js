// Visual Analysis A2-B — Volcengine / Ark multimodal reasoner.
//
// One Provider-specific HTTP client for the Volcengine (Ark / Doubao)
// multimodal chat-completion endpoint, following the same shape as
// @masterpiece/model-runtime/qwen-reasoner but bound to a different
// provider identity, base URL, error code namespace, and credential
// env vars.
//
// This module does NOT import from the Qwen reasoner; the two
// providers are kept independent so A1 stays untouched (the A1
// baseline contract lists the Qwen reasoner as BASELINE_CRITICAL).
//
// Adapter responsibilities (per A2 spec §17) carried here:
//   - provider identity
//   - authentication adaptation (Bearer + API key)
//   - endpoint
//   - request envelope (OpenAI-compatible chat completions)
//   - image / message adaptation (sharp optimize + data: URL)
//   - provider invocation (with deadline + cancellation)
//   - response adaptation
//   - provider error normalization (VOLCENGINE_* error codes)
//
// Adapter FORBIDDEN responsibilities (per A2 spec §18):
//   - Prompt semantics, analysis methodology, project persistence,
//     Reference First, Space, Packaging, report authority,
//     evaluation scoring.

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/plan/v3';
const TEXT_EXTENSIONS = new Set(['.md', '.markdown', '.txt', '.json']);
const IMAGE_MIME_TYPES = Object.freeze({
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
});
const MAX_DOCUMENT_CHARACTERS = 250_000;
const MAX_IMAGE_EDGE = 1600;
const IMAGE_JPEG_QUALITY = 82;

export class VolcengineReasonerError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'VolcengineReasonerError';
    this.code = code;
  }
}

function redact(value, secret) {
  const message = String(value || '');
  return secret ? message.split(secret).join('[REDACTED]') : message;
}

function completionUrl(baseUrl) {
  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new VolcengineReasonerError(
      'VOLCENGINE_BASE_URL_INVALID',
      'Volcengine base URL 必须是有效的 HTTP(S) 地址',
    );
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new VolcengineReasonerError(
      'VOLCENGINE_BASE_URL_INVALID',
      'Volcengine base URL 只允许 HTTP(S) 地址',
    );
  }
  return parsed.pathname.endsWith('/chat/completions')
    ? parsed.toString()
    : `${parsed.toString().replace(/\/$/, '')}/chat/completions`;
}

async function defaultClient(request) {
  const response = await fetch(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(request.body),
    signal: request.signal,
  });
  const raw = await response.text();
  let value = null;
  try { value = raw ? JSON.parse(raw) : null; } catch { /* handled as a bounded provider error below */ }
  if (!response.ok) {
    const detail = value?.error?.message || value?.message || response.statusText || 'unknown error';
    throw new VolcengineReasonerError(
      'VOLCENGINE_API_ERROR',
      `Volcengine API 请求失败（HTTP ${response.status}）：${detail}`,
    );
  }
  if (!value) throw new VolcengineReasonerError(
    'VOLCENGINE_RESPONSE_INVALID',
    'Volcengine API 返回了无效 JSON',
  );
  return value;
}

function responseText(response) {
  if (typeof response?.outputText === 'string') return response.outputText.trim();
  const content = response?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content.map((item) => typeof item === 'string' ? item : item?.text || '').join('').trim();
  }
  return '';
}

function requestTimeoutError(maximumDurationMs) {
  const seconds = Math.max(1, Math.ceil(maximumDurationMs / 1000));
  return new VolcengineReasonerError(
    'VOLCENGINE_REQUEST_TIMEOUT',
    `Volcengine 请求超过 ${seconds} 秒上限`,
  );
}

async function runClientWithDeadline(client, request, options = {}) {
  const parentSignal = options.signal;
  const maximumDurationMs = Number(options.maximumDurationMs);
  const hasDeadline = Number.isFinite(maximumDurationMs) && maximumDurationMs > 0;
  const controller = new AbortController();
  const abortFromParent = () => controller.abort(
    parentSignal.reason instanceof VolcengineReasonerError
      ? parentSignal.reason
      : new VolcengineReasonerError('VOLCENGINE_REQUEST_ABORTED', 'Volcengine 请求已取消'),
  );
  if (parentSignal?.aborted) abortFromParent();
  else parentSignal?.addEventListener('abort', abortFromParent, { once: true });

  let timeout = null;
  if (hasDeadline) {
    timeout = setTimeout(
      () => controller.abort(requestTimeoutError(maximumDurationMs)),
      maximumDurationMs,
    );
  }

  const aborted = new Promise((_, reject) => {
    const rejectFromSignal = () => reject(
      controller.signal.reason instanceof Error
        ? controller.signal.reason
        : new VolcengineReasonerError('VOLCENGINE_REQUEST_ABORTED', 'Volcengine 请求已取消'),
    );
    if (controller.signal.aborted) rejectFromSignal();
    else controller.signal.addEventListener('abort', rejectFromSignal, { once: true });
  });
  const clientRequest = Promise.resolve().then(() => client({
    ...request,
    signal: controller.signal,
  }));

  try {
    return await Promise.race([clientRequest, aborted]);
  } finally {
    if (timeout) clearTimeout(timeout);
    parentSignal?.removeEventListener('abort', abortFromParent);
  }
}

async function buildMultimodalUserContent(prompt, diagnostics) {
  const userMessage = (prompt.messages || []).find((message) => message.role === 'user');
  const content = [{ type: 'text', text: String(userMessage?.content || '') }];
  const inspectedAssetIds = [];
  for (const attachment of prompt.attachments || []) {
    if (!attachment.readable) {
      diagnostics.push({ assetId: attachment.assetId, status: 'skipped', reason: 'unreadable' });
      continue;
    }
    const extension = path.extname(attachment.path).toLowerCase();
    if (attachment.mediaType === 'image' && IMAGE_MIME_TYPES[extension]) {
      try {
        const optimized = await sharp(attachment.path, { animated: false })
          .rotate()
          .resize({
            width: MAX_IMAGE_EDGE,
            height: MAX_IMAGE_EDGE,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .flatten({ background: '#ffffff' })
          .jpeg({ quality: IMAGE_JPEG_QUALITY, mozjpeg: true })
          .toBuffer();
        const encoded = optimized.toString('base64');
        content.push({ type: 'text', text: `视觉附件 ${attachment.assetId}（${path.basename(attachment.path)}）` });
        content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${encoded}` } });
        inspectedAssetIds.push(attachment.assetId);
        diagnostics.push({
          assetId: attachment.assetId,
          status: 'attached-as-optimized-image',
          encodedBytes: optimized.length,
        });
      } catch (error) {
        diagnostics.push({
          assetId: attachment.assetId,
          status: 'skipped',
          reason: `read-failed:${error.code || error.name}`,
        });
      }
      continue;
    }
    if (attachment.mediaType === 'document' && TEXT_EXTENSIONS.has(extension)) {
      try {
        const raw = await fs.readFile(attachment.path, 'utf8');
        const text = raw.slice(0, MAX_DOCUMENT_CHARACTERS);
        const suffix = raw.length > text.length ? '\n[文档因长度限制已截断]' : '';
        content.push({
          type: 'text',
          text: `文档附件 ${attachment.assetId}（${path.basename(attachment.path)}）\n\n${text}${suffix}`,
        });
        diagnostics.push({ assetId: attachment.assetId, status: 'attached-as-text' });
      } catch (error) {
        diagnostics.push({
          assetId: attachment.assetId,
          status: 'skipped',
          reason: `read-failed:${error.code || error.name}`,
        });
      }
      continue;
    }
    diagnostics.push({
      assetId: attachment.assetId,
      status: 'manifest-only',
      reason: 'unsupported-direct-attachment',
    });
  }
  return { content, inspectedAssetIds };
}

/** Create a single-request Volcengine / Ark multimodal adapter using the OpenAI-compatible endpoint. */
export function createVolcengineReasoner(options = {}) {
  const environment = options.environment || process.env;
  const apiKey = String(
    options.apiKey
    || environment.VOLCENGINE_API_KEY
    || environment.ARK_API_KEY
    || '',
  ).trim();
  const model = String(
    options.model
    || environment.VOLCENGINE_MODEL
    || environment.ARK_MODEL
    || '',
  ).trim();
  const baseUrl = String(
    options.baseUrl
    || environment.VOLCENGINE_BASE_URL
    || environment.ARK_BASE_URL
    || DEFAULT_BASE_URL,
  ).trim();
  const client = options.client || defaultClient;
  const onDiagnostic = typeof options.onDiagnostic === 'function' ? options.onDiagnostic : () => {};

  if (!apiKey) {
    throw new VolcengineReasonerError(
      'VOLCENGINE_API_KEY_MISSING',
      '未检测到 Volcengine API Key，无法运行真实 Volcengine / Ark 分析',
    );
  }
  if (!model) {
    throw new VolcengineReasonerError(
      'VOLCENGINE_MODEL_MISSING',
      '未配置 Volcengine model，无法选择 Ark 多模态模型',
    );
  }
  const url = completionUrl(baseUrl);

  return async function volcengineReasoner(context, options = {}) {
    if (Array.isArray(context)) {
      context = { prompt: { messages: context, attachments: [] }, ...options };
    }
    const diagnostics = [];
    const prepared = await buildMultimodalUserContent(context.prompt || { messages: [], attachments: [] }, diagnostics);
    for (const diagnostic of diagnostics) onDiagnostic(Object.freeze({ ...diagnostic }));
    const systemMessage = (context.prompt?.messages || []).find((message) => message.role === 'system');
    const body = {
      model,
      messages: [
        { role: 'system', content: String(systemMessage?.content || '') },
        { role: 'user', content: prepared.content },
      ],
      stream: false,
    };
    if (context.responseSchema && typeof context.responseSchema === 'object') {
      body.response_format = {
        type: 'json_schema',
        json_schema: {
          name: String(context.responseSchemaName || 'structured_response'),
          strict: true,
          schema: context.responseSchema,
        },
      };
    }
    let response;
    try {
      response = await runClientWithDeadline(client, {
        url,
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body,
      }, {
        signal: context.signal,
        maximumDurationMs: context.maximumDurationMs,
      });
    } catch (error) {
      if (error instanceof VolcengineReasonerError) {
        error.message = redact(error.message, apiKey);
        throw error;
      }
      throw new VolcengineReasonerError(
        'VOLCENGINE_REQUEST_FAILED',
        `Volcengine 请求失败：${redact(error.message, apiKey)}`,
      );
    }
    const reportMarkdown = responseText(response);
    if (!reportMarkdown) {
      throw new VolcengineReasonerError(
        'VOLCENGINE_EMPTY_REPORT',
        'Volcengine 返回了空报告，分析失败',
      );
    }
    return {
      runId: String(response.id || `volcengine-${crypto.randomUUID()}`),
      provider: 'volcengine',
      model: String(response.model || model),
      completedAt: new Date().toISOString(),
      reportMarkdown,
      benchmarkSources: [],
      inspectedAssetIds: prepared.inspectedAssetIds,
    };
  };
}
