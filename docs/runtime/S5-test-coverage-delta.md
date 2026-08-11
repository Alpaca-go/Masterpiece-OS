# S5 Test Coverage Delta

Status: `IN_PROGRESS`

Entry coverage:

- Root Unit: 736/736
- Desktop suite: 353/353 (78 test files)
- CLI: 40/40
- Runtime: 14/14
- Web Smoke: PASS
- Golden: 5/5

Planned delta:

| Tests | Count | Action | Replacement |
|---|---:|---|---|
| Current business/Web tests in Desktop workspace | 75 files | Move and retarget | Runtime application suite using package/Web owners |
| Electron image IPC test | 1 | Remove | Shared image operation registry tests |
| Electron preflight IPC test | 1 | Remove | Shared image operation registry tests |
| Electron-owned Web RPC server test | 1 | Remove | Node Host/RPC contract + Web Smoke |

Current behavior coverage lost target: `0`. Final counts will be recorded after deletion.
