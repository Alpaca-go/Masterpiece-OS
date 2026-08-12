# A3-D / A3-E / A3-F Observability Report

**Phase:** Visual Analysis A3 — Default Provider Transition & Production Readiness
**Batch:** A3-D (latency) + A3-E (usage / cost) + A3-F (provider health)
**Date:** 2026-08-12
**Status:** `A3_DEF_OBSERVABILITY_DESIGNED` (design doc; code change in A3 Phase 2)
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A3-Default-Provider-Transition-Production-Readiness.md` §16, §17, §18, §19, §20, §21
**Predecessor:** A3-C provenance design

## 1. A3-D Latency Observability (per A3 spec §16)

A2 showed a meaningful latency difference (~2.4–2.7× Volcengine
slower than Qwen per A2-E and A2-I §15). A3 must record provider
latency consistently.

### 1.1 Recommended fields (per A3 spec §16)

```text
providerInvocationMs   // time inside the reasoner call (HTTP round-trip)
analysisTotalMs       // end-to-end (intake → reasoning → report)
retryMs               // time spent retrying / falling back
fallbackMs            // time spent in the fallback invocation
```

### 1.2 Current state

The current canonical Analysis Provider result does not record
these fields. The CLI's run-logger records aggregate
`creativeDirectorTimeMs` (time inside the deep creative
director call), but does not split it into `providerInvocationMs`
+ `retryMs` + `fallbackMs`.

### 1.3 A3-D design (Phase 2)

The reasoner layer
(`packages/model-runtime/src/{qwen,volcengine}-reasoner.js`)
records `providerInvocationMs` (the time from request send to
response receive) and returns it via the canonical result's
`provenance.latencyMs`. The CLI's run-logger and the Web
`pipeline-service.ts` accumulate `analysisTotalMs` around the
reasoner call; if a fallback is used, the second invocation's
time is added to `fallbackMs`.

### 1.4 Latency reporting (per A3 spec §17)

At the runtime level, support summaries such as:

```text
median
p95
success rate
timeout rate
```

Only when sample count is sufficient. **Do not fabricate
statistical confidence.** This is a runtime-aggregator
concern; A3-D does not introduce a new aggregator but exposes
the per-call fields so an aggregator can be built later
(A3.x or A4).

## 2. A3-E Usage / Cost Observability (per A3 spec §18 / §19)

Where provider responses expose reliable usage, record:

```text
inputTokens
outputTokens
image / input usage
provider usage metadata
```

If cost is not directly available: `cost = UNKNOWN`. **Do not
calculate fake precision from guessed pricing.**

### 2.1 Current state (A2-I confirmation)

A2-I §47 / §75: cost visibility remains `UNKNOWN` for both
providers. Neither reasoner surfaces `usage` in the canonical
result. The follow-up requirement to expose `usage` is recorded
as A3-E (this batch) per A2-G §8 follow-up requirement #1.

### 2.2 A3-E design (Phase 2)

The Qwen reasoner
(`packages/model-runtime/src/qwen-reasoner.js`) and the
Volcengine reasoner
(`packages/model-runtime/src/volcengine-reasoner.js`) are
extended to read the upstream provider's `usage` block
(`prompt_tokens`, `completion_tokens`, `total_tokens`) and
return it in the canonical result's `provenance.usage`:

```ts
type Usage = Object.freeze({
  inputTokens: number | null,   // null if provider did not surface usage
  outputTokens: number | null,
  totalTokens: number | null,
  // provider-specific fields
  raw: Object.freeze({
    // whatever the provider returned in the `usage` block
  }) | null,
  // A2 §56 honesty: do not invent pricing precision
  cost: 'UNKNOWN' | {
    inputCost: number,  // explicit pricing source required
    outputCost: number,
    currency: 'USD' | 'CNY' | string,
    pricingSource: string,  // URL or doc ref
  },
});
```

A2 spec §56: "unknown cost / usage is recorded as `UNKNOWN`
rather than estimated." A3-E honors this.

### 2.3 Cost policy (per A3 spec §19)

A3 may add `estimatedCost` only if:

- pricing source is **explicit** (URL or doc ref)
- model pricing is **stable** (no per-day refresh)
- calculation is **deterministic** (one source of truth, no
  approximations)

Otherwise keep `usage` only and let downstream consumers
compute cost when they have a pricing source.

For A3: we **do not** add `estimatedCost` (no explicit pricing
source available in the current repository). The
`provenance.usage.cost` field is `UNKNOWN`.

## 3. A3-F Provider Health (per A3 spec §20 / §21)

Add a lightweight provider health state if useful:

```text
configured
available
degraded
unavailable
```

Do not build a monitoring platform.

### 3.1 Health states

| State | Meaning |
|---|---|
| `configured` | Provider is registered; user has saved credentials |
| `available` | Configured AND a recent health probe returned success |
| `degraded` | Configured AND recent probe returned 4xx / 5xx within the last 24 h |
| `unavailable` | Not configured OR recent probe returned a hard error |

### 3.2 Health probe (per A3 spec §21)

Health checks MUST be:

- `manual / opt-in`, OR
- `low-frequency runtime check`

**Never make `repo:verify` network-dependent.**

A3-F design: a `getProviderHealth(providerId)` function that
returns one of the 4 states. The function does **not** trigger
a network probe by itself; it returns the cached state from the
last manual / low-frequency probe. The actual probe is a
separate command (`scripts/a3-provider-health-probe.mjs` in
`.codex-smoke/`, manual / opt-in) that records its result via
`setProviderHealth(providerId, state)`.

This design satisfies A3 spec §21: probe is manual / opt-in, not
in `repo:verify`.

## 4. STOP-A3 gate precheck

- STOP-A3-06 (Fallback doubles provider calls but telemetry cannot show it) NOT TRIGGERED (A3-D `providerInvocationMs` + A3-C `providerCalls` field make double calls visible)
- STOP-A3-09 (Real provider calls enter repo:verify / CI) NOT TRIGGERED (A3-F health probe is manual / opt-in, not in `repo:verify`)

## 5. Acceptance

- [x] Latency observability designed (A3-D)
- [x] Usage / cost observability designed (A3-E; `cost = UNKNOWN` per A2 §56)
- [x] Provider health designed (A3-F; manual / opt-in probe, not in `repo:verify`)
- [ ] (Phase 2) Reasoner layer records `providerInvocationMs` + `provenance.usage`
- [ ] (Phase 2) CLI run-logger + Web `pipeline-service.ts` aggregate `analysisTotalMs` + `retryMs` + `fallbackMs`
- [ ] (Phase 2) `getProviderHealth(providerId)` + `setProviderHealth(providerId, state)` implemented
- [ ] (Phase 2) Offline contract tests for observability fields
