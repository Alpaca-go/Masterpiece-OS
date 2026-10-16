import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
const DEFAULT_BASE_URL = "https://ark.cn-beijing.volces.com/api/plan/v3";
const TEXT_EXTENSIONS = /* @__PURE__ */ new Set([".md", ".markdown", ".txt", ".json"]);
const IMAGE_MIME_TYPES = Object.freeze({
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp"
});
const MAX_DOCUMENT_CHARACTERS = 25e4;
const MAX_IMAGE_EDGE = 1600;
const IMAGE_JPEG_QUALITY = 82;
class VolcengineReasonerError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "VolcengineReasonerError";
    this.code = code;
  }
}
function redact(value, secret) {
  const message = String(value || "");
  return secret ? message.split(secret).join("[REDACTED]") : message;
}
function completionUrl(baseUrl) {
  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new VolcengineReasonerError(
      "VOLCENGINE_BASE_URL_INVALID",
      "Volcengine base URL \u5FC5\u987B\u662F\u6709\u6548\u7684 HTTP(S) \u5730\u5740"
    );
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new VolcengineReasonerError(
      "VOLCENGINE_BASE_URL_INVALID",
      "Volcengine base URL \u53EA\u5141\u8BB8 HTTP(S) \u5730\u5740"
    );
  }
  return parsed.pathname.endsWith("/chat/completions") ? parsed.toString() : `${parsed.toString().replace(/\/$/, "")}/chat/completions`;
}
async function defaultClient(request) {
  const response = await fetch(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify(request.body),
    signal: request.signal
  });
  const raw = await response.text();
  let value = null;
  try {
    value = raw ? JSON.parse(raw) : null;
  } catch {
  }
  if (!response.ok) {
    const detail = value?.error?.message || value?.message || response.statusText || "unknown error";
    throw new VolcengineReasonerError(
      "VOLCENGINE_API_ERROR",
      `Volcengine API \u8BF7\u6C42\u5931\u8D25\uFF08HTTP ${response.status}\uFF09\uFF1A${detail}`
    );
  }
  if (!value) throw new VolcengineReasonerError(
    "VOLCENGINE_RESPONSE_INVALID",
    "Volcengine API \u8FD4\u56DE\u4E86\u65E0\u6548 JSON"
  );
  return value;
}
function responseText(response) {
  if (typeof response?.outputText === "string") return response.outputText.trim();
  const content = response?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content.map((item) => typeof item === "string" ? item : item?.text || "").join("").trim();
  }
  return "";
}
function requestTimeoutError(maximumDurationMs) {
  const seconds = Math.max(1, Math.ceil(maximumDurationMs / 1e3));
  return new VolcengineReasonerError(
    "VOLCENGINE_REQUEST_TIMEOUT",
    `Volcengine \u8BF7\u6C42\u8D85\u8FC7 ${seconds} \u79D2\u4E0A\u9650`
  );
}
async function runClientWithDeadline(client, request, options = {}) {
  const parentSignal = options.signal;
  const maximumDurationMs = Number(options.maximumDurationMs);
  const hasDeadline = Number.isFinite(maximumDurationMs) && maximumDurationMs > 0;
  const controller = new AbortController();
  const abortFromParent = () => controller.abort(
    parentSignal.reason instanceof VolcengineReasonerError ? parentSignal.reason : new VolcengineReasonerError("VOLCENGINE_REQUEST_ABORTED", "Volcengine \u8BF7\u6C42\u5DF2\u53D6\u6D88")
  );
  if (parentSignal?.aborted) abortFromParent();
  else parentSignal?.addEventListener("abort", abortFromParent, { once: true });
  let timeout = null;
  if (hasDeadline) {
    timeout = setTimeout(
      () => controller.abort(requestTimeoutError(maximumDurationMs)),
      maximumDurationMs
    );
  }
  const aborted = new Promise((_, reject) => {
    const rejectFromSignal = () => reject(
      controller.signal.reason instanceof Error ? controller.signal.reason : new VolcengineReasonerError("VOLCENGINE_REQUEST_ABORTED", "Volcengine \u8BF7\u6C42\u5DF2\u53D6\u6D88")
    );
    if (controller.signal.aborted) rejectFromSignal();
    else controller.signal.addEventListener("abort", rejectFromSignal, { once: true });
  });
  const clientRequest = Promise.resolve().then(() => client({
    ...request,
    signal: controller.signal
  }));
  try {
    return await Promise.race([clientRequest, aborted]);
  } finally {
    if (timeout) clearTimeout(timeout);
    parentSignal?.removeEventListener("abort", abortFromParent);
  }
}
async function buildMultimodalUserContent(prompt, diagnostics) {
  const userMessage = (prompt.messages || []).find((message) => message.role === "user");
  const content = [{ type: "text", text: String(userMessage?.content || "") }];
  const inspectedAssetIds = [];
  for (const attachment of prompt.attachments || []) {
    if (!attachment.readable) {
      diagnostics.push({ assetId: attachment.assetId, status: "skipped", reason: "unreadable" });
      continue;
    }
    const extension = path.extname(attachment.path).toLowerCase();
    if (attachment.mediaType === "image" && IMAGE_MIME_TYPES[extension]) {
      try {
        const optimized = await sharp(attachment.path, { animated: false }).rotate().resize({
          width: MAX_IMAGE_EDGE,
          height: MAX_IMAGE_EDGE,
          fit: "inside",
          withoutEnlargement: true
        }).flatten({ background: "#ffffff" }).jpeg({ quality: IMAGE_JPEG_QUALITY, mozjpeg: true }).toBuffer();
        const encoded = optimized.toString("base64");
        content.push({ type: "text", text: `\u89C6\u89C9\u9644\u4EF6 ${attachment.assetId}\uFF08${path.basename(attachment.path)}\uFF09` });
        content.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${encoded}` } });
        inspectedAssetIds.push(attachment.assetId);
        diagnostics.push({
          assetId: attachment.assetId,
          status: "attached-as-optimized-image",
          encodedBytes: optimized.length
        });
      } catch (error) {
        diagnostics.push({
          assetId: attachment.assetId,
          status: "skipped",
          reason: `read-failed:${error.code || error.name}`
        });
      }
      continue;
    }
    if (attachment.mediaType === "document" && TEXT_EXTENSIONS.has(extension)) {
      try {
        const raw = await fs.readFile(attachment.path, "utf8");
        const text = raw.slice(0, MAX_DOCUMENT_CHARACTERS);
        const suffix = raw.length > text.length ? "\n[\u6587\u6863\u56E0\u957F\u5EA6\u9650\u5236\u5DF2\u622A\u65AD]" : "";
        content.push({
          type: "text",
          text: `\u6587\u6863\u9644\u4EF6 ${attachment.assetId}\uFF08${path.basename(attachment.path)}\uFF09

${text}${suffix}`
        });
        diagnostics.push({ assetId: attachment.assetId, status: "attached-as-text" });
      } catch (error) {
        diagnostics.push({
          assetId: attachment.assetId,
          status: "skipped",
          reason: `read-failed:${error.code || error.name}`
        });
      }
      continue;
    }
    diagnostics.push({
      assetId: attachment.assetId,
      status: "manifest-only",
      reason: "unsupported-direct-attachment"
    });
  }
  return { content, inspectedAssetIds };
}
function createVolcengineReasoner(options = {}) {
  const environment = options.environment || {};
  const apiKey = String(
    options.apiKey || environment.VOLCENGINE_API_KEY || environment.ARK_API_KEY || ""
  ).trim();
  const model = String(
    options.model || environment.VOLCENGINE_MODEL || environment.ARK_MODEL || ""
  ).trim();
  const baseUrl = String(
    options.baseUrl || environment.VOLCENGINE_BASE_URL || environment.ARK_BASE_URL || DEFAULT_BASE_URL
  ).trim();
  const client = options.client || defaultClient;
  const onDiagnostic = typeof options.onDiagnostic === "function" ? options.onDiagnostic : () => {
  };
  if (!apiKey) {
    throw new VolcengineReasonerError(
      "VOLCENGINE_API_KEY_MISSING",
      "\u672A\u68C0\u6D4B\u5230 Volcengine API Key\uFF0C\u65E0\u6CD5\u8FD0\u884C\u771F\u5B9E Volcengine / Ark \u5206\u6790"
    );
  }
  if (!model) {
    throw new VolcengineReasonerError(
      "VOLCENGINE_MODEL_MISSING",
      "\u672A\u914D\u7F6E Volcengine model\uFF0C\u65E0\u6CD5\u9009\u62E9 Ark \u591A\u6A21\u6001\u6A21\u578B"
    );
  }
  const url = completionUrl(baseUrl);
  return async function volcengineReasoner(context, options2 = {}) {
    if (Array.isArray(context)) {
      context = { prompt: { messages: context, attachments: [] }, ...options2 };
    }
    const diagnostics = [];
    const prepared = await buildMultimodalUserContent(context.prompt || { messages: [], attachments: [] }, diagnostics);
    for (const diagnostic of diagnostics) onDiagnostic(Object.freeze({ ...diagnostic }));
    const systemMessage = (context.prompt?.messages || []).find((message) => message.role === "system");
    const body = {
      model,
      messages: [
        { role: "system", content: String(systemMessage?.content || "") },
        { role: "user", content: prepared.content }
      ],
      stream: false
    };
    if (context.responseSchema && typeof context.responseSchema === "object") {
      body.response_format = {
        type: "json_schema",
        json_schema: {
          name: String(context.responseSchemaName || "structured_response"),
          strict: true,
          schema: context.responseSchema
        }
      };
    }
    const startedAtIso = (/* @__PURE__ */ new Date()).toISOString();
    const startedAtMs = Date.now();
    let response;
    let usage = null;
    try {
      response = await runClientWithDeadline(client, {
        url,
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body
      }, {
        signal: context.signal,
        maximumDurationMs: context.maximumDurationMs
      });
    } catch (error) {
      if (error instanceof VolcengineReasonerError) {
        error.message = redact(error.message, apiKey);
        throw error;
      }
      throw new VolcengineReasonerError(
        "VOLCENGINE_REQUEST_FAILED",
        `Volcengine \u8BF7\u6C42\u5931\u8D25\uFF1A${redact(error.message, apiKey)}`
      );
    }
    const latencyMs = Date.now() - startedAtMs;
    if (response && response.usage && typeof response.usage === "object") {
      const u = response.usage;
      usage = {
        inputTokens: typeof u.prompt_tokens === "number" ? u.prompt_tokens : null,
        outputTokens: typeof u.completion_tokens === "number" ? u.completion_tokens : null,
        totalTokens: typeof u.total_tokens === "number" ? u.total_tokens : typeof u.prompt_tokens === "number" && typeof u.completion_tokens === "number" ? u.prompt_tokens + u.completion_tokens : null,
        raw: Object.freeze({ ...u }),
        cost: "UNKNOWN"
      };
    }
    const reportMarkdown = responseText(response);
    if (!reportMarkdown) {
      throw new VolcengineReasonerError(
        "VOLCENGINE_EMPTY_REPORT",
        "Volcengine \u8FD4\u56DE\u4E86\u7A7A\u62A5\u544A\uFF0C\u5206\u6790\u5931\u8D25"
      );
    }
    return {
      runId: String(response.id || `volcengine-${crypto.randomUUID()}`),
      provider: "volcengine",
      model: String(response.model || model),
      completedAt: (/* @__PURE__ */ new Date()).toISOString(),
      reportMarkdown,
      benchmarkSources: [],
      inspectedAssetIds: prepared.inspectedAssetIds,
      // A3-C / A3-D / A3-E: provenance (additive; not asserted by
      // assertCanonicalAnalysisResult which still requires only
      // runId / provider / model / completedAt / reportMarkdown).
      provenance: Object.freeze({
        startedAt: startedAtIso,
        latencyMs,
        status: "ok",
        retryCount: 0,
        fallback: null,
        usage: usage ? Object.freeze(usage) : null
      })
    };
  };
}
export {
  VolcengineReasonerError,
  createVolcengineReasoner
};
