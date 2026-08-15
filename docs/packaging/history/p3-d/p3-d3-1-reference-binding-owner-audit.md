# P3-D3.1 — Reference-First Translation Slot Binding Owner Audit

**Date:** 2026-08-15
**Branch:** `codex/visual-analysis-a1-multi-provider`
**Start HEAD:** `27ac7be39a97d94538ab4dd6560f2a4ce57c6ed7` (P3-D3.1 §3 archive clarification HEAD)
**Phase Class:** Owner audit only (read-only)
**Real Provider HTTP calls:** 0
**Production source changes:** 0
**Test source changes:** 0
**API key read:** 0
**New guards added:** 0
**Golden update:** 0

---

## A. Git

| Field | Value |
|---|---|
| Branch | `codex/visual-analysis-a1-multi-provider` |
| Start HEAD | `27ac7be39a97d94538ab4dd6560f2a4ce57c6ed7` |
| HEAD at audit end | `27ac7be39a97d94538ab4dd6560f2a4ce57c6ed7` (DOC-ONLY audit, no commit yet) |
| Audit commit | this commit (`docs(packaging): audit reference-first binding owner`) |

This audit commit is **DOC-ONLY**. No production source change, no test change, no guard addition, no Provider call, no API key read.

---

## B. P3-D3.1 §3 Mandatory Archive Clarification Consumed

§3 archive clarification at `27ac7be` (consumed as prerequisite of this audit):

- §3.1 reference-first summary: CALL-02 / CALL-04 did **not** reach Provider
- §3.2 provider request accounting: distinct terms (5 attempted, 3 reached Provider, 2 prepare failure, 1 direct probe, 0 images)
- §3.3 credential wording: universal claim removed, safe canonical statement used

The §3 clarification is the prerequisite that allows this audit to focus on the **Reference binding owner** without ambiguity about which calls reached the Provider and which did not.

---

## C. Failing Fixture

- **Project:** `9e6158f0-33d2-4d95-9039-7592237938a8` (良方草本, D3 sanctioned fixture, NOT a real user project)
- **Mode:** `reference_first`
- **RERUN-CALL-02 (PKG-HERO-SINGLE, 1 ref):** FAILED at `prepare-generation` with `REFERENCE_REQUIRED: reference_required_in_reference_first`
- **RERUN-CALL-04 (PKG-GIFT-OPEN, 1 ref):** FAILED at `prepare-generation` with `REFERENCE_REQUIRED: reference_required_in_reference_first`
- **Reference asset:** `a02b332c-5317-49ca-8adc-24ea836a5f73` (sanctioned project's first auto-imported source asset, present in `locked-assets/items/` and `input/assets/`)
- **Project binding:** `asset.projectId == 9e6158f0`, current `projectId == 9e6158f0` ✓
- **Provider HTTP calls in failing cases:** 0 (both terminated at `prepare-generation`)

The Provider was never contacted for the 2 reference_first cases. The defect is upstream of the Provider call, at the Workspace intent → Translation → Reference Policy seam.

---

## D. Reproduction

A read-only scratch driver under `.codex-smoke/audit-p3-d3-1/` (gitignored) exercises the canonical production path in 4 ways:

| Path | Input shape | Result |
|---|---|---|
| **A** D3 RE-RUN driver shape (wrong field name, dropped by allowlist) | `referencePolicy.references: []` (after the D3 driver's `referenceAssetIds` field is silently dropped by `updateIntent` because it is not in the 6-key allowlist) | throws `REFERENCE_REQUIRED: reference_required_in_reference_first` |
| **B** Canonical Workspace intent path (correct field) | `referenceAssignments: [{ assetId, role: 'structure_reference', source: 'user' }]` projected via `projectReferenceAssignmentsToPolicy` → `referencePolicy.references: [{ assetId, role, source }]` | `createPackagingTranslation` returns OK with `translation.referencePolicy.references.length === 1` and `count === 1` |
| **C** Direct validator with empty references | `resolveReferencePolicy({ generationMode: 'reference_first', referencePolicy: { references: [] } })` | `validateReferencePolicy` throws `REFERENCE_REQUIRED: reference_required_in_reference_first` |
| **D** Direct validator with one canonical reference | `resolveReferencePolicy({ generationMode: 'reference_first', referencePolicy: { references: [{ assetId, role, source }] } })` | `validateReferencePolicy` does NOT throw; `references.length === 1`, `count === 1` |

The reproduction log is written to `.codex-smoke/audit-p3-d3-1/reproduction-log.txt` (gitignored). All 4 paths match expectations.

Key empirical finding: **Path B (the canonical Workspace intent shape) succeeds, while Path A (the D3 RE-RUN driver's shape) fails**. This is consistent with the production code's documented contract: `referencePolicy.references` must be a non-empty array of `{ assetId, role, source }` for `reference_first`.

---

## E. RB-01 → RB-10 Reference Binding Trace

The trace follows one canonical failing `reference_first` case (RERUN-CALL-02, project `9e6158f0`, reference asset `a02b332c-…`, mode `reference_first`, shot `PKG-HERO-SINGLE`). All references to `intent.X` use the Workspace intent after `updateIntent` has been called by the D3 RE-RUN driver with `patch: { referenceAssetIds: [...] }` (the actual D3 driver shape).

### RB-01 — Workspace intent (Workspace layer)

| Field | Value |
|---|---|
| Boundary ID | RB-01 |
| Owner | Workspace service (`workspace-service.js`) — `updateIntent` |
| Source | `packages/runtime-core/src/application/packaging/workspace-service.js:447` |
| Function | `updateIntent(sessionId, patch)` |
| Input field name | `patch.referenceAssetIds` (D3 driver shape) |
| Input value | `['a02b332c-5317-49ca-8adc-24ea836a5f73']` (flat string array) |
| Output field name | `state.intent.referenceAssignments` (the **only** canonical Reference field in the Workspace intent) |
| Output value | `[]` (default from `createDefaultPackagingIntent()`; never overwritten) |
| Project | `9e6158f0-33d2-4d95-9039-7592237938a8` ✓ |
| Producer run | (not set) |
| Source fingerprint | (not set) |
| Reference asset id | `a02b332c-…` (in patch; not in intent) |
| Reference role | (not set in patch) |
| generationMode | `reference_first` (in patch) ✓ |
| Reference present? | NO (intent has no `referenceAssignments`) |
| Project-bound? | N/A |
| Renamed? | YES — `referenceAssetIds` (driver) → never written to `referenceAssignments` (Workspace intent) |
| Filtered? | YES — silently dropped by the 6-key allowlist at line 466-473 |
| Replaced? | NO |
| Verdict | **BROKEN — the D3 driver's field name is not in the Workspace intent's canonical allowlist. The production `updateIntent` correctly drops the unknown field; the intent's canonical `referenceAssignments` remains the default empty array.** |

The Workspace service's `updateIntent` enforces a 6-key allowlist (line 466-473 of `workspace-service.js`):

```js
const allowedKeys = new Set([
  'generationMode',
  'shotContractId',
  'explicitUserConstraints',
  'referenceAssignments',
  'providerModelId',
  'apiProfileId',
]);
const next = { ...state.intent };
for (const key of Object.keys(patch)) {
  if (!allowedKeys.has(key)) continue;  // silently dropped
  next[key] = patch[key];
}
```

The D3 RE-RUN driver's `patch.referenceAssetIds` is NOT in the allowlist, so it is silently dropped. The intent's `referenceAssignments` is never set by the D3 driver.

### RB-02 — active Reference source (Workspace layer projection)

| Field | Value |
|---|---|
| Boundary ID | RB-02 |
| Owner | `projectIntentToTranslationInput` (workspace-service.js:230) |
| Source | `packages/runtime-core/src/application/packaging/workspace-service.js:230-280` |
| Function | `projectIntentToTranslationInput({ intent, truthSnapshot, now })` |
| Input field name | `intent.referenceAssignments` |
| Input value | `undefined` (D3 driver never set it; default intent has `referenceAssignments: []`) |
| Output field name | `referencePolicy.references` |
| Output value | `[]` (empty array propagated verbatim from `intent.referenceAssignments`) |
| Project | `9e6158f0` (preserved from intent) |
| Producer run | (none) |
| Source fingerprint | (none) |
| Reference asset id | (none) |
| Reference role | (none) |
| generationMode | `reference_first` (preserved) |
| Reference present? | NO |
| Project-bound? | N/A |
| Renamed? | NO |
| Filtered? | NO |
| Replaced? | NO |
| Verdict | **DOWNSTREAM CONSEQUENCE** — RB-01 left `intent.referenceAssignments` empty. RB-02 faithfully projects that empty array to `referencePolicy.references`. The projection itself is correct. |

### RB-03 — P3-C canonical selector input

| Field | Value |
|---|---|
| Boundary ID | RB-03 |
| Owner | (no separate selector exists for Reference-First; the Workspace intent's `referenceAssignments` is the only Reference-First entry point into the P2 frozen Translation) |
| Source | N/A |
| Verdict | **DOWNSTREAM CONSEQUENCE** — there is no separate P3-C Reference selector; the canonical Reference surface is the Workspace intent's `referenceAssignments` array, which is already empty due to RB-01. |

### RB-04 — P3-C selected referenceFirst slot

| Field | Value |
|---|---|
| Boundary ID | RB-04 |
| Owner | `projectReferenceAssignmentsToPolicy` (reference-assignments.js:82) |
| Source | `packages/runtime-core/src/application/packaging/reference-assignments.js:82-102` |
| Function | `projectReferenceAssignmentsToPolicy({ generationMode, assignments, providerCapability })` |
| Input field name | `assignments` (= `intent.referenceAssignments`) |
| Input value | `[]` (empty) |
| Output field name | `policy.references` |
| Output value | `[]` (resolved policy with empty references) |
| Project | (preserved) |
| Producer run | (none) |
| Source fingerprint | (none) |
| Reference asset id | (none) |
| Reference role | (none) |
| generationMode | `reference_first` |
| Reference present? | NO |
| Project-bound? | N/A |
| Renamed? | NO |
| Filtered? | NO |
| Replaced? | NO |
| Verdict | **DOWNSTREAM CONSEQUENCE** — the projection correctly turns empty `assignments` into empty `policy.references`. The function's contract is correct; the input was already empty. |

### RB-05 — PackagingTranslationV2 producer output

| Field | Value |
|---|---|
| Boundary ID | RB-05 |
| Owner | `createPackagingTranslation` (translation.js:380) |
| Source | `packages/image-generation-runtime/src/packaging/translation.js:380-433` |
| Function | `createPackagingTranslation(input)` |
| Input field name | `input.referencePolicy.references` |
| Input value | `[]` (empty) |
| Output field name | `translation.referencePolicy.references` |
| Output value | `[]` (empty) |
| Reference present? | NO |
| generationMode | `reference_first` (preserved) |
| Verdict | **DOWNSTREAM CONSEQUENCE** — the canonical Translation shape carries the empty references array verbatim. The Translation producer does not invent References. |

### RB-06 — translation assembly input

| Field | Value |
|---|---|
| Boundary ID | RB-06 |
| Owner | `buildReferencePolicy` (translation.js:296) |
| Source | `packages/image-generation-runtime/src/packaging/translation.js:296-330` |
| Function | `buildReferencePolicy(input, generationMode)` |
| Input field name | `input.referencePolicy.references` |
| Input value | `[]` (empty) |
| Output field name | (delegated to `resolveReferencePolicy`) |
| Reference present? | NO |
| Verdict | **DOWNSTREAM CONSEQUENCE** — the wrapper correctly forwards the empty `input.referencePolicy.references` to `resolveReferencePolicy`. |

### RB-07 — `buildReferencePolicy` input

| Field | Value |
|---|---|
| Boundary ID | RB-07 |
| Owner | `resolveReferencePolicy` (reference-policy.js:163) |
| Source | `packages/image-generation-runtime/src/packaging/reference-policy.js:163-263` |
| Function | `resolveReferencePolicy({ generationMode, referencePolicy, providerCapability })` |
| Input field name | `referencePolicy.references` |
| Input value | `[]` (empty) |
| Output field name | `resolved.references` |
| Output value | `[]` |
| Fatal issues | `['reference_required_in_reference_first']` (line 227-231 of reference-policy.js) |
| Verdict | **BROKEN — but the production owner is correct. The fatal issue fires because the upstream RB-01 broke the field-name projection. The production `resolveReferencePolicy` correctly fail-closes on empty references in `reference_first` mode (P2 spec §15 + P2-C pre-conditions).** |

The exact condition that fires the fatal issue (line 227-231 of reference-policy.js):

```js
if (enabled && required && generationMode === 'reference_first' && references.length === 0) {
  const issue = 'reference_required_in_reference_first';
  issues.push(issue);
  fatal.push(issue);
}
```

`enabled` defaults to `true` for `reference_first`. `required` defaults to `enabled`. `generationMode === 'reference_first'`. `references.length === 0` because RB-01 left the intent's `referenceAssignments` empty.

### RB-08 — `buildReferencePolicy` output

| Field | Value |
|---|---|
| Boundary ID | RB-08 |
| Owner | `resolveReferencePolicy` (same) |
| Output field name | `resolved.fatal[0]` |
| Output value | `'reference_required_in_reference_first'` |
| Verdict | **DOWNSTREAM CONSEQUENCE** — the fatal issue is correctly identified. The error code mapping is at line 282-289 of reference-policy.js. |

### RB-09 — `validateReferencePolicy` input

| Field | Value |
|---|---|
| Boundary ID | RB-09 |
| Owner | `validateReferencePolicy` (reference-policy.js:277) |
| Source | `packages/image-generation-runtime/src/packaging/reference-policy.js:277-297` |
| Function | `validateReferencePolicy(resolved)` |
| Input field name | `resolved.fatal[0]` |
| Input value | `'reference_required_in_reference_first'` |
| Output field name | `err.code` (thrown) |
| Output value | `'REFERENCE_REQUIRED'` |
| Verdict | **BROKEN — but the production owner is correct. The validator correctly maps the fatal issue to the canonical P2 spec §32 code `REFERENCE_REQUIRED`. The canonical error code is exposed at line 51 of reference-policy.js and the workspace-service canonical error code table (line 200) re-exports it. The throw is the documented fail-closed contract.** |

### RB-10 — P2 prepare result

| Field | Value |
|---|---|
| Boundary ID | RB-10 |
| Owner | `preparePackagingGeneration` (generation-service.js:347) |
| Source | `packages/image-generation-runtime/src/packaging/generation-service.js:347-403` |
| Function | `preparePackagingGeneration(input, deps)` |
| Input field name | (the `REFERENCE_REQUIRED` error from RB-09) |
| Input value | `Error { code: 'REFERENCE_REQUIRED', fatal: ['reference_required_in_reference_first'] }` |
| Output field name | (thrown out of `buildReferencePolicy` call inside `createPackagingTranslation`) |
| Output value | `Error { code: 'REFERENCE_REQUIRED' }` (propagated) |
| Verdict | **DOWNSTREAM CONSEQUENCE** — the prepare layer correctly propagates the canonical `REFERENCE_REQUIRED` error from the P2 frozen Translation. The workspace-service catches it at line 591 and wraps it as `PACKAGING_WORKSPACE_PREPARE_FAILED: REFERENCE_REQUIRED: reference_required_in_reference_first` (the error code is preserved by the canonical-error-code map at line 200-208). |

---

## F. Reference Representation Contract (canonical)

The canonical Reference representation at the production seam is:

```js
referencePolicy.references: Array<{
  assetId: string,        // required, non-empty after trim
  role: string,           // required, must be one of the 6 P2 frozen roles
  source: string,         // optional, defaults to 'user'
  includeReason?: string, // optional
}>
```

Per `reference-policy.js:179-222`, the resolver accepts ONLY this shape. The legacy P2-A `referencePolicy.roles` list shape is **NO LONGER accepted** (per the comment at line 134-136).

The canonical 6 Reference roles (frozen, P2 spec §14) are:

```
high_fidelity_visual_reference
structure_reference
material_reference
composition_reference
style_reference
product_identity_reference
```

---

## G. Role Mapping Contract

- The canonical role is a string in the frozen 6-role set.
- The role is supplied by the **Workspace intent's `referenceAssignments[].role`** field, which is the only owner.
- The role is preserved through `projectReferenceAssignmentsToPolicy` (reference-assignments.js:51-61 strips UI-only fields but keeps `role`).
- The role is validated by `resolveReferencePolicy` against `REFERENCE_ROLE_SET` (reference-policy.js:73).
- The 6-key Workspace intent allowlist does **not** silently substitute or re-derive the role.
- No second role mapping exists in the production code path (verified across the trace).

---

## H. TranslationV2 Contract (PackagingTranslation)

The canonical Translation shape (translation.js:396-421) carries:

```js
translation = {
  schemaVersion: '1.0',
  translationVersion: PACKAGING_TRANSLATION_VERSION, // 1.0.0
  target: 'packaging',  // fixed
  generationMode: 'reference_first' | 'analysis_led',
  shotContract: { ... },
  projectIdentity: { ... },
  lockedAssets: { ... },
  structure: { ... },
  visualDirection: { ... },
  colorSystem: { ... },
  motifSystem: { ... },
  materialSystem: { ... },
  composition: { ... },
  lighting: { ... },
  camera: { ... },
  sceneProgram: { ... },
  referencePolicy: {
    enabled: boolean,
    required: boolean,
    references: Array<{ assetId, role, source, includeReason? }>,
    count: number,                       // derived, single source of truth
    precedence: string[],                // frozen
    providerCapability: { referenceSupport, maxReferenceImages? },
  },
  negativeConstraints: [],
  providerHints: { referenceCount, referenceRolePriority, ... },
  provenance: { sourceMode, inputSources, createdAt },
};
```

The Translation shape does have a first-class `referencePolicy.references` field. The Translation producer is a CONSUMER of the Reference input, not a parallel authority.

---

## I. `buildReferencePolicy` Contract

Per translation.js:296-330, `buildReferencePolicy(input, generationMode)`:

1. Reads `input.referencePolicy` (the P2 frozen shape).
2. Reads `input.providerCapability`.
3. Calls `resolveReferencePolicy({ generationMode, referencePolicy, providerCapability })`.
4. Calls `validateReferencePolicy(resolved)` — this **throws** the canonical `REFERENCE_REQUIRED` / `REFERENCE_ROLE_INVALID` / `REFERENCE_UNSUPPORTED` code on any fatal issue.
5. Returns the resolved policy verbatim.

The expected input field name is `referencePolicy.references` (array). No other field name is consulted.

---

## J. `validateReferencePolicy` Condition for `REFERENCE_REQUIRED`

Per reference-policy.js:227-231:

```js
if (enabled && required && generationMode === 'reference_first' && references.length === 0) {
  const issue = 'reference_required_in_reference_first';
  issues.push(issue);
  fatal.push(issue);
}
```

The condition is satisfied when:
- `enabled` is `true` (default for `reference_first`)
- `required` is `true` (default for `enabled`)
- `generationMode === 'reference_first'`
- `references.length === 0` (the array is empty)

The error code mapping is at line 282-289:

```js
const first = resolved.fatal[0];
let code = REFERENCE_ROLE_INVALID;
if (first === 'reference_required_in_reference_first') code = REFERENCE_REQUIRED;
```

The `REFERENCE_REQUIRED` code is re-exported at line 51 of `reference-policy.js` and re-exported by `workspace-service.js:200` for the canonical error code table.

---

## K. `generationMode` Continuity

| Boundary | generationMode | Status |
|---|---|---|
| RB-01 (intent) | `reference_first` (set by D3 driver) | ✓ preserved |
| RB-02 (projection) | `reference_first` (preserved) | ✓ preserved |
| RB-04 (assignment projection) | `reference_first` (preserved) | ✓ preserved |
| RB-05 (Translation shape) | `reference_first` (preserved) | ✓ preserved |
| RB-07 (resolveReferencePolicy) | `reference_first` (preserved) | ✓ preserved |
| RB-10 (prepare result) | `reference_first` (preserved) | ✓ preserved |

No mode drift. `reference_first` survives every boundary unchanged.

---

## L. Project Binding

| Layer | Project ID | Notes |
|---|---|---|
| Workspace intent | `9e6158f0` | (set by `createSession`) |
| Reference asset | `9e6158f0` (project-bound) | present in `locked-assets/items/a02b332c…/project.json` |
| Producer run | (not set in D3 driver; the sanctioned project has no producer run) | N/A for this audit |
| Active source project | `9e6158f0` (intent) | matches |

Project binding is consistent across all layers. The cross-project authority would fire only if a different project's asset were used; this is not the case here.

---

## M. Source Fingerprint Binding

- The reference asset's producer semantic fingerprint is **not set** in the D3 RE-RUN driver; the driver only stored `referenceAssetId` (singular) in `meta.json`.
- The canonical Workspace intent's `referenceAssignments[]` does not carry a `fingerprint` field per the contract in reference-assignments.js:51-61 (the role-preserving strip function). The fingerprint is held upstream of the Workspace intent (in the project's reference asset metadata).
- The Workspace intent's `referenceAssignments[]` is the only Reference surface for the Validator; the fingerprint is not a Validator input.

No fingerprint binding defect at the Workspace seam.

---

## N. Negative Authority Map (what still fails closed after any future fix)

The following negative cases still fail closed and MUST remain closed:

| Negative case | Authority | Path |
|---|---|---|
| Missing Reference in `reference_first` | `resolveReferencePolicy` line 227-231 → `REFERENCE_REQUIRED` | RB-07 / RB-09 |
| Missing `assetId` in a reference | `resolveReferencePolicy` line 189-193 → `reference_asset_id_missing` | RB-07 |
| Missing `role` in a reference | `resolveReferencePolicy` line 201-205 → `reference_role_missing` | RB-07 |
| Invalid `role` (not in frozen 6-role set) | `resolveReferencePolicy` line 207-211 → `reference_role_invalid` | RB-07 |
| Duplicate `assetId` | `resolveReferencePolicy` line 195-199 → `reference_asset_id_duplicate` | RB-07 |
| Provider doesn't support references | `resolveReferencePolicy` line 235-238 → `reference_unsupported_by_provider` | RB-07 |
| Count > provider `maxReferenceImages` | `resolveReferencePolicy` line 240-244 → `PROVIDER_CAPABILITY_MISMATCH` | RB-07 |
| Cross-project reference asset | Workspace service `setTruthSnapshot` (project binding enforced by project state store) | upstream of RB-01 |
| Revoked active Reference source | Workspace service `setTruthSnapshot` (the truth snapshot's lockedAssets is the only authority) | upstream of RB-01 |
| Stale Workspace (P3-A12) | `computeStale` (workspace-service.js:374) → STALE_REJECTED | upstream of RB-01 |
| Reference count > 10 (D-PROVIDER-01 cap) | `validateReferencePolicy` (count comes from `references.length`; provider capability gate at generation-service.js:364-373) | RB-07 / capability gate |

All negative authorities are correctly preserved. The production Reference Policy surface is fail-closed on every documented negative case.

---

## O. Last Known Good Boundary

**RB-01 IS the last known good boundary** — the Workspace intent surface.

The Workspace intent contract is correct:
- 6-key allowlist enforces canonical fields
- `referenceAssignments` is the only Reference surface
- Unknown fields are silently dropped (this is documented behavior; per `validatePackagingIntent`)

The Workspace intent seam correctly accepts the canonical shape and correctly rejects non-canonical shapes. No production defect at RB-01.

---

## P. First Broken Boundary

**The first broken boundary is at the D3 RE-RUN DRIVER → Workspace intent seam (caller-side).**

The D3 RE-RUN driver (`.codex-smoke/p3-d3-rerun/execute-rerun.mjs:357`) sent:

```js
patch: {
  apiProfileId: PROFILE_ID,
  providerModelId: REGISTRY_MODEL_ID,
  generationMode: target.mode,
  shotContractId: target.shot,
  referenceAssetIds: target.refs > 0 ? [target.refAssetId] : [],  // ← WRONG FIELD NAME + WRONG SHAPE
}
```

The Workspace intent allowlist at workspace-service.js:466-473 only accepts:

```
generationMode, shotContractId, explicitUserConstraints,
referenceAssignments, providerModelId, apiProfileId
```

`referenceAssetIds` is **NOT** in the allowlist. The Workspace `updateIntent` correctly dropped the unknown field at line 476. The intent's canonical `referenceAssignments` was never populated.

**Exact lost / misbound field**: `patch.referenceAssetIds` (the D3 driver's flat string array `['a02b332c-…']`) was the wrong field name and the wrong shape. The canonical Workspace intent field is `referenceAssignments` (an array of `{ assetId, role, source }` objects).

**What would have succeeded**: If the D3 driver had sent:

```js
patch: {
  ...
  referenceAssignments: target.refs > 0
    ? [{ assetId: target.refAssetId, role: 'structure_reference', source: 'user' }]
    : [],
}
```

then `updateIntent` would have accepted the field, `intent.referenceAssignments` would have been populated with one canonical assignment, and `preparePackagingGeneration` would have produced a translation with `referencePolicy.references.length === 1` and `count === 1`. The `REFERENCE_REQUIRED` fatal would not have fired.

**Empirically verified**: the reproduction script in `.codex-smoke/audit-p3-d3-1/reproduce-both-paths.mjs` demonstrates this end-to-end. Path A (D3 driver shape) fails with `REFERENCE_REQUIRED`. Path B (canonical `referenceAssignments` shape) succeeds with `references.length === 1`.

---

## Q. Exact Root Cause

The exact root cause is **at the caller (D3 RE-RUN driver) of the Workspace intent's `updateIntent` operation**:

1. The D3 RE-RUN driver used the field name `referenceAssetIds` (flat string array).
2. The Workspace intent's `updateIntent` allowlist does not include `referenceAssetIds`.
3. `updateIntent` correctly dropped the unknown field.
4. The intent's canonical `referenceAssignments` remained the default empty array.
5. The P2 frozen `resolveReferencePolicy` correctly fired `REFERENCE_REQUIRED` because the intent's `referenceAssignments` is empty in `reference_first` mode.

**The production code is correct at every layer. The D3 RE-RUN driver violated the Workspace intent's contract.**

---

## R. Corrective Owner Classification

Per the §24 owner candidate classification:

> **E. Workspace intent → canonical reference projection owner**

The defect is at the Workspace intent seam, but the **production owner is correct**. The defect is in the **caller** (D3 RE-RUN driver), which used a non-canonical field name. The production `updateIntent` allowlist, `projectIntentToTranslationInput`, `projectReferenceAssignmentsToPolicy`, `createPackagingTranslation`, `buildReferencePolicy`, `resolveReferencePolicy`, and `validateReferencePolicy` all behave correctly per their documented contracts.

**No production owner is broken.** The production owner at the Workspace intent seam (the 6-key allowlist) is correct.

---

## S. Downstream Consequences (no separate corrective required)

| Boundary | Consequence | Verdict |
|---|---|---|
| RB-02 | empty `intent.referenceAssignments` projected to empty `referencePolicy.references` | DOWNSTREAM CONSEQUENCE |
| RB-03 | no separate Reference selector exists for `reference_first` | N/A |
| RB-04 | empty `assignments` projected to empty `policy.references` | DOWNSTREAM CONSEQUENCE |
| RB-05 | Translation shape carries empty `referencePolicy.references` | DOWNSTREAM CONSEQUENCE |
| RB-06 | `buildReferencePolicy` forwards empty `references` to `resolveReferencePolicy` | DOWNSTREAM CONSEQUENCE |
| RB-07 | `resolveReferencePolicy` fires fatal `reference_required_in_reference_first` | DOWNSTREAM CONSEQUENCE (production owner is correct) |
| RB-08 | `resolved.fatal[0]` is `'reference_required_in_reference_first'` | DOWNSTREAM CONSEQUENCE |
| RB-09 | `validateReferencePolicy` throws `REFERENCE_REQUIRED` (canonical mapping) | DOWNSTREAM CONSEQUENCE (production owner is correct) |
| RB-10 | `preparePackagingGeneration` propagates `REFERENCE_REQUIRED`; workspace service wraps as `PACKAGING_WORKSPACE_PREPARE_FAILED: REFERENCE_REQUIRED: reference_required_in_reference_first` | DOWNSTREAM CONSEQUENCE (production owner is correct) |

Every layer from RB-02 to RB-10 is a downstream consequence of the RB-01 field-name mismatch. The production code at every layer is correct.

---

## T. Production Source Changes

**0** — this audit is read-only. No production source was modified.

The production code at the Workspace intent seam, the P2 frozen Translation layer, the Reference Policy validator, and the prepare / execute paths is correct per the documented contracts.

---

## U. Test Source Changes

**0** — this audit is read-only. No test source was modified.

The reproduction in `.codex-smoke/audit-p3-d3-1/reproduce-both-paths.mjs` is a sanctioned local runtime scratch script in a gitignored directory. It is not part of the test suite and is not committed to a tracked test file.

---

## V. Recommended Narrow Corrective Scope (NOT STARTED in this audit)

If a future corrective is required to make a re-run succeed with `reference_first`, the corrective is **NOT in production code**. It is in the **D3 RE-RUN driver (or any future re-run driver) that calls `packaging:update-intent`**.

The recommended change is in the test/sandbox driver, not in any production source:

```js
// In .codex-smoke/p3-d3-rerun/execute-rerun.mjs (line 357) or any future re-run driver:
// BEFORE (broken):
patch: {
  ...
  referenceAssetIds: target.refs > 0 ? [target.refAssetId] : [],
}

// AFTER (correct):
patch: {
  ...
  referenceAssignments: target.refs > 0
    ? [{ assetId: target.refAssetId, role: 'structure_reference', source: 'user' }]
    : [],
}
```

This corrective is **NOT a P3-D3.1 production corrective**. It is a test/sandbox script fix that belongs to a future D3 RE-RUN setup phase, if and only if a future D3 RE-RUN is authorized.

Per §30: "即使 owner 非常明确，也不要：修改 production、新增 AY tests、进入 readiness、调用 Provider。只报告：CORRECTIVE READY，等待新的明确人工授权。"

This audit does not start the corrective. It only documents the finding.

---

## W. Final Decision

Per §29 decision options:

> **A. OWNER AUDIT: PASS + CORRECTIVE READY (caller-side, not production-side)**

| Item | Value |
|---|---|
| OWNER AUDIT | **PASS** |
| FIRST BROKEN BOUNDARY | **D3 RE-RUN driver → Workspace intent seam (caller-side field-name mismatch)** |
| CORRECTIVE OWNER (production) | **NONE — production code is correct at every layer** |
| CORRECTIVE OWNER (test/sandbox) | **D3 RE-RUN driver (`.codex-smoke/p3-d3-rerun/execute-rerun.mjs:357`)** — caller-side field-name fix only |
| P3-D3.1 PRODUCTION CORRECTIVE | **NOT REQUIRED** (production code is correct; no production change is needed) |
| P3-D3.1 READINESS DOCS | **NOT STARTED in this audit** (per §30: do not start automatically) |
| P3-D3.1 AY GUARDS | **NOT STARTED in this audit** (per §30: do not start automatically) |
| P3-D3 STATUS | **HOLD — PROVIDER EXECUTION GAP (credential rejected) + TRANSLATION-SLOT REFERENCE BINDING DEFECT (re-classified: caller-side misconfiguration, not production defect)** |
| P3-D4 | **LOCKED** |
| P3-E | **LOCKED** |

The D-TRANSLATION sub-class of the P3-D3 HOLD is re-classified: it was caused by a caller-side field-name mismatch in the D3 RE-RUN driver, not by any production code defect. The D-PROVIDER sub-class is unchanged (Provider-side credential rejection).

A future D3 RE-RUN, if authorized, must use the canonical `referenceAssignments` field shape; the canonical path is empirically verified to succeed in the reproduction script.

---

## X. Working Tree and Local / Remote

| Item | Value |
|---|---|
| Working tree (this audit) | EMPTY (after this DOC-ONLY audit commit) |
| Local HEAD | this commit (audit commit) |
| Remote HEAD | this commit (audit commit, after push) |
| Local == Remote | MATCH (post-push) |

---

## Y. STOP

This audit ends here. The §4 (Corrective Scope), §6 (Canonical Reference Authority production change), §21 (AY guards), and §32 (readiness docs) are **NOT started** by this audit, per §30.

The next step (if and only if explicitly authorized) is for any future D3 RE-RUN driver fix to use the canonical `referenceAssignments` field shape, and for the P3-D3 HOLD to be re-evaluated under a future D3 RE-RUN authorization.

**No automatic remediation. No production change. No Provider call. STOP.**
