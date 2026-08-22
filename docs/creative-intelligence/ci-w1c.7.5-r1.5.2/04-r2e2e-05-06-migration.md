# R2E2E-05/06 Migration

R2E2E-04 now proves that the accepted artifact's `sourceMap.planningClaims` exactly mirrors the runtime IDs visible in the saved Strategic prompt.

R2E2E-05 now requires:

- synthesis `PASS`;
- non-null accepted artifact;
- at least one valid `projectUnderstanding.planningClaimRef`;
- at least one tension or insight Planning reference;
- every Planning reference resolves to the runtime allowed set.

R2E2E-06 computes invalid references by set difference and requires an empty result; fake-ID patterns are also absent.

The R2 production-path fixture now supplies one deterministic runtime fact and one deterministic runtime need. This is fixture schema alignment required by the unchanged structural and SG gates; these IDs are test inputs, not production mock hardcodes.

Result: R2E2E-04/05/06 PASS and R2 returns to 34/34 PASS.
