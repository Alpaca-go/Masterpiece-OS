# CI-R6 Final Report

Branch: `codex/creative-intelligence-r6-correction-loop`
Base: `bbd953c3da0b58b9c10256a9be87e1c101901ff9`
HEAD: `33e7db9e02cec53f17238025aa5311ddeb09ff55` (implementation checkpoint before this finalization report)

Date: 2026-08-27

## SearchQuery Provenance

`SearchQuery` now records `origin`, `parentQueryIds`, `sourceReferenceIds`,
`sourcePreferenceInsightIds`, and `excludeSeen`. Existing persisted queries remain
compatible because the new provenance fields are optional and project as
`origin: INITIAL` when absent.

The supported origins are `INITIAL`, `REFRESH`, `KEYWORD_ADJUSTMENT`, and
`SIMILAR`. Refinement outputs must cite enabled keyword ids, include a same-kind
primary keyword, stay within their mode-specific query budget, and remain novel
against the complete session query history.

## 换一批

Brief mutation: **NO**
Keyword mutation: **NO**
Maximum planned queries: **4**
Novel queries: checked against every historical query text and provider query
text in the session, including uniqueness within the new batch.
Seen exclusion: the search application service passes existing reference ids,
source URLs, and canonical URLs to the Baidu gateway exclusion contract whenever
`excludeSeen` is set.

The planner appends `PENDING` queries only. Search execution remains in the
existing search operation, preserving query planning/execution separation.

## 调整关键词

Brief revision: creates a new active revision with `revision + 1`.
Session: remains in `RESEARCH`.
Allowed fields: `conceptKeywords`, `visualKeywords`, `searchKeywords`, and an
optional designer note only. Runtime validation rejects additional fields.
Factual evidence: project facts and their document-backed `fieldEvidence` are
preserved. Interpretive evidence mappings are removed only when their value is
changed.
Keyword identity: unchanged content retains its id/source/createdAt; designer
additions use `DESIGNER` provenance.
REMOVE_KEYWORD: removing or disabling an active keyword appends an immutable
`REMOVE_KEYWORD / KEYWORD / DESIGNER` negative signal.
Query planning: deterministic `KEYWORD_ADJUSTMENT` Concept/Category queries are
appended after the revision and filtered against all previous search text.

## 重新分析

Adapter: a dedicated `DesignBriefReanalysisAdapter` with an explicit analysis
profile, bounded original-document and prior-research context, structured JSON
validation, and at most one repair call.
Feedback: explicit designer feedback is mandatory and is persisted as
`REANALYSIS_FEEDBACK / SESSION / DESIGNER`.
Document evidence: factual `fieldEvidence` can reference only evidence produced
by rereading the original documents; fabricated reference evidence is rejected
before persistence.
Transition: reuses `assertCreativeResearchTransition(session, 'INTAKE',
{ reanalysis: ... })`, retaining the R1 state-machine invariant.
History preserved: **YES**
Selections preserved: **YES**
NegativeSignals preserved: **YES**
References preserved: **YES**
PreferenceInsights preserved: **YES**

A new Brief revision and AI search keywords are stored, the active session moves
to `INTAKE`, and the UI explains that old research evidence is still available
while new search waits for the session to re-enter `RESEARCH`.

## More Like This

Reference: a designer can choose one visual dimension on a current-session
reference and request up to two same-kind `SIMILAR` queries.
Preference: an active preference insight can seed a similar-search request using
its evidence references and preference provenance.
Real Baidu search: **YES** — AI converts selected evidence into new search query
text, then the existing Baidu reference-search path retrieves real results.
AI generation: **NO**

Remote reference image URLs are included only for the configured multimodal
analysis protocol and are not persisted as model responses or local image files.

## Soft Correction Signal

The Web view model derives a read-only correction suggestion only after at least
three poor batches based on current selection/rejection evidence. It never
changes the Brief, keywords, session phase, queries, or selections automatically.

## RPC/UI

Five narrow operations were added and wired through Shared Runtime and the Node
Web Host: refresh planning, reference-similar planning, preference-similar
planning, search-strategy revision, and explicit Brief reanalysis. The operation
surface count is now 206.

The Research workspace exposes `换一批`, `调整关键词`, `重新分析`, reference
`找相似`, and preference `找更多类似`, while retaining the R4/R5 browser,
selection tray, rejection, and preference evidence surfaces.

## Retention

`PROVENANCE_METADATA_ONLY`
`TRANSIENT_IMAGE_ANALYSIS_ONLY`

No reference image binary, provider raw response, `ProjectAsset`, local image
cache, API credential, or runtime smoke artifact is added to tracked production
state. Persisted additions are provenance/evidence metadata and designer actions.

## Tests

R1-R5 targeted regression: **PASS**
R6 targeted contract tests: **PASS (7/7)**
Combined R1-R6 correction-chain rerun: **PASS (25/25)**
Root `npm test`: **PASS (1674/1674)**
`npm run cli:test`: **PASS (40/40)**
Shared Runtime tests: **PASS (14/14)**
Runtime application: **1212/1214**, with the two pre-existing failures listed
below and no R6 failure.
Node Web Host: **PASS (15/15)**
`npm run web:build`: **PASS**
`npm run web:smoke`: **PASS**, operation count 206, provider calls 0, business
writes 0, Electron/Desktop references 0.
`npm run golden:test`: **PASS**, provider calls 0, auto-update disabled.
Repository contract, version consistency, version naming, workspace boundaries,
obsolete-code, production boundaries, tracked assets, project-specific rule,
golden boundary, analysis guards, and repo guard tests: **PASS**.

`npm run verify:current-flows` and therefore `npm run repo:verify` stop only at
the two known runtime-application failures. Baseline audit reports the repository's
existing global frozen-baseline drift; R6 changes intersect zero paths in the
baseline manifest.

## Live R4

`LIVE_R4_REFERENCE_E2E = NOT RUN`

No user-authorized live provider credential run was available in this task.

## Live R5

`LIVE_R5_SELECTION_E2E = NOT RUN`

No user-authorized live provider credential run was available in this task.

## Live R6

`LIVE_R6_CORRECTION_E2E = NOT RUN`

No user-authorized live provider credential run was available in this task. No
live status is represented as PASS.

## Repository Regression

Current Production boundaries, Shared Core boundaries, golden-case isolation,
version rules, and the Short-Chain-only Web production path remain intact. No
Desktop/Electron adapter, R7 capability, image-generation path, or production
import from evaluation assets was introduced.

## Pre-existing Failures

1. `analysis UI contains intake actions and a free-form API Profile provider`
2. `analysis API selection is controlled by App and survives settings navigation`

Both failures were present outside the R6 change surface and are unchanged by
this implementation.

## New R6 Failures

`NEW_R6_FAILURES = 0`

## Current CI

`UNCHANGED`

## CI-R7 Readiness

`CONDITIONAL GO`

The offline R6 implementation and regression evidence are complete. Readiness
remains conditional until representative live R4/R5/R6 flows and an operational
retention review are explicitly authorized and recorded.
