# Call Budget Contract

The counters `providerAttempts`, `transportRetries`, and `semanticRepairAttempts` are independent and start at zero. Each allowed stage has a maximum of three Provider attempts: one `BASE`, at most one `TRANSPORT_RETRY`, and at most one `SEMANTIC_REPAIR`. The qualification-wide maximum is six calls across the two allowed stages, with at most two transport retries and two semantic repairs in total.

Incrementing a retry counter never substitutes for incrementing `providerAttempts`. A stage or qualification-wide cap immediately stops further calls. Concept, Direction, Image, health probes, benchmarks, and standalone calls are outside the budget and remain forbidden.
