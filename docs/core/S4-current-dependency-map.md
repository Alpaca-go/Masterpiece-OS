# S4 Current Dependency Map

Recorded: 2026-08-11  
Starting commit: `0227ec760c0ec253b24384ca4e7942b5585b5629`

## Runtime truth

```text
Web renderer
  -> renderer web-api.ts                         UI_DEPENDENCY
  -> Vite /_masterpiece proxy                   ADAPTER_DEPENDENCY
  -> Desktop Electron main process              HOST_DEPENDENCY / LEGACY_DEPENDENCY
  -> web-rpc-server.ts                          ADAPTER_DEPENDENCY
  -> index.ts handler registry                  HOST_DEPENDENCY
  -> Desktop-owned business services           CORE_DEPENDENCY (wrong owner)
  -> @masterpiece/* packages                    CORE_DEPENDENCY
```

The browser renderer has no static import from `apps/desktop/src/main`, but the Web runtime process is started by `electron-vite` and the RPC handlers are composed inside the Electron main entry. The dependency is a runtime-host dependency rather than a renderer source import.

## Domain map

| Domain | Current owner / entry | Dependency class | Current consumers | Coupling finding |
|---|---|---|---|---|
| Web | `apps/desktop/src/renderer` + `web-api.ts` | UI_DEPENDENCY | Browser | Source-isolated, runtime-hosted by Electron |
| Desktop | `apps/desktop/src/main/index.ts` | HOST_DEPENDENCY / LEGACY_DEPENDENCY | Desktop IPC and Web RPC | Owns lifecycle, composition and business handler registration |
| CLI | `apps/cli/src/v5/bootstrap.js` | LEGACY_DEPENDENCY | Visual Analysis pipeline | Dynamically imported as a module; no CLI process is spawned |
| Visual Analysis | `pipeline-service.ts` | CORE_DEPENDENCY + HOST_DEPENDENCY | Web RPC and Desktop IPC | Business orchestration is mixed with Electron prompt-root resolution |
| Reference First | `reference-asset-resolver.ts`, `vnext-service.ts`, package Space policies | CORE_DEPENDENCY | Image-generation service | Pure resolver is Desktop-owned despite no Electron dependency |
| Space Generator | `@masterpiece/image-generation-runtime/vnext` and `/space` | CORE_DEPENDENCY | Desktop vNext service, tests, scripts | Shared implementation exists; consumers still know historical topology |
| Packaging Generator | `@masterpiece/image-generation-runtime/task-builder` and deliverables | CORE_DEPENDENCY | Desktop image-generation service, tests | Shared implementation exists; Desktop imports internal implementation paths |
| Provider Layer | model/image adapter packages plus Desktop credential resolution | PROVIDER_DEPENDENCY / ADAPTER_DEPENDENCY | Analysis and generation services | Provider implementations are shared; credential/config ownership is Desktop-specific |
| Schemas | `schemas/`, contract packages, Desktop model-schema | CORE_DEPENDENCY | Runtime and tests | Packaging schemas are shared; several analysis schemas remain Desktop-owned |
| Config | `settings-store.ts` | HOST_DEPENDENCY | All model-backed services | Uses Electron `app` and `safeStorage`; requires an adapter boundary |
| Persistence / Filesystem | `project-store.ts`, `runtime/*`, image run store | CORE_DEPENDENCY + ADAPTER_DEPENDENCY | Business services | Mostly Node filesystem logic under Desktop ownership |
| Smoke / Tests | root tests, Desktop tests, Web smoke, Golden | TEST_ONLY_DEPENDENCY | Release gates | Web smoke currently starts Electron, so Desktop-off is not proven |

## Visual Analysis path

```text
Web/Desktop handler
  -> pipeline-service.ts
  -> createQwenReasoner()                       PROVIDER_DEPENDENCY
  -> dynamic import apps/cli/src/v5/bootstrap  LEGACY_DEPENDENCY
  -> apps/cli/prompts/v5                        LEGACY_DEPENDENCY / prompt asset
  -> analysis-runtime + project compilers       CORE_DEPENDENCY
```

There is no spawned CLI process. The remaining debt is module ownership and prompt location, not a process dependency.

## Reference and generation path

```text
Web/Desktop handler
  -> Desktop vnext-service                      HOST_DEPENDENCY + CORE_DEPENDENCY
  -> Desktop reference-asset-resolver           CORE_DEPENDENCY (wrong owner)
  -> image-generation-runtime/vnext             CORE_DEPENDENCY
  -> image-generation-runtime/space             CORE_DEPENDENCY
  -> Desktop image-generation service           ADAPTER_DEPENDENCY + persistence
  -> shared provider adapters                    PROVIDER_DEPENDENCY
```

Packaging follows the same host but uses `task-builder.js` and deliverable compilers rather than the Space compiler.

## Process and dynamic-load audit

- Web runtime currently starts `electron-vite`, which starts Electron.
- Production Web business code does not spawn a CLI process.
- The active analysis pipeline dynamically imports `apps/cli/src/v5/bootstrap.js`.
- Shared packages import `apps/desktop/*`: 0.
- Production imports from `archive/*`: 0.

## Starting metrics

| Metric | Before S4 |
|---|---:|
| Web renderer static imports from Desktop main | 0 |
| Web runtime host dependencies on Electron/Desktop main | 1 |
| Web direct CLI v5 imports | 0 |
| Active backend direct CLI v5 module loads | 1 |
| Shared packages importing Desktop | 0 |
| Desktop-owned business service modules | 48 top-level modules plus image/reference/runtime submodules |
| Shared-core packages | 14 |
| Production archive imports | 0 |

## Extraction order derived from evidence

1. Move the pure Reference Asset Resolver into the existing shared image-generation runtime.
2. Add capability-named Space and Packaging facades in the existing shared runtime and migrate Desktop consumers.
3. Separate Visual Analysis prompt-root/reasoner construction from Electron hosting and expose a shared core boundary.
4. Add dependency-direction assertions before attempting a standalone Web backend.
5. Treat settings/credentials and project filesystem ownership as explicit blockers for Desktop-off Web runtime if they cannot be extracted without changing behavior in S4.

