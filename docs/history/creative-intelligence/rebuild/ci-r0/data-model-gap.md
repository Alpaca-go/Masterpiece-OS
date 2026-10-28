# CI-R0 Data Model Gap

All eleven proposed V1 model names were searched exactly across current apps,
packages and tests; none exists as a current contract. Similar concepts exist,
but none is safe to rename or expose directly as the V1 model.

| New model | Existing equivalent or nearest evidence | Reuse? | Gap |
|---|---|---|---|
| `CreativeResearchSession` | `CreativeIntelligenceRun`; production `CreativeSession` | ADAPT concepts only | Needs research lifecycle, brief revision, queries, reference board, negatives, preference evidence and Direction Board; must not reuse schema `6.0` semantics |
| `DesignBrief` | `DocumentVisualContext`, compiled context brief, `ProjectPlanningBriefRecord` | ADAPT | No editable canonical brief with revision, user approval, goals, audience, deliverables, constraints and evidence links as one domain object |
| `SearchKeyword` | none | NO | Needs normalized term, source, rationale, locale, status and provenance |
| `SearchQuery` | none | NO | Needs query text, engine/provider, filters, pagination/cursor, status, timestamps and originating keywords |
| `ReferenceItem` | `ProjectAsset`, `ReferenceAssetSelectionItem`, `ReferenceAssetDecision` | ADAPT | Existing models are local files and generation roles; missing URL, publisher, provider, query, rank, license, attribution, fetchedAt and immutable source snapshot |
| `ReferenceSelection` | `ReferenceAssetSelection`, task reference subsets, direction selection state | ADAPT | Current selection is local intake/dedupe or generation routing; missing designer keep/reject/shortlist actions over search results and negative-signal linkage |
| `ReferenceRegion` | none | NO | Needs image-relative region/crop geometry, intent, annotation, source image dimensions and stable region identity |
| `NegativeSignal` | Reference Anchor avoidance text, blocked/rejected directions, diagnostics | ADAPT concepts only | No first-class persisted negative preference with actor, target, reason, evidence and scope |
| `PreferenceInsight` | CI `InsightItem`, Document Context visual preferences, Reference Anchor user preference | ADAPT | No derived insight explicitly traced to reference selections/rejections and regions |
| `DirectionBoard` | `DirectionSet`, direction cards, `VisualCanon`, selected snapshot | ADAPT | No composed board linking references, regions, narrative, design principles, evidence, alternatives and approval revision |
| `CreativeDirectionContext` | `CreativeDirectionCandidate`, selected snapshot, translation context | ADAPT | Needs V1 handoff envelope that binds brief revision, board revision, selected references, negatives, provenance and downstream read-only projections |

## Required metadata for `WEB_REFERENCE`

At minimum, a future immutable source record needs:

```text
sourceUrl
canonicalUrl
provider
publisher/domain
queryId
resultRank
title/alt text
license/usage status
attribution
retrievedAt
contentHash
localAssetId (after canonical import)
```

Current `ProjectAsset.sourceType` is limited to `file`, `folder`, and
`archive-extracted`; it cannot truthfully represent a web result. The future
adapter should import selected bytes into the existing asset authority while
preserving separate immutable web provenance.

## Design Brief parser gap

Current normalized documents and `DocumentVisualContext` are evidence inputs,
not a Design Brief aggregate. The future Design Brief should reference source
documents and extracted facts instead of copying parser internals. PDF, DOCX,
Markdown and TXT can enter through the existing parser. PPT/PPTX needs a new
parser capability before it can be claimed as supported.
