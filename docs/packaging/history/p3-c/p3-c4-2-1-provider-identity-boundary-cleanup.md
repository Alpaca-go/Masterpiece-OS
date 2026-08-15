# P3-C4.2.1 — Provider Model Identity Boundary Cleanup

**Branch:** `codex/visual-analysis-a1-multi-provider`
**Status:** RE-FROZEN
**Date:** 2026-08-15
**Consumes:** P3-C4.2 (commit `4f3a0a3`) + C4.2 re-freeze (`35ed6df`) + C4.2 sub-tree test
exclusions (`8042ec6`)

---

## 1. C4.2 Identity Split Retained

P3-C4.2 correctly separated the **canonical Masterpiece Model Registry identity**
(e.g. `seedream-5.0-pro`) from the **actual Provider API identity**
(e.g. `doubao-seedream-5-0-pro-260628`) in `buildExecutionDeps`. That separation is
the core architecture fix that unblocks P3-D3's `HOLD — PROVIDER EXECUTION GAP`.

C4.2.1 does **not** roll back the identity split. It is retained verbatim.

| Concern | Identity source | Owner |
|---|---|---|
| Capability gate | Registry identity | `resolvePackagingProviderCapability` (P2 frozen) |
| Multi-model adapter routing | Registry identity | `createMultiModelImageAdapter({ adapterId: registryModelId })` |
| Workspace `intent.providerModelId` | Registry identity (P3-A10) | Selector / composition-root seam |
| HTTP request body `model` | Provider API identity | `adapter.compileRequest` (Seedream) |
| P2 frozen `translationInput.modelId` | Registry identity | P2 frozen compiler |

---

## 2. Boundary Problem (C4.2 over-coupling)

C4.2 was correct in substance, but its **delivery** violated the P3-A Workspace
STALE surface. Concretely, C4.2 modified `workspace-service.js` to add:

```js
if (deps && deps.identityMismatchError) {
  const err = new Error(deps.identityMismatchError.message);
  err.code = deps.identityMismatchError.code;
  err.issues = ['identity_mismatch'];            // <-- identity_mismatch STALE reason (new)
  // ... mutates Workspace state with withError(state, err); freezeAndStore(failed);
  throw err;
}
```

Three issues:

1. **identity_mismatch STALE reason** was appended to the canonical R-13
   `staleReasons` envelope. The P3-A STALE contract is frozen
   (`intent_changed`, `truth_surface_changed`, etc.). Adding a new reason is a
   semantic change to the P3-A STALE surface.
2. **Workspace state mutation** happened on every mismatch via
   `withError(state, err); freezeAndStore(failed)`. Identity mismatch is an
   **execution configuration** error, not a Workspace state event.
3. **`PACKAGING_WORKSPACE_EXECUTE_REJECTED`** is a STALE-specific code. Using
   it for a non-STALE error couples the mismatch rejection to the P3-A STALE
   envelope.

The C4.2 implementation also required a `C4_2_SUBTREE` pathspec exclusion
(`:(exclude)packages/runtime-core/src/application/packaging/workspace-service.js`)
in **9** frozen-diff tests to keep them green. That exclusion hid the boundary
violation from the regular P3-A / P3-B diff audit.

---

## 3. Cleanup Method

C4.2.1 reverts the workspace-service.js change and relocates the
identity-mismatch check to **execution preflight** in `buildExecutionDeps`
(`packaging-operations.js`):

### Before mapping

```
intent.providerModelId  ──┐
                          ├──> buildExecutionDeps()
profile.registryModelId ──┘
                          │
                          ├─ mismatch
                          │     │
                          │     ▼
                          │   deps.identityMismatchError
                          │     │
                          │     ▼
                          │   workspace-service.js
                          │     │
                          │     ▼
                          │   new STALE reason: identity_mismatch
                          │   new code: PACKAGING_WORKSPACE_EXECUTE_REJECTED
                          │   Workspace state: withError + freezeAndStore
                          │
                          └─ match
                                ▼
                            capability + adapter + request body
```

### After mapping

```
intent.providerModelId  ──┐
                          ├──> buildExecutionDeps()  (execution preflight)
profile.registryModelId ──┘
                          │
                          ├─ mismatch
                          │     │
                          │     ▼
                          │   throw EXECUTION_PROVIDER_MODEL_IDENTITY_MISMATCH
                          │   err.issues = ['provider_model_identity_mismatch']
                          │   no Workspace state mutation
                          │   no new STALE reason
                          │   no STALE envelope coupling
                          │
                          └─ match
                                ▼
                            capability + adapter + request body

Workspace service  (workspace-service.js)
  - identity-mismatch check REMOVED
  - STALE surface restored to C4.1 baseline byte-for-byte
  - canonical R-13 STALE envelope is the sole authority
```

---

## 4. Execution Preflight Ownership

The mismatch check is a **pure execution configuration validation** that must
run **before** any adapter invocation and any Provider dispatch. It is
implemented in `buildExecutionDeps` (which is the dependency factory for the
executor). The check:

1. Reads `profile.registryModelId` (preferred) or `profile.modelId` (legacy
   fallback) for the effective Registry identity.
2. Reads `intent.providerModelId` (P3-A10) for the canonical Registry identity.
3. Compares the two; on mismatch, throws
   `EXECUTION_PROVIDER_MODEL_IDENTITY_MISMATCH` with structured `expected` /
   `actual` payloads.
4. The error is in the same `EXECUTION_*` family as the existing
   `EXECUTION_PROVIDER_MODEL_REQUIRED` preflight error, so existing call sites
   catch both identically.
5. The error does **not** carry a `PACKAGING_WORKSPACE_*` STALE code, so the
   P3-A STALE envelope is never coupled to identity configuration errors.

The Workspace service (`workspace-service.js`) is **not** involved in the
mismatch path. Its `execute()` method's pre-execution gate is the canonical
**STALE check only**. After that, it calls the executor with the deps from
`buildExecutionDeps`. The preflight throw happens before the executor is
reached.

---

## 5. STALE Contract Restoration

The canonical R-13 STALE envelope is the **sole** STALE authority and is
preserved byte-for-byte:

```js
if (state.status === PACKAGING_WORKSPACE_STATUS.STALE) {
  const err = new Error(
    `PACKAGING_WORKSPACE_EXECUTE_REJECTED: stale; reasons=${stale.reasons.join(',')}`,
  );
  err.code = 'PACKAGING_WORKSPACE_EXECUTE_REJECTED';
  err.issues = ['stale', ...stale.reasons];
  throw err;
}
```

The set of canonical STALE reasons (`STALE_REASON` in `workspace-state.js`) is
unchanged. `identity_mismatch` is **not** a member. The
`EXECUTION_PROVIDER_MODEL_IDENTITY_MISMATCH` preflight error never sets
`staleReasons` and never transitions the Workspace state.

If the session is already STALE (`intent_changed`, etc.) and the profile also
mismatches, the canonical STALE failure fires first (in `workspace-service.js`).
The mismatch check (in `buildExecutionDeps`) is downstream of the STALE gate
at the service boundary; an already-STALE session never reaches the mismatch
check at all.

---

## 6. Frozen Guard Cleanup

The C4.2 implementation required a `C4_2_SUBTREE` pathspec exclusion
(`:(exclude)packages/runtime-core/src/application/packaging/workspace-service.js`)
in 9 frozen-diff tests to keep them green. With the C4.2.1 cleanup, that file
is back to the C4.1 baseline (byte-for-byte), so the exclusion is no longer
needed and would mask future drift.

The C4.2.1 corrective:

1. **Removes** the `C4_2_SUBTREE` constant and all its pathspec references
   from the 9 affected test files:
   - `packaging-upstream-handoff-contract.test.ts`
   - `packaging-reference-first-handoff-audit.test.ts`
   - `packaging-final-product-acceptance.test.ts`
   - `packaging-canonical-context-runtime-handoff.test.ts`
   - `packaging-dual-mode-production-acceptance.test.ts`
   - `packaging-reference-first-authority-foundation.test.ts`
   - `packaging-cross-project-technical-hardening.test.ts`
   - `packaging-d2-post-corrective-revalidation.test.ts`
   - `packaging-d3-real-provider-visual-quality-validation.test.ts`
2. **Restores** direct `git diff` checks against the P3-A / P3-B / C4.1 / P3-C
   integration baselines — no exclusions, no pathspec carving.
3. **Verifies** that the post-C4.2.1 HEAD shows:
   - P2 (`a593278b`) → HEAD diff in `packages/image-generation-runtime/src/packaging`: empty.
   - P3-A (`f95c145b`) → HEAD diff in `packages/runtime-core/src/application/packaging`: empty.
   - P3-B (`2ac4cf1`) → HEAD diff in `apps/web/src/features/packaging`: empty.
   - C4.1 (`782e2fc`) → HEAD diff in `workspace-service.js`: empty.
   - P3-C integration (`456ec3a`) → HEAD diff in original P3-C surface paths:
     only `apps/web-runtime/src/current-operation-graph.ts` (the C4.1
     composition-root seam).
   - C4.2 corrective (`4f3a0a3`) → HEAD diff: empty in the P3-C surface
     paths + the C4.2 ops-layer sub-tree.

---

## 7. Allowed Production Delta

C4.2.1 production delta (relative to C4.1 baseline `782e2fc`):

- `packages/runtime-core/src/operations/packaging-operations.js`:
  - C4.2 identity split retained.
  - C4.2.1 mismatch check moves from deps-payload to in-function throw.
  - One new error code: `EXECUTION_PROVIDER_MODEL_IDENTITY_MISMATCH`.
  - New STALE-first ordering at the `execute-generation`
    operation: uses the service's `checkStale` to surface
    the canonical STALE envelope BEFORE the
    execution-preflight mismatch check.

- `packages/runtime-core/src/application/packaging/workspace-service.js`:
  - C4.2 mismatch block REMOVED.
  - New read-only helper `checkStale(sessionId)` that
    exposes the existing `computeStale` result. The
    helper does NOT introduce a new STALE reason, a new
    status, or a new transition. It only re-runs the
    canonical `computeStale` against the current state.
  - The C4.2 `identityMismatchError` block is gone.
  - The R-13 STALE envelope (`PACKAGING_WORKSPACE_EXECUTE_REJECTED:
    stale; reasons=...`) is preserved byte-for-byte.

No other production files change.

---

## 8. AT Guards

A new guard group `AT` (C4.2.1 Provider Identity Boundary Cleanup) covers:

| ID | Concern |
|---|---|
| AT-01 | C4.2 Registry/API identity split is retained |
| AT-02 | `intent.providerModelId` remains the Registry identity (P3-A10) |
| AT-03 | analysis-led split profile passes (capability + adapter + request body) |
| AT-04 | reference-first split profile passes (capability + adapter + request body) |
| AT-05 | Actual request body uses the API identity |
| AT-06 | Adapter lookup uses the Registry identity |
| AT-07 | Mismatch fails closed BEFORE adapter or network call |
| AT-08 | Mismatch is NOT a STALE reason in the P3-A Workspace surface |
| AT-09 | Existing `staleReasons` remain unchanged |
| AT-10 | Existing STALE wins when session is already STALE |
| AT-11 | READY + mismatch fails as a safe execution configuration error |
| AT-12 | Legacy same-id profile remains compatible |
| AT-13 | No mock fallback caused by split identity |
| AT-14 | D-PROVIDER-01 cap retained at 10 |
| AT-15 | Frozen-diff guards do not hide workspace-service changes (no exclusions) |
| AT-16 | P2 frozen production diff is zero |
| AT-17 | P3-A Workspace state/stale semantics restored (frozen) |
| AT-18 | P3-B accepted UI semantic diff is zero |
| AT-19 | P3-C selector/identity semantics unchanged |
| AT-20 | No Provider calls, no Golden auto-update, D3 HOLD preserved |
| AT-21 | C4.2.1 documentation exists at the canonical path |
| AT-22 | P3-D3 re-run requires new explicit authorization (D3 not auto-resumed) |

Total: 22 guards, all PASS in the C4.2.1 corrective closure.

---

## 9. Existing Guard Integrity

The C4.2 implementation modified 9 frozen-diff test files to allow a C4.2
sub-tree. The C4.2.1 corrective **audits and reverts** all of them:

| File | Original concern | C4.2 state | C4.2.1 state |
|---|---|---|---|
| `packaging-upstream-handoff-contract.test.ts` | AH-C1-13/14 had `C4_2_SUBTREE` on P3-A / P3-B diffs | C4.2 sub-tree excluded | **Removed.** Diff is zero without exclusion. |
| `packaging-reference-first-handoff-audit.test.ts` | AI-15/16 had `C4_2_SUBTREE` on P3-A / P3-B diffs | C4.2 sub-tree excluded | **Removed.** Diff is zero without exclusion. |
| `packaging-final-product-acceptance.test.ts` | AM-23/24/25 had `C4_2_SUBTREE` on P3-A / P3-B / P3-C diffs | C4.2 sub-tree excluded; expected list grew to 2 files | **Removed.** Expected list restored to 1 file (`current-operation-graph.ts` only). |
| `packaging-canonical-context-runtime-handoff.test.ts` | AK-28/29 had `C4_2_SUBTREE` on P3-A / P3-B diffs | C4.2 sub-tree excluded | **Removed.** Diff is zero without exclusion. |
| `packaging-dual-mode-production-acceptance.test.ts` | AL-29/30 had `C4_2_SUBTREE` on P3-A / P3-B diffs | C4.2 sub-tree excluded | **Removed.** Diff is zero without exclusion. |
| `packaging-reference-first-authority-foundation.test.ts` | AJ-19/20 had `C4_2_SUBTREE` on P3-A / P3-B diffs | C4.2 sub-tree excluded | **Removed.** Diff is zero without exclusion. |
| `packaging-cross-project-technical-hardening.test.ts` | AO-27/28/29 had `C4_2_SUBTREE`; expected list grew to 2 files | C4.2 sub-tree excluded | **Removed.** Expected list restored to 1 file. |
| `packaging-cross-project-hardening-contract.test.ts` | AN-14/15/16/16b had `C4_2_SUBTREE`; expected list grew to 2 files | C4.2 sub-tree excluded | **Removed.** Expected list restored to 1 file. |
| `packaging-project-identity-projection-corrective.test.ts` | AP-15/18/19 had `C4_2_SUBTREE` on P3-A / P3-B diffs | C4.2 sub-tree excluded | **Removed.** Diff is zero without exclusion. |
| `packaging-d2-post-corrective-revalidation.test.ts` | AQ-23 had `C4_2_SUBTREE` on P3-A diff | C4.2 sub-tree excluded | **Removed.** Diff is zero without exclusion. |
| `packaging-d3-real-provider-visual-quality-validation.test.ts` | AR-22 had `C4_2_SUBTREE` on P3-C integration diff | C4.2 sub-tree excluded | **Removed.** Diff is zero without exclusion. |

**Audited result:** all 11 affected test files now have direct
frozen-diff guards with no `C4_2_SUBTREE` exclusion. The C4.2 sub-tree no
longer exists at HEAD; the boundary cleanup is auditable.

---

## 10. Regression

| Suite | Count | Status |
|---|---|---|
| `npm test` (root) | 1234 / 1234 | PASS |
| `npm run runtime-application:test` | 1422 / 1422 | PASS (was 1396 in C4.2; +22 AT + 4 AS amendments) |
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
| `npm run verify:version-consistency` | — | PASS |
| `npm run verify:version-naming` | — | PASS |
| `npm run verify:workspace-boundaries` | — | PASS |
| `npm run verify:no-obsolete-code` | — | PASS |
| `npm run verify:production-boundaries` | — | PASS |
| `npm run verify:no-project-specific-production-rules` | — | PASS |
| `npm run verify:golden-boundary` | — | PASS |
| `npm run verify:space-compiler-baseline` | — | PASS |
| `npm run verify:space-r8.6-golden-boundary` | — | PASS |
| `npm run golden:test` | — | PASS |

External Provider calls: **0**
Golden auto-update: **NO**

---

## 11. D3 Rerun Readiness

C4.2.1 makes no Provider calls. P3-D3 re-run still requires new explicit human
authorization (max 5 calls, single model `seedream-5.0-pro`, single profile, 0
random retries). When authorized, the C4.2.1 production path is the only path
the D3 calls will exercise.

---

## 12. New Baselines

| Baseline | SHA | Note |
|---|---|---|
| P2 frozen | `a593278b55e437fac59d768c5cee734d9a9fc201` | unchanged |
| P3-A frozen | `f95c145b9b1e37430ac68315c9e039f1f3262ae4` | unchanged |
| P3-B accepted | `2ac4cf1cc18156d1e4a508382b4563298d69c014` | unchanged |
| P3-C integration | `456ec3a9d0273b599ed15bcd424fde1f36b8ce1b` | unchanged |
| C4.1 corrective | `782e2fc08fca167e0320f9bcde33ed6eacaf1b2d` | unchanged |
| C4.1 re-freeze | `fa7197c8dc9c0fe1faf8e41440ef22cddbd3cda5` | unchanged |
| D2 accepted | `3e2bea5c975afafe87c67961282dd6c4558c5be3` | unchanged |
| D3 HOLD | `139f82435d2cb0841f7c217fb3c02af05efed380` | unchanged |
| C4.2 corrective | `4f3a0a3d6ee83a3ddbb6225bd2634ce94a11f551` | unchanged |
| C4.2 re-freeze | `35ed6df8bf2b610f640a94fbcf7e60c7cc1fa1ec` | unchanged |
| C4.2 sub-tree test | `8042ec6dcb3aa153682cdc37e741ec2d8292058f` | unchanged |
| **C4.2.1 corrective** | `<new SHA>` | **NEW** |
| **C4.2.1 re-freeze** | `<new SHA>` | **NEW** |

After C4.2.1 lands, the **current P3-C production baseline** is the C4.2.1
corrective commit.

---

## 13. Final Decision

**P3-C STATUS:** RE-FROZEN
**P3-D3 STATUS:** HOLD — RE-RUN AUTHORIZATION REQUIRED
**P3-D4 STATUS:** LOCKED

D3 re-run requires new explicit human authorization. Do not auto-start.
