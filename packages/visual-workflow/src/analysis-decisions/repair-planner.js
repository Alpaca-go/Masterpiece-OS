import { MAX_REPAIR_ATTEMPTS } from "./contracts.js";
function buildAiBatches(issues) {
  if (!issues.length) return [];
  return [{
    id: "repair-batch-01",
    strategy: "ai_from_evidence",
    fieldPaths: issues.map((issue) => issue.path),
    evidencePaths: [...new Set(issues.flatMap((issue) => issue.requiredEvidencePaths))],
    evidenceRefs: [...new Set(issues.flatMap((issue) => issue.availableEvidenceRefs))]
  }];
}
function createRepairPlan(input) {
  if (!Number.isInteger(input.attempt) || input.attempt < 1) {
    throw Object.assign(new Error("Repair attempt must start at 1."), {
      code: "REPAIR_ATTEMPT_INVALID"
    });
  }
  if (input.attempt > MAX_REPAIR_ATTEMPTS) {
    throw Object.assign(
      new Error(`Repair attempts exhausted after ${MAX_REPAIR_ATTEMPTS} attempts.`),
      { code: "REPAIR_ATTEMPTS_EXHAUSTED" }
    );
  }
  const byStrategy = (strategy) => input.issues.filter((issue) => issue.repairStrategy === strategy);
  const aiIssues = byStrategy("ai_from_evidence").filter((issue) => issue.severity === "repairable");
  return {
    deliverable: input.deliverable,
    attempt: input.attempt,
    deterministic: byStrategy("deterministic"),
    aiBatches: buildAiBatches(aiIssues),
    systemDefaults: byStrategy("system_default"),
    ignored: byStrategy("ignore_for_current_task"),
    requiresConfirmation: byStrategy("ask_user"),
    fatal: input.issues.filter((issue) => issue.severity === "fatal" || issue.repairStrategy === "none")
  };
}
export {
  createRepairPlan
};
