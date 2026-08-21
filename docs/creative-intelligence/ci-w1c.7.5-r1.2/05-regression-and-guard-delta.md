# Regression and Guard Delta

## Planning regressions

The combined R2, R2.1, and R1 command passed **76/76** tests:

- R2: 34/34;
- R2.1: 10/10;
- R1 including R1.2 additions: 32/32.

This preserves structured extraction, canonical coverage, mandatory narrative fallback, fail-closed Strategic behavior, hybrid merge, Planning-ref authority, and existing orchestration contracts.

## Wider passing checks

- `npm run web:typecheck`: pass;
- `npm run cli:test`: 40/40;
- `npm run web-runtime:test`: 20/20;
- `npm run verify:version-consistency`: pass after the isolated BOM repair;
- `npm run verify:version-naming`: pass;
- `npm run verify:no-obsolete-code`: pass;
- `npm run verify:production-boundaries`: pass;
- `npm run verify:no-project-specific-production-rules`: pass;
- `npm run verify:golden-boundary`: pass;
- `npm run verify:a4`: pass;
- `npm run repo:guard:test`: 40/40;
- the Web production build executed within `verify:current-flows` and passed.

## Existing wider-suite failures

These failures are outside the R1.2 changed-file set and match the branch's pre-existing baseline categories:

- root `npm test`: 1596/1598, with two existing failures (`V3 source bundle...` and repository-contract current-case);
- runtime tests: 1621/1638, with 17 existing frozen-diff, branch-cleanliness, Web surface, and diagnostic assertions;
- `verify:current-flows`: fails because the same runtime-application baseline failures remain;
- workspace boundary guard: the existing 25 deep imports across 18 files plus its existing `dir is not defined` script error;
- tracked runtime assets: 11 existing findings, including one caused by a preserved unrelated untracked probe script;
- repository contract: existing RC007 ×1 and RC005 ×2.

No listed failure points at the new Planning semantic contract, its runner integration, or the R1.2 tests.

## Guard delta

Positive delta:

- version consistency changed from BOM-induced failure to pass;
- repository guard tests changed from 39/40 to 40/40;
- NPE-10 now covers the new production semantic-contract file and passes.

Neutral delta:

- project-specific rule, production boundary, Golden boundary, A4, obsolete-code, and version-naming guards remain passing;
- historical workspace, tracked-asset, repository-contract, root, runtime, and current-flow failures remain outside this repair scope.

Negative R1.2 guard delta: **none observed**.
