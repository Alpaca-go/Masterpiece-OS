# P3-D3.6B — Web Asset Upload Implementation & Reference-First Integration

**Date:** 2026-08-15
**Branch:** `codex/visual-analysis-a1-multi-provider`
**Start HEAD:** `448a208f35ad31a92dad4519365567d67195be8d` (P3-D3.6A HEAD, resolved via `git rev-parse HEAD`)
**Phase Class:** PRODUCTION IMPLEMENTATION / OFFLINE ACCEPTANCE
**External Provider HTTP calls:** 0
**Golden:** unchanged

---

## 1. P3-D3.6A Contract Consumed

The frozen Web Asset Upload Contract (`p3-d3-6a-web-asset-upload-architecture-contract.md`) is implemented verbatim:

- Canonical transport: **JSON RPC + base64** (`projects:import-file-bytes`)
- Persistence authority: `project-store.persistBufferAsset` (reused)
- Project asset authority: `project-store`
- Reference authority: Workspace `referenceAssignments` (packaging) / `referenceAssetIds` (short-chain selection)
- No multipart / two-step / temp-file / absolute path / second asset store

## 2. Implementation Owners

| Concern | Owner |
|---|---|
| Contract types | `packages/runtime-core/src/application-contracts.ts` (`ImportFileBytesInput` / `ImportFileBytesResult` / `projects.importFileBytes`) |
| Persistence | `packages/runtime-core/src/application/project-store.ts` (`importFileBytes` + extracted `persistBufferAsset`) |
| RPC channel | `packages/runtime-core/src/operations/project-operations.js` (`projects:import-file-bytes`) |
| Body cap | `apps/web-runtime/src/local-rpc-server.ts` (channel-aware: upload 64 MiB, others 10 MiB; `resolveBodyCap` exported) |
| Web client | `apps/web/src/web-api.ts` (proxy auto-maps `projects.importFileBytes`) |
| File picker | `apps/web/src/components/ShortChainGenerationWorkspace.tsx` (hidden `<input type="file">` + `inputRef.click()`) |

## 3. RPC Contract

```
projects.importFileBytes({ projectId, file: { name, mime, size, content } })
  → { asset: { id, projectId, name, mime, sizeBytes, relativePath, sha256, usage },
      duplicate, existingAssetId? }
```

- `content` is raw base64 (no `data:` prefix).
- No `absolutePath` / `trustedPath` / `sourcePath` / `destinationPath` accepted.

## 4. Channel Body Cap

- `projects:import-file-bytes` → **64 MiB** (covers 8 MiB raw image at ~33% base64 inflation + JSON wrapper).
- All other RPC channels keep the general **10 MiB** cap.
- `resolveBodyCap(channel)` exported for the contract guard; not a global raise.

## 5. Validation (runtime is authoritative)

- Reference images only: PNG / JPEG / WEBP (`UPLOAD_IMAGE_EXTENSIONS` + `UPLOAD_IMAGE_MIME`).
- `size > 0` and `size <= 8 MiB` (`UPLOAD_MAX_FILE_BYTES`).
- base64 valid; decoded byte length must equal declared `size`.
- Filename: basename + sanitize (`sanitizeUploadFilename`); `..` / separators / control chars stripped.
- Project must exist (`UPLOAD_PROJECT_NOT_FOUND`).

## 6. Project Persistence

`importFileBytes` writes through `persistBufferAsset` into `<project>/generation-references/` with `usage: 'generation_reference'`, project-bound via `assertInside`. The same helper now serves `importFiles` zip extraction and the web upload — one persistence path, no duplication.

## 7. Dedup

sha256 dedup reused: same bytes → `duplicate: true` + `existingAssetId`, same project-bound asset returned.

## 8. Browser Picker

`ShortChainGenerationWorkspace.tsx`:
- Hidden `<input type="file" accept="image/png,image/jpeg,image/webp">` + `uploadInputRef`.
- "上传参考图" button → `uploadInputRef.current?.click()`.
- **Never** `projects.chooseFiles` (env path) for the reference upload flow.

## 9. File Lifecycle

- `input.value = ''` after every pick (same-file reselect works).
- Cancel → early return, safe.
- Replace/remove: existing reference-card actions (`replaceReferenceAsset` / `toggleReferenceAsset`) unchanged; project assets persist, assignments update.

## 10. Preview

- Pre-upload: browser Object URL is NOT used (upload is immediate); after import the card shows `scanAssets` thumbnailDataUrl (`loadProjectAssets`).
- Upload state shown on the button ("正在上传参考图…").

## 11. Role Authority

- The upload RPC never sets a role.
- The short-chain reference module keeps explicit `referenceAssetIds` selection; roles are never inferred from filename/shot/mode.
- Packaging `referenceAssignments` (with frozen `PACKAGING_REFERENCE_ROLES`) remain the workspace authority (offline Prepare evidence below).

## 12. Assignment

- Imported asset joins the reference selection (`setReferenceAssetIds` + `referenceSources[assetId] = 'user_upload'`), verified `asset.projectId === project.id`.
- Packaging canonical assignment path (`updateIntent({ referenceAssignments })`) verified offline via the workspace service.

## 13. Reference-First Prepare (offline evidence)

With 1 canonical assignment (`{ assetId, role: 'product_identity_reference', source: 'user' }`), `PKG-HERO-SINGLE`:

```
Prepare READY
REFERENCE_REQUIRED: NO
referencePolicy.references.length: 1
referencePolicy.count: 1
```

Missing reference → `REFERENCE_REQUIRED` still fail-closed.

## 14. Standard Regression

`analysis_led` Prepare READY without references (P3-D3.5A corrective intact; BB guards retained).

## 15. UA Guards

`tests/runtime-application/web-asset-upload-contract.test.ts` (UA-02..UA-20): PNG/JPEG/WEBP import, empty/MIME/size rejections, project-not-found, filename traversal, sha256 dedup, reload persistence, no absolute path, failed-persist integrity, malformed base64, zero Provider calls. **14/14 PASS.**

## 16. BC Guards

`tests/runtime-application/web-reference-upload-workflow.test.ts` (BC-01..BC-30): D3.5B HOLD preserved; upload button + file input + input.click; no chooseFiles/env dependency; visible invalid-file errors; sanctioned import seam; project-bound asset; canonical role authority (no inferred role); reference selection update; reference_first Prepare PASS; missing reference fail-closed; same-file reselect; cancel safe; visible failures; P3-A12 STALE preserved; analysis_led unaffected; BB retained; Provider 0; Golden unchanged; P3-B history preserved; D4 locked. **30/30 PASS.**

## 17. BB / Existing Guards

BB (25/25), AZ, AX, AW, AV, AT, AS, AQ, AP, AO, AN, AM, AL, AK, AJ, AI, AH, Provider-targeted — retained. P3-C frozen guard allowlists extended for the two new production files (local-rpc-server.ts, project-operations.js) with explicit P3-D3.6B annotations (same pattern as C4.1/C4.2.1).

## 18. Full Regression

```
npm test                  1259/1259 PASS
npm run runtime-application:test   PASS (1556/1556 incl. UA + BC)
npm run runtime:test               PASS
npm run test:image-generation      PASS
npm run cli:test                   40/40 PASS
npm run web:typecheck              PASS (0 errors)
npm run web:build                  PASS
npm run web-runtime:typecheck      PASS (0 errors)
npm run web-runtime:test           12/12 PASS (incl. body-cap + upload RPC e2e)
npm run web:smoke                  PASS
npm run repo:verify                PASS
npm run repo:check                 PASS
npm run verify:current-flows       PASS
npm run verify:version-consistency PASS
npm run verify:version-naming      PASS
npm run verify:workspace-boundaries PASS
npm run verify:no-obsolete-code    PASS
npm run verify:production-boundaries PASS
npm run verify:no-project-specific-production-rules PASS
npm run verify:golden-boundary     PASS
npm run verify:space-compiler-baseline PASS
npm run verify:space-r8.6-golden-boundary PASS
npm run golden:test                PASS (Provider calls 0, auto-update NO)
```

## 19. Provider Calls

```
External Provider HTTP:   0
Image generation:         0
```

## 20. Golden

```
Golden auto-update:       NO
Golden changed:           NO
```

## 21. Production Changed Files

- `packages/runtime-core/src/application-contracts.ts`
- `packages/runtime-core/src/application/project-store.ts`
- `packages/runtime-core/src/operations/project-operations.js`
- `apps/web-runtime/src/local-rpc-server.ts`
- `apps/web/src/components/ShortChainGenerationWorkspace.tsx`

Test files: `tests/runtime-application/web-asset-upload-contract.test.ts` (new), `tests/runtime-application/web-reference-upload-workflow.test.ts` (new), `apps/web-runtime/tests/node-runtime-host.test.ts`, and 9 P3-C guard files (allowlist extensions).

Not touched: Seedream adapter, DashScope, credential store, prompt-preflight-gate (P3-D3.5A frozen), Shot Contract, P3-A stale implementation, Golden.

## 22. P3-B Historical Preservation

P3-B accepted history preserved; this is a **post-acceptance web capability corrective** (same record as P3-D3.5A/B). The P3-C frozen guard allowlists were **extended** (append-only) with explicit D3.6B annotations, never rewritten.

## 23. Final Decision

```
P3-D3.6B:                          PASS
WEB ASSET UPLOAD:                  IMPLEMENTED
REFERENCE-FIRST WEB UPLOAD:        OFFLINE READY
STANDARD / ANALYSIS-LED:           OFFLINE READY
P3-D3:                             HOLD — REAL WEB VALIDATION REQUIRED
P3-D4:                             LOCKED
P3-E:                              LOCKED
```

## 24. Real Web Validation Gate (do not auto-run Provider)

The user must run `npm run web:dev` and manually verify:

1. Switch to Reference-First.
2. Click "上传参考图".
3. The system file picker opens.
4. Select a local image.
5. The Reference thumbnail appears with no error.
6. Standard/analysis-led can still reach 生成.

Only after that, a user-authorized real Provider validation may be scheduled.

**STOP. No automatic Provider call.**
