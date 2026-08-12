# P1-3 — Acceptance Rubric

**Phase:** Packaging V1 / P1 — Golden Baseline & Shot Contracts
**Date:** 2026-08-12
**Status:** `ACCEPTANCE_RUBRIC_FROZEN` (7-axis evaluation criteria; not production rule)
**Spec:** Packaging V1 Revised Development Specification §P1 ("Acceptance Rubric"; P3 "Packaging Validator")
**Predecessor:** `shot-contracts.md`

## 1. Purpose (per P1 spec)

Define the V1 acceptance rubric (7 axes). P1 freezes the
**rubric**; P3's Packaging Validator consumes it. P1 does NOT
implement the Validator; P3 does.

The rubric is **Evaluation Criteria**, NOT a production rule.
The thresholds apply only when scoring an output against the
Jiuzhou Golden; they are not hard-coded into the Packaging
Translation / Compiler / Validator business logic in any way
that would make them a default for other projects. (See
`golden-vs-production-boundary.md`.)

## 2. The 7 axes (frozen)

| # | Axis | Weight class | Threshold (Jiuzhou Golden) | Description |
|---|---|---|---|---|
| 1 | **Brand Fidelity** | primary | **≥ 0.90** | Brand mark visible, brand role statement respected, no brand identity drift |
| 2 | **Structure Fidelity** | primary | **≥ 0.85** | Confirmed packaging structure (天地盖硬盒 or similar) preserved; structural edges match Locked Asset |
| 3 | **Visual Direction Fidelity** | primary | **≥ 0.85** | 东方秩序 × 生物光泽 direction respected; motif language present; forbidden motif set absent |
| 4 | **Composition Quality** | primary | **≥ 0.80** | Framing per shot contract (HERO 60%+, SERIES equal weight, OPEN reveal + brand on lid) |
| 5 | **Material Quality** | primary | **≥ 0.80** | Substrate texture, gloss / matte behavior, foil / emboss rendered plausibly |
| 6 | **Reference Fidelity** | primary | **≥ 0.85** | Locked Asset + reference assets honored; no semantic drift; preflight gate PASS |
| 7 | **Series Consistency** | series-only (SERIES shot) | **≥ 0.80** | All SKUs share substrate, color ratio, lighting, brand mark position; no SKU visually drifts |
| 8 | **Overall** (composite) | composite | **≥ 0.85** | Weighted average of axes 1-7 (axis 7 weighted 0 for non-SERIES shots) |

Thresholds are Jiuzhou Golden-specific. They are not a
default for other projects. Other projects (V2, V3) will define
their own rubric.

## 3. Auto-fail conditions (frozen)

Per the P4 spec section on "Freeze Artifacts" and the P1
constraint, regardless of overall score these conditions force
the rubric to **FAIL**:

```text
auto_fail_1:  brand identity drift       → overall = 0
auto_fail_2:  confirmed package structure error → overall = 0
auto_fail_3:  product substitution       → overall = 0
auto_fail_4:  severe reference drift     → overall = 0
auto_fail_5:  Locked Asset critical violation → overall = 0
```

These auto-fail conditions are **Golden evaluation rules**; they
are NOT production rules. The Packaging Validator (P3) does NOT
implement these as a hard production rule; it only applies them
when the Golden is being evaluated.

## 4. Per-axis scoring (frozen shape; P3 implements)

The rubric scoring is 0.0 – 1.0 per axis. The exact scoring
algorithm is **out of P1 scope** (P3 implements it). The
**shape** is:

```ts
interface PackagingRubricScore {
  shotContract: PackagingShotContract;
  brandFidelity: number;            // 0.0 - 1.0
  structureFidelity: number;        // 0.0 - 1.0
  visualDirectionFidelity: number;  // 0.0 - 1.0
  compositionQuality: number;       // 0.0 - 1.0
  materialQuality: number;          // 0.0 - 1.0
  referenceFidelity: number;        // 0.0 - 1.0
  seriesConsistency?: number;       // present iff shotContract === 'PKG-SERIES-GROUP'
  overall: number;                  // weighted average
  autoFail?: PackagingAutoFailCode; // if present, overall = 0
}
```

P1 freezes the **shape**; P3 freezes the **scoring algorithm
+ the auto-fail detection logic**.

## 5. Threshold source of truth

The thresholds are recorded in
`tests/fixtures/packaging/jiuzhou/acceptance-rubric.json`
(consumer by the P1 acceptance-rubric test; the file is also
referenced by the P3 Validator's Golden path).

```json
{
  "schemaVersion": "1.0",
  "rubricVersion": "1.0.0",
  "appliesTo": "golden-jiuzhou",
  "axes": {
    "brandFidelity":           { "threshold": 0.90, "weight": 0.20 },
    "structureFidelity":       { "threshold": 0.85, "weight": 0.15 },
    "visualDirectionFidelity": { "threshold": 0.85, "weight": 0.15 },
    "compositionQuality":      { "threshold": 0.80, "weight": 0.10 },
    "materialQuality":         { "threshold": 0.80, "weight": 0.10 },
    "referenceFidelity":       { "threshold": 0.85, "weight": 0.15 },
    "seriesConsistency":       { "threshold": 0.80, "weight": 0.15, "appliesTo": "PKG-SERIES-GROUP" }
  },
  "overall": { "threshold": 0.85, "composite": "weightedAverage" },
  "autoFail": [
    "brand_identity_drift",
    "confirmed_package_structure_error",
    "product_substitution",
    "severe_reference_drift",
    "locked_asset_critical_violation"
  ]
}
```

## 6. P1-3 acceptance

- [x] 7 axes frozen (Brand / Structure / Visual / Composition / Material / Reference / Series)
- [x] Per-axis thresholds frozen
- [x] Overall composite threshold frozen
- [x] 5 auto-fail conditions frozen
- [x] Rubric shape recorded (P3 implements scoring)
- [x] Threshold source of truth = `tests/fixtures/packaging/jiuzhou/acceptance-rubric.json`
- [x] Jiuzhou-specific; NOT a default for other projects
