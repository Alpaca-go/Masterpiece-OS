# SG-13 Authority Surface Audit

## Root cause

R1.3 Attempt 2 exposed a deterministic authority mismatch:

- the Strategic prompt rendered `StrategicReasoningContext.sourceIds.facts`;
- `SG-13` compared `sourceMap.planningTruth` with every ID in `truth.facts`;
- excluded or non-authoritative Truth facts could therefore be required by the gate without being visible to the model.

This explains the real run: the repair copied every prompt-visible fact ID and still failed `SG-13`.

## Canonical surface

The repaired flow is:

```text
compileStrategicReasoningContext
  -> synthesisCtx.sourceIds
  -> # SOURCE TRACE IDS
  -> model sourceMap audit copy
  -> SG-01 allowed reference sets
  -> SG-12/13/14/15 mirror targets
```

Production passes the exact `synthesisCtx.sourceIds` object into `runStrategicGroundingGate`. Direct/test callers that omit it are supported by recompiling through the same canonical context compiler. The gate does not copy fact filtering policy.

`sourceMap.planningTruth` remains the frozen schema name. In this contract it means the Strategic prompt-visible allowed fact-ID audit copy, not the complete Project Truth fact list.

## Sibling audit

| Gate | Domain | Prompt surface | Gate target | Result |
| --- | --- | --- | --- | --- |
| SG-12 | Planning claims | `sourceIds.planningClaims` | same set | aligned |
| SG-13 | Facts | `sourceIds.facts` | same set | repaired |
| SG-14 | Needs | `sourceIds.needs` | same set | aligned |
| SG-15 | Evidence | `sourceIds.evidence` | same set | aligned |

SG-01 remains independent and strict: every emitted reference must resolve in the corresponding canonical allowed set. A model audit copy cannot authorize a reference.
