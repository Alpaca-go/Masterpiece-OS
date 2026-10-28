# S7 Existing Guard Inventory

Date: 2026-08-12

The repository already has strong focused guards. S7 reuses them and adds one small metadata-driven contract verifier; it does not create a second lint or architecture-analysis system.

| Existing guard | Classification | S7 use |
|---|---|---|
| `verify:version-consistency` | KEEP | product/workspace version source and single-lockfile contract |
| `verify:version-naming` | EXTEND BY COMPOSITION | keep specific identifier rules; new path namespace rules live in the contract verifier |
| `verify:workspace-boundaries` | KEEP | workspace declarations, exports and deep-import boundaries |
| `verify:production-boundaries` | KEEP | Desktop/Electron/lab production import and lockfile guard |
| `verify:no-obsolete-code` | KEEP | known retired implementation names |
| `verify:golden-boundary` | KEEP | production-to-Golden/fixture isolation |
| `verify:no-project-specific-production-rules` | KEEP | project-specific production leakage |
| `verify:current-flows` | KEEP | offline document/runtime/typecheck release gate |
| `archive-boundary.test.js` | KEEP | current-to-archive isolation |
| runtime/Web architecture boundary tests | KEEP | layer ownership and Desktop/Electron absence |
| Shared Operation Registry tests | KEEP | duplicate IDs, invalid handlers and dispatch validity |
| `golden:test` | KEEP | Golden 5/5 behavior evidence |
| `check-s2-baseline-drift.mjs` | RETIRE FROM CURRENT S7 | fixed pre-S6 commit assumptions make it historical evidence, not a current mutation guard |

## Small S7 additions

One script, `scripts/verify-repository-contract.mjs`, validates only:

- current production path namespace names;
- declared authority existence/boundaries;
- frozen prompt digests;
- compatibility metadata and known compatibility entrypoints;
- changed Golden baseline files relative to the S7 freeze commit;
- a narrow list of machine-local paths in tracked production/test imports.

Runtime and historical boundary logic remains in the existing guards. `repo:verify` composes them. Duplicate guard systems: 0.
