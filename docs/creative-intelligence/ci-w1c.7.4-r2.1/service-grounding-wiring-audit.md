# CI-W1C.7.4-R2.1 — Service → Grounding Wiring Audit

> **Spec section:** PART B
> **Date:** 2026-08-20

## Goal

`CreativeReasoningService.run()` must forward the EXACT runtime
planning evidence into the synthesis-stage `runStrategicGroundingGate`
call. Without this, the gate's `knownPlanningClaimIds` set is
always empty and any valid `*.planningClaimRefs` would fail SG-01,
SG-11 would never trigger, and SG-12 has no runtime side to
compare against.

## Pre-R2.1 Behavior

```ts
gate: (a) => {
  const structural = validateStrategicSynthesisStructural(a);
  const grounding = runStrategicGroundingGate({ artifact: a, truth: input.truth });
  //                                                        ^^^^^^^^^^^^^^^^^^^^^^
  //                                                        BUG: planningClaims missing
  return { passed: structural.passed && grounding.passed, blockedCodes: ... };
}
```

The `runStrategicGroundingGate` accepts an optional `planningClaims`
parameter, but the service never forwarded `input.planningStrategicEvidence`
to it. The gate's `knownPlanningClaimIds` defaulted to `new Set()`, so
SG-01 / SG-11 / SG-12 could not operate.

## Post-R2.1 Behavior

```ts
gate: (a) => {
  const structural = validateStrategicSynthesisStructural(a);
  // CI-W1C.7.4-R2.1 PART B — the synthesis gate MUST receive
  // the EXACT runtime planning evidence. Without this, the
  // gate's `knownPlanningClaimIds` set is empty and any
  // valid `*.planningClaimRefs` would fail SG-01, SG-11
  // would never trigger, and SG-12 has no runtime side to
  // compare against.
  const grounding = runStrategicGroundingGate({
    artifact: a,
    truth: input.truth,
    planningClaims: input.planningStrategicEvidence ?? [],
  });
  return { passed: structural.passed && grounding.passed, blockedCodes: ... };
}
```

## Runtime Evidence

- LPG-01 (valid planning refs pass): `input.planningStrategicEvidence`
  has 4 claims → `knownPlanningClaimIds` has 4 → SG-01 PASS.
- LPG-02 (fake planning ref blocks SG-01): the runtime has 4 claims,
  the reasoner emits `plc-fake-zzz` → `knownPlanningClaimIds` does
  not contain it → SG-01 blocks.
- LPG-03 (empty planningClaimRefs blocks SG-11): the runtime has 4
  claims but the artifact has empty `planningClaimRefs` → SG-11
  fires its minimum-usage check.
- LPG-04 (sourceMap/runtime mismatch blocks SG-12): the runtime has
  4 claims but `artifact.sourceMap.planningClaims` has 1 → SG-12
  fires the sourceMap integrity check.

## Companion Fix: Orchestrator Forwards `reasonerFactory` to Service Deps

The orchestrator was passing `reasonerFactory` / `readCredentials`
via the service's `serviceInput` (run input), but the service's
`runStage` checks `deps.reasonerFactory` / `deps.readCredentials`
(the service's constructor deps), not the run input. This made
the live reasoner path unreachable through the orchestrator.

R2.1 fixes the orchestrator to also forward them as service deps:

```ts
// CI-W1C.7.4-R2.1 PART G — when the caller supplies a custom
// reasonerFactory + readCredentials (e.g. the planning-aware
// test reasoner), we MUST forward them as service `deps` so
// the service's `runStage` enters the live reasoner path
// (it checks `deps.reasonerFactory` / `deps.readCredentials`,
// not the run input).
const service = _createService({
  outputRoot: deps.outputRoot,
  ...(input.reasonerFactory ? { reasonerFactory: input.reasonerFactory } : {}),
  ...(input.readCredentials ? { readCredentials: input.readCredentials } : {})
});
```

This is a 4-line change in the orchestrator and unblocks LPG-07/08/09.
