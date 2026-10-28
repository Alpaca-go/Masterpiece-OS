# CI-R8 Legacy Creative Intelligence Migration Readiness

Audit date: 2026-08-28  
Audit baseline: `16d1a842c83de2c1f5595a2c8a68c739b3f1eb7a`

## Verdict

```text
LEGACY_CI_MIGRATION_READINESS = READY_FOR_PARALLEL
NEW_CI_DEFAULT_ENTRY = NO-GO
LEGACY_DATA = KEEP READABLE
```

Creative Research is ready to remain available beside Legacy Creative Intelligence. It is not ready to replace the legacy default entry. The legacy implementation still owns unique production capabilities, Live R4-R7 has not been run, and Baidu result-retention permission remains unconfirmed.

`READY_FOR_PARALLEL` is not deprecation or deletion permission.

## Current consumer audit

| Surface | Current evidence | Classification |
|---|---|---|
| Route | `/creative-intelligence` and `/creative-intelligence/:runId` remain routable in `apps/web/src/lib/useUrlScreen.ts` | ACTIVE_EXTERNAL_CONSUMER |
| Web workspace | `CreativeIntelligenceWorkspace.tsx` is mounted by `App.tsx`; Create and Home surfaces still link to it | ACTIVE_EXTERNAL_CONSUMER |
| Web controller | `apps/web/src/ciworkspace/controller.ts` drives run, fact review, selection, canon and anchor actions | LEGACY_STILL_UNIQUE |
| Public RPC | 21 `creative-intelligence:*` channels remain registered by the Shared Operation Registry | ACTIVE_EXTERNAL_CONSUMER |
| Application service | `creative-intelligence-application-service.ts` owns run orchestration, fact confirmation, direction selection, canon and production translation | LEGACY_STILL_UNIQUE |
| Domain package | `@masterpiece/creative-intelligence` owns truth, need, insight, opportunity, concept, direction, evaluation, visual canon and anchor contracts | LEGACY_STILL_UNIQUE |
| Persistence | `<defaultDataPath>/creative-intelligence-runs/<runId>/` with runtime, intermediate, selection history and anchor-production data | ACTIVE_EXTERNAL_CONSUMER |
| Document intake | Legacy reuses the existing Document Context service; Creative Research has a separate bounded document adapter and Brief store | SHARED_AUTHORITY_REUSED |
| Model/profile authority | Both paths resolve configured profiles through current settings/model authority | SHARED_AUTHORITY_REUSED |
| Project identity | Both paths carry current project IDs but persist non-isomorphic run/session schemas | SHARED_AUTHORITY_REUSED |
| Tests | Runtime application, Web workspace/controller and operation-registry tests exercise the legacy surface | ACTIVE_EXTERNAL_CONSUMER |
| Historical schemas | Existing `creative-intelligence-run-v0.1` records and intermediate artifacts must remain readable | HISTORICAL_ONLY |

## Public legacy RPC inventory

```text
creative-intelligence:list-runs
creative-intelligence:get-run
creative-intelligence:start
creative-intelligence:get-fact-review
creative-intelligence:confirm-facts
creative-intelligence:get-workspace
creative-intelligence:select-direction
creative-intelligence:resume
creative-intelligence:cancel
creative-intelligence:remove
creative-intelligence:on-progress
creative-intelligence:start-anchor-production
creative-intelligence:compile-anchor-production
creative-intelligence:get-anchor-production
creative-intelligence:list-anchor-candidates
creative-intelligence:approve-anchor-candidate
creative-intelligence:reject-anchor-candidate
creative-intelligence:retry-anchor-candidate
creative-intelligence:cancel-anchor-production
creative-intelligence:get-approved-anchor
creative-intelligence:get-anchor-approval-history
```

No channel was removed or redirected in R8.

## Capability parity matrix

| Capability | Legacy CI | Creative Research | Verdict |
|---|---|---|---|
| Document intake | Document Context-backed intake and fact review | R2 PDF/DOCX/MD/TXT adapter | REPLACED_BY_CREATIVE_RESEARCH for bounded research intake only |
| Brief extraction | Confirmable facts feed strategic pipeline | Evidence-linked Design Brief revisions | REPLACED_BY_CREATIVE_RESEARCH for design-research brief |
| Real web search | No equivalent Reference search workspace | R3 Baidu web/image references | REPLACED_BY_CREATIVE_RESEARCH |
| Inspiration browsing | No equivalent Concept/Category board | R4 Concept/Category References | REPLACED_BY_CREATIVE_RESEARCH |
| Selection evidence | Direction selection after generated directions | Designer Reference SELECT/REJECT evidence | Not schema-equivalent; both remain meaningful |
| Preference interpretation | Concept/direction intelligence and evaluation | R5 evidence-bound Preference Insights | REPLACED_BY_CREATIVE_RESEARCH for reference preferences |
| Correction loop | Resume/recreate around legacy run lifecycle | R6 refresh, keyword adjustment, similar and reanalysis | REPLACED_BY_CREATIVE_RESEARCH for research correction |
| Direction Board | Generated Direction Set plus explicit selected direction | Designer-authored Direction Board revisions | New path is preferred for designer-led research, not a data migration target |
| Direction Context | Selected snapshot/canon/translation context | Frozen CreativeDirectionContext | Not schema-equivalent |
| Strategic truth/need/opportunity/concept pipeline | Present | Absent by design | LEGACY_STILL_UNIQUE |
| Direction scoring/ranking/gates | Present | Absent by design | LEGACY_STILL_UNIQUE |
| Visual Canon | Present | Absent | LEGACY_STILL_UNIQUE |
| Anchor candidate generation/approval | Present | Absent | LEGACY_STILL_UNIQUE |
| Production translation | Space/Packaging translation context | Explicitly no downstream writes | LEGACY_STILL_UNIQUE |
| Image generation / production | Anchor production sub-run | Downstream handoff only | LEGACY_STILL_UNIQUE |
| Project identity | Current project ID authority | Current project ID authority | SHARED_AUTHORITY_REUSED |
| Default data path | Current settings authority | Current settings authority | SHARED_AUTHORITY_REUSED |
| Model Registry / profiles | Current profile authority | Current profile authority | SHARED_AUTHORITY_REUSED |

## Data policy

The schemas are not 1:1. R8 therefore forbids automatic conversion, bulk rewriting or deletion.

Keep readable:

```text
creative-intelligence-runs/<runId>/
creative-research/<sessionId>/
```

Rollback and later navigation changes must preserve both roots. A future migration may add read-only projections, but it must not synthesize Creative Research designer evidence from legacy model output.

## Default cutover decision

`NO-GO` because:

1. `LIVE_R4_REFERENCE_E2E`, `LIVE_R5_SELECTION_E2E`, `LIVE_R6_CORRECTION_E2E` and `LIVE_R7_DIRECTION_E2E` are `NOT RUN`.
2. `BAIDU_RESULT_RETENTION_REVIEW = NOT_CONFIRMED`.
3. Legacy Visual Canon, anchor production, scoring/gates and production translation remain unique and active.
4. Existing navigation, deep links, RPC clients and persisted runs are active consumers.

Creative Research remains a parallel Production Candidate at `/creative-research`.

## Reference First re-audit

Repository search found CreativeDirectionContext consumers only inside Creative Research storage, operations and Web presentation. No additive, read-only Reference First input accepts it. Candidate downstream inputs still own prompt or frozen schema authority.

```text
REFERENCE_FIRST_DIRECT_CONSUMER = DEFERRED_NO_SAFE_READ_BOUNDARY
```

