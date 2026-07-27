// @masterpiece/image-generation-runtime/redact
// §11.4 Provider Request / Response 脱敏。
// 不得保存：Authorization Header、完整 API Key、包含鉴权参数的长期可复用链接。
// 保存：request_id、providerTaskId、任务状态、模型、参数、usage、脱敏结果摘要、本地文件路径。

const URL_AUTH_PARAMS = ['Signature', 'signature', 'X-Amz-Signature', 'token', 'Token', 'sts', 'STS'];

/** 去掉 URL 中的鉴权查询参数，保留可展示的路径信息。 */
export function redactUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
  try {
    const u = new URL(rawUrl);
    for (const key of [...u.searchParams.keys()]) {
      if (URL_AUTH_PARAMS.some((p) => key.toLowerCase() === p.toLowerCase())) {
        u.searchParams.set(key, '[REDACTED]');
      }
    }
    // 短期可复用链接一律不保留 query，只留 host+pathname
    return `${u.origin}${u.pathname}`;
  } catch {
    return '[REDACTED_URL]';
  }
}

/**
 * 脱敏 Provider 请求，用于 provider-request.redacted.json。
 * @param {object} input { endpoint, region, modelId, body }
 */
export function redactProviderRequest(input = {}) {
  const { endpoint, region, modelId, body } = input;
  const safeBody = body ? JSON.parse(JSON.stringify(body)) : undefined;
  // 参考图 base64 体积大且非鉴权敏感，但不应长期保存原始数据 → 只留摘要
  if (safeBody?.input?.ref_img) {
    const refs = Array.isArray(safeBody.input.ref_img) ? safeBody.input.ref_img : [safeBody.input.ref_img];
    safeBody.input.ref_img = `[${refs.length} reference image(s), base64 omitted]`;
  }
  const content = safeBody?.input?.messages?.flatMap((message) => Array.isArray(message?.content) ? message.content : []) ?? [];
  for (const item of content) {
    if (item?.image && typeof item.image === 'string' && item.image.startsWith('data:')) {
      item.image = '[reference image, base64 omitted]';
    }
  }
  return {
    endpoint,
    region,
    modelId,
    body: safeBody,
    authorization: '[REDACTED]',
  };
}

/**
 * 脱敏 Provider 响应，用于 provider-response.redacted.json。
 * @param {object} input { requestId, providerTaskId, state, taskStatus, model, parameters, usage, images }
 */
export function redactProviderResponse(input = {}) {
  const { requestId, providerTaskId, state, taskStatus, model, parameters, usage, images } = input;
  return {
    request_id: requestId,
    providerTaskId,
    state,
    taskStatus,
    model,
    parameters,
    usage,
    results: (images ?? []).map((img, i) => ({
      index: i,
      url: redactUrl(img?.url),
      hasB64: Boolean(img?.b64),
      mimeType: img?.mimeType,
    })),
  };
}
