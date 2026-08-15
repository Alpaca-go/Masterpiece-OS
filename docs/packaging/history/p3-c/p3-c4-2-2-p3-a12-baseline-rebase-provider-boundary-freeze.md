# P3-C4.2.2 — P3-A12 Baseline Rebase & Provider Boundary Freeze

Date: 2026-08-15
Branch: `codex/visual-analysis-a1-multi-provider`
Authorized start HEAD: `dcc281496ee2fd03e0fa35fb64a84e8c50b39c73`
P3-A12 re-freeze: `dcc2814`
P3-A12 corrective production: `1fcafc810a7e218a7cf50dd675d914cd396304b2`
P3-C4.2.2 freeze: this document + 2 commits
Real Provider validation: **NOT PERFORMED** (test / freeze / guard cleanup phase)
Final decision: **P3-C RE-FROZEN**

## A. Git

| Stage | Commit | Class |
|---|---|---|
| P3-A12 corrective production | `1fcafc8` | comment-only update to checkStale; function body byte-equivalent to C4.2.1 final |
| P3-A12 re-freeze | `dcc2814` | docs only |
| C4.2.2 guard cleanup | this commit (1/2) | tests only (12 modified + 1 added) |
| C4.2.2 freeze docs | this commit (2/2) | docs only |

C4.2.2 is a TEST / FREEZE / GUARD CLEANUP phase. Production
source changes: 0. The two C4.2.2 commits are tests/docs
only. Working tree after the C4.2.2 commits is empty
(AC-09 enforced).

## B. P3-A12 consumed

P3-A12 formally accepted the existing
`workspace-service.checkStale(sessionId)` seam as the
**Canonical Read-Only STALE Inspection API**. The canonical
STALE authority (computeStale in stale-tracker.js) is the
single source of truth. The P3-A12 corrective updated the
function comment only; the function body is byte-equivalent
to the C4.2.1 final SHA `71289b8`.

C4.2.2 consumes the P3-A12 production-tree baseline
(`1fcafc8`) as the **current** zero-diff target for the
P3-A frozen surface. P3-C4.2.2 is NOT a corrective; it
is a **rebase** of the existing P3-C frozen guards on top
of the new P3-A12 baseline.

## C. Historical P3-A11 Baseline

The old P3-A11 baseline `f95c145b9b1e37430ac68315c9e039f1f3262ae4`
is preserved as **Historical Frozen Baseline evidence**.
It is no longer the current zero-diff target. The
C4.2.1 sub-tree (read-only `checkStale` seam in
workspace-service.js) IS a real historical delta between
P3-A11 and P3-A12; this delta is documented in the
P3-A12 history (`docs/packaging/history/p3-a/p3-a12-canonical-stale-inspection-corrective.md`)
and is NOT masqueraded as zero.

## D. Current P3-A12 Baseline

The current authoritative P3-A production-tree baseline is:

```
P3A_CURRENT = '1fcafc810a7e218a7cf50dd675d914cd396304b2'
```

A direct `1fcafc8 -> HEAD` diff against the P3-A gate
(`packages/runtime-core/src/application/packaging`) is
**empty** with no exclusion pathspec. This is verified by
AW-03 in the new C4.2.2 test file.

## E. Mandatory Preflight Gates

Before touching any test file, the C4.2.2 phase ran the
mandatory preflight gates:

| Gate | Result |
|---|---|
| `npm run runtime:test` | PASS (1443/1443) |
| `npm run verify:version-consistency` | PASS |
| `npm run verify:version-naming` | PASS |
| `npm run verify:no-obsolete-code` | PASS (700 files scanned) |
| `npm run verify:golden-boundary` | PASS |

All five gates were green at the P3-A12 re-freeze HEAD
(`dcc2814`).

## F. C4_2_1_SUBTREE Removal

The P3-C4.2.1 corrective introduced a `C4_2_1_SUBTREE`
pathspec exclusion:

```js
const C4_2_1_SUBTREE = ':(exclude)packages/runtime-core/src/application/packaging/workspace-service.js';
```

This exclusion was needed to make the P3-A frozen-diff
guard (P3A → HEAD) return empty, even though the C4.2.1
corrective added the read-only `checkStale` seam to
workspace-service.js.

After P3-A12 absorbs the C4.2.1 sub-tree as part of the
new P3-A12 baseline, the exclusion is no longer needed
and would actively hide a real production-tree delta from
the current frozen guard.

C4.2.2 removes `C4_2_1_SUBTREE` from **all 9 test files**
that previously referenced it:

1. `tests/runtime-application/packaging-canonical-context-runtime-handoff.test.ts` (AK-28, AK-29)
2. `tests/runtime-application/packaging-cross-project-technical-hardening.test.ts` (AO-27..29)
3. `tests/runtime-application/packaging-d2-post-corrective-revalidation.test.ts` (AQ-23, AQ-24)
4. `tests/runtime-application/packaging-d3-real-provider-visual-quality-validation.test.ts` (AR-20..22)
5. `tests/runtime-application/packaging-dual-mode-production-acceptance.test.ts` (AL-29, AL-30)
6. `tests/runtime-application/packaging-final-product-acceptance.test.ts` (AM-23..25)
7. `tests/runtime-application/packaging-reference-first-authority-foundation.test.ts` (AJ-14, AJ-15, AJ-19, AJ-20)
8. `tests/runtime-application/packaging-reference-first-handoff-audit.test.ts` (AI-15, AI-16)
9. `tests/runtime-application/packaging-upstream-handoff-contract.test.ts` (AH-C1-13, AH-C1-14)

Final state: `rg C4_2_1_SUBTREE tests` returns **0** matches.

## G. workspace-service Exclusion Removal

The C4.2.1 corrective also introduced a `':!workspace-service.js'`
negative pathspec in three files:

- `tests/runtime-application/packaging-cross-project-hardening-contract.test.ts` (AN-14, AN-15)
- `tests/runtime-application/packaging-project-identity-projection-corrective.test.ts` (AP-15, AP-18, AP-19)
- `tests/runtime-application/packaging-c4-2-1-provider-identity-boundary-cleanup.test.ts` (AT-15)

After P3-A12 absorption, the workspace-service.js file is
part of the current baseline. The negative pathspec is
removed from all three files; the P3-A / P3-B guards now
compare the new P3-A12 baseline to HEAD directly with no
exclusion.

Final state: `rg ':!workspace-service.js' tests` returns
**0** matches. `rg ':(exclude)workspace-service.js' tests`
returns **0** matches.

## H. Renamed Exclusion Search

C4.2.2 verifies that **no renamed equivalent exclusion**
replaces the old `C4_2_1_SUBTREE`. The following banned
tokens must all be absent from the live test files
(AW-07):

- `C4_2_2_SUBTREE`
- `P3_A12_SUBTREE`
- `AUTHORIZED_STALE_SUBTREE`
- `P3A12_EXCLUDE`
- `STALE_SEAM_EXCLUDE`

All five banned tokens return **0** matches in the live
test files (the C4.2.2 test file itself is allowed to
document the banned list and is excluded from the search).

## I. B-class Guard Audit

The B-class guards were audited individually and classified
as **CURRENT FROZEN GUARD** or **HISTORICAL EVIDENCE
GUARD** based on which baseline they compare against.

### CURRENT FROZEN GUARDS (compare against P3-A12 `1fcafc8`)

| Guard ID | File | Action |
|---|---|---|
| AT-15 | c4-2-1 | updated to compare `1fcafc8` → HEAD, no exclusion |
| AN-14 | cross-project-hardening | updated to compare `1fcafc8` → HEAD, no exclusion |
| AN-15 | cross-project-hardening | updated; `':!workspace-service.js'` removed |
| AP-15 | project-identity-projection | updated to compare `1fcafc8` → HEAD, no exclusion |
| AP-18 | project-identity-projection | updated to compare `1fcafc8` → HEAD, no exclusion |
| AP-19 | project-identity-projection | updated; `':!workspace-service.js'` removed |
| AQ-23 | d2 | updated to compare `1fcafc8` → HEAD, no exclusion |

### HISTORICAL EVIDENCE GUARDS (compare against old baselines; expected delta is documented)

| Guard ID | File | Baseline | Purpose |
|---|---|---|---|
| AS-20 | c4-2 | `b6730c3` (C4.2.1 corrective) → HEAD | documents the C4.2.1 + C4.2.1A + C4.2.2A + P3-A12 chain |
| AS-21 | c4-2 | `782e2fc` (C4.1) → `4f3a0a3` (C4.2) | documents the C4.2 surface itself |
| AN-16 | cross-project-hardening | `3da7a14` (P3-C integration) → HEAD | documents P3-C integration through C4.2.1 + P3-A12 |
| AN-16b | cross-project-hardening | `b6730c3` (C4.2.1 corrective) → HEAD | documents the C4.2.1 + P3-A12 chain |
| AT-19 | c4-2-1 | `P3C` → HEAD and `b6730c3` → HEAD | documents the C4.1 + C4.2.1 surface |

HISTORICAL EVIDENCE guards keep their explicit expected
delta (including `workspace-service.js` in the expected
list) and are NOT masqueraded as zero-diff. They serve as
audit-trail evidence of the C4.2.1 / P3-A12 chain and must
not be removed.

## J. Frozen Guard Migration Table

| Guard | Old baseline | Old strategy | Old exclusion? | New baseline | New strategy | Class |
|---|---|---|---|---|---|---|
| AK-28 | `f95c145b` (P3-A11) | diff vs P3-A gate | `C4_2_1_SUBTREE` | `1fcafc8` (P3-A12) | diff vs P3-A gate, no exclusion | CURRENT |
| AK-29 | `2ac4cf1` (P3-B) | diff vs expanded gate | `C4_2_1_SUBTREE` | `2ac4cf1` (P3-B) | diff vs expanded gate, no exclusion | CURRENT (P3-A12 absorbed) |
| AO-27 | `f95c145b` (P3-A11) | diff vs P3-A gate | `C4_2_1_SUBTREE` | `1fcafc8` (P3-A12) | diff vs P3-A gate, no exclusion | CURRENT |
| AO-29 | `3da7a14` (P3-C) | diff vs selector | `C4_2_1_SUBTREE` | `3da7a14` (P3-C) | diff vs selector, no exclusion | CURRENT (P3-A12 absorbed) |
| AQ-23 | `f95c145b` (P3-A11) | diff vs P3-A gate | `C4_2_1_SUBTREE` | `1fcafc8` (P3-A12) | diff vs P3-A gate, no exclusion | CURRENT |
| AQ-24 | `2ac4cf1` (P3-B) | diff vs expanded gate | `C4_2_1_SUBTREE` | `2ac4cf1` (P3-B) | diff vs expanded gate, no exclusion | CURRENT (P3-A12 absorbed) |
| AR-20 | `f95c145b` (P3-A11) | diff vs P3-A gate | `C4_2_1_SUBTREE` | `1fcafc8` (P3-A12) | diff vs P3-A gate, no exclusion | CURRENT |
| AL-29 | `f95c145b` (P3-A11) | diff vs P3-A gate | `C4_2_1_SUBTREE` | `1fcafc8` (P3-A12) | diff vs P3-A gate, no exclusion | CURRENT |
| AM-23 | `f95c145b` (P3-A11) | diff vs P3-A gate | `C4_2_1_SUBTREE` | `1fcafc8` (P3-A12) | diff vs P3-A gate, no exclusion | CURRENT |
| AJ-19 | `f95c145b` (P3-A11) | diff vs P3-A gate | `C4_2_1_SUBTREE` | `1fcafc8` (P3-A12) | diff vs P3-A gate, no exclusion | CURRENT |
| AI-15 | `f95c145b` (P3-A11) | diff vs P3-A gate | `C4_2_1_SUBTREE` | `1fcafc8` (P3-A12) | diff vs P3-A gate, no exclusion | CURRENT |
| AH-C1-13 | `f95c145b` (P3-A11) | diff vs P3-A gate | `C4_2_1_SUBTREE` | `1fcafc8` (P3-A12) | diff vs P3-A gate, no exclusion | CURRENT |
| AH-C1-14 | `2ac4cf1` (P3-B) | diff vs expanded gate | `C4_2_1_SUBTREE` | `2ac4cf1` (P3-B) | diff vs expanded gate, no exclusion | CURRENT (P3-A12 absorbed) |
| AT-15 | `f95c145b` (P3-A11) | expected = `workspace-service.js` | none | `1fcafc8` (P3-A12) | diff empty, no exclusion | CURRENT (re-classified) |
| AN-14 | `f95c145b` (P3-A11) | diff vs P3-A gate | `':!workspace-service.js'` | `1fcafc8` (P3-A12) | diff empty, no exclusion | CURRENT |
| AN-15 | `2ac4cf1` (P3-B) | diff vs expanded gate | `':!workspace-service.js'` | `2ac4cf1` (P3-B) | diff empty, no exclusion | CURRENT |
| AP-15 | `f95c145b` (P3-A11) | diff vs P3-A gate | `':!workspace-service.js'` | `1fcafc8` (P3-A12) | diff empty, no exclusion | CURRENT |
| AP-18 | `f95c145b` (P3-A11) | diff vs P3-A gate | `':!workspace-service.js'` | `1fcafc8` (P3-A12) | diff empty, no exclusion | CURRENT |
| AP-19 | `2ac4cf1` (P3-B) | diff vs expanded gate | `':!workspace-service.js'` | `2ac4cf1` (P3-B) | diff empty, no exclusion | CURRENT |
| AS-20 | `b6730c3` (C4.2.1 corrective) | expected = `workspace-service.js + packaging-operations.js` | none | unchanged | unchanged | HISTORICAL |
| AS-21 | `782e2fc` (C4.1) → `4f3a0a3` (C4.2) | expected = same | none | unchanged | unchanged | HISTORICAL |
| AN-16 | `3da7a14` (P3-C) | expected = `current-operation-graph.ts + workspace-service.js` | none | unchanged | unchanged | HISTORICAL |
| AN-16b | `b6730c3` (C4.2.1 corrective) | expected = `workspace-service.js + packaging-operations.js` | none | unchanged | unchanged | HISTORICAL |
| AT-19 | `P3C` and `b6730c3` | expected = current delta | none | unchanged | unchanged | HISTORICAL |

Target achieved:
- All CURRENT guards: NO exclusion
- All HISTORICAL guards: explicit expected delta, not masquerading as zero-diff

## K. Current P3-A Direct Diff

```
$ git diff --name-only 1fcafc8 HEAD -- packages/runtime-core/src/application/packaging
(empty)
```

The P3-A12 direct diff is **ZERO** with no exclusion. This
is the new authoritative current zero-diff target. The
historical P3-A11 → P3-A12 delta (workspace-service.js
read-only checkStale seam) is preserved as Historical
Frozen Baseline evidence, not as a current zero-diff
requirement.

## L. checkStale Ownership

`workspace-service.checkStale(sessionId)` is the **Canonical
Read-Only STALE Inspection API** for the operations layer.
Ownership:

| Field | Value |
|---|---|
| Canonical STALE owner | P3-A Workspace Application |
| Canonical STALE computation | `computeStale` in `stale-tracker.js` |
| External inspection seam | `service.checkStale(sessionId)` |
| Output | `{ stale: boolean, reasons: readonly string[] }` |
| Read-only | yes (no status / intent / truth / prepared / execution / error / persistence mutation) |
| New STALE reasons added | 0 (only existing `intent_changed` + `truth_surface_changed`) |
| Raw state exposed to ops | no (only `stale` + `reasons`; no `currentIntent` / `prepared.intentAtPrepare` / `prepared.truthFingerprintAtPrepare` / `truthSnapshot`) |
| Second stale engine | no (operations layer does NOT import `computeStale`) |
| Second view model | no (`view-model.js` does NOT expose `intentAtPrepare` / `truthFingerprintAtPrepare`) |

## M. AV Contract

AV-01..25 (P3-A12 Canonical STALE Inspection Contract)
remain PASS. Key contracts:

- AV-01 checkStale exists on Workspace Service
- AV-02 uses canonical computeStale (single source of truth)
- AV-03 returns only `{ stale, reasons }` (no raw state exposure)
- AV-04..07 read-only contract
- AV-08/12/13 STALE_REASON set unchanged
- AV-09 reads via getSessionOrThrow
- AV-10 re-runs computeStale (fresh, not snapshot)
- AV-14 ops uses seam only for inspection (not mutation)
- AV-15/16/17 ops does NOT import computeStale/stale-tracker
- AV-18/19 view model does NOT expose intentAtPrepare/truthFingerprintAtPrepare
- AV-20 no raw stale-input accessor added
- AV-21/22/23 P2 / P3-B / P3-A state machine unchanged
- AV-24 function body byte-equivalent to C4.2.1 final (LF-normalized)
- AV-25 no Provider calls, no Golden update

## N. AK-15

AK-15 (no second stale tracker) is preserved. The
operations layer does NOT import `computeStale` /
`stale-tracker` / `STALE_REASON`. The operations layer
consumes `checkStale` only via the public Workspace
service surface.

## O. R-13

R-13 (canonical STALE envelope) is preserved. The
canonical STALE response shape is:

```js
{
  code: 'PACKAGING_WORKSPACE_EXECUTE_REJECTED',
  issues: ['stale', ...stale.reasons]
}
```

No new STALE reason or new status is introduced by the
C4.2.2 phase.

## P. Registry / API Identity Split

The C4.2 identity split is preserved in
`buildExecutionDeps`:

| Field | Source | Identity |
|---|---|---|
| `intent.providerModelId` | Workspace intent | Registry |
| `profile.registryModelId` | Profile | Registry |
| `profile.modelId` | Profile | Provider API |
| `adapterId` | Resolved adapter | Registry (= `registryModelId`) |
| `modelId` | HTTP request body | Provider API (= `providerApiModelId`) |

The C4.2.1 execution preflight is preserved:
`EXECUTION_PROVIDER_MODEL_IDENTITY_MISMATCH` is thrown by
`buildExecutionDeps` when `profile.registryModelId` does
not match `intent.providerModelId`. The Workspace state is
NOT mutated for the mismatch; no STALE transition; no
new STALE reason.

## Q. Analysis Split Profile

The analysis-led split profile (C4.2 corrective surface)
retains the Registry and API identity split. The profile
sets `registryModelId = seedream-5.0-pro` and `modelId =
doubao-seedream-5-0-pro-260628`. The Registry identity
is used for capability lookup; the Provider API identity
is used for the HTTP request body.

## R. Reference Split Profile

The reference-first split profile (C4.2 corrective surface)
has the same Registry/API identity split as the analysis-led
profile. The active Reference source does NOT influence
the Provider identity; the canonical Registry identity is
preserved across both modes.

## S. Legacy Profile

The legacy same-id profile (where `registryModelId ===
modelId`) is preserved. The C4.2 split does NOT change
legacy behavior; the `effectiveProviderApiIdentity` falls
back to the `effectiveRegistryIdentity` when no split is
configured.

## T. READY Provider Mismatch

A READY session whose profile Registry identity does not
match the Workspace intent Registry identity is rejected
at execution preflight as
`EXECUTION_PROVIDER_MODEL_IDENTITY_MISMATCH`:

1. `service.checkStale(sessionId)` → `{ stale: false, reasons: [] }` (fresh)
2. `buildExecutionDeps` → `EXECUTION_PROVIDER_MODEL_IDENTITY_MISMATCH` thrown
3. Workspace state NOT mutated (no STALE transition, no error recorded)
4. No adapter call
5. No network call

The Workspace STALE surface is NOT touched.

## U. STALE + Provider Mismatch

A session that is both STALE and has a Provider mismatch:

1. `service.checkStale(sessionId)` → `{ stale: true, reasons: ['intent_changed', ...] }`
2. operations layer rejects with `PACKAGING_WORKSPACE_EXECUTE_REJECTED`, issues = `['stale', 'intent_changed', ...]`
3. `buildExecutionDeps` is **NOT** called
4. Provider identity mismatch is **NOT** surfaced (the STALE rejection wins)

This is the **STALE-first ordering** mandated by C4.2.1.

## V. D-PROVIDER-01

The D-PROVIDER-01 cap (maxReferenceImages / maxReferences
= 10) is retained:

- Registry: `id: 'seedream-5.0-pro', maxReferenceImages: 10`
- Adapter: `'seedream-5.0-pro': ..., maxReferences: 10`

10 accepted, 11 rejected before execution / network.
Provider-targeted suites: 89/89 PASS.

## W. AW Guards

A new AW guard group (`AW-01..25`) is added by this phase:

- AW-01..04 current P3-A12 baseline consumed, direct diff zero, no exclusion
- AW-05..07 exclusion cleanup (C4_2_1_SUBTREE = 0, workspace-service.js pathspec = 0, no renamed equivalent)
- AW-08..10 AV / AK-15 / R-13 contract preserved
- AW-11..14 Registry/API identity split retained
- AW-15..16 READY mismatch + STALE-first ordering
- AW-17 D-PROVIDER-01 retained
- AW-18..20 P2 / P3-B / P3-C selector unchanged
- AW-21 production source changes zero
- AW-22 external Provider calls zero
- AW-23 Golden auto-update NO, unchanged
- AW-24 historical D3 HOLD preserved
- AW-25 D3 requires new authorization

All 25 AW tests PASS at the C4.2.2 freeze commit.

## X. Existing Guards

All existing guard families remain green:

- AH (1 test)
- AI (1 test)
- AJ (1 test)
- AK (1 test)
- AL (1 test)
- AM (1 test)
- AN (1 test)
- AO (1 test)
- AP (1 test)
- AQ (1 test)
- AR (1 test)
- AS (1 test)
- AT (1 test)
- AV (1 test)
- AW (1 test, this commit)
- 89/89 provider-targeted suites

No existing guard is broken by the C4.2.2 phase.

## Y. Full Regression

Full regression runs against the C4.2.2 freeze commit:

| Suite | Result |
|---|---|
| `npm test` | PASS |
| `npm run runtime:test` | PASS (1443/1443) |
| `npm run runtime-application:test` | PASS (was 1418 in C4.2.1; +25 AW) |
| `npm run test:image-generation` | PASS |
| `npm run cli:test` | PASS |
| `npm run web:typecheck` | PASS |
| `npm run web:build` | PASS |
| `npm run web-runtime:typecheck` | PASS |
| `npm run web-runtime:test` | PASS |
| `npm run web:smoke` | PASS (0 Provider calls) |
| `npm run repo:verify` | PASS |
| `npm run repo:check` | PASS |
| `npm run verify:current-flows` | PASS |
| `npm run verify:version-consistency` | PASS |
| `npm run verify:version-naming` | PASS |
| `npm run verify:workspace-boundaries` | PASS |
| `npm run verify:no-obsolete-code` | PASS (700 files) |
| `npm run verify:production-boundaries` | PASS |
| `npm run verify:no-project-specific-production-rules` | PASS |
| `npm run verify:golden-boundary` | PASS |
| `npm run verify:space-compiler-baseline` | PASS |
| `npm run verify:space-r8.6-golden-boundary` | PASS |
| `npm run golden:test` | PASS |

## Z. Production Source Changes

**0.** C4.2.2 is a TEST / FREEZE / GUARD CLEANUP phase. The
two C4.2.2 commits add one new test file and modify 12
existing test files; no production source is touched.

The C4.2.2 working tree contains:

- `tests/runtime-application/packaging-c4-2-2-p3-a12-baseline-rebase-provider-boundary-freeze.test.ts` (new, AW guards)
- 12 modified test files (P3A const update + C4_2_1_SUBTREE removal + B-class guard reclassification)
- 1 new docs file (this document)

## AA. Provider Calls

**0.** C4.2.2 is offline-only. No Provider key read, no
Provider HTTP request, no model name reference, no D3
re-run. The `.codex-smoke/` tree is gitignored.

## AB. Golden

- Golden auto-update: **NO**
- Golden files changed: **NO**

The Golden boundary is intact. No Golden asset was added,
removed, or modified by the C4.2.2 phase.

## AC. Current Frozen Diff Matrix

| Surface | Current zero-diff | Notes |
|---|---|---|
| P2 (`a593278b` → HEAD) | 0 | P2 frozen baseline unchanged |
| P3-A12 current (`1fcafc8` → HEAD) | 0 | direct diff, NO exclusion |
| P3-A11 historical (`f95c145b` → HEAD) | +1 (workspace-service.js) | documented as C4.2.1 sub-tree in P3-A12 history |
| P3-B (`2ac4cf1` → HEAD) | 0 | P3-B accepted UI baseline unchanged |
| P3-C integration (`3da7a14` → HEAD) | +2 (current-operation-graph.ts + workspace-service.js) | documented C4.1 + C4.2.1 + P3-A12 chain |
| C4.2 corrective (`4f3a0a3` → HEAD) | +2 (workspace-service.js + packaging-operations.js) | documented C4.2.1 + P3-A12 chain |
| C4.2.1 corrective (`b6730c3` → HEAD) | +2 (workspace-service.js + packaging-operations.js) | documented C4.2.1 + P3-A12 chain |

## AD. Historical Baselines

Preserved (unchanged from P3-A12 exit):

- P2: `a593278b55e437fac59d768c5cee734d9a9fc201`
- P3-A11 historical: `f95c145b9b1e37430ac68315c9e039f1f3262ae4`
- P3-B accepted: `2ac4cf1cc18156d1e4a508382b4563298d69c014`
- P3-C integration: `456ec3a9d0273b599ed15bcd424fde1f36b8ce1b`
- C4.1 corrective: `782e2fc08fca167e0320f9bcde33ed6eacaf1b2d`
- C4.1 re-freeze: `fa7197c8dc9c0fe1faf8e41440ef22cddbd3cda5`
- D2 accepted: `3e2bea5c975afafe87c67961282dd6c4558c5be3`
- D3 HOLD: `139f82435d2cb0841f7c217fb3c02af05efed380`
- C4.2 corrective: `4f3a0a3d6ee83a3ddbb6225bd2634ce94a11f551`
- C4.2 re-freeze: `35ed6df8bf2b610f640a94fbcf7e60c7cc1fa1ec`
- C4.2 sub-tree test: `8042ec6dcb3aa153682cdc37e741ec2d8292058f`
- C4.2.1 corrective: `b6730c3ca78289a72ec624c475d3945e08d4b5ca`
- C4.2.1 STALE-first: `8e4dc10be43d6ec607d528ed158e11595f170a60`
- C4.2.1 final: `71289b8ce42b704ffaa87d718044911955e6da9d`
- C4.2.1A audit: `0a7fae7a05ab6692007238cda8642736f9c4701a`
- C4.2.2A audit: `4797a45e75748822c808b9073f44706846a48d6e`
- P3-A12 corrective: `1fcafc810a7e218a7cf50dd675d914cd396304b2`
- P3-A12 re-freeze: `dcc281496ee2fd03e0fa35fb64a84e8c50b39c73`

## AE. P3-C4.2.2 Freeze Commits

| Commit | Class |
|---|---|
| `test(packaging): rebase frozen guards onto P3-A12` | 12 modified test files + 1 new AW test file |
| `docs(packaging): refreeze P3-C on P3-A12 baseline` | 1 new docs file (this document) |

## AF. Working Tree

**EMPTY** after the two C4.2.2 commits. AC-09
(`git status --porcelain` is empty) is enforced.

## AG. Local / Remote

`local == origin` after the C4.2.2 push.

## AH. Final Decision

- **P3-C STATUS: RE-FROZEN**
- **P3-D3 STATUS: HOLD — RE-RUN AUTHORIZATION REQUIRED**
- **P3-D4 STATUS: LOCKED**
- **P3-E STATUS: LOCKED**

## AI. Next Step

**P3-D3 RE-RUN** — bounded real-provider visual-quality
validation.

The next phase requires a NEW explicit human
authorization:

- max 5 calls
- single model `seedream-5.0-pro` Registry id (actual API name `doubao-seedream-5-0-pro-260628`)
- single profile
- 0 random retries

Start from the C4.2.2 re-freeze commit. Re-classify the
D3 outcome as PASS or HOLD — VISUAL QUALITY HARDENING
REQUIRED.

C4.2.2 does NOT auto-start D3.
