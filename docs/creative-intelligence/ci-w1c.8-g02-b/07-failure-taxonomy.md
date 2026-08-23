# Failure Taxonomy

Transport failures are `TRANSPORT_TIMEOUT`, `TRANSPORT_CONNECTION`, and `PROVIDER_UNAVAILABLE`; they may consume the single bounded transport retry. Semantic failures are `SCHEMA_INVALID`, `TRACE_MISSING`, and `CONTRACT_VIOLATION`; they may consume the single bounded semantic repair when a usable prior response exists.

Qualification failures are `GROUNDING_LOSS`, `TRACEABILITY_FAILURE`, and `REVIEW_FAILURE`. They require immediate STOP and cannot be converted into transport retry, semantic repair, fallback, or regeneration.
