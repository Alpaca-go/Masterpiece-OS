# CI-W1C.7.1A — Prompt Budget Audit

> Date: 2026-08-20
> Phase: CI-W1C.7.1A
> Module: `packages/creative-intelligence/src/strategic-synthesis/prompt-budget.ts`

---

## 1. Why a budget gate

Real-project prompts are significantly larger than synthetic
fixtures. Before paid live qualification, the system must know
whether the prompt + expected output + repair attempt fits within
an explicit qualification budget. Without a budget gate:

- A 50K-character prompt might be sent to a 32K-context model.
- The repair attempt is not reserved.
- A late-stage budget failure would waste the entire
  `useMock=false` run.

CI-W1C.7.1A adds a hard budget gate that runs BEFORE the live
model is invoked and STOPs the run on overflow with
`PROMPT_BUDGET_EXCEEDED`.

---

## 2. Budget contract

```ts
export interface CreativeReasoningQualificationBudget {
  maxInputTokens: number;          // qualification budget (input + 2 × output)
  reservedOutputTokens: number;   // first-attempt output reserve
  reservedRepairTokens: number;   // second-attempt output reserve
  hardContextLimit: number;       // model hard context limit
}
```

The default budget (tuned for Qwen 3.x 32K context):

```ts
export const DEFAULT_QUALIFICATION_BUDGET: CreativeReasoningQualificationBudget = {
  maxInputTokens: 16_000,
  reservedOutputTokens: 4_000,
  reservedRepairTokens: 4_000,
  hardContextLimit: 32_000,
};
```

---

## 3. Token estimation

```ts
export const DEFAULT_INPUT_CHARS_PER_TOKEN = 3;

export function estimateInputTokens(characterCount: number): number {
  return Math.ceil(characterCount / 3);
}
```

The estimator is conservative (deliberately over-estimates CJK
input cost). Actual CJK token counts are typically 1-2 chars per
token; English is 3-4 chars per token. Dividing by 3 yields a
trustworthy PASS bound without over-spending on smaller prompts.

If a real tokenizer is needed in the future, replace
`estimateInputTokens` with a call to a documented helper. No
external dependency was added.

---

## 4. Qualification rule

For each stage prompt, the gate enforces:

```
estimatedInputTokens + reservedOutputTokens + reservedRepairTokens
    <= configuredQualificationBudget   (maxInputTokens)

estimatedInputTokens + reservedOutputTokens
    <= hardContextLimit
```

If either check fails:

```ts
{
  status: 'PROMPT_BUDGET_EXCEEDED',
  estimatedInputTokens,
  qualificationTokensRequired,
  contextTokensRequired,
  reason: 'qualification budget exceeded: ... > maxInputTokens=...',
  // OR
  reason: 'hard context limit exceeded: ... > hardContextLimit=...',
}
```

The caller is expected to STOP / fail-closed.

---

## 5. No silent truncation

The gate is **fail-closed** by construction. There is no path in
the module that slices / drops / truncates the prompt. If the gate
fails, the prompt is NOT sent to the model and the run is
aborted.

The runtime's `creative-reasoning-service.ts` honours the gate
before each stage and sets the stage status to
`'FAIL' with blockedCodes=[reason]` if it fails. The downstream
stage is `NOT_RUN`. No fake report is emitted.

---

## 6. Real G01 / G02 budget results

All 6 prompts (3 stages × 2 projects) PASS the default budget:

| Project | Stage | characters | estimated input tokens | qualification tokens | hard context | status |
|---|---|---:|---:|---:|---:|---|
| G01 | Strategic | 10319 | 3440 | 11440 | 7440 | PASS |
| G01 | Concept | 11878 | 3960 | 11960 | 7960 | PASS |
| G01 | Direction | 15440 | 5147 | 13147 | 9147 | PASS |
| G02 | Strategic | 9692 | 3231 | 11231 | 7231 | PASS |
| G02 | Concept | 11335 | 3779 | 11779 | 7779 | PASS |
| G02 | Direction | 14897 | 4966 | 12966 | 8966 | PASS |

All Direction prompts (the largest) fit within the default
`maxInputTokens=16000` qualification budget with margin.

---

## 7. Budget tests (BG-01..08)

All 8 tests pass:

| Test | Property |
|---|---|
| BG-01 | Small prompt passes default budget |
| BG-02 | Huge prompt fails default qualification budget (no truncation) |
| BG-03 | No silent truncation (oversized returns the failure) |
| BG-04 | Hard context limit enforced after qualification budget |
| BG-05 | Repair reserve included in the qualification budget |
| BG-06 | Budget result is deterministic and pure |
| BG-07 | `estimateInputTokens` is conservative (ceil charCount / 3) |
| BG-08 | Default budget matches the documented contract |

Test source: `tests/packages/creative-intelligence/ci-7.1a/real-project-prompt-qualification-fp-bg-snap-rpq.test.js`

---

## 8. Runtime integration

The `creative-reasoning-service.ts` now accepts an optional
`qualificationBudget` on `CreativeReasoningInput`. The default is
`DEFAULT_QUALIFICATION_BUDGET`. The service runs `checkPromptBudget`
immediately after building each stage's prompt. If the gate fails:

1. The stage's `status` becomes `'FAIL'`.
2. The blocked code includes `PROMPT_BUDGET_EXCEEDED: <reason>`.
3. The downstream stage becomes `'NOT_RUN'`.
4. The shadow artifact is NOT persisted.
5. The report is NOT compiled.

The existing fail-closed live mode (CI-W1C.7.1 PART H) is
preserved and now extends to budget overflow.

---

## 9. Production note

`DEFAULT_QUALIFICATION_BUDGET` is intentionally conservative for
the FIRST live qualification. Production callers may override via:

```ts
const result = await creativeReasoningService.run({
  // ...
  useMock: false,
  analysisProfileId: 'profile-...',
  qualificationBudget: {
    maxInputTokens: 24000,  // model-specific
    reservedOutputTokens: 4000,
    reservedRepairTokens: 4000,
    hardContextLimit: 32000,
  },
});
```

The `qualificationBudget` is the LAST line of defense before
paid API tokens are spent. If it ever triggers, the user
should NOT lower it; instead, prompt compaction is the right
next phase.
