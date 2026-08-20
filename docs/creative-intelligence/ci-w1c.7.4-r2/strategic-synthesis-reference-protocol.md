# CI-W1C.7.4-R2 — Strategic Synthesis Reference Protocol

> **Spec section:** PART C (the prompt wire-shape)
> **Date:** 2026-08-20

## Output JSON shape (R2)

The Strategic Synthesis prompt output now requires the planning
claim refs domain on every element:

```jsonc
projectUnderstanding: {
  // existing fields
  factRefs: string[];     // Project Truth IDs
  needRefs: string[];      // Need Intelligence IDs
  evidenceRefs: string[];  // Evidence Ledger IDs
  planningClaimRefs: string[];  // NEW: Planning Strategic Evidence IDs
}

tensions[i]: {
  // existing fields
  factRefs: string[];
  needRefs: string[];
  evidenceRefs: string[];
  planningClaimRefs: string[];  // NEW
}

insights[i]: {
  // existing fields
  factRefs: string[];
  needRefs: string[];
  evidenceRefs: string[];
  planningClaimRefs: string[];  // NEW
}

opportunities[i]: {
  // existing fields
  factRefs: string[];
  insightRefs: string[];
  planningClaimRefs: string[];  // NEW
}

sourceMap: {
  // existing fields
  planningTruth: string[];
  userRequirements: string[];
  lockedIdentity: string[];
  prohibitedDirections: string[];
  needs: string[];
  evidence: string[];
  planningClaims: string[];  // NEW: input-derived audit-trail copy
  legacyVisualEvidenceExcluded: string[];
}
```

## Prompt text (R2)

The SYSTEM_MESSAGE now states:

> Planning claim IDs MUST be cited in `planningClaimRefs`
> (projectUnderstanding / tensions / insights / opportunities).
> Do NOT put planning claim IDs in `factRefs` / `needRefs` /
> `evidenceRefs`.

The EPISTEMIC_RULES section adds:

> `projectUnderstanding.planningClaimRefs`,
> `tensions[*].planningClaimRefs`,
> `insights[*].planningClaimRefs`,
> `opportunities[*].planningClaimRefs` MUST be `string[]`
> (use `[]` when no planning input).
> When planning input is present,
> `projectUnderstanding.planningClaimRefs` MUST be non-empty
> AND at least 1 tension or insight MUST cite a planningClaimRef.

The TASK section adds:

> 0. `sourceMap` includes `planningClaims[]` (input-derived).
> 1..4. each element type now includes `planningClaimRefs[]`.
> All `*.planningClaimRefs` MUST be elements of the `planningClaims`
> list in SOURCE TRACE IDS.
> NEVER put planning claim IDs in `factRefs` / `needRefs` /
> `evidenceRefs`.

## Why a separate `sourceMap.planningClaims`?

`sourceMap.planningClaims` is the audit-trail copy of the runtime
input. The model's echo may be empty or wrong. The grounding gate
(SG-01) does NOT trust this field — it builds
`knownPlanningClaimIds` from the runtime input only. This is
verified by RTG-02b: model sourceMap alone is NOT authority.

## Tests

- PTR-07..08 in `ptr-trace-protocol.test.js` lock the prompt text
  against regression (substring match on the required wording).
- RTG-02b in `rtg-runtime-guard.test.js` proves the model cannot
  self-authorize fake planning claim IDs.
