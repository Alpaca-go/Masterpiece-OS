# CI-W1C.7.4-R2 — Zero-Network E2E Report

> **Spec section:** PART J / PART O
> **Date:** 2026-08-20

## Goal

Prove the R2 main E2E flow makes ZERO provider calls (LLM, image,
video) and ZERO image-generation calls. The R2 main E2E is the
canonical `registerPlanningBrief → runCreativeReasoningForProject`
flow.

## What runs in the R2 E2E

`tests/packages/creative-intelligence/ci-7.4-r2/r2e2e-production-path.test.js`
exercises:

1. `createProjectStore().registerPlanningBriefFromPath(...)` — pure fs
   write + metadata mutation. **No model call. No image call.**
2. `loadPlanningStrategicEvidenceForProject` (orchestrator-internal) —
   fs read + chunking + claim extraction + classifier. **No model
   call. No image call.**
3. `compileStrategicReasoningContext` (orchestrator-internal) — pure
   compilation. **No model call. No image call.**
4. `buildStrategicSynthesisPrompt` (orchestrator-internal) — pure
   prompt builder. **No model call. No image call.**
5. `createCreativeReasoningService(...).run({ useMock: true })` —
   mock execution path. `MOCK_SYNTHESIS_FIXTURE` is returned without
   any socket open. **No model call. No image call.**

## How zero is verified

- The R2 E2E never sets up `reasonerFactory`; the orchestrator is
  called with `useMock: true`, which routes execution through
  `MOCK_SYNTHESIS_FIXTURE`.
- `MOCK_SYNTHESIS_FIXTURE`'s `modelCallCount` is 1 in mock mode and
  the call goes to the in-process `mockReasonerFactory`, which does
  not open any socket.
- `imageProviderCallCount` is a TypeScript literal type `0` on the
  `StrategicSynthesisArtifact`; any non-zero value is a compile error
  in mock mode.

## What is explicitly NOT touched

- No `node:net`, `node:http`, `node:https`, or `node:dgram` import.
- No `fetch` / `axios` / `got` call.
- No Qwen / OpenAI / Anthropic / Google / DashScope / Wan / Seedream
  HTTP call.
- No image model call.
- No DB / network filesystem call (only local `node:fs` and `node:path`).

## Test evidence

```text
✔ R2E2E-01: registerPlanningBrief persists the brief; reload sees the record
✔ R2E2E-02: orchestrator auto-loads planning evidence (no manual claim injection)
✔ R2E2E-03: prompt contains the PLANNING STRATEGIC EVIDENCE section
✔ R2E2E-04: compiled sourceMap.planningClaims contains the real input claim IDs
✔ R2E2E-05: planningClaimRefs in the parsed mock artifact resolve to the runtime input
✔ R2E2E-06: the parsed mock artifact does not inject fake claim IDs in any *.planningClaimRefs
✔ R2E2E-07: 0 real model calls in mock mode
✔ R2E2E-08: 0 image calls (imageProviderCallCount is a literal type 0)
✔ R2E2E-09: production path is a thin caller; no direct loader / context / prompt calls
```

9 / 9 PASS.

## R2 test totals (zero-network)

```text
PTR-01..10  10/10 PASS
RTG-01..06   7/7  PASS
ORC-01..09   8/8  PASS
R2E2E-01..09 9/9  PASS
```

Total: **34 / 34** R2 tests PASS. Zero model / image / network calls
in any of them.
