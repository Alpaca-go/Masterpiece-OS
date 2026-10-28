# S4-F-01 — Packaging Generation Core Facade

Capability: Packaging task/source migration, deterministic compilation, fingerprints, gates, download verification and redaction

Old Owner: The Desktop image-generation service imported individual runtime implementation files.

New Owner: `@masterpiece/image-generation-runtime/core/packaging-generation-core.js`

## Moved Files

None.

## New Files

- `packages/image-generation-runtime/src/core/packaging-generation-core.js`
- `tests/image-generation/packaging-generation-core-facade.test.js`
- This batch manifest

## Compatibility Adapters

Historical exports remain available to low-level tests. The shared facade re-exports the same function and policy objects; no second implementation exists.

## Import Changes

The active Desktop image-generation service now obtains Packaging compilation and execution-support capabilities from one shared facade.

## Runtime Changes

None. Task 1.0/2.0/3.0 compatibility, source migration, fingerprints, Gate semantics, Provider requests, persistence and output verification remain unchanged.

## Golden Coverage

- G-05 deterministic Packaging
- Existing image-generation migration and persistence tests

## Verification

Pre-Test: Unit 712/712 PASS; CLI 40/40 PASS; Desktop build PASS; Web Smoke PASS; Golden 5/5 PASS; Provider calls 0.

Post-Test: Unit 713/713 PASS; CLI 40/40 PASS; Desktop build PASS; Web Smoke PASS; Golden 5/5 PASS; Provider calls 0; Golden auto-update disabled.

## Rollback

Restore the individual imports in `image-generation/service.ts` and remove the facade and identity test.

Result: PASS.
