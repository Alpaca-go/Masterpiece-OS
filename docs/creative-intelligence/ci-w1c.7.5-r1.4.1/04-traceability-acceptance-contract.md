# Traceability Acceptance Contract

## Hard acceptance

- all 12 frozen semantic anchors are evaluated and retained;
- material silent loss count is zero;
- SG-01, SG-11, SG-12, SG-13, SG-14, and SG-15 pass;
- Traceability human-review score is at least 2.

Contradiction of a required semantic anchor is also fail-closed.

## Diagnostics only

- unique Planning claims cited;
- total planningClaimRef occurrences;
- direct anchor-ref coverage;
- uncited Planning claim list.

Neither 15/15 claim citation nor 12/12 direct anchor refs is a hard gate. This preserves semantic accountability while avoiding reference stuffing.

## Attempt 3 offline recomputation

- semantic anchors: 12/12 retained;
- material silent loss: 0;
- unique Planning claims cited: 14/15;
- planningClaimRef occurrences: 28;
- direct anchor-ref coverage: 11/12;
- uncited diagnostic: `industry` claim only.

## TRACE proof

- TRACE-01: 12/12 semantic retention + 11/12 direct refs passes — PASS.
- TRACE-02: material semantic anchor absence fails — PASS.
- TRACE-03: no meaningful refs fails SG-11 acceptance — PASS.
- TRACE-04: invalid ref fails SG-01 acceptance — PASS.
- TRACE-05: an uncited redundant claim remains diagnostic — PASS.
