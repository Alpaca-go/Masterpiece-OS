# CI-W1C.7.4 — Epistemic Routing Audit

> **Mode**: Implementation phase · **HEAD**: 99b8344f (Documentation Tip)
> **Branch**: `feat/short-chain-simplified-ui`
> **Schema version**: `ci-w1c.7.4`
> **Status**: LOCKED for CI-W1C.7.4.

## 1. The hard rule: NEVER auto-promote

CI-W1C.7.4 does NOT add a rule that "from planning brief → FACT".
The `epistemic-routing.ts` `routePlanningClaim` function
dispatches on `epistemicClass` first, not on `sourceRole`.
`sourceRole` (planning / legacy visual / unknown) is metadata
about the source; `epistemicClass` (FACT / USER_REQUIREMENT /
MODEL_INFERENCE / UNKNOWN) is the semantic class of the claim.

## 2. Routing table

| `epistemicClass` | `key` mapped? | Routing destination | Truth authority | Notes |
|---|---|---|---|---|
| `FACT` | yes (in `PLANNING_TO_TRUTH_KEY`) | `TRUTH` | `AUTHORITATIVE_DOCUMENT_FACT` | promoted; existing authority |
| `FACT` | no | `EVIDENCE_ONLY` | (stays in artifact) | not promoted; preserved in carrier |
| `USER_REQUIREMENT` | (n/a — never mapped) | `USER_REQ` | `USER_CONFIRMED` | carried as user_requirement, NOT promoted |
| `MODEL_INFERENCE` | (n/a — never mapped) | `INFERENCE` | (stays in artifact) | stays in carrier; NOT promoted |
| `UNKNOWN` | (n/a — never mapped) | `UNKNOWN` | (stays in artifact) | stays unresolved; NOT fabricated |

## 3. `PLANNING_TO_TRUTH_KEY` registry (CI-W1C.7.4 minimal)

```ts
const PLANNING_TO_TRUTH_KEY = {
  industry: 'business.industry',
  brand_role: 'brand.role',
  // 14 other keys: NOT mapped
};
```

The minimal mapping is intentional. CI-W1C.7.4 is a wiring
phase, not a Truth-schema broadening phase. Adding the
remaining 14 mappings is a follow-up that requires:

- A Truth `key` definition for each new mapping target.
- A re-test of the Truth precedence / conflict detector with
  real planning-brief inputs.
- A human review (per CI-W1C.7.2's 6-dim review).

## 4. `assertEpistemicClassPreserved` guard

`assertEpistemicClassPreserved(sourceRole, epistemicClass)` is
a defensive guard that rejects combinations that should never
reach the routing layer:

| `sourceRole` | `epistemicClass` | Result |
|---|---|---|
| `PLANNING_STRATEGIC_SOURCE` | any of 4 | OK (planning brief can carry any class) |
| `LEGACY_VISUAL_EVIDENCE` | any | THROW `PLANNING-SOURCE-ROLE-MISMATCH` |
| `UNKNOWN_SOURCE` | any | THROW `PLANNING-SOURCE-ROLE-MISMATCH` |

In practice the artifact builder defensively skips non-planning
sourceRoles before they reach the routing layer; this guard
catches any future code that bypasses the builder.

## 5. Legacy leakage (CI-W1C.7.3A finding)

CI-W1C.7.3A found that **5 legacy-visual anchors per project**
at Stages 5/7/8 leak into Truth / Strategic Context / Prompt.
These are VUC-inferred `industry` and `brand_role` values, NOT
real planning-brief claims.

CI-W1C.7.4's epistemic routing does NOT redesign the old Truth
handling for those 5 anchors. The new `PLANNING_STRATEGIC_SOURCE`
carrier is additive: it does NOT replace the existing legacy
visual evidence path.

For CI-W1C.7.4 the invariant is:

> `LegacyPositiveLeakage(planning_carrier) = 0`

Verified by `LVA-01..05`. The legacy visual evidence path
remains demoted to `LEGACY_VISUAL_EVIDENCE` and is defensively
skipped by the planning artifact builder.

## 6. Test coverage (PER)

| Test | Verifies |
|---|---|
| PER-01 | FACT + truthKey → TRUTH |
| PER-02 | FACT + no truthKey → EVIDENCE_ONLY (not promoted) |
| PER-03 | USER_REQUIREMENT → USER_REQ (never TRUTH, even with truthKey) |
| PER-04 | MODEL_INFERENCE / UNKNOWN stay in their lanes |
| PER-05 | registry is exactly industry + brand_role |
| PER-06 | assertEpistemicClassPreserved boundary |
| PER-07 | exhaustiveness: unknown class throws |

All 7 PER tests PASS.
