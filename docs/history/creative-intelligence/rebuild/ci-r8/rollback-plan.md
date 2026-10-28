# CI-R8 Rollback Plan

Freeze candidate: `16d1a842c83de2c1f5595a2c8a68c739b3f1eb7a`  
Base: `ef59a4caf0059e44d9440b1d32593f8f884d42b2`

## Current rollback posture

R8 did not change the default navigation entry. `/creative-intelligence` and `/creative-research` remain parallel, so the navigation rollback is currently a no-op.

The R8 code change is additive and backward-compatible:

- new PreferenceInsight writes add optional `finalizedAt` only on the first `DRAFT -> FINALIZED` transition;
- existing FINALIZED records without `finalizedAt` remain readable;
- Direction re-entry falls back to `createdAt` for legacy records;
- no migration rewrites existing files;
- no legacy or Creative Research data is deleted.

## Rollback target

If the R8 timing reconciliation itself must be rolled back, revert the two R8 implementation/acceptance commits through normal Git review:

```text
16d1a842 test(ci): add V1 freeze recovery acceptance
90a5fead fix(ci): reconcile final preference timing semantics
```

Do not reset the workspace destructively and do not delete either persistence root.

## Future default-cutover rollback contract

If a later approved phase changes the default entry to `/creative-research`, rollback is limited to navigation:

```text
default navigation -> /creative-intelligence
```

The rollback must preserve:

```text
/creative-intelligence route and deep links
/creative-research route and deep links
all creative-intelligence-runs data
all creative-research data
legacy RPC
Creative Research RPC
```

No data restore should be required because R8 performs no destructive migration.

## Verification after rollback

1. Confirm both routes resolve.
2. Confirm a legacy run remains readable through `creative-intelligence:get-workspace`.
3. Confirm a Creative Research Session remains readable through `creative-research:get-session` and `creative-research:get-direction-context` where applicable.
4. Run `npm run web-runtime:test` and confirm operation count remains the expected registered count.
5. Run `npm run web:smoke`; require Node host, renderer, zero Electron/Desktop processes, zero Provider calls and zero business writes.
6. Run `npm run repo:verify`; classify only already-recorded failures and do not relabel local verification as GitHub CI.

## Recovery invariants already accepted

- failed Direction Board atomic write leaves the previous revision current and does not move `activeDirectionBoardId`;
- failed Context write leaves Session in DIRECTION with no false completion;
- Context persisted followed by Session completion-save failure is retryable and reuses the same Context;
- RESEARCH, DIRECTION and COMPLETED evidence is persisted under stable paths and reload-tested by the R2-R7 suites.

