# Remote branch deletion plan

Status: **awaiting the user's second explicit confirmation; do not execute**.

## Must retain

- `main`
- `develop`
- `feature/reference-led-visual-direction`

## Retain temporarily

- `feature/retrieval-first-single-pipeline`: merged by PR #6. Keep for 3–7
  days, then request a separate deletion confirmation.

## Exact proposed deletion list

Each branch below has a verified remote annotated archive tag whose peeled
commit equals the branch head:

- `v5-deep-creative-director`
- `v5-desktop`
- `feature/visual-translation-v1`
- `feature/brand-dna-analysis`
- `feature/brand-dna-report-v2`
- `feature/brand-dna-v3-deep-compact`
- `feature/brand-dna-v3-core-quality-fix`
- `experiment/execution-oriented-directions-v2`
- `experiment/visual-fact-first-pipeline`

## Preconditions completed

1. Retrieval-First was validated and merged into `main` by PR #6.
2. `retrieval-first-core-beta-0.5` was pushed.
3. `develop` was created from the merged `main`.
4. PRs #2, #3, #4 and #5 were documented and closed.
5. Reference-led work was synchronized with `develop`, validated, pushed and
   opened as PR #7.

## Remaining gate

The user must explicitly confirm this exact nine-branch list before any
deletion command is run. Archive tags are retained after branch deletion.
