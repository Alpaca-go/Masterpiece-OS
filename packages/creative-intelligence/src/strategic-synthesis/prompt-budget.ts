/**
 * CI-W1C.7.1A — Prompt Budget Gate.
 *
 * Qualification-only budget check. Runs BEFORE the live analysis
 * model is invoked, so the user never pays for a prompt that won't
 * fit. Conservative deterministic estimator (no heavy dependency).
 *
 * The estimator uses `Math.ceil(characterCount / 3)` because mixed
 * Chinese / English text in the Masterpiece OS prompts is
 * approximately 3 characters per token on the conservative side
 * (CJK is typically 1-2 chars/token; English is 3-4 chars/token;
 * the division by 3 over-estimates the input cost for the CJK-heavy
 * prompts we will actually send).
 *
 * If a real tokenizer is needed in the future, replace
 * `estimateInputTokens` with a call to a documented helper without
 * changing the public contract.
 *
 * Hard rules (spec §PART D):
 *   - estimatedInputTokens + reservedOutputTokens + reservedRepairTokens
 *     <= configuredQualificationBudget
 *   - estimatedInputTokens + reservedOutputTokens <= hardContextLimit
 *   - failure → PROMPT_BUDGET_EXCEEDED → STOP
 *   - no silent truncation
 */

export const DEFAULT_INPUT_CHARS_PER_TOKEN = 3 as const;

export interface CreativeReasoningQualificationBudget {
  maxInputTokens: number;
  reservedOutputTokens: number;
  reservedRepairTokens: number;
  hardContextLimit: number;
}

export type BudgetStatus = 'PASS' | 'PROMPT_BUDGET_EXCEEDED';

export interface PromptBudgetCheck {
  status: BudgetStatus;
  estimatedInputTokens: number;
  configuredQualificationBudget: number;
  hardContextLimit: number;
  qualificationTokensRequired: number;
  contextTokensRequired: number;
  budget: CreativeReasoningQualificationBudget;
  /** Human-readable reason if status !== 'PASS'. */
  reason?: string;
}

/**
 * Default conservative qualification budget. Tuned for the first
 * live text qualification (Qwen 3.x / 32K context class). Production
 * callers may override per-run via the CLI / API surface.
 */
export const DEFAULT_QUALIFICATION_BUDGET: CreativeReasoningQualificationBudget = {
  maxInputTokens: 16_000,
  reservedOutputTokens: 4_000,
  reservedRepairTokens: 4_000,
  hardContextLimit: 32_000,
};

/**
 * Conservative input token estimator.
 *
 * Returns `Math.ceil(characterCount / 3)`. Documented as
 * conservative: actual token counts may be lower for CJK-heavy
 * prompts, but we deliberately over-estimate so a PASS is
 * trustworthy for budget purposes.
 */
export function estimateInputTokens(characterCount: number): number {
  if (!Number.isFinite(characterCount) || characterCount < 0) {
    throw new Error(
      `estimateInputTokens: invalid characterCount=${characterCount}`,
    );
  }
  return Math.ceil(characterCount / DEFAULT_INPUT_CHARS_PER_TOKEN);
}

/**
 * Run the budget gate. The gate is intentionally side-effect-free
 * so it can be invoked from the test seam and from the production
 * runtime.
 *
 * Returns PASS or PROMPT_BUDGET_EXCEEDED with a reason. The caller
 * is expected to STOP / fail-closed if status !== 'PASS'.
 */
export function checkPromptBudget(input: {
  characterCount: number;
  budget?: CreativeReasoningQualificationBudget;
}): PromptBudgetCheck {
  const budget = input.budget ?? DEFAULT_QUALIFICATION_BUDGET;
  const estimatedInputTokens = estimateInputTokens(input.characterCount);
  const qualificationTokensRequired =
    estimatedInputTokens + budget.reservedOutputTokens + budget.reservedRepairTokens;
  const contextTokensRequired = estimatedInputTokens + budget.reservedOutputTokens;

  if (qualificationTokensRequired > budget.maxInputTokens) {
    return {
      status: 'PROMPT_BUDGET_EXCEEDED',
      estimatedInputTokens,
      configuredQualificationBudget: budget.maxInputTokens,
      hardContextLimit: budget.hardContextLimit,
      qualificationTokensRequired,
      contextTokensRequired,
      budget,
      reason: `qualification budget exceeded: ${qualificationTokensRequired} > maxInputTokens=${budget.maxInputTokens}`,
    };
  }

  if (contextTokensRequired > budget.hardContextLimit) {
    return {
      status: 'PROMPT_BUDGET_EXCEEDED',
      estimatedInputTokens,
      configuredQualificationBudget: budget.maxInputTokens,
      hardContextLimit: budget.hardContextLimit,
      qualificationTokensRequired,
      contextTokensRequired,
      budget,
      reason: `hard context limit exceeded: ${contextTokensRequired} > hardContextLimit=${budget.hardContextLimit}`,
    };
  }

  return {
    status: 'PASS',
    estimatedInputTokens,
    configuredQualificationBudget: budget.maxInputTokens,
    hardContextLimit: budget.hardContextLimit,
    qualificationTokensRequired,
    contextTokensRequired,
    budget,
  };
}
