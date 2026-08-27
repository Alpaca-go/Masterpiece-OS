# CI-R4.1 Inspiration Board Final Reconciliation

Date: `2026-08-27`

Branch: `codex/creative-intelligence-r4-inspiration-board`

Audited base: `444fb7fd7fea2d6f093ca7eae985524515554b5a`

Implementation HEAD: `3f8a8246abab3fc736ef3cdcd983da37815e5ec0`

## Scope

This reconciliation closes the two CI-R4 acceptance gaps identified after the
initial Inspiration Board delivery:

1. Concept and Category references now have explicit first-level separation.
2. Active Design Brief evidence is projected to a browser-safe, field-level
   trace and exposed through a low-noise UI.

No CI-R5 selection, preference-learning, similarity, clustering, direction
generation, or downstream handoff behavior was added.

## Corrective Files

- `packages/runtime-core/src/application-contracts.ts`
- `packages/runtime-core/src/operations/creative-research-operations.ts`
- `apps/web/src/features/creative-research/creative-research-view-model.ts`
- `apps/web/src/features/creative-research/CreativeResearchWorkspace.tsx`
- `apps/web/src/features/creative-research/creative-research.css`
- `tests/runtime-application/creative-research-r4-operations.test.ts`

## Concept and Category Separation

The References workspace now has explicit `Concept References` and
`Category References` first-level tabs. Membership is derived exclusively from
`SearchQuery.kind`.

Query chips are restricted to the active kind. Reference filtering first
applies the active kind and then the selected query id through
`matchedQueryIds`. A reference matched by both a Concept and a Category query
therefore appears in both first-level views, while a query id from the inactive
kind cannot leak results into the current view.

IMAGE and WEB presentation remains separate after kind/query filtering.

## Browser-safe Evidence Contract

`CreativeResearchBriefDto` now includes:

- `evidence`: referenced evidence items with `id`, safe `sourceLabel`,
  structured `locator`, and `excerpt`.
- `fieldEvidence`: mappings from supported factual Brief fields to evidence
  ids.

Projection is limited to evidence actively referenced by these factual fields:

- `projectSummary`
- `designTask`
- `audience`
- `scenarios`
- `coreMessages`
- `constraints`

Unknown ids and unreferenced evidence are omitted. Multiple evidence items per
field remain supported.

## Redaction Boundary

Evidence source labels are reduced to a bounded basename. Windows and POSIX
absolute paths are not returned to the Browser. The projection does not expose
the document corpus, prompt text, raw model response, credentials, local asset
ids, or unrelated evidence.

The Browser receives only the minimum trace needed to explain the active Brief:
safe source label, locator kind/value, and excerpt.

## Evidence UI and Designer Override

The six factual Brief fields expose a low-noise `依据` action only when active
field evidence exists. The evidence panel displays source, locator, and excerpt.

Editing a factual field immediately hides its evidence action and closes an
open panel for that field. On save, the existing Design Brief service removes
the changed field's stale `fieldEvidence` mapping; the next DTO projection then
omits evidence no longer referenced by any active field.

## Tests

- R4/R4.1 operations, projection, view-model, route suite: **7/7 PASS**
- R1-R4.1 targeted Creative Research suite: **36/36 PASS**
- Web Runtime host/adapters: **15/15 PASS**
- Root public-contract suite: **1674/1674 PASS**
- `npm run web:build`: **PASS**
- `npm run web:smoke`: **PASS**
  - operation count: `194`
  - provider calls: `0`
  - business writes: `0`
  - Electron process count: `0`
- `git diff --check`: **PASS**

Behavioral coverage includes first-level kind separation, current-kind query
chips, cross-kind reference visibility, foreign-kind query rejection, safe
evidence DTO projection, path redaction, multiple evidence, unknown/unreferenced
evidence removal, designer-override cleanup, and continued absence of CI-R5 UI.

## Live Baidu E2E

`LIVE_R4_1_REFERENCE_E2E = NOT RUN`

No user-authorized Baidu credential was supplied. No live result is claimed or
fabricated. The passing Web smoke is offline and made zero provider calls.

## Image Retention

`RETENTION_REVIEW = NOT_CONFIRMED`

Current implementation: `PROVENANCE_METADATA_ONLY`

The implementation continues to persist remote URL and provenance metadata;
it does not download or retain remote image bytes. This reconciliation does not
change retention behavior or claim a completed policy review.

## Repository Regression

The R4.1 changes pass the targeted Creative Research suites, Web Runtime tests,
root tests, production Web build, and offline Node Host browser smoke.

`npm run verify:current-flows` executes the R4.1 tests successfully but remains
red only because of the two baseline Web static assertions recorded before this
reconciliation.

## Pre-existing Failures

1. `analysis UI contains intake actions and a free-form API Profile provider`
2. `analysis API selection is controlled by App and survives settings navigation`

These failures predate R4.1 and are not reclassified as R4.1 regressions.

## New R4.1 Failures

**0**

## R4 Verdict

**CONDITIONAL PASS**

The two identified acceptance gaps are corrected and offline regression evidence
is green. The verdict remains conditional because a credential-authorized live
Baidu reference-search flow was not available and retention review remains
unconfirmed.

## CI-R5 Readiness

**CONDITIONAL GO**

Do not treat this as unconditional authorization to begin CI-R5. Before that
work starts, complete the representative live document -> Brief -> Baidu search
-> Inspiration Board -> source-open flow with a user-authorized credential and
record its evidence. Confirm the image-retention policy separately. CI-R5 scope
must remain outside R4.1 until those conditions are resolved.
