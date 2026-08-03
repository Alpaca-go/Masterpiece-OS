# Creative Intelligence 2.0 Architecture Map

Status: Phase 0 architecture baseline, 2026-08-03.

## Product boundary

Creative Intelligence 2.0 adds one upstream orchestration layer. It does not
create a NICE runtime and does not fork the production image pipeline.

```text
Document Adapter ─┐
                  ├─ Evidence Ledger → Project Truth Model → Opportunity Map
Visual Adapter ───┘                                      ↓
                                  Fast Decision or Guided Direction
                                                    ↓
                                      one Creative Decision V2
                                                    ↓
                   existing Style Profile → Locked Assets → Anchor → Canon
                                                    ↓
                                  existing Short-Chain generation runtime
```

## Existing capability map

| Required responsibility | Current implementation | V2 disposition |
|---|---|---|
| Document parsing and fact extraction | `packages/document-ingestion`, Desktop `document-context-core.ts` and `document-context-service.ts` | Retain as the only Document Intelligence Core; add a V2 adapter over its structured output. |
| Visual asset understanding | Desktop unified visual understanding, `VisualDecisionPacket`, Project Visual Context | Retain image-read-once path; add a V2 adapter over persisted structured evidence. |
| File ingestion, hashing and project storage | Project Store, document ingestion and existing asset records | Reuse; V2 must not introduce a second source store. |
| Evidence metadata and structural repair | `DocumentVisualContextEvidence`, analysis-runtime evidence-safe merge and repair metadata | Strengthen into a shared ledger. Self-Healing remains structural only. |
| Unified Project Truth Model | No shared production artifact | Add. Both adapters write typed claims through one deterministic merge. |
| Category Opportunity Map | Scattered analysis/creative-direction fields | Add as a distinct evidence-backed artifact. |
| Creative Direction generation | `creative-direction.js` generates 1–3 options in one response | Replace only the upstream orchestration: guided mode requires exactly three mechanism-distinct directions. Keep legacy generation readable. |
| Direction diversity validation | Prompt guidance only | Add deterministic validator and persisted comparison artifact. |
| User direction decision | Session decision log is generic; no field-level merge contract | Add a confirmed, immutable decision artifact. No “enable all” operation. |
| Formal Creative Decision | Creative Decision v1 (`schema_version: 1.0`) is immediately compiled from the model-recommended direction | Add V2 and a legacy normalizer. Guided mode cannot create a formal decision before confirmation. |
| Style Profile and Locked Assets | `@masterpiece/creative-production-runtime` plus Desktop services | Reuse. Add provisional/document status and candidate-to-confirmed compilation inputs without a parallel implementation. |
| Anchor Candidate, Visual Canon and generation | Existing Creative Production and Short-Chain runtimes | Frozen. Consume the single confirmed V2 decision through adapters. |
| Desktop decision UI | Existing analysis and creative-production workspaces | Extend the existing visual-analysis surface; do not add a NICE top-level entry. |

## Frozen boundaries

1. Creative Decision remains the single formal strategy source downstream.
2. Creative Decision confirmation is never changed by repair, retry or a model.
3. Style Profile, Confirmed Locked Assets, Anchor, Visual Canon and Short-Chain
   remain the only production chain.
4. Self-Healing may repair shape, references and safe defaults; it may not
   alter strategy, industry identity, selected direction or locked assets.
5. Full reports, NICE methodology text and raw evidence never enter production
   prompts.
6. Existing projects remain readable without fabricated evidence or decision
   history.
7. Visual assets are understood once. Guided direction reads cached structured
   evidence and never reattaches all original images.

## V2 ownership

The shared contracts and deterministic orchestration belong in a new internal
package, `@masterpiece/creative-intelligence-runtime`. Desktop owns persistence,
provider calls and UI. The package must not depend on Electron, Desktop,
providers, image-generation runtime or project-specific rules.

## State boundary

V2 orchestration states are additive metadata around the current Creative
Session. Legacy states remain readable. `CREATIVE_DECISION_CONFIRMED` is the
only transition that authorizes downstream compilation. A draft or model
recommendation is not confirmation.

## Known implementation corrections

- The document proposes YAML in places; the repository standard is JSON plus
  draft 2020-12 schemas, so V2 artifacts use JSON.
- The proposed `project/analysis` directory is mapped under the existing
  per-project runtime/output root rather than introducing a second project root.
- The existing Creative Direction model response currently auto-selects a
  recommendation. In guided mode it will become a hypothesis set; only the
  explicit user-decision artifact may select the formal direction.
- Creative Decision v1 remains the downstream compatibility surface until
  Phase 5. V2 is normalized to the current production contracts instead of
  replacing Prompt Compiler, Anchor or Canon.

