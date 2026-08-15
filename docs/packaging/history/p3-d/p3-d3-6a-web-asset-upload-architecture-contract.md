# P3-D3.6A — Web Asset Upload Architecture & RPC Contract

**Date:** 2026-08-15
**Branch:** `codex/visual-analysis-a1-multi-provider`
**Start HEAD:** `343ce15f14a98cb8e084b875e476884ddd0ea84b` (P3-D3.5B HEAD, resolved via `git rev-parse HEAD`)
**Phase Class:** ARCHITECTURE / CONTRACT ONLY (DOC-ONLY)
**External Provider HTTP calls:** 0
**Production source changes:** 0
**Test source changes:** 0
**Golden:** unchanged

---

## A. Git

| Field | Value |
|---|---|
| Branch | `codex/visual-analysis-a1-multi-provider` |
| Start HEAD (resolved) | `343ce15f14a98cb8e084b875e476884ddd0ea84b` |
| Working tree | clean |

---

## B. P3-D3.5B HOLD Consumed

P3-D3.5B (`343ce15`) established: no sanctioned browser File → Node project asset transport exists. `projects.chooseFiles` is env-injection only; `projects.importFiles(paths)` accepts filesystem paths only; `persistAsset({ buffer })` is an internal sanctioned buffer-persistence path but is not exposed as a public bytes-ingestion RPC; web-api RPC is JSON-only; the renderer has zero `<input type="file">`; `files.getPathForFile` returns `''`.

This phase designs and freezes the missing contract. Implementation is explicitly out of scope.

---

## C. Current Transport Inventory

| Transport | Owner | Shape | Notes |
|---|---|---|---|
| JSON RPC | `apps/web-runtime/src/local-rpc-server.ts` | POST `/_masterpiece/rpc/<channel>` body `{ args }` → `{ result }` / `{ error }` | node:http native server; `MAX_BODY_BYTES = 10 MiB` (line 16); origin check; SSE events at `/_masterpiece/events`; invoke via `runtime.registry.execute(channel, args, { host: 'node-web' })` |
| Web API client | `apps/web/src/web-api.ts` | `fetch('/_masterpiece/rpc/...')` JSON | proxy to `RuntimeApi`; `files.getPathForFile` returns `''` |
| Native ops | `apps/web-runtime/src/node-native-operations.ts` | `projects:choose-files` → env `MASTERPIECE_WEB_SELECTED_FILES` | env-injection only, no picker |
| Project store | `packages/runtime-core/src/application/project-store.ts` | `importFiles(projectId, paths, kind)` | filesystem paths only; `persistAsset({ buffer })` internal buffer branch (zip extraction) with sha256 dedup, project binding (`assertInside`), asset id generation, MIME/extension mapping |
| Asset scan | `project-store.ts` `scan()` | `AssetSummary` / `AssetItem` | `thumbnailDataUrl` (sharp JPEG base64) for previews; existing response schema |
| Binary transport | none | — | no multipart / stream / base64 endpoint; no busboy / formidable / multer dependency in `node_modules` |
| Download verify | `packages/image-generation-runtime/src/download-verify.js` | `ALLOWED_MIME = ['image/png']` | generation-side decode validation pattern exists |

**Sanctioned Web → Runtime transport types today:** JSON RPC (primary), SSE events (progress), env-injection paths (native ops). **No binary transport exists.**

---

## D. Candidate A — JSON RPC + base64

- Shape: `projects.importFileBytes({ projectId, file: { name, mime, size, content(base64) } })` over the existing `/_masterpiece/rpc/` channel.
- Implementation complexity: low (reuse client/server/invoke path; add one operation + one project-store entry point).
- Memory: browser ArrayBuffer → base64 string → JSON string → Node parse → Buffer: 2-3 copies.
- Payload inflation: ~33% (base64).
- Large-file risk: bounded by body cap; reference images are hundreds of KB to a few MB.
- Browser compat: universal (FileReader/arrayBuffer → base64).
- Node runtime compat: native.
- Error handling: existing `{ error }` envelope.
- Project binding: projectId in payload; project-store validates.
- Security: base64 bomb risk bounded by body cap; no path input.
- Test difficulty: low (pure RPC, existing harness).
- Reuse: full (existing channel/server/persistence).
- Second store: none (persistAsset reused).
- Architecture fit: exact match for the current single-server JSON-only architecture.

## E. Candidate B — multipart/form-data dedicated endpoint

- Shape: POST `/_masterpiece/upload/projects/import-file` with `multipart/form-data` (metadata fields + binary part).
- Implementation complexity: high — requires a multipart parser (busboy / formidable / multer are NOT in `node_modules`), a new route in `local-rpc-server.ts`, new error paths, and a renderer-side `FormData` client.
- Memory: one streamed copy (best).
- Payload inflation: none.
- Large-file risk: low (streamed).
- Browser compat: universal (`FormData`).
- Node runtime compat: needs new dependency or hand-rolled parser.
- Error handling: new envelope shape.
- Project binding: metadata field.
- Security: multipart filename trust must be handled; parser must be audited.
- Test difficulty: medium (new transport harness).
- Reuse: partial (persistAsset reused; transport new).
- Second store: none.
- Architecture fit: diverges from the current JSON-only RPC server; adds a dependency.

## F. Candidate C — Two-step upload (create session → binary POST → finalize)

- Shape: `projects.createUploadSession({ projectId, name, mime, size })` → `{ sessionId, presigned/direct binary URL }` → binary POST → `projects.finalizeUpload({ sessionId })` → `{ asset }`.
- Implementation complexity: highest (session state, temp storage lifecycle, finalize path, cleanup).
- Memory: one streamed copy; temp file on disk.
- Payload inflation: none.
- Large-file risk: lowest (stream + resume potential).
- Browser compat: universal.
- Node runtime compat: native.
- Error handling: multi-phase (session/binary/finalize).
- Project binding: session carries projectId; finalize validates.
- Security: temp-file cleanup, session expiry, orphan handling.
- Test difficulty: high (three-phase harness).
- Reuse: partial (persistAsset at finalize).
- Second store: temp storage — must be short-lived, non-authority.
- Architecture fit: over-engineered for controlled-size local reference images.

---

## G. Comparison

| Criterion | A (JSON+base64) | B (multipart) | C (two-step) |
|---|---|---|---|
| Implementation complexity | low | high | highest |
| Memory copies | 2-3 | 1 (streamed) | 1 (temp file) |
| Payload inflation | +33% | none | none |
| Large-file risk | medium (bounded) | low | lowest |
| Browser compat | universal | universal | universal |
| Node runtime compat | native | new dependency | native |
| Error handling | existing envelope | new | multi-phase |
| Project binding | projectId | field | session |
| Security surface | body cap | parser + filename trust | temp lifecycle |
| Test difficulty | low | medium | high |
| Reuse existing runtime | full | partial | partial |
| Second store | none | none | temp (short-lived) |
| Architecture fit | **exact** | diverges | diverges |

---

## H. Selected Canonical Transport

```
RECOMMENDED:  Candidate A — JSON RPC + base64
              (sanctioned channel `projects:import-file-bytes`)
```

**Why:** Masterpiece Web is a local-only runtime (127.0.0.1), reference images are controlled-size (hundreds of KB to a few MB, well under the 10 MiB general RPC cap once the upload channel gets its own body cap), the repo has a single JSON-only RPC server with no multipart dependency, and `persistAsset({ buffer })` is the canonical sanctioned persistence. Candidate A reuses the entire existing transport (client, server, invoke, error envelope, tests) with zero new dependencies, and keeps the asset authority exactly where it belongs (project-store). The ~33% base64 inflation is acceptable at this size and local latency. The 2-3 memory copies are bounded and not a constraint for reference images.

## I. Rejected Alternatives

- **Candidate B (multipart):** rejected — requires adding a multipart parser dependency (busboy/formidable/multer absent), a new route, new error envelope, and renderer FormData client. The theoretical streaming/memory benefit is immaterial for controlled-size local reference images. Diverges from the current single-server JSON architecture without a commensurate win.
- **Candidate C (two-step):** rejected — session state, temp-file lifecycle, expiry/cleanup, and multi-phase errors are over-engineering for a local upload of a few MB. It would introduce the very "temporary transport storage" the contract must keep minimal.

---

## J. Upload Authority

| Concern | Owner |
|---|---|
| Browser upload transport (RPC channel + body cap) | `apps/web-runtime/src/local-rpc-server.ts` (+ operation registration in runtime host) |
| Web API client method | `apps/web/src/web-api.ts` (RuntimeApi proxy, channel override) |
| Operation/contract typing | `packages/runtime-core/src/application-contracts.ts` |
| Asset persistence | `packages/runtime-core/src/application/project-store.ts` — `persistAsset({ buffer })` (reused verbatim) |
| Project binding | `project-store.ts` (root resolution + `assertInside`) |
| MIME / extension validation | `project-store.ts` `SUPPORTED_ASSET` + `MIME_TYPES` |
| sha256 dedup | `project-store.ts` `persistAsset` (existing) |
| asset id generation | `project-store.ts` (crypto.randomUUID, existing) |

No second asset store, dedup engine, or project-binding rule.

---

## K. Persistence Authority

`persistAsset({ buffer })` in `project-store.ts:270-316` — canonical, sanctioned (already used by zip extraction and `importFiles`). Reused as-is; no new store.

---

## L. Project Binding

- Request carries `projectId`.
- Runtime resolves the project root (`rootForId`), validates the project exists.
- Destination computed via `assertInside` (no renderer-supplied path).
- Returned asset is project-bound (`asset.projectId === current projectId`).
- Cross-project overwrite / arbitrary path / path traversal: impossible (no path input from renderer; `assertInside` guards).

---

## M. Request Contract

```ts
// application-contracts.ts (additive)
projects: {
  // existing chooseFiles / importFiles / scanAssets / removeAsset / removeBatch / clearAssets unchanged
  importFileBytes(input: {
    projectId: string;
    file: {
      name: string;      // safe display name; runtime-normalized
      mime: string;      // browser-provided, NOT trusted alone
      size: number;      // raw bytes
      content: string;   // base64 (no data: prefix)
    };
  }): Promise<ImportFileBytesResult>;
}
```

- `name`: runtime-normalized (basename only; path separators / `..` / control chars stripped).
- `mime`: advisory; runtime validates extension + MIME consistency and decodes.
- `content`: base64 of raw bytes (browser `FileReader.readAsDataURL` stripped of prefix, or `arrayBuffer` → base64).
- No `absolutePath` / `trustedPath` / `sourcePath` accepted as authority.

---

## N. Response Contract

```ts
interface ImportFileBytesResult {
  asset: {
    id: string;            // project-bound assetId (canonical)
    projectId: string;
    name: string;          // safe display name
    mime: string;
    sizeBytes: number;
    relativePath: string;  // project-relative, posix
    sha256: string;
    usage: 'generation_reference';
    // preview: caller uses existing scanAssets thumbnailDataUrl,
    // or Object URL pre-upload
  };
  duplicate: boolean;      // true when sha256 dedup returned the existing asset
  existingAssetId?: string; // set when duplicate
}
```

No absolute filesystem path, no credential, no internal temp path.

---

## O. Error Contract

Structured codes (repo `UPPER_SNAKE` convention), safe generic messages:

| Code | Condition |
|---|---|
| `UPLOAD_FILE_TYPE_UNSUPPORTED` | extension not in `SUPPORTED_ASSET` or MIME mismatch |
| `UPLOAD_FILE_EMPTY` | zero bytes |
| `UPLOAD_FILE_TOO_LARGE` | raw size > per-file cap (below) |
| `UPLOAD_PROJECT_NOT_FOUND` | projectId unknown |
| `UPLOAD_PROJECT_MISMATCH` | asset binding would escape the project (defense in depth) |
| `UPLOAD_PERSIST_FAILED` | persistAsset write failure (no corrupt asset left behind) |
| `UPLOAD_TRANSPORT_FAILED` | body cap exceeded / malformed payload |

Errors are structured codes with safe messages — never parsed from Chinese text.

---

## P. MIME Validation

- Allowed set: `SUPPORTED_ASSET` — `.jpg/.jpeg/.png/.webp/.pdf` (`project-store.ts:20`).
- Reference images: PNG/JPEG/WEBP primary; PDF allowed by the asset authority but not usable as a generation reference image (downstream reference resolution will reject non-image).
- Runtime validates: extension in set, `mime` matches `MIME_TYPES[extension]` (or a browser variant of it, e.g. `image/jpg` vs `image/jpeg`), and (existing pattern) decode validation via the reused asset pipeline where applicable.
- `file.type` is advisory only; never trusted alone.

---

## Q. Size Limits

- Per-file raw max: **8 MiB** (reference images are typically hundreds of KB; 8 MiB base64 ≈ 10.7 MiB < the upload-channel body cap).
- Max files per request: **1** (one reference image per import call; the packaging reference cap of 10 is a count of assignments, not an upload batch size — kept separate).
- Upload channel body cap: **64 MiB** for the `projects:import-file-bytes` channel (covers 8 MiB raw → ~10.7 MiB base64 + JSON wrapper with headroom); all other RPC channels keep the existing 10 MiB cap.
- Rationale: local-only transport, controlled reference sizes, 33% base64 inflation headroom, DoS surface bounded.

---

## R. Dedup

- Reuse `persistAsset` sha256 dedup (`project-store.ts:283-290`): uploading the same file twice returns the existing asset (`duplicate: true`, `existingAssetId` set).
- No second dedup engine in the Web layer.

---

## S. Security

- **Filename traversal:** runtime basenames + sanitizes `name`; `assertInside` guards the destination; `..` / separators / control chars stripped.
- **MIME spoofing:** extension + MIME consistency check; browser `file.type` advisory only; decode validation via asset pipeline.
- **Oversized payload:** upload-channel body cap (64 MiB) + per-file 8 MiB cap.
- **Base64 bomb:** bounded by body cap; `Buffer.from(content, 'base64')` output length checked against declared `size` before persist.
- **Cross-project injection:** `projectId` in payload; root resolution + `assertInside`; returned asset bound to the session's project.
- **Arbitrary destination:** none — renderer never supplies a path.
- **Temp-file cleanup:** no temp files (single-step persist); if a future multipart/two-step is ever chosen, cleanup is contractually required.
- **Log leakage:** base64 content never logged; errors carry codes + safe messages only.

---

## T. Renderer Responsibilities

- `<input type="file" accept="image/*">` (or PNG/JPEG/WEBP).
- Basic precheck (type/size) for UX only; runtime is authoritative.
- Upload progress state (reading / uploading / persisting / ready / failed) — v1 reports `uploading` + result; fine-grained progress is not meaningful over JSON RPC (single round-trip).
- User-visible errors (map structured codes to safe copy).
- Preview: Object URL pre-upload; after import, `scanAssets` thumbnailDataUrl.
- Renderer is NOT asset authority / path authority / role authority.

---

## U. Reference Authority Separation

- The upload RPC returns only a project asset. It never carries `referenceAssignment` / `role` / `generationMode`.
- After import, `ShortChainGenerationWorkspace` constructs the canonical assignment and calls the existing Workspace API:
  ```ts
  updateIntent({ referenceAssignments: [{ assetId, role, source }] })
  ```
- Asset Authority (project-store) and Packaging Reference Authority (workspace/reference-assignments) stay separate.

**Role authority check (from P3-D3.5B):** `PACKAGING_REFERENCE_ROLES` (frozen 6-role set) exists; the current Reference-First UI already surfaces a role selection in the reference module (per `PACKAGING_REFERENCE_ROLES` in `PackagingWorkspace` / `ShortChainGenerationWorkspace`). A role UI exists for the workspace flow; the upload contract does not decide roles. No new role authority is introduced.

---

## V. Preview

- Pre-upload: browser Object URL (revoked on replace/unmount).
- Post-import: `scanAssets` `thumbnailDataUrl` (canonical).
- Object URL is never used as asset identity.

---

## W. Replace / Remove Semantics

- Upload contract owns assets; Workspace contract owns active assignments.
- Remove assignment (`updateIntent({ referenceAssignments: [...] })` minus the assetId) does NOT physically delete the project asset (history preserved).
- Replace: import new asset → update assignment; old asset may remain in the project library.

---

## X. Progress / Cancellation

- v1: single JSON round-trip; UI states `reading → uploading → persisting → ready/failed`. Fine-grained progress is not provided (not meaningful for one RPC).
- Cancellation: v1 best-effort — if the renderer aborts the fetch, the runtime may still persist; **no corrupt canonical asset is possible** (persistAsset writes atomically: temp write + rename + sha256; a failed persist leaves no record). Documented as best-effort; real abort is a future enhancement.

---

## Y. Ownership Diagram

```
Renderer (ShortChainGenerationWorkspace.tsx)
        │  <input type="file"> → File → base64
        ▼
Web API Client (apps/web/src/web-api.ts)
        │  projects.importFileBytes(...)  [channel override]
        ▼
Web Runtime Upload Owner (apps/web-runtime/src/local-rpc-server.ts + node-runtime-host.ts)
        │  body-cap check → registry.execute('projects:import-file-bytes')
        ▼
Operation (packages/runtime-core/src/operations/... new, or project-operations extension)
        │  projectId → project exists → normalize filename → decode base64
        ▼
Project Store (packages/runtime-core/src/application/project-store.ts)
        │  persistAsset({ buffer, originalName, sourceType: 'web_upload' })
        ▼
Project Asset  (project-bound id, sha256 dedup, MIME/extension validated)
```

Every layer has a named owner file/function; no "runtime handles it".

---

## Z. Backward Compatibility

- `projects.chooseFiles` / `projects.importFiles(paths)` **remain** for desktop/CLI/test/env-injection paths. No semantic change.
- New `projects.importFileBytes` is an additive, independent sanctioned seam for the browser.
- Old path semantics are not altered to accommodate Web.

---

## AA. Future UA Tests (design only, not implemented)

| ID | Case |
|---|---|
| UA-01 | picker File metadata (name/type/size) captured |
| UA-02 | valid PNG upload → asset |
| UA-03 | valid JPEG upload → asset |
| UA-04 | empty file reject (UPLOAD_FILE_EMPTY) |
| UA-05 | unsupported MIME reject (UPLOAD_FILE_TYPE_UNSUPPORTED) |
| UA-06 | size over cap reject (UPLOAD_FILE_TOO_LARGE) |
| UA-07 | unknown project → UPLOAD_PROJECT_NOT_FOUND |
| UA-08 | project mismatch fail-closed |
| UA-09 | filename traversal sanitized |
| UA-10 | sha256 dedup returns existing asset |
| UA-11 | persisted asset survives reload (scanAssets) |
| UA-12 | no absolute path in response |
| UA-13 | upload failure leaves no corrupt asset |
| UA-14 | renderer cancel safe |
| UA-15 | same-file reselect works (input.value reset) |
| UA-16 | upload → assetId → referenceAssignment |
| UA-17 | reference_first Prepare READY |
| UA-18 | cross-project fail |
| UA-19 | Standard/analysis-led unaffected |
| UA-20 | Provider calls 0 |

---

## AB–AH. Constraints

```
Production source changes:  0
Test source changes:        0
External Provider HTTP:     0
Image generation:           0
Golden auto-update:         NO
Golden changed:             NO
Working tree:               EMPTY
Local == Remote:            MATCH
P3-B history:               preserved (post-acceptance capability corrective)
```

---

## AI. Implementation Readiness Decision

```
P3-D3.6A:                              PASS
WEB ASSET UPLOAD CONTRACT:             FROZEN
CANONICAL TRANSPORT:                   JSON RPC + base64 (projects:import-file-bytes)
PROJECT ASSET AUTHORITY:               REUSED (project-store.persistAsset)
IMPLEMENTATION:                        READY FOR SEPARATE AUTHORIZATION
P3-D3:                                 HOLD — WEB ASSET UPLOAD IMPLEMENTATION REQUIRED
P3-D4:                                 LOCKED
P3-E:                                  LOCKED
```

No STOP condition from §31 triggered: `persistAsset(buffer)` is sanctioned; project asset schema supports buffer identity; the Web Runtime server can carry the upload channel; no second asset store; no absolute path exposure; no P3-A stale core change; no Reference authority in the upload layer.

---

## AJ. Recommended Implementation Phase (next, not started)

A future **P3-D3.6B** (or equivalent) implements, per this frozen contract:

1. `project-store` exposure of `importFileBytes` (or a project-operations extension) calling `persistAsset({ buffer })` with validation + dedup + project binding.
2. `application-contracts.ts` additive typing (`projects.importFileBytes`).
3. `web-api.ts` channel mapping + renderer `<input type="file">` flow in `ShortChainGenerationWorkspace.tsx` (accept image/*, precheck, upload state, error mapping, preview via thumbnailDataUrl, replace/remove via existing assignment flow).
4. `local-rpc-server.ts` upload-channel body cap (64 MiB for `projects:import-file-bytes`; others stay 10 MiB).
5. UA-01..UA-20 tests + browser interaction test (click → input.click → onChange → import).

**STOP. No automatic implementation. No Provider call.**
