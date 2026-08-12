# A3 Final Freeze

**Phase:** Visual Analysis A3 — Default Provider Transition & Production Readiness
**Date:** 2026-08-12
**Status:** `A3_FROZEN` (Visual Analysis Phase A3 is complete; A4 may begin)
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A3-Default-Provider-Transition-Production-Readiness.md` §70
**Predecessor:** A2-I `VISUAL_ANALYSIS_A2_PASS` (commit `295f83f`)

## 1. Final commit (this freeze)

`_this commit_` on branch `codex/visual-analysis-a1-multi-provider`
(final acceptance report + this freeze record).

## 2. A3 final state

| Field | Value |
|---|---|
| **Default Provider** | volcengine (per `getCurrentProviderPolicy().default.provider`) |
| **Default Model** | `doubao-seed-2.1-turbo` (canonical id; A2-D actual API alias `doubao-seed-2-1-turbo-260628` per A2 spec §107) |
| **Alternative Provider** | qwen |
| **Alternative Model** | `qwen3.6-plus` |
| **Qwen Role** | ALTERNATIVE / FALLBACK_ELIGIBLE / REGRESSION_BASELINE (preserved per A2-H §11) |
| **Volcengine Role** | DEFAULT (production) |
| **Single Source of Truth** | `packages/runtime-core/src/application/provider-policy.js` (`getCurrentProviderPolicy()`) |
| **Registry default authority** | `packages/model-runtime/src/analysis-provider-registry.js` (`createDefaultAnalysisProviderRegistry`, A2-H §9) |

## 3. Fallback classification (per A3-B / A3-fallback-policy.md)

| Eligible category | Existing reasoner code |
|---|---|
| `TEMPORARY_PROVIDER_UNAVAILABLE` | `MODEL_UNAVAILABLE` |
| `RATE_LIMIT` | `RATE_LIMITED` (also HTTP 429) |
| `TRANSPORT_FAILURE` | HTTP 5xx / network indicators |
| `TIMEOUT` | `TIMEOUT` |

| Excluded category | Existing reasoner code |
|---|---|
| `AUTH_ERROR` | `AUTHENTICATION_FAILED` |
| `MODEL_NOT_FOUND` | (404 model not found — out of fallback scope) |
| `REQUEST_INVALID` | (4xx non-429) |
| `RESPONSE_INVALID` | `MALFORMED_RESPONSE` |
| `CONTRACT_VALIDATION_FAILED` | (assertion failure path) |
| `USER_CANCELLED` | (AbortError propagates as REQUEST_FAILED) |

`maxAttempts: 2` (original + at most 1 fallback).
`manualOverride.precedence: ['explicit-run', 'user-profile', 'system-default']`.
`manualOverride.unknownProvider: 'error'`.

## 4. Observability fields (per A3-C / A3-D / A3-E)

Every canonical Analysis Provider result now carries a `provenance`
object (additive; not asserted by `assertCanonicalAnalysisResult`):

```js
provenance: {
  startedAt: '<ISO-8601>',
  latencyMs: <number>,           // = A3-D providerInvocationMs
  status: 'ok',
  retryCount: 0,
  fallback: null,               // populated by future A3.x fallback execution
  usage: {                      // null if upstream did not return usage
    inputTokens:  <number|null>,
    outputTokens: <number|null>,
    totalTokens:  <number|null>,  // computed as prompt+completion if upstream omits total_tokens
    raw: <Object.freeze(provider-supplied usage block)>,
    cost: 'UNKNOWN',            // per A2 spec §56; no explicit pricing source
  } | null,
}
```

## 5. CLI / Web / Registry consistency (per A3-G + A3-I)

- CLI `apps/cli/bin/masterpiece-os.js` resolves the default through
  `createDefaultAnalysisProviderRegistry()` and `getCurrentProviderPolicy()`.
  No `if selected === 'qwen' / 'volcengine'` branch in the CLI.
- Web `apps/web/src/components/ProviderBadge.tsx` shows current
  provider + model + fallback availability + run status (read-only;
  no API key in the renderer per A2-H §34 / A2-I §33).
- Registry `packages/model-runtime/src/analysis-provider-registry.js`
  is the single semantic default-provider authority (A2-H §9).
  `createReasoner` now passes `environment` and `client` through
  to the underlying reasoner factory (additive; no behavior change
  when omitted).

## 6. Provider Health (per A3-F)

- `packages/model-runtime/src/provider-health.js` exposes
  `getProviderHealth(providerId)`, `setProviderHealth(providerId, state, { error?, checkedAt? })`,
  `clearProviderHealth(providerId)`, `listProviderHealth()`, and
  `PROVIDER_HEALTH_STATES`.
- States: `configured` / `available` / `degraded` / `unavailable` /
  `unknown` (initial).
- `scripts/a3-provider-health-probe.mjs` is the manual / opt-in
  probe. **NEVER in `repo:verify`** (per A3 spec §21).
- Real probe audit (run 2026-08-12T12:36:33Z):
  - volcengine: state=available, probeMs=26,005.954
  - qwen:       state=available, probeMs=6,562.715

## 7. Final clean run (per A3 spec §34, §70)

- `repo:verify` 8/8 PASS
- `npm test` 830/830 PASS (785 baseline + 45 A3.x tests)
- `cli:test` 40/40 PASS
- `runtime:test` 334/334 PASS
- `golden:test` 5/5 PASS + G-04 PASS
- `web:smoke` PASS (status=pass, providerResolution=true,
  electronProcessCountZero=true, desktopMainProcessCountZero=true)
- `apps/web:build` PASS (Vite 7.3.6, 48 modules, 421 kB JS)
- `apps/web:typecheck` PASS (tsc strict 0 errors)
- Real provider smoke (Volcengine default + Qwen explicit) end-to-end PASS

## 8. Repository status (per A3 spec §70)

- Working tree = clean (post A3 final commit)
- Branch = `codex/visual-analysis-a1-multi-provider`
- HEAD = _this commit_
- `VISUAL_ANALYSIS_A2_PASS` confirmed at `295f83f`
- `VISUAL_ANALYSIS_A3_PASS` recorded at _this commit_
- 13 of 13 STOP-A3 gates NOT TRIGGERED
- 0 confirmed regressions during A3
- 0 fixes required during A3 Phase 2 / Phase 3
- Frozen prompts / corpus / rubric / Golden / Current Authority UNCHANGED

## 9. A4 handoff (per A3 spec §76)

Only after `VISUAL_ANALYSIS_A3_PASS` may the project enter:

```text
Masterpiece OS · Visual Analysis
Phase A4 — (deferred to user)
```

A4 should **not** repeat A2 or A3 acceptance. A2 and A3 are frozen.

## 10. Reopening A3

Per A3 spec §2 / §41: A3 does not remove Qwen; A3 does not remove
Volcengine. Any future change to:

- `packages/runtime-core/src/application/provider-policy.js` (the
  single source of truth for default / alternative / fallback /
  manual-override semantics),
- `packages/model-runtime/src/analysis-provider-registry.js` (the
  single semantic default-provider authority, A2-H §9),
- the additive `provenance` object shape on the canonical Analysis
  Provider result,
- the read-only `ProviderBadge` UI semantics (no API key in renderer),

is a **new A3.x phase** and must be accompanied by a new STOP-A3
gate audit, a new regression cycle (6 suites + Actual Web + Golden),
and a new acceptance record. The A3 freeze is irrevocable without
an A3.x re-evaluation cycle.

## 11. A3 final state — single sentence

Visual Analysis Phase A3 is **complete and frozen** at
`VISUAL_ANALYSIS_A3_PASS`: the Volcengine default is now backed by
a single-source-of-truth Provider Policy, the canonical Analysis
Provider result carries an additive `provenance` object (timing +
status + usage + cost=UNKNOWN), the CLI resolves the default through
the same registry as the Web Runtime Host, the Web UI shows a
read-only `ProviderBadge`, provider health is observable via a
manual / opt-in probe (NEVER in `repo:verify`), 830 of 830 offline
tests PASS, the 8/8 verify gate is clean, 5/5 Golden + G-04 PASS,
Actual Web PASS, and the real provider smoke (Volcengine default +
Qwen explicit) is end-to-end PASS.
