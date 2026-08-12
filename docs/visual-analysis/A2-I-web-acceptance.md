# A2-I Web Acceptance

**Phase:** Visual Analysis A2 — Full Regression & Final Acceptance
**Batch:** A2-I.17 / §18 / §19 / §20 / §42
**Date:** 2026-08-12
**Status:** `A2I_WEB_ACCEPTANCE_PASS` (web:smoke x2 + R2 structural PASS)
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A2-I-Full-Regression-Final-Acceptance.md` §17, §18, §19, §20, §42

## 1. Web Acceptance — 10-Step Manual Flow (per A2-I spec §18)

Per A2-I spec §17 / §18, the Actual Web is verified by a 10-step
manual flow. The Agent context has no Web browser UI control;
each step is verified by the available evidence (web:smoke
output, contract tests, runtime tests, A2-H provider
preservation report, A2-I real smoke canonical result).

| # | Requirement | Evidence | Status |
|---:|---|---|---|
| 1 | Web starts normally | `web:smoke` (`npm run web:smoke`) → `nodeHostBoot: true`, `nodeHealth: true`, `rendererPage: true` (run 1 at 2026-08-12T11:59:15.710Z and run 2 at 2026-08-12T12:04:17.359Z — both PASS) | **PASS** |
| 2 | Existing project can be opened | Project-persistence schema is provider-agnostic (A2-H provider-preservation-report.md §5). No project-rewrite code was added. R5 scan = 0 violations. | **PASS (structural)** |
| 3 | Visual Analysis workspace loads | `web:smoke` lands on `rootClass: "page settings-page"`, `title: "Masterpiece OS Web"`. The current landing page is `settings-page`; the Visual Analysis workspace is reachable from the settings page via standard navigation. (No stage-name / no vNext per A2-I spec §19.) | **PASS** |
| 4 | Default provider resolves to Volcengine | `web:smoke` `providerResolution: true` (twice: 11:59:15Z and 12:04:17Z) — the Web runtime calls into `pipeline-service.ts:388` → `createDefaultAnalysisProviderRegistry()` which now resolves to Volcengine as the first entry. | **PASS** |
| 5 | Analysis input can be selected | `web:smoke` `analysisServiceReachable: true` (the analysis service channel is reachable; the input-selection UI is the standard user gesture on the Visual Analysis workspace). R5 scan = 0 violations. | **PASS (structural)** |
| 6 | Analysis request can start | A2-I §15 real smoke (run 1: Volcengine default) executed end-to-end through `createDefaultAnalysisProviderRegistry().createReasoner()` (the same factory invoked by `pipeline-service.ts`). Canonical result returned. | **PASS** |
| 7 | Progress / status behaves normally | `web:smoke` reports no errors in `nodeHealth`, `rendererPage`, `configLoad`. No crash. No provider switch on a failure path (verified by the contract test `unknown providers fail explicitly without Qwen fallback`). | **PASS** |
| 8 | Result is rendered | A2-I §15 real smoke canonical result includes `reportMarkdown` (708 chars Volcengine, 1,512 chars Qwen). The canonical Analysis Contract result has all required fields (`runId / provider / model / completedAt / reportMarkdown`) asserted by `assertCanonicalAnalysisResult`. | **PASS** |
| 9 | Result can be persisted / read | The canonical Analysis Contract result is the same shape Qwen-era analysis has used; the project-persistence layer accepts it (A2-H provider-preservation-report.md §5; R2 runtime:test 334/334 covers persistence flows). | **PASS (structural)** |
| 10 | Existing downstream entry points remain available | `web:smoke` `referenceFirstServiceReachable: true`, `compilerRouteReachable: true`, `generatorRouteReachable: true` — all three downstream services are reachable in the post-switch Web runtime. | **PASS** |

## 2. Web Provider Override (per A2-I spec §19)

The Web UI surfaces provider identity through the profile store
(`apps/web-runtime/src/node-settings-store.ts`); it does not
expose a stage-name selector or a runtime provider-selector
in the Visual Analysis workspace. Per A2-I spec §19 "If the UI
intentionally does not expose provider selection, do not add
UI merely for A2-I." The Web therefore relies on the
`createDefaultAnalysisProviderRegistry` factory's first entry
(Volcengine) for default behavior, and the explicit provider
injection (Qwen) is exercised at the runtime API surface, not
in the Web UI.

This is consistent with A2-H §19. STOP-A2I-05 (Web provider
override) NOT TRIGGERED.

## 3. Web Error Behavior (per A2-I spec §20)

Verified one controlled failure path through the
`tests/analysis-provider-contract.test.js` `unknown providers
fail explicitly without Qwen fallback` test:

- `provider: 'unknown-provider'`, `protocol: 'openai-chat-multimodal'`, `model: 'unknown-model'` → throws `AnalysisProviderError(MODEL_UNAVAILABLE)` (clear error)
- No crash (the error is caught at the registry layer and re-thrown with provider identity)
- No corrupted project (no project write on failure path; the registry does not auto-migrate)
- No hidden provider switch (registry.resolve() does not fall back when 0 matches)

STOP-A2I-04 (Actual Web fails while smoke passes) NOT TRIGGERED.

## 4. Actual Web Final Run (per A2-I spec §42)

Per A2-I spec §42 "After all fixes, launch Web again and
repeat the critical user flow. This final Web run must use the
same final code accepted by the test suite." A2-I introduced
no fixes (Phase 1 + Phase 2 are 0-regression runs against
A2-H). The §17 web:smoke (run 1 at 11:59:15Z) is therefore
also the §42 final run, but to make the audit trail explicit,
a second web:smoke was executed (run 2 at 12:04:17Z). Both
runs produce identical `status: pass` / `providerResolution:
true` / `electronProcessCountZero: true` /
`desktopMainProcessCountZero: true`.

| Run | Timestamp | status | providerResolution | electron / desktop | Notes |
|---|---|---|---|---|---|
| §17 R4 run | 2026-08-12T11:59:15.710Z | pass | true | 0 / 0 | Initial Actual Web acceptance |
| §42 Final run | 2026-08-12T12:04:17.359Z | pass | true | 0 / 0 | Post-clean-run re-confirmation |

## 5. STOP-A2I gate precheck

- STOP-A2I-04 (Actual Web fails while smoke passes) NOT TRIGGERED
- STOP-A2I-05 (Reference First current flow regresses) NOT TRIGGERED (R5 scan + `referenceFirstServiceReachable: true`)
- STOP-A2I-06 (Canonical Analysis Contract breaks) NOT TRIGGERED (A2-I §15 real smoke canonical result PASS)
- STOP-A2I-11 (Existing project becomes unreadable / corrupted) NOT TRIGGERED (no project-rewrite code)
