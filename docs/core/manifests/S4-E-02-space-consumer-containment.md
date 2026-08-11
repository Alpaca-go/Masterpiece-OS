# S4-E-02 — Space Consumer Containment

Capability: Spatial semantic validation, evidence integrity and deliverable validation

Old Owner: Desktop consumers imported historical `space` and `vnext` implementation paths directly.

New Owner: `@masterpiece/image-generation-runtime/core/space-generation-core.js`

## Moved Files

None.

## New Files

- This batch manifest

## Compatibility Adapters

Historical exports remain for low-level compatibility tests. Current Desktop consumers use only the Core facade.

## Import Changes

Three active Desktop consumers now import the Space Core facade instead of historical runtime namespaces.

## Runtime Changes

None. The facade re-exports the same function objects.

## Golden Coverage

- G-01/G-02/G-03

## Verification

Pre-Test: Unit 714/714 PASS; CLI 40/40 PASS; Desktop build PASS; Web Smoke PASS; Golden 5/5 PASS; Provider calls 0.

Post-Test: Unit 719/719 PASS (including architecture guards added in the same verification window); CLI 40/40 PASS; Desktop build PASS; Web Smoke PASS; Golden 5/5 PASS; Provider calls 0; Golden auto-update disabled.

## Rollback

Restore the three historical imports and remove the added facade exports.

Result: PASS.
