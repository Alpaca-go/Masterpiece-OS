# Current Architecture

The production topology is Web-only: `apps/web` communicates over local RPC
with the Node Host in `apps/web-runtime`. The host composes
`@masterpiece/runtime-core`, whose Shared Operation Registry provides 136
business operations; the Node adapter adds 11 native operations.

Desktop/Electron lifecycle, IPC/preload, native adapters, build tooling,
packaging and compatibility re-exports were removed in S5. Prompt, compiler,
schema, provider, reference, generation and Golden behavior remain owned by
their existing Shared Runtime/Core packages.

Current capability paths are semantic: Visual Analysis is under
`apps/cli/src/analysis-engine`, analysis prompts under
`apps/cli/prompts/analysis`, formal creative generation under
`runtime-core/.../image-generation/short-chain-service.ts`, generation
orchestration under `image-generation-runtime/src/generation`, and the single
production Space compiler under `image-generation-runtime/src/space`.
Version-like persisted identifiers remain compatibility contracts, not
architecture authorities.

See `RUNTIME_OWNERSHIP.md`, `../repository/CURRENT_REPOSITORY_MAP.md`, and
`../runtime/S5-post-removal-topology.md`.
