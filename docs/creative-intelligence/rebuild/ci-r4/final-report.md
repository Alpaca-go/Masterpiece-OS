# CI-R4 Final Report

Branch: `codex/creative-intelligence-r4-inspiration-board`  
Base: `9f10be3a0ee79e665d756e32807788b9a9055ccd`  
Implementation HEAD: `79e88569` (this report is committed immediately after that implementation head)

## Scope

First user-facing Creative Research workspace. R4 stops at intake, editable Design Brief, real Baidu reference search, provenance-only persistence, and browsing. Selection Intelligence and every CI-R5 behavior remain unimplemented.

## Files Changed

- `packages/runtime-core/src/application-contracts.ts`
- `packages/runtime-core/src/index.js`
- `packages/runtime-core/src/operations/creative-research-operations.ts`
- `apps/web-runtime/src/current-operation-graph.ts`
- `apps/web-runtime/src/node-runtime-host.ts`
- `apps/web-runtime/src/node-settings-store.ts`
- `apps/web-runtime/scripts/run-web-primary-smoke.mjs`
- `apps/web-runtime/tests/node-runtime-host.test.ts`
- `apps/web-runtime/tests/project-identity-projection.test.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/lib/useUrlScreen.ts`
- `apps/web/src/features/creative-research/CreativeResearchWorkspace.tsx`
- `apps/web/src/features/creative-research/creative-research-view-model.ts`
- `apps/web/src/features/creative-research/creative-research.css`
- `tests/runtime-application/creative-research-r4-operations.test.ts`

## Public RPC

Fourteen narrow operations were added:

- `creative-research:list-sessions`
- `creative-research:create-session`
- `creative-research:get-session`
- `creative-research:prepare-design-brief`
- `creative-research:get-design-brief`
- `creative-research:update-design-brief`
- `creative-research:start-research`
- `creative-research:plan-initial-search`
- `creative-research:execute-search-batch`
- `creative-research:get-search-history`
- `creative-research:list-references`
- `creative-research:get-search-credential-status`
- `creative-research:save-search-credential`
- `creative-research:delete-search-credential`

The Node Host operation count moved from 180 to 194. The smoke assertion now records that explicit R4 delta.

## Browser DTO

Browser-safe session, brief, query, reference, and credential-status DTOs are owned by Shared Runtime application contracts. The projection excludes canonical URLs, provider response bodies, filesystem paths, document evidence excerpts, local asset ids, content hashes, image bytes, and credentials. Session DTOs expose `sourceDocumentCount`, not source document paths.

## Credential Boundary

Provider: `baidu-search`  
Credential id: `reference-search-baidu`  
Configured status: `{ provider: 'baidu-search', configured: boolean }`  
Secret returned to Browser: **NO**

The Node Host reuses the encrypted credential store. Browser operations can save, delete, and read configuration status only. Host tests verify the submitted secret is absent from the RPC response.

## Routes

`/creative-research`: project/document/profile intake plus project-scoped recent sessions.  
`/creative-research/:sessionId`: reloadable Brief and References workspace.  
`/creative-intelligence` regression: unchanged and independently routed. The old workspace is not imported into the R4 feature.

## Intake

Project: selected from existing projects.  
Documents: existing browser document import supports PDF, DOCX, Markdown, and TXT; session creation rejects sources outside the Node-owned document intake root.  
Analysis Profile: selected from enabled analysis profiles.

## Design Brief UI

Editable in INTAKE: yes; saves a new monotonic revision through the R2 service.  
Read-only in RESEARCH: yes.  
Evidence: remains in the domain/store and is not exposed as raw evidence or excerpts to the browser DTO. Warnings and provenance-safe keyword source labels remain visible.

## Inspiration Board

Concept: derived only from `SearchQuery.kind === 'CONCEPT'`.  
Category: derived only from `SearchQuery.kind === 'CATEGORY'`.  
Query filters: use `matchedQueryIds`; cross-query references remain visible under every matching query.  
IMAGE: responsive lazy-loaded inspiration board with async decoding, no-referrer requests, broken-image fallback, and source action.  
WEB: separate source list with publisher, rank, and source action.  
Source actions validate HTTP(S) and open with `noopener,noreferrer` semantics.

## Search Lifecycle

The UI derives `NOT_STARTED`, `PLANNING`, `SEARCHING`, `READY`, `PARTIAL_FAILURE`, and `FAILED` from persisted query statuses plus the active local operation. It does not fabricate progress percentages. Successful results remain browsable during partial failure. Retry resets and executes the same failed query id without creating query variants; stale error metadata is cleared first.

Session route reload fetches session, active Brief, search history, and references from Runtime authorities.

## Image Retention

`PROVENANCE_METADATA_ONLY`  
Image bytes persisted: **NO**

R4 stores remote URLs, source provenance, query association, result rank, and retrieval time only. It does not download, cache, or commit remote image bytes.

## Selection Intelligence

**NOT IMPLEMENTED**

No selection/rejection, negative signal, attribute tagging, region selection, Selection Tray, preference inference, visual analysis, clustering, more-like-this, query variants, direction generation, or downstream handoff was added.

## Tests

- R1–R4 Creative Research targeted suite: **33/33 PASS**
- R4-specific operations/view-model/route tests: **4/4 PASS**
- Web Runtime host/adapters: **15/15 PASS**
- Root public-contract suite: **1674/1674 PASS**
- `npm run web:build`: **PASS**
- `npm run web:smoke`: **PASS**; operation count 194, provider calls 0, business writes 0, Electron process count 0
- `git diff --check`: **PASS**

The R4 tests cover DTO redaction, write-only credentials, retrying the same failed query, honest lifecycle states, cross-query filtering, unsafe source URLs, route separation, and the absence of CI-R5 UI.

## Live R4 E2E

`LIVE_R4_REFERENCE_E2E = NOT RUN`

No user-authorized Baidu credential was supplied for this run. No live result was fabricated. The passing Web smoke is offline and made zero provider calls.

## Repository Regression

Root tests, targeted Creative Research tests, Web Runtime tests, Web build, and Node Host browser smoke pass. `verify:current-flows` runs the new R4 tests successfully but retains the two already-known Web static-assertion failures listed below.

## Pre-existing Failures

`npm run verify:current-flows` continues to fail only these baseline assertions that were already recorded by CI-R3.1:

1. `analysis UI contains intake actions and a free-form API Profile provider`
2. `analysis API selection is controlled by App and survives settings navigation`

Standalone typechecking also continues to expose existing Creative Intelligence package contract drift and the existing `ReferenceAnchorWorkspace.tsx:157` possibly-undefined diagnostic. No R4 file appears in those diagnostics; the production Web build passes.

## New R4 Failures

**0**

## Current Creative Intelligence

**UNCHANGED**

The `/creative-intelligence` route, workspace component, operations, lifecycle, and user-visible behavior were not modified.

## CI-R5 Readiness

**CONDITIONAL GO**

R4 implementation and offline regression evidence are complete. CI-R5 should not begin until a user-authorized Baidu key is available for the required representative live R4 flow and the result confirms real document → Brief → search → board → source-open behavior. The two pre-existing repository assertions remain visible and are not reclassified as R4 failures.
