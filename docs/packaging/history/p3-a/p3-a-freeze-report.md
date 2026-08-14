# P3-A9 — Freeze Report & Operational Baseline

> **Packaging Generator P3-A: Workspace Architecture &
> Integration Contract** is hereby declared
> **FROZEN** as of `P3-A9`. P3-B is **UNLOCKED**.

This report is the historical freeze declaration
for the P3-A phase. It is a docs-only commit. No
production code, no test code, no P2 frozen module,
no authority boundary is altered by P3-A9 itself.

> **P3-A10 amendment:** P3-A was formally reopened for one corrective
> model-identity translation repair and re-frozen. The original baseline and
> this report remain historical evidence. The current corrective baseline is
> recorded in
> [`p3-a10-model-identity-corrective.md`](./p3-a10-model-identity-corrective.md).

> **P3-A11 amendment:** after P2-K established canonical Shot output
> geometry, P3-A completed the remaining Translation truth projections and
> was re-frozen at production baseline
> `f95c145b9b1e37430ac68315c9e039f1f3262ae4`. Historical P3-A9/P3-A10
> evidence remains unchanged. The current record is
> [`p3-a11-translation-completeness-corrective.md`](./p3-a11-translation-completeness-corrective.md).

---

## 1. Executive Freeze Decision

| Decision | Status |
|---|---|
| **P3-A STATUS** | **FROZEN** |
| **P3-B STATUS** | **UNLOCKED** |

All 12 canonical STOP-P3-A conditions NOT TRIGGERED.
P2 frozen baseline unchanged. Working tree clean.
Architecture Guards A-L 71/71 PASS. P3-A8 Full
Regression 2306 executed case entries across listed
regression surfaces (with overlap; see §3 for
authoritative suite counts). P3-B UI development may
begin against the frozen contract recorded in this
document.

---

## 2. Scope

This report records the freeze of:

- **Workspace Application Contract** (5 P3-A2 API + `setTruthSnapshot`)
- **Workspace State Machine** (8 canonical statuses + transition guard)
- **UI-safe View Model / Projection** (canonical-keys allowlist + redaction)
- **Stale / Prepare / Execute Contract** (Workspace stale revalidation + P2 pre-execution verification, double-layer fail-closed)
- **Truth Drift Contract** (`setTruthSnapshot` + single canonical reason)
- **Reference Assignment Contract** (canonical roles from P2 frozen, semantic/UI-only split)
- **Locked Asset Contract** (read-only 7-canonical-field projection, no second authority)
- **Architecture Guards A-L** (source-level static invariants, fail-closed)
- **Public Runtime Boundary** (`@masterpiece/runtime-core` public barrel)
- **Frozen P2 Integration Boundary** (16 protected paths)

P3-A9 does not modify any of the above contracts. P3-B
is permitted to consume them via the public barrel.

---

## 3. Git / Baseline History (actual git log is the authority)

| Commit | Subject | Type | Files | Production change |
|---|---|---|---|---|
| `98f34de` | `docs(packaging): P3-A1 — Workspace Architecture Audit` | docs | 1 doc | 0 |
| `ebf46b8` | `feat(packaging): P3-A2 — Workspace Application Contract` | prod+test | 9 prod + 1 test | YES (initial application layer) |
| `b71d428` | `feat(packaging): harden workspace state machine (P3-A3)` | prod+test | 3 prod + 1 test | YES (state invariants + canonical error messages) |
| `87f25f4` | `feat(packaging): harden UI-safe view model (P3-A4)` | prod+test | 2 prod + 1 test | YES (canonical-keys allowlist + redaction) |
| `0377f0f` | `feat(packaging): harden stale prepare execute contract (P3-A5)` | prod+test | 2 prod + 1 test | YES (`setTruthSnapshot` + re-prepare clears stale reasons) |
| `6064b0c` | `fix(packaging): preserve stale execute semantics (P3-A5.1)` | prod+test | 1 prod + 1 test | YES (STALE-specific issue surface) |
| `dd4570a` | `feat(packaging): harden reference locked asset contract (P3-A6)` | prod+test | 4 prod + 1 test | **YES (last production commit)** |
| `930f9d0` | `test(packaging): add P3-A architecture guards (A-L)` | test | 1 test | 0 (P3-A7 is test-only) |
| `c434400` | `docs(packaging): record P3-A8 full regression` | docs | 1 doc | 0 (P3-A8 is docs-only) |

---

## 4. Baseline Model (4 layers)

P3-A9 distinguishes four baselines. Do not collapse
them into a single SHA.

### 4.1 Production Implementation Baseline

| Field | Value |
|---|---|
| Commit | `dd4570a` |
| Subject | `feat(packaging): harden reference locked asset contract (P3-A6)` |
| Role | Last commit that modifies P3-A production application code |

Verified: `git diff --name-only dd4570a HEAD` over
production paths (`packages/`, `apps/`, `labs/`,
excluding `tests/`, `*.test.*`, `__tests__`, `*.spec.*`)
returns **empty** — A7 (test-only) and A8 (docs-only)
made zero production code changes.

### 4.2 Tested Architecture Baseline

| Field | Value |
|---|---|
| Commit | `930f9d0` |
| Subject | `test(packaging): add P3-A architecture guards (A-L)` |
| Role | The `dd4570a` production implementation + the A-L Architecture Guard layer (71 source-level static invariants) |

This is the version that P3-A8 Full Regression ran
against. Production implementation is unchanged from
`dd4570a`; the A-L guard layer is the only addition.

### 4.3 Full Regression Acceptance Evidence

| Field | Value |
|---|---|
| Commit | `c434400` |
| Subject | `docs(packaging): record P3-A8 full regression` |
| Role | docs-only acceptance evidence — proves `930f9d0` tested surface passes the full regression surface (P3-A phase + runtime + image-generation + repo:verify + space baseline + visual analysis) |

This is not a new production implementation baseline.
It is the acceptance evidence that allows P3-A9 to
declare FROZEN.

### 4.4 Freeze Record Commit

| Field | Value |
|---|---|
| Commit | P3-A9 (this report) |
| Subject | `docs(packaging): freeze P3-A workspace architecture` |
| Role | Historical freeze declaration — docs-only; no production/test/P2 change |

---

## 5. Authoritative Suite Counts (P3-A8)

P3-A8 reported 2306 executed case entries. P3-A9 records
the authoritative subset counts (with explicit overlap
declared, not summed to a unique total):

| Surface | Count | Status |
|---|---|---|
| P3-A phase (A2..A7) | 473 | 473/473 PASS |
| ├ P3-A2 application-contract | 40 | PASS |
| ├ P3-A3 state-machine | 120 | PASS |
| ├ P3-A4 view-model | 81 | PASS |
| ├ P3-A5 / A5.1 stale-prepare-execute | 86 | PASS |
| ├ P3-A6 reference-locked-asset | 75 | PASS |
| └ P3-A7 architecture-guards | 71 | PASS |
| Runtime shared | 14 | 14/14 PASS |
| Runtime application (contains all P3-A phase) | 807 | 807/807 PASS |
| **Combined runtime** | **821** | **821/821 PASS** |
| Image-generation (P2 frozen) | 972 | 972/972 PASS |
| repo:verify | 40 | 40/40 PASS |

These counts are the **authoritative regression
numbers** for the freeze. Future re-runs that match
these counts (or only add non-acceptance-critical
tests) confirm the freeze remains in effect.

The 2306 number reported in P3-A8 includes overlap
between aggregate and subset suites (473 ⊂ 807 ⊂
runtime:test); it is not a unique-test count.

---

## 6. P2 Frozen Dependency Baseline

| Field | Value |
|---|---|
| P2 frozen code baseline | `335405342951fedae5d4d6816444c2b4d2402787` |
| P3-A1..A8 modification to P2 frozen modules | **NO** |

`git diff --name-only 335405342951fedae5d4d6816444c2b4d2402787 HEAD`
over the 16 P2 frozen protected paths returns empty.

**Protected surfaces** (16 paths, all unchanged since baseline):

```
packages/image-generation-runtime/src/packaging/             (9 files)
packages/image-generation-runtime/src/core/packaging-generation-core.js
packages/image-generation-runtime/src/redact.js
packages/image-generation-runtime/src/deliverables/           (directory)
packages/image-generation-runtime/src/policies.js
packages/image-generation-runtime/src/gates.js
packages/image-generation-runtime/src/task-builder.js
packages/image-generation-runtime/src/download-verify.js
```

Any future P3-B / P3-C work that needs to touch these
paths must reopen P3-A and re-run the full regression.

---

## 7. Frozen Production Surface

The P3-A frozen application surface (all under
`packages/runtime-core/src/application/packaging/`):

| File | Role |
|---|---|
| `workspace-service.js` | Thin orchestrator. 6 API + getView + _removeSession. Sole importer of `preparePackagingGeneration` / `executePackagingGeneration` from P2 frozen. |
| `workspace-state.js` | 8-status state machine + transition guard (`ALLOWED_TRANSITIONS` + `STATE_INVARIANTS`). Sole authority for state capability projection (`isExecuteAllowed` / `isIntentEditAllowed` / `isPrepareAllowed` / `isResetAllowed`). |
| `intent-schema.js` | 6 user-editable semantic fields + `validatePackagingIntent` + `packagingIntentsEqual` + `computeTruthFingerprint` + `detectStaleChange` (data-side structural comparison). |
| `stale-tracker.js` | `computeStale` + `STALE_REASON` canonical reason enum. Sole orchestration-level stale engine. |
| `reference-assignments.js` | `validateReferenceAssignment` + `projectReferenceAssignmentsToPolicy` + `REFERENCE_VIEW_KEYS` (5 keys) + `getPackagingReferenceAssignmentsViewKeys`. |
| `lock-assets-projection.js` | `projectLockedAssetsForView` (7 canonical fields) + `getPackagingLockedAssetsProjectionKeys` + `getPackagingLockedAssetsRedactedKeys` (13 keys). |
| `view-model.js` | UI-safe view projection + `serializeWorkspaceView` + canonical-keys allowlists (top-level / intent / execution / prepared / error). Pure projection; no prepare/execute/network/fs/credential calls. |
| `index.js` | Public barrel for `@masterpiece/runtime-core` packaging export. |

`packages/runtime-core/src/index.js` re-exports the
packaging surface from `./application/packaging/index.js`.

---

## 8. Frozen Public API

The canonical service surface returned by
`createPackagingWorkspaceService(...)` (per
`workspace-service.js`):

```js
{
  version, schemaVersion,         // PACKAGING_WORKSPACE_SERVICE_VERSION (1.0.0)
  createSession,                   // P3-A2 §8.1
  updateIntent,                    // P3-A2 §8.2
  setTruthSnapshot,                // P3-A5 §30 (Project Restore Contract)
  prepareGeneration,               // P3-A2 §8.3
  executeGeneration,               // P3-A2 §8.4
  resetPreparation,                // P3-A2 §8.5
  getView,                         // P3-A2 §8.6 (UI-safe projection)
  _removeSession,                  // internal test helper (not public contract)
}
```

Public barrel surface (per `index.js`) — these are
the only `@masterpiece/runtime-core` imports P3-B may
use:

```
PACKAGING_WORKSPACE_SERVICE_VERSION
PACKAGING_WORKSPACE_STATUS
PACKAGING_WORKSPACE_STATUS_LABELS
PACKAGING_WORKSPACE_REFERENCE_ASSIGNMENTS_VERSION
PACKAGING_WORKSPACE_VIEW_MODEL_VERSION
PACKAGING_WORKSPACE_LOCK_ASSETS_PROJECTION_VERSION
PACKAGING_GENERATION_SERVICE_VERSION
PACKAGING_GENERATION_MODES
PACKAGING_SHOT_CONTRACT_IDS
PACKAGING_REFERENCE_ROLES
STALE_REASON
REFERENCE_VIEW_KEYS
createPackagingWorkspaceService
validateReferenceAssignment
projectReferenceAssignmentsToPolicy
getPackagingReferenceAssignmentsViewKeys
projectLockedAssetsForView
getPackagingLockedAssetsProjectionKeys
getPackagingLockedAssetsRedactedKeys
computeLockedAssetsFingerprint
projectPackagingWorkspaceView
getPackagingGenerationServiceFingerprint
PACKAGING_WORKSPACE_INTENT_VERSION
PACKAGING_WORKSPACE_INTENT_FIELDS
createDefaultPackagingIntent
validatePackagingIntent
packagingIntentsEqual
computeTruthFingerprint
detectStaleChange
PACKAGING_WORKSPACE_STATE_MACHINE_VERSION
createInitialSessionState
transitionSession
isExecuteAllowed
isIntentEditAllowed
isPrepareAllowed
isResetAllowed
getPackagingWorkspaceStateMachineFingerprint
getStateInvariant
PACKAGING_WORKSPACE_STALE_TRACKER_VERSION
computeStale
getPackagingStaleTrackerFingerprint
getPackagingWorkspaceReferenceAssignmentsFingerprint
projectReferenceAssignmentForView
getPackagingWorkspaceLockedAssetsProjectionFingerprint
getPackagingWorkspaceViewModelFingerprint
serializeWorkspaceView
getPackagingWorkspaceViewModelKeys
getPackagingWorkspaceIntentKeys
getPackagingWorkspaceExecutionKeys
getPackagingWorkspacePreparedKeys
getPackagingWorkspaceErrorKeys
```

`PACKAGING_REFERENCE_PRECEDENCE` is **NOT** in the
public barrel (P3-B cannot consume it to make
generation decisions — see §13).

---

## 9. Frozen State Machine Contract

The 8 canonical workspace states (per `workspace-state.js`):

| Status | Constant | Meaning |
|---|---|---|
| `new` | `NEW` | Session created; intent may be unset |
| `unprepared` | `UNPREPARED` | Intent set; no prepared snapshot |
| `preparing` | `PREPARING` | Prepare in flight (intent edits + execute rejected) |
| `ready` | `READY` | Prepared snapshot matches current intent (execute allowed) |
| `stale` | `STALE` | Semantic intent or truth drift; re-prepare required (execute rejected) |
| `executing` | `EXECUTING` | Execute in flight (intent/prepare/execute rejected) |
| `executed` | `EXECUTED` | Last execute succeeded; retry allowed (must revalidate) |
| `failed` | `FAILED` | Last prepare or execute failed; reset or re-prepare |

`ALLOWED_TRANSITIONS` is the single legal-transition
authority. `isExecuteAllowed` / `isIntentEditAllowed` /
`isPrepareAllowed` / `isResetAllowed` are the single
capability-projection authority.

**P3-B MUST NOT build a second state machine or a
parallel rule table.**

---

## 10. Frozen Stale / Prepare / Execute Contract

### 10.1 Stale triggers (semantic)

| Change | STALE? | Reason |
|---|---|---|
| `generationMode` | YES | `intent_changed` |
| `shotContractId` | YES | `intent_changed` |
| `explicitUserConstraints.text` | YES | `intent_changed` |
| `referenceAssignments[*]` (assetId/role/source) | YES | `intent_changed` |
| `providerModelId` | YES | `intent_changed` |
| `apiProfileId` | YES | `intent_changed` |
| `truthSnapshot.lockedAssets.*` | YES | `truth_surface_changed` |
| `truthSnapshot.analysisContext.*` | YES | `truth_surface_changed` |
| `truthSnapshot.projectIdentity.*` | YES | `truth_surface_changed` |

### 10.2 Non-stale changes (UI-only)

| Change | STALE? |
|---|---|
| `displayName` (reference) | NO |
| `previewUri` (reference) | NO |
| `selectionOrderUI` (reference) | NO |
| `thumbnail` (reference) | NO |

### 10.3 Once-stale fail-closed

- Once a session transitions to `STALE`, it remains
  `STALE` until an explicit `prepareGeneration` is
  called and succeeds.
- Restoring intent to its original value does NOT
  clear STALE.
- Restoring truth to its original value does NOT
  clear STALE.
- A successful re-prepare anchors to a fresh
  `intentAtPrepare` + `truthFingerprintAtPrepare`,
  replacing the old snapshot and clearing
  `lastStaleReasons`.

### 10.4 STALE execute issue surface

STALE execute rejection issues are the
**STALE-specific** envelope (not the generic
`not_ready`):

| STALE state | `err.issues` (frozen) |
|---|---|
| STALE + intent drift | `['stale', 'intent_changed']` |
| STALE + truth drift | `['stale', 'truth_surface_changed']` |
| STALE + both | `['stale', 'intent_changed', 'truth_surface_changed']` |

UNPREPARED / FAILED / EXECUTING / NEW / PREPARING
execute rejections keep the simple `['not_ready']`
envelope. The two envelopes are distinguishable in
log dedup and UI display.

### 10.5 Double-layer pre-execution gate

Every execute must pass **both**:

1. **Workspace gate** — `isExecuteAllowed(status)` (early
   state-machine gate) AND `computeStale(...)` (late
   semantic equality check). If the early gate rejects,
   issues are the STALE-specific envelope; if the late
   check rejects, issues are `['stale', ...reasons]`.
2. **P2 frozen gate** — `verifyPackagingGenerationMetadata`
   inside the P2 frozen `executePackagingGeneration` call
   verifies the 5 P2-F hashes still match the new
   `(translation, compiled, capability, payload)`.

Both must pass before the Provider is called. Either
failure is fail-closed.

### 10.6 Execute != implicit prepare

`executeGeneration` never calls `preparePackagingGeneration`
implicitly. UNPREPARED / STALE / FAILED execute all
reject without re-preparing.

### 10.7 Retry (EXECUTED → execute) gate

`EXECUTED → executeGeneration` is allowed **only** if
preparation identity remains valid (no intent drift,
no truth drift, P2 frozen metadata still verifies).
Re-executing with the same semantic input preserves
the 5 P2-F hashes; the new runId and artifacts are
fresh. If the retry fails, `lastExecution` (the
previous successful run) is **preserved** (P3-A spec §29
run history contract).

---

## 11. Frozen Reference Contract

### 11.1 Canonical role authority

The 6 canonical Reference roles (per
`packages/image-generation-runtime/src/packaging/reference-policy.js`,
frozen since the P2 frozen baseline):

```
high_fidelity_visual_reference
structure_reference
material_reference
composition_reference
style_reference
product_identity_reference
```

Single source: `PACKAGING_REFERENCE_ROLES`. Re-exported
verbatim through the Workspace barrel. **Second
Reference role authority: NO.**

### 11.2 Reference precedence authority

The 6-layer precedence chain (per
`PACKAGING_REFERENCE_PRECEDENCE`):

```
locked_assets
explicit_user_constraints
reference_image
packaging_translation
analysis_context
model_defaults
```

Sole authority: P2 frozen `resolveReferencePolicy`.
The Workspace does NOT sort, rank, or reorder
references. It returns the user's input order
verbatim to P2. **`PACKAGING_REFERENCE_PRECEDENCE` is
not exposed in the public Runtime barrel** — P3-B
cannot consume it to make generation decisions.

**Workspace implements precedence: NO.**

### 11.3 Reference assignment shape (semantic vs UI-only)

| Field | Semantic? | Stale trigger? | Pass to P2? | UI visible? |
|---|---|---|---|---|
| `assetId` | YES | YES | YES | YES |
| `role` | YES (must be 1 of 6) | YES | YES | YES |
| `source` | YES (default `'user'`) | YES | YES | YES |
| `displayName` | NO | NO | NO | YES |
| `previewUri` | NO | NO | NO | YES |
| `selectionOrderUI` | NO | NO | NO | (consumed by P2 ordering) |
| `thumbnail` | NO | NO | NO | YES |
| `includeReason` | semantic metadata | YES | YES | NO |

### 11.4 Reference view projection

The Workspace view-model `references` array carries
exactly `REFERENCE_VIEW_KEYS` (5 keys):
`assetId`, `role`, `source`, `displayName`, `previewUri`.
No upstream keys leak; future fields require allowlist
update.

### 11.5 Reference validation contract

- Missing `assetId` → `REFERENCE_ROLE_INVALID`
- Missing `role` → `REFERENCE_ROLE_INVALID`
- Unknown role → `REFERENCE_ROLE_INVALID`
- Duplicate `assetId` (any role) → `REFERENCE_ROLE_INVALID`
- Reference-first with empty references → intent-level
  pass; P2 frozen `validateReferencePolicy` throws
  `REFERENCE_REQUIRED`
- Multiple assets same role → allowed (P2 does not
  restrict)

---

## 12. Frozen Locked Asset Contract

### 12.1 Authority

Locked-Assets authority remains with the upstream
project / `Locked-Assets-Service`
(`packages/runtime-core/src/application/locked-assets-service.ts`).
The Workspace has **no save / compile / edit / unlock
/ replace / set / save API**. **Second Locked Asset
authority: NO.**

### 12.2 Projection

7 canonical UI fields, all `locked: true`:

```
brand                → { name, locked: true }
logo                 → { present, usageMode, locked: true }
productIdentity      → { name, locked: true }
category             → { name, locked: true }
structure            → { formFactor, locked: true }
mandatoryCopy        → { items, locked: true }
confirmedComponents  → { items, locked: true }
```

Top-level projection shape: `{ schemaVersion, fields, allLocked }`.
`allLocked` is a permanent invariant.
`logo.usageMode` is constrained to `reserved` /
`rendered` (default `reserved`).

### 12.3 Hostile-input redaction (defense in depth)

The Workspace strips the following 13 key patterns
from any non-canonical field:

```
sourcePath, rawPath, file, path, absolutePath,
tmpPath, tempPath, localPath, fsPath,
apiKey, authorization, credential, secret
```

`file://`, UNC paths, base64 data URIs, and real
Bearer tokens never appear in the view. Missing
fields are projected as empty canonical values
(no throw).

### 12.4 Truth drift recovery

Locked-Asset authority change → upstream flow →
`setTruthSnapshot(newTruth)` → state transition
`READY|EXECUTED → STALE` (`truth_surface_changed`)
→ execute rejected → re-prepare required. The
Workspace does NOT auto-refresh the prepared
snapshot; it does NOT silently clear STALE.

---

## 13. Frozen UI-safe View Model / Security Contract

### 13.1 P3-B UI input surface

The only application data surface for the P3-B UI is
`@masterpiece/runtime-core`'s public barrel. The UI
must call `createPackagingWorkspaceService` and
consume the `getView` projection.

### 13.2 View Model top-level shape (18 keys)

```
schemaVersion, sessionId, projectId, target, status,
statusLabel, isBusy, canEditIntent, mode, shot,
references, lockedAssets, intent, readiness, prepared,
execution, error, staleReasons
```

Prepared projection (12 keys):
```
target, generationMode, shotContractId, readiness,
referenceSummary, lockedAssetSummary, providerSummary,
compiledPromptPreview, metadataSummary,
fingerprintSummary, warnings, blockers
```

Execution projection (9 keys):
```
runId, status, generationMode, shotContractId, provider,
model, apiProfileId, artifacts, diagnostics
```

`fingerprintSummary.*` is a display projection
(shortId = 12 chars + ellipsis); the full 32-char
hash is in `preparedResult.metadata.compileFingerprint.*`.

### 13.3 Security contract

| Vector | Result |
|---|---|
| Absolute path leakage (`C:\\`, `/home/`, `/Users/`, `file://`, UNC) | NO |
| Credential leakage (`apiKey`, `Authorization`, `Bearer`, `secret`, `password`, `credential`) | NO |
| Raw Provider payload leakage | NO |
| Raw `session` / `preparedResult` / `executionResult` / `JSON.stringify` spread | NO |
| Raw `error.message` / stack / cause in view | NO |
| Binary / base64 / data URI leakage | NO |

All 8/8 vectors: NO leakage.

### 13.4 Capability projection (single source)

`view.readiness` capability flags delegate to
`workspace-state.js`'s `isExecuteAllowed` /
`isIntentEditAllowed` / `isPrepareAllowed` /
`isResetAllowed` (P3-A4 spec §5). The view-model does
NOT maintain a parallel rule table.

### 13.5 Stale reasons

`view.staleReasons` is a string list of canonical
codes from the `STALE_REASON` enum:
`intent_changed`, `truth_surface_changed`. No raw
diff, no path, no secret, no provider payload
fragments.

---

## 14. Architecture Guards A-L (P3-A7 frozen)

The 12 canonical Architecture Guard groups (per
P3-A spec §64), locked in by
`tests/runtime-application/packaging-workspace-architecture-guards.test.ts`.
71/71 PASS. These guards are a **frozen part of the
P3-A contract**; future P3-B / P3-C work MUST NOT
delete, weaken, or skip them.

| Group | Name | Cases |
|---|---|---|
| A | Runtime Dependency Boundary | 5 |
| B | Web UI Import Boundary | 5 |
| C | Compiler Boundary (STOP-P3-A-01) | 3 |
| D | Provider Payload Boundary (STOP-P3-A-02) | 3 |
| E | Credential Boundary (STOP-P3-A-03) | 5 |
| F | Frozen P2 Contract Guard (STOP-P3-A-04) | 5 |
| G | Reference Role Authority (STOP-P3-A-05) | 4 |
| H | Reference Precedence (STOP-P3-A-06) | 3 |
| I | Stale Fail-closed (STOP-P3-A-07) | 5 |
| J | Persistence / Leakage (STOP-P3-A-08) | 5 |
| K | Web UI Provider Network (STOP-P3-A-09) | 4 |
| L | Shared Regression (STOP-P3-A-10/11/12) | 6 |
| **A-L Total** | — | **53** |

Additional Authority Guards (P / T / U / V):

| Group | Name | Cases |
|---|---|---|
| P | Additional Authority Guards | 8 |
| T | Public Runtime Export Boundary | 3 |
| U | Workspace Service Orchestrator | 3 |
| V | View Model Projection Invariants | 4 |
| **Additional Total** | — | **18** |

---

## 15. Frozen Fingerprint Authority

Generation identity authority (frozen, single source):

```
P2 frozen metadata.compileFingerprint:
  sourceBundleHash
  userIntentHash
  deliverableHash
  referencePlanHash
  compiledPromptHash
  executionIdentityHash
```

Workspace helpers (NOT generation identity):

```
packagingIntentsEqual    — application semantic equality
computeTruthFingerprint   — truth surface structural equality
```

**Second generation fingerprint authority: NO.**

---

## 16. Authority Ownership Matrix

| Authority | Owner |
|---|---|
| Project state | upstream `project-store` |
| Locked Assets | upstream `Locked-Assets-Service` |
| Reference semantic roles | P2 frozen `reference-policy.js` |
| Reference precedence chain | P2 frozen `reference-policy.js` |
| Provider capability | P2 frozen `provider-capability.js` |
| Credential secret | existing credential store (Shared Core / `node-credential-store`) |
| Run persistence | existing run-store |
| Generation fingerprint | P2 frozen `metadata.compileFingerprint` |
| Workspace state machine | `runtime-core/src/application/packaging/workspace-state.js` |
| Workspace stale orchestration | `runtime-core/src/application/packaging/stale-tracker.js` (+ `intent-schema.js` for data-side comparison) |
| Reference assignment validation | `runtime-core/src/application/packaging/intent-schema.js` |
| Locked-Asset UI projection | `runtime-core/src/application/packaging/lock-assets-projection.js` |
| UI-safe projection | `runtime-core/src/application/packaging/view-model.js` |
| Workspace orchestration | `runtime-core/src/application/packaging/workspace-service.js` |

No second authority is permitted for any of the above.

---

## 17. P3-A8 Acceptance Evidence

P3-A8 Full Regression (per
`docs/packaging/history/p3-a/full-regression-report.md`):

| Suite | Count | Status |
|---|---|---|
| P3-A phase (A2..A7) | 473/473 | PASS |
| Runtime shared | 14/14 | PASS |
| Runtime application | 807/807 | PASS |
| **Combined runtime** | **821/821** | **PASS** |
| Image-generation (P2 frozen) | 972/972 | PASS |
| repo:verify | 40/40 | PASS |
| verify:version-naming | PASS | PASS |
| verify:space-compiler-baseline | 0 failure | PASS |
| verify:space-r8.6-golden-boundary | 0 failure | PASS |
| web:typecheck | PASS | PASS |
| web-runtime:typecheck | PASS | PASS |
| git diff --check | no content errors | PASS |
| git status --porcelain | empty | PASS |
| **Repeat / flake** | runtime:test × 2 + P3-A flake-prone (232) | PASS / PASS / PASS |

The full evidence is recorded at
`docs/packaging/history/p3-a/full-regression-report.md`
and committed at `c434400`.

---

## 18. Canonical STOP-P3-A Matrix (P3-A spec §55)

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

---

## 19. Change-Control Policy (Post-Freeze)

### 19.1 Frozen (requires reopening P3-A)

The following are **FROZEN** and may not be altered as
part of a P3-B / P3-C task:

- P3-A semantic contracts (workspace state meanings,
  stale semantics, capability projection)
- Workspace API surface (5 API + `setTruthSnapshot` +
  `getView` + canonical re-exports)
- Reference role authority boundary (P2 frozen is the
  sole source)
- Reference precedence authority (P2 frozen is the
  sole source)
- Locked Asset authority boundary (no second authority
  permitted)
- View Model security contract (no path / credential /
  payload leakage)
- Runtime dependency direction (Workspace → P2 public
  facade only)
- Architecture Guards A-L (71 cases; no deletion, no
  weakening, no skipping)
- P2 frozen integration boundary (16 protected paths)

### 19.2 Procedure for a frozen change

1. Open a corrective sub-phase (P3-A-reopen or
   similar). State the STOP-P3-A condition(s) being
   deliberately triggered.
2. Apply the minimal production / test / docs change.
3. Re-run the full P3-A8 regression surface (P3-A phase
   + runtime + image-generation + repo:verify + space
   baseline + visual analysis + web typecheck).
4. Re-confirm the P3-A7 Architecture Guards A-L 71/71.
5. Re-publish this Freeze Report with a new SHA chain.

---

## 20. P3-B Allowed Scope

P3-B (Packaging Workspace React UI) may:

- Add `apps/web/src/features/packaging/` React components
- Add layout / interaction / loading / error display
- Add reference selection UI (consuming
  `view.references`)
- Add locked-asset read-only display (consuming
  `view.lockedAssets`)
- Add prepare / execute / reset controls (consuming
  `readiness.canPrepare` / `canExecute` / `canReset`)
- Add result display (consuming `view.execution`)
- Add RPC binding (consume the existing Shared Runtime
  RPC; do not bypass it)

All P3-B code must consume the public barrel
`@masterpiece/runtime-core` (per §8). The Architecture
Guards A-L lock in this boundary; P3-B tests that
violate the boundary will fail.

---

## 21. P3-B Prohibited Scope

P3-B MUST NOT:

- Modify P3-A frozen semantics
- Deep-import `packages/image-generation-runtime/...`
- Call the Provider network directly (no fetch /
  Provider SDK / direct Provider URL)
- Read credentials (no `node-credential-store` /
  `readCredentials` / `process.env.*KEY`)
- Create a second state machine
- Create a second stale engine
- Create a second Reference role authority
- Create a second precedence engine
- Create a second Locked Asset authority
- Bypass the Workspace service to call
  `preparePackagingGeneration` / `executePackagingGeneration`
  directly
- Spread the raw session / preparedResult / executionResult
- Modify any file under
  `packages/runtime-core/src/application/packaging/`
  except for an explicit freeze-reopen sub-phase

---

## 22. P3-B Unlock Conditions (P3-A9 verification)

| Condition | Status |
|---|---|
| P3-A8 Full Regression PASS | **YES** |
| P2 frozen modules unchanged since baseline | **YES** |
| P3-A7 Architecture Guards A-L 71/71 PASS | **YES** |
| Canonical STOP-P3-A 12/12 NOT TRIGGERED | **YES** |
| Working tree clean | **YES** |
| Freeze report committed (this document) | **YES** (at P3-A9 HEAD) |
| Origin synchronized | **YES** (local == origin) |

All 7/7 conditions met. **P3-B is UNLOCKED.**

---

## 23. Final Baseline Declaration

| Baseline | SHA | Role |
|---|---|---|
| P2 frozen code baseline | `335405342951fedae5d4d6816444c2b4d2402787` | The P2 frozen protected paths (16 files / directories). Unchanged since P3-A1. |
| P3-A Production Implementation Baseline | `dd4570a` | Last commit that modified P3-A production application code (P3-A6 Reference / Locked Asset Contract). |
| P3-A Tested Architecture Baseline | `930f9d0` | P3-A6 production + P3-A7 Architecture Guards A-L (test-only). This is the version P3-A8 ran against. |
| P3-A Full Regression Acceptance Evidence | `c434400` | docs-only regression report. Acceptance evidence for the freeze. |
| P3-A Freeze Record Commit | (this commit) | docs-only historical freeze declaration. |

`local HEAD == origin HEAD == c434400` (pre-P3-A9
verification). After P3-A9, both will advance together
to the P3-A9 commit SHA.

---

## 24. Sign-off

| Field | Value |
|---|---|
| **P3-A STATUS** | **FROZEN** |
| **P3-B STATUS** | **UNLOCKED** |
| Effective | P3-A9 commit (this docs-only commit) |
| Pre-freeze verification | repo:verify 40/40 + version-naming PASS + P3-A7 guards 71/71 + git diff --check clean + git status clean |
| P2 frozen diff vs baseline | NO (16 protected paths) |
| Production diff vs `dd4570a` | 0 (P3-A7 + P3-A8 + P3-A9 = 0 production changes) |

P3-A is hereby declared **FROZEN**. P3-B is
**UNLOCKED** and may begin against the contract
recorded in this report.
