# A3-A Provider Policy Authority

**Phase:** Visual Analysis A3 — Default Provider Transition & Production Readiness
**Batch:** A3-A
**Date:** 2026-08-12
**Status:** `A3_A_PROVIDER_POLICY_DESIGNED` (design doc; code change in A3 Phase 2)
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A3-Default-Provider-Transition-Production-Readiness.md` §5, §6, §7, §8
**Predecessor:** A2-I `VISUAL_ANALYSIS_A2_PASS` (commit `295f83f`)

## 1. Purpose (per A3 spec §5)

Create or formalize one runtime-owned **Provider Policy** that
defines:

- `defaultProvider`
- `defaultModel`
- `alternativeProviders`
- `fallbackPolicy` (see [`A3-fallback-policy.md`](./A3-fallback-policy.md))
- `manualOverride`

The authority must live in **Runtime / Settings authority**, not
in the React UI. The Web UI, CLI, Node Runtime Host, and Shared
Runtime must not maintain independent hardcoded defaults.

## 2. Initial Policy (per A3 spec §6)

```text
default:
  provider: volcengine
  model: doubao-seed-2.1-turbo

alternative:
  provider: qwen
  model: qwen3.6-plus
```

The actual API alias for the default model is
`doubao-seed-2-1-turbo-260628` (A2-D run-confirmed; per A2 spec §107).

## 3. One Source of Truth (per A3 spec §7)

The following layers must NOT each maintain separate defaults:

- Web UI
- CLI
- Node Runtime Host
- Shared Runtime
- Provider Adapter

There must be **one resolved runtime policy**.

### 3.1 Current state (post-A2-H, pre-A3-A)

| Layer | Where default lives | Source of truth |
|---|---|---|
| Web UI | `apps/web-runtime/src/node-settings-store.ts` `defaults()` (no `defaultProvider` field; user profile is the source) | User profile (no hardcode) ✓ |
| CLI | `apps/cli/src/analysis-engine/bootstrap.js` accepts `options.deepCreativeDirectorReasoner` injection (no built-in default) | Caller / harness ✓ (no hardcode) |
| Node Runtime Host | `packages/runtime-core/src/application/pipeline-service.ts:388` calls `createDefaultAnalysisProviderRegistry()` | `createDefaultAnalysisProviderRegistry` in `packages/model-runtime/src/analysis-provider-registry.js` ✓ (single source) |
| Shared Runtime | Same as Node Runtime Host (via `pipeline-service.ts:388`) | Same ✓ |
| Provider Adapter | Adapter factory (no default; matches `configuration`) | N/A (provider-agnostic) ✓ |

**Current state is already one source of truth** for the Visual
Analysis default: the runtime reads the default from
`createDefaultAnalysisProviderRegistry()` (which A2-H committed
as the single semantic default-provider authority). The CLI
relies on the harness to supply a reasoner; the Web UI relies
on the user profile. No layer hardcodes a default outside the
runtime policy.

### 3.2 A3-A gap

The current `createDefaultAnalysisProviderRegistry` answers
**"which provider should run?"** but does **not** answer:

- What is the policy's `alternativeProvider`?
- What is the policy's `fallbackPolicy`?
- What is the policy's `manualOverride` precedence?
- Where is the policy file/versioned?

A3-A formalizes these. Per A3 spec §5 "The authority must live
in Runtime / Settings authority, not React UI." The A3-A design
is:

- **`packages/runtime-core/src/application/provider-policy.ts`** —
  new file (Phase 2 code change).
- Single export: `getCurrentProviderPolicy()` returns the
  immutable, resolved `ProviderPolicy` object.
- `createDefaultAnalysisProviderRegistry` becomes a thin
  wrapper over `getCurrentProviderPolicy().defaultProvider`
  + alternative providers + manual override.
- The CLI now resolves the default through the policy if no
  reasoner is injected (A3-G).

### 3.3 Policy object shape (A3-A design)

```ts
// packages/runtime-core/src/application/provider-policy.ts (Phase 2)
type ProviderPolicy = Object.freeze({
  version: '1.0.0',
  default: Object.freeze({
    provider: 'volcengine',
    model: 'doubao-seed-2.1-turbo',  // canonical id; alias `doubao-seed-2-1-turbo-260628` per A2 §107
  }),
  alternative: Object.freeze([
    Object.freeze({ provider: 'qwen', model: 'qwen3.6-plus' }),
  ]),
  fallback: Object.freeze({
    // see A3-B for the full policy
    eligibleCategories: Object.freeze([
      'TEMPORARY_PROVIDER_UNAVAILABLE',
      'RATE_LIMIT',
      'TRANSPORT_FAILURE',
      'TIMEOUT',
    ]),
    excludedCategories: Object.freeze([
      'AUTH_ERROR',
      'MODEL_NOT_FOUND',
      'REQUEST_INVALID',
      'RESPONSE_INVALID',
      'CONTRACT_VALIDATION_FAILED',
      'USER_CANCELLED',
    ]),
    maxAttempts: 2,  // original + at most 1 fallback
  }),
  manualOverride: Object.freeze({
    // per A3 spec §8: explicit run > user profile > system default
    precedence: Object.freeze(['explicit-run', 'user-profile', 'system-default']),
    unknownProvider: 'error',  // never silently map to Qwen or Volcengine
  }),
});
```

## 4. Manual Override (per A3 spec §8)

Allow explicit per-run or profile-level provider selection.

Precedence (per A3 spec §8):

```text
explicit run selection
↓
user profile setting
↓
system default
```

Unknown provider: **explicit error**. Never silently map unknown
values to Qwen or Volcengine.

The canonical Analysis Provider registry already enforces
this:

```js
// packages/model-runtime/src/analysis-provider.js:67-72
resolve(configuration) {
  const matches = [...registered.values()].filter((provider) => provider.supports(configuration));
  if (matches.length === 0) {
    const identity = String(configuration?.provider || '').trim() || 'unknown';
    throw new AnalysisProviderError('MODEL_UNAVAILABLE', `ANALYSIS_PROVIDER_UNSUPPORTED: ${identity}`, { providerId: identity });
  }
  ...
}
```

(verified by `tests/analysis-provider-contract.test.js` L81-93)

A3-A does **not** modify this behavior; it documents the
precedence and adds a policy-level facade that future consumers
(CLI, Web) can read.

## 5. STOP-A3 gate precheck

- STOP-A3-11 (Current Authority Conflict > 0) NOT TRIGGERED (current state: single `createDefaultAnalysisProviderRegistry` authority + per-layer consumer-not-authority)
- STOP-A3-12 (New version namespace appears) NOT TRIGGERED (no new identifiers; `volcengine` and `qwen3.6-plus` are canonical A1/A2)
- STOP-A3-07 (CLI and Web resolve different defaults) NOT TRIGGERED pre-A3-A (CLI delegates to harness; harness reads `pipeline-service.ts:388` which reads `createDefaultAnalysisProviderRegistry`); A3-A formalizes this further (Phase 2)

## 6. Acceptance

- [x] Runtime provider policy authority designed (A3-A)
- [ ] (Phase 2) `packages/runtime-core/src/application/provider-policy.ts` implemented
- [ ] (Phase 2) `createDefaultAnalysisProviderRegistry` updated to read from `getCurrentProviderPolicy()`
- [ ] (Phase 2) CLI defaults to the policy's default if no reasoner is injected (A3-G)
- [x] Volcengine default policy represented in one source of truth (designed; implementation in Phase 2)
- [x] Qwen remains alternative / fallback (per A2-H §11; reinforced in A3 policy)
- [x] Manual provider override works (precedence designed; existing registry enforces)
- [x] Unknown provider fails explicitly (existing `MODEL_UNAVAILABLE` path)
