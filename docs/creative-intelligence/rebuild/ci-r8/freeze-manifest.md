# Creative Intelligence V1 Freeze Manifest

## Identity

```text
Freeze SHA: 16d1a842c83de2c1f5595a2c8a68c739b3f1eb7a
Base SHA: ef59a4caf0059e44d9440b1d32593f8f884d42b2
Branch: codex/creative-intelligence-r8-production-freeze
Date: 2026-08-28
Verification authority: LOCAL_VERIFICATION_ONLY
Operation count: 213
```

The Freeze SHA is the exact code-and-acceptance checkpoint. Later CI-R8 documentation commits carry evidence and do not change the frozen runtime behavior.

## Public Creative Research RPC

```text
creative-research:create-session
creative-research:list-sessions
creative-research:get-session
creative-research:prepare-design-brief
creative-research:get-design-brief
creative-research:update-design-brief
creative-research:start-research
creative-research:plan-initial-search
creative-research:execute-search-batch
creative-research:get-search-history
creative-research:list-references
creative-research:save-search-credential
creative-research:delete-search-credential
creative-research:get-search-credential-status
creative-research:set-reference-selection
creative-research:list-selections
creative-research:list-negative-signals
creative-research:analyze-preferences
creative-research:list-preference-insights
creative-research:update-preference-insight
creative-research:finalize-preference-insight
creative-research:plan-refresh-search
creative-research:plan-keyword-adjustment-search
creative-research:update-search-strategy
creative-research:plan-similar-search
creative-research:reanalyze-design-brief
creative-research:start-direction
creative-research:get-direction-board
creative-research:update-direction-board
creative-research:list-direction-board-revisions
creative-research:return-to-research
creative-research:complete-direction
creative-research:get-direction-context
```

## Frozen state machine

```text
INTAKE -> RESEARCH -> DIRECTION -> COMPLETED
DIRECTION -> RESEARCH
RESEARCH -> INTAKE  (explicit reanalysis only)
```

No automatic completion or hidden backwards transition is allowed.

## Persistence paths

```text
creative-research/<sessionId>/
├─ runtime/
├─ briefs/
├─ research/
│  ├─ queries/
│  ├─ references/
│  ├─ associations/
│  ├─ selections/
│  ├─ negative-signals/
│  ├─ regions/
│  └─ preference-insights/
└─ direction/
   ├─ boards/
   └─ context/
```

Legacy persistence remains separate and readable at `creative-intelligence-runs/<runId>/`.

## Frozen user surfaces

```text
Brief
References
Direction
Concept References
Category References
Selection Tray
Preference Insights
Correction Toolbar
Direction Board
Direction Context
```

## Frozen correction semantics

```text
换一批 = Search Query refinement only
调整关键词 = Search Strategy revision
重新分析 = Document reanalysis + RESEARCH -> INTAKE
找相似 = text query refinement + real search
```

## AI authority

AI may extract the Brief, plan/refine search queries, analyze selected Preferences, and reanalyze only after an explicit request.

AI may not select/reject References, silently change keywords, automatically reanalyze, decide Direction, generate the Direction Board, or mutate downstream production.

## Designer authority

The designer decides which References matter, selection/rejection reasons, when analysis runs, whether AI interpretation is correct, correction actions, what enters the Direction Board, and when Direction is complete.

## Search authority and retention

```text
Search provider: Baidu Search API v2
Credential authority: encrypted dedicated credential id reference-search-baidu
Retention review: NOT_CONFIRMED
Retention mode: PROVENANCE_METADATA_ONLY
Remote image bytes: not persisted
```

## PreferenceInsight timing contract

`finalizedAt?: string` is ISO 8601, written only on the first `DRAFT -> FINALIZED` transition and immutable thereafter. Designer Override and repeated finalize do not modify it. Legacy FINALIZED records without it remain readable. Direction re-entry compares `finalizedAt ?? createdAt` with the previous Board `updatedAt`.

## Direction Context schema

```text
sessionId
projectId
briefRevision
directionBoardRevision
projectBrief
constraints[]
visualKeywords[]
selectedReferenceIds[]
selectedReferenceRegionIds[]
preferredAttributes[]
negativeSignals[]
designerNotes[]
directionSummary
provenance {
  designBriefId
  directionBoardId
  sourceDocumentIds[]
  referenceIds[]
  referenceRegionIds[]
  negativeSignalIds[]
}
createdAt
```

It contains no Packaging, Space, Prompt, Visual Grammar or Provider-private schema.

## Known pre-existing failures and debt

```text
Runtime application:
1. analysis UI contains intake actions and a free-form API Profile provider
2. analysis API selection is controlled by App and survives settings navigation

Web Runtime typecheck: 160 pre-existing identities
Web typecheck: ReferenceAnchorWorkspace.tsx:157 TS2532
```

R8 changed-hunk intersection with these failures is zero. `NEW_R8_FAILURES = 0`.

## Accepted limitations

- Live R4-R7 is NOT RUN.
- Baidu retention permission is NOT CONFIRMED.
- ReferenceRegion UI is deferred.
- Direct Reference First consumption is deferred.
- Creative Research does not replace legacy Visual Canon, anchor production, evaluation or production translation.
- Local test results are not GitHub CI.

## Deferred capabilities

All post-freeze feature work listed in the CI-R8 specification remains deferred, including new Providers/models, AI Concept Exploration, Personal Aesthetic Model, collaboration, Visual Grammar/System DNA, automatic KV/Logo/Packaging/Space tasks and Prompt Compiler changes.

## Migration and cutover

```text
LEGACY_CI_MIGRATION_READINESS = READY_FOR_PARALLEL
DEFAULT_CUTOVER_VERDICT = NO-GO
REFERENCE_FIRST_CONSUMER_VERDICT = DEFERRED_NO_SAFE_READ_BOUNDARY
```

No legacy route, RPC, schema or data was removed.

