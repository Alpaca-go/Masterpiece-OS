# Current Version & Compatibility

This page is a navigation aid, not a second registry.

## Product version

The product version authority is `/VERSION`. The synchronization script writes
that value to the root package manifests and
`apps/cli/src/runtime-trace.js`. `npm run verify:version-consistency` guards the
copies.

## Current capability authorities

`config/repository-contract/current-authorities.json` declares the current
runtime and capability authority paths. It is governance metadata, not a
runtime registry.

## Persisted compatibility identifiers

`config/repository-contract/compatibility-registry.json` records the supported
persisted, configuration, provenance, and Golden identifiers, including their
consumers, owners, reasons, and removal conditions. Historical-looking
identifiers remain unchanged while they are registered compatibility
contracts.

## Naming guard and history

`scripts/verify-version-naming.mjs` prevents historical stage names from being
reintroduced as current product semantics. Historical version topology is kept
under `docs/repository-stabilization/history/`; it does not define current
architecture.
