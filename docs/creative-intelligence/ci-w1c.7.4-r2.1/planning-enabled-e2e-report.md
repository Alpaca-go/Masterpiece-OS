# CI-W1C.7.4-R2.1 — Planning-Enabled Service + E2E Report

> **Spec section:** PART F + PART G + PART H + PART K
> **Date:** 2026-08-20

## Test Files

- `tests/packages/creative-intelligence/ci-7.4-r2.1/lpg-grounding-wiring.test.js` — 10 tests
- `tests/packages/creative-intelligence/ci-7.4-r2.1/planning-aware-test-reasoner.mjs` — test-only helper

## Service-Level (LPG-01..06, LPG-10) — `service.run()`

| ID | Assertion | Result |
|---|---|---|
| LPG-01 | valid planning refs pass (SG-01 + SG-12 PASS) | PASS |
| LPG-02 | fake planning ref blocks SG-01 | PASS |
| LPG-03 | planning input + empty planningClaimRefs blocks SG-11 | PASS |
| LPG-04 | sourceMap missing runtime IDs blocks SG-12 | PASS |
| LPG-05 | model sourceMap cannot self-authorize (SG-01 + SG-12) | PASS |
| LPG-06 | no planning input backward compatible (SG-12 PASS on empty) | PASS |
| LPG-10 | service forwards planning claims to the gate (PART B) | PASS |

## Orchestrator E2E (LPG-07, LPG-08, LPG-09) — `runCreativeReasoningForProject()`

| ID | Assertion | Result |
|---|---|---|
| LPG-07 | planning-aware orchestrator E2E: synthesis PASS, real refs used, sourceMap == runtime IDs | PASS |
| LPG-08 | canonical E2E has no manual context injection (structural check of `RunCreativeReasoningForProjectInput`) | PASS |
| LPG-09 | orchestrator E2E makes zero model / image calls (`imageProviderCallCount === 0`, `meta.modelCallCount <= 2`, no external-model marker) | PASS |

## tracked-runtime-assets (PART L)

```
Baseline (R0 @ 34a3423e):  7 violations
R1 (post-7 commits):        9 violations  (delta +2)
R2 (after orchestrator refactor): 7 violations  (delta -2 vs R1, = R0)
R2.1 (this phase):          7 violations  (delta 0 vs R2; = R0 baseline)
```

`HF-R2.1-09` (tracked-runtime-assets > baseline 7) holds.

## Hard Fail Matrix (PART O)

| ID | Description | Result |
|---|---|---|
| HF-R2.1-01 | service does not forward planning claims to gate | PASS (LPG-10) |
| HF-R2.1-02 | valid planningClaimRef fails due empty gate input | PASS (LPG-01) |
| HF-R2.1-03 | planning input does not trigger SG-11 | PASS (LPG-03) |
| HF-R2.1-04 | fake planningClaimRef can pass SG-01 | PASS (LPG-02) |
| HF-R2.1-05 | sourceMap.planningClaims may diverge without block | PASS (LPG-04) |
| HF-R2.1-06 | model sourceMap can self-authorize fake IDs | PASS (LPG-05) |
| HF-R2.1-07 | main E2E accepts planningClaimRefs=[] as planning use | PASS (LPG-03 inverts: when refs are empty AND planning input present, SG-11 blocks) |
| HF-R2.1-08 | main E2E manually injects planningStrategicEvidence | PASS (LPG-08 structural check) |
| HF-R2.1-09 | tracked-runtime-assets > baseline 7 | PASS (7 = 7) |
| HF-R2.1-10 | model/network call occurs | PASS (0 analysis / 0 image in LPG-09) |
| HF-R2.1-11 | image call occurs | PASS (0 image) |
| HF-R2.1-12 | Need rewrite included | PASS (Need schema unchanged) |
| HF-R2.1-13 | Concept/Direction redesign appears | PASS (PART J: concept / direction still no planning refs in R2.1) |
| HF-R2.1-14 | CI-W1C.6.1 / CI-10 / consumer switch starts | PASS (all unchanged) |
| HF-R2.1-15 | project-specific production rule introduced | PASS (only orchestrator fix is the general `reasonerFactory` forwarding; no project hardcode) |
