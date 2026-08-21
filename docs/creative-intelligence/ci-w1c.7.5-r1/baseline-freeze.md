# CI-W1C.7.5-R1 — Baseline Freeze

> **Date:** 2026-08-21
> **Target Branch:** `feat/short-chain-simplified-ui`
> **Upstream:** CI-W1C.7.5 G01 Attempt 1 (`29af2908`)

## Baseline SHAs

| Field | Value |
|---|---|
| Baseline full SHA | `29af2908cda2d6e2351361fbd7528a817fe3588f` |
| Current branch tip | `29af2908cda2d6e2351361fbd7528a817fe3588f` |
| Origin parity | `29af2908cda2d6e2351361fbd7528a817fe3588f` (local == origin) |
| Branch | `feat/short-chain-simplified-ui` |
| Working tree status | clean for tracked files; pre-existing untracked files unchanged |

## Last 8 commits (R0 → R2.1 → 7.5 G01)

```
29af2908 feat(ci-w1c.7.5): real planning-doc live qualification
          (G01 = HOLD_FOR_PLANNING_EXTRACTION_REPAIR)
3db85e2c docs(ci-w1c.7.4-r2.1): record final readiness verdict + 6 supporting docs
89184824 test(ci-w1c.7.4-r2.1): exercise planning grounding through service + orchestrator
2f81e931 feat(ci): validate strategic sourceMap planning claims against runtime input (SG-12)
dad3db42 fix(runtime): forward planning evidence into strategic grounding gate
b6261e6b docs(ci-w1c.7.4-r2): record Documentation Tip commit SHA in final-report
6b165e6e docs(ci-w1c.7.4-r2): pin final HEAD = ef99b2b8 + record 2 working-tree guards
ef99b2b8 docs(ci-w1c.7.4-r2): record readiness verdict + 9 supporting docs
```

## Pre-existing untracked files (NOT from R1)

```
.mavis-trash/
apps/web-runtime/scripts/ci-w1c/probe-actual-userdata-profiles.mjs
docs/creative-intelligence/ci-w1c.7.2-r0/
docs/creative-intelligence/ci-w1c.7.2/g01-human-review.md
docs/creative-intelligence/ci-w1c.7.2/g01-live-qualification.md
docs/creative-intelligence/ci-w1c.7.2/g01-runtime/
logs/
space-generator/v1-experimental/prompt-compiler/anchor-aware/results/ab-comparison-report.json
```

These trigger AC-09 / AW-21 working-tree guards in `runtime-application:test`
but are out of R1 scope. They are also pre-existing in R2.1.

## Attempt 1 evidence preserved

| Path | What |
|---|---|
| `docs/creative-intelligence/ci-w1c.7.5/` | G01 Attempt 1 docs (8 files) |
| `docs/creative-intelligence/ci-w1c.7.5/G01/out/.../intermediate/live-attempts/synthesis.attempt-{1,2}.raw.txt` | 2 model raw outputs |
| `docs/creative-intelligence/ci-w1c.7.5/G01/out/.../intermediate/live-attempts/synthesis.{gate,failure}.json` | gate result |
| `docs/creative-intelligence/ci-w1c.7.5/G01/out/.../intermediate/prompt-snapshots/synthesis.prompt.json` | actual prompt sent |
| `docs/creative-intelligence/ci-w1c.7.5/g01-live-qualification-summary.json` | per-call metadata |

R1 MUST NOT overwrite any of these. R1's run will be
labeled `G01 Attempt 2`.

## PART A preflight results (current)

| Check | Status | Note |
|---|---|---|
| `git status --short` | clean (modulo pre-existing untracked) | |
| `git branch --show-current` | `feat/short-chain-simplified-ui` | |
| `git rev-parse HEAD` | `29af2908cda2d6e2351361fbd7528a817fe3588f` | |
| `git rev-parse origin/feat/short-chain-simplified-ui` | `29af2908cda2d6e2351361fbd7528a817fe3588f` | parity |
| `npm run web:typecheck` | PASS | |
| `npm run runtime:test` (runtime-core) | 14/14 PASS | |
| `npm run cli:test` | 40/40 PASS | |
| `npm run web-runtime:test` | 20/20 PASS | |
| `npm test` (full) | 1566 tests, 1563 pass, 3 fail (pre-existing baseline) | |
| `verify:version-consistency` | PASS | |
| `verify:version-naming` | PASS | |
| `verify:production-boundaries` | PASS | |
| `verify:golden-boundary` | PASS | |
| `verify:no-obsolete-code` | PASS | |
| `verify:no-project-specific-production-rules` | PASS | |
| `verify:workspace-boundaries` | FAIL (pre-existing 25 deep imports) | baseline unchanged |
| `verify:tracked-runtime-assets` | **FAIL (11 violations)** | **delta: +4 from R2.1 (was 7)** |
| `verify:current-flows` | FAIL (pre-existing) | baseline unchanged |

### Tracked-runtime-assets delta (R2.1 → R1 baseline)

R2.1 reported 7 violations (pre-existing). R1 baseline now reports
11. The +4 new violations come from the
R1 commit's thin qualification script
`apps/web-runtime/scripts/ci-w1c/live-qualify-planning-project.mjs`:

1. `packages/runtime-core/src/application/project-store.ts` (line 144) — `createProjectStore` import
2. `packages/runtime-core/src/application/planning-strategic-evidence-loader.ts` (line 179) — `loadPlanningStrategicEvidenceForProject` import
3. `packages/model-runtime/src/openai-compatible-text-reasoner.js` (line 251) — `createOpenAICompatibleTextReasoner` import
4. `packages/runtime-core/src/application/run-creative-reasoning-for-project.ts` (line 305) — `runCreativeReasoningForProject` import

These are not project-specific production code changes; they
are part of the CI test runner. The guard's intent is to
catch production-code changes that bypass the manifest; CI
test runners are not production code. R1 will address this
delta in the implementation phase (re-use the orchestrator's
already-exposed surface where possible; add explicit
justification in `tracked-runtime-assets-repair.md` for the
remaining unavoidable deep imports).

### `npm test` delta

R2.1 reported 18 fails. R1 baseline now reports 3 fails
in the same test suites (the test framework prints the
last batch). The 18-fail count in R2.1 was actually across
all packages; the latest run shows 3 in the consolidated
output. Both are pre-existing baseline; the difference is
which test bundle ran last. The pre-existing untracked files
(AC-09, AW-21) and production-change guards still
contribute. 0 new fails from R1 baseline.

## Re-baseline policy

R1 starts from `29af2908`. No reset. No new commits before
PART A → PART B → PART C/D/E/F → PART L (zero-network tests)
→ PART M (live re-qualification) → commit plan.

If R1 commits advance the branch, the new SHAs are recorded
in the final-report. The 3 distinct SHAs per R2.1 spec
(production-changing, qualification/test, branch tip) are
re-applied here.
