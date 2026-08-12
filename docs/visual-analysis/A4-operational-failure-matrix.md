# A4-2 Operational Failure Matrix

**Phase:** Visual Analysis A4 — Production Freeze & Operational Baseline
**Date:** 2026-08-12
**Status:** `A4_OPERATIONAL_FAILURE_MATRIX_FROZEN`
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A4-Production-Freeze-Operational-Baseline.md` §6
**Predecessor:** A4-1 production contract freeze (`f6955fc`)
                A3 `VISUAL_ANALYSIS_A3_PASS` (commit `2514784`)

## 1. Purpose (per A4 spec §6)

Audit at least the following failure classes and record
`Trigger / Detected By / Canonical Error / Retry? / Fallback? /
User Message / Telemetry / Persistence Behavior / Blocking?` for
each. No silent failure is allowed. A4 must NOT expand the A3
retry/fallback behavior; this matrix freezes what the A3 path
actually does today.

## 2. Forbidden failure modes (per A4 spec §6)

```text
provider failure     → incomplete analysis reported as success
provider failure     → silent untraceable provider switch
invalid structured output → persisted as valid canonical result
```

A4 freezes the actual A3 behavior. The current code does NOT do
any of these. A4 introduces no new behavior; the matrix documents
the current behavior.

## 3. Failure matrix

The columns below are:

- **Trigger** — the user-visible or upstream condition
- **Detected By** — which code path raises the canonical error
- **Canonical Error** — the normalized error code (one of 6 in
  `packages/model-runtime/src/analysis-provider.js:1-8`) or a
  higher-level code
- **Retry?** — whether A3 implements retry
- **Fallback?** — whether A3 implements fallback (i.e. re-issue
  against the alternative provider)
- **User Message** — what the user sees in the Web / CLI
- **Telemetry** — what is recorded in the run report / provenance
- **Persistence Behavior** — what is written to disk
- **Blocking?** — does the failure abort the run?

### 3.1 missing credential

| Field | Value |
|---|---|
| Trigger | `QWEN_API_KEY` / `VOLCENGINE_API_KEY` / `ARK_API_KEY` not in `process.env`; or `provider.apiKey` not passed |
| Detected By | `qwen-reasoner.js:191-193` (`QWEN_API_KEY_MISSING`), `volcengine-reasoner.js:259-263` (`VOLCENGINE_API_KEY_MISSING`) |
| Canonical Error | upstream code `*_API_KEY_MISSING`; `normalizeAnalysisProviderError` maps to `AUTHENTICATION_FAILED` |
| Retry? | NO |
| Fallback? | NO (per A3-B `AUTH_ERROR` is excluded from fallback) |
| User Message | `未检测到 Qwen API Key / Volcengine API Key，无法运行真实 ... 分析` |
| Telemetry | run report `error.code = 'AUTHENTICATION_FAILED'`, `error.code = '<UPSTREAM>_API_KEY_MISSING'` |
| Persistence Behavior | reasoning cache NOT written; run report records failure; project state preserved |
| Blocking? | YES (terminal; no analysis result) |

### 3.2 401 unauthorized

| Field | Value |
|---|---|
| Trigger | upstream returns HTTP 401 (rejected API key) |
| Detected By | `qwen-reasoner.js:60-61` (`QWEN_API_ERROR`), `volcengine-reasoner.js:93-95` (`VOLCENGINE_API_ERROR`) |
| Canonical Error | upstream `*_API_ERROR`; `normalizeAnalysisProviderError` regex `/401\|403\|API_KEY\|AUTH\|UNAUTHORIZED\|FORBIDDEN/` maps to `AUTHENTICATION_FAILED` |
| Retry? | NO |
| Fallback? | NO (per A3-B `AUTH_ERROR` excluded) |
| User Message | `Qwen API 请求失败（HTTP 401）：<upstream detail>` (redacted) |
| Telemetry | run report `error.code = 'AUTHENTICATION_FAILED'`; `provenance.fallback = null` (no fallback executed) |
| Persistence Behavior | reasoning cache NOT written; run report records failure |
| Blocking? | YES |

### 3.3 403 forbidden

| Field | Value |
|---|---|
| Trigger | upstream returns HTTP 403 |
| Detected By | same as 3.2 |
| Canonical Error | `AUTHENTICATION_FAILED` (same regex) |
| Retry? | NO |
| Fallback? | NO (A3-B `AUTH_ERROR` excluded) |
| User Message | `Qwen API 请求失败（HTTP 403）：<upstream detail>` |
| Telemetry | same as 3.2 |
| Persistence Behavior | same as 3.2 |
| Blocking? | YES |

### 3.4 404 / model unavailable (where applicable)

| Field | Value |
|---|---|
| Trigger | upstream returns HTTP 404 with a "model not found" indication |
| Detected By | `qwen-reasoner.js:60-61` / `volcengine-reasoner.js:93-95` |
| Canonical Error | `MODEL_UNAVAILABLE` (per `normalizeAnalysisProviderError` regex `/404\|MODEL.*(?:NOT_FOUND\|UNAVAILABLE)\|DOES NOT EXIST/iu`) |
| Retry? | NO |
| Fallback? | CONFLICT — `MODEL_UNAVAILABLE` is in the A3-B eligible list (`TEMPORARY_PROVIDER_UNAVAILABLE`), but a 404 model-not-found is an excluded category. The A3 classification function uses the **code** field; today the upstream error does not differentiate "404 model not found" from "5xx upstream unavailable", so the A3 classification returns `TEMPORARY_PROVIDER_UNAVAILABLE`. A4-2 documents this as a known semantic gap; the dispatcher is not implemented (A4-1 §2.4). |
| User Message | `Qwen API 请求失败（HTTP 404）：<upstream detail>` |
| Telemetry | run report `error.code = 'MODEL_UNAVAILABLE'`; `provenance.fallback = null` (no fallback executed) |
| Persistence Behavior | reasoning cache NOT written; run report records failure |
| Blocking? | YES (no fallback executor) |

### 3.5 429 rate limit

| Field | Value |
|---|---|
| Trigger | upstream returns HTTP 429 |
| Detected By | `qwen-reasoner.js:60-61` / `volcengine-reasoner.js:93-95` |
| Canonical Error | `RATE_LIMITED` (per `normalizeAnalysisProviderError` regex `/429\|RATE_LIMIT/`) |
| Retry? | NO (current A3 reasoner does not retry) |
| Fallback? | ELIGIBLE per A3-B `RATE_LIMIT`. The classification returns `RATE_LIMIT`; the executor is NOT implemented (A4-1 §2.4). |
| User Message | `Qwen API 请求失败（HTTP 429）：<upstream detail>` |
| Telemetry | run report `error.code = 'RATE_LIMITED'`; `provenance.fallback = null` (no fallback executed) |
| Persistence Behavior | reasoning cache NOT written; run report records failure |
| Blocking? | YES (no fallback executor) |

### 3.6 network timeout

| Field | Value |
|---|---|
| Trigger | upstream takes longer than `maximumDurationMs` |
| Detected By | `qwen-reasoner.js:77-83` (`QWEN_REQUEST_TIMEOUT`), `volcengine-reasoner.js:115-121` (`VOLCENGINE_REQUEST_TIMEOUT`); `runClientWithDeadline` aborts with the timeout error |
| Canonical Error | `TIMEOUT` (per `normalizeAnalysisProviderError` regex `/TIMEOUT\|TIMED_OUT\|ABORT/` for the specific timeout code; for AbortError with a generic reason, regex maps to `TIMEOUT`) |
| Retry? | NO |
| Fallback? | ELIGIBLE per A3-B `TIMEOUT`. Classification returns `TIMEOUT`; executor not implemented. |
| User Message | `Qwen 请求超过 N 秒上限` |
| Telemetry | run report `error.code = 'TIMEOUT'`; `provenance.fallback = null` (no fallback executed) |
| Persistence Behavior | reasoning cache NOT written; run report records failure |
| Blocking? | YES (no fallback executor) |

### 3.7 DNS / network unavailable

| Field | Value |
|---|---|
| Trigger | `fetch` throws `ECONNREFUSED` / `ECONNRESET` / `ENOTFOUND` / `EAI_AGAIN` / `fetch failed` / etc. |
| Detected By | `qwen-reasoner.js:238-243` (`QWEN_REQUEST_FAILED`), `volcengine-reasoner.js:309-318` (`VOLCENGINE_REQUEST_FAILED`) |
| Canonical Error | `REQUEST_FAILED` (the generic catch-all; `normalizeAnalysisProviderError` does not have a specific network regex, but A3-B `classifyFallbackReason` independently classifies the message as `TRANSPORT_FAILURE`) |
| Retry? | NO |
| Fallback? | ELIGIBLE per A3-B `TRANSPORT_FAILURE`. Classification returns `TRANSPORT_FAILURE`; executor not implemented. |
| User Message | `Qwen 请求失败：<network error message>` (api key redacted) |
| Telemetry | run report `error.code = 'REQUEST_FAILED'`; A3-B `classifyFallbackReason(error)` returns `TRANSPORT_FAILURE` |
| Persistence Behavior | reasoning cache NOT written; run report records failure |
| Blocking? | YES (no fallback executor) |

### 3.8 provider 5xx

| Field | Value |
|---|---|
| Trigger | upstream returns HTTP 500 / 502 / 503 / 504 |
| Detected By | `qwen-reasoner.js:60-61` / `volcengine-reasoner.js:93-95` |
| Canonical Error | `REQUEST_FAILED` (the catch-all; the response was HTTP 5xx but the upstream reasoner code does not differentiate 5xx from 4xx other than via the embedded `HTTP <status>` text) |
| Retry? | NO |
| Fallback? | ELIGIBLE per A3-B `TRANSPORT_FAILURE`. `classifyFallbackReason` returns `TRANSPORT_FAILURE` based on `error.status` or the message text. |
| User Message | `Qwen API 请求失败（HTTP 503）：<upstream detail>` |
| Telemetry | run report `error.code = 'REQUEST_FAILED'`; A3-B `classifyFallbackReason` returns `TRANSPORT_FAILURE` |
| Persistence Behavior | reasoning cache NOT written; run report records failure |
| Blocking? | YES (no fallback executor) |

### 3.9 malformed provider response

| Field | Value |
|---|---|
| Trigger | upstream returns non-JSON or JSON that is not parseable |
| Detected By | `qwen-reasoner.js:62-64` (`QWEN_RESPONSE_INVALID`), `volcengine-reasoner.js:97-101` (`VOLCENGINE_RESPONSE_INVALID`); the `try { value = JSON.parse(raw) } catch { }` block in `defaultClient` |
| Canonical Error | `MALFORMED_RESPONSE` (per `normalizeAnalysisProviderError` regex `/EMPTY\|RESPONSE_INVALID\|MALFORMED\|PARSE/`) |
| Retry? | NO |
| Fallback? | EXCLUDED per A3-B `RESPONSE_INVALID` |
| User Message | `Qwen API 返回了无效 JSON` |
| Telemetry | run report `error.code = 'MALFORMED_RESPONSE'`; `provenance.fallback = null` |
| Persistence Behavior | reasoning cache NOT written; run report records failure |
| Blocking? | YES |

### 3.10 structured-output validation failure

| Field | Value |
|---|---|
| Trigger | upstream returns a `reportMarkdown` that fails downstream validation (e.g. `assertCanonicalAnalysisResult` missing one of the 5 required fields) |
| Detected By | `packages/model-runtime/src/analysis-provider.js:28-36` (`assertCanonicalAnalysisResult`); the registry's `createReasoner` wrapper at line 78-83 invokes it. |
| Canonical Error | `MALFORMED_RESPONSE` (`Analysis Provider result is missing <field>`) |
| Retry? | NO |
| Fallback? | EXCLUDED per A3-B `CONTRACT_VALIDATION_FAILED` |
| User Message | `Analysis Provider result is missing reportMarkdown` (or whichever field failed) |
| Telemetry | run report `error.code = 'MALFORMED_RESPONSE'`; `provenance.fallback = null` |
| Persistence Behavior | reasoning cache NOT written; run report records failure |
| Blocking? | YES |

### 3.11 empty response

| Field | Value |
|---|---|
| Trigger | upstream returns a `reportMarkdown` that is empty / whitespace-only |
| Detected By | `qwen-reasoner.js:262` (`QWEN_EMPTY_REPORT`), `volcengine-reasoner.js:339-343` (`VOLCENGINE_EMPTY_REPORT`) |
| Canonical Error | `MALFORMED_RESPONSE` (per `normalizeAnalysisProviderError` regex `/EMPTY/`) |
| Retry? | NO |
| Fallback? | EXCLUDED per A3-B `RESPONSE_INVALID` |
| User Message | `Qwen 返回了空报告，分析失败` |
| Telemetry | run report `error.code = 'MALFORMED_RESPONSE'`; `provenance.fallback = null` |
| Persistence Behavior | reasoning cache NOT written; run report records failure |
| Blocking? | YES |

### 3.12 aborted request

| Field | Value |
|---|---|
| Trigger | parent signal `controller.signal.aborted` (e.g. user clicks cancel, session guard aborts) |
| Detected By | `qwen-reasoner.js:85-126` `runClientWithDeadline` abort handler; emits `QWEN_REQUEST_ABORTED` (or carries through the parent `QwenReasonerError`). Volcengine equivalent at `volcengine-reasoner.js:123-164`. |
| Canonical Error | `REQUEST_FAILED` (the abort propagates as a generic `REQUEST_FAILED` with `code: 'QWEN_REQUEST_ABORTED'`) |
| Retry? | NO |
| Fallback? | EXCLUDED per A3-B `USER_CANCELLED` |
| User Message | `Qwen 请求已取消` |
| Telemetry | run report `error.code = 'REQUEST_FAILED'`; `error.cause = 'QWEN_REQUEST_ABORTED'`; `provenance.fallback = null` |
| Persistence Behavior | reasoning cache NOT written; run report records failure; project state preserved |
| Blocking? | YES (terminal abort) |

### 3.13 user cancellation

| Field | Value |
|---|---|
| Trigger | user explicitly cancels an in-flight analysis via the Web `取消分析` button or the CLI signal |
| Detected By | `apps/web/src/components/AnalysisView.tsx:24-30` `onCancel` button; `apps/cli/src/analysis-engine/creative-director/session-guard.js` session-guard abort path |
| Canonical Error | `REQUEST_FAILED` with upstream `*_REQUEST_ABORTED` |
| Retry? | NO |
| Fallback? | EXCLUDED per A3-B `USER_CANCELLED` |
| User Message | `Qwen 请求已取消` |
| Telemetry | run report `error.code = 'REQUEST_FAILED'`, `error.cause = 'QWEN_REQUEST_ABORTED'` |
| Persistence Behavior | reasoning cache NOT written; run report records `cancelled`; project state preserved; project remains open and can be retried |
| Blocking? | YES for the current run; project remains intact |

### 3.14 fallback unavailable

| Field | Value |
|---|---|
| Trigger | the A3-B dispatcher is not implemented; even if the reason were classified as `TIMEOUT` / `RATE_LIMIT` / `TRANSPORT_FAILURE` / `TEMPORARY_PROVIDER_UNAVAILABLE`, no fallback to the alternative provider is performed. |
| Detected By | (no executor; absence is the failure) |
| Canonical Error | same as the underlying error (no synthetic code) |
| Retry? | NO |
| Fallback? | NO — A3-B classifies; A3.x / A4 follow-up implements the executor. A4-2 freezes this as a known limitation. |
| User Message | (the underlying error message is surfaced) |
| Telemetry | `provenance.fallback = null` (record of "fallback considered but not executed") |
| Persistence Behavior | reasoning cache NOT written; run report records failure |
| Blocking? | YES (terminal) |

### 3.15 both providers unavailable

| Field | Value |
|---|---|
| Trigger | both Volcengine and Qwen fail (independently) |
| Detected By | (no executor; would require the fallback dispatcher) |
| Canonical Error | (last underlying error) |
| Retry? | NO |
| Fallback? | NO (executor not implemented) |
| User Message | (last underlying error message is surfaced; today only the default's error is shown) |
| Telemetry | (today: one run report per attempt; if a future executor runs both, the report would chain both failures) |
| Persistence Behavior | run report records the last failure; project state preserved |
| Blocking? | YES (terminal; analysis fails safely; failure is visible; no fake success) |

### 3.16 unknown provider (CLI / manual override)

| Field | Value |
|---|---|
| Trigger | user passes `--provider totally-fake` or `MASTERPIECE_PROVIDER=foo` |
| Detected By | `apps/cli/bin/masterpiece-os.js:resolveReasoner()` (C1) — `registry.resolve({ provider })` throws `AnalysisProviderError('MODEL_UNAVAILABLE', 'ANALYSIS_PROVIDER_UNSUPPORTED: <id>')`; the CLI wraps and re-throws as `REASONER_PROVIDER_UNSUPPORTED`. |
| Canonical Error | `MODEL_UNAVAILABLE` |
| Retry? | NO |
| Fallback? | NO (per A3-B `MODEL_NOT_FOUND` excluded) |
| User Message | `不支持的 Reasoner Provider：<id>（ANALYSIS_PROVIDER_UNSUPPORTED: <id>）` |
| Telemetry | run report `error.code = 'MODEL_UNAVAILABLE'` |
| Persistence Behavior | no run is launched; no run report; project state preserved |
| Blocking? | YES (pre-flight) |

## 4. Cancellation behavior (per A4 spec §6)

Cancellation must NOT:
- corrupt project state;
- persist partial success;
- trigger uncontrolled fallback;
- continue unnecessary paid calls where abort is supported.

Current behavior (frozen by A4-2):
- `*_REQUEST_ABORTED` propagates as a `REQUEST_FAILED`-class error
  with the upstream abort code in `cause`. The reasoner does
  NOT retry; A3-B excludes `USER_CANCELLED` from fallback.
- The run-logger writes a `failed` run report with
  `error.code = 'REQUEST_FAILED'` and the upstream abort
  indicator; the project state on disk is NOT mutated.
- The project remains open and can be retried via
  `重新分析` / `--force-reasoning` / a fresh run.

## 5. Both-providers-unavailable terminal behavior (per A4 spec §6)

Per the A4 spec, when both providers are unavailable, the
terminal behavior must be explicit:

```text
analysis fails safely     YES (no fake success; the last error is recorded)
project remains intact    YES (project state on disk is not mutated)
failure is visible        YES (run report error.code; CLI/Web surfaces the message)
attempts are observable   YES (run report modelCallsThisRun; provenance fields)
no fake success           YES (assertCanonicalAnalysisResult refuses empty / malformed results)
```

A3 + A4 freezes this behavior. A4-2 documents it; A4-3 records the
current counts; A4-4 adds the G-A4-08 contract guard to keep it
intact.

## 6. Retry / Fallback actual A3 behavior (per A4 spec §6 "do not expand")

- **Retry**: NONE. The current reasoner performs exactly one HTTP
  call per `runClientWithDeadline` invocation. There is no
  internal retry loop. The reasoning-cache layer
  (`apps/cli/src/analysis-engine/preparation/reasoning-cache.js`)
  is a separate concern — it caches the exact-prompt result so a
  re-run with the same prompt-digest does not re-call the
  provider. That is NOT a retry of a failed call; it is a cache
  hit on a successful call.
- **Fallback**: CLASSIFIED but NOT EXECUTED. A3-B's
  `isFallbackEligible(error)` + `classifyFallbackReason(error)`
  return the right answer for the 4 eligible categories, but
  there is no executor in the registry or reasoner that
  re-issues the request against the alternative provider. A4
  freezes this state; the executor is a candidate A3.x / A4
  follow-up that must be approved separately.

## 7. A4-2 acceptance

- [x] At least 16 failure classes audited (this matrix has 16)
- [x] For every class: Trigger / Detected By / Canonical Error / Retry? / Fallback? / User Message / Telemetry / Persistence Behavior / Blocking?
- [x] No silent failure
- [x] Forbidden failure modes NOT present
- [x] Actual A3 retry/fallback behavior frozen (no expansion)
- [x] Cancellation behavior frozen (no corruption / no partial success / no uncontrolled fallback / no unnecessary paid calls)
- [x] Both-providers-unavailable terminal behavior frozen (fails safely / project intact / failure visible / attempts observable / no fake success)
