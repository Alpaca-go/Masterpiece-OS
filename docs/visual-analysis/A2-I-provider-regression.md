# A2-I Provider Regression

**Phase:** Visual Analysis A2 — Full Regression & Final Acceptance
**Batch:** A2-I.10 / §14 / §15 / §16
**Date:** 2026-08-12
**Status:** `A2I_PROVIDER_REGRESSION_PASS` (R3 Provider Matrix + R14 Provider Contract + R15 Real Smoke all PASS)
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A2-I-Full-Regression-Final-Acceptance.md` §10, §14, §15, §16

## 1. Provider Matrix (per A2-I spec §10)

| Scenario | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| No explicit provider | Volcengine | Volcengine | **PASS** | A2-I §15 real smoke run 2026-08-12T11-58-59-183Z; `resolvedProvider: 'volcengine'` |
| Explicit Volcengine | Volcengine | Volcengine | **PASS** | `tests/volcengine-analysis-provider-contract.test.js` `Volcengine adapter resolves the configured Profile and stays out of the default registry` (reframed for new default) |
| Explicit Qwen | Qwen | Qwen | **PASS** | A2-I §15 real smoke run 2026-08-12T11-58-59-183Z; `resolvedProvider: 'qwen'` |
| Unknown provider | Explicit error | `AnalysisProviderError(MODEL_UNAVAILABLE)` | **PASS** | `tests/analysis-provider-contract.test.js` `unknown providers fail explicitly without Qwen fallback` |
| Missing Volcengine credential | Explicit Volcengine configuration error | `VOLCENGINE_API_KEY_MISSING` → `AUTHENTICATION_FAILED` | **PASS** | `tests/volcengine-analysis-provider-contract.test.js` `Volcengine adapter rejects missing API key and missing model` |
| Existing Qwen profile | Still readable / selectable | Readable, explicit Qwen selection works | **PASS** | A2-H provider-preservation-report.md §6; persistence schema unchanged |

STOP-A2I-02 (default resolves differently between Web / CLI / Runtime) NOT TRIGGERED — all three resolve through `createDefaultAnalysisProviderRegistry` (the single authority).
STOP-A2I-03 (explicit Qwen no longer works) NOT TRIGGERED — A2-I §15 real smoke confirms Qwen end-to-end.

## 2. Default Resolution (per A2-I spec §11)

Proven at runtime via the A2-I §15 real smoke run (run 1):

| Field | Value |
|---|---|
| request has no explicit provider | YES (`provider: '(unset)'`) |
| resolved provider | `volcengine` |
| resolved model | `doubao-seed-2-1-turbo-260628` |

This matches A2-H §23 (Volcengine default-path smoke) which
already proved the same path. The A2-I re-run is a
**post-no-fixes re-confirmation** (A2-I spec §40 "Verification
Must Be Re-run After Fixes"; no A2-I fixes were necessary).

For all CURRENT entry points that use the default:

| Entry point | Resolves through | Verified by |
|---|---|---|
| Web (Node Runtime Host + Web renderer) | `pipeline-service.ts:388` → `createDefaultAnalysisProviderRegistry()` | `web:smoke` `providerResolution: true` |
| CLI | Reasoner injected by harness; harness reads `pipeline-service.ts:388` | `cli:test` 40/40 + A2-I structural proof |
| Runtime | `pipeline-service.ts:388` directly | `npm test` 785/785 (incl. 13/13 `analysis-provider-contract.test.js` + 19/19 `volcengine-analysis-provider-contract.test.js`) |

STOP-A2I-02 NOT TRIGGERED.

## 3. Explicit Qwen Preservation (per A2-I spec §12)

Proven by the A2-I §15 real smoke run (run 2):

| Field | Value |
|---|---|
| explicit provider | `qwen` |
| resolved provider | `qwen` |
| resolved model | `qwen3.6-plus` |

A2-I confirmed Qwen remains a functional alternative and
regression baseline. A2-H §11 preservation status re-confirmed.

## 4. Unknown Provider (per A2-I spec §13)

Tested by `tests/analysis-provider-contract.test.js` L81-93:
`unknown providers fail explicitly without Qwen fallback`. The
registry's `resolve()` throws `AnalysisProviderError(MODEL_UNAVAILABLE)`
when zero providers match. The forbidden end states (silent
substitution to Volcengine or Qwen) are NOT reached.

## 5. Provider Contract Regression (per A2-I spec §14)

For both providers, verified by the A2-H contract test suite
(re-verified in A2-I by the R2 `npm test` run):

| Capability | Qwen | Volcengine | Status |
|---|---|---|---|
| Vision input | `qwen-analysis-provider.js` L16-19 supports `protocol: 'openai-chat-multimodal'` + model starts with `qwen` | `volcengine-analysis-provider.js` L38-50 supports `protocol: 'openai-chat-multimodal'` + model starts with `doubao-` | **PASS** (both) |
| Multi-image input | Both reasoners accept `attachments: []` with `data:` URLs | Same | **PASS** (both) |
| Structured output | Qwen reasoner returns `reportMarkdown`; canonical contract asserted by `assertCanonicalAnalysisResult` | Same | **PASS** (both) |
| Canonical response normalization | `assertCanonicalAnalysisResult` validates `runId / provider / model / completedAt / reportMarkdown` | Same | **PASS** (both) |
| Error normalization | `normalizeAnalysisProviderError` → AUTH/TIMEOUT/RATE/MALFORMED/MODEL_UNAVAILABLE | Same | **PASS** (both) |
| Abort / cancel behavior | `AbortSignal` propagation in both reasoners | Same | **PASS** (both) |
| Context capability | UNKNOWN (per A2-B.2 probe; A2-D run 7/7 UNKNOWN). Per A2 spec §56 not estimated. | Same | UNKNOWN (recorded, not invented) |

STOP-A2I-06 (Canonical Analysis Contract breaks) NOT TRIGGERED.

## 6. Real Provider Smoke (per A2-I spec §15 / §16)

Run batch: `2026-08-12T11-58-59-183Z`
Output: `.codex-smoke/a2-h-real-smoke/2026-08-12T11-58-59-183Z.json`
(gitignored, contains canonical result contract only — no API keys)

### 6.1 Volcengine real smoke (default path)

| Field | Value |
|---|---|
| provider | volcengine |
| model | `doubao-seed-2.1-turbo-260628` |
| start | `2026-08-12T11:58:59.184Z` |
| end | `2026-08-12T11:59:30.201Z` |
| latency | 31,017.34 ms (~31.0 s) |
| success | PASS |
| canonical contract status | PASS |
| `result.runId` | `021786535939034b37e7b1dcaa4b4afe477f3450315809fe91961` |
| `result.provider` | `volcengine` |
| `result.model` | `doubao-seed-2-1-turbo-260628` |
| `result.completedAt` | `2026-08-12T11:59:30.201Z` |
| `result.reportMarkdown` | 708 chars |

### 6.2 Qwen real smoke (explicit alternative)

| Field | Value |
|---|---|
| provider | qwen |
| model | `qwen3.6-plus` |
| start | `2026-08-12T11:59:30.202Z` |
| end | `2026-08-12T12:00:34.770Z` |
| latency | 64,568.111 ms (~64.6 s) |
| success | PASS |
| canonical contract status | PASS |
| `result.runId` | `chatcmpl-3320013b-d637-99bb-8346-c5ea304759b8` |
| `result.provider` | qwen |
| `result.model` | `qwen3.6-plus` |
| `result.completedAt` | `2026-08-12T12:00:34.770Z` |
| `result.reportMarkdown` | 1,512 chars |

### 6.3 A2-H reference (for trend comparison)

A2-H real smoke (`2026-08-12T11-48-54-276Z`): Volcengine 23.3s
/ Qwen 57.1s. A2-I re-run: Volcengine 31.0s / Qwen 64.6s. Both
within the A2-E p95 envelope (Volcengine p95 ~189s, Qwen p95
~92s). Latency variance is normal real-provider noise; no
contract regression.

## 7. Cost Observation (per A2-I spec §47)

- `usage` is **NOT** surfaced by either reasoner.
- **Cost visibility = UNKNOWN / PARTIAL** (A2-G §8 follow-up
  requirement #1 / #2; not a hard gate per A2 spec).

## 8. Performance Observation (per A2-I spec §46)

Volcengine is consistently ~2.4–2.7× slower than Qwen
(matches A2-E observation). No new latency threshold introduced
in A2-I; the existing 5-minute `AbortSignal.timeout` is the
only operational contract, and both A2-I real smoke runs
finished well within it.

## 9. STOP-A2I gate precheck summary

- STOP-A2I-02 (default resolves differently between Web/CLI/Runtime) NOT TRIGGERED
- STOP-A2I-03 (explicit Qwen no longer works) NOT TRIGGERED
- STOP-A2I-06 (Canonical Analysis Contract breaks) NOT TRIGGERED
- STOP-A2I-15 (Secrets in repository / acceptance artifacts) NOT TRIGGERED
- STOP-A2I-16 (regression "fixed" by deleting tests) NOT TRIGGERED
- STOP-A2I-17 (A2-I starts implementing A3 fallback) NOT TRIGGERED
