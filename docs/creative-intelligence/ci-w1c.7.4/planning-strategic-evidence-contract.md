# CI-W1C.7.4 — Planning Strategic Evidence Contract

> **Mode**: Implementation phase · **HEAD**: 99b8344f (Documentation Tip)
> **Branch**: `feat/short-chain-simplified-ui`
> **Schema version**: `ci-w1c.7.4`
> **Status**: LOCKED for CI-W1C.7.4.

## 1. The artifact

```ts
interface PlanningStrategicEvidenceArtifact {
  schemaVersion: 'ci-w1c.7.4';
  projectId: ProjectId;
  sourceDocuments: PlanningSourceDocumentRef[];
  claims: PlanningStrategicClaim[];
  planningEvidenceFingerprint: string;   // 64-char hex SHA-256
  documentSetHash: string;                // 64-char hex SHA-256
  generatedAt: string;                    // ISO 8601 (NOT in fingerprint)
}

interface PlanningSourceDocumentRef {
  sourceDocumentId: string;
  filename: string;
  documentRole: string;     // raw classifier output
  sourceRole: PlanningSourceRole;  // mapped: PLANNING_STRATEGIC_SOURCE / LEGACY_VISUAL_EVIDENCE / UNKNOWN_SOURCE
  contentHash: string;
  chunkCount: number;
  excerpt: string;          // first 200 chars of rawText, NEVER raw binary
}

interface PlanningStrategicClaim {
  claimId: string;
  key: PlanningClaimKey;            // one of 16 PLANNING_CLAIM_KEYS
  value: string;
  epistemicClass: PlanningEpistemicClass;  // FACT / USER_REQUIREMENT / MODEL_INFERENCE / UNKNOWN
  confidence?: number;              // only if upstream source provided it; NEVER invented
  sourceDocumentId: string;
  chunkRefs: string[];
}
```

## 2. Allowed claim keys (16)

```
brand_positioning, brand_role, industry, business_model,
product_service, target_audience, audience_problem,
brand_promise, competitive_context, differentiation_logic,
communication_task, strategic_objective, experience_objective,
transformation_objective, touchpoint_priority, brand_personality
```

Any other key is refused with `PLANNING-CLAIM-KEY-NOT-REGISTERED`.

## 3. Builder pipeline (8 steps)

The builder `buildPlanningStrategicEvidenceArtifact(input)`:

1. **Read** each brief file from disk via the existing
   `readPlanningBriefFile` (uses runtime-core
   `parseStrategyDocument`).
2. **Re-derive** the content hash; abort on mismatch.
3. **Classify** the document role via the existing
   `classifyDocumentRole`; map to `sourceRole`.
4. **Refuse** non-planning sourceRoles (defensive skip).
5. **Chunk** the text via the existing `prepareDocumentSet`
   (LF-normalized chunks; `documentSetHash` recorded).
6. **Build** the `PlanningSourceDocumentRef` (with first-200-char
   excerpt, NEVER raw binary).
7. **Extract** claims per chunk via the deterministic
   `EXTRACT_PATTERNS` (16 patterns, one per
   `PlanningClaimKey`).
8. **Dedupe** claims by (key + value + sourceDocumentId);
   first-seen wins, subsequent matches append `chunkRefs`.
9. **Fingerprint** the canonical payload (excludes `generatedAt`).

## 4. EXTRACT_PATTERNS (default epistemic classes)

| Key | Default epistemic class | Default confidence |
|---|---|:-:|
| `industry` | FACT | 0.8 |
| `brand_positioning` | FACT | 0.7 |
| `brand_role` | FACT | 0.7 |
| `business_model` | FACT | 0.7 |
| `product_service` | FACT | 0.7 |
| `target_audience` | FACT | 0.7 |
| `strategic_objective` | FACT | 0.7 |
| `audience_problem` | FACT | 0.6 |
| `brand_promise` | FACT | 0.6 |
| `competitive_context` | FACT | 0.6 |
| `differentiation_logic` | FACT | 0.6 |
| `communication_task` | FACT | 0.6 |
| `experience_objective` | FACT | 0.6 |
| `transformation_objective` | FACT | 0.6 |
| `touchpoint_priority` | FACT | 0.6 |
| `brand_personality` | FACT | 0.6 |

A future phase may swap the heuristic extraction for a
model-driven one. The defaults are conservative: FACT
epistemic class is only assigned when the pattern matches
a clear `Label: Value` line; other matches are not extracted
(NOT a FACT).

## 5. Strategic Context integration

The artifact's `claims: PlanningStrategicClaim[]` array is
the input to the new `StrategicReasoningContext.planningStrategicEvidence`
field. The strategic-context compiler accepts the array; the
prompt builder renders a `PLANNING STRATEGIC EVIDENCE` section
that lists each claim with id / key / value / epistemic class /
sourceDocumentId / chunkRefs / confidence. The
`sourceIds.planningClaims[]` array is also populated so the
grounding gate (SG-01..10) can validate `claimRef`s in the
model output.

## 6. Fingerprint invalidation chain

A change to any of the following invalidates the planning
evidence fingerprint (and the strategic input fingerprint):

- A brief's raw text
- A brief's `sourceRole` (e.g., a re-classification)
- A claim's `value` or `epistemicClass`
- The `PLANNING_CLAIM_KEYS` registry (additive change to the
  registry would not change existing claim ids but a renaming
  or removal would)

Adding a new brief that produces no overlapping claim does NOT
change the existing artifact fingerprint (it produces a new
artifact with a new fingerprint, but the old one is stable).

## 7. Test coverage (PSC + PDI-07/08 + PFP)

| Test | Verifies |
|---|---|
| PSC-01..03 | context accepts/exposes planningStrategicEvidence; epistemic class preserved |
| PSC-04..06 | prompt includes PLANNING STRATEGIC EVIDENCE section + sourceIds |
| PSC-07..08 | fingerprint invalidation on planning-evidence change |
| PDI-07..08 | planningEvidenceFingerprint determinism + sensitivity |
| PDI-09 | end-to-end: real fixture → valid artifact |
| PFP-01..05 | canonical SHA-256, LF normalization, sourceId stability |

All 17 PSC/PDI/PFP tests PASS on the current Implementation HEAD.
