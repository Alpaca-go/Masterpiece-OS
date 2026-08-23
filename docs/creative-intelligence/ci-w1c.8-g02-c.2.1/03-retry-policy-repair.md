# Retry Policy Repair

The stage state machine remains bounded:

1. `BASE`
2. optional `TRANSPORT_RETRY`, once, with the exact unchanged base prompt
3. optional `SEMANTIC_REPAIR`, once, only after a received response fails parsing or qualification gates

Maximum execution attempts remain three. The repair adds no fallback, provider switch, retry-budget increase, or silent regeneration. A second transport failure fails closed and persists failure evidence.

`STR-TRANSPORT-03` proves that a dispatched `fetch failed` / `UND_ERR_HEADERS_TIMEOUT` receives exactly one unchanged transport retry.
