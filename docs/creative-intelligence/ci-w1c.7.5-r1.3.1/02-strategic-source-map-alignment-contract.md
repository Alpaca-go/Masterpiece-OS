# Strategic Source-Map Alignment Contract

## Invariant

For each source domain:

```text
prompt-visible authority
= SOURCE TRACE IDS
= sourceMap audit-copy target
= grounding-gate required mirror set
```

The four canonical sets are `StrategicReasoningContext.sourceIds.facts`, `.needs`, `.evidence`, and `.planningClaims`.

## Prompt contract

The Strategic prompt now explicitly requires:

- `sourceMap.planningTruth` MUST exactly copy `SOURCE TRACE IDS facts`;
- `sourceMap.needs` MUST exactly copy `SOURCE TRACE IDS needs`;
- `sourceMap.evidence` MUST exactly copy `SOURCE TRACE IDS evidence`;
- `sourceMap.planningClaims` MUST exactly copy `SOURCE TRACE IDS planningClaims`.

The prompt prohibits omission, addition, invention, transformation, or summarization of IDs. Set equality remains order-independent in the deterministic gate.

## Safety separation

- SG-01 validates every actual output reference against canonical runtime authority.
- SG-12/13/14/15 validate that the model's audit copy is complete and exact.
- The audit copy is never an authority source.
- Existing SG-02..11 semantics were not expanded or weakened.

The production wiring reuses the already compiled synthesis context. No second fact classifier or filtering policy was introduced.

