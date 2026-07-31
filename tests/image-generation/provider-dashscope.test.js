// 生图功能 V1 Phase 3：DashScope Provider 适配器 + 下载校验 + 脱敏 的契约测试。
// 全部经可注入的 fetchImpl / fileReader 模拟，不触达真实网络或文件系统（下载校验除外，落临时目录）。
// 运行：node --test tests/image-generation/provider-dashscope.test.js

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  createDashScopeProvider,
  DashScopeProviderError,
  normalizeTaskState,
  buildSubmitBody,
  REGION_ENDPOINTS,
  resolveDashScopeEndpoint,
} from '@masterpiece/image-provider-dashscope/index.js';
import { downloadAndVerifyImage } from '@masterpiece/image-generation-runtime/download-verify.js';
import {
  redactUrl,
  redactProviderRequest,
  redactProviderResponse,
} from '@masterpiece/image-generation-runtime/redact.js';

// ── Mock 工具 ──

function makeResponse(obj, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof obj === 'string' ? obj : JSON.stringify(obj)),
  };
}

/** 记录所有 fetch 调用，便于断言路径与请求体。 */
function makeFetchSpy(responder) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    const res = await responder(url, options);
    return res;
  };
  return { fetchImpl, calls };
}

// 1x1 红色有效 PNG（sharp 可解码）
const PNG_1X1_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
function png1x1Buffer() {
  return Buffer.from(PNG_1X1_B64, 'base64');
}
// 用 sharp 生成一张真实有效的 PNG（确保 decode + transform 管线兼容）。
async function realPngBuffer(size = 32) {
  const sharp = (await import('sharp')).default;
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 232, g: 98, b: 45, alpha: 1 } } })
    .png()
    .toBuffer();
}

function sampleTask(refs = []) {
  return {
    modelId: 'wan2.7-image-pro',
    compiledPrompt: 'A warm brand hero image for 冯烫烫.',
    references: refs,
    parameters: { size: '1024*1024', outputCount: 1, watermark: false },
  };
}

// ── normalizeTaskState ──

test('normalizeTaskState 映射 DashScope 状态', () => {
  assert.equal(normalizeTaskState('PENDING'), 'pending');
  assert.equal(normalizeTaskState('RUNNING'), 'running');
  assert.equal(normalizeTaskState('SUCCEEDED'), 'succeeded');
  assert.equal(normalizeTaskState('FAILED'), 'failed');
  assert.equal(normalizeTaskState('UNKNOWN'), 'failed');
  assert.equal(normalizeTaskState('CANCELED'), 'cancelled');
  assert.equal(normalizeTaskState('CANCELLED'), 'cancelled');
  assert.equal(normalizeTaskState('weird'), 'pending');
});

// ── getCapabilities ──

test('getCapabilities 返回 wan2.7-image-pro 能力', async () => {
  const p = createDashScopeProvider({ apiKey: 'sk-test', fetchImpl: async () => makeResponse({}) });
  const caps = await p.getCapabilities();
  assert.equal(caps.providerId, 'dashscope');
  assert.equal(caps.modelId, 'wan2.7-image-pro');
  assert.equal(caps.supportsTextToImage, true);
  assert.equal(caps.supportsMultiImageReference, true);
  assert.equal(caps.supportsNegativePrompt, false);
  assert.equal(caps.supportsRemoteCancel, true);
  assert.equal(caps.maxReferenceImages, 9);
  assert.equal(caps.maxOutputCount, 1);
});

// ── 区域 / Endpoint ──

test('区域解析：beijing 与 singapore 映射到正确 Endpoint', () => {
  assert.equal(REGION_ENDPOINTS.beijing, 'https://dashscope.aliyuncs.com');
  assert.equal(REGION_ENDPOINTS.singapore, 'https://dashscope-intl.aliyuncs.com');
});

test('业务空间 compatible-mode Base URL 归一化为原生 API origin', () => {
  assert.equal(
    resolveDashScopeEndpoint('beijing', 'https://ws-example.cn-beijing.maas.aliyuncs.com/compatible-mode/v1'),
    'https://ws-example.cn-beijing.maas.aliyuncs.com',
  );
  assert.equal(
    resolveDashScopeEndpoint('beijing', 'https://ws-example.cn-beijing.maas.aliyuncs.com/api/v1/'),
    'https://ws-example.cn-beijing.maas.aliyuncs.com',
  );
});

// ── submit：同步优先，端点明确要求时才回退异步 ──

test('submit 默认同步调用且直接返回终态图片', async () => {
  const { fetchImpl, calls } = makeFetchSpy(async () =>
    makeResponse({
      output: {
        finished: true,
        choices: [{ message: { content: [{ type: 'image', image: 'https://cdn.example/sync.png' }] } }],
      },
      usage: { image_count: 1 },
      request_id: 'req-1',
    }),
  );
  const p = createDashScopeProvider({ apiKey: 'sk-test', fetchImpl });
  const result = await p.submit(sampleTask(), undefined);

  assert.equal(result.providerTaskId, 'sync:req-1');
  assert.equal(result.requestId, 'req-1');
  assert.equal(result.executionMode, 'synchronous');
  assert.equal(result.initialStatus.state, 'succeeded');
  assert.equal(result.initialStatus.images[0].url, 'https://cdn.example/sync.png');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation');
  assert.equal(calls[0].options.headers['X-DashScope-Async'], undefined);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer sk-test');
});

test('submit 在端点明确拒绝同步时改走异步专用路径', async () => {
  const { fetchImpl, calls } = makeFetchSpy(async (url) => {
    if (String(url).includes('multimodal-generation')) {
      return makeResponse(
        { message: 'current user api does not support synchronous calls' },
        { status: 403 },
      );
    }
    return makeResponse({ output: { task_id: 'dash-task-1' }, request_id: 'req-async' });
  });
  const p = createDashScopeProvider({ apiKey: 'sk-test', fetchImpl });
  const result = await p.submit(sampleTask(), undefined);

  assert.equal(result.providerTaskId, 'dash-task-1');
  assert.equal(result.executionMode, 'asynchronous');
  assert.equal(result.initialStatus, undefined);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, 'https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation/generation');
  assert.equal(calls[1].options.headers['X-DashScope-Async'], 'enable');
});

test('submit 同步响应缺少图片时抛 PROVIDER_RESPONSE_INVALID', async () => {
  const { fetchImpl } = makeFetchSpy(async () => makeResponse({ output: {}, request_id: 'r' }));
  const p = createDashScopeProvider({ apiKey: 'sk', fetchImpl });
  await assert.rejects(() => p.submit(sampleTask(), undefined), (e) => {
    assert.ok(e instanceof DashScopeProviderError);
    assert.equal(e.code, 'PROVIDER_RESPONSE_INVALID');
    return true;
  });
});

// ── buildSubmitBody：参考图编码 ──

test('buildSubmitBody 将参考图编码为 base64（单张保持标量）', async () => {
  const raw = Buffer.from('fake-png-bytes');
  const fileReader = async () => raw;
  const body = await buildSubmitBody(
    sampleTask([{ role: 'identity', localPath: '/x/logo.png', kind: 'image' }]),
    { fileReader },
  );
  assert.equal(body.model, 'wan2.7-image-pro');
  assert.equal(body.input.messages[0].content[1].text, 'A warm brand hero image for 冯烫烫.');
  assert.equal(body.parameters.n, 1);
  assert.equal(body.parameters.watermark, false);
  // 单张参考图 → ref_img 为标量 data URL
  assert.equal(body.input.messages[0].role, 'user');
  assert.equal(body.input.messages[0].content[0].image, `data:image/png;base64,${raw.toString('base64')}`);
});

test('buildSubmitBody 多张参考图编码为数组', async () => {
  const fileReader = async (p) => Buffer.from(`bytes:${p}`);
  const body = await buildSubmitBody(
    sampleTask([
      { role: 'identity', localPath: '/a', kind: 'image' },
      { role: 'product', localPath: '/b', kind: 'image' },
    ]),
    { fileReader },
  );
  assert.equal(body.input.messages[0].content.length, 3);
  assert.match(body.input.messages[0].content[0].image, /^data:image\/png;base64,/);
  assert.match(body.input.messages[0].content[1].image, /^data:image\/png;base64,/);
  assert.equal(body.input.messages[0].content[2].text, 'A warm brand hero image for 冯烫烫.');
});

// ── getStatus：轮询解析结果与状态 ──

test('getStatus 解析 SUCCEEDED 与结果图', async () => {
  const { fetchImpl } = makeFetchSpy(async () =>
    makeResponse({
      request_id: 'req-2',
      output: {
        task_status: 'SUCCEEDED',
        results: [{ url: 'https://cdn.example/x.png', b64_image: 'AAA' }],
      },
      usage: { image_count: 1 },
    }),
  );
  const p = createDashScopeProvider({ apiKey: 'sk', fetchImpl });
  const status = await p.getStatus('dash-task-1');
  assert.equal(status.state, 'succeeded');
  assert.equal(status.providerTaskId, 'dash-task-1');
  assert.equal(status.requestId, 'req-2');
  assert.equal(status.images.length, 1);
  assert.equal(status.images[0].url, 'https://cdn.example/x.png');
  assert.equal(status.images[0].b64, 'AAA');
  assert.deepEqual(status.usage, { image_count: 1 });
});

test('getStatus 解析 FAILED 并在 error.retryable=false', async () => {
  const { fetchImpl } = makeFetchSpy(async () =>
    makeResponse({ output: { task_status: 'FAILED', code: 'PROVIDER_TASK_FAILED', message: 'boom' } }),
  );
  const p = createDashScopeProvider({ apiKey: 'sk', fetchImpl });
  const status = await p.getStatus('t');
  assert.equal(status.state, 'failed');
  assert.ok(status.error);
  assert.equal(status.error.code, 'PROVIDER_TASK_FAILED');
  assert.equal(status.error.retryable, false);
});

test('getStatus parses Wan 2.7 choices image content', async () => {
  const { fetchImpl } = makeFetchSpy(async () => makeResponse({
    output: {
      task_status: 'SUCCEEDED',
      choices: [{ message: { content: [{ type: 'image', image: 'https://cdn.example/wan.png' }] } }],
    },
  }));
  const p = createDashScopeProvider({ apiKey: 'sk', fetchImpl });
  const status = await p.getStatus('dash-task-1');
  assert.equal(status.state, 'succeeded');
  assert.equal(status.images.length, 1);
  assert.equal(status.images[0].url, 'https://cdn.example/wan.png');
});

// ── cancel ──

test('cancel 发送 POST 到 cancel 路径', async () => {
  const { fetchImpl, calls } = makeFetchSpy(async () => makeResponse({}));
  const p = createDashScopeProvider({ apiKey: 'sk', fetchImpl });
  await p.cancel('dash-task-9');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://dashscope.aliyuncs.com/api/v1/tasks/dash-task-9/cancel');
  assert.equal(calls[0].options.method, 'POST');
});

// ── 错误归一化（§10.4 重试策略） ──

test('错误归一化：401/403 → AUTH_FAILED 不可重试', async () => {
  const { fetchImpl } = makeFetchSpy(async () => makeResponse({ message: 'unauthorized', code: 'AuthFailed' }, { status: 401 }));
  const p = createDashScopeProvider({ apiKey: 'sk', fetchImpl });
  await assert.rejects(() => p.submit(sampleTask(), undefined), (e) => {
    assert.equal(e.code, 'PROVIDER_AUTH_FAILED');
    assert.equal(e.retryable, false);
    return true;
  });
});

test('错误归一化：429 → RATE_LIMITED 可重试', async () => {
  const { fetchImpl } = makeFetchSpy(async () => makeResponse({ message: 'rate' }, { status: 429 }));
  const p = createDashScopeProvider({ apiKey: 'sk', fetchImpl });
  await assert.rejects(() => p.submit(sampleTask(), undefined), (e) => {
    assert.equal(e.code, 'PROVIDER_RATE_LIMITED');
    assert.equal(e.retryable, true);
    return true;
  });
});

test('错误归一化：5xx → SERVER_ERROR 可重试', async () => {
  const { fetchImpl } = makeFetchSpy(async () => makeResponse({ message: 'down' }, { status: 503 }));
  const p = createDashScopeProvider({ apiKey: 'sk', fetchImpl });
  await assert.rejects(() => p.submit(sampleTask(), undefined), (e) => {
    assert.equal(e.code, 'PROVIDER_SERVER_ERROR');
    assert.equal(e.retryable, true);
    return true;
  });
});

test('错误归一化：400 → REQUEST_INVALID 不可重试', async () => {
  const { fetchImpl } = makeFetchSpy(async () => makeResponse({ message: 'bad' }, { status: 400 }));
  const p = createDashScopeProvider({ apiKey: 'sk', fetchImpl });
  await assert.rejects(() => p.submit(sampleTask(), undefined), (e) => {
    assert.equal(e.code, 'PROVIDER_REQUEST_INVALID');
    assert.equal(e.retryable, false);
    return true;
  });
});

test('错误归一化：网络异常 → NETWORK_ERROR 可重试', async () => {
  const fetchImpl = async () => {
    throw new Error('ECONNRESET');
  };
  const p = createDashScopeProvider({ apiKey: 'sk', fetchImpl });
  await assert.rejects(() => p.submit(sampleTask(), undefined), (e) => {
    assert.equal(e.code, 'PROVIDER_NETWORK_ERROR');
    assert.equal(e.retryable, true);
    return true;
  });
});

test('错误归一化：无效 JSON 但 HTTP 200 → RESPONSE_INVALID 不可重试', async () => {
  const fetchImpl = async () => makeResponse('not-json{', { status: 200 });
  const p = createDashScopeProvider({ apiKey: 'sk', fetchImpl });
  await assert.rejects(() => p.submit(sampleTask(), undefined), (e) => {
    assert.equal(e.code, 'PROVIDER_RESPONSE_INVALID');
    assert.equal(e.retryable, false);
    return true;
  });
});

test('缺少 API Key 构造即抛 PROVIDER_CONFIG_MISSING', () => {
  assert.throws(() => createDashScopeProvider({ fetchImpl: async () => makeResponse({}) }), (e) => {
    assert.equal(e.code, 'PROVIDER_CONFIG_MISSING');
    return true;
  });
});

// ── _meta 脱敏 ──

test('_meta 不暴露真实 API Key（Authorization 已脱敏）', () => {
  const p = createDashScopeProvider({ apiKey: 'sk-super-secret', fetchImpl: async () => makeResponse({}) });
  assert.equal(p._meta.redactedHeaders.Authorization, 'Bearer [REDACTED]');
  assert.equal(p._meta.region, 'beijing');
  assert.equal(p._meta.modelId, 'wan2.7-image-pro');
  assert.equal(p._meta.endpoint, REGION_ENDPOINTS.beijing);
});

// ── download-verify（落临时目录，真实 sharp 解码） ──

test('downloadAndVerifyImage 经 url 下载、校验、原子写入、缩略图', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'img-gen-test-'));
  try {
    const buf = await realPngBuffer(32);
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      headers: { get: (k) => (k.toLowerCase() === 'content-type' ? 'image/png' : null) },
      arrayBuffer: async () => buf,
    });
    const targetPath = path.join(dir, 'images', 'image-01.png');
    const thumbPath = path.join(dir, 'thumbnails', 'image-01.webp');
    const out = await downloadAndVerifyImage({ url: 'https://cdn.example/x.png', targetPath, thumbnailPath: thumbPath, fetchImpl });

    assert.equal(out.downloadFailed, false);
    assert.equal(out.mimeType, 'image/png');
    assert.equal(out.sizeBytes, buf.length);
    assert.ok(out.sha256 && out.sha256.length === 64);
    assert.equal(out.decoded, true);
    assert.equal(out.written, true);
    assert.equal(out.thumbnailWritten, true);
    assert.equal(out.width, 32);
    assert.equal(out.height, 32);

    // 原子写入结果确实存在
    const exists = await fs.readFile(targetPath);
    assert.equal(exists.length, buf.length);
    // 缩略图已生成
    const thumb = await fs.readFile(thumbPath);
    assert.ok(thumb.length > 0);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('downloadAndVerifyImage 经 b64 下载并落盘', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'img-gen-test-'));
  try {
    const buf = await realPngBuffer(16);
    const targetPath = path.join(dir, 'b64.png');
    const out = await downloadAndVerifyImage({ b64: buf.toString('base64'), targetPath });
    assert.equal(out.downloadFailed, false);
    assert.equal(out.written, true);
    assert.equal(out.decoded, true);
    assert.ok((await fs.readFile(targetPath)).length > 0);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('downloadAndVerifyImage HTTP 非 200 → downloadFailed', async () => {
  const fetchImpl = async () => ({ ok: false, status: 404, headers: { get: () => null }, arrayBuffer: async () => Buffer.alloc(0) });
  const out = await downloadAndVerifyImage({ url: 'https://x/y.png', targetPath: '/tmp/x.png', fetchImpl });
  assert.equal(out.downloadFailed, true);
  assert.match(out.error, /404/);
});

test('downloadAndVerifyImage retries transient fetch failures and preserves the signed URL', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'img-gen-retry-'));
  const signedUrl = 'https://cdn.example/x.png?Expires=123&Signature=secret';
  let calls = 0;
  try {
    const buf = await realPngBuffer(8);
    const fetchImpl = async (url) => {
      calls += 1;
      assert.equal(url, signedUrl);
      if (calls < 3) throw Object.assign(new Error('fetch failed'), { cause: { code: 'ECONNRESET' } });
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'image/png' },
        arrayBuffer: async () => buf,
      };
    };
    const out = await downloadAndVerifyImage({
      url: signedUrl,
      targetPath: path.join(dir, 'retry.png'),
      fetchImpl,
      retryDelayMs: 0,
      sleep: async () => undefined,
    });
    assert.equal(calls, 3);
    assert.equal(out.downloadFailed, false);
    assert.equal(out.written, true);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('downloadAndVerifyImage does not retry a deterministic 403 response', async () => {
  let calls = 0;
  const out = await downloadAndVerifyImage({
    url: 'https://cdn.example/private.png?Signature=invalid',
    targetPath: '/tmp/private.png',
    fetchImpl: async () => {
      calls += 1;
      return { ok: false, status: 403, headers: { get: () => 'application/xml' } };
    },
    retryDelayMs: 0,
    sleep: async () => undefined,
  });
  assert.equal(calls, 1);
  assert.equal(out.downloadFailed, true);
  assert.match(out.error, /403/);
});

test('downloadAndVerifyImage 既无 url 也无 b64 → downloadFailed', async () => {
  const out = await downloadAndVerifyImage({ targetPath: '/tmp/x.png' });
  assert.equal(out.downloadFailed, true);
});

// ── redact ──

test('redactUrl 剥离鉴权查询参数并只保留 host+path', () => {
  const u = redactUrl('https://cdn.example/path/x.png?Signature=abc&token=secret&foo=bar');
  assert.equal(u, 'https://cdn.example/path/x.png');
});

test('redactUrl 非法输入 → [REDACTED_URL]', () => {
  assert.equal(redactUrl('://not a url'), '[REDACTED_URL]');
});

test('redactProviderRequest 省略 ref_img base64，Authorization 脱敏', () => {
  const r = redactProviderRequest({
    endpoint: 'https://dashscope.aliyuncs.com',
    region: 'beijing',
    modelId: 'wan2.7-image-pro',
    body: { model: 'wan2.7-image-pro', input: { messages: [{ role: 'user', content: [{ text: 'p' }, { image: 'data:image/png;base64,AAAA' }] }] } },
  });
  assert.equal(r.authorization, '[REDACTED]');
  assert.equal(r.endpoint, 'https://dashscope.aliyuncs.com');
  assert.equal(r.body.input.messages[0].content[1].image, '[reference image, base64 omitted]');
});

test('redactProviderResponse 仅保留脱敏结果摘要', () => {
  const r = redactProviderResponse({
    requestId: 'req-1',
    providerTaskId: 't-1',
    state: 'succeeded',
    model: 'wan2.7-image-pro',
    parameters: { size: '1024*1024' },
    usage: { image_count: 1 },
    images: [{ url: 'https://cdn.example/x.png?Signature=secret', b64: 'AAAA', mimeType: 'image/png' }],
  });
  assert.equal(r.request_id, 'req-1');
  assert.equal(r.providerTaskId, 't-1');
  assert.equal(r.state, 'succeeded');
  assert.equal(r.results[0].url, 'https://cdn.example/x.png');
  assert.equal(r.results[0].hasB64, true);
});
