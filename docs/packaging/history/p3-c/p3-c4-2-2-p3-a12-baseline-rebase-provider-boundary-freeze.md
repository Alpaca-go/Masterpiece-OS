# P3-C4.2.2 �?P3-A12 Baseline Rebase & Provider Boundary Freeze

Date: 2026-08-15
Branch: `codex/visual-analysis-a1-multi-provider`
Authorized start HEAD: `dcc281496ee2fd03e0fa35fb64a84e8c50b39c73` (P3-A12 re-freeze)
P3-A12 re-freeze: `dcc2814`
P3-A12 corrective production: `1fcafc810a7e218a7cf50dd675d914cd396304b2`
P3-C4.2.2 final verified HEAD: `887436e1a4b49f76f8dd631f945442f0615b6257`
P3-C4.2.2 freeze: 3 commits (tests + tests + docs) + 1 sync commit (this document)
Real Provider validation: **NOT PERFORMED** (test / freeze / guard cleanup phase)
Final decision: **P3-C RE-FROZEN**

## A. Git

| Stage | Commit | Class |
|---|---|---|
| P3-A12 corrective production | `1fcafc810a7e218a7cf50dd675d914cd396304b2` | comment-only update to checkStale; function body byte-equivalent to C4.2.1 final |
| P3-A12 re-freeze | `dcc281496ee2fd03e0fa35fb64a84e8c50b39c73` | docs only |
| **C4.2.2 (1/3) guard cleanup** | **`42249ae7930e25a6bf91e1c02189f3c438976577`** | tests only (12 modified + 1 new AW file) |
| **C4.2.2 (2/3) follow-up** | **`887436e1a4b49f76f8dd631f945442f0615b6257`** | tests only (P3-B gate split + P3-C chain reclassification) |
| **C4.2.2 (3/3) freeze docs** | **`f309f589bf06940553106f30aa42ddb95080cbdc`** | docs only (this document) |
| **C4.2.2 sync** | **this commit (final C4.2.2 HEAD; see `git log` for exact SHA)** | docs only (final record synchronization) |

C4.2.2 is a TEST / FREEZE / GUARD CLEANUP phase. Production
source changes: 0. The three C4.2.2 commits are tests/docs
only. The C4.2.2 sync commit is docs only (final record
synchronization; no semantic change to baselines or
guards). Working tree after the C4.2.2 sync commit is
empty (AC-09 enforced).

The three C4.2.2 commits form the complete technical
rebase. The C4.2.2 sync commit (this document) only
corrects the canonical record to reflect the actual
HEAD (`887436e`) �?including the test follow-up that
split the P3-B expanded-gate tests and reclassified
the P3-C chain guards.

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
guard (P3A �?HEAD) return empty, even though the C4.2.1
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

**Final guard count at C4.2.2 verified HEAD `887436e`:**
- **CURRENT FROZEN GUARDS: 25** (compare against current
  P3-A12 baseline `1fcafc8` or current P3-B baseline
  `2ac4cf1`; expect empty diff with no exclusion pathspec)
- **HISTORICAL EVIDENCE GUARDS: 8** (compare against
  historical baselines like `3da7a14` / `b6730c3` /
  `fa7197c` / `P3C`; expect an explicit delta that
  documents the C4.1 + C4.2 + C4.2.1 + P3-A12 chain)
- **Total frozen guards: 33**

### CURRENT FROZEN GUARDS (compare against current P3-A12 / P3-B baseline; expect empty diff with no exclusion)

| # | Guard ID | File | Action at C4.2.2 |
|---|---|---|---|
| 1 | AT-15 | c4-2-1 | updated to compare `1fcafc8` �?HEAD, no exclusion |
| 2 | AN-14 | cross-project-hardening | updated to compare `1fcafc8` �?HEAD, no exclusion |
| 3 | AN-15 | cross-project-hardening | updated; `':!workspace-service.js'` removed (P3-B UI only) |
| 4 | AK-28 | canonical-context | updated; `C4_2_1_SUBTREE` removed |
| 5 | AK-29 | canonical-context | updated; `C4_2_1_SUBTREE` removed (P3-B UI only after `887436e` split) |
| 6 | AO-27 | cross-project-technical | updated; `C4_2_1_SUBTREE` removed |
| 7 | AO-28 | cross-project-technical | updated; `C4_2_1_SUBTREE` removed (P3-B UI only after `887436e` split) |
| 8 | AQ-23 | d2 | updated to compare `1fcafc8` �?HEAD, no exclusion |
| 9 | AQ-24 | d2 | updated; `C4_2_1_SUBTREE` removed (P3-B UI only after `887436e` split) |
| 10 | AR-20 | d3 | updated; `C4_2_1_SUBTREE` removed |
| 11 | AR-21 | d3 | updated; `C4_2_1_SUBTREE` removed (P3-B UI only after `887436e` split) |
| 12 | AL-29 | dual-mode | updated; `C4_2_1_SUBTREE` removed |
| 13 | AL-30 | dual-mode | updated; `C4_2_1_SUBTREE` removed (P3-B UI only after `887436e` split) |
| 14 | AM-23 | final-product | updated; `C4_2_1_SUBTREE` removed |
| 15 | AM-24 | final-product | updated; `C4_2_1_SUBTREE` removed (P3-B UI only after `887436e` split) |
| 16 | AP-15 | project-identity-projection | updated to compare `1fcafc8` �?HEAD, no exclusion |
| 17 | AP-18 | project-identity-projection | updated to compare `1fcafc8` �?HEAD, no exclusion |
| 18 | AP-19 | project-identity-projection | updated; `':!workspace-service.js'` removed (P3-B UI only) |
| 19 | AJ-19 | reference-first-authority | updated; `C4_2_1_SUBTREE` removed |
| 20 | AJ-20 | reference-first-authority | updated; `C4_2_1_SUBTREE` removed (P3-B UI only after `887436e` split) |
| 21 | AI-15 | reference-first-handoff | updated; `C4_2_1_SUBTREE` removed |
| 22 | AI-16 | reference-first-handoff | updated; `C4_2_1_SUBTREE` removed (P3-B UI only after `887436e` split) |
| 23 | AH-C1-13 | upstream-handoff | updated; `C4_2_1_SUBTREE` removed |
| 24 | AH-C1-14 | upstream-handoff | updated; `C4_2_1_SUBTREE` removed (P3-B UI only after `887436e` split) |
| 25 | AW-03 | c4-2-2 | canonical P3-A12 current baseline direct zero-diff guard |

### HISTORICAL EVIDENCE GUARDS (compare against old baselines; expected delta is documented, not zero)

| # | Guard ID | File | Baseline | Purpose |
|---|---|---|---|---|
| 1 | AS-20 | c4-2 | `b6730c3` (C4.2.1 corrective) �?HEAD | documents the C4.2.1 + C4.2.1A + C4.2.2A + P3-A12 chain |
| 2 | AS-21 | c4-2 | `782e2fc` (C4.1) �?`4f3a0a3` (C4.2) | documents the C4.2 surface itself |
| 3 | AN-16 | cross-project-hardening | `3da7a14` (P3-C integration) �?HEAD | documents P3-C integration through C4.1 + C4.2.1 + P3-A12 |
| 4 | AN-16b | cross-project-hardening | `b6730c3` (C4.2.1 corrective) �?HEAD | documents the C4.2.1 + P3-A12 chain |
| 5 | AT-19 | c4-2-1 | `P3C` �?HEAD and `b6730c3` �?HEAD | documents the C4.1 + C4.2.1 surface |
| 6 | **AO-29** | cross-project-technical | `3da7a14` (P3-C integration) �?HEAD | **reclassified in `887436e`**: expected = `current-operation-graph.ts + workspace-service.js` (C4.1 + C4.2.1 + P3-A12 chain); was zero-diff in C4.2.2a, reclassified to HISTORICAL EVIDENCE in `887436e` |
| 7 | **AM-25** | final-product | `C2` (`456ec3a`) �?HEAD | **reclassified in `887436e`**: expected = `current-operation-graph.ts + workspace-service.js` (C4.1 + C4.2.1 + P3-A12 chain); was zero-diff in C4.2.2a, reclassified to HISTORICAL EVIDENCE in `887436e` |
| 8 | **AR-22** | d3 | `fa7197c` (P3-C re-freeze) �?HEAD | **reclassified in `887436e`**: expected = `workspace-service.js` (C4.2.1 + P3-A12 chain); was zero-diff in C4.2.2a, reclassified to HISTORICAL EVIDENCE in `887436e` |

**HISTORICAL EVIDENCE classification is explicit**:
- The test name in each `887436e` reclassified guard
  includes the phrase `(HISTORICAL EVIDENCE)`.
- The expected delta is documented in the test
  (explicit sorted list), not masqueraded as zero-diff.
- The current P3-A12 baseline is verified separately by
  AW-03 (canonical P3-A12 direct zero-diff guard).

**P3-B gate reclassification (`887436e`):**

The 14 P3-B expanded-gate tests (AK-29, AN-15, AO-28,
AQ-24, AR-21, AL-30, AM-24, AP-19, AJ-20, AI-16,
AH-C1-14) originally conflated the P3-B UI baseline
(`2ac4cf1`) with the P3-A application path
(`packages/runtime-core/src/application/packaging`). After
P3-A12 absorbed the workspace-service.js change, the
expanded-gate test no longer passes because the P3-A part
is no longer empty from P3-B to HEAD.

The `887436e` follow-up split each test into:
- **P3-B UI check**: `2ac4cf1` �?HEAD against
  `apps/web/src/features/packaging` only (expect empty).
- The P3-A12 zero-diff check is covered separately by
  AT-15, AN-14, AP-15, AP-18, AW-03 (no change needed;
  the P3-A check is at the P3-A12 baseline, not the
  P3-B baseline).

**CURRENT P3-B guard = accepted P3-B surface only.**
The P3-B guard MUST NOT include the P3-A application
path; otherwise the P3-B baseline (which predates the
P3-A12 corrective) cannot reach zero diff on the
combined gate.

## J. Frozen Guard Migration Table

| # | Guard | Old baseline | Old strategy | Old exclusion? | New baseline | New strategy | Class |
|---|---|---|---|---|---|---|---|
| 1 | AK-28 | `f95c145b` (P3-A11) | diff vs P3-A gate | `C4_2_1_SUBTREE` | `1fcafc8` (P3-A12) | diff vs P3-A gate, no exclusion | CURRENT |
| 2 | **AK-29** | `2ac4cf1` (P3-B) | diff vs expanded gate | `C4_2_1_SUBTREE` | `2ac4cf1` (P3-B) | **P3-B UI gate only** (split in `887436e`); P3-A12 covered by AT-15 | CURRENT |
| 3 | AO-27 | `f95c145b` (P3-A11) | diff vs P3-A gate | `C4_2_1_SUBTREE` | `1fcafc8` (P3-A12) | diff vs P3-A gate, no exclusion | CURRENT |
| 4 | **AO-28** | `2ac4cf1` (P3-B) | diff vs expanded gate | `C4_2_1_SUBTREE` | `2ac4cf1` (P3-B) | **P3-B UI gate only** (split in `887436e`); P3-A12 covered by AO-27 | CURRENT |
| 5 | **AO-29** | `3da7a14` (P3-C) | diff vs selector, expected = `current-operation-graph.ts` | none | `3da7a14` (P3-C) | **HISTORICAL EVIDENCE** (reclassified in `887436e`); expected = `current-operation-graph.ts + workspace-service.js` (C4.1 + C4.2.1 + P3-A12) | HISTORICAL |
| 6 | AQ-23 | `f95c145b` (P3-A11) | diff vs P3-A gate | `C4_2_1_SUBTREE` | `1fcafc8` (P3-A12) | diff vs P3-A gate, no exclusion | CURRENT |
| 7 | **AQ-24** | `2ac4cf1` (P3-B) | diff vs expanded gate | `C4_2_1_SUBTREE` | `2ac4cf1` (P3-B) | **P3-B UI gate only** (split in `887436e`); P3-A12 covered by AQ-23 | CURRENT |
| 8 | AR-20 | `f95c145b` (P3-A11) | diff vs P3-A gate | `C4_2_1_SUBTREE` | `1fcafc8` (P3-A12) | diff vs P3-A gate, no exclusion | CURRENT |
| 9 | **AR-21** | `2ac4cf1` (P3-B) | diff vs expanded gate | `C4_2_1_SUBTREE` | `2ac4cf1` (P3-B) | **P3-B UI gate only** (split in `887436e`); P3-A12 covered by AR-20 | CURRENT |
| 10 | AL-29 | `f95c145b` (P3-A11) | diff vs P3-A gate | `C4_2_1_SUBTREE` | `1fcafc8` (P3-A12) | diff vs P3-A gate, no exclusion | CURRENT |
| 11 | **AL-30** | `2ac4cf1` (P3-B) | diff vs expanded gate | `C4_2_1_SUBTREE` | `2ac4cf1` (P3-B) | **P3-B UI gate only** (split in `887436e`); P3-A12 covered by AL-29 | CURRENT |
| 12 | AM-23 | `f95c145b` (P3-A11) | diff vs P3-A gate | `C4_2_1_SUBTREE` | `1fcafc8` (P3-A12) | diff vs P3-A gate, no exclusion | CURRENT |
| 13 | **AM-24** | `2ac4cf1` (P3-B) | diff vs expanded gate | `C4_2_1_SUBTREE` | `2ac4cf1` (P3-B) | **P3-B UI gate only** (split in `887436e`); P3-A12 covered by AM-23 | CURRENT |
| 14 | **AM-25** | `C2` (`456ec3a`) | diff vs P3-C surface, expected = `current-operation-graph.ts` | none | `C2` (`456ec3a`) | **HISTORICAL EVIDENCE** (reclassified in `887436e`); expected = `current-operation-graph.ts + workspace-service.js` (C4.1 + C4.2.1 + P3-A12) | HISTORICAL |
| 15 | AJ-19 | `f95c145b` (P3-A11) | diff vs P3-A gate | `C4_2_1_SUBTREE` | `1fcafc8` (P3-A12) | diff vs P3-A gate, no exclusion | CURRENT |
| 16 | **AJ-20** | `2ac4cf1` (P3-B) | diff vs expanded gate | `C4_2_1_SUBTREE` | `2ac4cf1` (P3-B) | **P3-B UI gate only** (split in `887436e`); P3-A12 covered by AJ-19 | CURRENT |
| 17 | AI-15 | `f95c145b` (P3-A11) | diff vs P3-A gate | `C4_2_1_SUBTREE` | `1fcafc8` (P3-A12) | diff vs P3-A gate, no exclusion | CURRENT |
| 18 | **AI-16** | `2ac4cf1` (P3-B) | diff vs expanded gate | `C4_2_1_SUBTREE` | `2ac4cf1` (P3-B) | **P3-B UI gate only** (split in `887436e`); P3-A12 covered by AI-15 | CURRENT |
| 19 | AH-C1-13 | `f95c145b` (P3-A11) | diff vs P3-A gate | `C4_2_1_SUBTREE` | `1fcafc8` (P3-A12) | diff vs P3-A gate, no exclusion | CURRENT |
| 20 | **AH-C1-14** | `2ac4cf1` (P3-B) | diff vs expanded gate | `C4_2_1_SUBTREE` | `2ac4cf1` (P3-B) | **P3-B UI gate only** (split in `887436e`); P3-A12 covered by AH-C1-13 | CURRENT |
| 21 | AT-15 | `f95c145b` (P3-A11) | expected = `workspace-service.js` | none | `1fcafc8` (P3-A12) | diff empty, no exclusion | CURRENT (re-classified) |
| 22 | AN-14 | `f95c145b` (P3-A11) | diff vs P3-A gate | `':!workspace-service.js'` | `1fcafc8` (P3-A12) | diff empty, no exclusion | CURRENT |
| 23 | **AN-15** | `2ac4cf1` (P3-B) | diff vs expanded gate | `':!workspace-service.js'` | `2ac4cf1` (P3-B) | **P3-B UI gate only** (`':!workspace-service.js'` removed in `42249ae`); P3-A12 covered by AN-14 | CURRENT |
| 24 | AP-15 | `f95c145b` (P3-A11) | diff vs P3-A gate | `':!workspace-service.js'` | `1fcafc8` (P3-A12) | diff empty, no exclusion | CURRENT |
| 25 | AP-18 | `f95c145b` (P3-A11) | diff vs P3-A gate | `':!workspace-service.js'` | `1fcafc8` (P3-A12) | diff empty, no exclusion | CURRENT |
| 26 | **AP-19** | `2ac4cf1` (P3-B) | diff vs expanded gate | `':!workspace-service.js'` | `2ac4cf1` (P3-B) | **P3-B UI gate only** (`':!workspace-service.js'` removed in `42249ae`); P3-A12 covered by AP-18 | CURRENT |
| 27 | AS-20 | `b6730c3` (C4.2.1 corrective) | expected = `workspace-service.js + packaging-operations.js` | none | unchanged | unchanged | HISTORICAL |
| 28 | AS-21 | `782e2fc` (C4.1) �?`4f3a0a3` (C4.2) | expected = same | none | unchanged | unchanged | HISTORICAL |
| 29 | AN-16 | `3da7a14` (P3-C) | expected = `current-operation-graph.ts + workspace-service.js` | none | unchanged | unchanged | HISTORICAL |
| 30 | AN-16b | `b6730c3` (C4.2.1 corrective) | expected = `workspace-service.js + packaging-operations.js` | none | unchanged | unchanged | HISTORICAL |
| 31 | AT-19 | `P3C` and `b6730c3` | expected = current delta | none | unchanged | unchanged | HISTORICAL |
| 32 | **AR-22** | `P3C_REFREEZE` (`fa7197c`) | diff vs P3-C surface, expected = empty | none | `fa7197c` | **HISTORICAL EVIDENCE** (reclassified in `887436e`); expected = `workspace-service.js` (C4.2.1 + P3-A12) | HISTORICAL |
| 33 | AW-03 | (n/a) | (n/a) | (n/a) | `1fcafc8` (P3-A12) | canonical P3-A12 current baseline direct zero-diff guard | CURRENT |

Target achieved at C4.2.2 verified final HEAD `887436e`:
- **CURRENT FROZEN GUARDS: 25** (rows 1-4, 6, 8, 10, 12, 15, 17, 19, 21-26, 33) �?all NO exclusion
- **HISTORICAL EVIDENCE GUARDS: 8** (rows 5, 14, 27-32) �?all explicit expected delta, not masquerading as zero-diff
- **Total frozen guards: 33**

**Notes on the 11 P3-B gate-split rows** (rows 2, 4, 7, 9, 11, 13, 16, 18, 20, 23, 26):
- `42249ae` removed `C4_2_1_SUBTREE` (and the analogous
  `':!workspace-service.js'`) from these tests.
- `887436e` further split the gate from
  `apps/web/src/features/packaging` + `packages/runtime-core/src/application/packaging`
  to just `apps/web/src/features/packaging`.
- The P3-A12 zero-diff check is covered by the canonical
  P3-A guard listed in the same row's "covered by" cell
  (e.g. AK-29 is covered by AK-28 at the P3-A12 baseline).

## K. Current P3-A Direct Diff

```
$ git diff --name-only 1fcafc8 HEAD -- packages/runtime-core/src/application/packaging
(empty)
```

The P3-A12 direct diff is **ZERO** with no exclusion. This
is the new authoritative current zero-diff target. The
historical P3-A11 �?P3-A12 delta (workspace-service.js
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

1. `service.checkStale(sessionId)` �?`{ stale: false, reasons: [] }` (fresh)
2. `buildExecutionDeps` �?`EXECUTION_PROVIDER_MODEL_IDENTITY_MISMATCH` thrown
3. Workspace state NOT mutated (no STALE transition, no error recorded)
4. No adapter call
5. No network call

The Workspace STALE surface is NOT touched.

## U. STALE + Provider Mismatch

A session that is both STALE and has a Provider mismatch:

1. `service.checkStale(sessionId)` �?`{ stale: true, reasons: ['intent_changed', ...] }`
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

All 25 AW tests PASS at the C4.2.2 final HEAD `887436e`.

## WA. 887436e follow-up (P3-B gate split + P3-C chain reclassification)

The `887436e` commit is a test-only follow-up that closed
two latent issues exposed by the `42249ae` rebase:

### WA-1. P3-B gate split

The `42249ae` rebase removed `C4_2_1_SUBTREE` from 14
P3-B expanded-gate tests (AK-29, AN-15, AO-28, AQ-24,
AR-21, AL-30, AM-24, AP-19, AJ-20, AI-16, AH-C1-14).
After rebase, each test compared `2ac4cf1` (P3-B
baseline) �?HEAD against an expanded gate that included
`packages/runtime-core/src/application/packaging`. After
P3-A12 absorbed the workspace-service.js change, the
P3-A part of the diff is no longer empty from P3-B to
HEAD (the only delta is `workspace-service.js`). The 14
tests failed.

The `887436e` follow-up split each P3-B test into a P3-B
UI check only (`2ac4cf1` �?HEAD against
`apps/web/src/features/packaging`; expect empty). The
P3-A12 zero-diff check is delegated to AT-15, AN-14,
AP-15, AP-18, AW-03 (which already use the P3-A12
baseline `1fcafc8` for the P3-A part).

**Final invariant: CURRENT P3-B guard = accepted P3-B
surface only.** The P3-B guard MUST NOT include the
P3-A application path; the P3-B baseline predates the
P3-A12 corrective.

### WA-2. P3-C chain reclassification

Three P3-C chain guards (AO-29, AM-25, AR-22) were
reclassified from **CURRENT FROZEN GUARD** to
**HISTORICAL EVIDENCE GUARD** with an explicit expected
delta. The 3 guards are listed under HISTORICAL EVIDENCE
in §I.

**Final invariant: P3-C historical chain guard
documents the actual historical delta. The expected
delta is `current-operation-graph.ts + workspace-service.js`
(C4.1 + C4.2.1 + P3-A12 chain). The expected delta is
NOT masqueraded as zero-diff.**

### WA-3. Production source changes

`887436e` modifies 11 test files only. Production source
changes: 0. External Provider calls: 0. Golden auto-update:
NO. The follow-up is a TEST / GUARD CLEANUP phase,
inheriting the C4.2.2 phase's invariant.

## X. Existing Guards

All existing guard families remain green at the C4.2.2
verified final HEAD `887436e`:

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
- AW (1 test, C4.2.2)
- 89 / 89 provider-targeted suites

No existing guard is broken by the C4.2.2 phase (commits
`42249ae` + `887436e` + `f309f58`).

## Y. Full Regression

Full regression runs against the **C4.2.2 verified final
HEAD `887436e1a4b49f76f8dd631f945442f0615b6257`**:

| Suite | Result | Test count |
|---|---|---|
| `npm test` | PASS | 1234 / 1234 |
| `npm run runtime:test` | PASS | 14 + 1468 / 14 + 1468 |
| `npm run runtime-application:test` | PASS | 1468 / 1468 |
| `npm run test:image-generation` | PASS | 982 / 982 |
| `npm run cli:test` | PASS | 40 / 40 |
| `npm run web:typecheck` | PASS | (typecheck-only) |
| `npm run web:build` | PASS | (vite build) |
| `npm run web-runtime:typecheck` | PASS | (typecheck-only) |
| `npm run web-runtime:test` | PASS | 10 / 10 |
| `npm run web:smoke` | PASS | 0 Provider calls (live smoke test against local node web host) |
| `npm run repo:verify` | PASS | 40 / 40 |
| `npm run repo:check` | PASS | (golden + repo:verify) |
| `npm run verify:current-flows` | PASS | (typecheck + verify:current-flows) |
| `npm run verify:version-consistency` | PASS | (version gate) |
| `npm run verify:version-naming` | PASS | (naming gate) |
| `npm run verify:workspace-boundaries` | PASS | (boundary gate) |
| `npm run verify:no-obsolete-code` | PASS | 701 files scanned |
| `npm run verify:production-boundaries` | PASS | 321 production files checked |
| `npm run verify:no-project-specific-production-rules` | PASS | (no project rules) |
| `npm run verify:golden-boundary` | PASS | (golden boundary) |
| `npm run verify:space-compiler-baseline` | PASS | (R8.6 baseline) |
| `npm run verify:space-r8.6-golden-boundary` | PASS | (R8.6 golden) |
| `npm run golden:test` | PASS | (golden regression) |

**Test count reconciliation:**

- C4.2.1 final: `runtime-application:test` 1418 / 1418
- P3-A12 (after 25 AV tests added): 1443 / 1443
- C4.2.2 (after 25 AW tests added): 1468 / 1468 (+25 AW)
- `runtime:test` = `node --test tests/packages/runtime-core/*.test.js` (14 tests) + `runtime-application:test` (1468 tests)

## Z. Production Source Changes

**0.** C4.2.2 is a TEST / FREEZE / GUARD CLEANUP phase. The
two C4.2.2 commits add one new test file and modify 12
existing test files; no production source is touched.

The C4.2.2 working tree (across the 3 C4.2.2 commits) contains:

- `tests/runtime-application/packaging-c4-2-2-p3-a12-baseline-rebase-provider-boundary-freeze.test.ts` (new, AW guards, `42249ae`)
- 12 modified test files (`42249ae`: P3A const update + C4_2_1_SUBTREE removal + B-class guard reclassification)
- 11 modified test files (`887436e`: P3-B gate split + P3-C chain reclassification)
- 1 new docs file (`f309f58` + this sync commit: this document)

## AA. Provider Calls

| Field | Value |
|---|---|
| External Provider HTTP calls | **0** |
| API key read (env / file) | **0** |
| Live Provider probe (GET /models, POST image-generation) | **0** |
| D3 real generation (Seedream 5.0 Pro) | **0** |
| Random retries | 0 |
| `.codex-smoke/` tracked files | 0 (gitignored) |

**Notes on test code model references:** the C4.2.2 test
file (`packaging-c4-2-2-p3-a12-baseline-rebase-provider-boundary-freeze.test.ts`)
and other test files contain deterministic model-identity
fixtures such as `seedream-5.0-pro` and the actual
Provider API name `doubao-seedream-5-0-pro-260628` in
comments and assertions. These are **deterministic test
fixtures**, not live Provider calls. A test fixture
referencing a model name in a `doesNotMatch` assertion
or a constant is not equivalent to a Provider HTTP
request; the canonical invariant is that no test code
ever READS an API key, opens a network socket, or
invokes the Provider adapter.

## AB. Golden

- Golden auto-update: **NO**
- Golden files changed: **NO**

The Golden boundary is intact. No Golden asset was added,
removed, or modified by the C4.2.2 phase.

## AC. Current Frozen Diff Matrix

| Surface | Current zero-diff | Notes |
|---|---|---|
| P2 (`a593278b` �?HEAD) | 0 | P2 frozen baseline unchanged |
| P3-A12 current (`1fcafc8` �?HEAD) | 0 | direct diff, NO exclusion |
| P3-A11 historical (`f95c145b` �?HEAD) | +1 (workspace-service.js) | documented as C4.2.1 sub-tree in P3-A12 history |
| P3-B (`2ac4cf1` �?HEAD) | 0 | P3-B accepted UI baseline unchanged |
| P3-C integration (`3da7a14` �?HEAD) | +2 (current-operation-graph.ts + workspace-service.js) | documented C4.1 + C4.2.1 + P3-A12 chain |
| C4.2 corrective (`4f3a0a3` �?HEAD) | +2 (workspace-service.js + packaging-operations.js) | documented C4.2.1 + P3-A12 chain |
| C4.2.1 corrective (`b6730c3` �?HEAD) | +2 (workspace-service.js + packaging-operations.js) | documented C4.2.1 + P3-A12 chain |

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

| # | Commit | Class | Production source change |
|---|---|---|---|
| 1 | `42249ae7930e25a6bf91e1c02189f3c438976577`<br>`test(packaging): rebase frozen guards onto P3-A12 baseline` | 12 modified test files + 1 new AW test file | 0 |
| 2 | `887436e1a4b49f76f8dd631f945442f0615b6257`<br>`test(packaging): split P3-B and P3-A gates; reclassify P3-C chain guards` | 11 modified test files (P3-B gate split + P3-C chain reclassification) | 0 |
| 3 | `f309f589bf06940553106f30aa42ddb95080cbdc`<br>`docs(packaging): refreeze P3-C on P3-A12 baseline` | 1 new docs file (this document) | 0 |
| 4 | **this commit (final C4.2.2 HEAD; see `git log` for exact SHA)**<br>`docs(packaging): synchronize final C4.2.2 freeze record` | Final record synchronization (corrects HEAD evidence; no semantic change) | 0 |

**Total: 4 commits. Production source changes: 0.**

**Verified final C4.2.2 technical HEAD: `887436e1a4b49f76f8dd631f945442f0615b6257`**.
This is the C4.2.2 final technical HEAD; the sync commit
(docs only) sits on top of it and does not change the
production baseline or guard semantics.

## AF. Working Tree

**EMPTY** after the C4.2.2 sync commit. AC-09
(`git status --porcelain` is empty) is enforced.

## AG. Local / Remote

`local == origin` after the C4.2.2 sync push.

- Local: `887436e1a4b49f76f8dd631f945442f0615b6257` (pre-sync; the sync commit sits on top of this)
- Origin: `887436e1a4b49f76f8dd631f945442f0615b6257` (before sync push; the sync commit will land on top)

## AH. Final Decision

- **P3-C STATUS: RE-FROZEN**
- **P3-D3 STATUS: HOLD �?RE-RUN AUTHORIZATION REQUIRED**
- **P3-D4 STATUS: LOCKED**
- **P3-E STATUS: LOCKED**

**P3-D3: NOT STARTED.** C4.2.2 does NOT authorize a D3
re-run. The D3 HOLD at `139f824` is preserved as
historical evidence; the AR-08..12, AR-15, AR-16 NOT MET
classifications are NOT auto-resolved.

## AI. Next Step

**P3-D3 RE-RUN** �?bounded real-provider visual-quality
validation.

The next phase requires a NEW explicit human
authorization:

- max 5 calls
- single model `seedream-5.0-pro` Registry id (actual API name `doubao-seedream-5-0-pro-260628`)
- single profile
- 0 random retries
- Start from the C4.2.2 verified final HEAD `887436e`
  (or the C4.2.2 sync HEAD on top of it)
- Re-classify D3 outcome as PASS or HOLD �?VISUAL QUALITY
  HARDENING REQUIRED

C4.2.2 does NOT auto-start D3.
