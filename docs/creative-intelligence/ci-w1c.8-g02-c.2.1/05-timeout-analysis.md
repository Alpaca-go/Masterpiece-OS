# Timeout Analysis

The configured Strategic timeout remains 360000 ms.

| Field | Value |
| --- | ---: |
| configured timeout | 360000 ms |
| observed C.2 failure latency | 305631 ms |
| configured margin at failure | 54369 ms |

The observed failure occurred before the configured deadline and carried an upstream headers-timeout cause. Increasing the application timeout would not repair the lost transport classification, so this phase does not change the timeout budget.

Runtime attempt evidence now records `configuredTimeoutMs`, `latencyMs`, `failureLatencyMs`, and `timeoutMarginMs`. Qwen now consumes canonical `requestTimeoutMs`; `maximumDurationMs` remains only a compatibility alias.
