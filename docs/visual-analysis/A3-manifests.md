# A3 Manifests (Combined)

**Phase:** Visual Analysis A3 — Default Provider Transition & Production Readiness
**Batch:** A3 sub-batch summary
**Date:** 2026-08-12
**Status:** `A3_MANIFESTS_DESIGNED`
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A3-Default-Provider-Transition-Production-Readiness.md` §56
**Predecessor:** A3-A through A3-K design docs (this commit group)

## 1. Purpose

A3 spec §56 lists 11 sub-batch manifests
(`manifests/A3-A-*.md` through `manifests/A3-K-*.md`). This
**single combined document** serves the same purpose with
lower document churn: each sub-batch is summarized in §2 below
with the design-doc reference, the planned Phase 2 code
change, the planned Phase 3 verification, and the relevant
STOP-A3 gate precheck.

If a future A3.x phase needs to split this into per-sub-batch
files, the structure is straightforward: each section in §2
maps to one `manifests/A3-X-{name}.md` file.

## 2. Sub-batch summaries

### A3-A — Provider Policy Authority

- Design: [`A3-provider-policy.md`](./A3-provider-policy.md)
- Phase 2 code: `packages/runtime-core/src/application/provider-policy.ts` (new)
- Phase 2 code: `createDefaultAnalysisProviderRegistry` reads from `getCurrentProviderPolicy()`
- Phase 3 verification: regression + `provider-policy.test.js` (new offline contract test)
- STOP-A3 gate: 11 (Current Authority Conflict) NOT TRIGGERED; 12 (New Version Namespace) NOT TRIGGERED

### A3-B — Fallback Policy

- Design: [`A3-fallback-policy.md`](./A3-fallback-policy.md)
- Phase 2 code: `executeWithPolicy(configuration, request)` in `provider-policy.ts`
- Phase 2 code: 4 eligible categories + 6 non-eligible categories classified in `isFallbackEligible(error)`
- Phase 3 verification: `fallback-classification.test.js` (offline) + real fallback smoke
- STOP-A3 gate: 05 (Fallback is silent) NOT TRIGGERED; 06 (Fallback doubles provider calls but telemetry cannot show it) NOT TRIGGERED

### A3-C — Provider Provenance

- Design: [`A3-provider-provenance.md`](./A3-provider-provenance.md)
- Phase 2 code: canonical Analysis Provider result extended with `provenance` object
- Phase 2 code: CLI run-logger + Web `pipeline-service.ts` record `startedAt`, `latencyMs`, `status`, `retryCount`, `fallback`
- Phase 3 verification: `provenance-shape.test.js` (offline) + real smoke records provenance end-to-end
- STOP-A3 gate: 10 (Persisted schema changed silently) NOT TRIGGERED; 04 (Provider branches to downstream) NOT TRIGGERED

### A3-D — Latency Observability

- Design: [`A3-observability-report.md`](./A3-observability-report.md) §1
- Phase 2 code: reasoner layer records `providerInvocationMs`
- Phase 2 code: CLI + Web aggregate `analysisTotalMs` + `retryMs` + `fallbackMs`
- Phase 3 verification: regression + `observability-fields.test.js` (offline)
- STOP-A3 gate: 06 (Fallback doubles provider calls) NOT TRIGGERED (latency fields make it visible)

### A3-E — Usage / Cost Observability

- Design: [`A3-observability-report.md`](./A3-observability-report.md) §2
- Phase 2 code: reasoner layer records `provenance.usage` (`inputTokens`, `outputTokens`, `totalTokens`, `raw`)
- Phase 2 code: `cost = UNKNOWN` per A2 spec §56 (no `estimatedCost` field in A3; pricing source not available)
- Phase 3 verification: regression + `observability-fields.test.js` (offline)
- STOP-A3 gate: none (no cost-related STOP gate in A3)

### A3-F — Provider Health

- Design: [`A3-observability-report.md`](./A3-observability-report.md) §3
- Phase 2 code: `getProviderHealth(providerId)` + `setProviderHealth(providerId, state)` (cached state, no network)
- Phase 2 code: `scripts/a3-provider-health-probe.mjs` in `.codex-smoke/` (manual / opt-in probe, not in `repo:verify`)
- Phase 3 verification: manual probe run; state recorded; not in default CI
- STOP-A3 gate: 09 (Real provider calls in repo:verify / CI) NOT TRIGGERED (probe is manual / opt-in)

### A3-G — CLI Provider Registry Closure

- Design: [`A3-cli-provider-registry-closure.md`](./A3-cli-provider-registry-closure.md)
- Phase 2 code: `apps/cli/src/analysis-engine/bootstrap.js` `resolveReasoner(options)` falls back to the policy default
- Phase 2 code: CLI passes explicit `--provider` / `--model` to the registry (no provider branch in CLI)
- Phase 3 verification: `cli-default-resolution.test.js` (offline) + `cli:test` 40/40
- STOP-A3 gate: 04 (Provider branches to downstream) NOT TRIGGERED; 07 (CLI and Web resolve different defaults) NOT TRIGGERED

### A3-H — Current Architecture Documentation

- Design: (this batch — design the doc update, not a code change)
- Phase 2 code: update `CURRENT_ARCHITECTURE.md` to reflect: S0–S7 complete; M1 complete; A1 complete; A2 complete; A3 provider policy active; Web + Node Runtime Host; Multi-provider Visual Analysis
- Phase 2 code: remove stale S5-only wording
- Phase 3 verification: code review of the doc; no regression test
- STOP-A3 gate: 12 (New Version Namespace) NOT TRIGGERED (doc reflects current state)

### A3-I — Web UX (Minimal)

- Design: [`A3-web-ux.md`](./A3-web-ux.md)
- Phase 2 code: React badge component in `apps/web/` showing `current provider / current model / fallback availability`
- Phase 2 code: status line after a run: `Volcengine succeeded` / `Volcengine failed · Qwen fallback used` / `Volcengine failed: <error>`
- Phase 2 code: no provider secret in renderer (code review)
- Phase 3 verification: `web:smoke` 2 runs + manual Web UI check
- STOP-A3 gate: 04 (Provider branches to downstream) NOT TRIGGERED; 08 (Provider secrets reach browser renderer) NOT TRIGGERED

### A3-J — Production Smoke Matrix

- Design: [`A3-production-smoke-report.md`](./A3-production-smoke-report.md)
- Phase 2 code: 5 new offline contract tests (provider-policy / fallback-classification / provenance-shape / cli-default-resolution / observability-fields)
- Phase 3 verification: 4 real smoke runs (default / explicit V / explicit Q / fallback) + 4 offline contract tests
- STOP-A3 gate: 09 (Real provider calls in CI) NOT TRIGGERED (smoke is manual / opt-in; offline covers the rest)

### A3-K — Final Regression

- Design: [`A3-regression-report.md`](./A3-regression-report.md)
- Phase 3 verification: `npm run repo:verify` + `npm test` + `npm run cli:test` + `npm run runtime:test` + `npm run web:smoke` + `npm run golden:test` (all PASS)
- Phase 3 verification: R5 scan: 0 violations
- Phase 3 verification: Golden 5/5 PASS, G-04 PASS, frozen prompt digest unchanged
- STOP-A3 gate: 02 (frozen prompt) NOT TRIGGERED; 03 (Golden) NOT TRIGGERED; 04 (provider branches) NOT TRIGGERED

## 3. Cross-cutting concerns (all sub-batches)

- **No new version namespace** (STOP-A3-12): no `vnext` /
  `analysis-v2` / `provider-v2` introduced
- **Single source of truth for default** (STOP-A3-11): `provider-policy.ts`
- **No provider branches in business logic** (STOP-A3-04):
  only the policy / registry / adapter layer branches
- **Real provider calls remain manual / opt-in** (STOP-A3-09)
- **No new pipeline** (A3 spec §2): the existing pipeline is preserved
- **No Golden update** (A3 spec §35, STOP-A3-03)
- **No prompt rewrite** (A3 spec §36, STOP-A3-02)
- **Qwen preserved** (A3 spec §41, STOP-A3-13)
- **No persisted schema change** (A3 spec §15, STOP-A3-10)
- **No provider secret in renderer** (STOP-A3-08)
- **No silent fallback** (STOP-A3-05, STOP-A3-06)
- **No CLI / Web default conflict** (STOP-A3-07)
- **One-step rollback available** (A3 spec §39, [`A3-rollback-plan.md`](./A3-rollback-plan.md))
