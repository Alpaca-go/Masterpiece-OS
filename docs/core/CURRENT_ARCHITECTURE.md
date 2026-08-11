# Current Architecture

The production topology is Web-only: `apps/web` communicates over local RPC
with the Node Host in `apps/web-runtime`. The host composes
`@masterpiece/runtime-core`, whose Shared Operation Registry provides 136
business operations; the Node adapter adds 11 native operations.

Desktop/Electron lifecycle, IPC/preload, native adapters, build tooling,
packaging and compatibility re-exports were removed in S5. Prompt, compiler,
schema, provider, reference, generation and Golden behavior remain owned by
their existing Shared Runtime/Core packages.

See `RUNTIME_OWNERSHIP.md` and `../runtime/S5-post-removal-topology.md`.
