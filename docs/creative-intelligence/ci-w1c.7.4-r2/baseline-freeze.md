# CI-W1C.7.4-R2 — Baseline Freeze

> **Date:** 2026-08-20
> **Branch:** `feat/short-chain-simplified-ui`
> **Baseline HEAD:** `34a3423e77f3754490d00d3180815fe7572e7f13` (CI-W1C.7.4-R1 READY)
> **Implementation HEAD (frozen, this commit):** see Implementation HEAD in the
> commit log; see final-report.md for the exact SHA.
> **Status:** NARROW PRODUCTION TRACE / ORCHESTRATION REPAIR
> **Verdict:** `READY_FOR_REAL_PLANNING_DOCUMENT_QUALIFICATION`

## Verification Commands

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git rev-parse origin/feat/short-chain-simplified-ui
git log --oneline -30
```

## Expected Baseline (CI-W1C.7.4-R1 @ 34a3423e)

```text
branch = feat/short-chain-simplified-ui
HEAD = 34a3423e77f3754490d00d3180815fe7572e7f13
local == origin
```

## Observed (before R2 work)

```text
branch = feat/short-chain-simplified-ui
HEAD = 34a3423e77f3754490d00d3180815fe7572e7f13
local == origin
```

## Result

✅ PASS — branch + HEAD + local/origin parity verified.

## 4 Blocker Audit (from R1 → R2)

| # | R1 blocker | R2 closure |
|---|---|---|
| 1 | `StrategicSynthesisArtifact` lacks `planningClaimRefs` | PART B + PART D — added `planningClaimRefs: string[]` to 4 Strategic types + parser refuses non-array. |
| 2 | SG-01 / SG-10 do not validate actual `PlanningStrategicEvidence` claim IDs | PART E — gate accepts `planningClaims?: PlanningStrategicClaim[]`; SG-01 validates `*.planningClaimRefs`; SG-10 rejects foreign refs; SG-11 enforces minimum-usage when planning input is present. |
| 3 | `live-qualify-g01.mjs` manually composed carriers; main E2E did the same | PART F + PART G + PART H — `runCreativeReasoningForProject` orchestrator owns all IO; `live-qualify-g01.mjs` is a thin caller; main E2E uses only `registerPlanningBriefFromPath` + `runCreativeReasoningForProject`. |
| 4 | `tracked-runtime-assets-guard` was at 9 violations; R1 added 1 (delta +1) | PART K — R2 refactored the script to use the orchestrator; delta from R1 = -2 (9 → 7, same as R0 baseline). |

## Hard Rules (R2)

```
analysis model calls  = 0
image model calls     = 0
Need changes          = 0
Need rewrite          = 0
Concept semantic      = 0
Direction semantic    = 0
G01/G02 fake brief     = 0
legacy visual reintro = 0
consumer switch       = 0
CI-W1C.6.1             = DEFERRED
CI-10                  = NOT STARTED
Direction Report       = HOLD
project-specific rule  = 0
API secret commit      = 0
```

## Frozen Surfaces (NOT touched by R2)

Same as R1. Planning claim refs add a new domain to existing
contracts; nothing in the Need, Concept, Direction, Image,
Selection, Canon, Anchor, Space, or Packaging paths changed.

## Working Tree (post-R2)

Pre-existing untracked artifacts from CI-W1C.7.2 / 7.4 / 7.4-R1
phases are unchanged. The 7 commits pushed in R2 are
documented in `final-report.md`.
