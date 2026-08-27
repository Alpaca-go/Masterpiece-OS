# CI-R5 Final Report

Date: `2026-08-27`

Branch: `codex/creative-intelligence-r5-selection-intelligence`

Base: `dd66d6d9d7676ab7b3a2d8229deaf529f4eee59d`

Implementation HEAD: `e13e56bc1ffaf6785147556e6984b67e51258be8`

## Scope

Designer Selection and Preference Evidence only. R5 turns explicit designer
selection, rejection, attribute tagging, and notes into durable session-scoped
evidence. AI interpretation runs only after the designer explicitly requests it
and always starts as a draft.

No CI-R6 search correction, query variants, More Like This, reanalysis, or
CI-R7 Direction Board behavior was added.

## Files Changed

- Creative Research foundation contracts, invariants, ports, and adapter contracts
- Selection, preference analysis, preference persistence, and error services
- Browser-safe application contracts and Creative Research operations
- Node Runtime composition root and operation-count smoke assertions
- Creative Research Reference cards, attribute picker, Selection Tray, and Preference Insights UI
- R1/R3/R4 compatibility tests plus R5 selection/preference tests

## Foundation Refinement

`ReferenceSelection.sessionId`: **IMPLEMENTED**

`ReferenceRegion.sessionId`: **IMPLEMENTED**

Repository read methods: `listSelections`, `listRegions`, and
`listNegativeSignals` are implemented on the existing
`ReferenceResearchRepository`.

`PreferenceInsight.analysisRunId`: **IMPLEMENTED** as optional run provenance.

Foundation remains host-neutral and contains no filesystem, network, provider,
or Web dependency.

## Repository Refinements

The existing Creative Research research store now owns current selection state,
region evidence, and immutable negative-signal history. A concrete implementation
of the existing `PreferenceEvidenceRepository` owns Preference Insight files.
No second Selection or Preference repository contract was introduced.

## Selection Persistence

Layout:

- `research/selections/<referenceId>.json`
- `research/negative-signals/<signalId>.json`
- `research/regions/<regionId>.json`
- `research/preference-insights/<insightId>.json`

Every write is contained under a validated session root and uses atomic JSON
writes. Selection updates are serialized by `sessionId + referenceId`. A
selection or region cannot be stored unless the referenced Reference exists in
the same session.

## Selection Semantics

`SELECTED`: current designer-owned evidence; supports the existing nine
`ReferenceAttribute` values and an optional designer note.

`REJECTED`: current exclusion state and appends a designer-owned
`REJECT_REFERENCE / REFERENCE` NegativeSignal with an optional reason.

`NONE`: neutral current state; creates no new NegativeSignal.

Attributes are validated and deduplicated. Browser DTOs omit session internals,
actor fields, source paths, credentials, binary data, and provider payloads.

## Negative Signals

Reject creates immutable history. Undo or selection changes update current
Selection state without deleting prior NegativeSignals. Preference Analysis
consumes rejection signals only when their source Reference is still currently
`REJECTED`.

## Selection Tray

Selected count is derived only from current `state === SELECTED`. Attribute
counts are derived only from current selected `selectedAttributes`. REJECTED and
NONE entries do not contribute. The tray can show the current selected Reference
metadata and exposes the explicit analysis action.

## Attribute Tagging

The Web UI reuses all nine existing domain attributes: typography, layout,
color, graphic, material, photography, image treatment, application, and
atmosphere. Tag and note changes persist without any LLM or Vision call.

## Preference Analysis Adapter

`ReferencePreferenceAnalysisAdapter` uses the current OpenAI-compatible
multimodal reasoner through the existing host credential resolver. It does not
introduce a model registry, credential store, hard-coded endpoint, or hard-coded
model id.

## Model and Profile Boundary

The operation requires an explicit `profileId`. The resolved credential must
match that exact id, use `modelType = analysis`, and use
`protocol = openai-chat-multimodal`. Unsupported or silently substituted
profiles fail closed with `CREATIVE_RESEARCH_PREFERENCE_PROFILE_UNSUPPORTED`.

## AI Input and Output Contract

Input is bounded to the active Brief summary, audience, visual keywords,
SELECTED Reference ids/metadata/attributes/notes, up to 12 selected remote image
URLs, and active rejection reasons. Unselected References, complete document
corpus, filesystem paths, Baidu credentials, and raw provider responses are not
sent.

Output is structured JSON with category, summary, optional confidence, and
supporting Reference/NegativeSignal ids. The repair budget is one initial call
plus at most one repair.

## Evidence Validation

Every supporting id must come from the exact analysis input. Unknown ids,
invalid categories, out-of-range confidence, missing evidence, and invalid JSON
fail closed. Validation occurs in both the concrete adapter and the application
service, so fake or alternate adapters cannot bypass the evidence rule.

## Preference Insight Persistence

New analysis runs create new `DRAFT` insights with an `analysisRunId`. Existing
FINALIZED insights remain stored and are not replaced by a later run. A
FINALIZED insight cannot be downgraded to DRAFT.

## Designer Override and Finalize

The UI exposes evidence drill-down, designer correction, and explicit
confirmation. Display prefers `designerOverride` over the AI summary while
retaining the original summary. Finalization reuses the R1 invariant requiring
supporting evidence.

## Reference Region

`REFERENCE_REGION_UI = DEFERRED`

Region identity and persistence are implemented and tested; region selection UI
is optional in R5 and was not added.

## Image Retention

`PROVENANCE_METADATA_ONLY`

`TRANSIENT_IMAGE_ANALYSIS_ONLY`

Image bytes persisted: **NO**

`WebReferenceImportAdapter` called: **NO**

Selected remote image URLs are sent directly as bounded multimodal input. R5
does not download, cache, base64-encode, import, or persist image bytes.

## Tests

- R1-R5 Creative Research targeted suite: **47/47 PASS**
- R5-specific tests: **11/11 PASS**
- Root public-contract suite: **1674/1674 PASS**
- CLI suite: **40/40 PASS**
- Shared Runtime Core: **14/14 PASS**
- Web Runtime host/adapters: **15/15 PASS**
- `npm run web:build`: **PASS**
- `npm run web:smoke`: **PASS**
  - operation count: `201`
  - provider calls: `0`
  - business writes: `0`
  - Electron/Desktop process count: `0`
- `npm run golden:test`: **PASS**; Provider calls `0`; auto-update `NO`
- Repository Contract Guard: **PASS**
- Analysis Guards: **PASS**
- Repository Guard tests: **41/41 PASS**
- `git diff --check`: **PASS**

## Live R4 E2E

`LIVE_R4_REFERENCE_E2E = NOT RUN`

No user-authorized Baidu credential was supplied. The offline Web smoke made
zero provider calls and is not represented as a live reference-search run.

## Live R5 Selection E2E

`LIVE_R5_SELECTION_E2E = NOT RUN`

No user-authorized Baidu plus multimodal model credential set was supplied for
the representative live selection-to-finalized-insight flow.

## Repository Regression

All R5 targeted tests, root tests, CLI, Web Runtime, Web build, Web smoke,
Golden, repository boundary checks, analysis guards, and secret checks are
green. `repo:verify` reaches `verify:current-flows` and remains red only because
of the two pre-existing Web static assertions below.

The baseline drift audit reports `BASELINE_DRIFT_DETECTED` against the old
frozen baseline commit. R5 changes do not intersect any path declared in
`docs/baseline/baseline-files-manifest.md`.

## Pre-existing Failures

1. `analysis UI contains intake actions and a free-form API Profile provider`
2. `analysis API selection is controlled by App and survives settings navigation`

These assertions were recorded before R5 and are not reclassified as R5
regressions.

## New R5 Failures

**0**

## Current Creative Intelligence

**UNCHANGED**

The `/creative-intelligence` route, operations, lifecycle, Packaging, Space, and
Reference First behavior were not modified.

## CI-R6 Readiness

**CONDITIONAL GO**

R5 code and offline evidence are complete. Do not claim unconditional readiness
until a user-authorized representative R4 live search flow and R5 live
selection/analysis/finalization/reload flow pass, and the outstanding retention
review is confirmed. CI-R6 behavior remains unimplemented.
