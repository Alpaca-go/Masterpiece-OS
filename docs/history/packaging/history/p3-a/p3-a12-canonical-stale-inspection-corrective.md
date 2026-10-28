# P3-A12 — Canonical STALE Inspection Contract

**Branch:** `codex/visual-analysis-a1-multi-provider`
**Type:** NARROW CORRECTIVE REOPEN of P3-A
**Status:** RE-FROZEN
**Date:** 2026-08-15

---

## 1. C4.2.2A HOLD Consumed

The C4.2.2A audit concluded with **HOLD — STALE CHECK OWNERSHIP GAP**:

- Alternative A (operations layer imports canonical `computeStale`) is blocked by:
  - (a) AK-15 forbidding any `stale-tracker|computeStale|STALE_REASON` text reference in the operations layer.
  - (b) The P3-A view model explicitly dropping `intentAtPrepare` and `truthFingerprintAtPrepare` from the `prepared` projection.
- Alternative B (`service.executeGeneration(sessionId, null)`) is forbidden by the C4.2.2 spec.
- New accessor is forbidden by the C4.2.2 spec.
- Deep import is forbidden by the C4.2.2 spec.

P3-A12 formally accepts the existing `checkStale(sessionId)`
seam on `workspace-service.js` as the **Canonical Read-Only
STALE Inspection API** — the single legal bridge between the
operations layer and the canonical STALE authority.

---

## 2. Why P3-A12 is a legitimate corrective reopen

P3-A12 is the FIRST corrective reopen of the P3-A frozen
surface in this branch's history. The historical P3-A baseline
(`f95c145b`) is now formally labeled **P3-A11 Historical Frozen
Baseline**. The P3-A12 corrective establishes a new current
P3-A production-tree baseline that includes the read-only
inspection seam.

The C4.2 / C4.2.1 phases introduced a `checkStale` helper as a
side-effect of the corrective flow. P3-A12 formally accepts
this seam as a P3-A-owned API rather than a C4-corrective
artifact. The seam was always read-only; P3-A12 simply
documents and locks in the read-only contract.

This is a NORMAL corrective reopen: the prior baseline is
preserved as historical evidence, the new baseline is the
post-P3-A12 production tree, and the frozen-diff guards are
migrated to use the new baseline (the spec for the
post-P3-A12 C4.2.2 corrective).

---

## 3. P3-A12 Architecture Decision

The canonical STALE authority remains **P3-A Workspace
Application**. The canonical STALE computation is
`computeStale` in `stale-tracker.js`. The full canonical state
(`currentIntent`, `prepared.intentAtPrepare`,
`prepared.truthFingerprintAtPrepare`, `truthSnapshot`) remains
**Workspace internal application state**.

The `checkStale(sessionId)` seam is the **Canonical Read-Only
STALE Inspection API**:
- Reads Workspace canonical internal state.
- Calls existing `computeStale`.
- Returns `{ stale: boolean, reasons: readonly string[] }`.
- Does NOT modify Workspace state (status, staleReasons,
  intent, truthSnapshot, prepared, execution, error,
  persistence).
- Does NOT add new STALE reasons.
- Does NOT create a second stale engine.

The operations layer is FORBIDDEN from importing
`computeStale` / `stale-tracker` / `STALE_REASON` directly
(AK-15 contract preserved). The seam is the only legal access
path.

---

## 4. Why Alternative A is rejected

Alternative A (operations layer imports canonical `computeStale`)
was rejected because:
- The operations layer would need to provide the full canonical
  state including the raw `prepared` object.
- The P3-A view model explicitly drops `intentAtPrepare` and
  `truthFingerprintAtPrepare` from the prepared projection.
- To provide them, the operations layer would need either a
  new accessor (forbidden) or a deep import (forbidden).
- Using the view's prepared (a projection) would result in
  `computeStale` returning `stale: false` incorrectly (the
  user explicitly forbade "approximate state" from the view).

The P3-A12 architecture decision is: **don't leak canonical
state out of Workspace**. The seam exposes a behavior query
(`stale?` + `reasons?`), not raw canonical inputs. This is a
better API than Alternative A would have produced even if
Alternative A were implementable.

---

## 5. Why Alternative B is rejected

Alternative B (`service.executeGeneration(sessionId, null)`)
was rejected because:
- `executeGeneration` is a state-mutating execution entry
  point, not a read-only inspection.
- Calling it with `null` deps as a STALE probe is a misuse of
  the execution API.
- The double-call pattern (call once with null to probe, call
  again with real deps) is a hack.
- The C4.2.2 spec explicitly forbade this.

The P3-A12 seam is a dedicated read-only inspection API; the
separation of concerns is cleaner than Alternative B.

---

## 6. Why raw state exposure is rejected

The C4.2.2A audit verified that the P3-A view model
intentionally hides `intentAtPrepare` and
`truthFingerprintAtPrepare` as "internal application state, not
UI surface". Exposing these fields would:
- Violate the P3-A view-model privacy contract.
- Create a parallel fingerprint authority (forbidden by the
  P3-A architecture).
- Increase the operations layer's coupling to the P3-A
  fingerprint topology.

The P3-A12 seam exposes only the boolean + reason names; the
operations layer never sees the internal fingerprint topology.

---

## 7. checkStale Contract

The seam (in `workspace-service.js`) is:

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

### Contract

- **READ-ONLY**: no mutation of status / staleReasons /
  intent / truthSnapshot / prepared / execution / error /
  persistence. Verified by AV-04..AV-07.
- **OUTPUT**: `{ stale: boolean, reasons: readonly string[] }`.
  No raw canonical inputs leak. Verified by AV-03, AV-06.
- **CANONICAL**: uses the existing `computeStale` (single
  source of truth in `stale-tracker.js`). No re-implementation.
  Verified by AV-02.
- **NO NEW STALE_REASON**: only existing canonical STALE
  reasons (`intent_changed`, `truth_surface_changed`) are
  surfaced. `identity_mismatch` and other execution/config
  reasons are NOT in the STALE set. Verified by AV-12, AV-13.
- **FRESH**: the seam re-runs `computeStale` against the
  current state (not the saved snapshot). Verified by AV-10.
- **OPERATIONS BOUNDARY**: the operations layer is forbidden
  from importing `computeStale` directly. The seam is the
  only legal access path. Verified by AV-15, AV-16, AV-17.

---

## 8. Read-Only Proof

The seam is read-only. The function body is exactly:

```js
const state = getSessionOrThrow(sessionId);  // READ
const fresh = computeStale({                // READ (delegated)
  currentIntent: state.intent,
  prepared: state.prepared,
  truthSnapshot: state.truthSnapshot,
});
return Object.freeze({                       // RETURN (immutable)
  stale: fresh.stale === true,
  reasons: Object.freeze(Array.isArray(fresh.reasons) ? Array.from(fresh.reasons) : []),
});
```

There is NO assignment to:
- `state.status` or any status field
- `state.staleReasons` / `state.lastStaleReasons` /
  `state.lastStaleReason`
- `state.intent` / `state.truthSnapshot` / `state.prepared`
- `state.execution` / `state.lastError`
- any persistence layer

There is NO call to:
- `transitionSession`, `withError`, `freezeAndStore`
- any `saveRun`, `writeFileSync`, or `fs.*`

The AV-04..AV-07 contract tests assert this directly.

---

## 9. No New STALE Semantics

The seam does NOT add new STALE reasons. The canonical
`STALE_REASON` registry in `stale-tracker.js` is unchanged
from the P3-A11 historical baseline:

```js
export const STALE_REASON = Object.freeze({
  INTENT_CHANGED: 'intent_changed',
  TRUTH_SURFACE_CHANGED: 'truth_surface_changed',
});
```

The seam returns only the existing canonical reasons. The
operations layer surfaces the canonical STALE envelope:

```
PACKAGING_WORKSPACE_EXECUTE_REJECTED
issues: ['stale', ...reasons]
```

The STALE envelope is owned by the existing R-13 path
(`workspace-service.js` `executeGeneration`). The seam is
**inspection**, not transition.

---

## 10. Operations Layer Consumption Contract

The operations layer's `execute-generation` operation uses
the seam BEFORE `buildExecutionDeps`:

```
execute-generation operation
        ↓
service.checkStale(sessionId)
        ↓
if stale:
  throw PACKAGING_WORKSPACE_EXECUTE_REJECTED
  issues: ['stale', ...reasons]
  STOP
if fresh:
  buildExecutionDeps
  Registry identity check
  if mismatch:
    throw EXECUTION_PROVIDER_MODEL_IDENTITY_MISMATCH
    STOP
  match
  capability + adapter + execution
```

The operations layer does NOT import `computeStale`. It only
sees `{ stale, reasons }` via the seam.

---

## 11. Provider Identity Mismatch Separation

Provider identity mismatch is **NOT** a STALE reason. It is an
**execution configuration error** owned by `buildExecutionDeps`.

| Workspace state | Operation outcome |
|---|---|
| READY | `checkStale` returns fresh. `buildExecutionDeps` runs. If mismatch, `EXECUTION_PROVIDER_MODEL_IDENTITY_MISMATCH`. |
| STALE | `checkStale` returns stale. Canonical `PACKAGING_WORKSPACE_EXECUTE_REJECTED` with `['stale', ...reasons]`. `buildExecutionDeps` not called. |
| READY + profile mismatch | Fresh from `checkStale`. Mismatch from `buildExecutionDeps`. `EXECUTION_PROVIDER_MODEL_IDENTITY_MISMATCH`. |
| STALE + profile mismatch | Stale from `checkStale`. Canonical STALE wins. `buildExecutionDeps` not called. Mismatch not surfaced. |

This preserves the C4.2.1 STALE-first ordering and the
C4.2 identity-split architecture.

---

## 12. AV Guards

`tests/runtime-application/packaging-a12-canonical-stale-inspection-contract.test.ts`:

| ID | Concern |
|---|---|
| AV-01 | checkStale exists on Workspace Service and is part of the public API |
| AV-02 | checkStale uses the canonical computeStale (single source of truth) |
| AV-03 | checkStale returns only `{ stale, reasons }` (no raw state exposure) |
| AV-04 | checkStale does not change status |
| AV-05 | checkStale does not change staleReasons / lastStaleReasons / lastStaleReason |
| AV-06 | checkStale does not change intent / truthSnapshot / prepared |
| AV-07 | checkStale does not change execution / error / persistence |
| AV-08 | canonical STALE_REASON set is intent_changed + truth_surface_changed (no new reasons) |
| AV-09 | the seam reads canonical state through the existing getSessionOrThrow accessor |
| AV-10 | the seam re-runs computeStale against the current state (not the saved snapshot) |
| AV-11 | the canonical stale reason set is the ONLY reason set surfaced |
| AV-12 | identity_mismatch is NOT a STALE_REASON |
| AV-13 | STALE_REASON registry is unchanged (no new reasons added by P3-A12) |
| AV-14 | the operations layer uses the seam only for inspection (not for state mutation) |
| AV-15 | operations does NOT import computeStale |
| AV-16 | operations does NOT import stale-tracker module |
| AV-17 | AK-15 contract preserved: no second stale tracker in operations |
| AV-18 | view model does NOT expose intentAtPrepare |
| AV-19 | view model does NOT expose truthFingerprintAtPrepare |
| AV-20 | no raw stale-input accessor is added to workspace-service |
| AV-21 | P2 frozen production diff is zero |
| AV-22 | P3-B accepted UI semantic diff is zero |
| AV-23 | P3-A state machine unchanged (state machine + STALE envelope) |
| AV-24 | the seam is the ONLY authorized P3-A12 production delta (function body byte-equivalent to C4.2.1) |
| AV-25 | P3-A12 makes no Provider calls and does not update Golden |

Total: 25 guards, all PASS.

---

## 13. Existing Guards Verified

| Guard | Status |
|---|---|
| AK-15 (no second stale tracker) | PASS — operations layer source still has no `stale-tracker\|computeStale\|STALE_REASON` text reference |
| R-13 (STALE envelope) | PASS — `PACKAGING_WORKSPACE_EXECUTE_REJECTED: stale; reasons=...` preserved |
| AS-01..25 (C4.2 identity split) | PASS — Registry/API identity separation preserved |
| AT-01..22 (C4.2.1 boundary cleanup) | PASS — mismatch in `buildExecutionDeps`, no STALE state mutation |
| AQ-01..25 (D2 revalidation) | PASS — re-frozen P3-C surface unchanged from AQ perspective |
| AR-01..24 (D3 historical HOLD) | PASS — D3 HOLD preserved (AR-08..12, AR-15, AR-16 NOT MET) |
| AH/AI/AJ/AK/AL/AM (P3-B/B2/B5) | PASS — no regression |
| AP/AN/AO (P3-A canonical context) | PASS — selector unchanged |
| Provider targeted (89/89) | PASS |

---

## 14. Full Regression

| Suite | Count | Status |
|---|---|---|
| `npm test` (root) | 1234 / 1234 | PASS |
| `npm run runtime-application:test` | 1443 / 1443 | PASS (was 1418 in C4.2.1; +25 AV) |
| `npm run test:image-generation` | 982 / 982 | PASS |
| `npm run cli:test` | 40 / 40 | PASS |
| `npm run web:typecheck` | — | PASS |
| `npm run web:build` | — | PASS |
| `npm run web-runtime:typecheck` | — | PASS |
| `npm run web-runtime:test` | 10 / 10 | PASS |
| `npm run web:smoke` | — | PASS (0 Provider calls) |
| `npm run repo:verify` | 40 / 40 | PASS |
| `npm run repo:check` | — | PASS |
| `npm run verify:current-flows` | — | PASS |
| `npm run verify:workspace-boundaries` | — | PASS |
| `npm run verify:production-boundaries` | — | PASS |
| `npm run verify:no-project-specific-production-rules` | — | PASS |
| `npm run verify:space-compiler-baseline` | — | PASS |
| `npm run verify:space-r8.6-golden-boundary` | — | PASS |
| `npm run golden:test` | — | PASS |

External Provider calls: **0**.
Golden auto-update: **NO**.

---

## 15. Baselines

| Baseline | SHA | Note |
|---|---|---|
| P2 | `a593278b55e437fac59d768c5cee734d9a9fc201` | unchanged |
| P3-A11 historical | `f95c145b9b1e37430ac68315c9e039f1f3262ae4` | now labeled Historical Frozen Baseline (P3-A12 is a corrective reopen) |
| P3-B accepted | `2ac4cf1cc18156d1e4a508382b4563298d69c014` | unchanged |
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
| C4.2.1A audit | `0a7fae7a05ab6692007238cda8642736f9c4701a` | unchanged |
| C4.2.2A audit | `4797a45e75748822c808b9073f44706846a48d6e` | unchanged |
| **P3-A12 corrective production** | `1fcafc8...` | **NEW** |
| **P3-A12 re-freeze** | `<re-freeze commit>` | **NEW** |

After P3-A12 lands, the **current P3-A production-tree
baseline** is the P3-A12 corrective commit. The historical
P3-A11 baseline is preserved for evidence; it is no longer
the "zero diff" target.

---

## 16. P3-C4.2.2 Readiness

P3-C4.2.2 is now READY. With the P3-A12 corrective
establishing a new current P3-A baseline that includes the
read-only inspection seam, the C4.2.2 corrective can:
1. Consume the new P3-A12 baseline as the zero-diff target.
2. Remove the `C4_2_1_SUBTREE` pathspec exclusions (they
   protected a delta that is now part of the new baseline).
3. Update the B-class expected-delta guards to remove
   `workspace-service.js` from the expected list (the
   workspace-service.js delta is now part of the new P3-A12
   baseline; the C4.2.2 corrective's only allowed delta is
   `packaging-operations.js`).
4. Restore the AK-15 + direct git-diff architecture.

C4.2.2 is NOT started by P3-A12. C4.2.2 requires a separate
authorization scope.

---

## 17. D3 Status

P3-D3 is **HOLD — RE-RUN AUTHORIZATION REQUIRED** (unchanged
from C4.2.1A and C4.2.2A). The C4.2.1A audit's analysis of
D3 readiness (D3 RE-RUN READY) is preserved. D3 re-run still
requires new explicit human authorization.
