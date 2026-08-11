# Current Architecture

Status: Phase S4.2 Shared Runtime extraction complete. S4.1R is ready; S5 is not ready.

## Current runtime

Web is the primary product interface, but its current development/smoke launch still starts the Electron main process. Electron now owns lifecycle, IPC/RPC binding, settings/credential adapters, native dialogs/shell and event bridging. Host-neutral `@masterpiece/runtime-core` owns service composition, application orchestration and the Shared Operation Registry. Desktop remains present until S4.1R supplies a Node host and passes Desktop-off Web smoke.

```text
Web Renderer
  -> Electron Host (temporary)
  -> Shared Operation Registry
  -> Shared Runtime
  -> Shared Core
```

## Core ownership

Current production consumers use four explicit Shared Core boundaries:

- Visual Analysis: `@masterpiece/analysis-runtime/core/visual-analysis-core.ts`
- Reference Engine: `@masterpiece/image-generation-runtime/reference-engine/reference-asset-resolver.ts`
- Space Generation: `@masterpiece/image-generation-runtime/core/space-generation-core.js`
- Packaging Generation: `@masterpiece/image-generation-runtime/core/packaging-generation-core.js`

These boundaries preserve the existing implementation objects and behavior. Historical names can remain behind a facade until S6; they are not public consumer topology.

## Adapters and providers

Desktop owns Electron lifecycle, windows, IPC, native filesystem UI and Electron-specific path/credential integration. The analysis prompt-root adapter translates Electron paths into a Shared Runtime contract. Provider implementations remain in the existing model/image provider packages and are injected into `createRuntimeServices(...)`.

## Compatibility layers

CLI v5 and `prompts/v5` remain active for Visual Analysis. Space historical layers remain active behind the Space Core facade. Old Desktop business-module paths are `COMPATIBILITY_ONLY` re-exports to Shared Runtime. See `docs/core/S4-compatibility-adapters.md` and `docs/runtime/S4.2-migration-ledger.md`.

## Forbidden directions

- Shared packages must not import `apps/desktop`.
- Shared Runtime and Shared Operation Registry must not import Electron.
- Web renderer code must not import Desktop main business services.
- Production code must not import archive artifacts.
- New current consumers must not directly import historical generation namespaces outside the owning Core facade.

## Next architectural gate

S4.1R may now bind a Node/local-RPC host to the same Shared Operation Registry and Shared Runtime. Until that host resolves configuration, credentials and paths and Desktop-off Web smoke passes, status remains `S5_NOT_READY`.
