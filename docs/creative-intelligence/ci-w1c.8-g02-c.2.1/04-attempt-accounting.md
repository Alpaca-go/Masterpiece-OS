# Provider Attempt Accounting

`executionAttempts` and `providerAttempts` now have separate meanings.

- `executionAttempts`: bounded stage state-machine entries.
- `providerAttempts`: requests that reached the reasoner invocation boundary and were dispatched.
- `transportRetries`: unchanged-request retries caused by retryable transport failure.
- `semanticRepairAttempts`: repair prompts caused by received invalid output.

Credential resolution and reasoner construction occur before the provider counter is incremented. An explicitly identified pre-dispatch failure is removed from the provider count. This prevents DNS, connectivity setup, credential resolution, health checks, and warmups from being reported as model invocations.

Offline results:

- `ATTEMPT-COUNT-01`: PASS — local credential failure, provider attempts 0.
- `ATTEMPT-COUNT-02`: PASS — base plus transport retry, provider attempts 2 and transport retries 1.
- `ATTEMPT-COUNT-03`: PASS — base plus semantic repair, provider attempts 2, transport retries 0, semantic repairs 1.
