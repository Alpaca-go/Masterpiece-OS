# CI-W1C.7.4-R2 — Grounding Gate Planning Ref Audit

> **Spec section:** PART E
> **Date:** 2026-08-20

## Gate Input

`StrategicGroundingGateInput` (in `strategic-grounding-gate.ts`)
now accepts:

```ts
{
  artifact: StrategicSynthesisArtifact;
  truth: ProjectTruthModel;
  needs: NeedItem[];
  evidence: EvidenceLedgerSnapshot;
  // CI-W1C.7.4-R2 PART E
  planningClaims?: PlanningStrategicClaim[];  // actual runtime input
  foreignIds?: {
    factIds: Set<string>;
    needIds: Set<string>;
    evidenceIds: Set<string>;
    planningClaimIds?: Set<string>;  // foreign planning claim IDs
  };
}
```

`planningClaims` is the ACTUAL runtime input (e.g., the planning
artifact claims from `loadPlanningStrategicEvidenceForProject`).
The gate NEVER trusts `artifact.sourceMap.planningClaims` as
authority (the model can echo fake IDs — verified by RTG-02b).

## SG-01 (expanded)

`runStrategicGroundingGate` now validates every `*.planningClaimRefs`
against `knownPlanningClaimIds`:

```ts
const knownPlanningClaimIds = new Set<string>();
for (const c of input.planningClaims ?? []) {
  if (typeof c?.claimId === 'string') knownPlanningClaimIds.add(c.claimId);
}
// NOTE: artifact.sourceMap.planningClaims is NOT used.
```

Validation sites (all BLOCK on unresolved ref):

- `projectUnderstanding.planningClaimRefs`
- `tensions[i].planningClaimRefs`
- `insights[i].planningClaimRefs`
- `opportunities[i].planningClaimRefs`

## SG-10 (expanded)

The foreign-IDs check now also covers `planningClaimIds`:

```ts
if (input.foreignIds) {
  // existing checks for fact/need/evidence
  // CI-W1C.7.4-R2 — planning claim foreign refs
  for (const i of artifact.insights) { ...planningClaimRefs... }
  for (const t of artifact.tensions) { ...planningClaimRefs... }
  for (const o of artifact.opportunities) { ...planningClaimRefs... }
  for (const ref of artifact.projectUnderstanding.planningClaimRefs) { ... }
}
```

## SG-11 (new) — Minimum Usage

When the runtime input has at least one planning claim, the
artifact MUST actually use them:

- `projectUnderstanding.planningClaimRefs.length >= 1` (block)
- At least 1 tension or insight must cite a `planningClaimRef` (block)

When the runtime input has zero planning claims, SG-11 is silent.

This is the planning-domain counterpart of the existing SG-06 / SG-07
"must have trace refs" gates.

## Tests

`tests/packages/creative-intelligence/ci-7.4-r2/rtg-runtime-guard.test.js`
covers:

- RTG-01: valid planningClaimRef passes.
- RTG-02: unknown planningClaimRef fails SG-01.
- RTG-02b: model sourceMap alone is NOT authority.
- RTG-03: foreign planningClaimRef fails SG-10.
- RTG-04..06 (SG-11): minimum-usage gate.

7 / 7 PASS.
