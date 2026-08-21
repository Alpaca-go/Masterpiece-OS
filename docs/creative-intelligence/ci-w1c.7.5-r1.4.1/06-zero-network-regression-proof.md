# Zero-Network Regression Proof

## Focused suites

- SCOPE-01..06: 6/6 PASS.
- TRACE-01..05: 5/5 PASS.
- Attempt-3-equivalent epistemic replay: PASS.
- redacted evidence v2 validation/redaction: PASS.
- combined R1/R2/R2.1/SR suite: 119/119 PASS.
- SG13 authority suite: 8/8 PASS.
- qualification review QR-01..05: 5/5 PASS.

## Wider suites

- Web typecheck: PASS.
- CLI: 40/40 PASS.
- Web Runtime: 20/20 PASS.
- Root: 1627/1630 PASS in the combined run. One timestamp-parity failure passed when isolated; the two reproducible failures are the pre-existing image-source schema expectation and tracked-runtime-assets baseline.
- Runtime: 1621/1638 PASS. All 17 failures are pre-existing UI/frozen-diff/dirty-worktree baseline failures; no failure points to an R1.4.1 focused assertion.
- `verify:current-flows` stops on that same 17-failure Runtime baseline.

All tests in this phase were local and zero-network. Live analysis calls, image calls, G01 reruns, and G02 executions were all zero.
