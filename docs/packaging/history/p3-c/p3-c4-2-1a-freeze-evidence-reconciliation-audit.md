# P3-C4.2.1A — Frozen Surface Evidence Reconciliation Audit

**Branch:** `codex/visual-analysis-a1-multi-provider`
**HEAD:** `71289b8ce42b704ffaa87d718044911955e6da9d`
**Type:** AUDIT ONLY
**Date:** 2026-08-15

---

## 1. Conflicting Claims Identified

The C4.2.1 corrective closed with two statements that the HEAD
evidence does NOT fully support.

| Claim (C4.2.1 docs / Final Report) | HEAD reality |
|---|---|
| "workspace-service.js at HEAD is byte-equivalent to the C4.1 baseline (no diff vs `782e2fc`)" | **FALSE.** `git diff --stat 782e2fc HEAD -- packages/runtime-core/src/application/packaging/workspace-service.js` shows `+26` insertions, `0` deletions. The new `checkStale(sessionId)` method (introduced in commit `8e4dc10`) is present. |
| "frozen-diff guards with no `C4_2_SUBTREE` exclusion" | **PARTIALLY FALSE.** The `C4_2_SUBTREE` constant is removed from the 9 frozen-diff test files (replaced by `C4_2_1_SUBTREE`), but the new `C4_2_1_SUBTREE` pathspec exclusion is the same pathspec (`':(exclude)packages/runtime-core/src/application/packaging/workspace-service.js'`). The exclusion is renamed, not removed. |
| "P3-A (excluding C4.2.1 sub-tree): 0" | TRUE. With the `C4_2_1_SUBTREE` exclusion, the P3-A diff is zero. Without it, the diff is `+26` (the `checkStale` helper). |

The audit verdict is **`HOLD — P3-A FROZEN FILE DELTA REQUIRES CLEANUP`** AND **`HOLD — FROZEN GUARD EXCLUSION REQUIRES CLEANUP`** (both apply; B + C of the audit's three allowed conclusions).

---

## 2. Exact Git Facts (workspace-service.js)

`git diff --stat <baseline> HEAD -- packages/runtime-core/src/application/packaging/workspace-service.js`

| Baseline | SHA | Ins / Del | Result |
|---|---|---|---|
| P3-A frozen | `f95c145b9b1e37430ac68315c9e039f1f3262ae4` | +26 / 0 | **NOT byte-identical** |
| C4.1 corrective | `782e2fc08fca167e0320f9bcde33ed6eacaf1b2d` | +26 / 0 | **NOT byte-identical** |
| C4.2 corrective | `4f3a0a3d6ee83a3ddbb6225bd2634ce94a11f551` | +26 / -19 | C4.2 mismatch block REVERTED; C4.2.1 checkStale helper ADDED |
| C4.2.1 corrective | `b6730c3ca78289a72ec624c475d3945e08d4b5ca` | +26 / 0 | C4.2.1 STALE-first commit `8e4dc10` added the helper |
| HEAD | `71289b8ce42b704ffaa87d718044911955e6da9d` | (current) | `checkStale` is present |

The 26-line addition is the `checkStale` function (the function
body, the leading comment block, the `Object.freeze` return
shape) plus the `checkStale,` entry in the public-API
`return Object.freeze({...})` block.

---

## 3. `checkStale` Helper Audit

### Existence
- **YES.** Defined at `packages/runtime-core/src/application/packaging/workspace-service.js:769`.
- Introduced in commit `8e4dc10 fix(packaging): surface canonical STALE before execution preflight mismatch` (not the C4.2.1 production commit `b6730c3`; added in the STALE-first ordering commit).
- Public on the service API: `return Object.freeze({ ..., checkStale, ... })` (line 800).

### Body
```js
function checkStale(sessionId) {
  const state = getSessionOrThrow(sessionId);
  const fresh = computeStale({
    currentIntent: state.intent,
    prepared: state.prepared,
    truthSnapshot: state.truthSnapshot,
  });
  return Object.freeze({
    stale: fresh.stale === true,
    reasons: Object.freeze(Array.isArray(fresh.reasons) ? Array.from(fresh.reasons) : []),
  });
}
```

### Caller
- `packages/runtime-core/src/operations/packaging-operations.js:2055` — the `execute-generation` operation calls `service.checkStale(sessionId)` BEFORE `buildExecutionDeps`.
- No other call site.

### Side-effect analysis
| Aspect | Mutated? |
|---|---|
| `status` | No (pure read) |
| `staleReasons` / `lastStaleReasons` | No (pure read) |
| `truth` / `truthSnapshot` | No (pure read) |
| `intent` | No (pure read) |
| `execution` | No (pure read) |
| `error` / `lastError` | No (pure read) |
| Persistence (artifact store) | No (pure read) |
| Global module state | No (pure read) |

`computeStale` itself is also pure (verified by reading its body
in `stale-tracker.js`).

### Classification
- **Orchestration helper**, not a P3-A STALE semantic change.
- Read-only `computeStale` wrapper exposed to the operations layer.
- No new STALE reason, no new status, no new transition.

### Is the helper required?

**Audit conclusion: NO.** The same STALE-first ordering can be
implemented WITHOUT modifying the P3-A `workspace-service.js`
file.

Two alternatives exist that do NOT require any change to
`workspace-service.js`:

#### Alternative A — operations layer imports `computeStale` directly
- `computeStale` is exported from `packages/runtime-core/src/application/packaging/stale-tracker.js`.
- The operations layer (which is in the C4.2.1 corrective surface anyway) can add `import { computeStale } from '@masterpiece/runtime-core/application/packaging/stale-tracker.js'`.
- The `execute-generation` operation calls `computeStale(...)` directly with `service.getView(sessionId)` data, then throws the canonical STALE error before `buildExecutionDeps`.
- Net production delta: `packaging-operations.js` only. `workspace-service.js` UNCHANGED vs C4.1. P3-A diff = 0 without any exclusion.

#### Alternative B — call `service.executeGeneration(sessionId, null)` first
- The service's `executeGeneration` already does a fresh `computeStale` and throws `PACKAGING_WORKSPACE_EXECUTE_REJECTED` with `['stale', ...reasons]` if STALE.
- The operations layer can call `service.executeGeneration(sessionId, null)` to trigger the STALE check (which short-circuits before calling `executeFn`); catch the STALE error and re-throw with the canonical envelope; then proceed to `buildExecutionDeps` + the real `executeGeneration`.
- This is more complex but keeps the P3-A surface untouched.

Either alternative would have made the `checkStale` helper
unnecessary, and would have left `workspace-service.js`
byte-equivalent to the C4.1 baseline.

The C4.2.1 implementation chose to add `checkStale` instead. This
is functionally correct (it does what the spec needs) but it is
NOT a necessary change to the P3-A surface. The audit verdict is
that the modification is removable.

---

## 4. Frozen Guard Exclusion Search

### `C4_2_SUBTREE` (the OLD exclusion)
- **Live references in test files: 0.**
- Doc references: 14, all in `docs/packaging/history/p3-c/p3-c4-2-1-provider-identity-boundary-cleanup.md` (describing the historical removal).
- C4.2.1 docs claim "Removes the `C4_2_SUBTREE` constant and all its pathspec references" — **TRUE** (live test references are gone).

### `C4_2_1_SUBTREE` (the NEW exclusion)
- **9 test files** carry the constant + pathspec exclusion:
  1. `tests/runtime-application/packaging-canonical-context-runtime-handoff.test.ts` (3 uses: AK-28, AK-29, +1)
  2. `tests/runtime-application/packaging-cross-project-technical-hardening.test.ts` (4 uses: AO-27, AO-28, AO-29, +1)
  3. `tests/runtime-application/packaging-d2-post-corrective-revalidation.test.ts` (3 uses: AQ-23, AQ-24, +1)
  4. `tests/runtime-application/packaging-d3-real-provider-visual-quality-validation.test.ts` (4 uses: AR-20, AR-21, AR-22, +1)
  5. `tests/runtime-application/packaging-dual-mode-production-acceptance.test.ts` (3 uses: AL-29, AL-30, +1)
  6. `tests/runtime-application/packaging-final-product-acceptance.test.ts` (4 uses: AM-23, AM-24, AM-25, +1)
  7. `tests/runtime-application/packaging-reference-first-authority-foundation.test.ts` (5 uses: AJ-19, AJ-20, +3 grep/extra)
  8. `tests/runtime-application/packaging-reference-first-handoff-audit.test.ts` (3 uses: AI-15, AI-16, +1)
  9. `tests/runtime-application/packaging-upstream-handoff-contract.test.ts` (3 uses: AH-C1-13, AH-C1-14, +1)
- The pathspec is the same as the OLD C4.2 exclusion: `':(exclude)packages/runtime-core/src/application/packaging/workspace-service.js'`.
- The exclusion is **renamed, not removed**.

### `:(exclude)packages/runtime-core/src/application/packaging/workspace-service.js` pathspec
- 11 references total: 9 in test files (above) + 2 in `p3-c4-2-1-provider-identity-boundary-cleanup.md` (doc body).

### C4.2.1 docs claim
> "frozen guards with no `C4_2_SUBTREE` exclusion. The C4.2 sub-tree no longer exists at HEAD; the boundary cleanup is auditable."

**Misleading.** The `C4_2_SUBTREE` constant is removed but a
new `C4_2_1_SUBTREE` pathspec exclusion exists in 9 test files.
The pathspec is functionally identical (same target file). The
exclusion is RENAMED, not REMOVED.

---

## 5. Guard Classification

Each frozen-diff guard in HEAD classified into one of three
categories:

### A — Direct zero-diff guard (no exclusion, no expected-list)
**Count: 0 in P3-A / P3-B / P3-C frozen-diff context.**

The P3-A direct diff check (e.g. `git diff f95c145b HEAD --
packages/runtime-core/src/application/packaging`) is NOT used
in the test suite; it would fail (+26 lines) and is not
enforced.

### B — Explicit expected-delta guard
- `tests/runtime-application/packaging-c4-2-provider-model-identity-separation.test.ts:AS-20` — expected list `['workspace-service.js', 'packaging-operations.js']`.
- `tests/runtime-application/packaging-cross-project-hardening-contract.test.ts:AN-16` — expected list `['current-operation-graph.ts', 'workspace-service.js']`.
- `tests/runtime-application/packaging-cross-project-hardening-contract.test.ts:AN-16b` — expected list `['workspace-service.js', 'packaging-operations.js']`.
- `tests/runtime-application/packaging-c4-2-1-provider-identity-boundary-cleanup.test.ts:AT-15` — expected list `['workspace-service.js']`.
- `tests/runtime-application/packaging-c4-2-1-provider-identity-boundary-cleanup.test.ts:AT-19` — expected list `['current-operation-graph.ts', 'workspace-service.js']` and `['workspace-service.js', 'packaging-operations.js']`.

**Count: 5 guards (B class).** These use explicit expected-delta
lists and DO NOT use pathspec exclusions.

### C — Pathspec exclusion guard
- AH-C1-13, AH-C1-14 (`packaging-upstream-handoff-contract.test.ts`)
- AI-15, AI-16 (`packaging-reference-first-handoff-audit.test.ts`)
- AM-23, AM-24, AM-25 (`packaging-final-product-acceptance.test.ts`)
- AK-28, AK-29 (`packaging-canonical-context-runtime-handoff.test.ts`)
- AL-29, AL-30 (`packaging-dual-mode-production-acceptance.test.ts`)
- AJ-19, AJ-20, AJ-14, AJ-15 (`packaging-reference-first-authority-foundation.test.ts`)
- AO-27, AO-28, AO-29 (`packaging-cross-project-technical-hardening.test.ts`)
- AQ-23, AQ-24 (`packaging-d2-post-corrective-revalidation.test.ts`)
- AR-20, AR-21, AR-22 (`packaging-d3-real-provider-visual-quality-validation.test.ts`)

**Count: 19+ guards (C class).** These use the `C4_2_1_SUBTREE`
pathspec exclusion to hide the `workspace-service.js` change
from the diff. The P3-A / P3-B / P3-C diffs are zero only WITH
the exclusion.

### Classification summary
| Class | Count | What it asserts |
|---|---|---|
| A (direct zero-diff) | 0 | (no P3-A direct diff is enforced) |
| B (explicit expected-delta) | 5 | The documented C4.2.1 sub-tree is the only delta |
| C (pathspec exclusion) | 19+ | The P3-A / P3-B / P3-C diff is zero AFTER excluding workspace-service.js |

The audit's classification reveals that **C-class guards are
still the dominant pattern**. The C4.2.1 docs' claim that the
frozen guards were "restored to direct git diff without
exclusions" is FALSE.

---

## 6. P3-A Original Frozen Surface Definition

The P3-A frozen surface (per the P3-A frozen baseline `f95c145b`)
includes `packages/runtime-core/src/application/packaging/workspace-service.js`.

This is verified by the fact that every P3-A "frozen diff"
guard in the test suite (C-class guards above) uses this
directory as the diff target. The C4.2 implementation chose to
modify this file (the C4.2 mismatch block). The C4.2.1
implementation reverts the C4.2 block but introduces a new
method (`checkStale`).

The audit conclusion: the P3-A frozen file is still part of the
P3-A surface. `workspace-service.js` remains a P3-A file in HEAD
terms.

---

## 7. P3-C Corrective Surface Definition

The P3-C frozen integration baseline `456ec3a` defines the
original P3-C surface. The C4.1 corrective (`782e2fc`) and the
subsequent P3-C correctives have expanded the surface:

| Phase | Documented C4.2.1 surface |
|---|---|
| C4.1 corrective (`782e2fc`) | `apps/web-runtime/src/current-operation-graph.ts` (composition-root seam) |
| C4.2 corrective (`4f3a0a3`) | `packages/runtime-core/src/operations/packaging-operations.js` (identity split) |
| C4.2.1 corrective (`b6730c3`) | (revert C4.2 mismatch block from `workspace-service.js`; no new file) |
| C4.2.1 STALE-first (`8e4dc10`) | `packages/runtime-core/src/operations/packaging-operations.js` + `packages/runtime-core/src/application/packaging/workspace-service.js` (the `checkStale` helper) |

The C4.2.1 docs formally add `workspace-service.js` to the
P3-C corrective surface (in section 7, "Allowed Production
Delta") via the read-only `checkStale` helper.

**Audit concern:** the addition of `workspace-service.js` to
the P3-C corrective surface is a POST-FACTO re-interpretation.
The C4.1 frozen baseline did NOT classify this file as a P3-C
file; it was a P3-A file. The C4.2 implementation chose to
modify it (which is what triggered the C4.2.1 corrective in the
first place — the C4.2 modification violated the P3-A STALE
surface).

The C4.2.1 cleanup's "fix" is to add a new read-only method to
the same file, then declare that method part of the P3-C
corrective surface. This is structurally consistent with the
C4.1 pattern (which added the identity-projection helper to
`current-operation-graph.ts`), but it is a NEW addition to the
P3-C surface that did not exist in C4.1.

---

## 8. Is `checkStale` Required?

**Audit conclusion: NO.** The same STALE-first ordering can be
implemented WITHOUT modifying the P3-A `workspace-service.js`
file. Two alternatives exist:

| Alternative | P3-A surface change | P3-C surface change |
|---|---|---|
| **A.** Operations layer imports `computeStale` from `stale-tracker.js` | None | +1 import + 1 function in `packaging-operations.js` |
| **B.** Operations layer calls `service.executeGeneration(sessionId, null)` to trigger STALE check, then proceeds | None | +1 try/catch in operations layer |
| **C4.2.1 actual** | +1 method (`checkStale`) on `workspace-service.js` | +1 ops-layer check +1 service method |

Alternatives A and B keep `workspace-service.js` byte-equivalent
to C4.1. The C4.2.1 implementation chose C, which adds an
unnecessary modification to the P3-A surface.

---

## 9. Hidden Frozen Delta?

**YES.** The `checkStale` helper is a real change to the
P3-A `workspace-service.js` file (+26 lines vs C4.1). This
change is hidden from the C-class frozen-diff guards by the
`C4_2_1_SUBTREE` pathspec exclusion (9 test files).

The B-class guards (AS-20, AN-16, AN-16b, AT-15, AT-19) DO
acknowledge the delta by listing the expected file in their
expected-delta assertion. So the delta is partially acknowledged
and partially hidden.

---

## 10. Hidden Guard Exclusion?

**YES.** The C4_2_1_SUBTREE pathspec exclusion hides the
`workspace-service.js` change in 19+ frozen-diff guards (9 test
files). The exclusion is the same pathspec that the C4.2
implementation used (`C4_2_SUBTREE`), just renamed. The
exclusion count is the same (9 test files, similar number of
uses per file).

The C4.2.1 docs' claim that the "frozen guards are restored to
direct git diff without exclusions" is FALSE.

---

## 11. D3 Readiness

C4.2.1 production path is identical to C4.2's: it makes no real
Provider calls. P3-D3 re-run is still NOT authorized. The
D3 HOLD outcome (AR-08..12, AR-15, AR-16 NOT MET) is preserved
as a historical record.

The C4.2.1A audit does NOT change the D3 readiness state. The
production path remains the same as C4.2 (with the STALE-first
ordering at the operations layer). The `checkStale` helper is
additive — it does not change the production path that D3 would
exercise.

D3 re-run is D3 RE-RUN READY (the production path is ready), but
still requires new explicit human authorization.

---

## 12. Final Decision

**HOLD — P3-A FROZEN FILE DELTA REQUIRES CLEANUP** AND
**HOLD — FROZEN GUARD EXCLUSION REQUIRES CLEANUP** (both apply).

The audit confirms two contradictions between the C4.2.1
freeze statement and the HEAD evidence:

1. `workspace-service.js` is NOT byte-equivalent to the C4.1
   baseline. It has a +26 line addition (the read-only
   `checkStale` helper). This addition is not strictly
   required — the same STALE-first ordering can be implemented
   in the operations layer (which is the C4.2.1 corrective
   surface) by importing `computeStale` directly from
   `stale-tracker.js`.

2. The C4_2_1_SUBTREE pathspec exclusion is the same
   exclusion that the C4.2 implementation used
   (`C4_2_SUBTREE`), just renamed. The exclusion is in 9 test
   files with the same pathspec. The frozen-diff guards are
   NOT "restored to direct git diff without exclusions" — the
   exclusion persists with a new name.

The audit recommends a follow-up C4.2.2 corrective that:
1. Reverts the `checkStale` method from `workspace-service.js`.
2. Moves the STALE-first ordering logic to the operations
   layer using `computeStale` imported from
   `stale-tracker.js` (Alternative A).
3. Removes the `C4_2_1_SUBTREE` pathspec exclusion from all 9
   frozen-diff test files.
4. Restores direct `git diff` checks against the P3-A
   baseline with zero exclusions.

After the C4.2.2 corrective, `workspace-service.js` will be
byte-equivalent to the C4.1 baseline, the P3-A frozen diff
will be truly zero without any exclusion, and the C4.2.1
docs' claims will be accurate.

---

## 13. Working Tree State

`git status --porcelain` at audit time: empty. No production
code was modified. No tests were modified. No Provider calls
were made. The audit is read-only.

---

## 14. Provider Calls

External Provider calls during this audit: **0**.
No API key was read. P3-D3 was NOT started.

---

## 15. Regression at Audit Time

- AT-01..22: 22/22 PASS
- AS-01..25: 25/25 PASS
- AQ-01..25: 25/25 PASS
- AR-01..24: 23 PASS + 6 NOT MET HOLD preserved
- repo:verify: 40/40 PASS
- verify:production-boundaries: PASS
- verify:no-project-specific-production-rules: PASS
