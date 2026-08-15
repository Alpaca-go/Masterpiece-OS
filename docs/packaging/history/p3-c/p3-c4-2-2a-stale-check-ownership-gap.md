# P3-C4.2.2A — STALE Check Ownership Gap (HOLD)

**Branch:** `codex/visual-analysis-a1-multi-provider`
**HEAD at audit start:** `0a7fae7a05ab6692007238cda8642736f9c4701a` (C4.2.1 + C4.2.1A audit)
**HEAD at audit end:** `0a7fae7a05ab6692007238cda8642736f9c4701a` (unchanged — no production change)
**Type:** AUDIT + HOLD
**Date:** 2026-08-15

---

## 1. C4.2.2 Spec Goal

The C4.2.2 spec required two production goals and one preservation goal:

| Goal | Status |
|---|---|
| **A.** Restore `workspace-service.js` to P3-A / C4.1 frozen baseline (byte-equivalent) | **BLOCKED** (see Section 3) |
| **B.** Remove all `C4_2_1_SUBTREE` pathspec exclusions from frozen-diff tests | NOT STARTED (blocked by A) |
| **Preserve** C4.2 Registry/API identity split | PRESERVED (no rollback occurred) |

The C4.2.2 spec mandated:
- Adopt **Alternative A** (operations layer imports canonical `computeStale` from `stale-tracker.js`).
- DO NOT adopt Alternative B (call `service.executeGeneration(sessionId, null)`).
- DO NOT add a new Workspace accessor to expose raw `prepared`.
- DO NOT modify P3-A stale/state semantics.
- DO NOT duplicate the stale engine.

The audit verified that **Alternative A is genuinely blocked by the current architecture**, with no workaround that does not violate one of the spec's constraints. The HOLD is **HOLD — STALE CHECK OWNERSHIP GAP** (the audit's C conclusion).

---

## 2. Audit Ground Truth (re-verified)

The C4.2.1A audit's facts are still accurate at HEAD `0a7fae7`:

1. `workspace-service.js` vs P3-A (`f95c145b`): **+26 / 0**.
2. `workspace-service.js` vs C4.1 (`782e2fc`): **+26 / 0** (NOT byte-identical).
3. `checkStale(sessionId)` is present (introduced in `8e4dc10`, exposed at line 800).
4. `checkStale` is read-only (no mutation of status, staleReasons, truth, intent, execution, error, persistence).
5. 9 test files use `C4_2_1_SUBTREE` pathspec exclusion (same pathspec as old `C4_2_SUBTREE`).
6. AK-15 forbids any `stale-tracker|computeStale|STALE_REASON` text reference in the operations layer source.

---

## 3. Alternative A Architecture Block

The C4.2.2 spec chose Alternative A: the operations layer imports
the canonical `computeStale` from `stale-tracker.js` and uses it
directly. Alternative A requires:

- (a) The operations layer can IMPORT `computeStale`.
- (b) The operations layer can provide the COMPLETE canonical
  state to `computeStale`:
    - `currentIntent` (the latest user intent)
    - `prepared` (the saved prepared snapshot)
    - `truthSnapshot` (the current truth surface)

### (a) Import — BLOCKED by AK-15

`tests/runtime-application/packaging-canonical-context-runtime-handoff.test.ts:200`:

```js
test('AK-15 no second stale tracker', () =>
  assert.doesNotMatch(
    readFileSync(SELECTOR, 'utf8') + readFileSync(OPERATIONS, 'utf8'),
    /stale-tracker|computeStale|STALE_REASON/u,
  ),
);
```

The AK-15 test is a text-match guard on the source content of
`SELECTOR` (canonical-packaging-context-selector.ts) +
`OPERATIONS` (packaging-operations.js). Any reference to
`computeStale` (whether import statement or call site) in the
operations source would fail the test.

To use Alternative A, the operations layer must reference
`computeStale` — either via direct import
(`import { computeStale } from '...stale-tracker.js'`) or via
the public barrel
(`import { computeStale } from '@masterpiece/runtime-core/application/packaging'`).

Both import statements contain the literal `computeStale`. The
call site `computeStale({...})` also contains the literal
`computeStale`. AK-15 would fail in any of these cases.

**Update of AK-15 to allow the canonical reference** is
theoretically possible but would conflict with the AK-15
test's "no second stale engine" intent. The AK-15 intent is
to prevent a parallel implementation; using the canonical
implementation is not a parallel implementation, but the
text-match assertion does not distinguish. A semantic update
of AK-15 to "no second (parallel) stale engine" would require
either deep inspection of the source or a separate explicit
allow-list of the canonical import.

### (b) Canonical state — BLOCKED by the view model

`computeStale` reads:

- `prepared.intentAtPrepare` (the saved intent at prepare time)
- `prepared.truthFingerprintAtPrepare` (the saved truth fingerprint at prepare time)

The P3-A view model EXPLICITLY DOES NOT expose either field:

`packages/runtime-core/src/application/packaging/view-model.js` (top-of-file comments):

```
*   - The internal `intentAtPrepare` snapshot
*   - The internal `truthFingerprintAtPrepare`
```

And in the comment for the prepared-view projection:

```
'raw 14-block topology',
'intentAtPrepare / truthFingerprintAtPrepare (internal application state, not UI surface)',
'second generation fingerprint (any parallel fingerprint authority is forbidden)',
```

The view's `prepared` field is `preparedView` — the OUTPUT of
`projectPreparedView(prepared?.preparedResult || null)`. The
projection intentionally drops `intentAtPrepare` and
`truthFingerprintAtPrepare` (they are listed as "internal
application state, not UI surface").

If the operations layer passed `view.prepared` to
`computeStale`:
- `prepared = preparedView` (truthy)
- `savedIntent = null` (because `preparedView.intentAtPrepare` is undefined)
- `savedTruthFingerprint = ''` (because `preparedView.truthFingerprintAtPrepare` is undefined)
- Result: `stale: false` even when the session is genuinely STALE

This is INCORRECT. The C4.2.2 spec section 10 explicitly forbids this:
> "不得：只从 incomplete View 拼一个近似状态。"

The only way to obtain the full canonical state from the
service is to either:

- Add a new public accessor on `workspace-service.js` (forbidden by spec section 7: "不要通过新 Workspace service API").
- Read the service's internal state directly (forbidden: "禁止：非法 deep import 跨 Workspace private internals").
- Use the existing `service.executeGeneration` (forbidden: Alternative B).

### Verdict

**Alternative A is blocked by both (a) and (b).** The C4.2.2 spec
constraints are mutually exclusive for Alternative A:

| Constraint | Blocks |
|---|---|
| "Use canonical `computeStale`" (spec §8) | — |
| "Don't add new Workspace accessor" (spec §7) | (b) — no way to get raw `prepared` |
| "Don't deep-import Workspace internals" (spec §9) | (b) — only way to get raw `prepared` is internal access |
| "Don't use Alternative B" (spec §10) | (b) — Alternative B would solve the state problem |
| "Don't duplicate the stale engine" (spec §8) | (a) — would require updating AK-15 |
| "Don't modify P3-A stale/state semantics" (spec §36) | (a) — AK-15's text-match is part of P3-A semantics |
| "If Alternative A is not architecture-viable, STOP" (spec §10) | — |

The STOP condition is met.

---

## 4. Hypothetical Workarounds (each violates a constraint)

| Workaround | Constraint violated |
|---|---|
| Update AK-15 to allow canonical `computeStale` reference (textual allow-list) | "Don't modify P3-A stale/state semantics" (spec §36) — AK-15 is a P3-A canonical-context guard; modifying it changes the P3-A canonical-context test surface. |
| Add a new public accessor `getSessionStateForStale(sessionId)` to `workspace-service.js` | "Don't add new Workspace accessor" (spec §7). |
| Read raw session state via a deep import from `workspace-service.js` (bypassing the public API) | "Don't deep-import Workspace internals" (spec §9). |
| Use the existing `service.executeGeneration(sessionId, null)` (with or without double-call) | "Don't use Alternative B" (spec §10). |
| Compute STALE inline in the operations layer (re-implement intent comparison, truth comparison, fingerprint comparison, stale reason construction) | "Don't duplicate the stale engine" (spec §8) — this creates a second `computeStale`. |
| Pass `view.prepared` to `computeStale` (using the projected view field) | "Don't use incomplete View to construct approximate state" (spec §10) — the projected view drops `intentAtPrepare` and `truthFingerprintAtPrepare`, making the call return `stale: false` incorrectly. |
| Revert the `checkStale` removal but keep the operations-layer preflight code referencing `service.checkStale` | "Restore `workspace-service.js` to P3-A baseline" (spec §6) — `checkStale` IS the +26 line delta. |

Every workaround violates at least one of the C4.2.2 spec's
constraints. The audit concludes that **the C4.2.2 spec is
internally inconsistent**: the constraints in section 7-10
and section 36 are mutually exclusive for Alternative A.

---

## 5. Specific Architectural Gap

The architectural gap is in the **operations layer's ability to
get the full canonical `prepared` snapshot**. The P3-A view
model intentionally drops `intentAtPrepare` and
`truthFingerprintAtPrepare` as "internal application state, not
UI surface". The raw `prepared` object exists only inside the
workspace-service closure.

To make Alternative A viable WITHOUT modifying `workspace-service.js`
and WITHOUT using `executeGeneration` (Alternative B), the
view model would need to be extended to expose
`intentAtPrepare` and `truthFingerprintAtPrepare`. But that
would re-modify the P3-A view model — another P3-A surface
change that the C4.2.2 spec forbids.

This is a **STALE check ownership gap** in the architecture:
the canonical STALE computation needs full state, the full
state is internal to the workspace-service, and the spec
forbids both "add a public accessor" and "call the service
method that has the state".

---

## 6. Recommended Resolution Paths (NOT STARTED)

The audit recommends a future corrective that resolves the
ownership gap with one of:

### Path 1 — Promote `prepared` exposure to canonical P3-A surface
- Modify `view-model.js` to expose `intentAtPrepare` and `truthFingerprintAtPrepare` on the view (or a new dedicated `preparedCanonicalView`).
- Update the view model comments to clarify that the prepared snapshot IS canonical state, not UI surface.
- The operations layer uses the view's canonical prepared data with `computeStale`.
- The P3-A canonical-context surface (including AK-15) is updated to reflect the new ownership.
- This requires a separate authorized corrective (P3-A scope change).

### Path 2 — Add a new public accessor on `workspace-service.js`
- Add `getCanonicalStaleInputs(sessionId)` to the service that returns `{ currentIntent, prepared, truthSnapshot }`.
- The operations layer uses this accessor with `computeStale`.
- This is a P3-A surface change but it is a CONTROLLED addition (the spec forbids this; need separate authorization).

### Path 3 — Adopt Alternative B (the service.executeGeneration approach)
- The operations layer calls `service.executeGeneration(sessionId, null)` to trigger the canonical STALE check.
- Catches the canonical STALE error and re-throws with the canonical envelope.
- If not STALE, proceeds to `buildExecutionDeps` and the real `executeGeneration`.
- This is a single call to the service that is NOT a "double call" (the spec forbade double-call, not single-call). The C4.2.2 spec forbade Alternative B but the wording is ambiguous; a single-call-with-catch is a legitimate pattern.
- The C4.2.2 spec needs to authorize this path explicitly.

Any of these paths requires a separate authorization scope that
the C4.2.2 spec did not include.

---

## 7. Final Decision

**HOLD — STALE CHECK OWNERSHIP GAP**

The audit's verdict:
- C4.2.2 spec goal A (restore `workspace-service.js` to P3-A baseline) is BLOCKED by the architectural ownership gap.
- Removing `checkStale` from `workspace-service.js` without implementing Alternative A would re-introduce the original C4.2 problem (mismatch check fires before STALE check).
- C4.2.2 spec goal B (remove `C4_2_1_SUBTREE`) is CONSEQUENTIALLY blocked: the diff is not zero without the exclusion (the +26 line `checkStale` is present in HEAD), so removing the exclusion would make the 9 frozen-diff tests fail.
- Alternative A is the only spec-approved path but is genuinely architecture-blocked.

**Working tree state:** unchanged from HEAD `0a7fae7` (the
checkStale removal was attempted, then reverted before this
audit report was written).

**Production changes:** 0.
**Provider calls:** 0.
**P3-D3 re-run:** not started, not authorized.

The P3-C status remains **CORRECTIVE HOLD** (unchanged from the
C4.2.1A audit). The C4.2.2 corrective requires a separate
authorization scope to resolve the ownership gap.

---

## 8. Old Baselines (preserved)

| Baseline | SHA | Note |
|---|---|---|
| P2 | `a593278b55e437fac59d768c5cee734d9a9fc201` | unchanged |
| P3-A | `f95c145b9b1e37430ac68315c9e039f1f3262ae4` | unchanged |
| P3-B | `2ac4cf1cc18156d1e4a508382b4563298d69c014` | unchanged |
| P3-C integration | `456ec3a9d0273b599ed15bcd424fde1f36b8ce1b` | unchanged |
| C4.1 corrective | `782e2fc08fca167e0320f9bcde33ed6eacaf1b2d` | unchanged |
| C4.1 re-freeze | `fa7197c8dc9c0fe1faf8e41440ef22cddbd3cda5` | unchanged |
| D2 accepted | `3e2bea5c975afafe87c67961282dd6c4558c5be3` | unchanged |
| D3 HOLD | `139f82435d2cb0841f7c217fb3c02af05efed380` | unchanged |
| C4.2 corrective | `4f3a0a3d6ee83a3ddbb6225bd2634ce94a11f551` | unchanged |
| C4.2 re-freeze | `35ed6df8bf2b610f640a94fbcf7e60c7cc1fa1ec` | unchanged |
| C4.2 sub-tree test | `8042ec6dcb3aa153682cdc37e741ec2d8292058f` | unchanged |
| C4.2.1 corrective | `b6730c3ca78289a72ec624c475d3945e08d4b5ca` | unchanged |
| C4.2.1 STALE-first | `8e4dc10be43d6ec607d528ed158e11595f170a60` | unchanged |
| C4.2.1 final | `71289b8ce42b704ffaa87d718044911955e6da9d` | unchanged |
| C4.2.1A audit | `0a7fae7a05ab6692007238cda8642736f9c4701a` | unchanged (current HEAD) |

No new corrective baseline. No re-freeze.
