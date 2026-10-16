class ReasoningSessionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ReasoningSessionError";
    this.code = code;
  }
}
class ReasoningSessionGuard {
  constructor() {
    this.runId = null;
    this.fullReasoningRuns = 0;
    this.continuations = 0;
  }
  begin(runId) {
    if (this.fullReasoningRuns !== 0) {
      throw new ReasoningSessionError("MULTIPLE_REASONING_RUNS", "Visual Analysis \u6BCF\u4E2A\u9879\u76EE\u53EA\u5141\u8BB8\u4E00\u6B21\u5B8C\u6574 AI \u521B\u610F\u63A8\u7406");
    }
    if (typeof runId !== "string" || !runId.trim()) {
      throw new ReasoningSessionError("RUN_ID_REQUIRED", "Deep Creative Director \u5FC5\u987B\u63D0\u4F9B runId");
    }
    this.runId = runId.trim();
    this.fullReasoningRuns = 1;
    return this.snapshot();
  }
  continueSameSession(runId) {
    if (!this.runId || runId !== this.runId) {
      throw new ReasoningSessionError("SESSION_MISMATCH", "\u683C\u5F0F\u4FEE\u590D\u5FC5\u987B\u6CBF\u7528\u539F Deep Creative Director runId");
    }
    if (this.continuations >= 1) {
      throw new ReasoningSessionError("REPAIR_LIMIT_EXCEEDED", "\u540C\u4E00\u4F1A\u8BDD\u6700\u591A\u5141\u8BB8\u4E00\u6B21\u9650\u5B9A\u683C\u5F0F\u4FEE\u590D");
    }
    this.continuations += 1;
    return this.snapshot();
  }
  reuse(runId) {
    if (this.fullReasoningRuns !== 0) {
      throw new ReasoningSessionError("MULTIPLE_REASONING_RUNS", "\u7F13\u5B58\u590D\u7528\u4E0D\u80FD\u8986\u76D6\u5DF2\u7ECF\u53D1\u751F\u7684\u5B8C\u6574 AI \u521B\u610F\u63A8\u7406");
    }
    if (typeof runId !== "string" || !runId.trim()) {
      throw new ReasoningSessionError("RUN_ID_REQUIRED", "\u7F13\u5B58\u7ED3\u679C\u5FC5\u987B\u63D0\u4F9B\u539F\u59CB runId");
    }
    this.runId = runId.trim();
    return this.snapshot();
  }
  snapshot() {
    return Object.freeze({
      runId: this.runId,
      fullReasoningRuns: this.fullReasoningRuns,
      continuations: this.continuations
    });
  }
}
export {
  ReasoningSessionError,
  ReasoningSessionGuard
};
