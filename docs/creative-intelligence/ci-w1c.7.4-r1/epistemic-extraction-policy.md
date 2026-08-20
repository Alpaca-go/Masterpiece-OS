# CI-W1C.7.4-R1 — Epistemic Extraction Policy

> **Spec section:** PART F / PART G
> **Date:** 2026-08-20

## Goal

Replace the CI-W1C.7.4 all-FACT extraction behavior with a deterministic
conservative classifier. The classifier must:

- Read the value + line text.
- Use precedence: `UNKNOWN > USER_REQUIREMENT > MODEL_INFERENCE > FACT`.
- Never auto-promote USER_REQUIREMENT / MODEL_INFERENCE / UNKNOWN to FACT
  (the router in `epistemic-routing.ts` already enforces this; the
  classifier must not undermine it).

## Implementation

### New: `packages/creative-intelligence/src/strategic-synthesis/epistemic-classifier.ts`

A new module that exports a single deterministic function:

```ts
export function classifyPlanningClaimEpistemicClass(input: {
  value: string;
  lineText?: string;
  documentRole?: string;
}): 'FACT' | 'USER_REQUIREMENT' | 'MODEL_INFERENCE' | 'UNKNOWN';
```

### Marker groups (precedence order)

**UNKNOWN (highest precedence):**
- `待确认` / `未知` / `未定` / `TBD` / `unknown` / `not confirmed` /
  `unconfirmed` / `to be determined` / `not yet`

**USER_REQUIREMENT:**
- `必须` / `需要` / `应该` / `目标是` / `希望` / `要求` / `should` / `must` /
  `need(s|ed) to` / `objective(s) is` / `required` / `mandatory` / `has to`

**MODEL_INFERENCE:**
- `建议` / `可以考虑` / `推测` / `可能` / `或许` / `recommend(ed|ation)?` /
  `suggest(ed|ion)?` / `could` / `may` / `likely` / `probably` / `perhaps` /
  `possibly`

**FACT (default):** declarative statement without any of the above markers.

The first matching category wins; the rest are ignored. The classifier
performs NO model call.

### Modified: `build-planning-strategic-evidence.ts`

The `ExtractPattern` interface loses its `epistemicClass` field (it was
hardcoded to FACT in CI-W1C.7.4). Each `EXTRACT_PATTERNS` entry now only
carries `key`, `patterns`, and `defaultConfidence`.

`extractClaimsFromChunk` now calls the classifier:

```ts
const epistemicClass = classifyPlanningClaimEpistemicClass({
  value,
  lineText: line,
  documentRole
});
```

The classifier output is preserved through dedupe. Same value across chunks →
deduped into a single claim (chunkRefs accumulate).

### Truth promotion safety (PART G)

`epistemic-routing.ts` (unchanged) is the only authority for Truth
promotion:

- `USER_REQUIREMENT` → `USER_REQ` (never TRUTH).
- `MODEL_INFERENCE` → `INFERENCE` (never TRUTH).
- `UNKNOWN` → `UNKNOWN` (never fabricated).
- `FACT` + mapped truthKey → `TRUTH` (only `industry`, `brand_role` are
  mapped in the CI-W1C.7.4 minimal registry; other 14 keys stay in
  `PlanningStrategicEvidence`).
- `FACT` + no truthKey → `EVIDENCE_ONLY`.

The classifier's job is to assign the class. The router's job is to
decide the destination. They are independent.

## Tests

- `tests/packages/creative-intelligence/ci-7.4-r1/ree-epistemic-extraction.test.js`
  covers REE-01..09.

```text
✔ REE-01: declarative industry value classifies as FACT
✔ REE-02: 必须 / 需要 classify as USER_REQUIREMENT
✔ REE-03: 建议 / 可能 / could / likely classify as MODEL_INFERENCE
✔ REE-04: 待确认 / TBD / unknown classify as UNKNOWN
✔ REE-05: UNKNOWN marker beats any other class on the same line
✔ REE-06: USER_REQUIREMENT is never routed to TRUTH (TRUTH requires FACT)
✔ REE-07: MODEL_INFERENCE is never routed to TRUTH
✔ REE-08: real extraction over the A fixture emits >=2 epistemic classes
✔ REE-09: across fixtures A and B, all four epistemic classes are exercised
```

9 / 9 PASS.

## Acceptance

✅ Real extraction produces multiple epistemic classes from a real fixture.
USER_REQUIREMENT / MODEL_INFERENCE / UNKNOWN are never promoted to Truth.
The classifier is deterministic, regex-based, and model-call-free.
