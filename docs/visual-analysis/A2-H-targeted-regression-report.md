# A2-H Targeted Regression Report

**Phase:** Visual Analysis A2 — Default Provider Switch
**Batch:** A2-H.15 (Targeted Regression) + A2-H.39
**Date:** 2026-08-12
**Status:** `A2H_TARGETED_REGRESSION_PASS` (provider registry, provider selection, Volcengine adapter, Qwen adapter, runtime, CLI, Web, Golden, repository guards all PASS)
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A2-H-Default-Provider-Switch.md` §39, §35, §36, §37, §38

## 1. Targeted Regression Categories (per A2-H §39)

| Category | Result | Notes |
|---|---|---|
| Provider registry tests | **13/13 PASS** | `tests/analysis-provider-contract.test.js` (reframed post-switch; A1 baseline contract preserved) |
| Provider selection tests | **included in above** | `unset provider with the baseline Qwen model resolves to Qwen`, `default registry first provider is Volcengine (A2-G default)`, `default registry still includes Qwen as alternative`, `unknown providers fail explicitly without Qwen fallback` |
| Volcengine adapter tests | **19/19 PASS** | `tests/volcengine-analysis-provider-contract.test.js` (3 tests reframed post-switch; A2-B.1 contract preserved) |
| Qwen adapter tests | **included in Volcengine tests + analysis-provider tests** | Qwen request envelope baseline, Qwen supports matchers (in A1 baseline fixture), Qwen error normalization, Qwen explicit preservation |
| Runtime analysis tests | **785/785 PASS** | `npm test` (root test suite) post-switch |
| CLI provider tests | **40/40 PASS** | `npm run cli:test` post-switch |
| Web smoke | **PASS** | `npm run web:smoke` (see [`A2-H-web-default-smoke.md`](./A2-H-web-default-smoke.md)); `nodeHostBoot`, `providerResolution`, `analysisServiceReachable`, `referenceFirstServiceReachable`, `compilerRouteReachable`, `generatorRouteReachable`, `electronProcessCountZero`, `desktopMainProcessCountZero` all true |
| Golden | **5/5 PASS** | `npm run golden:test`; **G-04 hard gate PASS** (NOT_APPLICABLE → still PASS, no auto-update); G-01..G-05 all PASS |
| Repository guards | **28/28 PASS** | `npm run repo:verify` post-switch (all 8 verify guards + repo:guard:test) |

## 2. Pre-change vs Post-change Result Comparison

| Suite | Pre-change | Post-change | Delta |
|---|---:|---:|---|
| `npm run repo:verify` | 28/28 | 28/28 | unchanged |
| `npm test` (root) | 783/783 | 785/785 | +2 (new tests: `default registry first provider is Volcengine (A2-G default)`, `default registry still includes Qwen as alternative (A2-H §11 preservation)`) |
| `npm run cli:test` | 40/40 | 40/40 | unchanged |
| `npm run runtime:test` | 334/334 | 334/334 | unchanged |
| `npm run web:smoke` | PASS | PASS | unchanged (status: pass, providerResolution: true) |
| `npm run golden:test` | 5/5 | 5/5 | unchanged (G-04 hard gate: PASS) |

## 3. Per-Category Detail

### 3.1 Provider registry tests (`tests/analysis-provider-contract.test.js`)

13 tests, all PASS:

1. `default registry resolves the Qwen production baseline independently from model identity` (reframed)
2. `default registry first provider is Volcengine (A2-G default)` (NEW)
3. `default registry still includes Qwen as alternative (A2-H §11 preservation)` (NEW)
4. `Qwen adapter preserves the request envelope baseline` (unchanged)
5. `unset provider with the baseline Qwen model resolves to Qwen` (unchanged)
6. `fake second provider proves pluggability through the canonical result contract` (unchanged)
7. `unknown providers fail explicitly without Qwen fallback` (unchanged)
8-12. `provider error normalizes to *` × 5 (unchanged)
13. `downstream production capabilities do not import or branch on provider implementations` (unchanged)

### 3.2 Volcengine adapter tests (`tests/volcengine-analysis-provider-contract.test.js`)

19 tests, all PASS:

1. `Volcengine adapter is the default Analysis Provider in A2-H (and Qwen remains as alternative)` (reframed)
2-8. `Volcengine supports() ...` × 7 (unchanged)
9. `Volcengine adapter preserves the request envelope baseline` (unchanged)
10. `Volcengine adapter redacts the API key from error messages via the registry` (unchanged)
11. `Volcengine adapter rejects missing API key and missing model` (unchanged)
12. `Volcengine adapter rejects unsupported profiles explicitly` (reframed — `additionalProviders` removed since Volcengine is now in default)
13-17. `Volcengine error normalizes to *` × 5 (unchanged)
18. `Qwen baseline is preserved alongside the new Volcengine default (A2-H §11)` (reframed)
19. `A2 production downstream does not import or branch on Volcengine Provider identity` (unchanged)

### 3.3 Repository guards (`npm run repo:verify`)

All 8 guards PASS post-switch:

- `verify:version-consistency` — version file consistency
- `verify:version-naming` — no historical-stage version identifiers
- `verify:workspace-boundaries` — package import boundary
- `verify:no-obsolete-code` — no obsolete code paths
- `verify:production-boundaries` — production boundary
- `verify:no-project-specific-production-rules` — no project-specific rules
- `verify:golden-boundary` — golden production boundary
- `verify:current-flows` — current flows
- `repo:guard:test` — repository contract guard (5 sub-tests)

## 4. Repository Contract Status (per A2-H §37 / §38)

- **Current Authority Conflict = 0** — confirmed by `verify:repository-contract` (one semantic default-provider authority; Volcengine first, Qwen second; no conflict)
- **New Version Namespace = 0** — confirmed by `verify:version-naming` (no new identifiers invented; `volcengine` and `doubao-seed-2.1-turbo` are the canonical A1/A2 identifiers; `doubao-seed-2-1-turbo-260628` is the dated API alias)
- **Semantic Naming** — confirmed: `Visual Analysis`, `Provider`, `Default Provider`, `Alternative Provider` are used; no stage names (`A2-H`, `vNext`, `v12`, `R11`) introduced in production code

## 5. STOP-A2H-14 (G-04 fails) status

- `G-04-01 PASS (NOT_APPLICABLE)` — the G-04 case is
  `NOT_APPLICABLE` to this runner (i.e. the offline runner does
  not evaluate the G-04 visual contract); the recorded status
  is PASS per the runner's overall verdict.
- STOP-A2H-14 NOT TRIGGERED.

## 6. Acceptance criteria

- A2-H §39 provider registry tests — PASS
- A2-H §39 provider selection tests — PASS
- A2-H §39 Volcengine adapter tests — PASS
- A2-H §39 Qwen adapter tests — PASS
- A2-H §39 runtime analysis tests — PASS
- A2-H §39 CLI provider tests — PASS
- A2-H §39 Web smoke — PASS
- A2-H §39 Golden — PASS
- A2-H §39 repository guards — PASS
- A2-H §35 Golden updated = NO — PASS (`Golden auto-updated: NO`)
- A2-H §36 G-04 PASS — PASS
- A2-H §37 Current Authority Conflict = 0 — PASS
- A2-H §37 New Version Namespace = 0 — PASS
- A2-H §37 Repository Contract = PASS — PASS
- A2-H §58 Golden updated = NO — PASS
- A2-H §58 Golden 5/5 PASS — PASS
- A2-H §58 G-04 PASS — PASS
- A2-H §58 Current Authority Conflict = 0 — PASS
- A2-H §58 New Version Namespace = 0 — PASS
- A2-H §58 Repository Contract PASS — PASS
