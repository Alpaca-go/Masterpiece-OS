# Provider Transport and Retry Audit

| Stage | Kind | Latency | Success | Headers | Finish | Failure class |
|---|---|---:|---|---|---|---|
| planning_narrative | BASE | 126,468 ms | yes | received | stop | null |
| strategic_synthesis | BASE | 285,028 ms | yes | received | stop | null |

No transport failure occurred. `transportRetries=0` and `semanticRepairAttempts=0` for both live stages. The Strategic response completed 4,972 ms before its 290,000 ms application timeout.

The call ledger uses only canonical attempt kinds. No `# REPAIR` prompt, previousRaw repair context, provider fallback, model fallback, or retry request was created.
