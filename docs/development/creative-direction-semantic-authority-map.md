# Creative Direction Semantic Authority Map

Status: CD-R1 production-handoff audit, 2026-09-01

## Confirmed authorities

| Artifact | Current semantic owner | Stable input used by Creative Direction |
|---|---|---|
| Strategy contribution | `CreativeIntelligenceWorkspaceView.selectedDirectionSnapshot.direction` | `title`, `thesis`, `systemHypothesis`, `strengths`, `risks`; snapshot `selectionRevision` and `directionFingerprint` remain provenance |
| Visual contribution | Creative Research `DirectionBoard` and `CreativeDirectionContext` | direction summary, visual keywords, explicit visual dimensions, constraints, negative signals, selected-reference attributes |
| Final direction | Runtime Core Creative Direction application service | projected Strategy/Visual contributions plus confirmed Shared Project Context |
| CI Visual Canon | `@masterpiece/creative-intelligence/visual-canon` | complete `SelectedDirectionSnapshot`, Project Truth facts and Evidence Ledger entries |
| Anchor Contract | `@masterpiece/creative-intelligence/anchor-contract` | CI Visual Canon plus the same complete `SelectedDirectionSnapshot` |
| Space/Packaging translation | `@masterpiece/creative-intelligence/production-translation` | CI Visual Canon, Anchor Contract and complete snapshot; currently shadow/comparison-only |

## Metadata exclusion

The Strategy and Visual projections explicitly name semantic fields. They do not recursively enumerate objects. Schema versions, IDs, UUIDs, timestamps, actors, revisions, fingerprints and trace keys are retained only in provenance/fingerprints and never enter user-visible principle lists.

## Production compiler STOP decision

CD-R1 STOP-1 and STOP-2 apply to the final Canon bridge:

- The current Canon builder requires `directionFamily`, `visualMechanism`, `systemHypothesis`, cross-media behavior, and fact/evidence/concept/opportunity/insight/need trace references.
- `FinalCreativeDirection` and Creative Research `DirectionContext` do not own all of those fields.
- Deriving them heuristically would create a parallel semantic authority and would require changing or bypassing the frozen Canon contract.
- Existing production translations are explicitly `authoritative: false`, `mode: 'shadow'`, and forbid a consumer switch.

Therefore the Creative Direction handoff persists a real `PENDING` state and exposes a compiler seam, but the Current Runtime does not register a fabricated compiler. The seam validates that a compiler returns non-empty Canon and Anchor identities before it can transition to `READY`; malformed results transition to `FAILED`. A later change may wire the seam only after one canonical adapter input is approved and the downstream consumer authority is reconciled.

## Implemented lifecycle boundary

The safe CD-R1 boundary now covers semantic projections, a provenance-free optional synthesis adapter with deterministic failure fallback, source fingerprints, dynamic stale detection, backward-compatible v0.1 reads, persisted production-handoff status, compile/retry operations, and separate Draft/Finalized/Production UI states. It does not claim `PRODUCTION_READY` without a real compiler result.
