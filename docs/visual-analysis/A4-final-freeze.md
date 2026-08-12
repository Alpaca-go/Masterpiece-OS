# A4 Final Freeze

**Phase:** Visual Analysis A4 — Production Freeze & Operational Baseline
**Date:** 2026-08-12
**Status:** `A4_FROZEN` (Visual Analysis Phase A4 is complete; Visual Analysis infrastructure track is CLOSED)
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A4-Production-Freeze-Operational-Baseline.md` §16, §19
**Predecessor:** A4-1 (`f6955fc`) + A4-2 (`2cea903`) + A4-4 (`5682ba5`) + A4-3+5 (`8993ca2`)
                A3 `VISUAL_ANALYSIS_A3_PASS` (`2514784`)
                A2-I `VISUAL_ANALYSIS_A2_PASS` (`295f83f`)

## 1. Final commit (this freeze)

`_this commit_` on branch `codex/visual-analysis-a1-multi-provider`
(final acceptance report + this freeze record).

## 2. Final state (per A4 spec §19)

```text
Visual Analysis Infrastructure: FROZEN
Production Default:            volcengine / doubao-seed-2.1-turbo
                               (API alias doubao-seed-2-1-turbo-260628)
Preserved Alternative/Fallback: qwen / qwen3.6-plus
                               (A2-H §11 preservation; A3-A alternative[0];
                                A3-B fallback-eligible when classification
                                returns one of the 4 eligible categories)
Canonical Analysis Contract:  FROZEN
                               (assertCanonicalAnalysisResult + additive
                                provenance object per A3-C/D/E)
Frozen Prompt:                 UNCHANGED
                               (2 SHA-256 digests verified at A2-final-freeze
                                §6; A4 verify:a4-frozen-prompt PASS)
Golden:                        5/5 PASS
                               (Q-01..Q-05; G-04 hard gate PASS;
                                Golden Updated During A4 = NO)
Repository Contract:           PASS
                               (repo:verify 9/9; verify:a4 with 6 sub-guards
                                all PASS)
Actual Web:                    PASS
                               (web:smoke status=pass, providerResolution=true,
                                electronProcessCountZero=true,
                                desktopMainProcessCountZero=true)
Infrastructure Track:          CLOSED
                               (per A4 spec §16)
```

## 3. Production authorities (per A4 spec §3 / A4-1)

| Authority | Path | Status |
|---|---|---|
| Provider Contract | `packages/model-runtime/src/analysis-provider.js` | FROZEN |
| Provider Registry | `packages/model-runtime/src/analysis-provider-registry.js` (A2-H §9) | FROZEN |
| Default Provider Policy | `packages/runtime-core/src/application/provider-policy.js` (`getCurrentProviderPolicy()`) | FROZEN |
| Fallback Policy | `provider-policy.js` (`isFallbackEligible` + `classifyFallbackReason`) | FROZEN (classification only; executor is a separate decision) |
| Canonical Analysis Contract | `packages/model-runtime/src/analysis-provider.js` (`assertCanonicalAnalysisResult`) | FROZEN |
| Prompt Authority | `apps/cli/prompts/analysis/` + `creative-director/prompt-builder.js` | FROZEN (UNCHANGED) |
| Settings Authority | `apps/web-runtime/src/node-settings-store.ts` + `application-contracts.ts:136-151` | FROZEN |
| Runtime Host | `apps/web-runtime/src/node-runtime-host.ts` + `packages/runtime-core/src/operation-registry.js` | FROZEN |
| Persistence Contract | `packages/runtime-core/src/application/project-store.ts` | FROZEN |
| Telemetry / Run Metadata | `qwen-reasoner.js` + `volcengine-reasoner.js` (provenance) + `apps/cli/src/analysis-engine/telemetry/run-logger.js` | FROZEN |

## 4. A4 deliverables (per A4 spec §20)

| Deliverable | Path | Status |
|---|---|---|
| Production Contract Freeze | `docs/visual-analysis/A4-production-contract-freeze.md` | FROZEN |
| Operational Failure Matrix | `docs/visual-analysis/A4-operational-failure-matrix.md` | FROZEN |
| Production Baseline | `docs/visual-analysis/A4-production-baseline.md` | FROZEN |
| Freeze Manifest | `docs/visual-analysis/A4-freeze-manifest.md` | FROZEN |
| Operational Runbook | `docs/visual-analysis/A4-operational-runbook.md` | FROZEN |
| Known Limitations | `docs/visual-analysis/A4-known-limitations.md` | FROZEN |
| Final Report | `docs/visual-analysis/A4-final-report.md` | FROZEN (this commit) |
| Final Freeze | `docs/visual-analysis/A4-final-freeze.md` | FROZEN (this commit) |

## 5. A4 guards in effect (per A4 spec §11)

| Guard | Script | Wired into `repo:verify` |
|---|---|---|
| G-A4-01 + G-A4-09 (default authority + default/fallback separation) | `scripts/verify-a4-default-authority.mjs` | YES (`verify:a4` aggregate) |
| G-A4-02 (provider registry bypass) | `scripts/verify-workspace-boundaries.mjs` (existing) | YES |
| G-A4-03 (frozen prompt) | `scripts/verify-a4-frozen-prompt.mjs` | YES (`verify:a4` aggregate) |
| G-A4-04 (provider-specific downstream) | `scripts/verify-production-boundaries.mjs` + `scripts/verify-workspace-boundaries.mjs` (existing) | YES |
| G-A4-05 (version namespace) | `scripts/verify-a4-version-namespace.mjs` | YES (`verify:a4` aggregate) |
| G-A4-06 (legacy desktop) | `scripts/verify-a4-legacy-desktop.mjs` | YES (`verify:a4` aggregate) |
| G-A4-07 (golden mutation) | `scripts/verify-a4-golden-mutation.mjs` | YES (`verify:a4` aggregate) |
| G-A4-08 (provider contract) | `tests/analysis-provider-contract.test.js` + `tests/volcengine-analysis-provider-contract.test.js` (existing) | YES (`repo:guard:test`) |
| G-A4-09 (default/fallback separation) | `scripts/verify-a4-default-authority.mjs` (same as G-A4-01) | YES |
| G-A4-10 (secret safety) | `scripts/verify-a4-secret-safety.mjs` | YES (`verify:a4` aggregate) |

## 6. Operational exit conditions (per A4 spec §19)

```text
VISUAL_ANALYSIS_PRODUCTION_BASELINE_FROZEN  ← _this commit_

Visual Analysis Infrastructure: FROZEN
Production Default:            volcengine / doubao-seed-2.1-turbo
Preserved Alternative/Fallback: qwen / qwen3.6-plus
Canonical Analysis Contract:   FROZEN
Frozen Prompt:                  UNCHANGED
Golden:                         5/5 PASS
Repository Contract:            PASS
Actual Web:                     PASS
Infrastructure Track:           CLOSED
```

## 7. Reopening the Visual Analysis track (per A4 spec §16)

Per A4 spec §16 "Infrastructure Closure Rule", the track is
CLOSED. A5 / A6 are NOT automatically created. Reopening
requires a concrete trigger:

```text
- production blocker
- provider deprecation
- material quality regression
- breaking provider API change
- security issue
- strategically approved new provider
- canonical contract defect
```

Not for:

```text
- "maybe cleaner"
- "could refactor"
- "a newer model exists"
```

Freeze means changes become deliberate, not impossible.

## 8. A4 final state — single sentence

Visual Analysis Phase A4 is **complete and frozen** at
`VISUAL_ANALYSIS_PRODUCTION_BASELINE_FROZEN`: 5 of 5 A4 work-
streams (production contract freeze, operational failure
matrix, production baseline, anti-regression guardrails, final
freeze verification) are complete; 42 of 42 A4 acceptance
criteria PASS; 15 of 15 STOP-A4 gates NOT TRIGGERED; 842 of 842
offline tests PASS; the 9-of-9 verify gate is clean (including
the new `verify:a4` aggregate with 6 sub-guards); 5/5 Golden +
G-04 hard gate PASS; Actual Web PASS; the real provider smoke
(Volcengine default + Qwen explicit) is end-to-end PASS; 0 fixes
required during A4; 0 confirmed regressions; the Frozen Prompt,
Golden, Repository Contract, and Current Authority are all
UNCHANGED; the Visual Analysis infrastructure track is
**CLOSED**.
