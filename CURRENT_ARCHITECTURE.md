# Current Architecture

Status: Phase S4 facade-first extraction complete with remaining runtime adapters. S5 is not ready.

## Current runtime

Web is the primary product interface, but its current development/smoke launch still starts the Electron main process. That process hosts local RPC, settings/credentials, persistence and service composition. Desktop remains present and must not be removed until a non-Electron runtime host passes the full Web smoke.

## Core ownership

Current production consumers use four explicit Shared Core boundaries:

- Visual Analysis: `@masterpiece/analysis-runtime/core/visual-analysis-core.ts`
- Reference Engine: `@masterpiece/image-generation-runtime/reference-engine/reference-asset-resolver.ts`
- Space Generation: `@masterpiece/image-generation-runtime/core/space-generation-core.js`
- Packaging Generation: `@masterpiece/image-generation-runtime/core/packaging-generation-core.js`

These boundaries preserve the existing implementation objects and behavior. Historical names can remain behind a facade until S6; they are not public consumer topology.

## Adapters and providers

Desktop owns Electron lifecycle, windows, IPC and Electron-specific path/credential integration. The analysis prompt-root adapter translates Electron paths into a Shared Core contract. Provider implementations remain in the existing model/image provider packages and are injected or composed by the runtime host.

## Compatibility layers

CLI v5 and `prompts/v5` remain active for Visual Analysis. Space historical layers remain active behind the Space Core facade. The Desktop reference resolver path is a `COMPATIBILITY_ONLY` re-export. See `docs/core/S4-compatibility-adapters.md`.

## Forbidden directions

- Shared packages must not import `apps/desktop`.
- Web renderer code must not import Desktop main business services.
- Production code must not import archive artifacts.
- New current consumers must not directly import historical generation namespaces outside the owning Core facade.

## Next architectural gate

S5 requires a Node/local-RPC runtime host that can resolve configuration, credentials, storage and all service composition without starting Electron. Until Desktop-off Web smoke passes, status remains `S5_NOT_READY`.
