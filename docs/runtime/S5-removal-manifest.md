# S5 Removal Manifest

Every S5 deletion is covered by this manifest. No user-data location is in scope.

Status: `COMPLETE`. Tracked files under `apps/desktop`: `0`.

| Path / Dependency | Current Role | Runtime Consumer | Action | Reason / replacement |
|---|---|---|---|---|
| `apps/desktop/tests/*.test.ts` (75 current-behavior cases) | Business/Web regression tests | Test only | DELETE original after MOVE | retained under `tests/runtime-application`; imports point to Shared Runtime/Web |
| `apps/desktop/tests/analysis-runtime-fixtures.ts` | Test helper | Test only | DELETE original after MOVE | retained with Runtime tests |
| `apps/desktop/tests/fixtures/**` | Test fixtures | Test only | DELETE original after MOVE | retained with Runtime tests |
| `image-generation-ipc.test.ts` | Electron IPC adapter test | Legacy Desktop | DELETE | Runtime operation tests preserve handler behavior |
| `image-generation-preflight-ipc.test.ts` | Electron IPC preflight binding | Legacy Desktop | DELETE | Shared Registry image operations cover route and arguments |
| `web-rpc-server.test.ts` | Electron-owned HTTP host | Legacy Desktop | DELETE | Node Host/RPC tests and Web Smoke replace it |
| `apps/desktop/src/shared/types.ts` | Runtime contract compatibility export | Legacy tests/preload | DELETE | `@masterpiece/runtime-core/application-contracts.ts` |
| `apps/desktop/src/main/**` compatibility files (85) | Old import paths | Legacy tests/tooling | DELETE | direct Shared Runtime package exports |
| `apps/desktop/src/main/analysis-runtime-adapter.ts` | Electron prompt-path adapter | Electron host | DELETE | Node prompt-root adapter |
| `apps/desktop/src/main/settings-store.ts` | Electron safeStorage/config adapter | Electron host | DELETE | Node settings/credential adapters; local user credentials untouched |
| `apps/desktop/src/main/image-generation/ipc.ts` | Electron IPC dispatch | Electron host | DELETE | Node RPC -> Shared Registry |
| `apps/desktop/src/main/web-rpc-server.ts` | Electron-owned Web RPC | Electron host | DELETE | `apps/web-runtime/src/local-rpc-server.ts` |
| `apps/desktop/src/main/index.ts` | Electron lifecycle/Main | Electron host | DELETE | `apps/web-runtime/src/main.ts` |
| `apps/desktop/src/preload/**` | contextBridge / ipcRenderer | Electron renderer | DELETE | Web API uses HTTP RPC/SSE |
| `apps/desktop/scripts/space-quality-recovery/run-ab-smoke.mjs` | Current offline test helper | Root test | DELETE original after MOVE | retained under root image-generation test tooling |
| Remaining `apps/desktop/scripts/**` | Desktop real-provider/versioned/packaging/calibration runners | Legacy Desktop/tooling | DELETE | no current package/root consumer; historical reports remain |
| `apps/desktop/electron.vite.config.ts` | Electron build | Legacy Desktop | DELETE | `apps/web/vite.config.mjs` |
| `apps/desktop/vite.renderer.config.mjs` | obsolete Desktop renderer config | Legacy Desktop | DELETE | `apps/web/vite.config.mjs` |
| `apps/desktop/electron-builder.yml` | Desktop packaging | Legacy Desktop | DELETE | no Desktop artifact after S5 |
| `apps/desktop/scripts/package-win.mjs` | Desktop packaging | Legacy Desktop | DELETE | no Desktop artifact after S5 |
| `apps/desktop/tsconfig.json` | Desktop TypeScript project | Legacy Desktop | DELETE | Web and Web Runtime tsconfigs |
| `apps/desktop/README.md` | Desktop package instructions | Legacy Desktop | DELETE | root/current architecture docs |
| `apps/desktop/package.json` / workspace entry | Desktop workspace | npm | DELETE | Web, Web Runtime, CLI and packages remain |
| Electron, electron-vite, electron-builder lock graph | Desktop dependencies | Legacy Desktop | DELETE | regenerate root lockfile without Desktop workspace |
| Root `desktop:*` scripts | Desktop commands | Legacy Desktop | DELETE | `web:*`, Runtime, CLI, Golden remain |
| Desktop-specific compatibility assertions in root tests | S4 transition guards | Test only | DELETE/REPLACE | post-removal zero-reference guards |
| Desktop assumptions in verification/version scripts | S4 transition gates | Tooling | DELETE/REPLACE | Web/Node/Shared Runtime gates |
| Current README/AGENTS/architecture Desktop commands | Current documentation | Developers | DELETE/REPLACE | state Web + Node as sole Runtime |
| `.gitignore` Desktop build-only rules | Obsolete ignores | Repository | DEFER | harmless; remove only when exact and safe |
| Historical docs, archive, changelog, evaluation reports | Historical evidence | Governance | KEEP | history must not be rewritten |
| User projects, outputs, settings, safeStorage data | User data | User machine | KEEP | explicitly out of repository deletion scope |

Unmanifested deletion allowance: `NONE`.
