# S4-C-01 — Reference Engine Ownership

Capability: Reference asset resolution

Old Owner: Desktop main process

New Owner: `@masterpiece/image-generation-runtime/reference-engine`

## Moved Files

- `apps/desktop/src/main/reference-asset-resolver.ts`
- to `packages/image-generation-runtime/src/reference-engine/reference-asset-resolver.ts`

## New Files

- This batch manifest

## Compatibility Adapters

- `apps/desktop/src/main/reference-asset-resolver.ts` is now a `COMPATIBILITY_ONLY` re-export.

## Import Changes

- The active vNext generation service imports the shared Reference Engine path.
- Resolver and project-store intake tests import the shared path.

## Runtime Changes

None. The resolver retains the same filesystem, signature, size, SHA-256, fail-closed, and path-boundary behavior. Its project asset input is now an explicit structural contract instead of a Desktop-owned type.

## Golden Coverage

- G-01 Reference First
- G-03 Continuation
- Dedicated Reference Asset Resolver tests

## Verification

Pre-Test: Unit 711/711 PASS; CLI 40/40 PASS; Web Smoke PASS; Golden 5/5 PASS; Provider calls 0.

Post-Test: Unit 711/711 PASS; CLI 40/40 PASS; Desktop build PASS; Web Smoke PASS; Golden 5/5 PASS; Provider calls 0; Golden auto-update NO.

## Rollback

Restore the implementation at the old path, restore the three imports, and remove the compatibility re-export.

Result: PASS.
