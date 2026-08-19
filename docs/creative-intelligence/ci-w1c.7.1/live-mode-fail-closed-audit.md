# CI-W1C.7.1 — Live-Mode Fail-Closed Audit (PART G / H / I)

This document audits the live-mode fail-closed behavior added in CI-W1C.7.1. The spec requires that when the live path (real analysis model) is used, the service must fail closed: no mock fallback, no downstream stage runs after upstream failure, no fake valid report.

## 1. Mode metadata (PART G)

CI-W1C.7 had two mode names:
- `deterministic_baseline`
- `model_assisted_shadow`

CI-W1C.7.1 renames them to be more accurate:
- `model_assisted_mock` — `useMock: true` (or not set), no real provider call
- `model_assisted_live` — `useMock: false`, real provider call (subject to user authorization)

Tests:
- ✅ `RW-07: provider / model metadata is preserved in the result`
- ✅ `RW-02: mock mode uses the in-file mock fixture (no real provider call)`

The result carries:
- `mode: 'model_assisted_mock' | 'model_assisted_live'`
- `provider: string | null` (null in mock mode; populated from credentials in live mode)
- `model: string | null` (null in mock mode; populated from credentials in live mode)
- `analysisProfileId: string | undefined` (forwarded from input)
- `imageProviderCallCount: 0` (HARD RULE)

## 2. Fail-closed behavior (PART H)

Live qualification behavior:
1. attempt 1 fails → 1 repair attempt
2. attempt 2 fails → persist raw + gate diagnostics → STOP
3. NO mock fallback in live mode
4. NO downstream stage runs after upstream failure
5. NO fake valid report after failure

Implementation in `creative-reasoning-service.ts`:

```ts
if (liveMode && synthStage.status === 'FAIL') {
  conceptStage = { status: 'NOT_RUN', ... };
} else if (synthesis) {
  // run concept stage
}
```

The same pattern applies to direction:
```ts
if (liveMode && (synthStage.status === 'FAIL' || (conceptStage && conceptStage.status === 'FAIL'))) {
  directionStage = { status: 'NOT_RUN', ... };
}
```

In mock mode (`useMock: true`), the existing `deterministic_baseline` behavior is preserved — a best-effort mock parse is returned even if the gate fails. This is allowed in mock mode per spec §36.

Tests:
- ✅ `RW-04: live synthesis failure stops downstream (concept/direction not run)`
- ✅ `RW-05: live concept failure stops direction`
- ✅ `RW-06: direction failure does not emit a valid report`

## 3. Repair prompt (PART I)

The repair call (attempt 2) appends to the user message:

```
# REPAIR
Your previous output was rejected by the gates. Fix only the listed violations.
Do not invent new facts. Preserve valid refs.

## BLOCKED GATE CODES
  - <code-1>
  - <code-2>
  ...

## PREVIOUS INVALID OUTPUT (bounded excerpt)
```
<bounded excerpt of previous raw output, max 2000 chars>
```
```

The bounded excerpt is capped at 2000 chars to keep the repair prompt small. If the previous raw output is longer, it is truncated with `[truncated, total N chars]`.

Tests:
- ✅ `RW-09: repair prompt contains gate violations from the previous attempt`

## 4. Max attempts per stage

The spec hard-caps at `max attempts per stage = 2`. The service enforces this:
- Attempt 1: primary
- Attempt 2: repair (if attempt 1 fails)
- No third attempt

If both fail, the stage status is `FAIL` and the service continues to the next stage (or, in live mode, stops downstream).

Tests:
- ✅ `RW-08: max 2 attempts per stage`

## 5. No mock fallback in live mode (PART H)

The service has a `liveMode` flag derived from `!useMock`. When `liveMode === true` and both attempts fail:
- The service returns `artifact: null` (no best-effort mock)
- The stage status is `FAIL`
- A failure artifact is persisted to `intermediate/live-attempts/{stage}.failure.json`

The mock fallback in `runStage` is gated by `if (liveMode) { return FAIL; }` — only mock mode can produce a best-effort mock parse.

Tests:
- ✅ `RW-03: live qualification never silently uses mock`

## 6. Raw attempt persistence

When stages run, the service persists:
- `intermediate/live-attempts/{stage}.attempt-1.raw.txt` (raw model output)
- `intermediate/live-attempts/{stage}.attempt-2.raw.txt` (raw repair output)
- `intermediate/live-attempts/{stage}.gate.json` (gate report)
- `intermediate/live-attempts/{stage}.failure.json` (live-mode failure summary)

These artifacts never contain credentials, API keys, or tokens. The credentials are passed by reference to the reasoner; they are never serialized to disk.

Tests:
- ✅ `RW-10: credentials are never persisted`

## 7. Provider / model metadata (PART G)

In live mode, the service resolves credentials and stores `provider` and `model` in the result. In mock mode, both are `null`.

Tests:
- ✅ `RW-07: provider / model metadata is preserved in the result`

## 8. Hard rules verified

- ✅ mock fallback after live failure — FORBIDDEN (asserted in `RW-03` and `RW-06`)
- ✅ downstream after upstream failure — FORBIDDEN in live mode (asserted in `RW-04`, `RW-05`)
- ✅ fake valid report after failure — FORBIDDEN (asserted in `RW-06`)
- ✅ real analysis provider call in this phase — 0 (no live call is made in CI-W1C.7.1 tests)
- ✅ image provider call — 0 (HARD RULE)
- ✅ consumer switch — 0
- ✅ CI-10 — NOT STARTED
- ✅ project-specific production hardcode — 0 (verified by `verify:no-project-specific-production-rules`)
