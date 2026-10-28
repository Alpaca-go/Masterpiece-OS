# P3-D3.7A — Reference Asset → Creative Task Binding Audit

**Date:** 2026-08-15
**Branch:** `codex/visual-analysis-a1-multi-provider`
**Start HEAD:** `43f22947d117038447da1b9568f586e5f7abe9a6` (P3-D3.6B HEAD, resolved via `git rev-parse HEAD`)
**Phase Class:** AUDIT ONLY — real-web reproduction consumed
**External Provider HTTP calls:** 0
**Production source changes:** 0
**Test source changes:** 0
**Golden:** unchanged

---

## A. Git

| Field | Value |
|---|---|
| Branch | `codex/visual-analysis-a1-multi-provider` |
| Start HEAD (resolved) | `43f22947d117038447da1b9568f586e5f7abe9a6` |
| Working tree | clean |

---

## B. Standard Real-Web Evidence (LIVE)

User's `npm run web:dev` verification:

```
REAL-WEB-01: Standard / Analysis-led → Packaging generation → Seedream
             → REAL IMAGE GENERATED
RESULT: PASS
```

**P3-D3.5A product-role corrective is now LIVE VALIDATED** (upgraded from OFFLINE READY): Standard/analysis-led has real Web + Provider + generated-image evidence. The Standard prompt-gate corrective (productAndCategoryRole) works end-to-end against the real Provider.

## C. Reference Upload Real-Web Evidence (LIVE)

```
REAL-WEB-02: Reference-First → 上传参考图 → native picker opens → local
             image selected → upload succeeds → thumbnail visible →
             user-upload reference card visible
RESULT: WEB PICKER PASS / PROJECT ASSET IMPORT PASS / REFERENCE UI PASS
```

P3-D3.6B upload transport is LIVE VALIDATED: picker, base64 RPC, project asset persistence, thumbnail, reference selection UI all work.

## D. Exact Error

After clicking 生成 with the uploaded reference selected:

```
ERROR: Creative Task 参考图不存在: 22e161bb-136f-4942-ad78-6564d23fbe26
```

Source: `packages/runtime-core/src/application/image-generation/service.ts:689`
`blockingError('REFERENCE_ASSET_NOT_FOUND', 'Creative Task 参考图不存在：' + reference.id)`

## E. Uploaded Project Asset Identity (SAFE)

| Field | Value (generic shape) |
|---|---|
| uploaded asset id | UUID (user's: `22e161bb-…`) |
| projectId | current project id |
| usage | `generation_reference` |
| relativePath | `generation-references/<assetId>.png` (relative to project ROOT) |
| persisted | `<projectRoot>/generation-references/<assetId>.png` |

No absolute filesystem path recorded in this audit.

## F. Reference Selection Identity

`referenceAssetIds` state in `ShortChainGenerationWorkspace` holds the **same uploaded asset id** (`22e161bb-…`); `referenceSources[assetId] = 'user_upload'`. Identical to E.

## G. Creative Task Reference Identity

`startCompiledCreativeTask` receives `reference.id = 22e161bb-…` (same UUID) with `projectRelativePath: 'input/' + asset.relativePath` = `input/generation-references/22e161bb-….png`.

**The id is identical across all layers — this is NOT an id mismatch. The broken part is the derived filesystem path.**

## H. Project Identity Continuity

- uploaded asset.projectId === current UI project.id === Creative Task projectId === Workspace projectId. **All identical.**

## I. Creative Task Constructor

`packages/runtime-core/src/application/image-generation/short-chain-service.ts` — `start()` → `resolveExplicitReferencesOrThrow(explicitIds, projectId, projects)` → reference objects → `startCompiledCreativeTask`.

## J. Creative Task Asset Inventory

`resolveReferenceAsset` (`packages/image-generation-runtime/src/reference-engine/reference-asset-resolver.ts`) resolves from the **live project.assets** (project store). It **correctly** handles `usage === 'generation_reference'`:

```js
absolutePath = asset.usage === 'generation_reference'
  ? path.join(options.projectRoot, asset.relativePath)          // correct
  : path.join(options.projectRoot, 'input', asset.relativePath)
```

The resolver resolves the uploaded asset fine (verified offline below). **The resolver is not the defect.**

## K. Existence Validator

`service.ts:682-690` in `startCompiledCreativeTask`:

```js
const localPath = path.resolve(projectRoot, reference.projectRelativePath);
const content = await fs.readFile(localPath).catch(() => null);
if (!content) throw blockingError('REFERENCE_ASSET_NOT_FOUND', `Creative Task 参考图不存在：${reference.id}`);
```

The validator reads `reference.projectRelativePath` relative to the project root. The guard itself is **correct fail-closed behavior** — the defect is the `projectRelativePath` value handed to it.

## L. Asset Usage Filters — the root defect

`short-chain-service.ts:884` constructs the reference path unconditionally:

```js
projectRelativePath: `input/${asset.relativePath}`,
```

Two relativePath reference frames exist:

| usage | asset.relativePath (persistAsset) | reference frame | `input/` prefix needed? |
|---|---|---|---|
| `analysis_source` | `assets/<id>.png` | relative to `<root>/input/` | YES → `input/assets/<id>.png` correct |
| `generation_reference` | `generation-references/<id>.png` | relative to `<root>` | **NO** — `input/generation-references/<id>.png` is wrong |

The D3.6B upload path creates `generation_reference` assets whose relativePath is already project-root-relative. The unconditional `input/` prefix in short-chain-service.ts:884 therefore produces a nonexistent path → `REFERENCE_ASSET_NOT_FOUND`.

## M. Snapshot / Cache Behavior

No snapshot staleness: `resolveExplicitReferencesOrThrow` reads the **live** `project.assets` (fresh after upload). The failure is purely the path derivation, not a stale snapshot.

## N. `referenceAssetIds` Ownership

Short-Chain / Creative Task selection state (`ShortChainGenerationWorkspace`), used as `explicitIds` for the Creative Task. Correct.

## O. `referenceAssignments` Ownership

Packaging Workspace canonical intent (`referenceAssignments: [{ assetId, role, source }]`). The current real Web path uses `referenceAssetIds` (short-chain selection); the packaging workspace assignment path is separate. Not reached in this failure — the error occurs before Workspace prepare.

## P. Bridge Ownership

The bridge from `referenceAssetIds` (selection) to Creative Task references is `resolveExplicitReferencesOrThrow` + `start()`'s reference construction (`short-chain-service.ts:870-894`). The bridge correctly passes the asset id but **derives the path incorrectly for generation_reference usage**.

## Q. RC-01..RC-14 Trace

| Boundary | Owner | Verdict |
|---|---|---|
| RC-01 browser File | renderer | GOOD (live PASS) |
| RC-02 import-file-bytes response | web-api/RPC | GOOD (asset id returned) |
| RC-03 persisted AssetItem | project-store | GOOD (usage=generation_reference) |
| RC-04 scanAssets | project-store | GOOD (thumbnail shown) |
| RC-05 referenceAssetIds state | renderer | GOOD (same id) |
| RC-06 referenceSources | renderer | GOOD |
| RC-07 generate() input | renderer | GOOD (id passed) |
| RC-08 Creative Task construction | short-chain-service | GOOD (id preserved) |
| RC-09 reference projectRelativePath | short-chain-service:884 | **BROKEN** (`input/` prefix on generation_reference) |
| RC-10 asset inventory resolve | reference-asset-resolver | GOOD (correct path derivation) |
| RC-11 existence validation | service.ts:689 | DOWNSTREAM CONSEQUENCE (reads wrong path) |
| RC-12 Workspace intent | — | NOT REACHED |
| RC-13 Prepare input | — | NOT REACHED |
| RC-14 Provider payload | — | NOT REACHED |

## R. Last Known Good

**RC-08** — Creative Task reference object construction with the correct asset id and role.

## S. First Broken Boundary

**RC-09 — `packages/runtime-core/src/application/image-generation/short-chain-service.ts:884`**:

```js
projectRelativePath: `input/${asset.relativePath}`,
```

The unconditional `input/` prefix is wrong for `generation_reference` assets (D3.6B upload path), whose relativePath is already project-root-relative.

## T. Root Cause

**CREATIVE TASK ASSET FILTER DEFECT** (identity-domain mismatch): `short-chain-service.ts:884` assumes every reference asset's relativePath is relative to `<root>/input/`. The D3.6B web upload creates `generation_reference` assets whose relativePath is relative to `<root>` (`generation-references/<id>.png`). The unconditional `input/` prefix produces a nonexistent path; the (correct) existence guard then throws `REFERENCE_ASSET_NOT_FOUND`.

The correct path is already derivable: `resolveReferenceAsset` returns `record.relativePath` that accounts for usage. The constructor should use the resolver's relativePath semantics (project-root-relative for generation_reference, input-relative for analysis_source) instead of unconditionally prepending `input/`.

## U. Corrective Owner

`packages/runtime-core/src/application/image-generation/short-chain-service.ts` (reference construction in `start()`, ~line 884). Narrow corrective: derive `projectRelativePath` per usage — either use the resolver's project-root-relative `relativePath` with an `input/` prefix only for non-generation_reference assets, or compute the path the same way `resolveReferenceAsset` does (usage-aware).

## V–Y. Constraints

```
Production source changes:  0
Test source changes:        0
External Provider HTTP:     0
Image generation:           0
Golden auto-update:         NO
Golden changed:             NO
```

## Z. Historical Preservation

- P3-D3.5A: OFFLINE READY → **LIVE VALIDATED** (Standard real image PASS).
- P3-D3.6B: still **PASS** — it implemented the Web Asset Upload Contract + offline reference flow; the real-Web finding is a **POST-D3.6B REAL-WEB INTEGRATION FINDING** (downstream Creative Task binding), not a rewrite of D3.6B.
- Reference upload: no longer "blocked" — **LIVE PASS** (picker/import/thumbnail). Accurate status: **REFERENCE-FIRST TASK BINDING: BLOCKED**.
- All prior D3 history preserved.

## AA. Updated D3 Status

```
P3-D3.5A:                      LIVE VALIDATED (Standard real image PASS)
P3-D3.6B:                      PASS (upload contract implemented; real-Web finding is downstream)
REFERENCE-FIRST UPLOAD:        LIVE PASS
REFERENCE-FIRST TASK BINDING:  BLOCKED (creative task path derivation)
P3-D3:                         HOLD — REFERENCE TASK BINDING CORRECTIVE REQUIRED
P3-D4:                         LOCKED
P3-E:                          LOCKED
```

## AB. Recommended Narrow Corrective (next phase, not started)

Fix `short-chain-service.ts` reference construction so `projectRelativePath` is usage-aware (generation_reference → project-root-relative; analysis_source → `input/`-prefixed), matching the resolver's existing correct semantics. The existence guard stays fail-closed.

**STOP. No automatic remediation. No Provider call.**
