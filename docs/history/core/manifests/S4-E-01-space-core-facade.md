# S4-E-01 — Space Generation Core Facade

Capability: Space generation compilation, policy gates, reference context, continuation and provider payload adaptation

Old Owner: Consumers imported historical `vnext`, `space-quality`, and Seedream implementation paths directly.

New Owner: `@masterpiece/image-generation-runtime/core/space-generation-core.js`

## Moved Files

None.

## New Files

- `packages/image-generation-runtime/src/core/space-generation-core.js`
- `tests/image-generation/space-generation-core-facade.test.js`
- This batch manifest

## Compatibility Adapters

The historical implementation exports remain available for existing low-level tests and scripts. The new facade re-exports the same function objects; it does not duplicate behavior.

## Import Changes

The active Desktop vNext generation service now imports its Space compilation, quality gate, reference policy, continuation, and Seedream adapter capabilities from the shared facade only.

## Runtime Changes

None. Compiler selection, prompt ordering, reference authority, target-scene behavior, continuation policy, quality gates, and provider payload construction are unchanged.

## Golden Coverage

- G-01 Reference First
- G-02 Standard Space
- G-03 Continuation

## Verification

Pre-Test: Unit 711/711 PASS; CLI 40/40 PASS; Desktop build PASS; Web Smoke PASS; Golden 5/5 PASS; Provider calls 0.

Post-Test: Unit 712/712 PASS; CLI 40/40 PASS; Desktop build PASS; Web Smoke PASS; Golden 5/5 PASS; Provider calls 0; Golden auto-update NO.

## Rollback

Restore the three historical imports in `vnext-service.ts` and remove the facade and its identity test.

Result: PASS.
