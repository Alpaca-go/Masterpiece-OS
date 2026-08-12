# A2-I Issue Ledger

**Phase:** Visual Analysis A2 — Full Regression & Final Acceptance
**Batch:** A2-I.49 (Issue Ledger)
**Date:** 2026-08-12
**Status:** `A2I_NO_ISSUES_YET` (R1 / R2 / R3 / R6 PASS; R4 / R5 / Real Smoke pending)
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A2-I-Full-Regression-Final-Acceptance.md` §34 / §35 / §37 / §49

## 1. Confirmed A2 Regressions

**Confirmed A2 Regressions = 0**

R1 (Repository Contract), R2 (Automated Current Flows), R3
(Provider Matrix), and R6 (Prompt Integrity) have all PASSED
post-A2-H without intervention. No confirmed A2 regression
has been discovered by A2-I's automated + structural checks
so far.

## 2. Pre-existing / Out-of-scope Defects

No pre-existing or out-of-scope defects were discovered in the
A2-I R1/R2/R3/R6 runs. Any future discovery is to be recorded
under §3 below.

## 3. Issue Template (per A2-I spec §49)

For each issue:

| Field | Description |
|---|---|
| ID | `A2I-001`, `A2I-002`, ... |
| Area | Repository / Runtime / Web / CLI / Provider / Persistence / Reference First / Generation / Golden / Prompt / Security |
| Severity | blocker / major / minor / informational |
| Classification | A2_REGRESSION / PRE_EXISTING / ENVIRONMENT / CREDENTIAL / PROVIDER_EXTERNAL / FLAKY / UNKNOWN |
| Reproduction | Steps to reproduce |
| Root Cause | Underlying cause |
| Fix | Diff or commit reference |
| Regression Test | Test added or strengthened |
| Status | open / in-progress / fixed / closed / wontfix |
| Commit | `git rev-parse HEAD` reference (if fixed) |

## 4. Open Issues

_None._

## 5. Closed Issues (in this run)

_None._

## 6. Out-of-Scope Defects (per A2-I spec §37)

_None discovered._

## 7. STOP-A2I gate precheck

- STOP-A2I-02 (default resolves differently between Web / CLI / Runtime): NOT TRIGGERED (single `createDefaultAnalysisProviderRegistry` authority; all entry points resolve through `pipeline-service.ts:388`).
- STOP-A2I-03 (explicit Qwen no longer works): NOT TRIGGERED (A2-H §25 real smoke PASS; contract test reframed to verify A2-H §11 preservation).
- STOP-A2I-05 (Reference First current flow regresses): NOT TRIGGERED (A2-H provider-preservation-report.md §6 + R5 scan = 0 violations; Runtime tests 334/334).
- STOP-A2I-06 (Canonical Analysis Contract breaks): NOT TRIGGERED (A2-H contract tests 13/13 + 19/19; A2-H §23/§25 real smoke canonical result PASS).
- STOP-A2I-07 (Frozen Prompt changed unexpectedly): NOT TRIGGERED (R6 PASS; digests unchanged).
- STOP-A2I-08 (Prompt digest mismatch > 0): NOT TRIGGERED.
- STOP-A2I-09 (Golden requires update): NOT TRIGGERED.
- STOP-A2I-10 (G-04 fails): NOT TRIGGERED (golden:test 5/5 PASS).
- STOP-A2I-11 (Existing project becomes unreadable / corrupted): NOT TRIGGERED (no migration; persistence schema unchanged; A2-H §31/§32 confirmed).
- STOP-A2I-12 (Provider-specific logic leaks downstream): NOT TRIGGERED (R5 scan = 0 violations).
- STOP-A2I-13 (Current Authority Conflict > 0): NOT TRIGGERED.
- STOP-A2I-14 (New version namespace introduced): NOT TRIGGERED.
- STOP-A2I-15 (Secrets in repository / logged acceptance artifacts): NOT TRIGGERED.
- STOP-A2I-16 (A regression "fixed" by deleting tests / weakening guards): NOT TRIGGERED.
- STOP-A2I-17 (A2-I starts implementing A3 fallback / observability architecture): NOT TRIGGERED.
- STOP-A2I-01 (A2-H gate not PASS): NOT TRIGGERED.
- STOP-A2I-04 (Actual Web fails while smoke passes): PENDING (`web:smoke` PASS; Actual Web re-run per A2-I §42 still required).
