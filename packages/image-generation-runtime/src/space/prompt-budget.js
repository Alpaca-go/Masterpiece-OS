// Prompt budget guard for the Phase 9B-quality space compiler.
//
// Recovery doc §12:
//   target 8000–9500 chars, hard warn > 10000, block > 12000.
// The Seedream adapter caps at 7500, so we treat > 7500 as a hard block too
// (the provider would reject it). The doc's 9500 target is the design center;
// the adapter enforces the real ceiling. We report both.
//
// Also computes positive/negative character ratio (§12.1): positive
// architecture/material/lighting/function content should be >= 70% and
// negatives <= 30%.

const TARGET_MAX = 9500;
const WARN = 10_000;
const HARD_BLOCK = 12_000;
const ADAPTER_LIMIT = 7_500;

export function measurePromptBudget(finalPrompt, blockTextsByName = {}) {
  const chars = [...String(finalPrompt ?? '')].length;

  const blockChars = Object.values(blockTextsByName).reduce(
    (sum, text) => sum + [...String(text ?? '')].length, 0,
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

  const findings = [];
  if (chars > HARD_BLOCK) {
    findings.push({ code: 'SPACE_PROMPT_TOO_LONG', severity: 'block', detail: `${chars} > ${HARD_BLOCK}` });
  } else if (chars > WARN) {
    findings.push({ code: 'SPACE_PROMPT_LONG', severity: 'warn', detail: `${chars} > ${WARN}` });
  }
  if (chars > ADAPTER_LIMIT) {
    findings.push({ code: 'SPACE_PROMPT_EXCEEDS_ADAPTER_LIMIT', severity: 'block', detail: `${chars} > adapter ${ADAPTER_LIMIT}` });
  }
  if (chars > TARGET_MAX && chars <= WARN) {
    findings.push({ code: 'SPACE_PROMPT_ABOVE_TARGET', severity: 'warn', detail: `${chars} > target ${TARGET_MAX}` });
  }
  if (negativeRatio != null && negativeRatio > 0.30) {
    findings.push({ code: 'SPACE_NEGATIVE_DENSITY_TOO_HIGH', severity: 'warn', detail: `negative ${(negativeRatio * 100).toFixed(1)}% > 30%` });
  }

  return {
    chars,
    targetMax: TARGET_MAX,
    warnAt: WARN,
    blockAt: HARD_BLOCK,
    adapterLimit: ADAPTER_LIMIT,
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
