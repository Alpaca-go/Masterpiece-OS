# P3-D3.2 — D3 Re-Run Harness Canonical Reference Assignment & Offline Readiness

**Date:** 2026-08-15
**Branch:** `codex/visual-analysis-a1-multi-provider`
**Start HEAD:** `a942a6fc4c5d9e52afb9c6ab692f326222e55cae` (P3-D3.1 owner audit HEAD)
**Phase Class:** TEST / SANDBOX / READINESS (not a production corrective, not a P2/P3-A/P3-C reopen, not a D3 real-provider benchmark)
**External Provider HTTP calls:** 0
**Live image generation:** 0
**Production source changes:** 0
**Test source changes:** 1 (this AZ guard test file)
**New guards:** AZ-01..AZ-30
**Golden update:** 0
**API key read:** 0

---

## A. Git

| Stage | Commit | Class |
|---|---|---|
| P3-D3.1 owner audit | `a942a6fc4c5d9e52afb9c6ab692f326222e55cae` | docs only (owner audit) |
| **P3-D3.2 (1/N) AZ guards** | `<new SHA>` | test only (packaging-d3-rerun-harness-readiness.test.ts) |
| **P3-D3.2 (2/N) docs** | `<new SHA>` | docs only (this document) |

Production source changes: 0. Working tree after the P3-D3.2 commits is empty. Local == Remote (post-push).

---

## B. Owner Audit Consumed

P3-D3.1 owner audit (`a942a6f`, `docs/packaging/history/p3-d/p3-d3-1-reference-binding-owner-audit.md`) is the prerequisite of this readiness phase. It proved:

- **Production Reference binding path: CORRECT.**
- **Production corrective: NOT REQUIRED.**
- **First broken boundary:** D3 RE-RUN driver → Workspace intent seam (caller-side field-name mismatch).

This readiness phase does not re-run the audit; it consumes the audit conclusion and locks the corrected harness recipe + offline evidence.

---

## C. D-TRANSLATION Reclassification

The original D-TRANSLATION finding from the D3 RE-RUN is formally **reclassified** as:

```
D3 RE-RUN HARNESS / CALLER MISCONFIGURATION
```

NOT a production Translation defect. The production code is correct at every layer (RB-01..RB-10 owner audit). The D3 RE-RUN driver called `packaging:update-intent` with the wrong field name (`referenceAssetIds`), which the 6-key workspace intent allowlist silently drops.

---

## D. Production Reference Path Health

**HEALTHY.** Verified statically + via the real offline P2 prepare path:

- `packages/runtime-core/src/application/packaging/workspace-service.js` — 6-key `updateIntent` allowlist (`generationMode`, `shotContractId`, `explicitUserConstraints`, `referenceAssignments`, `providerModelId`, `apiProfileId`) accepts the canonical field and silently drops unknown fields (including the legacy flat asset-id field). `checkStale` seam (P3-A12) present.
- `packages/runtime-core/src/application/packaging/reference-assignments.js` — `projectReferenceAssignmentsToPolicy` is the ONLY Workspace → P2 Reference mapping; strips UI-only fields, preserves `role`.
- `packages/image-generation-runtime/src/packaging/reference-policy.js` — `resolveReferencePolicy` + `validateReferencePolicy` are the frozen fail-closed gate: missing reference in `reference_first` → `REFERENCE_REQUIRED`; missing/invalid role → `REFERENCE_ROLE_INVALID`; count > provider cap → `PROVIDER_CAPABILITY_MISMATCH`.
- `packages/image-generation-runtime/src/packaging/generation-service.js` — `preparePackagingGeneration` is secret-free / deterministic / offline.

No production change was made or is required.

---

## E. Caller-Side Field Mismatch (root cause, as audit)

The D3 RE-RUN driver sent:

```js
patch: {
  apiProfileId: PROFILE_ID,
  providerModelId: REGISTRY_MODEL_ID,
  generationMode: target.mode,
  shotContractId: target.shot,
  referenceAssetIds: target.refs > 0 ? [target.refAssetId] : [],  // WRONG
}
```

The production `updateIntent` dropped the unknown field; `intent.referenceAssignments` stayed empty; `reference_first` then failed closed with `REFERENCE_REQUIRED`. This is a caller-side misconfiguration, not a production defect.

---

## F. Old Harness Shape (BEFORE)

```js
patch: {
  ...
  referenceAssetIds: target.refs > 0 ? [target.refAssetId] : [],
}
```

- Field name NOT in the workspace 6-key allowlist → silently dropped.
- Flat string array, not `{ assetId, role, source }`.
- No role authority anywhere.

---

## G. New Canonical Harness Shape (AFTER)

```js
patch: {
  ...
  referenceAssignments: target.refs > 0
    ? [{ assetId: target.referenceAssignment.assetId,
         role: target.referenceAssignment.role,
         source: target.referenceAssignment.source }]
    : [],
}
```

`target.referenceAssignment` MUST already be the canonical `{ assetId, role, source }` object. The harness execution layer only consumes the contract; it never invents a role or selects an asset by order/filename.

The corrected recipe is locked in the tracked readiness test (`drivePrepare` helper in `tests/runtime-application/packaging-d3-rerun-harness-readiness.test.ts`), which calls the REAL P2 frozen `preparePackagingGeneration` through the production workspace service — no mock, no Provider call.

---

## H. Reference Asset Authority

**Explicit / legal selection rule (this phase):**

- `assetId` MUST come from a legal project-bound Reference (a real project asset record, or a sanctioned synthetic validation fixture asset).
- `exists` — the asset must exist as a project-bound record.
- `selected explicitly` — every case definition in the harness explicitly names its assetId; there is NO `first-asset` / `first-image` / `latest-run` / `filename-match` inference.
- `role assigned canonically` — the role comes from the case definition's `referenceAssignment.role`, which must already be one of the frozen 6 roles.

The legacy D3 RE-RUN driver selected the reference via `refAssetId` (flat id) with no explicit role; that shape is retired. The readiness test uses explicit synthetic case definitions (`ref-hero-01` / `ref-open-01`) that satisfy project-bound + explicit selection + canonical role.

---

## I. Reference Role Authority

Frozen 6-role set (`packages/image-generation-runtime/src/packaging/reference-policy.js`):

```
high_fidelity_visual_reference
structure_reference
material_reference
composition_reference
style_reference
product_identity_reference
```

The harness does NOT infer a role from asset type / filename / order / shot / mode. Each case definition carries its role explicitly. Roles used in this phase's offline evidence:

- `product_identity_reference` — HERO reference_first case (brand/package identity anchor).
- `structure_reference` — GIFT-OPEN reference_first case (package structure anchor).

Both are frozen roles; both are asserted in AZ-07 against `PACKAGING_REFERENCE_ROLES`.

---

## J. Active Reference / Fixture Authority Reconciliation

- The readiness phase is a **synthetic offline readiness**; it does not perform a real provider benchmark and does not rely on the `.codex-smoke` D3 project data for its authority.
- `activeReferenceSource` / `producerRunId` / `sourceFingerprint` are upstream project-authority concepts. The workspace Reference seam (`referenceAssignments` → `referencePolicy.references`) consumes only `{ assetId, role, source }`; the producer run / fingerprint authority lives upstream (canonical context selector + truth snapshot), NOT in the harness.
- The synthetic case definitions used here are legal for offline Prepare: they are project-bound (`az-project`), explicit (`ref-hero-01` / `ref-open-01`), and role-assigned canonically.
- No `assetId` is passed naked; every assignment carries `role` + `source`.

Per the harness contract: a future real D3 case definition MUST carry an explicit `referenceAssignment` (+ `whySelected`) and MUST come from an existing sanctioned reference assignment / fixture authority / user-selected role / canonical setup. If a fixture has no legal role authority, the harness must STOP (HOLD) rather than invent a role. This readiness phase satisfies that rule by carrying explicit roles.

---

## K. HERO Offline Prepare (real P2 path)

`PKG-HERO-SINGLE`, `reference_first`, 1 canonical assignment:

```
referenceAssignments: [{ assetId: 'ref-hero-01', role: 'product_identity_reference', source: 'user' }]
```

Result (via the tracked `drivePrepare` harness):

```
Prepare:                         PASS  (status = READY)
REFERENCE_REQUIRED:              NO
referencePolicy.references.length: 1
referencePolicy.count:           1
referencePolicy.required:        true
Provider HTTP:                   0
```

---

## L. Second Legal Reference Case (GIFT-OPEN)

`PKG-GIFT-OPEN`, `reference_first`, 1 canonical assignment:

```
referenceAssignments: [{ assetId: 'ref-open-01', role: 'structure_reference', source: 'user' }]
```

Result:

```
Prepare:                         PASS  (status = READY)
Shot Contract ratio:             4:3  (P2 frozen authority)
referencePolicy.references.length: 1
referencePolicy.required:        true
Provider HTTP:                   0
```

The shot geometry is read from the frozen Shot Contract (`getPackagingShotContract('PKG-GIFT-OPEN').aspectRatio === '4:3'`); the harness does not maintain a second shot→ratio mapping.

---

## M. Analysis-led Regression

`analysis_led`, `referenceAssignments: []`:

```
Prepare:                         PASS  (status = READY)
referencePolicy.references.length: 0
referencePolicy.required:        false
Provider HTTP:                   0
```

The harness fix does NOT make `analysis_led` require a Reference.

---

## N. Negative Cases (all fail closed, offline)

| Case | Result |
|---|---|
| `reference_first` + no references | `REFERENCE_REQUIRED` |
| missing `assetId` | `REFERENCE_ROLE_INVALID` |
| missing `role` | `REFERENCE_ROLE_INVALID` |
| invalid `role` | `REFERENCE_ROLE_INVALID` |
| duplicate `assetId` | `REFERENCE_ROLE_INVALID` |
| count 11 > cap 10 | fail closed (`PROVIDER_CAPABILITY_MISMATCH` at validator; workspace prepare fails) |
| count 10 == cap 10 | accepted (validator + real prepare both PASS) |

All negative evidence is offline; no Provider call is made.

---

## O. D-PROVIDER-01 Retained

- Registry `seedream-5.0-pro` `maxReferenceImages: 10`.
- Adapter `multi-model.js` `'seedream-5.0-pro'` `maxReferences: 10`.
- AZ-20 verifies both surfaces still declare the cap; AZ-18 (10 retained) / AZ-19 (11 rejected) verify the gate behavior.

---

## P. P3-A12 Preserved

- `workspace-service.js` `checkStale` seam unchanged (AZ-21).
- Semantic change to `referenceAssignments` on a prepared session → `STALE` with reason `intent_changed` (AZ-21).
- No second stale tracker introduced.

---

## Q. Shot Contract Preserved

- `PACKAGING_SHOT_CONTRACT_IDS` frozen at exactly `['PKG-HERO-SINGLE', 'PKG-SERIES-GROUP', 'PKG-GIFT-OPEN']`.
- Ratios: HERO 4:5, SERIES 16:9, OPEN 4:3 (AZ-23).

---

## R. Registry / API Identity Split Preserved

- Workspace intent carries the Registry model identity (`providerModelId`); the concrete Provider API model id is never in the intent / operations layer (AZ-22).

---

## S. AZ Guards

New tracked guard group `AZ — D3 Re-run Harness & Reference Readiness`:

| Guard | Assertion | Evidence |
|---|---|---|
| AZ-01 | owner audit conclusion preserved | doc check |
| AZ-02 | production Reference path healthy | workspace allowlist + reference-policy fail-closed |
| AZ-03 | harness uses `referenceAssignments` | tracked harness source |
| AZ-04 | harness does not use the legacy flat asset-id field | tracked harness source + allowlist |
| AZ-05 | canonical assignment shape has `assetId` | shape assertion |
| AZ-06 | canonical assignment shape has `role` | shape assertion |
| AZ-07 | role ∈ frozen 6-role set | `PACKAGING_REFERENCE_ROLES` |
| AZ-08 | no role inference from filename/order/shot/mode | source scan |
| AZ-09 | HERO reference_first Prepare PASS offline | real P2 prepare |
| AZ-10 | referencePolicy references count = 1 | real P2 prepare |
| AZ-11 | GIFT-OPEN legal reference_first Prepare PASS (4:3) | real P2 prepare |
| AZ-12 | analysis_led Prepare PASS with no references | real P2 prepare |
| AZ-13 | missing Reference still `REFERENCE_REQUIRED` | real P2 prepare |
| AZ-14 | missing assetId fails | intent validator |
| AZ-15 | missing role fails | intent validator |
| AZ-16 | invalid role fails | intent validator |
| AZ-17 | duplicate assetId fails | intent validator |
| AZ-18 | count 10 retained | validator + real prepare |
| AZ-19 | count 11 rejected | validator + real prepare |
| AZ-20 | D-PROVIDER-01 retained | Registry + adapter cap |
| AZ-21 | P3-A12 STALE preserved | checkStale + intent change |
| AZ-22 | Registry/API identity split preserved | source scan |
| AZ-23 | P2 Shot Contract preserved | frozen ids + ratios |
| AZ-24 | production source change = 0 | git diff |
| AZ-25 | external Provider call = 0 | harness source scan |
| AZ-26 | Golden unchanged | git diff |
| AZ-27 | historical D3 HOLD preserved | git + docs |
| AZ-28 | credential not logged | harness source scan |
| AZ-29 | future D3 requires new live re-run authorization | this doc |
| AZ-30 | P3-D4 remains locked | this doc |

REFERENCE FIXTURE AUTHORITY (this phase): **PASS** — every reference used in the offline evidence is explicit / project-bound / role-assigned; no first-image / latest-run / filename / arbitrary selection, no hardcoded role shortcut. If a future real fixture cannot prove the same, the harness must HOLD instead of inventing authority.

---

## T. Existing Guards

Re-run unchanged and PASS:

```
AR historical, AX, AW, AV, AT, AS, AQ, AP, AO, AN, AM, AL, AK, AJ, AI, AH, Provider targeted
```

---

## U. Production Diffs

| Surface | Diff vs HEAD |
|---|---|
| P2 (`packages/image-generation-runtime/src/packaging`) | 0 |
| P3-A12 (`packages/runtime-core/src/application/packaging`) | 0 |
| P3-B (`apps/web/src/features/packaging`) | 0 |
| packaging-operations.js | 0 |
| canonical-packaging-context-selector.ts | 0 |
| apps/web-runtime/src | 0 |

Production source changes: **0**.

---

## V. Full Offline Regression

All of the following are run and PASS (Provider calls 0):

```
npm test
npm run runtime-application:test
npm run runtime:test
npm run test:image-generation
npm run cli:test
npm run web:typecheck
npm run web:build
npm run web-runtime:typecheck
npm run web-runtime:test
npm run web:smoke
npm run repo:verify
npm run repo:check
npm run verify:current-flows
npm run verify:version-consistency
npm run verify:version-naming
npm run verify:workspace-boundaries
npm run verify:no-obsolete-code
npm run verify:production-boundaries
npm run verify:no-project-specific-production-rules
npm run verify:golden-boundary
npm run verify:space-compiler-baseline
npm run verify:space-r8.6-golden-boundary
npm run golden:test
```

---

## W. External Provider Calls

```
External Provider HTTP calls:   0
Live image generation:          0
Direct probe:                   0
GET models:                     0
API key read:                   0
```

---

## X. Golden

```
Golden auto-update:             NO
Golden changed:                 NO
```

---

## Y. Credential Readiness

**CREDENTIAL: PENDING USER RE-ISSUE / RE-VERIFICATION.**

This phase does not validate real Provider auth and does not read any API key. Only local configuration state is reported (env var present / absent), never the key value:

```
MASTERPIECE_API_KEY   NOT SET
ARK_API_KEY           NOT SET
VOLCENGINE_API_KEY    NOT SET
QWEN_API_KEY          NOT SET
DASHSCOPE_API_KEY     NOT SET
MASTERPIECE_PROVIDER  NOT SET
```

`READY FOR LIVE VALIDATION` would mean local configuration is ready; it would NOT mean the Provider has accepted the credential. Only the next authorized real D3 can prove Provider authentication.

---

## Z. Working Tree / Local / Remote

```
Working tree:   EMPTY (after this phase's commits)
Local == Remote: MATCH (post-push)
```

---

## AA. Final Decision

```
P3-D3 HARNESS:      OFFLINE READY
REFERENCE-FIRST:    PREPARE READY
CREDENTIAL:         PENDING USER RE-ISSUE / RE-VERIFICATION
P3-D3:              HOLD — NEW LIVE RE-RUN AUTHORIZATION REQUIRED
P3-D4:              LOCKED
P3-E:               LOCKED
```

The harness contract is locked offline (canonical `referenceAssignments`, no legacy flat field, no role/asset inference), HERO + GIFT-OPEN reference_first Prepare PASS offline, analysis_led unaffected, all negatives fail closed, D-PROVIDER-01 / P3-A12 / P2 Shot Contract / Registry identity unchanged, production source change 0, external Provider calls 0, Golden unchanged.

---

## AB. Next Step

A new, explicit **P3-D3 RE-RUN authorization** (real provider, fresh credential, per-case legal `referenceAssignment` + `whySelected`) is required before any live benchmark. **Do not start automatically. STOP.**
