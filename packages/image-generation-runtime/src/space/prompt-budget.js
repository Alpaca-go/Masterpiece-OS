// Prompt budget guard for the Phase 9B-quality space compiler.
//
// r10.4 regression repair — the budget is SPLIT into two distinct layers:
//
//   1. Compiler / Quality Prompt Budget (monitoring, never fail-closed).
//      The historical 7500-char figure is kept here as a quality / bloat
//      signal: exceeding it emits a warn finding
//      (SPACE_PROMPT_ABOVE_QUALITY_BUDGET) and sets
//      `qualityBudgetExceeded: true` on the budget + trace, but it does NOT
//      block generation. Recovery doc §12 design centers stay as warn tiers:
//        target 8000–9500, warn > 10000.
//
//   2. Provider Hard Limit (fail-closed).
//      The only length that blocks is the real Provider capability, read from
//      the Seedream Adapter Capability (`prompt.maxCharacters`, currently
//      12000). It is resolved through resolveProviderPromptLimit() so this
//      module never re-declares the number; the adapter capability is the
//      single source of truth. Exceeding it emits the block finding
//      SPACE_PROMPT_EXCEEDS_ADAPTER_LIMIT.
//
// Also computes positive/negative character ratio (§12.1): positive
// architecture/material/lighting/function content should be >= 70% and
// negatives <= 30%.

import { SEEDREAM_ADAPTER_CAPABILITY } from '../vnext/seedream-adapter.js';

const QUALITY_BUDGET = 7_500;
const TARGET_MAX = 9500;
const WARN = 10_000;

// Resolve the Provider hard limit from an Adapter Capability, falling back to
// the Seedream capability (the single source of truth) when the caller does
// not thread one through. Never hard-codes the number here.
export function resolveProviderPromptLimit(providerCapability) {
  const declared = Number(providerCapability?.prompt?.maxCharacters);
  if (Number.isFinite(declared) && declared > 0) return declared;
  return SEEDREAM_ADAPTER_CAPABILITY.prompt.maxCharacters;
}

export function measurePromptBudget(finalPrompt, blockTextsByName = {}, options = {}) {
  const chars = [...String(finalPrompt ?? '')].length;
  const providerLimit = Number.isFinite(Number(options.providerLimit)) && Number(options.providerLimit) > 0
    ? Number(options.providerLimit)
    : resolveProviderPromptLimit(options.providerCapability);

  const blockChars = Object.values(blockTextsByName).reduce(
    (sum, text) => sum + [...String(text ?? '')].length,
    0,
  );

  // Positive architecture blocks are the building-led content; the negative
  // block is whatever carries prohibition language.
  const positiveBlockNames = [
    'spatial_intent', 'architecture_language', 'architecture_context',
    'architecture_function_bridge', 'architectural_concept', 'architecture_dna',
    'material', 'lighting', 'composition', 'rendering',
  ];
  const negativeBlockNames = ['negative_constraints'];

  let positiveChars = 0;
  let negativeChars = 0;
  for (const [name, text] of Object.entries(blockTextsByName)) {
    const len = [...String(text ?? '')].length;
    if (negativeBlockNames.includes(name)) negativeChars += len;
    else positiveChars += len;
  }
  const classified = positiveChars + negativeChars;
  const positiveRatio = classified > 0 ? positiveChars / classified : null;
  const negativeRatio = classified > 0 ? negativeChars / classified : null;

  const qualityBudgetExceeded = chars > QUALITY_BUDGET;

  const findings = [];
  // Provider Hard Limit — the ONLY length that blocks.
  if (chars > providerLimit) {
    findings.push({ code: 'SPACE_PROMPT_EXCEEDS_ADAPTER_LIMIT', severity: 'block', detail: `${chars} > provider ${providerLimit}` });
  }
  // Quality / bloat monitoring — warn only, never fail-closed.
  if (qualityBudgetExceeded) {
    findings.push({ code: 'SPACE_PROMPT_ABOVE_QUALITY_BUDGET', severity: 'warn', detail: `${chars} > quality budget ${QUALITY_BUDGET}` });
  }
  if (chars > WARN) {
    findings.push({ code: 'SPACE_PROMPT_LONG', severity: 'warn', detail: `${chars} > ${WARN}` });
  }
  if (chars > TARGET_MAX && chars <= WARN) {
    findings.push({ code: 'SPACE_PROMPT_ABOVE_TARGET', severity: 'warn', detail: `${chars} > target ${TARGET_MAX}` });
  }
  if (negativeRatio != null && negativeRatio > 0.30) {
    findings.push({ code: 'SPACE_NEGATIVE_DENSITY_TOO_HIGH', severity: 'warn', detail: `negative ${(negativeRatio * 100).toFixed(1)}% > 30%` });
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
    status: findings.some((f) => f.severity === 'block') ? 'blocked' : 'pass',
  };
}

export function assertPromptBudget(budget) {
  if (budget.status === 'blocked') {
    throw Object.assign(
      new Error(`SPACE_PROMPT_BUDGET_BLOCKED: ${budget.findings.map((f) => f.code).join(', ')}`),
      { code: 'SPACE_PROMPT_BUDGET_BLOCKED', budget },
    );
  }
  return budget;
}
