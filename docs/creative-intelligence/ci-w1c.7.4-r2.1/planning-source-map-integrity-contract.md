# CI-W1C.7.4-R2.1 — Planning sourceMap Integrity Contract (SG-12)

> **Spec section:** PART C + PART H
> **Date:** 2026-08-20

## Goal

`artifact.sourceMap.planningClaims` is metadata the model emits.
It MUST exactly mirror the runtime input's claim IDs as a sorted
unique set. The gate refuses to let the model self-authorize
fake IDs or omit real ones.

## SG-12 Definition

`SG-12 PLANNING_SOURCE_MAP_MATCHES_RUNTIME`

- `runtimeIds = sorted unique(input.planningClaims[].claimId)`
- `artifactIds = sorted unique(artifact.sourceMap.planningClaims)`
- `runtimeIds === artifactIds` → PASS
- mismatch → BLOCK SG-12

Special case: when `input.planningClaims` is empty, the gate
requires `artifact.sourceMap.planningClaims === []`. Any non-empty
sourceMap with no runtime input is treated as a fabricated set.

## Implementation

```ts
{
  const runtimeClaimIds = Array.from(
    new Set(
      (input.planningClaims ?? [])
        .map((c) => c?.claimId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  ).sort();
  const artifactClaimIds = Array.from(
    new Set(
      (artifact.sourceMap.planningClaims ?? []).filter(
        (id): id is string => typeof id === 'string' && id.length > 0,
      ),
    ),
  ).sort();
  if (runtimeClaimIds.length === 0 && artifactClaimIds.length !== 0) {
    block('SG-12', 'sourceMap.planningClaims',
      `no planning input but sourceMap.planningClaims has ${artifactClaimIds.length} entr(y/ies)`,
      artifactClaimIds);
  } else if (
    runtimeClaimIds.length > 0 &&
    (artifactClaimIds.length !== runtimeClaimIds.length ||
      artifactClaimIds.some((id, idx) => id !== runtimeClaimIds[idx]))
  ) {
    block('SG-12', 'sourceMap.planningClaims',
      `sourceMap.planningClaims does not match runtime claim IDs: runtime=[${runtimeClaimIds.join(', ')}] artifact=[${artifactClaimIds.join(', ')}]`,
      Array.from(new Set([...runtimeClaimIds, ...artifactClaimIds])));
  }
}
```

## Repair Compatibility (PART I)

On SG-12 failure, the existing single-repair attempt runs. The
repair's `repairReason` includes the SG-12 blocked code. No
planning-specific retry loop is added.

## Tests

- **LPG-04**: runtime has 4 claims, sourceMap has 1 → SG-12 blocks.
- **LPG-05**: runtime has 4 claims, sourceMap has 1 fake id + planningClaimRefs has the same fake id → SG-01 + SG-12 both block.
- **LPG-06**: runtime is empty, sourceMap is empty → SG-12 PASS (backward compatible).
- **LPG-07**: orchestrator E2E, sourceMap.planningClaims == real runtime IDs (asserted via loader re-read).

## Contract Update: `STRATEGIC_GROUNDING_GATE_CODES`

`SG-12` is added to the `STRATEGIC_GROUNDING_GATE_CODES` array.
SG-01..SG-11 numbering is preserved.
