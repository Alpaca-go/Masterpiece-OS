# CI-W1C.7.5-R1.1 Guard Delta Report

Date: 2026-08-21

| Guard | Recorded baseline | Current | R1.1 delta |
|---|---:|---:|---:|
| `verify:version-naming` | PASS | PASS | 0 |
| `verify:production-boundaries` | PASS | PASS | 0 |
| `verify:golden-boundary` | PASS | PASS | 0 |
| `verify:no-obsolete-code` | PASS | PASS | 0 |
| `verify:no-project-specific-production-rules` | PASS | PASS | 0 |
| `verify:workspace-boundaries` | FAIL: 25 deep imports / 18 files | FAIL: same 25 / 18, then historical guard `ReferenceError` | 0 occurrences |
| `verify:tracked-runtime-assets` | FAIL: 11 | FAIL: 11 | 0 violations |
| `verify:current-flows` | FAIL, pre-existing | FAIL: 18 runtime-application assertions | 0 R1.1-linked failures |
| `verify:version-consistency` | prior R1 freeze says PASS | FAIL parsing tracked root `package.json` BOM | 0 R1.1 files; version files untouched |
| `verify:repository-contract` | pre-existing repository state | FAIL: RC007 x1, RC005 x2 on untouched files | 0 R1.1 files |
| `verify:a4` | PASS | PASS | 0 |
| `repo:guard:test` | pre-existing BOM state | 39/40; one untouched root `package.json` BOM parse failure | 0 R1.1-linked failures |

Additional checks:

- `git diff --check`: PASS
- `web:typecheck`: PASS
- `web-runtime:typecheck`: FAIL on pre-existing cross-domain type debt; no R1.1 line is reported.
- Root tests: 4 historical failures (`V3 source bundle`, `CI-1B parity`, repository contract current-state assertion, primary Web entry assertion).
- Runtime application tests: 18 historical dirty/frozen-diff/UI/build assertions; the runtime-core suite itself is 14/14 PASS.

The repository-contract failures are an existing local-generated-artifact dependency and two previously changed planning fixtures. The current-flow and runtime-application failures include existing UI, Packaging, P3 frozen-diff, dirty-worktree, and BOM/PostCSS conditions. R1.1 did not modify those owners and does not expand into them.

## Delta conclusion

R1.1 introduces **0 new focused test failures, 0 new guard violations, and 0 worsened recorded boundary counts**. Repository-wide historical failures remain outside this stage and are not concealed or repaired here.
