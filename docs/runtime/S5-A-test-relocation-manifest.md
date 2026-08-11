# S5-A Test Relocation Manifest

## Scope

S5-A moves tests that still prove current Web and Runtime behavior out of the
legacy Desktop workspace before any Desktop production source is removed.

## Move

- `apps/desktop/tests/*.test.ts`, except the three Electron/IPC-only suites,
  to `tests/runtime-application/`.
- `apps/desktop/tests/analysis-runtime-fixtures.ts` and `fixtures/` to the same
  Runtime application test area.

## Delete with S5-A

- `image-generation-ipc.test.ts`
- `image-generation-preflight-ipc.test.ts`
- `web-rpc-server.test.ts`

These suites validated Electron IPC or the Desktop compatibility RPC adapter
and were deleted in S5-A. Current Node host transport coverage remains in
`apps/web-runtime/tests/` and the primary smoke proves the complete 147
operation graph is reachable without Electron.

| Removed suite | Behavior covered | Replacement test |
|---|---|---|
| `image-generation-ipc.test.ts` | Electron image-generation IPC registration | `apps/web-runtime/tests/node-runtime-host.test.ts` plus `web:smoke` |
| `image-generation-preflight-ipc.test.ts` | Electron preflight IPC dispatch | Runtime application image-generation suites plus `web:smoke` |
| `web-rpc-server.test.ts` | Desktop compatibility RPC adapter | `apps/web-runtime/tests/local-rpc-server.test.ts` and `node-runtime-host.test.ts` |

## Import ownership

Moved suites import application behavior through
`@masterpiece/runtime-core/application/*` and shared contracts through
`@masterpiece/runtime-core/application-contracts.ts`. Web UI assertions point
at `apps/web`; Node credential assertions point at `apps/web-runtime`.
