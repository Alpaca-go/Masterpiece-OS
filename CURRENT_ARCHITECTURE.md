# Current Architecture

Status: Phase S5 Legacy Desktop Removal complete.

## Primary runtime

```text
Web Renderer (apps/web)
  -> local RPC
Node Web Host (apps/web-runtime)
  -> Shared Operation Registry (136 business + 11 Node-native operations)
  -> Shared Runtime (@masterpiece/runtime-core/application)
  -> Shared Core capability packages
  -> provider adapters
```

Electron, Electron Main, preload/IPC, Desktop packaging and the Desktop
workspace are not part of current production topology.

## Core ownership

- Visual Analysis: `@masterpiece/analysis-runtime/core/visual-analysis-core.ts`
- Reference Engine: `@masterpiece/image-generation-runtime/reference-engine/*`
- Space Generation: `@masterpiece/image-generation-runtime/core/space-generation-core.js`
- Packaging Generation: `@masterpiece/image-generation-runtime/core/packaging-generation-core.js`
- Application orchestration and persistence: `@masterpiece/runtime-core/application/*`
- Credentials, native paths and local transport: `apps/web-runtime`
- Product UI: `apps/web`

Historical internal implementation names may remain behind owning Core
facades; S5 does not perform naming normalization.

## Hard boundaries

- Current production must not import Desktop/Electron or `archive/`.
- Web Renderer must not import host implementation modules.
- Shared Runtime and operation registry must remain host-neutral.
- Evaluation/golden assets must not enter production Runtime.
- Labs remain isolated from production Runtime and UI.

The detailed ownership map is `docs/core/RUNTIME_OWNERSHIP.md`; S5 evidence is
under `docs/runtime/`.
