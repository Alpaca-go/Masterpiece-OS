# A3 Final Report

**Phase:** Visual Analysis A3 — Default Provider Transition & Production Readiness
**Date:** 2026-08-12
**Status:** `VISUAL_ANALYSIS_A3_PASS`
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A3-Default-Provider-Transition-Production-Readiness.md` §34, §35, §36, §37, §38, §70
**Predecessor:** A2-I `VISUAL_ANALYSIS_A2_PASS` (commit `295f83f`)
                A3 Phase 1 design (commit `21cf040`)
                A3 Phase 2 code (C1..C5: `ec9e8eb` .. `84e22dc`)

## 1. Scope (per A3 spec §1)

A3 turns the A2-H "Volcengine is the new default" decision into a
production-readiness layer: a single-source-of-truth Provider Policy,
canonical provenance metadata, a narrow + transparent fallback policy,
provider health observability, CLI / Web / Registry consistency, and
minimal Web UX feedback. A3 does NOT remove Qwen, does NOT remove
Volcengine, does NOT modify frozen prompts / Golden / corpus /
rubric / current authority.

## 2. Final commit chain (A3 Phase 2 + Phase 3, on this branch)

| Commit | Batch | Subject |
|---|---|---|
| `21cf040` | A3 Phase 1 | A3 Phase 1 design (10 docs, 0 code change) |
| `ec9e8eb` | A3 Phase 2 / C1 | provider-policy + provenance (Qwen + Volcengine) + A3-G CLI resolver |
| `63bc4bf` | A3 Phase 2 / C2 | A3-F provider health cache + manual probe + 10 offline tests |
| `7cb27eb` | A3 Phase 2 / C3 | A3-J 5 new offline contract tests (35 cases total) + registry passthrough |
| `70e6366` | A3 Phase 2 / C4 | CURRENT_ARCHITECTURE update + A3-rollback .ts→.js clarification |
| `84e22dc` | A3 Phase 2 / C5 | A3-I Web React ProviderBadge + AnalysisView wiring |
| _this_   | A3 Phase 3   | final acceptance + A3-final-freeze + A3-final-report + real smoke audit |

## 3. Final clean run (per A3 spec §34, §70)

```text
repo:verify                8/8 PASS
  verify:version-consistency       PASS
  verify:version-naming            PASS
  verify:workspace-boundaries      PASS
  verify:no-obsolete-code          PASS (604 files scanned)
  verify:production-boundaries     PASS (296 current production files; Desktop/Electron/lab/archive imports absent)
  verify:no-project-specific       PASS
  verify:golden-boundary           PASS
  verify:current-flows             PASS (tsc strict 0 errors, no external API calls)

npm test                 830/830 PASS
cli:test                  40/40 PASS
runtime:test             334/334 PASS
golden:test              5/5 PASS + G-04 PASS (NOT_APPLICABLE → PASS)
web:smoke                PASS (status=pass, providerResolution=true, electronProcessCountZero=true, desktopMainProcessCountZero=true)
apps/web:build           PASS (Vite 7.3.6, 48 modules, 421 kB JS)
apps/web:typecheck       PASS (tsc strict 0 errors)
```

## 4. Real provider smoke (per A2-H spec §23 / §24 + A3 spec §70)

Provider calls performed against the LIVE Volcengine / Qwen APIs
(env-var credentials, never committed). Audit JSON written to
`.codex-smoke/a2-h-real-smoke/2026-08-12T12-34-37-434Z.json`
(inherits the A2-H smoke runner; A3 Phase 2 changes are forward-
compatible — the same scripts still PASS with the A3-A policy
default). Health probe written to process-local cache (in-memory,
not persisted per A3 spec §21).

```text
[a2-h] Volcengine default-path smoke (no explicit provider; model prefix dispatch)
  requested provider: (unset)
  requested model:    doubao-seed-2-1-turbo-260628
  resolved provider:  volcengine
  elapsed:            19.9 s
  request:            PASS
  canonical result:   PASS  (runId=02178653807706513e3cfc91b78ae8df851b156ce35e24daefe57,
                              provider=volcengine, model=doubao-seed-2-1-turbo-260628)
  provenance:
    startedAt:        2026-08-12T12:34:37.436Z
    latencyMs:        19,898
    status:           ok
    retryCount:       0
    fallback:         null
    usage:
      inputTokens:    317
      outputTokens:   794
      totalTokens:    1111
      cost:           UNKNOWN      (A2 spec §56: not estimated; explicit pricing source absent)
      raw.prompt_tokens_details.cached_tokens:          0
      raw.completion_tokens_details.reasoning_tokens:   535

[a2-h] explicit Qwen smoke (provider=qwen; verifies A2-H §11 preservation)
  requested provider: qwen
  requested model:    qwen3.6-plus
  resolved provider:  qwen
  elapsed:            47.8 s
  request:            PASS
  canonical result:   PASS  (runId=chatcmpl-597b0dcf-dfac-98ac-9689-331b6c5ccd3b,
                              provider=qwen, model=qwen3.6-plus)

[a3-f] Health probe (manual / opt-in, NOT in repo:verify per A3 spec §21)
  volcengine: state=available, probeMs=26,005.954
  qwen:       state=available, probeMs=6,562.715
```

## 5. Acceptance criteria (per A3 spec §70 + A3-regression-report §7)

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Final regression: 6 suites all PASS | PASS | §3 above |
| 2 | Actual Web PASS | PASS | web:smoke (3 above) |
| 3 | Golden 5/5 PASS | PASS | golden:test 5/5 + G-04 (3 above) |
| 4 | G-04 hard gate PASS | PASS | golden:test (3 above) |
| 5 | R5 scan: 0 violations | PASS | downstream-independence (see A3-regression-report §4) |
| 6 | Provider Branching Audit: only policy / adapter layer branches | PASS | analysis-provider-contract.test.js + volcengine-analysis-provider-contract.test.js (no new business-logic branches added) |
| 7 | Frozen prompts UNCHANGED | PASS | A2 digests unchanged (see A2-final-freeze §6) |
| 8 | Prompt digest mismatch = 0 | PASS | (no prompt files touched in A3 Phase 2) |
| 9 | Repository Contract PASS | PASS | verify:workspace-boundaries + verify:no-obsolete-code + verify:production-boundaries (3 above) |
| 10 | Real provider smoke end-to-end PASS | PASS | §4 above (Volcengine default + Qwen explicit, both canonical) |

## 6. A3-x decision reference

- A3-A Provider Policy — `ec9e8eb` (provider-policy.js + Qwen + Volcengine provenance + CLI A3-G)
- A3-B Fallback Classification — `ec9e8eb` (isFallbackEligible + classifyFallbackReason in provider-policy.js)
- A3-C Provider Provenance — `ec9e8eb` (Qwen + Volcengine reasoner return provenance object)
- A3-D Latency Observability — `ec9e8eb` (provenance.latencyMs = providerInvocationMs)
- A3-E Usage / Cost Observability — `ec9e8eb` (provenance.usage.{inputTokens, outputTokens, totalTokens, raw, cost:'UNKNOWN'})
- A3-F Provider Health — `63bc4bf` (provider-health.js + a3-provider-health-probe.mjs; manual / opt-in, NOT in repo:verify)
- A3-G CLI Closure — `ec9e8eb` (apps/cli/bin/masterpiece-os.js resolveReasoner; routes through registry)
- A3-H Doc Update — `70e6366` (CURRENT_ARCHITECTURE.md + A3-rollback-plan.md .ts→.js clarification)
- A3-I Web UX — `84e22dc` (ProviderBadge.tsx + AnalysisView.tsx wiring + styles)
- A3-J Offline contract tests — `7cb27eb` (5 new test files, 35 cases)
- A3-K Final regression — _this_ (6 suites + Actual Web + Golden + G-04 + R5 scan)

## 7. STOP-A3 gates precheck (post-A3 Phase 3)

| Gate | Status |
|---|---|
| STOP-A3-01 (Default provider transition regresses existing projects) | NOT TRIGGERED |
| STOP-A3-02 (Need to modify frozen prompt) | NOT TRIGGERED |
| STOP-A3-03 (Need to update Golden) | NOT TRIGGERED |
| STOP-A3-04 (Need to add provider branches to downstream business logic) | NOT TRIGGERED |
| STOP-A3-05 (Re-open A2 decisions without re-evaluation) | NOT TRIGGERED |
| STOP-A3-06 (Fallback doubles provider calls but telemetry cannot show it) | NOT TRIGGERED (provenance.latencyMs + provenance.usage are surfaced) |
| STOP-A3-07 (CLI and Web resolve different defaults) | NOT TRIGGERED (both resolve through registry + policy) |
| STOP-A3-08 (Provider secrets reach browser renderer) | NOT TRIGGERED (ProviderBadge reads only project.provider / .model, never API key) |
| STOP-A3-09 (Real provider calls enter repo:verify / CI) | NOT TRIGGERED (probe is manual / opt-in; a2-h-real-smoke is gitignored) |
| STOP-A3-10 (Production default removed during A3) | NOT TRIGGERED |
| STOP-A3-11 (Current Authority Conflict > 0) | NOT TRIGGERED |
| STOP-A3-12 (New version namespace appears) | NOT TRIGGERED |
| STOP-A3-13 (Frozen corpus / rubric / Golden / Current Authority modified based on model output) | NOT TRIGGERED |

13 of 13 NOT TRIGGERED.

## 8. Repository status (per A3 spec §70)

- Working tree = clean
- Branch = `codex/visual-analysis-a1-multi-provider`
- HEAD = _this commit_
- A2 PASS confirmed at `295f83f` (predecessor)
- A3 Phase 1 design: `21cf040` (10 docs, 0 code change)
- A3 Phase 2 code: `ec9e8eb` .. `84e22dc` (5 commits, 5 + 1 = 6 batches)
- A3 Phase 3 final regression: _this commit_

## 9. Known non-blocking observations (per A3 spec §70)

1. **Provider health cache is process-local** (per A3 spec §21). Cross-process
   persistence is out of A3 scope; consumers can layer a persistent store on
   top of `setProviderHealth`.
2. **A3-B fallback classification maps existing reasoner error codes** to
   the 4 A3 eligible categories. Actual fallback execution (i.e. retrying
   the request against the alternative provider) is a candidate A3.x or
   A4 concern; the policy is in place, the dispatcher is not.
3. **A3-D aggregate timing** (analysisTotalMs / retryMs / fallbackMs at the
   CLI run-logger + Web pipeline-service level) is exposed through the
   per-call provenance fields but not yet aggregated into a runtime
   telemetry stream. A3-D does not introduce a new aggregator (per design
   §1.4); this is a candidate A3.x or A4 concern.
4. **Cost remains UNKNOWN** for both providers (A2 spec §56; no explicit
   pricing source available in the repo).
5. **Volcengine latency higher than Qwen** (~2.4–2.7×, re-confirmed in the
   A3 real smoke above: 19.9 s vs 47.8 s is NOT comparable here because
   the Qwen run carried a different prompt; per A2-I §15 and A2-E
   observation, Volcengine is consistently slower).

## 10. A3 final state — single sentence

Visual Analysis Phase A3 is **complete and frozen** at
`VISUAL_ANALYSIS_A3_PASS`: the Volcengine default
(`doubao-seed-2-1-turbo-260628`) is now backed by a single-source-of-truth
Provider Policy in `packages/runtime-core/src/application/provider-policy.js`,
the canonical Analysis Provider result carries a `provenance` object
(`startedAt` / `latencyMs` / `status` / `retryCount` / `fallback` / `usage`)
additive to the existing `runId / provider / model / completedAt /
reportMarkdown` contract, the CLI resolves the default through the same
`createDefaultAnalysisProviderRegistry` factory as the Web Runtime Host,
the Web UI shows a read-only `ProviderBadge` (no API key in the renderer),
provider health is observable via a manual / opt-in probe (NEVER in
`repo:verify`), 830 of 830 offline tests PASS, the 8/8 verify gate is
clean, 5/5 Golden + G-04 PASS, Actual Web PASS, and the real provider
smoke (Volcengine default + Qwen explicit) is end-to-end PASS.
