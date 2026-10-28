# P3-D3.7C — Cross-Deliverable Reference Path Authority Audit

**Date:** 2026-08-15
**Branch:** `codex/visual-analysis-a1-multi-provider`
**Start HEAD:** `a6633fb4974d44c21b80fc3b93982e584c3aef44` (P3-D3.7B HEAD, resolved via `git rev-parse HEAD`)
**Phase Class:** AUDIT ONLY — cross-deliverable
**External Provider HTTP calls:** 0
**Production source changes:** 0
**Test source changes:** 0
**Golden:** unchanged

---

## A. Git

| Field | Value |
|---|---|
| Branch | `codex/visual-analysis-a1-multi-provider` |
| Start HEAD (resolved) | `a6633fb4974d44c21b80fc3b93982e584c3aef44` |
| Working tree | clean |

---

## B. Packaging D3.7B Consumed

D3.7B (`a6633fb`) fixed the packaging Creative Task reference path derivation to be usage-aware:
- `analysis_source` → `input/<relativePath>`
- `generation_reference` → `<relativePath>`

Verified offline and via user's real Web packaging flow (Packaging Reference-First no longer reports `REFERENCE_ASSET_NOT_FOUND`).

## C. Space Real-Web Evidence

User's `npm run web:dev` — SPACE GENERATOR Reference-First:

```
上传参考图 → picker PASS → upload PASS → thumbnail PASS → 点击生成
ERROR: Creative Task 参考图不存在: 550f5db8-d67a-4a3d-9d4e-c0e095b3f9cd
```

## D. Shared Web Upload Live Evidence (LIVE VALIDATED)

```
WEB REFERENCE FILE PICKER:  LIVE VALIDATED
WEB ASSET UPLOAD:           LIVE VALIDATED
PROJECT ASSET PREVIEW:      LIVE VALIDATED
```

Both Packaging and Space consumed the same picker/upload/thumbnail path successfully. These capabilities are no longer HOLD.

## E. Space Asset Identity (SAFE)

| Field | Value (generic shape) |
|---|---|
| uploaded asset id | UUID (user's: `550f5db8-…`) |
| usage | `generation_reference` |
| relativePath | `generation-references/<assetId>.png` (project-root-relative) |
| projectId | current project (continuous) |

## F. Space Asset Usage

The space flow resolves the uploaded asset through the **same** `resolveExplicitReferencesOrThrow` → `resolveReferenceAsset` as packaging, so `usage: generation_reference` reaches the space reference policy. **Usage is not dropped** — it is simply **ignored** by the space path constructor.

## G. Space Project Continuity

uploaded asset.projectId === current UI project.id === Space Creative Task projectId. Identical.

## H. Space Creative Task Constructor

`packages/image-generation-runtime/src/space/space-reference-policy.js` — `resolveSpaceReferences` (consumed by `short-chain-service.ts` space branch at line ~658, called from `start()`).

## I. Space Reference Path

`space-reference-policy.js:96`:

```js
projectRelativePath: `input/${asset.relativePath}`,
```

Unconditional `input/` prefix — the exact pre-D3.7B packaging pattern. For `generation_reference` (project-root-relative) this produces `input/generation-references/<id>.png` → nonexistent → `REFERENCE_ASSET_NOT_FOUND`.

## J. Packaging Reference Path (after D3.7B)

`short-chain-service.ts:886-896`:

```js
const projectRelativePath = asset.usage === 'generation_reference'
  ? asset.relativePath
  : `input/${asset.relativePath}`;
```

Usage-aware. Correct.

## K. Resolver Authority

`resolveReferenceAsset` is the single correct resolver (usage-aware absolutePath). Both packaging and space consume it via `resolveExplicitReferencesOrThrow`. **Resolver is correct and unchanged.**

## L. Active Path Construction Sites (full inventory)

| # | Owner | Path derivation | Reference frame | Classification |
|---|---|---|---|---|
| 1 | short-chain-service.ts:886-896 (Packaging) | usage-aware | correct | ACTIVE CORRECT (D3.7B) |
| 2 | **space-reference-policy.js:96 (Space)** | **`input/${relativePath}`** | **wrong for generation_reference** | **ACTIVE BROKEN** |
| 3 | short-chain-service.ts:628 / 1012 (continuation) | `image-generation/<run>/<img>` | generated output | ACTIVE CORRECT |
| 4 | resolve-continuation-reference.js | passthrough | generated output | ACTIVE CORRECT |
| 5 | short-chain-service.ts:1441 (post-composite logo) | `input/${logo.relativePath}` | analysis_source | ACTIVE CORRECT |
| 6 | anchor-generation-service.ts:74-76 | `input/${sourceFile}` or thumbnail | locked-asset | ACTIVE CORRECT |
| 7 | generation-prompt.js:121/130 | `input/${sourceFile}` | logo/structure locked | ACTIVE CORRECT |
| 8 | generation-prompt.js:209 | `reference.pack_path` | reference-pack | ACTIVE CORRECT |
| 9 | short-chain-service.ts:1167 | `assets/${assetId}` | legacy | LEGACY (no active Creative Task path) |

## M. Duplicate Authority Inventory

Two deliverable-specific path interpretation sites for **project asset → Creative Task reference**:
1. Packaging (`short-chain-service.ts`) — now usage-aware.
2. Space (`space-reference-policy.js`) — still unconditional `input/`.

Both consume the same resolver output (relativePath + usage) but interpret it independently. This is **deliverable-specific path authority duplication**.

## N. SR-01..SR-14 Trace (SPACE)

| Boundary | Owner | Verdict |
|---|---|---|
| SR-01 browser File | renderer | GOOD (live PASS) |
| SR-02 import-file-bytes | web-api/RPC | GOOD |
| SR-03 Project Asset | project-store | GOOD (generation_reference) |
| SR-04 scanAssets/thumbnail | project-store | GOOD |
| SR-05 reference selection | renderer | GOOD (same id) |
| SR-06 reference source/usage | resolver | GOOD (usage=generation_reference) |
| SR-07 generate input | renderer | GOOD |
| SR-08 Space Creative Task constructor | space-reference-policy.js | GOOD (id preserved) |
| SR-09 reference id | space-reference-policy.js | GOOD (same UUID) |
| SR-10 reference projectRelativePath | space-reference-policy.js:96 | **BROKEN** (input/ prefix) |
| SR-11 resolver output | resolveReferenceAsset | GOOD (correct absolutePath) |
| SR-12 existence validation | service.ts:689 | DOWNSTREAM CONSEQUENCE |
| SR-13 Provider payload | — | NOT REACHED |
| SR-14 Provider request | — | NOT REACHED |

## O. Packaging Comparison (PK-07..PK-12)

| Boundary | Packaging (D3.7B) | Space (current) |
|---|---|---|
| PK-07/SR-07 generate input | GOOD | GOOD |
| PK-08/SR-08 constructor | GOOD | GOOD |
| PK-09/SR-09 reference id | same UUID | same UUID |
| PK-10/SR-10 projectRelativePath | `generation-references/<id>.png` | `input/generation-references/<id>.png` |
| PK-11/SR-11 resolver | correct | correct |
| PK-12/SR-12 existence | PASS | FAIL |

**Deterministic divergence at the projectRelativePath step** — same asset, packaging correct, space wrong.

## P. Last Known Good

**SR-09** — Space Creative Task reference object with correct id/role.

## Q. First Broken Boundary

**SR-10 — `packages/image-generation-runtime/src/space/space-reference-policy.js:96`**:

```js
projectRelativePath: `input/${asset.relativePath}`,
```

## R. Root Cause

**SPACE CREATIVE TASK REFERENCE PATH DEFECT** (identical class to the pre-D3.7B packaging defect): the space reference policy unconditionally prefixes `input/`, ignoring the `generation_reference` reference frame (project-root-relative). `resolveSpaceReferences` receives the resolver's `usage` field but does not use it. The existence guard correctly fail-closes.

Secondary classification: **DELIVERABLE-SPECIFIC PATH AUTHORITY DUPLICATION** — packaging and space each interpret `asset.relativePath` independently instead of consuming a single path interpretation authority.

## S. Option A — Narrow Space Corrective

Fix `space-reference-policy.js:96` to be usage-aware (mirroring the packaging fix):

```js
projectRelativePath: asset.usage === 'generation_reference'
  ? asset.relativePath
  : `input/${asset.relativePath}`,
```

- Risk: low (one-line logic, mirrors verified D3.7B pattern).
- Scope: 1 production file in the space reference policy (post-freeze Reference integration corrective; space prompt/Golden/R8.6/R9/R10 quality rules untouched).
- Regression risk: low (existing space tests pass explicit/implicit anchors with input-relative or generated-output paths; generation_reference only appears in the new web-upload path).
- Frozen baseline impact: none (no prompt/Golden/compiler change).

## T. Option B — Shared Authority Consolidation

Extract `resolveCreativeTaskReferencePath(asset)` and have both packaging and space consume it.

- Risk: medium (touches D3.7B-committed packaging code + space + tests).
- Scope: broader; would reopen the already-frozen packaging corrective surface.
- Frozen baseline impact: higher (packaging D3.7B + space freeze area).
- Regression risk: medium.

## U. Recommended Corrective

**Option A — Narrow Space Corrective.** Space is the only remaining active broken site (2 sites total; packaging already corrected). A shared-authority extraction would expand the frozen surface and reopen the D3.7B packaging corrective without proportional benefit. The narrow fix mirrors the verified D3.7B pattern and keeps the space frozen baseline (prompt/Golden/R8.6/R9/R10) untouched.

## V. Space Frozen Baseline Preservation

Space prompt, Golden, R8.6 baseline, R9/R10 semantics, generation quality rules — **all unchanged**. This finding is a **post-freeze Reference integration corrective**; history preserved.

## W–Z. Constraints

```
Production source changes:  0
Test source changes:        0
External Provider HTTP:     0
Image generation:           0
Golden auto-update:         NO
Golden changed:             NO
```

## AA. Historical Preservation

- D3.7B: **PASS** (packaging corrective verified; the space finding is a **CROSS-DELIVERABLE FOLLOW-UP FINDING**, not a D3.7B failure).
- D3.7A / D3.6B / D3.5A / earlier: preserved.
- Space frozen baseline: preserved.

## AB. Updated Status

```
P3-D3.7C AUDIT:                     PASS
PACKAGING REFERENCE PATH:           OFFLINE CORRECTED (D3.7B)
SPACE REFERENCE TASK BINDING:       BLOCKER IDENTIFIED (space-reference-policy.js:96)
WEB ASSET UPLOAD:                   LIVE VALIDATED
P3-D3:                              HOLD — CROSS-DELIVERABLE REFERENCE PATH CORRECTIVE REQUIRED
P3-D4:                              LOCKED
P3-E:                               LOCKED
```

## AC. Next Authorized Phase

A narrow Space corrective (Option A) — usage-aware `projectRelativePath` in `space-reference-policy.js:96`, mirroring D3.7B — plus a BD-style guard group for the space path, and then a user real-Web space retest. **Not started. No Provider call.**

**STOP.**
