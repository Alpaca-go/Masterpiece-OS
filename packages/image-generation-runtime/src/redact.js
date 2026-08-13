// @masterpiece/image-generation-runtime/redact
// §11.4 Provider Request / Response 脱敏。
// 不得保存：Authorization Header、完整 API Key、包含鉴权参数的长期可复用链接、
//           base64 / data URI binary payload。
// 保存：request_id、providerTaskId、任务状态、模型、参数、usage、脱敏结果摘要、
//       相对路径信息（不含 absolute local path）。

const URL_AUTH_PARAMS = ['Signature', 'signature', 'X-Amz-Signature', 'token', 'Token', 'sts', 'STS'];

// Header keys whose value is a credential / auth token. These
// are stripped from any headers bag the Shared redaction layer
// sees, regardless of the underlying provider (Seedream /
// OpenAI / Google Gemini / Wan / etc.).
const AUTH_HEADER_DENY_LIST = Object.freeze([
  'authorization',
  'x-goog-api-key',
  'api-key',
  'x-api-key',
  'x-amz-security-token',
  'x-auth-token',
  'access-token',
  'x-ms-token',
]);

// Field-name deny-list for binary payloads. The redaction
// layer targets fields whose name suggests they carry a
// Reference image / file / data URI / base64 stream.
// We match by exact key OR by a key fragment; the fragments
// are intentionally narrow so we do not over-redact (e.g.
// `image_size` / `imageCount` are not stripped).
const BINARY_FIELD_DENY_EXACT = Object.freeze(new Set([
  'data',
  'b64',
  'b64_json',
  'base64',
  'buffer',
  'bytes',
  'file',
  'inlineData',
  'inline_data',
  'imageBase64',
  'image_base64',
]));

const BINARY_FIELD_DENY_PATTERNS = Object.freeze([
  /(?:^|[._-])(ref_?img|ref_?image)(?:[._-]|$)/i,
  /(?:^|[._-])(image|img)(?:[._-]|$)/i,
  /(?:^|[._-])(file|attachment)(?:[._-]|$)/i,
]);

// Patterns that signal a string carries binary bytes. We
// specifically detect `data:` URIs and long base64 streams;
// the Shared redaction layer does not attempt to detect other
// encodings (the deny list is intentionally narrow to avoid
// over-redaction of prompt text).
const DATA_URI_PREFIX = /^data:[^;,]+;base64,/i;
const LONG_BASE64_LIKE = /^[A-Za-z0-9+/_-]{200,}={0,2}$/;

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
 * Strip credential / auth headers from a headers bag. The
 * returned object is a shallow copy; absent keys are simply
 * omitted. Case-insensitive match.
 */
export function redactAuthHeaders(headers) {
  if (!headers || typeof headers !== 'object') return undefined;
  const out = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (AUTH_HEADER_DENY_LIST.includes(lower)) continue;
    out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Decide whether a string looks like a binary value. A
 * data URI is always binary (the prefix is the canonical
 * signal; the test scenarios use tiny base64 segments like
 * `data:image/png;base64,AAAA`); otherwise the string must
 * be long enough AND consist entirely of base64 alphabet
 * characters. The narrow heuristic avoids over-redacting
 * prompt text that happens to contain a long word.
 */
function looksLikeBinaryString(value) {
  if (typeof value !== 'string') return false;
  if (DATA_URI_PREFIX.test(value)) return true;
  if (value.length < 80) return false;
  if (LONG_BASE64_LIKE.test(value)) return true;
  return false;
}

/**
 * Decide whether a field name is a likely binary carrier. The
 * match is exact (small deny set) OR pattern-based (key
 * fragment). Field names that the Provider uses for metadata
 * about an image (e.g. `imageCount`, `imageSize`, `mimeType`)
 * are NOT in scope; the actual carrier keys (`image`,
 * `images`, `ref_img`, `data`, `b64`, `b64_json`, `file`,
 * `files`, `inlineData`, etc.) are.
 */
function isBinaryFieldName(key) {
  if (BINARY_FIELD_DENY_EXACT.has(key)) return true;
  for (const pattern of BINARY_FIELD_DENY_PATTERNS) {
    if (pattern.test(key)) return true;
  }
  return false;
}

function summarizeBinaryField(key, value) {
  // Backward-compatible surface: Wan `body.input.ref_img` is
  // an array of data URIs; the legacy redacted message is a
  // single string `[N reference image(s), base64 omitted]`.
  // We keep that exact format so existing audit consumers
  // (provider-dashscope.test.js, the run-store schema) keep
  // working. OpenAI multimodal `body.input.messages[].content[].image`
  // is a single data URI; the legacy redacted message is
  // `[reference image, base64 omitted]`. Other binary fields
  // fall back to a generic `[binary data omitted]` so the
  // audit still records the omission without leaking shape.
  if (key === 'ref_img' || key === 'refImg' || key === 'ref-image' || key === 'ref_img_base64') {
    const refs = Array.isArray(value) ? value : [value];
    return `[${refs.length} reference image(s), base64 omitted]`;
  }
  if (key === 'image' || key === 'imageBase64' || key === 'image_base64' || key === 'inlineData') {
    return '[reference image, base64 omitted]';
  }
  return '[binary data omitted]';
}

function redactObject(obj) {
  if (obj == null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((item) => {
    if (item && typeof item === 'object') return redactObject(item);
    return item;
  });
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const isBinary = isBinaryFieldName(key);
    if (isBinary) {
      if (typeof value === 'string' && looksLikeBinaryString(value)) {
        result[key] = summarizeBinaryField(key, value);
        continue;
      }
      if (Array.isArray(value)) {
        // For backward compatibility, the Wan `ref_img` array
        // is summarised as a single string; other binary
        // arrays are summarised element-wise.
        if (key === 'ref_img' || key === 'refImg' || key === 'ref-image' || key === 'ref_img_base64') {
          result[key] = summarizeBinaryField(key, value);
          continue;
        }
        result[key] = value.map((item) => {
          if (typeof item === 'string' && looksLikeBinaryString(item)) {
            return summarizeBinaryField(key, item);
          }
          if (item && typeof item === 'object') return redactObject(item);
          return item;
        });
        continue;
      }
      if (value && typeof value === 'object') {
        result[key] = redactObject(value);
        continue;
      }
    }
    if (value && typeof value === 'object') {
      result[key] = redactObject(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * 脱敏 Provider 请求，用于 provider-request.redacted.json。
 * Target-neutral recursive redaction: walks the entire body
 * tree and strips binary payloads keyed by well-known image /
 * file / data / base64 field names. The audit surface
 * preserves shape but never embeds raw Reference bytes,
 * signed-URL credentials, or API keys.
 *
 * Backward compatibility: the Wan / multi-model fields
 * `body.input.ref_img` (Wan) and `body.input.messages[].content[].image`
 * (OpenAI multimodal) are still redacted through the
 * `isBinaryFieldName` deny list (ref_img and image are both
 * covered). Other reference surfaces — Seedream `body.image[]`,
 * OpenAI multipart `body.files[]`, Gemini `body.input[].inlineData` —
 * are also redacted by the same deny list.
 *
 * @param {object} input { endpoint, region, modelId, body, headers }
 */
export function redactProviderRequest(input = {}) {
  const { endpoint, region, modelId, body, headers } = input;
  const safeBody = body ? redactObject(body) : undefined;
  return {
    endpoint,
    region,
    modelId,
    body: safeBody,
    authorization: '[REDACTED]',
    headers: redactAuthHeaders(headers),
  };
}

/**
 * 脱敏 Provider 响应，用于 provider-response.redacted.json。
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
