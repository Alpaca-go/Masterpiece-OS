# Retry Policy Freeze

The only attempt types are `BASE`, `TRANSPORT_RETRY`, and `SEMANTIC_REPAIR`. A transport retry reuses the same base logical prompt and may occur once per stage. Semantic repair may occur once per stage and requires a usable previous response. Every attempt must record `attemptId`, `attemptType`, `reason`, and `timestamp`.

Infinite retry, Provider rotation, silent regeneration, empty-response semantic repair, and unrecorded attempts are prohibited. Qualification failures do not enter either retry path.
