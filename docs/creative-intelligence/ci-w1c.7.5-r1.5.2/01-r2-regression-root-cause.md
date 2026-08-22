# R2 Regression Root Cause

## Finding

R1.5.1 correctly removed the old best-effort behavior that could expose an artifact after a failed Strategic gate. That fail-closed change exposed a stale production mock contract: the mock always emitted an empty `sourceMap.planningClaims` and empty `planningClaimRefs`, while the R2 production path already supplied canonical Planning claims.

Under SG-11/SG-12 the static artifact was invalid, so synthesis became `FAIL` and `result.shadow.synthesis` became `null`. This explains R2E2E-05/06 and is not treated as a pre-existing baseline failure.

## Repair boundary

- Keep fail-closed orchestration unchanged.
- Keep all Strategic structural and grounding gates unchanged.
- Do not invent IDs or add project-specific values.
- Repair only the production mock's projection of runtime authority, plus its executable tests.

The mock now derives its source maps and references from the same prompt-visible `SOURCE TRACE IDS` block used by a real Strategic reasoner.
