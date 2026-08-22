# CI-W1C.8-G02-A.2 Final Report

## Outcome

The first-match role regex has been replaced with generic deterministic scoring/ranking. `documentRole`, `sourceRole`, and `planningStrategicEvidenceEligible` are independent outputs; `business-plan` is a real role rather than a brand-strategy alias; mixed sources retain secondary roles and ambiguity; unknown remains fail closed.

## Replacement reclassification

The approved replacement classifies locally as `business-plan` / high, with `market-research` secondary, eight strategic domains, `PLANNING_STRATEGIC_SOURCE`, and eligibility true. The A.1 SHA remains `D7BE0AF1E502D470BEA2A8422F6B635EC30AF79898F9DFD9A37FB5E5EA1201EC`. The read boundary was one selected source read, zero parent scans, and zero sibling reads.

## Verification

- ROLE-01..08: 8/8 PASS
- BP-01..06: 6/6 PASS
- ELIG-01..08: 8/8 PASS
- MIXED-01..04: 4/4 PASS
- ANCHOR-EPI-01..04: 4/4 PASS
- G01ROLE-01: PASS
- VERIFIER-01..08: 8/8 PASS
- BASELINE-01..20: 20/20 PASS
- G01 fingerprint: `eda3982872a0545f8d8f30f34c931a423bd1c134e14f430ac93e132544e58d12`
- R1: 96/96 PASS
- R2: 34/34 PASS
- R2.1: 10/10 PASS
- MOCK: 9/9 PASS
- Transport: 23/23 PASS
- Strategic SR: 11/11 PASS
- SG13/mirror: 8/8 PASS
- QR: 5/5 PASS
- SCOPE/TRACE: 13/13 PASS

Wider results:

- Actual `npm test`: not executed; npm CLI is unavailable.
- Exact full-script Node equivalent: 1,691/1,694, with the three existing V3 source-bundle, CI-1B timestamp-parity, and tracked-runtime-assets failures.
- CLI 40/40, Runtime Core 14/14, Web Runtime 20/20, Web Renderer typecheck, and Web build PASS.
- Runtime Application: 1,616/1,634 with 18 existing unrelated assertions.
- Web Runtime typecheck retains existing cross-package TypeScript debt.
- Version/naming/no-obsolete/production/project-rule/Golden guards PASS; repository guard tests 40/40 PASS.
- Workspace boundary and baseline-drift audits retain existing repository debt; no reported item names an A.2 file.
- `verify:current-flows` passed its directly runnable offline steps but could not invoke its internal npm-owned Runtime step; equivalent Runtime/Web constituents were run directly.
- Guard delta attributable to A.2: 0.

Provider/model calls, successful external network I/O, G02 executions, G02 Attempt 1, downloads, and Image calls remained zero.

Final verdict: `READY_TO_RESUME_G02_A1_AFTER_ROLE_REPAIR`.
