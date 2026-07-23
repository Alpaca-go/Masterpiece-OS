# Repository consolidation report

Current status: Phase B completed through the pre-deletion checkpoint. No
remote branch deletion has been performed.

## Core consolidation

- Retrieval-First PR: https://github.com/Alpaca-go/Masterpiece-OS/pull/6
- PR result: merged into `main` with a merge commit.
- Merge commit: `5f9ac06d1e25aa4b091461e4b4437f9b7d3f82af`.
- Baseline tag: `retrieval-first-core-beta-0.5`.
- `develop` was created from the merged `main` baseline.

## Validation before PR #6

- `npm test`: 410 passed, 0 failed.
- `npm run verify:document-flows`: passed offline without external API calls.
- `npm --prefix apps/desktop test`: 32 passed, 0 failed.
- `npm --prefix apps/desktop run typecheck`: passed.
- `npm run desktop:build`: passed.
- Retrieval-First targeted regression suite: 34 passed, 0 failed.

## Pull-request cleanup

- PRs #2, #3, #4 and #5 were documented and closed without merging.
- The historical branch tips remain available both as remote branches and
  verified annotated archive tags.

## Active Reference-led work

- Branch: `feature/reference-led-visual-direction`.
- The branch merged `origin/develop` without conflicts.
- Validation after synchronization:
  - `npm test`: 417 passed, 0 failed.
  - `npm run verify:document-flows`: passed offline.
  - `npm --prefix apps/desktop test`: 32 passed, 0 failed.
  - `npm --prefix apps/desktop run typecheck`: passed.
- PR: https://github.com/Alpaca-go/Masterpiece-OS/pull/7
- Target: `develop`; status: open for review.

## Rollback and deletion policy

- Restore an archived line from its `archive/*-20260723` annotated tag.
- Do not rewrite `main`; use a revert PR if the Retrieval-First merge must be
  reversed.
- Delete historical branches only after a second explicit confirmation of the
  exact list in `branch-deletion-plan.md`.
- Retain `feature/retrieval-first-single-pipeline` for 3–7 days after merge and
  handle it in a separate later confirmation.
