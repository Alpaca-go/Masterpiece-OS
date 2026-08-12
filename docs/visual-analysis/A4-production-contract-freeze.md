# A4-1 Production Contract Freeze

**Phase:** Visual Analysis A4 — Production Freeze & Operational Baseline
**Date:** 2026-08-12
**Status:** `A4_PRODUCTION_CONTRACT_FROZEN` (production authorities audited; invariants recorded)
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A4-Production-Freeze-Operational-Baseline.md` §3, §4, §5
**Predecessor:** A3 `VISUAL_ANALYSIS_A3_PASS` (commit `2514784`)

## 1. Purpose (per A4 spec §3)

Audit the CURRENT repository and freeze the **real authorities**
for Provider Contract, Provider Registry, Default Provider Policy,
Fallback Policy, Canonical Analysis Contract, Prompt Authority,
Settings / Configuration Authority, Runtime Host, Persistence
Contract, and Telemetry / Run Metadata Contract. Required
invariants:

```text
conflicting default-provider authorities    = 0
conflicting fallback-policy authorities    = 0
conflicting prompt authorities             = 0
conflicting canonical-contract authorities = 0
```

Consumers may read these authorities; consumers must not redefine
them.

## 2. Authority map (actual CURRENT repository paths)

### 2.1 Provider Contract (per `analysis-provider.js`)

| Authority | Path | Notes |
|---|---|---|
| Canonical error codes | `packages/model-runtime/src/analysis-provider.js:1-8` | `AUTHENTICATION_FAILED`, `TIMEOUT`, `RATE_LIMITED`, `MALFORMED_RESPONSE`, `MODEL_UNAVAILABLE`, `REQUEST_FAILED` (Object.freeze) |
| `assertAnalysisProvider` | `packages/model-runtime/src/analysis-provider.js:20-26` | Provider identity + `supports()` + `createReasoner()` shape |
| `assertCanonicalAnalysisResult` | `packages/model-runtime/src/analysis-provider.js:28-36` | Required: `runId / provider / model / completedAt / reportMarkdown` |
| `normalizeAnalysisProviderError` | `packages/model-runtime/src/analysis-provider.js:38-49` | Maps upstream errors to the canonical 6 codes |
| `createAnalysisProviderRegistry` | `packages/model-runtime/src/analysis-provider.js:51-87` | The registry constructor; deduplicates by provider id; resolves by `supports()` |
| Qwen adapter | `packages/model-runtime/src/qwen-analysis-provider.js` | `id='qwen'`, model-prefix `qwen*`; protected by `tests/analysis-provider-contract.test.js` |
| Volcengine adapter | `packages/model-runtime/src/volcengine-analysis-provider.js` | `id='volcengine'`, model-prefix `doubao-*`; protected by `tests/volcengine-analysis-provider-contract.test.js` |

### 2.2 Provider Registry (default registry — per A2-H §9)

| Authority | Path | Notes |
|---|---|---|
| Default registry factory | `packages/model-runtime/src/analysis-provider-registry.js` | `createDefaultAnalysisProviderRegistry()` — single semantic default-provider authority. Order: Volcengine first, Qwen second. Dispatch is by `supports()` + model prefix, NOT by array position (A2-H §9; A3-A2). |
| `createDefaultAnalysisReasoner` | `packages/model-runtime/src/analysis-provider-registry.js` | Convenience wrapper; preserves the same dispatch behavior. |
| Registry exposure | `@masterpiece/runtime-core/src/index.js` (re-exports analysis operations that call the registry) | Web Runtime Host + Shared Runtime go through this. |

### 2.3 Default Provider Policy (per A3-A)

| Authority | Path | Notes |
|---|---|---|
| `getCurrentProviderPolicy()` | `packages/runtime-core/src/application/provider-policy.js:75-77` | Single source of truth for default / alternative / fallback / manual-override. Object.freeze. `default = { provider:'volcengine', model:'doubao-seed-2.1-turbo' }` (canonical id; API alias `doubao-seed-2-1-turbo-260628` per A2 spec §107). |
| `isFallbackEligible(error)` | `packages/runtime-core/src/application/provider-policy.js:140-158` | Maps existing reasoner error codes to A3-B eligible categories. |
| `classifyFallbackReason(error)` | `packages/runtime-core/src/application/provider-policy.js:165-184` | Same mapping, returns the canonical category string. |
| Policy consumers (read-only) | `apps/cli/bin/masterpiece-os.js` (CLI resolveReasoner), `apps/web/src/components/ProviderBadge.tsx` (Web UX), `packages/runtime-core/src/application/pipeline-service.ts:388` (Node Runtime Host / Shared Runtime) | Consumers may read the policy; they MUST NOT redefine the default. |

### 2.4 Fallback Policy (per A3-B / A3-fallback-policy.md)

| Authority | Path | Notes |
|---|---|---|
| Eligible categories | `provider-policy.js:47-52` (4 entries) | `TEMPORARY_PROVIDER_UNAVAILABLE`, `RATE_LIMIT`, `TRANSPORT_FAILURE`, `TIMEOUT` |
| Excluded categories | `provider-policy.js:53-60` (6 entries) | `AUTH_ERROR`, `MODEL_NOT_FOUND`, `REQUEST_INVALID`, `RESPONSE_INVALID`, `CONTRACT_VALIDATION_FAILED`, `USER_CANCELLED` |
| `maxAttempts` | `provider-policy.js:61` | `2` (original + at most 1 fallback) |
| Manual override precedence | `provider-policy.js:64` | `['explicit-run', 'user-profile', 'system-default']` |
| `unknownProvider` | `provider-policy.js:65` | `'error'` (never silently map to Qwen or Volcengine) |
| Fallback executor | (NOT IMPLEMENTED) | A3-B classifies errors; A3 does NOT implement the actual retry/fallback dispatch (per A3-observability-report.md §1.4). The fallback decision data is in the policy; the dispatcher is the candidate A3.x / A4 follow-up. |

### 2.5 Canonical Analysis Contract (per A2-H §9 + A3-C)

| Field | Required by `assertCanonicalAnalysisResult` | Optional / additive |
|---|---|---|
| `runId` | yes | — |
| `provider` | yes | — |
| `model` | yes | — |
| `completedAt` | yes | — |
| `reportMarkdown` | yes | — |
| `benchmarkSources` | no | always `[]` in the current adapters |
| `inspectedAssetIds` | no | populated by `buildMultimodalUserContent` |
| `provenance` | no (additive) | `{ startedAt, latencyMs, status:'ok', retryCount, fallback, usage }` per A3-C/D/E; `Object.freeze` |
| `provenance.usage` | no (additive) | `null` or `{ inputTokens, outputTokens, totalTokens, raw, cost:'UNKNOWN' }` per A3-E |

Historical Qwen runs remain historically accurate. The contract
itself is forward-compatible: pre-A3-Qwen runs that omit
`provenance` are still valid canonical results (the additive field
is not asserted by `assertCanonicalAnalysisResult`).

### 2.6 Prompt Authority (per A2 spec §121 / A2-I)

| Authority | Path | Notes |
|---|---|---|
| Frozen prompt (analysis) | `apps/cli/prompts/analysis/` (managed by `apps/cli/src/analysis-engine/creative-director/prompt-builder.js`) | SHA-256 digests frozen at A2-I; see `A2-final-freeze.md` §6. |
| Frozen rubric | `docs/visual-analysis/A2-evaluation-rubric.md` | SHA-256 `7220F30F...` (A2-final-freeze §6). |
| Frozen corpus | `docs/visual-analysis/A2-evaluation-corpus.md` | SHA-256 `12D1526F...` (A2-final-freeze §6). |
| Frozen manifest hash | `docs/visual-analysis/A2-evaluation-corpus.manifest.json` | logical `manifestHash` = `f57da490...` (A2-final-freeze §6). |
| Frozen Prompt Changed During A4 | NO (per A4 spec §4 / §18) | A4 must not modify the prompt builder or any frozen prompt file. |
| Prompt Digest Mismatch | 0 (per A4 spec §4 / §18) | Guard is `verify:golden-boundary` (A2-I) + `tests/golden-boundary.test.js`. |

### 2.7 Settings / Configuration Authority (per A2-H §11 + A3 §5)

| Authority | Path | Notes |
|---|---|---|
| PublicSettings shape | `packages/runtime-core/src/application-contracts.ts:136-151` | `profiles`, `defaultProfileId`, `provider`, `baseUrl`, `model`, `hasApiKey`, etc. |
| Settings store (Node side) | `apps/web-runtime/src/node-settings-store.ts` | Persists `PublicSettings` to the user profile. |
| Credentials store (Node side) | `apps/web-runtime/src/node-credential-store.ts` | API keys. **NEVER sent to the renderer** (A2-H §34, A2-I §33). |
| API Profile shape | `packages/runtime-core/src/application-contracts.ts:101-120` | Per-profile provider / model / baseUrl / credentialKey / isDefault. |
| Manual override precedence | `provider-policy.js:64` (already shown in §2.4) | `explicit-run > user-profile > system-default`. The Node settings store reads `defaultProfileId` for the user-profile entry; the CLI / Web honor explicit run selection. |
| No layer hardcodes its own default | Verified by `verify:workspace-boundaries` + the A3-G CLI closure test (`tests/a3-cli-default-resolution.test.js`). | The default flows from `getCurrentProviderPolicy().default` to the registry to the caller; downstream layers consume the resolved default. |

### 2.8 Runtime Host authority (per S5 + A3)

| Authority | Path | Notes |
|---|---|---|
| Node Runtime Host | `apps/web-runtime/src/node-runtime-host.ts` | Primary runtime; 147 operations (per latest `web:smoke` audit). |
| RPC | `apps/web-runtime/src/local-rpc-server.ts` | Web Renderer ↔ Node Host IPC bridge. |
| Web Renderer | `apps/web` (Vite + React 19) | The browser-side; the only authorized rendering entrypoint. |
| Shared Operation Registry | `packages/runtime-core/src/operation-registry.js` | 136 business operations. |
| Web + Node Runtime Host = primary execution path | Verified by `verify:production-boundaries` + `verify:current-flows` (no Desktop / Electron imports in current production files; 296 files scanned). | Legacy Desktop must not regain CURRENT runtime authority (STOP-A4-12). |

### 2.9 Persistence Contract (per A2-H §11 + A3)

| Authority | Path | Notes |
|---|---|---|
| Project Store | `packages/runtime-core/src/application/project-store.ts` | Owns ProjectRecord persistence. |
| Project Visual Context | `packages/runtime-core/src/application/project-visual-context-builder.ts` + `.../project-visual-context-compiler.ts` | Build + compile the project-scoped visual context. |
| Reasoning cache | `apps/cli/src/analysis-engine/preparation/reasoning-cache.js` | Cache exact-prompt-digest results to avoid re-running the same model call. |
| Run report (telemetry) | `apps/cli/src/analysis-engine/telemetry/run-logger.js` | Per-run JSON; written to the project root; never replaced wholesale. |
| Historical project compatibility | Verified by A2-H `A2-H-provider-preservation-report.md` + A2-I `A2-I-downstream-regression.md` + the live web:smoke runs that opened an old Qwen-flavored project (A2-H web:smoke audit). | Old Qwen project / run metadata preserved (A2-H §11 / A4 §10). |

### 2.10 Telemetry / Run Metadata Contract (per A3-D / A3-E / A2-H §9)

| Authority | Path | Notes |
|---|---|---|
| Reasoner provenance (per-call) | `qwen-reasoner.js:271-281` + `volcengine-reasoner.js:324-334` | `{ startedAt, latencyMs, status, retryCount, fallback, usage }` (Object.freeze). |
| CLI run report | `apps/cli/src/analysis-engine/telemetry/run-logger.js` | Per-run JSON; aggregates `creativeDirectorTimeMs`, `actualModelTimeMs`, `modelCallsThisRun`, `reasoningCacheHit`, etc. |
| Provider health cache | `packages/model-runtime/src/provider-health.js` (A3-F) | In-process cache; manual / opt-in probe. NOT in `repo:verify`. |
| Health probe | `scripts/a3-provider-health-probe.mjs` | Manual / opt-in script. |
| Real provider smoke | `.codex-smoke/a2-h-real-smoke.mjs` (inherited) | Manual / opt-in. Audit JSON written to `.codex-smoke/a2-h-real-smoke/`. |

## 3. Required authority invariants (per A4 spec §3)

| Invariant | Status | Evidence |
|---|---|---|
| conflicting default-provider authorities = 0 | PASS | `getCurrentProviderPolicy().default` is the only source. CLI / Web / Shared Runtime consume via registry + policy. No other file hardcodes a Visual Analysis default (verified by `verify:workspace-boundaries` + `verify:production-boundaries` + A3-G CLI test). |
| conflicting fallback-policy authorities = 0 | PASS | `getCurrentProviderPolicy().fallback` is the only source. `isFallbackEligible` / `classifyFallbackReason` are exported from the same module. The CLI / Web / registry do not redefine fallback semantics. |
| conflicting prompt authorities = 0 | PASS | Frozen Prompt at `apps/cli/prompts/analysis/` + `creative-director/prompt-builder.js`. Digests unchanged since A2-I. Guarded by `verify:golden-boundary` + `tests/golden-boundary.test.js`. |
| conflicting canonical-contract authorities = 0 | PASS | `assertCanonicalAnalysisResult` at `packages/model-runtime/src/analysis-provider.js:28-36` is the only canonical-contract check. The 5 required fields are pinned by the same code path; the additive `provenance` object is documented in A4-1 §2.5 and protected by `tests/a3-provenance-shape.test.js` + `tests/a3-observability-fields.test.js`. |

## 4. Default / alternative / fallback role separation (per A4 §G-A4-09)

```text
DEFAULT
  provider = volcengine
  model    = doubao-seed-2.1-turbo (canonical)
             doubao-seed-2-1-turbo-260628 (API alias)
  role     = production default (post A2-G CHANGE_DEFAULT_TO_VOLCENGINE,
             A2-H commit 17284b7, A3-A commit ec9e8eb)

PRESERVED ALTERNATIVE / REGRESSION BASELINE / FALLBACK-ELIGIBLE
  provider = qwen
  model    = qwen3.6-plus
  role     = A2-H §11 preservation; A3-A `alternative[0]`;
             A3-B eligible for fallback when classification returns
             one of the 4 eligible categories
```

The two roles are **never** conflated. The default
(`getCurrentProviderPolicy().default`) and the alternative
(`getCurrentProviderPolicy().alternative[0]`) are separate fields;
the fallback policy classifies reasons independently of which
provider is the default. Protected by the explicit
`tests/a3-provider-policy.test.js` contract tests + the upcoming
A4 `verify-a4-default-authority` guard (C3).

## 5. Configuration precedence (per A4 spec §5)

```text
explicit run selection
  ↓
explicit saved user/profile preference
  ↓
system default
```

The system default = `getCurrentProviderPolicy().default` (i.e.
Volcengine). The user-profile entry = `defaultProfileId` in
`PublicSettings`. The explicit run entry = the run that the user
launched with a chosen profile. The CLI's `--provider` flag is an
explicit run selection; it overrides the user profile; both
override the system default. Verified by the A3-G CLI
`resolveReasoner()` implementation + the A3-G
`tests/a3-cli-default-resolution.test.js` subprocess tests.

## 6. Current runtime topology (per A4 spec §5)

```text
Web (apps/web — Vite + React 19)
  ↓ local RPC
Node Runtime Host (apps/web-runtime — tsx + ws)
  ↓
runtime-core / provider architecture
  (packages/runtime-core + packages/model-runtime
   + apps/cli analysis engine)
```

Legacy Desktop (Electron) was removed in S5; per S5 + A2 + A3, it
does not regain CURRENT runtime authority. Verified by
`verify:production-boundaries` + `verify:no-obsolete-code` +
`tests/web-runtime-host-boundary.test.js` + `tests/archive-boundary.test.js`
+ `tests/runtime-boundary.test.js`.

## 7. Prompt authority (per A4 spec §4)

```text
Frozen Prompt Changed During A4  = NO  (will be recorded in A4-3 baseline)
Prompt Digest Mismatch           = 0  (will be recorded in A4-3 baseline)
```

The A4-3 baseline records the exact current SHA-256 digests of:
- `docs/visual-analysis/A2-evaluation-rubric.md`
- `docs/visual-analysis/A2-evaluation-corpus.md`
- `docs/visual-analysis/A2-evaluation-corpus.manifest.json` (logical `manifestHash`)

A4 introduces no new prompt authority and no new prompt
mutations. The existing `verify:golden-boundary` + A4 G-A4-03
guard (C3) ensure the frozen prompt remains unchanged.

## 8. A4-1 acceptance

- [x] Provider Contract audited
- [x] Provider Registry audited
- [x] Default Provider Policy audited
- [x] Fallback Policy audited
- [x] Canonical Analysis Contract audited
- [x] Prompt Authority audited
- [x] Settings / Configuration Authority audited
- [x] Runtime Host audited
- [x] Persistence Contract audited
- [x] Telemetry / Run Metadata Contract audited
- [x] Conflicting default-provider authorities = 0
- [x] Conflicting fallback-policy authorities = 0
- [x] Conflicting prompt authorities = 0
- [x] Conflicting canonical-contract authorities = 0
- [x] Actual repository paths recorded (no guessing)
- [x] Default / alternative / fallback roles separated
- [x] Configuration precedence documented
- [x] Current runtime topology documented
- [x] Prompt authority frozen (UNCHANGED)
