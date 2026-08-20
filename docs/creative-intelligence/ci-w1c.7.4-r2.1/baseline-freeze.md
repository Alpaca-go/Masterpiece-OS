# CI-W1C.7.4-R2.1 — Baseline Freeze

> **Date:** 2026-08-20
> **Branch:** `feat/short-chain-simplified-ui`
> **Baseline HEAD:** `b6261e6b1e789f08fe64445e0140c94f7b547dda` (CI-W1C.7.4-R2 READY)
> **Upstream:** CI-W1C.7.4-R2
> **Status:** MICRO REPAIR / ZERO-NETWORK LIVE-GROUNDING CLOSURE
> **Verdict (post-R2.1):** `READY_FOR_REAL_PLANNING_DOCUMENT_QUALIFICATION`

## Verification Commands

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git rev-parse origin/feat/short-chain-simplified-ui
git log --oneline -10
```

## Expected Baseline (R2 @ b6261e6b)

```text
branch = feat/short-chain-simplified-ui
HEAD = b6261e6b1e789f08fe64445e0140c94f7b547dda
local == origin
```

## Observed

```text
branch = feat/short-chain-simplified-ui
HEAD = b6261e6b1e789f08fe64445e0140c94f7b547dda
local == origin
```

## R2.1 Spec Audit

The R2.1 spec found 4 R2 blockers (PART B / C / G / K). R2.1 closes:

| R2 blocker | R2.1 closure |
|---|---|
| `creative-reasoning-service` does NOT forward `planningStrategicEvidence` to `runStrategicGroundingGate` → `knownPlanningClaimIds` is always empty in the live path | PART B: service forwards `input.planningStrategicEvidence ?? []` as `planningClaims` to the gate |
| `artifact.sourceMap.planningClaims` is model-emitted and not validated against the runtime input | PART C: SG-12 `PLANNING_SOURCE_MAP_MATCHES_RUNTIME` compares `Set(runtime.claimId)` against `Set(artifact.sourceMap.planningClaims)`; mismatch blocks SG-12 |
| `live-qualify-g01.mjs` + main E2E manually compose `loader → context → prompt → service.run` | PART F + G: canonical `runCreativeReasoningForProject` orchestrator owns ALL IO; `live-qualify-g01.mjs` + main E2E are thin callers; LPG-07/09 pass through orchestrator |
| `tracked-runtime-assets-guard` violations: 7 (R0) → 9 (R1, +1) → ? (R2.1) | PART L: orchestrator re-exports loader + R2.1 keeps deep-import count at 1; HF-R2.1-09 holds: tracked-runtime-assets count = 7 = R0 baseline |

## Hard Rules (R2.1)

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
CI-W1C.6.1            = DEFERRED
CI-10                 = NOT STARTED
Direction Report      = HOLD
project-specific rule = 0
API secret commit     = 0
```
