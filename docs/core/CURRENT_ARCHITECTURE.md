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

## Visual Analysis Provider Policy (A3, since 2026-08-12)

The Visual Analysis default / alternative / fallback / manual-override
semantics are owned by a single runtime authority:
`packages/runtime-core/src/application/provider-policy.js` (export
`getCurrentProviderPolicy()`). The default is **Volcengine /
doubao-seed-2.1-turbo** (canonical id; API alias
`doubao-seed-2-1-turbo-260628`); the alternative is **Qwen /
qwen3.6-plus** (preserved for fallback / regression baseline per
A2-H §11). The Web Runtime Host, the headless CLI
(`apps/cli/bin/masterpiece-os.js`), and the Shared Runtime all
read from this policy through the canonical Analysis Provider
Registry (`packages/model-runtime/src/analysis-provider-registry.js`,
single semantic default-provider authority per A2-H §9). No
downstream layer hardcodes its own default. A one-step rollback
flips `default.provider` in `provider-policy.js`; the alternative
provider remains registered (per A3 spec §41). See
`../visual-analysis/A3-provider-policy.md`,
`../visual-analysis/A3-fallback-policy.md`, and
`../visual-analysis/A3-rollback-plan.md`.

See `RUNTIME_OWNERSHIP.md`, `../repository/CURRENT_REPOSITORY_MAP.md`, and
`../runtime/S5-post-removal-topology.md`.
