# A2-I Regression Matrix

**Phase:** Visual Analysis A2 — Full Regression & Final Acceptance
**Batch:** A2-I.48 (Regression Matrix)
**Date:** 2026-08-12
**Status:** `A2I_REGRESSION_MATRIX_IN_PROGRESS` (R1 + R2 + R3 + R4 + R5 + R6 results being collected)
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A2-I-Full-Regression-Final-Acceptance.md` §48, §5

## 1. Matrix Sections (per A2-I spec §48)

- Repository
- Runtime
- Web
- CLI
- Provider
- Persistence
- Reference First
- Generation
- Golden
- Prompt
- Security

Each row: Test | Expected | Actual | Status | Evidence | Notes

## 2. R1 — Repository Contract

| Test | Expected | Actual | Status | Evidence | Notes |
|---|---|---|---|---|---|
| `npm run repo:verify` (28 guards) | PASS | 28/28 PASS | **PASS** | `ℹ tests 28, pass 28, fail 0, duration_ms 507.4778` | All 8 verify guards + repo:guard:test PASS |
| `verify:repository-contract` | PASS | PASS | **PASS** | repo:verify output | Current Authority Conflict = 0, New Version Namespace = 0 |
| `verify:version-consistency` | PASS | PASS | **PASS** | repo:verify output | Version = `5.0.0-rc.1` |
| `verify:version-naming` | PASS | PASS | **PASS** | repo:verify output | No historical-stage version identifiers |
| `verify:workspace-boundaries` | PASS | PASS | **PASS** | repo:verify output | No cross-package deep import violations |
| `verify:no-obsolete-code` | PASS | PASS | **PASS** | repo:verify output | No legacy Desktop / vNext / v12 code paths |
| `verify:production-boundaries` | PASS | PASS | **PASS** | repo:verify output | No production / evaluation cross-boundary leaks |
| `verify:no-project-specific-production-rules` | PASS | PASS | **PASS** | repo:verify output | No project-specific rules in production |
| `verify:golden-boundary` | PASS | PASS | **PASS** | repo:verify output | Golden production boundary intact |
| `verify:current-flows` | PASS | PASS | **PASS** | repo:verify output | Current flows intact |
| `repo:guard:test` | PASS | PASS | **PASS** | repo:verify output | repository-contract-guard, version-naming-guard, archive-boundary, runtime-boundary, web-runtime-host-boundary, runtime-core operation-registry — all PASS |
| Current Authority Conflict | 0 | 0 | **PASS** | A2-H §6 audit + R1 guards | STOP-A2I-13 NOT TRIGGERED |
| New Version Namespace | 0 | 0 | **PASS** | `verify:version-naming` | STOP-A2I-14 NOT TRIGGERED |

## 3. R2 — Automated Current Flows (per A2-I spec §8)

| Test | Expected | Actual | Status | Evidence | Notes |
|---|---|---|---|---|---|
| `npm test` (root test suite) | PASS | 785/785 PASS | **PASS** | `ℹ tests 785, pass 785, fail 0, duration_ms 11576.2741` | Includes `tests/analysis-provider-contract.test.js` 13/13, `tests/volcengine-analysis-provider-contract.test.js` 19/19, all `tests/*.test.js`, `tests/packages/*/*.test.js`, `tests/image-generation/*.test.js` |
| `npm run cli:test` | PASS | 40/40 PASS | **PASS** | `ℹ tests 40, pass 40, fail 0, duration_ms 2525.4168` | All CLI tests pass; CLI does not own a default-provider authority (A2-H §21) |
| `npm run runtime:test` | PASS | 334/334 PASS | **PASS** | `ℹ tests 334, pass 334, fail 0, duration_ms 18497.1065` | Includes `tests/packages/runtime-core/*.test.js` + `runtime-application:test` (tsx) |
| `npm run golden:test` | PASS | 5/5 PASS (overall PASS) | **PASS** | `Golden Regression Report` (G-01..G-05 all PASS, G-04 = NOT_APPLICABLE → PASS) | `Provider calls: 0`, `Golden auto-updated: NO` — STOP-A2I-09 / STOP-A2I-10 NOT TRIGGERED |
| **Total R2** | PASS | 1187 tests + 5 Golden | **PASS** | pre/post A2-H identical (no A2-I regression) | |

## 4. R3 — Provider Matrix (per A2-I spec §10)

| Scenario | Expected | Actual | Status | Evidence | Notes |
|---|---|---|---|---|---|
| No explicit provider | Volcengine | Volcengine | **PASS** | A2-H §23 real smoke + `default registry first provider is Volcengine (A2-G default)` test | Model-prefix dispatch: `model: 'doubao-seed-2-1-turbo-260628'` matches Volcengine `supports()` (no `provider` field needed) |
| Explicit Volcengine | Volcengine | Volcengine | **PASS** | Volcengine `supports()`: `provider === 'volcengine' || 'ark'` → true | Verified by A2-H contract tests |
| Explicit Qwen | Qwen | Qwen | **PASS** | A2-H §25 real smoke + `unset provider with the baseline Qwen model resolves to Qwen` test | A2-H §11 preservation verified end-to-end |
| Unknown provider | Explicit error | `AnalysisProviderError(MODEL_UNAVAILABLE)` | **PASS** | `unknown providers fail explicitly without Qwen fallback` test | registry.resolve() throws when 0 match; no silent fallback to Volcengine or Qwen |
| Missing Volcengine credential | Explicit Volcengine configuration error | `VOLCENGINE_API_KEY_MISSING` → normalized to `AUTHENTICATION_FAILED` | **PASS** | `Volcengine adapter rejects missing API key and missing model` test | No silent Qwen fallback (A2-I spec §13) |
| Existing Qwen profile | Still readable / selectable | Readable, Qwen explicit selection works | **PASS** | A2-H provider-preservation-report.md §6 | Profile schema unchanged; A2-H §33 system-default vs explicit-preference distinction documented |

## 5. R4 — Actual Web Acceptance (per A2-I spec §17)

To be filled in by the actual Web run. Pre-recorded (A2-H §18/§19)
result: PASS (`status: pass, providerResolution: true, all service
channels reachable, no Electron / Desktop process`). Re-run
mandatory per A2-I spec §42 after all A2-I fixes (currently
none planned).

## 6. R5 — Downstream Regression (per A2-I spec §21)

To be filled in by R5 inspection. Pre-recorded evidence:

- `tests/analysis-provider-contract.test.js` L107-128 scans
  `packages/runtime-core/src/application/` and
  `packages/image-generation-runtime/src/` for
  `from '@masterpiece/model-runtime/qwen-reasoner'` and
  `provider === 'qwen'` patterns. **Result: 0 violations.**
- `tests/volcengine-analysis-provider-contract.test.js` L148+
  scans the same paths for the symmetric Volcengine-leak
  pattern. **Result: 0 violations.**
- `runtime:test` 334/334 PASS confirms downstream consumption
  of `pipeline-service.ts` + analysis result contract.

## 7. R6 — Prompt Integrity (per A2-I spec §25)

| Test | Expected | Actual | Status | Evidence | Notes |
|---|---|---|---|---|---|
| Frozen Prompt changed | NO | NO | **PASS** | A2-H did not modify any prompt; A2-I does not either | STOP-A2I-07 NOT TRIGGERED |
| Prompt digest mismatch | 0 | 0 | **PASS** | `docs/visual-analysis/A2-evaluation-rubric.md` SHA-256 unchanged from A2-H §3 baseline (`7220F30F...`); same for `A2-evaluation-corpus.md` (`12D1526F...`) | STOP-A2I-08 NOT TRIGGERED |
| Golden updated | NO | NO | **PASS** | A2-H baseline fixtures SHA-256 unchanged: qwen-baseline `244D83C7...`, volcengine-baseline `4DBB0579...` | STOP-A2I-09 NOT TRIGGERED |

## 8. Persistence / Settings / Security (per A2-I spec §29 / §32 / §33)

To be filled in by R5 / Security inspection. Pre-recorded
(A2-H §31/§32/§33) result: existing projects not rewritten;
profile schema unchanged; no API keys in diff / logs / reports.

## 9. Feature Preservation Matrix (per A2-I spec §52)

| Feature | Current status |
|---|---|
| Visual Analysis | Operational (default = Volcengine, alternative = Qwen) |
| Project Visual Context | Unchanged (project-persistence schema provider-agnostic) |
| Reference First | Unchanged (downstream provider-agnostic) |
| Short-Chain Generation | Unchanged (separate from Visual Analysis provider) |
| Space Generation | Unchanged |
| Packaging Generation | (deferred / not in current production; out of A2-I scope per spec §21) |
| Project persistence | Read/Write unchanged |
| Settings / profile loading | Provider-agnostic; system default = Volcengine; user explicit Qwen preserved |
| CLI | Functional (`cli:test` 40/40) |
| Web | Functional (`web:smoke` PASS; Actual Web re-run pending in A2-I §42) |

`Current Product Feature Lost = 0` (target).

## 10. Acceptance Status (running count)

- R1 Repository: **PASS**
- R2 Runtime: **PASS**
- R3 Provider: **PASS**
- R4 Web (Actual): pending re-run per §42
- R5 Downstream: pre-recorded PASS (will be confirmed by §21 inspection)
- R6 Prompt: **PASS**
- Golden (R6 sub): **5/5 PASS, G-04 PASS**
- Persistence: pre-recorded PASS (A2-H §31/§32)
- Settings: pre-recorded PASS (A2-H §33)
- Security: pre-recorded PASS (A2-H §34)
- Feature preservation: pre-recorded **0 lost**
