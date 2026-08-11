# Version Topology

Only evidence-backed arrows are shown. `?` means `RELATION_UNKNOWN`.

## Product identity

```text
/VERSION 5.0.0-rc.1
  -> root package.json
  -> apps/desktop/package.json
  -> apps/cli/src/runtime-trace.js DEFAULT_APP_VERSION
```

## Visual Analysis / CLI

```text
WEB PRIMARY
  -> Desktop pipeline-service
  -> CLI v5 bootstrap
  -> CLI prompts/v5
  -> Qwen-named OpenAI-compatible reasoner
```

CLI `v5` is current hidden core. No `v10/v11/vnext` CLI implementation was found.

## Space / Reference-First

```text
v1-experimental Phase9B evidence
  -> R9 production src/space implementation
       <-> R8.6 frozen Golden parity identity
  -> R10 route + semantic + Reference-First repairs
  -> R11 continuation
  -> R11.2 target scene authority / mode boundary
  -> CURRENT vnext orchestration
```

The final arrow means current orchestration contains accumulated layers, not that each old directory is imported. `r8_6_golden` and `phase9b_quality` resolve to the same current Space compiler. `vnext_legacy` is a separately selectable fallback.

```text
R11.1 continuation-v11
  -> R11.1 continuation-v12 smoke iteration
  -> R11.1 final continuation evidence

R12 production compiler: ? (NOT_PRESENT)
```

## Packaging / task schemas

```text
task 1.0 --migration/compatibility--> task 2.0
task 2.0 --migration/current source bundle--> task 3.0
task 3.0 -> current deliverable compiler
```

All nodes remain executable/tested; this is an evolution graph, not a removal plan.

## Labs visual translation

```text
visual-translation v1 schemas/prompts/checkpoint
  -> imported by visual-translation v2 runtime
  -> isolated lab runner/tests
```

This is another `HIDDEN_VERSION_DEPENDENCY`: lab v2 directly depends on v1.

## Test/smoke topology

| Class | Examples | Classification |
|---|---|---|
| CURRENT_WEB_SMOKE | `run-web-primary-smoke.mjs` | PROTECTED_BASELINE_INFRASTRUCTURE |
| CURRENT_PIPELINE_REGRESSION | root/desktop tests, R8.6/R9/R10/R11 tests | TEST_DEPENDENCY |
| LEGACY_DESKTOP_SMOKE | `real-provider-v6-smoke`, `real-provider-v18-1-smoke` | TEST_DEPENDENCY where package scripts invoke; otherwise UNKNOWN / KEEP |
| PHASE_SMOKE | phase9b, r85, r2-b4 runners | TEST_DEPENDENCY or UNKNOWN / KEEP |
| HISTORICAL_SMOKE_EVIDENCE | quality-baseline output directories | TEST_DEPENDENCY when tests bind them; otherwise HISTORICAL_REFERENCE |

## Naming collision summary

`v1`, `v2`, `v3`, `v5`, `vnext`, `R*`, schema `6.0` and product `5.0.0-rc.1` occupy independent namespaces. Numeric comparison across families is invalid.
