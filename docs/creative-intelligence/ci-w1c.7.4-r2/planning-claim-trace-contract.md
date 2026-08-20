# CI-W1C.7.4-R2 — Planning Claim Trace Contract

> **Spec sections:** PART B + PART C
> **Date:** 2026-08-20

## Goal

Make `PlanningStrategicEvidence` a first-class trace domain in the
strategic-synthesis contract. The model must cite planning claim IDs
via `*.planningClaimRefs`; never via `factRefs` / `needRefs` /
`evidenceRefs`.

## Contract Changes

### `packages/creative-intelligence/src/strategic-synthesis/contracts.ts`

`planningClaimRefs: string[]` was added to:

- `StrategicProjectUnderstanding`
- `StrategicTension`
- `StrategicInsight`
- `StrategicOpportunity`

`planningClaims: string[]` was added to:

- `CreativeReasoningPromptSourceMap`

`SG-11` was added to `STRATEGIC_GROUNDING_GATE_CODES`.

## Why a separate domain?

- A `PlanningStrategicEvidence` claim is NOT a Project Truth fact.
  Forcing planning claims into `factRefs` would either (a) fabricate
  Truth (forbidden) or (b) invent a parallel fact ID system (ugly).
- A `PlanningStrategicEvidence` claim carries its own epistemic
  class (FACT / USER_REQUIREMENT / MODEL_INFERENCE / UNKNOWN)
  which `ProjectTruthFact` does not.
- A `PlanningStrategicEvidence` claim is short-lived (planning-only
  carrier); `ProjectTruthFact` persists into the run.

## Parser (PART D)

`parse-strategic-synthesis.ts` now requires the new fields:

- `projectUnderstanding.planningClaimRefs` MUST be `string[]`. Else
  `STRATEGIC_SYNTHESIS_PARSE_ERROR: PARSE_PLANNING_CLAIM_REFS`.
- `tensions[].planningClaimRefs` / `insights[].planningClaimRefs` /
  `opportunities[].planningClaimRefs` MUST be `string[]`. Else
  `PARSE_PLANNING_CLAIM_REFS`.
- `sourceMap.planningClaims` MUST be `string[]` (or absent → `[]`).
  Else `PARSE_SOURCE_MAP_PLANNING_CLAIMS`.

No silent defaulting to `[]`: the parser REJECTS non-string-array
shapes. This forces the model to commit to the field shape.

## Validator (PART D)

`validate-strategic-synthesis.ts` adds `STR-09`:

> planningClaimRefs must be a string array on every element + sourceMap.planningClaims must be a string array.

This is a belt-and-suspenders safety net for direct-construct paths
(tests, custom orchestrators) that bypass the parser.

## Prompt (PART C)

`build-strategic-synthesis-prompt.ts` now tells the model:

- `Planning claim IDs MUST be cited in planningClaimRefs` (on PU /
  tension / insight / opportunity).
- `Do NOT put planning claim IDs in factRefs / needRefs / evidenceRefs`.
- `sourceMap.planningClaims MUST mirror the SOURCE TRACE IDS planningClaims list.`
  The runtime re-validates every `*.planningClaimRefs` against the
  runtime input — model-emitted values are NOT authority.

## Compile-strategic-context (PART B)

`compileStrategicReasoningContext` now populates
`sourceMap.planningClaims` from the input-derived
`planningStrategicEvidence[]`. The same set is also mirrored in
`sourceIds.planningClaims` (for the existing source-ids block).

## Tests

`tests/packages/creative-intelligence/ci-7.4-r2/ptr-trace-protocol.test.js`
covers:

- PTR-01..02: contract surface (planningClaimRefs on every element,
  sourceMap.planningClaims).
- PTR-03: parser accepts planningClaimRefs.
- PTR-04..05: parser refuses non-string / scalar planningClaimRefs.
- PTR-06: validator STR-09 catches non-array planningClaimRefs.
- PTR-07..08: prompt documents the domain + forbids `factRefs` reuse.
- PTR-09..10: compile-strategic-context + build-prompt reflect the
  new domain.

10 / 10 PASS.
