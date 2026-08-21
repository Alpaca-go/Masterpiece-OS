# Offline Regression and Guard Delta

## Passing verification

- Focused R1/R2/R2.1/SR combination: 119/119.
- SCOPE-01..06: 6/6.
- TRACE-01..05: 5/5.
- SG13 suite: 8/8.
- QR-01..05: 5/5.
- Web typecheck: PASS.
- CLI: 40/40.
- Web Runtime: 20/20.
- Version consistency/naming, production boundaries, project-specific rule guard, Golden boundary, no-obsolete, A4, and repo guard tests: PASS.

## Existing baselines

- Root: 1628/1630; the same stale image-source expectation and tracked-runtime-assets guard test fail.
- Runtime/current-flows: 1621/1638; the same 17 UI/frozen-diff/dirty-worktree baseline failures remain.
- Repository contract: RC007 ×1 and RC005 ×2.
- Workspace boundary: missing model-runtime dependency, 25 deep imports across 18 files, then existing verifier `dir is not defined` error.
- Tracked runtime assets: 14 existing findings.

Guard delta attributable to R1.5: **0**. Production code changed: **no**.
