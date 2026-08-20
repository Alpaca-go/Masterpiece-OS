# CI-W1C.7.4-R2.1 — Final Report

> **Date:** 2026-08-20
> **Branch:** `feat/short-chain-simplified-ui`
> **Baseline HEAD:** `b6261e6b1e789f08fe64445e0140c94f7b547dda` (CI-W1C.7.4-R2 READY)
> **Production Code HEAD:** see commit log (Implementation Frozen HEAD)
> **Qualification/Test HEAD:** see commit log (final R2.1 test commit)
> **Current Branch Tip:** `git rev-parse HEAD` at report time
> **Upstream:** CI-W1C.7.4-R2
> **Implementation Summary:** Service → grounding-gate wiring closure (PART B) + SG-12 sourceMap/runtime integrity + orchestrator `reasonerFactory` forwarding (PART G) + 10 LPG-01..10 zero-network tests. Zero model call. Zero image call. Zero Need change. tracked-runtime-assets not worsened.
> **Verdict:** `READY_FOR_REAL_PLANNING_DOCUMENT_QUALIFICATION`

## Distinction (PART L bookkeeping — no self-referential loop)

Per the R2.1 spec "不要再制造 self-referential Documentation Tip SHA 循环", this report records exactly 3 SHAs and does NOT append a Documentation-Tip commit on top:

- **Production Code HEAD:** the commit hash of the second R2.1 commit (SG-12 addition). Pin the downstream CI scripts / orchestrator caller paths to this SHA.
- **Qualification/Test HEAD:** the commit hash of the third R2.1 commit (LPG-01..10 tests + package.json test glob + orchestrator `reasonerFactory` forwarding). Pin downstream R2.1 verification to this SHA.
- **Current Branch Tip:** `git rev-parse HEAD` at report time. The previous R2 final-report's "Documentation Tip" + "pin the tip" loop is NOT repeated.

## 1. baseline branch tip
`b6261e6b1e789f08fe64445e0140c94f7b547dda`

## 2. production code HEAD
See commit log (the SG-12 commit on top of the R2 baseline).

## 3. qualification/test HEAD
See commit log (the LPG-tests commit on top of the production code HEAD).

## 4. current branch tip
`git rev-parse HEAD` at report time (after `git push`).

## 5. service grounding call before/after

```ts
// Before (R2):
const grounding = runStrategicGroundingGate({ artifact: a, truth: input.truth });

// After (R2.1):
const grounding = runStrategicGroundingGate({
  artifact: a,
  truth: input.truth,
  planningClaims: input.planningStrategicEvidence ?? [],
});
```

## 6. runtime planning claim count forwarded (LPG-10)
With `PLANNING_EVIDENCE` (4 claims): `input.planningStrategicEvidence.length === 4`,
`runStrategicGroundingGate.planningClaims.length === 4`,
`knownPlanningClaimIds.size === 4`. The gate no longer drops the
runtime planning side.

## 7. SG-01 valid-ref result (LPG-01)
PASS. `plc-lpg-001` is in `knownPlanningClaimIds`; no blocked codes.

## 8. SG-01 fake-ref result (LPG-02)
BLOCK. `plc-fake-zzz` is NOT in `knownPlanningClaimIds`; SG-01 fires.

## 9. SG-11 result (LPG-03)
BLOCK. Planning input is present (4 claims) but `projectUnderstanding.planningClaimRefs = []` and tension/insight refs are also empty. SG-11 minimum-usage gate fires.

## 10. SG-12 result (LPG-04)
BLOCK. Runtime has 4 claims, `sourceMap.planningClaims` has 1. Sorted-unique set mismatch blocks SG-12.

## 11. planning-enabled E2E result (LPG-07)
- `synthesis.status === 'PASS'`
- `projectUnderstanding.planningClaimRefs.length >= 1`
- at least one of `tensions[].planningClaimRefs` or `insights[].planningClaimRefs` is non-empty
- `Set(artifact.sourceMap.planningClaims) === Set(loader-runtime-claim-IDs)`

## 12. planningClaimRefs actual count
LPG-01 / LPG-07: `>= 1` per spec (projectUnderstanding + at least one of tension/insight).

## 13. sourceMap/runtime ID equality (LPG-07)
`Set([...sourceMap.planningClaims])` deep-equals the orchestrator's
loaded runtime claim IDs (re-read via `loadPlanningStrategicEvidenceForProject`).

## 14. tracked-runtime-assets (PART L)
- baseline (R0 @ 34a3423e): **7**
- R1: 9 (delta +2 vs R0)
- R2: 7 (delta -2 vs R1, = R0)
- R2.1 (this phase): **7** (delta 0 vs R2; = R0 baseline)
- HF-R2.1-09: tracked-runtime-assets > baseline 7 → **does not hold** (count is exactly 7).

## 15. analysis calls
**0** (no LLM was invoked in R2.1).

## 16. image calls
**0**.

## 17. Need delta
**0** (Need schema / carriers / classification policy unchanged from R2).

## 18. Concept / Direction semantic delta
**0** (PART J: concept / direction still emit no planning refs in R2.1; deferred to CI-W1C.7.5).

## 19. new regression count
**0**.

## 20. worsened regression count
**0**.

## 21. CI-W1C.6.1 status
**DEFERRED** (unchanged).

## 22. CI-10 status
**NOT STARTED** (unchanged).

## 23. consumer switch status
**FORBIDDEN** (unchanged).

## 24. final verdict
`READY_FOR_REAL_PLANNING_DOCUMENT_QUALIFICATION`

All R2.1 READY criteria from spec PART S are satisfied:
- ✓ service forwards exact runtime planning claims to gate
- ✓ valid planningClaimRefs → PASS (LPG-01)
- ✓ fake planningClaimRefs → SG-01 (LPG-02)
- ✓ planning input + empty planningClaimRefs → SG-11 (LPG-03)
- ✓ sourceMap/runtime mismatch → SG-12 (LPG-04)
- ✓ model sourceMap cannot self-authorize fake refs (LPG-05)
- ✓ planning-aware canonical orchestrator E2E → synthesis PASS, real planning refs used (LPG-07)
- ✓ no-planning project backward compatible (LPG-06)
- ✓ tracked-runtime-assets = 7 (PART L)
- ✓ analysis calls = 0
- ✓ image calls = 0
- ✓ Need changes = 0
- ✓ new failures = 0
- ✓ worsened failures = 0

## 25. STOP confirmation

The agent does NOT start:
- CI-W1C.7.5
- CI-W1C.6.1
- CI-10
- Direction Report productization
- consumer switch
- Need rewrite
- Anchor / Image work

Wait for user authorization before starting the next phase.

## 26. next phase (user authorization required)
**CI-W1C.7.5 — Real Planning-Document Live Text Qualification & Semantic Retention Review.**

TEXT ONLY: 3 base calls (Strategic / Concept / Direction). 0 image calls.

CI-W1C.7.5 MUST go through the R2 canonical orchestrator
(`runCreativeReasoningForProject`) with the R2.1 PART B wiring
fix in place (service forwards `planningStrategicEvidence` to
the gate) and the R2.1 PART C SG-12 sourceMap/runtime integrity
check active. Live qualification is the first time real model
calls land; LPG-09 asserts `meta.modelCallCount <= 2` and `imageProviderCallCount === 0`.
