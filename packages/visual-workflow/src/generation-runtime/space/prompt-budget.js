import { SEEDREAM_ADAPTER_CAPABILITY } from "../generation/seedream-adapter.js";
const QUALITY_BUDGET = 7500;
const TARGET_MAX = 9500;
const WARN = 1e4;
function resolveProviderPromptLimit(providerCapability) {
  const declared = Number(providerCapability?.prompt?.maxCharacters);
  if (Number.isFinite(declared) && declared > 0) return declared;
  return SEEDREAM_ADAPTER_CAPABILITY.prompt.maxCharacters;
}
function measurePromptBudget(finalPrompt, blockTextsByName = {}, options = {}) {
  const chars = [...String(finalPrompt ?? "")].length;
  const providerLimit = Number.isFinite(Number(options.providerLimit)) && Number(options.providerLimit) > 0 ? Number(options.providerLimit) : resolveProviderPromptLimit(options.providerCapability);
  const blockChars = Object.values(blockTextsByName).reduce(
    (sum, text) => sum + [...String(text ?? "")].length,
    0
  );
  const positiveBlockNames = [
    "spatial_intent",
    "architecture_language",
    "architecture_context",
    "architecture_function_bridge",
    "architectural_concept",
    "architecture_dna",
    "material",
    "lighting",
    "composition",
    "rendering"
  ];
  const negativeBlockNames = ["negative_constraints"];
  let positiveChars = 0;
  let negativeChars = 0;
  for (const [name, text] of Object.entries(blockTextsByName)) {
    const len = [...String(text ?? "")].length;
    if (negativeBlockNames.includes(name)) negativeChars += len;
    else positiveChars += len;
  }
  const classified = positiveChars + negativeChars;
  const positiveRatio = classified > 0 ? positiveChars / classified : null;
  const negativeRatio = classified > 0 ? negativeChars / classified : null;
  const qualityBudgetExceeded = chars > QUALITY_BUDGET;
  const findings = [];
  if (chars > providerLimit) {
    findings.push({ code: "SPACE_PROMPT_EXCEEDS_ADAPTER_LIMIT", severity: "block", detail: `${chars} > provider ${providerLimit}` });
  }
  if (qualityBudgetExceeded) {
    findings.push({ code: "SPACE_PROMPT_ABOVE_QUALITY_BUDGET", severity: "warn", detail: `${chars} > quality budget ${QUALITY_BUDGET}` });
  }
  if (chars > WARN) {
    findings.push({ code: "SPACE_PROMPT_LONG", severity: "warn", detail: `${chars} > ${WARN}` });
  }
  if (chars > TARGET_MAX && chars <= WARN) {
    findings.push({ code: "SPACE_PROMPT_ABOVE_TARGET", severity: "warn", detail: `${chars} > target ${TARGET_MAX}` });
  }
  if (negativeRatio != null && negativeRatio > 0.3) {
    findings.push({ code: "SPACE_NEGATIVE_DENSITY_TOO_HIGH", severity: "warn", detail: `negative ${(negativeRatio * 100).toFixed(1)}% > 30%` });
  }
  return {
    chars,
    qualityBudget: QUALITY_BUDGET,
    targetMax: TARGET_MAX,
    warnAt: WARN,
    providerLimit,
    // Back-compat alias: the hard limit used to be called adapterLimit.
    adapterLimit: providerLimit,
    qualityBudgetExceeded,
    positiveChars,
    negativeChars,
    positiveRatio,
    negativeRatio,
    findings,
    status: findings.some((f) => f.severity === "block") ? "blocked" : "pass"
  };
}
function assertPromptBudget(budget) {
  if (budget.status === "blocked") {
    throw Object.assign(
      new Error(`SPACE_PROMPT_BUDGET_BLOCKED: ${budget.findings.map((f) => f.code).join(", ")}`),
      { code: "SPACE_PROMPT_BUDGET_BLOCKED", budget }
    );
  }
  return budget;
}
export {
  assertPromptBudget,
  measurePromptBudget,
  resolveProviderPromptLimit
};
