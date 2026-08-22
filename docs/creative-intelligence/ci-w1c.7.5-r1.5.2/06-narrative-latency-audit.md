# Narrative Latency Audit

The optional audit issue was repaired without changing retry semantics. Narrative model calls now attach elapsed time to a thrown transport error; the existing catch path records that value in the redacted attempt ledger.

`NARRATIVE-LATENCY-01` simulates a base transport failure and its single transport retry. Both ledger entries retain `latencyMs > 0`, and their attempt kinds remain `BASE` and `TRANSPORT_RETRY`.

No additional retry, semantic repair, provider call, or raw response persistence was introduced.
