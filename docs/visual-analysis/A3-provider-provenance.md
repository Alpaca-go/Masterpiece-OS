# A3-C Provider Provenance

**Phase:** Visual Analysis A3 — Default Provider Transition & Production Readiness
**Batch:** A3-C
**Date:** 2026-08-12
**Status:** `A3_C_PROVIDER_PROVENANCE_DESIGNED` (design doc; code change in A3 Phase 2)
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A3-Default-Provider-Transition-Production-Readiness.md` §14, §15
**Predecessor:** A3-B fallback policy design

## 1. Purpose (per A3 spec §14)

Every Visual Analysis run should preserve execution
provenance. At minimum:

```text
provider
model
runId
startedAt
completedAt
latency
status
retryCount
fallback status
```

## 2. Current State (post-A2-I)

The canonical Analysis Provider result already records
(A2-H contract test `analysis-provider.js` L28-35):

```js
assertCanonicalAnalysisResult(result) {
  for (const field of ['runId', 'provider', 'model', 'completedAt', 'reportMarkdown']) {
    if (!String(result[field] || '').trim()) {
      throw new AnalysisProviderError('MALFORMED_RESPONSE', `Analysis Provider result is missing ${field}.`);
    }
  }
}
```

So `runId / provider / model / completedAt / reportMarkdown` are
already required. Missing from provenance:

- `startedAt` (the start timestamp)
- `latency` (the wall-clock latency)
- `status` (the run status: `ok` / `error` / `cancelled` / `fallback`)
- `retryCount` (number of attempts before the result was produced)
- `fallback status` (per A3-B: `requestedProvider`, `requestedModel`, `effectiveProvider`, `effectiveModel`, `fallbackTriggered`, `fallbackReason`, `fallbackAttemptCount`)

## 3. A3-C Provenance Object Shape (Phase 2 design)

```ts
// canonical Analysis Provider result extension (Phase 2; non-breaking)
type AnalysisResult = Object.freeze({
  // existing required fields (per A2-H contract)
  runId: string,
  provider: string,
  model: string,
  completedAt: string,  // ISO-8601
  reportMarkdown: string,
  // A3-C new fields (backward-compatible; offline contract tests assert presence post-A3)
  provenance: Object.freeze({
    startedAt: string,  // ISO-8601; recorded by the runtime layer
    latencyMs: number,  // wall-clock ms from `startedAt` to `completedAt`
    status: 'ok' | 'error' | 'cancelled' | 'fallback',
    retryCount: number,  // 0 if first attempt succeeded; >= 1 if retried (or fallback used)
    // A3-B fallback transparency (only present if fallback was used)
    fallback: Object.freeze({
      requestedProvider: string,
      requestedModel: string,
      effectiveProvider: string,
      effectiveModel: string,
      fallbackTriggered: true,
      fallbackReason: 'TEMPORARY_PROVIDER_UNAVAILABLE' | 'RATE_LIMIT' | 'TRANSPORT_FAILURE' | 'TIMEOUT',
      fallbackAttemptCount: number,  // 1 if a single fallback was used
      providerCalls: number,  // total provider invocations including fallback
    }) | null,
  }),
});
```

`provenance.fallback` is `null` when no fallback was used. When
fallback was used, every field is present and the
`fallbackTriggered: true` flag is set.

## 4. Persisted Metadata (per A3 spec §15)

Prefer existing execution / run-report metadata. Do not modify
the persisted project schema unless necessary.

The current persisted schema in `docs/visual-analysis/evaluation/C0X/{provider}/{runId}.{json,md}` is unchanged. The
A3-C provenance fields are added to the **in-memory** canonical
result and to the **telemetry run report**
(`apps/cli/src/analysis-engine/telemetry/run-logger.js` and the
Web runtime's `pipeline-service.ts` run-report path).

The persisted project schema (`project-context/visual-decision-packet.json`) does **not** need to change for A3-C; the
provenance is recorded at runtime, not in the project artifact.

If a future A3.x phase requires the provenance to be persisted
into the project schema, that requires an explicit compatibility
plan (A3 spec §15: "If schema mutation is unavoidable: STOP →
define compatibility plan").

## 5. STOP-A3 gate precheck

- STOP-A3-10 (Persisted schema changed silently) NOT TRIGGERED (project schema unchanged; A3-C provenance is runtime-only)
- STOP-A3-04 (Need to add provider branches to downstream business logic) NOT TRIGGERED (provenance is recorded at the runtime layer; downstream continues to be provider-agnostic per A2-H §30 + A2-I §24)

## 6. Acceptance

- [x] Provider provenance designed (A3-C)
- [ ] (Phase 2) Canonical Analysis Contract result extended with `provenance` object
- [ ] (Phase 2) `runAnalysisPipeline` (CLI) records `startedAt`, `latencyMs`, `status`, `retryCount`, `fallback`
- [ ] (Phase 2) Web `pipeline-service.ts` records same fields
- [ ] (Phase 2) Offline contract tests for provenance fields
- [ ] (Phase 3) Real smoke records provenance end-to-end
