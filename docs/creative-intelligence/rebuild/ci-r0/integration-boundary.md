# CI-R0 Proposed Integration Boundary

## Decision

**Recommendation: NEW DOMAIN + ADAPTERS + EXISTING RUNTIME AUTHORITIES.**

Do not directly extend the current CI application service into the new V1
workflow. Its live contract is document intake → fact confirmation →
deterministic CI stages → direction selection → canon/anchor/translation. V1
adds a materially different research lifecycle: planning → Design Brief → real
reference search → designer selection → preference analysis → Direction Board.

## Dependency map

```text
Creative Intelligence V1 domain (new semantic contracts)
│
├─ Files / Brief
│  ├─ DocumentIntakeAdapter
│  │  └─ current Document Context + document parser (frozen)
│  └─ ProjectBriefLinkAdapter
│     └─ current Project Store / planning brief records (frozen)
│
├─ Research
│  ├─ ReferenceSearchGateway                 NEW
│  ├─ SearchHistoryRepository                NEW
│  └─ WebReferenceImportAdapter
│     └─ current Project Asset persistence   FROZEN
│
├─ Intelligence
│  ├─ AnalysisModelAdapter
│  │  └─ Model Registry + Model Runtime      CURRENT AUTHORITY
│  └─ Evidence/Direction adapters
│     └─ selected pure CI capabilities       ADAPT
│
├─ References
│  ├─ UserReferenceAdapter
│  │  └─ Project assets / Reference Anchor   ADAPT
│  └─ ReferenceFirstHandoffAdapter
│     └─ current Reference First             READ/CALL ONLY
│
├─ AI Exploration
│  └─ ExplorationGenerationAdapter
│     └─ current image-generation service    FROZEN
│
├─ Persistence
│  └─ new V1 repository under runtime-core application boundary
│     (no browser filesystem authority; atomic writes/event log reused)
│
└─ Downstream handoff
   ├─ Creative Production application surface
   ├─ Packaging application authority        READ ONLY
   └─ Space application authority            READ ONLY
```

## Adapter rules

1. V1 contracts own V1 semantics. Existing schemas are inputs/outputs, never
   renamed aliases.
2. Web calls semantic operations over the existing Runtime API; it never reads
   run files or calls providers directly.
3. Search results remain remote provenance records until selected/imported.
   Selected bytes enter the canonical Project Asset store through one adapter.
4. The search gateway returns evidence-bearing results. It does not return an
   LLM-authored list presented as search evidence.
5. LLM/Vision calls resolve existing API profiles and credentials. No V1 API
   keys or provider registry are introduced.
6. AI exploration compiles and starts through the current image-generation
   application service. It does not import Space or Packaging compilers.
7. Reference First consumes an explicit V1 handoff projection; V1 does not
   change Reference First roles, contamination policy, or target-scene rules.
8. Packaging and Space receive a reviewed `CreativeDirectionContext` projection
   through application boundaries. V1 does not write their internal schemas.

## UI reuse map

| New UI need | Existing component/pattern | Decision | Boundary |
|---|---|---|---|
| Workspace shell/navigation | `AppShell`, `TopBar`, current page routing | REUSE | Keep current navigation authority |
| Design Brief editor | Fact review and existing form primitives | NEW | Reuse controls, build a dedicated revision-aware editor |
| Document upload | Current CI upload page and browser document import RPC | ADAPT | Preserve format/size errors and host staging |
| User reference upload | `VisualAssetUploader` | ADAPT | Add V1 source role; retain canonical asset persistence |
| Masonry reference board | No current masonry/research component | NEW | Must render real provenance and selection state |
| Reference card | Asset card, CI direction card, gallery thumbnail patterns | ADAPT | New contract must show source/license/query metadata |
| Reference region selector | No current component | NEW | Requires geometry/annotation model |
| Selection tray | CI selection dialog and `OutputGallery` selection state | ADAPT | Persist designer actions in V1 repository, not component state |
| Negative-signal capture | Reference Anchor avoidance input | ADAPT | Promote to structured V1 negative evidence |
| Preference insight panel | CI advanced drawer/fact rows | ADAPT | Show evidence links to selected/rejected references |
| Direction Board | Direction cards + Visual System page + gallery patterns | NEW | Compose V1 board; do not expand the existing monolith |
| AI exploration canvas | `PreviewCanvas` | ADAPT | Feed V1 exploration adapter results only |
| Image comparison | `OutputGallery` A/B mode | ADAPT | Generalize item contract and persist decisions |
| Generic cards/buttons/dialogs | UI primitives | REUSE | Presentational reuse only |

## Deprecation plan

| Existing item | Plan | Migration gate |
|---|---|---|
| Current CI package pure capabilities | KEEP | Reassess per adapter; no bulk deprecation |
| Current CI application service/RPC | DEPRECATE_AFTER_CI-RX | V1 parity for live entry, persisted-run reader/migration, zero current UI consumer, full regression |
| Current `CreativeIntelligenceWorkspace` | DEPRECATE_AFTER_CI-RX | V1 UI acceptance, deep-link/run-history migration, accessibility and Web smoke |
| Current CI persisted runs | KEEP | Backward reader and explicit migration shipped |
| Creative Production Runtime and Creative Session | KEEP | Independent production capability; not part of CI replacement |
| Reference First and Reference Anchor compatibility readers | KEEP | Registered compatibility removal conditions satisfied |
| `analysis-runtime` facades | KEEP | Zero import consumers and compatibility review |
| Removed phase docs/harnesses | HISTORICAL_ONLY | Git history remains recovery mechanism |

No item is `DEPRECATE_NOW` in CI-R0.
