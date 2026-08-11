# S5 Test Coverage Delta

Status: `COMPLETE`

Entry coverage:

- Root Unit: 736/736
- Desktop suite: 353/353 (78 test files)
- CLI: 40/40
- Runtime: 14/14
- Web Smoke: PASS
- Golden: 5/5

Final delta:

| Tests | Count | Action | Replacement |
|---|---:|---|---|
| Current business/Web tests in Desktop workspace | 75 files | Moved and retargeted | Runtime application suite using package/Web owners (334 tests) |
| Electron image IPC test | 1 | Remove | Shared image operation registry tests |
| Electron preflight IPC test | 1 | Remove | Shared image operation registry tests |
| Electron-owned Web RPC server test | 1 | Remove | Node Host/RPC contract + Web Smoke |

Final retained coverage:

- Root Unit: 736
- CLI: 40
- Shared Runtime: 14 root Runtime contract tests + 334 Runtime application tests
- Node Web Host: 14 dedicated tests
- Web Smoke: actual browser + Node Host, 147 operations, zero forbidden processes
- Golden: G-01 through G-05, 5/5

Removed Electron/compatibility-only assertions: 19 test cases across the three
deleted suites. Current product behavior coverage lost: `0`.
