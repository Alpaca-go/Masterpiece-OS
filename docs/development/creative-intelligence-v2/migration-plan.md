# Creative Intelligence 2.0 Migration Plan

## Compatibility objective

New projects use the V2 orchestration layer. Existing Document Context,
Creative Direction, Creative Decision v1 and downstream production artifacts
remain readable. Migration never fabricates historical evidence, user choices
or direction traces.

## Artifact placement

V2 artifacts live under the existing per-project storage root:

```text
creative-intelligence-v2/
  intake/
  analysis/
  canon-bridge/
```

This avoids a second project store. Provider raw responses and credentials are
never part of these artifacts.

## Phase migration sequence

1. Add contracts and deterministic runtime without changing existing callers.
2. Run Document and Visual adapters in shadow mode and compare artifacts.
3. Add Opportunity, Gap and Direction artifacts; no formal decision is written.
4. Add the Desktop decision workbench and explicit user confirmation.
5. Compile one confirmed V2 decision into the existing Style Profile, Locked
   Assets, Anchor brief, Visual Canon and Prompt contracts.
6. Enable V2 for new projects after Golden validation. Legacy projects remain
   on the fast path unless the user explicitly upgrades them.

## Legacy Creative Decision normalization

`schema_version: 1.0` decisions normalize to V2 with:

- `decisionSource.mode = legacy_adapter`;
- `decisionSource.traceAvailability = legacy_unavailable`;
- `evidenceRefs = []` unless real persisted source references exist;
- no invented Language Nail, Visual Hammer, user rationale or rejected items;
- missing V2 semantics represented by explicit legacy-unavailable wording,
  never by inferred historical claims.

The original v1 file is preserved. Normalization is read-compatible and does
not rewrite a project until an explicit V2 upgrade is confirmed.

## State migration

Existing Creative Session states remain valid. V2 states are stored in the V2
orchestration record. Only an explicitly confirmed user decision may advance a
guided project to `CREATIVE_DECISION_CONFIRMED`. Retry, repair, application
restart and background model work cannot change the selected direction.

## Rollout and rollback

- V2 starts behind a new-project routing flag and shadow artifacts.
- Each development Phase is one Git commit.
- Any Phase can be reverted independently without deleting legacy artifacts.
- Phase 5 must prove that both fast and guided routes reach the same existing
  production runtime.
- Phase 6 validates new-brand, upgrade, joint-input, reference-first, legacy
  and insufficient-evidence cases offline before any provider smoke test.

## Non-migrations

No duplicate Prompt Compiler, image provider, Anchor runtime, Visual Canon
runtime or industry-specific reasoning tree will be introduced. NICE source
material is analysis methodology only and is never migrated into generation
prompts.

