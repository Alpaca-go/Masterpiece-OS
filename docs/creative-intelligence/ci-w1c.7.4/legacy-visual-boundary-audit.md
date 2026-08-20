# CI-W1C.7.4 — Legacy Visual Boundary Audit

> **Mode**: Implementation phase · **HEAD**: 99b8344f (Documentation Tip)
> **Branch**: `feat/short-chain-simplified-ui`
> **Schema version**: `ci-w1c.7.4`
> **Status**: LOCKED for CI-W1C.7.4.

## 1. The boundary

| Source class | Mapped `sourceRole` | Allowed in `PlanningStrategicEvidenceArtifact`? |
|---|:-:|:-:|
| `creative-brief` | `PLANNING_STRATEGIC_SOURCE` | YES |
| `brand-strategy` | `PLANNING_STRATEGIC_SOURCE` | YES |
| `market-research` | `PLANNING_STRATEGIC_SOURCE` | YES |
| `product-information` | `PLANNING_STRATEGIC_SOURCE` | YES |
| `visual-guideline` | `LEGACY_VISUAL_EVIDENCE` | **NO** (defensive skip) |
| `reference` | `LEGACY_VISUAL_EVIDENCE` | **NO** (defensive skip) |
| `unknown` | `UNKNOWN_SOURCE` | **NO** (defensive skip) |

The boundary is enforced at three levels:

1. **Map level** (`mapRoleToSourceRole`): refuses to map
   `visual-guideline` / `reference` to `PLANNING_STRATEGIC_SOURCE`.
2. **Builder level** (`buildPlanningStrategicEvidenceArtifact`):
   defensively `continue`s if the sourceRole is not
   `PLANNING_STRATEGIC_SOURCE`.
3. **Test level** (`LVA-01..05`): asserts that real-world
   visual-guideline / reference texts classify as
   `LEGACY_VISUAL_EVIDENCE` and never reach the planning
   carrier.

## 2. VUC diagnosis is NOT planning

The `visual_understanding_core` (VUC) produces inferences like:

- `business.industry` (inferred from PNG visual style)
- `brand.role` (inferred from poster / packaging / spatial layout)

CI-W1C.7.3A found that 5 such VUC-inferred values per project
leak into Truth / Strategic Context / Prompt at Stages 5/7/8.
CI-W1C.7.4 does NOT redesign that legacy path. It only ensures
that the NEW planning carrier has `LegacyPositiveLeakage = 0`.

The 5 VUC-inferred values are an existing-semantics problem that
belongs to a future re-projection phase (not CI-W1C.7.4's scope).

## 3. `assertPlanningSourceRole` boundary

`assertPlanningSourceRole(role)` only accepts 3 strings:

- `PLANNING_STRATEGIC_SOURCE`
- `LEGACY_VISUAL_EVIDENCE`
- `UNKNOWN_SOURCE`

Any invented role (e.g., `PLANNING_LEGACY_HYBRID`, `FACT`,
`USER_REQUIREMENT`) is rejected with
`PLANNING-SOURCE-ROLE-INVALID`. This is the type-system
boundary against accidentally treating the source role as the
epistemic class.

## 4. What the LVA tests prove

| Test | Real-world check |
|---|---|
| LVA-01 | `mapRoleToSourceRole('visual-guideline')` → `LEGACY_VISUAL_EVIDENCE` |
| LVA-02 | `mapRoleToSourceRole('reference')` → `LEGACY_VISUAL_EVIDENCE` |
| LVA-03 | a real VI / visual-guideline text classifies as visual-guideline, not planning |
| LVA-04 | a "参考" / reference text classifies as reference, not planning |
| LVA-05 | only 3 source roles are valid; all others are refused |

All 5 LVA tests PASS.

## 5. Carrier leakage = 0

The CI-W1C.7.4 `PlanningStrategicEvidenceArtifact` builder
defensively skips every non-planning sourceRole. The carrier
MUST NOT contain any `LEGACY_VISUAL_EVIDENCE` or
`UNKNOWN_SOURCE` ref. PDI-09 verifies this end-to-end.

This is the audit-trail guarantee that the planning carrier is
"pure" planning content.

## 6. Cross-references

- `planning-source-authority-contract.md` — the `sourceRole` registry
- `planning-strategic-evidence-contract.md` — the artifact shape
- `epistemic-routing-audit.md` — how `sourceRole` interacts with `epistemicClass`
- CI-W1C.7.3A `legacy-positive-leakage-audit.md` — the prior audit of the legacy path
