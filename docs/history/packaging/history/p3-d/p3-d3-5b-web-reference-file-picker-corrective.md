# P3-D3.5B — Web Reference File Picker & Project Asset Import Corrective (HOLD)

**Date:** 2026-08-15
**Branch:** `codex/visual-analysis-a1-multi-provider`
**Start HEAD:** `aa1aad2c8b0e39e69718c932e640efb972241b24` (P3-D3.5A HEAD, resolved via `git rev-parse HEAD`)
**Phase Class:** POST-ACCEPTANCE WEB CORRECTIVE — transport seam audit
**Status:** **HOLD — WEB FILE UPLOAD TRANSPORT CONTRACT GAP**
**External Provider HTTP calls:** 0
**Production source changes:** 0
**Test source changes:** 0
**Golden:** unchanged

---

## A. Git

| Field | Value |
|---|---|
| Branch | `codex/visual-analysis-a1-multi-provider` |
| Start HEAD (resolved) | `aa1aad2c8b0e39e69718c932e640efb972241b24` |
| Working tree | clean |

---

## B. P3-D3.4 / P3-D3.5A Consumed

- **P3-D3.4** (`faad940`): Reference upload blocker located at `RBW-04` — `projects:choose-files` returns `[]` from unset `MASTERPIECE_WEB_SELECTED_FILES`; `uploadReferenceImage()` silently returns.
- **P3-D3.5A** (`aa1aad2`): Product role evidence contract corrected; false recoverability claim corrected; Standard/analysis-led OFFLINE READY.

This phase targets the remaining Reference-First Web upload blocker.

---

## C. Existing Web File Import Seam Audit (per P3-D3.5B §5)

Audited: `apps/web`, `apps/web-runtime`, `packages/runtime-core`, `project-store`, `application-contracts`, `web-api`.

| Seam | File / Function | Accepts browser File bytes? |
|---|---|---|
| `projects.chooseFiles` | `application-contracts.ts:2394`; `node-native-operations.ts:39` | NO — env-injection only (`MASTERPIECE_WEB_SELECTED_FILES`); never opens a picker |
| `projects.importFiles(paths)` | `application-contracts.ts:2396`; `project-store.ts:246` | NO — accepts filesystem paths only; `persistAsset` copies from `sourcePath` |
| `persistAsset({ buffer })` | `project-store.ts:270-316` | INTERNAL ONLY — buffer branch used by zip extraction; NOT exposed as a public RPC/API |
| web-api RPC transport | `apps/web/src/web-api.ts` `invoke` | NO — JSON-only (`JSON.stringify({ args })`); no multipart / base64 / bytes channel |
| browser file input | `apps/web/src/**` | NO — zero `<input type="file">` occurrences in the entire renderer |
| `files.getPathForFile` | `web-api.ts:94-96` | NO — returns `''` (browser File has no trusted OS path) |

**Conclusion:** there is **no sanctioned transport bridge** from a browser `File` (bytes + safe metadata) into the Node/Web Runtime project asset authority.

---

## D. Browser Picker

**NOT IMPLEMENTED** — this phase is a transport-contract HOLD, not an implementation phase. No `<input type="file">` is added because there is no sanctioned bytes→asset bridge to consume (P3-D3.5B §31: do not invent a base64 mega-RPC or fake temp path).

## E. File Input Lifecycle

**N/A** — no file input exists; no lifecycle to implement this phase.

## F. File Validation

**N/A** — no file input exists. (Required later: MIME allowlist, non-zero bytes, size cap, filename safety — reusing existing asset rules.)

## G. Upload / Import Transport

**GAP — the blocking finding.** The only asset-ingestion RPC (`projects.importFiles`) requires absolute filesystem paths, which a browser cannot provide (browser File has no trusted OS path; `files.getPathForFile` returns `''`). `persistAsset` supports an internal `buffer` branch (sanctioned persistence logic used by zip extraction) but it is not exposed as a public bytes-ingestion RPC.

Per P3-D3.5B §5/§31: "If a sanctioned browser File → project asset bridge is completely absent: STOP — HOLD — WEB FILE UPLOAD TRANSPORT CONTRACT GAP. Do not temporarily invent base64 mega-RPC / fake file path / unsafe temp directory / a second asset store."

**STOP taken. No production change.**

## H. Project Asset Persistence

`persistAsset` (project-store.ts:270-316) is the canonical persistence path and **does** support `buffer` writes (sanctioned, deterministic, sha256-dedup, project-bound, MIME from extension, usage tagging). It is the correct target for a future bytes-ingestion RPC — but the RPC seam does not exist yet.

## I. Project Binding

`importFiles` / `persistAsset` bind assets to the project root (`assertInside` guards). A future bytes RPC must reuse this binding (asset.projectId === current projectId). No change this phase.

## J. Reference Role Authority

The canonical role authority exists: `PACKAGING_REFERENCE_ROLES` (frozen 6-role set from `reference-policy.js`), surfaced through `reference-assignments.js` / workspace `referenceAssignments[]`. Role selection UI is a separate concern; this phase does not reach it (transport HOLD precedes it).

## K. Reference Assignment

Canonical shape `{ assetId, role, source }` via workspace `updateIntent({ referenceAssignments })` is already proven (P3-D3.2 offline readiness). Assignment creation requires an imported assetId first — blocked by the transport gap.

## L. Preview / Replace / Remove

Not reached this phase.

## M. HERO Reference-First Offline Prepare

Already proven in P3-D3.2 (offline): canonical `referenceAssignments` with 1 assignment → Prepare READY, `references.length=1`, `count=1`, no `REFERENCE_REQUIRED`. Unchanged.

## N. Standard Regression

P3-D3.5A corrected the analysis-led path; unaffected by this HOLD (no production change).

## O. Negative Cases

Not implementable until the transport bridge exists (BC-NEG-01..08 depend on a real picker + import RPC).

## P. BC Guards

**NOT ADDED** — BC guards pin a working Web file-picker flow (BC-03..BC-24). No execution evidence exists; adding guards that assert non-existent behavior would fabricate coverage. BC will be added in the phase that implements the transport contract.

## Q. BB / Existing Guards

BB (25/25), AZ, AX, AW, AV, Provider-targeted — unchanged and PASS at P3-D3.5A. No guard touched this phase.

## R. Full Regression

**NOT RE-RUN** — zero production/test changes this phase (transport HOLD). The P3-D3.5A `repo:check` baseline remains valid.

## S. Production Changed Files

**0** (none).

## T. Provider Calls

```
External Provider HTTP:   0
Image generation:         0
```

## U. Golden

```
Golden auto-update:       NO
Golden changed:           NO
```

## V. P3-B Historical Preservation

P3-B accepted history untouched. This HOLD is recorded as a post-acceptance corrective requirement (Web Asset Upload Contract), not a rewrite of P3-B.

## W. Working Tree

EMPTY.

## X. Local / Remote

MATCH at Start HEAD `aa1aad2`.

---

## Y. Final Decision

```
P3-D3.5B:                              HOLD — WEB FILE UPLOAD TRANSPORT CONTRACT GAP
REFERENCE-FIRST WEB UPLOAD:            BLOCKED (transport contract gap; no sanctioned
                                       browser File → project asset bridge)
STANDARD / ANALYSIS-LED:               OFFLINE READY (P3-D3.5A, unchanged)
P3-D3:                                 HOLD — WEB WORKFLOW CORRECTIVE REQUIRED
P3-D4:                                 LOCKED
P3-E:                                  LOCKED
```

Per P3-D3.5B §5 / §31 / §37: no sanctioned browser File → Node project asset transport exists; the phase stops rather than inventing a base64 mega-RPC, fake file path, unsafe temp directory, or second asset store.

---

## Z. Next Step

A separate **Web Asset Upload Contract** phase is required to design and implement the sanctioned seam:

1. Define a bytes-ingestion RPC (e.g. `projects:import-files-bytes` or equivalent) that reuses `project-store.persistAsset({ buffer })` (sanctioned persistence, sha256 dedup, project binding, MIME/extension validation, size caps).
2. Expose it through `web-api` (JSON RPC with base64 payload, or a proper multipart endpoint — per the new contract, not a one-off).
3. Wire the browser `<input type="file">` → bytes → import → assetId → `updateIntent({ referenceAssignments })` flow in `ShortChainGenerationWorkspace.tsx`.
4. Add BC guards + browser interaction tests at that point.

**STOP. No automatic implementation. No Provider call.**
