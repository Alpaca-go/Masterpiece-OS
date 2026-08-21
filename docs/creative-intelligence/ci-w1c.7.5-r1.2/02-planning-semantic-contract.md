# Planning Semantic Extraction Contract

## Ownership

Creative Intelligence now owns the complete Planning narrative boundary:

1. raw model-result types;
2. Planning system instruction and message construction;
3. strict validation;
4. deterministic normalization;
5. projection into `PlanningStrategicClaim[]`.

Runtime Core owns only model invocation, timing, one repair attempt, and fail-closed orchestration.

## Raw result

`PlanningSemanticExtractionResult` contains only semantic output:

- `schemaVersion`;
- `claims[]`, whose `key` is a canonical `PlanningClaimKey`;
- `conflicts[]`;
- `unknownKeys[]`.

The model is not required to manufacture runtime metadata such as `sourceRunId`, `generatedAt`, source-document registries, fingerprints, or runtime paths. Unknown object fields and unknown Planning keys are rejected.

## Canonical key coverage

The schema directly accepts all 16 canonical keys:

| PlanningClaimKey | First-class raw support |
| --- | --- |
| `brand_positioning` | yes |
| `brand_role` | yes |
| `industry` | yes |
| `business_model` | yes |
| `product_service` | yes |
| `target_audience` | yes |
| `audience_problem` | yes |
| `brand_promise` | yes |
| `competitive_context` | yes |
| `differentiation_logic` | yes |
| `communication_task` | yes |
| `strategic_objective` | yes |
| `experience_objective` | yes |
| `transformation_objective` | yes |
| `touchpoint_priority` | yes |
| `brand_personality` | yes |

No key is transported through DVC visual fields.

## Normalization

Normalization is deterministic and limited to:

- outer whitespace trimming;
- Unicode NFC normalization;
- exact duplicate removal;
- stable key/value/evidence ordering.

It performs no semantic rewriting, synonym mapping, missing-field inference, or model call.

## Canonical projection authority

The orchestrator continues to construct `sourceDocumentId` with the existing `buildSourceDocumentId`. Projection continues to construct `claimId` with the existing `buildClaimId`; no second identifier authority is introduced. Evidence must match the canonical source document or projection fails.

`chunkRefs` currently carry section names from model evidence. These are explicitly a **section-level transitional trace**, not exact grounding to canonical `prepareDocumentSet` chunk IDs. Full chunk-id remapping remains deferred.

The qualification path remains one explicitly registered narrative Planning brief. This contract does not claim multi-document extraction support.
