# A3-B Fallback Policy

**Phase:** Visual Visual A3 — Default Provider Transition & Production Readiness
**Batch:** A3-B
**Date:** 2026-08-12
**Status:** `A3_B_FALLBACK_POLICY_DESIGNED` (design doc; code change in A3 Phase 2)
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A3-Default-Provider-Transition-Production-Readiness.md` §9, §10, §11, §12, §13
**Predecessor:** A3-A design (this commit group)

## 1. Purpose (per A3 spec §9)

Fallback must be **explicit and narrow**. Do not implement:

```text
any error
→ silently retry with Qwen
```

The A3-B policy defines what is eligible for fallback, what is
not, and how the runtime records the fallback event so the
double-billing is not hidden.

## 2. Eligible Fallback Categories (per A3 spec §10)

Candidate categories that MAY be eligible for fallback (only
after explicit policy review):

| Category | Rationale |
|---|---|
| `TEMPORARY_PROVIDER_UNAVAILABLE` | Provider is down for a known window; retry with alternative |
| `RATE_LIMIT` | Hit provider rate limit; backoff + retry with alternative |
| `TRANSPORT_FAILURE` | Network / DNS / TLS error; retry with alternative |
| `TIMEOUT` | Request exceeded the 5-minute `AbortSignal.timeout`; retry with alternative |

These are all **transient** errors, not configuration / contract
errors.

## 3. Non-Fallback Categories (per A3 spec §11)

The following categories MUST NOT silently fall back. They
indicate configuration, contract, or semantic problems that
the user should see:

| Category | Why no fallback |
|---|---|
| `AUTH_ERROR` | API key / credential problem. Retrying with another provider will fail the same way. |
| `MODEL_NOT_FOUND` | Wrong model name. Retrying with another provider will fail the same way. |
| `REQUEST_INVALID` | The request shape is wrong. Retrying with another provider will fail the same way. |
| `RESPONSE_INVALID` | The provider returned a non-parseable response. Retrying with another provider may succeed, but the original request shape is suspect; surface to user. |
| `CONTRACT_VALIDATION_FAILED` | The provider returned a result that fails the canonical Analysis Contract. Surface to user. |
| `USER_CANCELLED` | The user explicitly cancelled. No retry. |

## 4. Fallback Transparency (per A3 spec §12)

If fallback occurs, the runtime report MUST record:

```text
requestedProvider
requestedModel
effectiveProvider
effectiveModel
fallbackTriggered          (boolean)
fallbackReason             (one of: TEMPORARY_PROVIDER_UNAVAILABLE, RATE_LIMIT, TRANSPORT_FAILURE, TIMEOUT)
fallbackAttemptCount       (1 if a fallback was attempted, 0 otherwise)
```

User-facing status MUST NOT claim the original provider
succeeded. Per A3 spec §30, the UI distinction is:

```text
Volcengine failed
Qwen fallback used
```

versus:

```text
Volcengine succeeded
```

## 5. No Hidden Double Billing (per A3 spec §13)

If fallback causes a second provider call:

```text
providerCalls = 2
```

must be visible in telemetry. The canonical Analysis Contract
result has no `providerCalls` field today; A3-C / A3-D / A3-E
will add the required provenance fields (see
[`A3-provider-provenance.md`](./A3-provider-provenance.md) and
[`A3-observability-report.md`](./A3-observability-report.md)).

## 6. Implementation (Phase 2)

A3-B is implemented in the registry layer
(`packages/model-runtime/src/analysis-provider-registry.js`)
and the runtime policy layer
(`packages/runtime-core/src/application/provider-policy.ts`).
The implementation is **transparent**: any fallback is
recorded in the result, never silent. The CLI / Web consumers
read the result; they do not need to know that a fallback
occurred, except to surface it to the user.

### 6.1 Pseudocode (A3-B Phase 2 design)

```js
// packages/runtime-core/src/application/provider-policy.ts (Phase 2)
function executeWithPolicy(configuration, request) {
  const policy = getCurrentProviderPolicy();
  const requested = configuration;
  const primary = createProviderFromPolicy(policy, requested);
  try {
    return await primary.execute(request);
  } catch (error) {
    if (!isFallbackEligible(error)) {
      throw error;  // AUTH / MODEL_NOT_FOUND / etc. — surface to user
    }
    const alternative = policy.alternative[0];
    const fallbackResult = await createProvider(alternative).execute(request);
    return {
      ...fallbackResult,
      provenance: {
        ...fallbackResult.provenance,
        requestedProvider: requested.provider || policy.default.provider,
        requestedModel: requested.model || policy.default.model,
        effectiveProvider: alternative.provider,
        effectiveModel: alternative.model,
        fallbackTriggered: true,
        fallbackReason: classifyError(error),
        fallbackAttemptCount: 1,
        providerCalls: 2,
      },
    };
  }
}
```

`isFallbackEligible` checks the 4 eligible categories
(`TEMPORARY_PROVIDER_UNAVAILABLE`, `RATE_LIMIT`,
`TRANSPORT_FAILURE`, `TIMEOUT`). The 6 non-fallback
categories never reach this code path.

## 7. STOP-A3 gate precheck

- STOP-A3-05 (Fallback is silent) NOT TRIGGERED by this design
  (every fallback is recorded in provenance; UI distinguishes
  failed-primary vs fallback-used).
- STOP-A3-06 (Fallback doubles provider calls but telemetry
  cannot show it) NOT TRIGGERED by this design (`providerCalls`
  field is added; surfaced to user + telemetry).

## 8. Acceptance

- [x] Fallback policy is documented and narrow
- [x] Fallback is transparent (provenance fields defined)
- [x] Fallback provenance recorded (provenance object shape defined)
- [ ] (Phase 2) Fallback policy implemented in registry / runtime policy layer
- [ ] (Phase 2) `providerCalls` field added to canonical result (A3-C provenance)
- [ ] (Phase 2) Offline contract tests for fallback classification (A3-J §33)
- [ ] (Phase 3) Real fallback smoke PASS (manual / opt-in / cost-sensitive)
