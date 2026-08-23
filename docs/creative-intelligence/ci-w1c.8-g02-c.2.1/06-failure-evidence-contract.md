# Failure Evidence Contract

Each failed stage attempt must retain the following redacted operational evidence:

- stage attempt number and attempt kind
- wrapper error code and nested cause code
- granular failure class
- retryable flag
- whether response headers were received
- whether the provider request was dispatched, when known
- configured timeout, measured latency, failure latency, and remaining margin
- independent provider, transport-retry, and semantic-repair counts

Secrets, authorization headers, complete endpoints, and raw provider payloads are forbidden. Evidence is diagnostic and accounting material; it cannot turn diagnostics such as claim count or citation ratio into qualification hard gates.
