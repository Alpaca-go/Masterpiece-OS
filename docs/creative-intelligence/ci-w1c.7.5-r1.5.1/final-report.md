# CI-W1C.7.5-R1.5.1 final report

## Outcome

Final verdict: `READY_FOR_G01_ATTEMPT_5`.

R1.5 historical verdict remains unchanged. R1.5.1 closes the independent transport/timeout contract blocker without a live call or G01 rerun.

## Implementation

- Canonical timeout field: `requestTimeoutMs`; one model-runtime compatibility alias for legacy `maximumDurationMs`.
- Stage policy: Planning 180,000 ms; Strategic 290,000 ms; Concept/Direction provisional 180,000 ms.
- Retry accounting: `providerAttempts`, `transportRetries`, `semanticRepairAttempts`; maximum three provider attempts per stage.
- Transport retries reuse exact base messages. Semantic repair requires received non-empty output plus parse/gate failure.
- Canonical provider taxonomy and transport-aware v2.1 redacted call ledger added.
- Future qualification verdict distinguishes provider transport failure from Strategic semantic failure.

## Verification

- Mandatory R1.5.1: 23/23 PASS.
- CI-W1C.7.5-R1 focused: 87/87 PASS.
- R2/R2.1/SR/SG13/QR combined: 66/68 PASS with two pre-existing R2 mock-fixture failures (R2E2E-05/06).
- SCOPE 6/6; TRACE 5/5; R2 32/34; R2.1 10/10; Strategic SR 11/11; SG13/mirror 8/8; QR 5/5.
- `npm test`: 1648/1653 PASS. Five baseline failures are documented in `09-zero-network-regression-proof.md`; none touches the R1.5.1 implementation.
- CLI 40/40; Web Runtime 20/20; Web build PASS.
- Guard PASS: version consistency, version naming, no-obsolete, production boundaries, project-specific literal, golden boundary.
- Existing workspace-boundary baseline remains FAIL (missing declaration, 25 deep imports in 18 files, and the guard's own undefined variable). Existing current-flow UI/path-freeze assertions also remain FAIL.
- Guard delta attributable to R1.5.1: 0.

## Safety ledger

- live model calls: 0
- image calls: 0
- G01 reruns: 0
- G02 executions: 0
- provider health/connectivity probes: 0
- real G01 DOCX reads: 0
- external parent scans: 0
- legacy PNG reads: 0

## Readiness

Attempt 5 readiness: ready, but not executed. The only authorized next live action is a separately authorized, one-shot G01 Attempt 5 through the production orchestrator.
