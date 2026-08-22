# CI-W1C.7.5-R1.7 Final Report

## Outcome

G01 has been promoted from a freeze recorded across historical reports to a machine-readable canonical frozen baseline. The baseline includes deterministic canonicalization, a fingerprint verifier, a material-change invalidation policy, an operational timeout-risk record, and G02 readiness contracts that are independent of G01 project semantics.

## Baseline identity

- schema: `ci-g01-frozen-baseline-v1`;
- baseline/status: `G01` / `FROZEN`;
- frozen by: `CI-W1C.7.5-R1.6`;
- frozen commit: `0d8ff3ec54b7cc3ff9679ef33364bef0845fb89f`;
- qualification verdict: `G01_ATTEMPT_5_PASS`;
- anchors: exact 12-key sequence, required material retention 12;
- SG gates: SG-01/11/12/13/14/15;
- evidence: `ci-qualification-evidence-v2.1`.
- manifest fingerprint: `eda3982872a0545f8d8f30f34c931a423bd1c134e14f430ac93e132544e58d12`.

## Operational risk

Accepted Strategic latency was 285,028 ms against 290,000 ms, leaving 4,972 ms. This is not a qualification blocker and is an operational calibration risk. G02 inherits `requestTimeoutMs`, not the 290,000 ms value, and requires offline recalibration.

## G02 boundary

G02 source selection, source reading, anchor-map instantiation, qualification, and live execution did not occur. The contracts require an independent source, independent human-reviewed anchor map, Strategic-only initial scope, inherited SG architecture, and explicit live authorization after timeout recalibration.

## Verification

| Verification | Result |
|---|---:|
| BASELINE-01..10 | 10/10 PASS |
| G02READY-01..06 | 6/6 PASS |
| R1 | 96/96 PASS |
| R2 | 34/34 PASS |
| R2.1 | 10/10 PASS |
| MOCK-01..08 | 8/8 PASS |
| Transport | 23/23 PASS |
| Strategic SR | 11/11 PASS |
| SG13/mirror | 8/8 PASS |
| QR | 5/5 PASS |
| SCOPE | 6/6 PASS |
| TRACE | 5/5 PASS |

Wider results:

- Web typecheck PASS;
- CLI 40/40 PASS;
- Web Runtime 20/20 PASS;
- Web build PASS with the existing non-blocking chunk-size warning;
- Runtime Core 14/14 PASS;
- Runtime Application 1621/1638, with the same 17 existing UI, historical diff, and dirty-worktree assertions recorded by R1.6;
- root suite 1564/1566, retaining the two known failures: V3 source-bundle expectation and tracked-runtime-assets current-repository declaration;
- Web Runtime typecheck retains the existing cross-package TypeScript debt and fails outside this phase's changed surface.

Version consistency, version naming, no-obsolete-code, production boundaries, no-project-specific rules, Golden boundary, all six A4 guards, and repository guard tests (40/40) PASS. Existing workspace-boundary/deep-import debt, tracked-runtime-assets declarations, and repository-contract RC005/RC007 failures remain. None names an R1.7 file; no production source, Prompt, Golden fixture, runtime behavior, Provider behavior, or compatibility contract changed. Guard delta: 0.

One package-manager fallback attempted registry resolution while locating runners; the sandbox rejected all requests with `EACCES` and downloaded nothing. Subsequent verification used only existing local binaries. Provider/model/image/external-source network calls remained zero.

## Zero-call record

- live calls: 0;
- G01 Attempt 6: 0;
- G02 executions: 0;
- image calls: 0;
- external source reads: 0.

Final verdict: `READY_FOR_G02_QUALIFICATION_DESIGN`.
