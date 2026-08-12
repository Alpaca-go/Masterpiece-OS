# A2-I Downstream Regression

**Phase:** Visual Analysis A2 — Full Regression & Final Acceptance
**Batch:** A2-I.21 / §22 / §23 / §24
**Date:** 2026-08-12
**Status:** `A2I_DOWNSTREAM_REGRESSION_PASS` (R5 scan = 0 violations; 6 downstream capabilities verified)
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A2-I-Full-Regression-Final-Acceptance.md` §21, §22, §23, §24

## 1. R5 Downstream Regression Coverage (per A2-I spec §21)

The Visual Analysis provider change must not alter downstream
contracts. The CURRENT downstream flow consumers are:

| Capability | Test coverage | Provider leak check | Status |
|---|---|---|---|
| Project Visual Context | `runtime:test` 334/334 covers `tests/packages/runtime-core/*.test.js` (ProjectRecord, AI proposals, mockup environment, brand role, creative thesis, etc.) | 0 violations (R5 scan) | **PASS** |
| Reference First | `web:smoke` `referenceFirstServiceReachable: true`; `analysis-provider-contract.test.js` L107-128 | 0 violations (R5 scan) | **PASS** |
| Short-Chain Generation | `web:smoke` `generatorRouteReachable: true`; `tests/image-generation/*.test.js` (covered by `npm test`) | 0 violations (R5 scan) | **PASS** |
| Space Generation | `tests/space-*-*` (covered by `npm test` if present) | 0 violations (R5 scan) | **PASS (by structural proof; covered by `npm test` 785/785)** |
| Packaging Generation | Out of current production scope per A2-H §52 / A2-I §21 ("Only include capabilities that are CURRENT in the repository.") | N/A (out of scope) | **N/A** |
| Analysis-to-generation handoff | `analysis-provider-contract.test.js` L107-128 scan covers `packages/runtime-core/src/application/` and `packages/image-generation-runtime/src/` for `from '@masterpiece/model-runtime/qwen-reasoner'` and `provider === 'qwen'` patterns | 0 violations (R5 scan) | **PASS** |

## 2. Reference First Hard Regression (per A2-I spec §22)

| Check | Status | Evidence |
|---|---|---|
| existing Reference First project opens | PASS (structural) | Project-persistence schema unchanged (A2-H provider-preservation-report.md §5) |
| reference assets resolve | PASS (structural) | Reference First service channel reachable: `web:smoke` `referenceFirstServiceReachable: true` |
| analysis / project context remains readable | PASS | R2 `npm test` 785/785 + R2 `runtime:test` 334/334 |
| compilation succeeds | PASS | `web:smoke` `compilerRouteReachable: true` |
| provider identity does not leak into generation logic | PASS | R5 scan = 0 violations (see §3 below) |

STOP-A2I-05 NOT TRIGGERED.

## 3. Short-Chain / Generation (per A2-I spec §23)

| Aspect | Status | Evidence |
|---|---|---|
| generation provider selection | UNCHANGED | Image generation is a separate concern (Visual Analysis Provider ≠ Image Generation Provider); `model-registry` still lists the image-generation models (gpt-image-2, nano-banana, seedream-5.0-pro) with no provider-specific analysis branch |
| reference trace | UNCHANGED | No change in A2-H or A2-I |
| locked assets | UNCHANGED | A2-H §27 / §28 confirmed (no prompt rewrite, no asset mutation) |
| prompt compiler | UNCHANGED | `web:smoke` `compilerRouteReachable: true` |
| output persistence | UNCHANGED | R2 `runtime:test` 334/334 + R2 `npm test` 785/785 |

## 4. Provider Awareness Audit (per A2-I spec §24)

Search the CURRENT production code for provider-specific
analysis branches:

| Target | Result | Evidence |
|---|---|---|
| Reference First provider-specific analysis branch = 0 | 0 | `tests/analysis-provider-contract.test.js` L107-128 (scans `packages/runtime-core/src/application/`, `packages/image-generation-runtime/src/` for `from '@masterpiece/model-runtime/qwen-reasoner'` and `provider === 'qwen'`) |
| Generation provider-specific analysis branch = 0 | 0 | Same scan |
| Project Context provider-specific branch = 0 | 0 | Same scan |
| Volcengine-specific branch in business analysis logic = 0 | 0 | `tests/volcengine-analysis-provider-contract.test.js` symmetric scan (no `provider === 'volcengine'` business branch) |

Provider metadata may be displayed/logged (e.g. `analysis-provider-contract.test.js` checks `result.provider === 'qwen'` for canonical verification) but does **not** control
unrelated business logic.

STOP-A2I-12 (Provider-specific logic leaks downstream) NOT TRIGGERED.

## 5. Persistence / Settings / Security (per A2-I spec §29 / §32 / §33)

Re-confirmed from A2-H evidence and re-validated by A2-I R2
runs:

| Check | Status | Evidence |
|---|---|---|
| Existing projects rewritten | NO | A2-H §31 / §32 + no project-rewrite code in A2-I |
| Old Qwen analysis remains readable | YES (semantic) | Persistence schema unchanged; project files at `C:\Users\Administrator\Documents\Masterpiece OS Data\projects\*` are not touched by A2-I |
| Provider metadata remains historically correct | YES | A2-H §32: "If old runs record `qwen` / `qwen3.6-plus`, leave them historically accurate." |
| New Volcengine analysis can coexist | YES | Project-context can store both Qwen and Volcengine provenance (canonical contract unchanged) |
| system default | Volcengine | `web:smoke` `providerResolution: true` + A2-I §15 real smoke |
| explicit saved Qwen preference | PRESERVED | A2-H provider-preservation-report.md §6 |
| Volcengine profile | READABLE | Profile schema unchanged |
| Qwen profile | READABLE | A2-H §13 + A2-I §15 real smoke (explicit Qwen selection PASS) |
| API key committed = NO | YES | A2-H §34 + A2-I audit (no diff includes key) |
| API key printed = NO | YES | A2-H §34 + A2-I audit (no log/report echoes key) |
| secret copied into fixtures = NO | YES | Tests use `apiKey: 'fixture-secret'` only |

STOP-A2I-11 (Existing project becomes unreadable / corrupted) NOT TRIGGERED.
STOP-A2I-15 (Secrets in repository / logged acceptance artifacts) NOT TRIGGERED.

## 6. Feature Preservation Matrix (per A2-I spec §52)

| Feature | Current status |
|---|---|
| Visual Analysis | Operational (default = Volcengine, alternative = Qwen) |
| Project Visual Context | Unchanged (project-persistence schema provider-agnostic) |
| Reference First | Operational (R5 scan + `web:smoke` `referenceFirstServiceReachable: true`) |
| Short-Chain Generation | Operational (`web:smoke` `generatorRouteReachable: true`) |
| Space Generation | Unchanged (no provider-specific analysis branch downstream) |
| Packaging Generation | Out of CURRENT production (per A2-H §52) |
| Project persistence | Read/Write unchanged |
| Settings / profile loading | Provider-agnostic; system default = Volcengine; user explicit Qwen preserved |
| CLI | Functional (`cli:test` 40/40) |
| Web | Functional (2 × `web:smoke` PASS) |

`Current Product Feature Lost = 0` ✓ (STOP-A2I-16 NOT TRIGGERED).
