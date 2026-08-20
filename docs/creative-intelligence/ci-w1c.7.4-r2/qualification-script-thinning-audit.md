# CI-W1C.7.4-R2 — Qualification Script Thinning Audit

> **Spec sections:** PART G + PART H + PART I
> **Date:** 2026-08-20

## Goal

Close R1 blocker #3: `live-qualify-g01.mjs` was manually composing
project / planning-loader / truth / need / evidence / service.run.
R2 promotes the orchestration into a canonical runtime entrypoint and
turns the qualification script into a thin caller.

## Pre-R2 state (R1 baseline)

`apps/web-runtime/scripts/ci-w1c/live-qualify-g01.mjs` directly did:

```text
read project.json (raw fs)
loadPlanningStrategicEvidenceFromContext(...)
load truth (raw fs read + JSON.parse)
load need (raw fs read + JSON.parse)
load evidence (raw fs read + JSON.parse)
buildStrategicSynthesisPrompt(...)
service.run(...)
```

Two deep imports:

- `creative-reasoning-service` (the legacy carrier)
- `planning-strategic-evidence-loader` (the R1 production wrapper)

## Post-R2 state

`apps/web-runtime/scripts/ci-w1c/live-qualify-g01.mjs` now does:

```text
registerPlanningBriefFromPath(...) (one-liner setup)
createProjectStore() (production store factory)
runCreativeReasoningForProject({ projectId, useMock: true,
                                  loadReasoningContext })
```

The only deep runtime import is the **canonical orchestrator**:

```js
import { runCreativeReasoningForProject,
         createRunCreativeReasoningForProject } from
  '../../../packages/runtime-core/src/application/run-creative-reasoning-for-project.ts';
```

The script supplies a `loadReasoningContext` callback that returns the
in-memory truth / need / evidence objects (CI scripts intentionally
bypass fs reads to keep zero-network and deterministic).

## Why a `loadReasoningContext` callback instead of fs reads?

CI scripts must be deterministic and offline. Letting the orchestrator
fs-read `<projectRoot>/project-context/creative-intelligence-shadow/`
would require the test to materialise that on disk, which is exactly
the fs-write surface we want to keep out of `node --test`. The callback
seam lets the orchestrator stay production-faithful (it would
default-read in production) while the qualification script retains
in-memory injection.

## Main R2 E2E (R2E2E-01..09)

`tests/packages/creative-intelligence/ci-7.4-r2/r2e2e-production-path.test.js`
exercises the same canonical orchestrator end-to-end:

```text
1. registerPlanningBriefFromPath(projectId, briefPath)
2. runCreativeReasoningForProject({ projectId, useMock: true,
                                     loadReasoningContext })
3. Assert: prompt contains PLANNING STRATEGIC EVIDENCE section
4. Assert: compiled sourceMap.planningClaims === real input claim IDs
5. Assert: parsed mock artifact has no foreign claim IDs
6. Assert: 0 model calls
7. Assert: 0 image calls
8. Assert: orchestrator auto-loaded the planning evidence
9. Assert: production path is a thin caller (no manual carrier composition)
```

Assertions 8 + 9 prove the qualifier no longer manually compiles the
Strategic context.

## Carrier audit

| Carrier | Pre-R2 manual composition? | Post-R2 |
|---|---|---|
| Project | yes (raw fs read) | orchestrator + store |
| Truth | yes (raw fs read) | orchestrator → callback |
| Need | yes (raw fs read) | orchestrator → callback |
| Evidence | yes (raw fs read) | orchestrator → callback |
| PlanningStrategicEvidence | yes (loader call) | orchestrator auto-loads |
| StrategicContext | yes (manual compile) | orchestrator auto-compiles |
| StrategicSynthesisPrompt | yes (manual build) | orchestrator auto-builds |

Every carrier is now the orchestrator's responsibility; the
qualification script only does IO for project-store setup (one
`registerPlanningBriefFromPath` call) and supplies the in-memory
carriers via the callback.

## Tests

`tests/packages/creative-intelligence/ci-7.4-r2/orc-orchestration.test.js`
covers:

- ORC-01..05: orchestrator API surface (factory + direct call, useMock
  flag, error surfacing, default path resolution).
- ORC-06..08: orchestrator forwards planning evidence end-to-end;
  orchestrator does not require the caller to supply planningStrategicEvidence
  on `service.run()`.
- ORC-09: the orchestrator re-exports the production loader so the
  script can avoid the deep runtime-core import for `loadPlanningStrategicEvidenceForProject`.

8 / 8 PASS.
