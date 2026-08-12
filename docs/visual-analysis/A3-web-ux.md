# A3-I Web UX (Minimal)

**Phase:** Visual Analysis A3 — Default Provider Transition & Production Readiness
**Batch:** A3-I
**Date:** 2026-08-12
**Status:** `A3_I_WEB_UX_DESIGNED` (design doc; code change in A3 Phase 2)
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A3-Default-Provider-Transition-Production-Readiness.md` §27, §28, §29, §30
**Predecessor:** A3-G CLI closure design

## 1. Purpose (per A3 spec §27)

Minimal UI only. Show:

```text
current provider
current model
fallback / alternative availability
```

where appropriate. **Do not redesign the whole Visual Analysis
workspace.**

## 2. Default UX (per A3 spec §28)

A new / default configuration should resolve to:

```text
Volcengine / doubao-seed-2.1-turbo
```

after A2-H / A2-I have approved the transition.

## 3. Qwen UX (per A3 spec §29)

Qwen remains selectable. **Do not label it deprecated** unless a
future phase explicitly decides that.

## 4. Failure UX (per A3 spec §30)

If Volcengine fails, user-visible status should distinguish:

```text
Volcengine failed
Qwen fallback used
```

from:

```text
Volcengine succeeded
```

This is a **user-facing** distinction, not just a telemetry
field. The UI must surface it.

## 5. Current Web UI State

The Web UI surfaces provider identity through the profile store
(`apps/web-runtime/src/node-settings-store.ts`). The Visual
Analysis workspace currently does not display a live "current
provider / current model / fallback available" badge.

A2-H `A2-H-web-default-smoke.md` recorded `web:smoke` PASS with
`providerResolution: true` — the runtime can resolve the
default provider. The Web UI does not yet show this to the
user in a dedicated badge.

## 6. A3-I design (Phase 2)

A minimal Web UI addition:

- A small badge in the Visual Analysis workspace header
  showing:
  - Current provider (e.g. `Volcengine` or `Qwen`)
  - Current model (e.g. `doubao-seed-2-1-turbo-260628` or `qwen3.6-plus`)
  - Fallback availability indicator (e.g. `Fallback: Qwen available`)

- A status line after a run:
  - On success: `Volcengine succeeded`
  - On fallback: `Volcengine failed · Qwen fallback used`
  - On non-fallback failure: `Volcengine failed: <error code>`

The badge is **read-only** (no provider selection in the UI; the
user can change the provider through the existing API profile
settings page). The implementation is a single React component
that reads from `getSettings()` and the run-report metadata.

## 7. No UI redesign

A3-I does **not**:

- Redesign the Visual Analysis workspace layout
- Add a runtime provider selector
- Add a per-task provider picker
- Change the Visual Analysis input flow
- Change the report layout

It only adds a **minimal** badge + status line in the existing
header.

## 8. STOP-A3 gate precheck

- STOP-A3-04 (Need to add provider branches to downstream business logic) NOT TRIGGERED (the badge is read-only; the Web UI does not branch on provider in business logic)
- STOP-A3-08 (Provider secrets reach browser renderer) NOT TRIGGERED (the badge shows the **provider name** and **model name**, not the API key; per A2-H §34 + A2-I §33, API keys are never sent to the renderer)

## 9. Acceptance

- [x] Current provider / model / fallback availability shown in Web UI (designed; implementation in Phase 2)
- [x] Default UX: new configuration resolves to Volcengine / doubao-seed-2.1-turbo
- [x] Qwen remains selectable (existing API profile mechanism)
- [x] Failure UX distinguishes Volcengine failed · Qwen fallback used from Volcengine succeeded
- [ ] (Phase 2) React badge component implemented
- [ ] (Phase 2) Run-report metadata read in the badge
- [ ] (Phase 2) No provider secret in renderer (verified by code review)
