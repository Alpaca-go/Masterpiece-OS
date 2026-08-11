# S5-A Test Relocation Manifest

## Scope

S5-A moves tests that still prove current Web and Runtime behavior out of the
legacy Desktop workspace before any Desktop production source is removed.

## Move

- `apps/desktop/tests/*.test.ts`, except the three Electron/IPC-only suites,
  to `tests/runtime-application/`.
- `apps/desktop/tests/analysis-runtime-fixtures.ts` and `fixtures/` to the same
  Runtime application test area.

## Delete later with the Desktop host

- `image-generation-ipc.test.ts`
- `image-generation-preflight-ipc.test.ts`
- `web-rpc-server.test.ts`

These suites validate removed Electron IPC or the Desktop compatibility RPC
adapter. Current Node host transport coverage remains in
`apps/web-runtime/tests/`.

## Import ownership

Moved suites import application behavior through
`@masterpiece/runtime-core/application/*` and shared contracts through
`@masterpiece/runtime-core/application-contracts.ts`. Web UI assertions point
at `apps/web`; Node credential assertions point at `apps/web-runtime`.

