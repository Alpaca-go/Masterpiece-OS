import { ReasoningSessionGuard } from "./session-guard.js";
import { buildDeepCreativeDirectorPrompt } from "./prompt-builder.js";
import { performance } from "node:perf_hooks";
const DEEP_CREATIVE_DIRECTOR_PROVIDER_ID = "deep-creative-director-provider";
class DeepCreativeDirectorError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "DeepCreativeDirectorError";
    this.code = code;
  }
}
function requiredString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new DeepCreativeDirectorError("RESULT_INVALID", `${field} \u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32`);
  }
  return value.trim();
}
function validateResult(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DeepCreativeDirectorError("RESULT_INVALID", "Deep Creative Director \u5FC5\u987B\u8FD4\u56DE\u7ED3\u679C\u5BF9\u8C61");
  }
  return {
    runId: requiredString(value.runId, "deepCreativeDirector.runId"),
    provider: requiredString(value.provider, "deepCreativeDirector.provider"),
    model: requiredString(value.model, "deepCreativeDirector.model"),
    completedAt: requiredString(value.completedAt, "deepCreativeDirector.completedAt"),
    reportMarkdown: requiredString(value.reportMarkdown, "deepCreativeDirector.reportMarkdown"),
    benchmarkSources: Array.isArray(value.benchmarkSources) ? structuredClone(value.benchmarkSources) : [],
    inspectedAssetIds: Array.isArray(value.inspectedAssetIds) ? [...value.inspectedAssetIds] : []
  };
}
async function runDeepCreativeDirector(context, options = {}) {
  if (!context?.inventory || !context?.config) {
    throw new DeepCreativeDirectorError("INPUT_INVALID", "Deep Creative Director \u7F3A\u5C11 Asset Inventory \u6216\u5206\u6790\u914D\u7F6E");
  }
  const guard = options.sessionGuard || new ReasoningSessionGuard();
  const prompt = options.prompt || await buildDeepCreativeDirectorPrompt(context);
  let supplied;
  let executionSource;
  const modelStarted = performance.now();
  if (options.cachedResult) {
    executionSource = "reasoning-cache";
    supplied = options.cachedResult;
  } else if (typeof options.reasoner === "function") {
    executionSource = "reasoner";
    const abortController = new AbortController();
    const maximumDurationMs = Number(options.maximumDurationMs || context.config.performance.maximumMinutes * 6e4);
    const timeout = setTimeout(() => abortController.abort(), maximumDurationMs);
    try {
      supplied = await Promise.race([
        options.reasoner(Object.freeze({
          ...context,
          prompt,
          signal: abortController.signal,
          maximumDurationMs,
          deadlineAt: new Date(Date.now() + maximumDurationMs).toISOString()
        })),
        new Promise((_, reject) => abortController.signal.addEventListener("abort", () => reject(
          new DeepCreativeDirectorError("TIME_BUDGET_EXCEEDED", `Deep Creative Director \u8D85\u8FC7 ${context.config.performance.maximumMinutes} \u5206\u949F\u4E0A\u9650`)
        ), { once: true }))
      ]);
    } finally {
      clearTimeout(timeout);
    }
  } else {
    executionSource = "configured-result";
    supplied = context.config.deepCreativeDirectorResult;
  }
  const actualModelTimeMs = executionSource === "reasoner" ? performance.now() - modelStarted : 0;
  if (!supplied) {
    throw new DeepCreativeDirectorError(
      "REASONING_RESULT_MISSING",
      "\u7F3A\u5C11 Deep Creative Director \u7ED3\u679C\uFF1B\u8BF7\u914D\u7F6E\u5355\u4E00 reasoning adapter \u6216 deepCreativeDirectorResult"
    );
  }
  const result = validateResult(structuredClone(supplied));
  const session = executionSource === "reasoning-cache" ? guard.reuse(result.runId) : guard.begin(result.runId);
  return Object.freeze({ ...result, executionSource, session, prompt, actualModelTimeMs });
}
export {
  DEEP_CREATIVE_DIRECTOR_PROVIDER_ID,
  DeepCreativeDirectorError,
  runDeepCreativeDirector
};
