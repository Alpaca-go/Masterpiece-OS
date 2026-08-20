# CI-W1C.7.4-R2.1 — Planning-Aware Test Reasoner

> **Spec section:** PART E
> **Date:** 2026-08-20

## Goal

The generic mock fixture (`MOCK_SYNTHESIS_FIXTURE`) has
`planningClaimRefs: []` and `sourceMap.planningClaims: []`. It cannot
prove SG-11 / SG-12 actually fire in the live service path. R2.1
adds a planning-aware test reasoner that reads the Strategic prompt
and produces a valid Strategic artifact that uses real claim IDs.

## Helper Location

`tests/packages/creative-intelligence/ci-7.4-r2.1/planning-aware-test-reasoner.mjs`

## Exported API

```js
import {
  parsePlanningClaimIdsFromPrompt,        // 解析 # PLANNING STRATEGIC EVIDENCE
  parseFactIdsFromPrompt,                  // 解析 # AUTHORITATIVE PROJECT FACTS
  parseNeedIdsFromPrompt,                   // 解析 # NEED SKELETON
  parseProjectIdFromPrompt,                // 解析 # PROJECT
  parseSourceTraceIdsFromPrompt,           // 解析 # SOURCE TRACE IDS
  createPlanningAwareTestReasonerFactory,  // 同步 factory (返回 ModelReasoner)
  dummyReadCredentials                     // 假 readCredentials 用于 live 路径
} from './planning-aware-test-reasoner.mjs';
```

## Contract

- **NEVER hardcodes a claim ID.** All IDs come from the runtime
  planning-evidence carrier, which the service forwards into
  the prompt via `buildStrategicSynthesisPrompt`'s
  `PLANNING STRATEGIC EVIDENCE` section.
- The reasoner factory is **synchronous**: the service calls
  `deps.reasonerFactory(creds)` without `await`. It must return
  a `ModelReasoner` (a function), not a Promise of one. Lazy
  fixture loading is performed inside the inner reasoner.
- The reasoner reads the prompt's `PROJECT`, `AUTHORITATIVE PROJECT
  FACTS`, `NEED SKELETON`, `SOURCE TRACE IDS`, and
  `PLANNING STRATEGIC EVIDENCE` sections and mirrors the IDs into
  the fixture. Concept / Direction stages are handled by their
  standard mock fixtures (R2.1 PART J defers planning refs in those
  stages to CI-W1C.7.5).

## Configurable Variant

The test file (`lpg-grounding-wiring.test.js`) also defines a
`createConfigurableReasonerFactory(overrides)` that lets LPG-02..05
inject specific planningClaimRefs / sourceMap values to drive
SG-01 / SG-11 / SG-12 branches deterministically.
