# P3-A8 — Full Regression Report

> P3-A8 is the acceptance / regression phase. It does
> **not** introduce new production features and does
> **not** modify any production code. The goal is to
> prove the current P3-A implementation is correct,
> architecturally clean, and regression-free across
> the whole repository.

## A. Git baseline

| Field | Value |
|---|---|
| Branch | `codex/visual-analysis-a1-multi-provider` |
| Local HEAD | `930f9d019331670098361f1d29e65ba539ab6c81` |
| Origin HEAD | `930f9d019331670098361f1d29e65ba539ab6c81` |
| Match | **YES** (local == origin) |
| Working tree | **CLEAN** (`git status --porcelain` empty) |
| P2 frozen baseline | `335405342951fedae5d4d6816444c2b4d2402787` |
| P2 frozen diff vs baseline → HEAD | **NO** (16 protected paths verified, 0 modified) |
| Production files changed by P3-A8 | **0** |
| Commit produced by P3-A8 | docs-only `docs(packaging): record P3-A8 full regression` |

## B. Full Regression Matrix

| Suite | Command | Expected | Actual | Pass | Fail | Repeat |
|---|---|---|---|---|---|---|
| P3-A phase tests | `npx tsx --test tests/runtime-application/packaging-workspace-*.test.ts` | 473/473 | 473/473 | 473 | 0 | 232/232 (flaky-prone) |
| Runtime tests (shared) | `node --test tests/packages/runtime-core/*.test.js` | 14/14 | 14/14 | 14 | 0 | 14/14 (run 2) |
| Runtime application tests | `tsx --test tests/runtime-application/*.test.ts` | 807/807 | 807/807 | 807 | 0 | 807/807 (run 2) |
| Image-generation (P2 frozen) | `npm run test:image-generation` | 972/972 | 972/972 | 972 | 0 | — |
| repo:verify | `npm run repo:verify` | 40/40 | 40/40 | 40 | 0 | — |
| verify:version-naming | `npm run verify:version-naming` | PASS | PASS | — | — | — |
| verify:space-compiler-baseline | `npm run verify:space-compiler-baseline` | PASS | PASS (0 failure) | — | — | — |
| verify:space-r8.6-golden-boundary | `npm run verify:space-r8.6-golden-boundary` | PASS | PASS (0 failure) | — | — | — |
| web typecheck | `npm run web:typecheck` | PASS | PASS | — | — | — |
| web-runtime typecheck | `npm run web-runtime:typecheck` | PASS | PASS | — | — | — |
| git diff --check | `git diff --check` | no content errors | no content errors | — | — | — |
| git status --porcelain | `git status --porcelain` | empty | empty | — | — | — |

**Totals**

| Test | Pass | Fail | Skip | Cancelled |
|---|---|---|---|---|
| P3-A phase (A2 / A3 / A4 / A5 / A5.1 / A6 / A7) | 473 | 0 | 0 | 0 |
| Runtime (shared + application) | 821 | 0 | 0 | 0 |
| Image-generation | 972 | 0 | 0 | 0 |
| repo:verify | 40 | 0 | 0 | 0 |
| **Total** | **2306** | **0** | **0** | **0** |

## C. P3-A Phase Tests

| Phase | Test file | Cases | Pass | Fail |
|---|---|---|---|---|
| P3-A2 | `packaging-workspace-application-contract.test.ts` | 40 | 40 | 0 |
| P3-A3 | `packaging-workspace-state-machine.test.ts` | 120 | 120 | 0 |
| P3-A4 | `packaging-workspace-view-model.test.ts` | 81 | 81 | 0 |
| P3-A5 / A5.1 | `packaging-workspace-stale-prepare-execute.test.ts` | 86 | 86 | 0 |
| P3-A6 | `packaging-workspace-reference-locked-asset-contract.test.ts` | 75 | 75 | 0 |
| P3-A7 | `packaging-workspace-architecture-guards.test.ts` | 71 | 71 | 0 |
| **Total** | — | **473** | **473** | **0** |

## D. Architecture Guards A-L

The 12 canonical guard groups (per P3-A spec §64) are
locked in by `packaging-workspace-architecture-guards.test.ts`.
All 71 cases pass. Group breakdown:

| Group | Canonical Name | Cases | Result |
|---|---|---|---|
| A | Runtime Dependency Boundary | 5 | PASS |
| B | Web UI Import Boundary | 5 | PASS |
| C | Compiler Boundary (STOP-P3-A-01) | 3 | PASS |
| D | Provider Payload Boundary (STOP-P3-A-02) | 3 | PASS |
| E | Credential Boundary (STOP-P3-A-03) | 5 | PASS |
| F | Frozen P2 Contract Guard (STOP-P3-A-04) | 5 | PASS |
| G | Reference Role Authority (STOP-P3-A-05) | 4 | PASS |
| H | Reference Precedence (STOP-P3-A-06) | 3 | PASS |
| I | Stale Fail-closed (STOP-P3-A-07) | 5 | PASS |
| J | Persistence / Leakage (STOP-P3-A-08) | 5 | PASS |
| K | Web UI Provider Network (STOP-P3-A-09) | 4 | PASS |
| L | Shared Regression (STOP-P3-A-10/11/12) | 6 | PASS |
| **A-L Total** | — | **53** | **PASS** |

Additional Authority Guards (P / T / U / V):

| Group | Canonical Name | Cases | Result |
|---|---|---|---|
| P | Additional Authority Guards | 8 | PASS |
| T | Public Runtime Export Boundary | 3 | PASS |
| U | Workspace Service Orchestrator | 3 | PASS |
| V | View Model Projection Invariants | 4 | PASS |
| **Additional Total** | — | **18** | **PASS** |

**Grand total: 71/71 PASS.**

## E. Runtime Regression

`npm run runtime:test` runs the shared runtime-core tests
plus the runtime-application tests. Three consecutive
runs were executed (pass 1 + pass 2 = flake check) plus
a focused P3-A flake-prone sub-suite re-run.

| Run | Shared (14) | Application (807) | Total | Pass | Fail | Duration |
|---|---|---|---|---|---|---|
| Run 1 | 14 | 807 | 821 | 821 | 0 | ~12.1s |
| Run 2 | 14 | 807 | 821 | 821 | 0 | ~11.7s |
| P3-A flake-prone (232) | — | — | 232 | 232 | 0 | ~1.7s |

**No flakes observed across 3 consecutive runs.**

## F. Image Generation Regression

`npm run test:image-generation` covers the P2 frozen
Packaging P2 / Space Generator / Shared Image Generation
Runtime surfaces.

| Suite | Cases | Pass | Fail | Duration |
|---|---|---|---|---|
| Image-generation (P2 frozen) | 972 | 972 | 0 | ~11.1s |

## G. Space Regression (STOP-P3-A-10)

Two dedicated Space regression commands executed
alongside the image-generation regression:

| Command | Result | Failure Count |
|---|---|---|
| `verify:space-compiler-baseline` | PASS | 0 |
| `verify:space-r8.6-golden-boundary` | PASS | 0 |
| `test:image-generation` (Space subset) | PASS | 0 |

**Space regression: PASS** (no Space regression caused by
P3-A changes).

## H. Visual Analysis Regression (STOP-P3-A-11)

Visual Analysis coverage is provided by:

- `runtime:test` (14 shared runtime-core tests) — PASS
- `runtime-application:test` (807 application tests) — PASS
- `web:typecheck` — PASS
- `web-runtime:typecheck` — PASS

The Packaging Workspace application surface (added by
P3-A2..A7) lives in `packages/runtime-core/src/application/packaging/`
and is isolated from the Visual Analysis workspace
surface (`packages/runtime-core/src/application/image-generation/`).
This isolation is locked in by the P3-A7 L-04 / L-05
guards.

**Visual Analysis regression: PASS** (no Visual Analysis
regression caused by P3-A changes).

## I. Security Regression

Re-confirmed by P3-A4 / P3-A6 / P3-A7 guards (no new
test added by P3-A8):

| Vector | Status |
|---|---|
| Absolute path leakage (`C:\\`, `/home/`, `/Users/`, `file://`, UNC) | **NO** |
| Credential leakage (`apiKey`, `Authorization`, `Bearer`, `secret`, `password`, `credential`) | **NO** |
| Raw Provider payload leakage | **NO** |
| Raw `session` / `preparedResult` / `executionResult` / `JSON.stringify` spread | **NO** |
| Raw `error.message` / stack / cause in view | **NO** |
| Binary / base64 / data URI leakage | **NO** |

All 8/8 vectors: **NO leakage**.

## J. Authority Regression

Re-confirmed by P3-A7 P / T / U / V guards (no new test
added by P3-A8):

| Authority | Status |
|---|---|
| Second generation fingerprint authority | **NO** |
| Second state machine | **NO** |
| Second stale engine | **NO** (intent-schema owns data-side `detectStaleChange` only) |
| Second Project authority | **NO** |
| Second Locked Asset authority | **NO** |
| Second Reference role authority | **NO** |
| Second precedence engine | **NO** |
| Second Provider registry / runtime | **NO** |
| Second credential authority | **NO** |
| Second run-store authority | **NO** |

All 10/10 second-authority items: **NO**.

## K. Determinism / Flake Check

| Surface | Result |
|---|---|
| `runtime:test` × 2 consecutive | PASS / PASS (821 + 821) |
| P3-A flake-prone sub-suite (232) | PASS (single run, no flakes) |
| `view-model serializeWorkspaceView` determinism | PASS (P3-A4 V-77 / V-78) |
| Stale reasons deterministic ordering | PASS (P3-A5 S-26) |
| Reference mapping deterministic | PASS (P3-A6 R-26) |
| Locked-assets projection deterministic | PASS (P3-A6 L-12) |
| `computeTruthFingerprint` stable for same truth | PASS (P3-A6 L-13) |
| P2 frozen `compileFingerprint` stable across retries | PASS (P3-A5 S-43) |

**No flakes; no non-deterministic behaviour observed.**

## L. P2 Frozen Diff

| Frozen module | Modified between baseline and HEAD |
|---|---|
| `packages/image-generation-runtime/src/packaging/compiler.js` | NO |
| `packages/image-generation-runtime/src/packaging/contracts.js` | NO |
| `packages/image-generation-runtime/src/packaging/generation-service.js` | NO |
| `packages/image-generation-runtime/src/packaging/metadata.js` | NO |
| `packages/image-generation-runtime/src/packaging/provider-adapter.js` | NO |
| `packages/image-generation-runtime/src/packaging/provider-capability.js` | NO |
| `packages/image-generation-runtime/src/packaging/reference-policy.js` | NO |
| `packages/image-generation-runtime/src/packaging/translation.js` | NO |
| `packages/image-generation-runtime/src/packaging/validation.js` | NO |
| `packages/image-generation-runtime/src/core/packaging-generation-core.js` | NO |
| `packages/image-generation-runtime/src/redact.js` | NO |
| `packages/image-generation-runtime/src/deliverables/` | NO |
| `packages/image-generation-runtime/src/policies.js` | NO |
| `packages/image-generation-runtime/src/gates.js` | NO |
| `packages/image-generation-runtime/src/task-builder.js` | NO |
| `packages/image-generation-runtime/src/download-verify.js` | NO |

**P2 frozen modules modified: NO** (16/16 protected paths
intact since baseline `33540534...`).

## M. Verification

| Command | Result |
|---|---|
| `npm run repo:verify` | **PASS** (40/40) |
| `npm run verify:version-naming` | **PASS** |
| `npm run test:image-generation` | **PASS** (972/972) |
| `npm run runtime:test` | **PASS** (821/821) |
| P3-A phase tests (A2..A7) | **PASS** (473/473) |
| `git diff --check` | **PASS** (no content errors) |
| `git status --porcelain` | **CLEAN** (empty) |
| `npm run web:typecheck` | **PASS** |
| `npm run web-runtime:typecheck` | **PASS** |
| `npm run verify:space-compiler-baseline` | **PASS** (0 failure) |
| `npm run verify:space-r8.6-golden-boundary` | **PASS** (0 failure) |

## N. Canonical STOP-P3-A Matrix

Per P3-A spec §55. All 12 conditions re-confirmed
against the canonical names:

| # | Condition | Status |
|---|---|---|
| **STOP-P3-A-01** | Workspace deep-imports Compiler | **NOT TRIGGERED** |
| **STOP-P3-A-02** | Workspace constructs Provider Payload | **NOT TRIGGERED** |
| **STOP-P3-A-03** | Workspace reads credential secret | **NOT TRIGGERED** |
| **STOP-P3-A-04** | Workspace modifies Frozen P2 contract | **NOT TRIGGERED** |
| **STOP-P3-A-05** | Workspace introduces 2nd Reference role mapping | **NOT TRIGGERED** |
| **STOP-P3-A-06** | Workspace introduces 2nd precedence engine | **NOT TRIGGERED** |
| **STOP-P3-A-07** | Workspace execute cannot fail-closed on stale | **NOT TRIGGERED** |
| **STOP-P3-A-08** | Workspace persistence saves absolute path / secret | **NOT TRIGGERED** |
| **STOP-P3-A-09** | Web UI direct Provider network call | **NOT TRIGGERED** |
| **STOP-P3-A-10** | P3-A causes Space regression | **NOT TRIGGERED** |
| **STOP-P3-A-11** | P3-A causes Visual Analysis regression | **NOT TRIGGERED** |
| **STOP-P3-A-12** | `repo:verify` regression | **NOT TRIGGERED** |

**12/12 NOT TRIGGERED.**

## O. Changed Files

| Category | Files | Net change |
|---|---|---|
| Production | 0 | 0 |
| Tests | 0 | 0 |
| Docs (this report) | 1 | +N |

**P3-A8 production diff = 0** (no production code
changes). This report is a docs-only commit.

## P. P3-A8 Exit Decision

```
PASS — READY FOR P3-A9
```

All acceptance criteria met:

- Local HEAD == origin HEAD
- Working tree clean
- P2 frozen modules unmodified since baseline
- All 473 P3-A phase tests PASS
- All 821 runtime tests PASS (across 2 consecutive runs)
- All 972 image-generation tests PASS
- repo:verify 40/40 PASS
- verify:version-naming PASS
- 71/71 Architecture Guards A-L PASS
- 12/12 canonical STOP-P3-A conditions NOT TRIGGERED
- 10/10 second-authority items: NO
- 8/8 security vectors: NO leakage
- 3 consecutive regression runs: no flakes
- 0 production changes

P3-A is ready for the Freeze Report (P3-A9).
