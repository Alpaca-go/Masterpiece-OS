# CI-W1C.7.4-R1 — Zero-Network Call Audit

> **Spec section:** PART J / PART O
> **Date:** 2026-08-20

## Goal

Prove that the production-closure E2E flow makes ZERO provider calls
(LLM, image, video, etc.) and ZERO image-generation calls.

## What runs in the E2E

The E2E test path executes:

1. `registerPlanningBriefFromPath` — project-store mutator. **No model
   call. No image call.**
2. `readPlanningBriefFile` — `parseStrategyDocument` (PDF/DOCX) or
   direct UTF-8 read. **No model call. No image call.**
3. `buildPlanningStrategicEvidenceArtifact` — chunking + claim
   extraction + epistemic classifier. **No model call. No image call.**
4. `routePlanningClaim` — pure function. **No model call. No image call.**
5. `loadPlanningStrategicEvidenceForProject` — runtime-core wrapper.
   **No model call. No image call.**
6. `compileStrategicReasoningContext` — pure compilation. **No model
   call. No image call.**
7. `buildStrategicSynthesisPrompt` — deterministic prompt builder.
   **No model call. No image call.**
8. `createCreativeReasoningService` — instantiates the service. **No
   model call. No image call.** (The service itself is not invoked
   in the R1 E2E; only the loader → context → prompt chain is tested.)

## How zero is verified

- The R1 E2E test never calls a model. It never sets up
  `reasonerFactory` + `readCredentials` for live mode; the
  `createCreativeReasoningService` call uses `useMock: true` implicitly
  (no `reasonerFactory` argument).
- `MOCK_SYNTHESIS_FIXTURE` is the default execution path of the
  service; `modelCallCount` is 1 in mock mode and the call goes to
  the in-process `mockReasonerFactory`, which does not open any
  socket.
- The E2E test never instantiates an `imageProviderCallCount > 0`
  state. The service's `imageProviderCallCount: 0` is a TypeScript
  literal type that makes any non-zero value a compile error.

## What is explicitly NOT touched

- No `node:net`, `node:http`, `node:https`, or `node:dgram` import.
- No `fetch` / `axios` / `got` call.
- No Qwen / OpenAI / Anthropic / Google / DashScope / Wan / Seedream /
  LiveRamp HTTP call.
- No image model call.
- No DB / network filesystem call (only local `node:fs` and `node:path`).

## Test evidence

```text
✔ E2E-06: the E2E flow makes zero provider calls
✔ E2E-07: image-provider call count is 0 (no image generation in the planning flow)
```

Plus the creative-reasoning service's type-level `imageProviderCallCount:
0` literal makes any non-zero value a compile-time error.

## Conclusion

The R1 production-closure path is fully offline. It can run in CI without
any network access, without any API key, and without any image provider.
