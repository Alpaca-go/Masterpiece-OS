# Strategic-Only Stage Boundary Contract

Production reasoning now accepts `stopAfter: 'synthesis' | 'concept' | 'direction'` through `runCreativeReasoningForProject` and the Creative Reasoning Service.

For `stopAfter: 'synthesis'`:

- Strategic Synthesis executes normally, including its one-repair maximum.
- Concept is `NOT_RUN`, has zero attempts, zero raw attempts, and no prompt snapshot.
- Direction is `NOT_RUN`, has zero attempts, zero raw attempts, and no prompt snapshot.
- Concept/Direction prompt construction, `runStage`, and repair are never entered.
- The qualification runner supplies the production scope option; throwing `G01_QUALIFICATION_SCOPE_BLOCKED_CONCEPT` is no longer normal control flow. A downstream prompt reaching the reasoner is retained only as `G01_QUALIFICATION_UNEXPECTED_STAGE`, a fail-closed invariant guard.

Omitting `stopAfter` preserves the existing full Synthesis → Concept → Direction pipeline. `stopAfter: 'concept'` preserves Synthesis and Concept while leaving Direction `NOT_RUN`.

## SCOPE proof

- SCOPE-01: synthesis-only success leaves both downstream stages NOT_RUN/0 — PASS.
- SCOPE-02: synthesis failure still leaves both downstream stages NOT_RUN/0 — PASS.
- SCOPE-03: concept scope runs Concept and leaves Direction NOT_RUN/0 — PASS.
- SCOPE-04: omitted scope preserves the full pipeline — PASS.
- SCOPE-05: canonical orchestrator forwards the scope and the runner uses it — PASS.
- SCOPE-06: synthesis-only sends no Concept base or repair prompt — PASS.
