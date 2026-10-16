function createRepairAuditAccumulator() {
  return {
    repaired: /* @__PURE__ */ new Map(),
    defaulted: /* @__PURE__ */ new Set(),
    ignored: /* @__PURE__ */ new Set(),
    unresolved: /* @__PURE__ */ new Map(),
    conflicts: [],
    errors: []
  };
}
function auditField(path, strategy, metadata) {
  return {
    path,
    strategy,
    previousState: "missing",
    ...metadata ? {
      newStatus: metadata.status,
      confidence: metadata.confidence,
      evidenceRefs: [...metadata.evidenceRefs]
    } : {}
  };
}
function buildAnalysisRepairAudit(input) {
  return {
    schemaVersion: "1.0",
    repairVersion: "1.0",
    runId: input.runId,
    status: input.status,
    attempts: input.attempts,
    modelCallCount: input.modelCallCount,
    sourceFingerprint: input.sourceFingerprint,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    repairedFields: [...input.accumulator.repaired.entries()].map(([path, metadata]) => auditField(path, "ai_from_evidence", metadata)),
    defaultedFields: [...input.accumulator.defaulted].map((path) => auditField(path, "system_default")),
    ignoredFields: [...input.accumulator.ignored].map((path) => auditField(path, "ignore_for_current_task")),
    unresolvedFields: [...input.accumulator.unresolved.values()].map((issue) => auditField(issue.path, issue.repairStrategy)),
    conflicts: [...new Set(input.accumulator.conflicts)],
    clarificationQuestions: structuredClone(input.clarificationQuestions),
    errors: structuredClone(input.accumulator.errors)
  };
}
export {
  buildAnalysisRepairAudit,
  createRepairAuditAccumulator
};
