# Epistemic Resolution Contract

## Inputs

The model's `epistemicClass` is retained in the normalized raw extraction as a proposal/audit signal. Final projection uses:

- `claim.value`;
- every matching `evidence.summary`;
- the registered brief's `documentRole`;
- the model proposal.

The value and evidence summaries are supplied to the existing `classifyPlanningClaimEpistemicClass()`. `documentRole` is passed through its existing input contract. The runtime runner only wires the already-known role into projection; the orchestrator is unchanged.

## Conservative resolver

The resolver compares the deterministic class and model proposal using assertion-authority order:

```text
FACT > USER_REQUIREMENT > MODEL_INFERENCE > UNKNOWN
```

It selects the lower-authority, more conservative result. This provides two independent safety properties:

1. deterministic detection can downgrade an aggressive model proposal;
2. a conservative model proposal is never automatically upgraded by a plain-text classifier result.

The resolver is not a classifier. It owns no markers and delegates all text classification to the existing canonical classifier.

## Required outcomes

- requirement marker + model FACT → USER_REQUIREMENT;
- inference marker + model FACT → MODEL_INFERENCE;
- unknown marker + model FACT → UNKNOWN;
- plain declarative statement + model FACT → FACT;
- plain declarative statement + conservative model proposal → model proposal retained.

UNKNOWN remains a projected claim with `epistemicClass=UNKNOWN`; existing routing keeps it unresolved. No Truth, Need, Strategic, coverage, hybrid merge, multi-document, or chunk-grounding behavior is redesigned.
