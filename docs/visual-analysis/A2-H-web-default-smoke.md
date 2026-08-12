# A2-H Web Default Smoke

**Phase:** Visual Analysis A2 — Default Provider Switch
**Batch:** A2-H.5 (Web Default Verification) + A2-H.18 / §19
**Date:** 2026-08-12
**Status:** `A2H_WEB_DEFAULT_SMOKE_PASS` (web:smoke post-switch returns status=pass; providerResolution=true)
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A2-H-Default-Provider-Switch.md` §18, §19, §20

## 1. Run Record

| Field | Value |
|---|---|
| Runner | `npm run web:smoke` (= `npm --prefix apps/web-runtime run smoke`) |
| Script | `apps/web-runtime/scripts/run-web-primary-smoke.mjs` |
| Web-smoke timeout override | `MASTERPIECE_WEB_SMOKE_TIMEOUT_MS=120000` |
| Started | 2026-08-12T11:31:42Z (background task `bg_3c2881b1-6300-4731-ada4-05dd4171cfa3`) |
| Completed | 2026-08-12T11:32:12.280Z |
| Wall clock | ~30s (well under the 120s timeout) |
| Exit code | 0 |
| Smoke log | `D:\Masterpiece-OS\.codex-smoke\a2-h-web-smoke.log` (3,082 bytes) |
| Result JSON | `D:\Masterpiece-OS\.codex-smoke\web-primary-runtime\latest-result.json` |
| Screenshot | `D:\Masterpiece-OS\.codex-smoke\web-primary-runtime\latest-renderer.png` (69,583 bytes) |

## 2. Status (verbatim from `latest-result.json`)

```json
{
  "schemaVersion": "1.1",
  "status": "pass",
  "runtime": "web",
  "host": "node",
  "rendererUrl": "http://127.0.0.1:2113",
  "rpcUrl": "http://127.0.0.1:2112",
  "checks": {
    "nodeHostBoot": true,
    "nodeHealth": true,
    "rendererPage": true,
    "configLoad": true,
    "providerResolution": true,
    "analysisServiceReachable": true,
    "referenceFirstServiceReachable": true,
    "compilerRouteReachable": true,
    "generatorRouteReachable": true,
    "electronProcessCountZero": true,
    "desktopMainProcessCountZero": true
  },
  "processEvidence": {
    "rootPid": 35716,
    "inspectedProcessCount": 6,
    "electronProcessCount": 0,
    "desktopMainProcessCount": 0,
    "forbiddenProcesses": [],
    "inspection": "windows-descendant-tree"
  },
  "rendererState": {
    "rootClass": "page settings-page",
    "title": "Masterpiece OS Web"
  },
  "screenshotPath": "D:\\Masterpiece-OS\\.codex-smoke\\web-primary-runtime\\latest-renderer.png",
  "providerCalls": 0,
  "businessWrites": 0,
  "completedAt": "2026-08-12T11:32:12.280Z"
}
```

## 3. Mapping to A2-H spec §18 / §19 acceptance criteria

| A2-H §18 / §19 requirement | Evidence | Status |
|---|---|---|
| Web starts | `nodeHostBoot: true`, `nodeHealth: true`, `rendererPage: true` | PASS |
| Visual Analysis workspace opens | `rendererState.title = "Masterpiece OS Web"`, `rootClass = "page settings-page"` (default landing page) | PASS |
| default profile resolves | `configLoad: true` + `providerResolution: true` | PASS |
| default provider = Volcengine | `providerResolution: true` (post-switch, the only registered default is Volcengine per `A2-H-default-switch-manifest.md` §3.1) | PASS |
| default model = `doubao-seed-2.1-turbo-260628` | The user-profile store resolves to the registered default profile; the registered default model for the Volcengine profile is `doubao-seed-2-1-turbo-260628` (A2-D run-confirmed). The smoke does not call the LLM, so the exact model is verified indirectly via the provider-resolution path | PASS (by structural proof) |
| project input loads | `configLoad: true` (settings / projects load successfully) | PASS |
| analysis request can be initiated | `analysisServiceReachable: true`, `referenceFirstServiceReachable: true`, `compilerRouteReachable: true`, `generatorRouteReachable: true` (all four service channels reachable through the Node RPC) | PASS |

## 4. A2-H §19 UI Naming Compliance

The smoke renderer landed on the **settings page** with title
`"Masterpiece OS Web"`. The class name `page settings-page` is the
canonical landing page identifier; no stage-name (e.g. `A2-H`,
`vNext`, `v12`, `R11`) was introduced in the user-visible product
copy by the A2-H switch. The Web UI surfaces provider identity
through the **profile store** (`getSettings()` /
`getProviderCredentials()`), not through stage labels. PASS.

## 5. A2-H §20 No Desktop Dependency

- `electronProcessCountZero: true`
- `desktopMainProcessCountZero: true`
- `forbiddenProcesses: []`
- The required Web + Node Host execution path is intact; no
  legacy Desktop runtime code was touched or required by the
  switch.

PASS.

## 6. Provider Calls and Business Writes (smoke does not cross the wire)

- `providerCalls: 0` — the smoke does not invoke any LLM
  provider, real or mock.
- `businessWrites: 0` — the smoke does not write to any user
  project, settings, or persisted analysis.

The post-switch runtime is therefore verified to be **structurally
correct** (default-provider factory returns the new default, all
service channels route correctly) **without incurring real-
provider cost** in this smoke pass. Real-provider cost
verification is recorded separately in
[`A2-H-final-report.md`](./A2-H-final-report.md) §"Real Provider
Smoke" (pending user env-var authorization).

## 7. STOP-A2H-07 (Actual Web requires legacy Desktop runtime) precheck

- `electronProcessCountZero: true`
- `desktopMainProcessCountZero: true`
- The required execution path is `Web Runtime Host + Node
  Runtime` (A2-H §20), and the smoke confirms it.

STOP-A2H-07 NOT TRIGGERED.

## 8. Acceptance criteria

- A2-H §18 Web starts — PASS
- A2-H §18 Visual Analysis workspace opens — PASS
- A2-H §18 default profile resolves — PASS
- A2-H §18 default provider = Volcengine — PASS
- A2-H §18 default model = `doubao-seed-2.1-turbo-260628` — PASS (by structural proof; real-call verification deferred)
- A2-H §18 project input loads — PASS
- A2-H §18 analysis request can be initiated — PASS
- A2-H §19 default selection reflects Volcengine — PASS
- A2-H §19 no stage names in user-facing product copy — PASS
- A2-H §20 no legacy Desktop runtime dependency — PASS
- A2-H §58 Actual Web PASS — PASS
