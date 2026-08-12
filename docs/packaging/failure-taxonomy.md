# P1-4 — Failure Taxonomy

**Phase:** Packaging V1 / P1 — Golden Baseline & Shot Contracts
**Date:** 2026-08-12
**Status:** `FAILURE_TAXONOMY_FROZEN` (12 codes, evaluation only)
**Spec:** Packaging V1 Revised Development Specification §P1 ("Failure Taxonomy"; P3 "Packaging Validator")
**Predecessor:** `acceptance-rubric.md`

## 1. Purpose (per P1 spec)

Define the V1 failure code set (12 codes PKG-F01..F12). P1
freezes the taxonomy; P3's Packaging Validator consumes it. P1
does NOT implement the Validator; P3 does.

Like the acceptance rubric, the failure taxonomy is
**Evaluation Criteria**, NOT a production rule. The codes are
Jiuzhou-specific. (See `golden-vs-production-boundary.md`.)

## 2. The 12 codes (frozen)

| Code | Name | Description | Maps to rubric axis |
|---|---|---|---|
| **PKG-F01** | Brand identity drift | Brand mark missing, replaced, or visibly distorted; brand role statement not respected | Brand Fidelity |
| **PKG-F02** | Package structure drift | Confirmed packaging structure (天地盖硬盒 or similar) altered; structural edges do not match Locked Asset | Structure Fidelity |
| **PKG-F03** | Reference fidelity failure | Reference image not honored; semantic drift; preflight gate reports failure | Reference Fidelity |
| **PKG-F04** | Visual direction drift | 东方秩序 × 生物光泽 direction not respected; motif language absent | Visual Direction Fidelity |
| **PKG-F05** | Color ratio failure | Color ratio outside 65-70 / 20-25 / 5-10 / 局部高光 baseline; identity / base / structural ratio wrong | Visual Direction Fidelity |
| **PKG-F06** | Motif over-literalization | Peacock motifs rendered literally (realistic feathers) rather than as the 5 abstract components | Visual Direction Fidelity |
| **PKG-F07** | Material / texture failure | Substrate texture absent or implausible; gloss / matte / foil / emboss not rendered | Material Quality |
| **PKG-F08** | Composition failure | Framing per shot contract violated (HERO < 60%, SERIES unequal weight, OPEN missing reveal) | Composition Quality |
| **PKG-F09** | Series consistency failure | For SERIES shot: SKUs differ on substrate, color ratio, lighting, or brand mark position | Series Consistency |
| **PKG-F10** | Open-box physical logic failure | For OPEN shot: lid floating, hinge impossible, product not visible inside | Composition Quality |
| **PKG-F11** | Generic advertising look | Output looks like generic advertising rather than brand-specific packaging | Brand Fidelity |
| **PKG-F12** | Provider / runtime failure | Provider call failed; runtime error; preflight gate blocked; output unrenderable | (n/a — runtime) |

## 3. Auto-fail vs scored

| Code | Type | Effect on overall score |
|---|---|---|
| PKG-F01 | auto-fail | overall = 0 |
| PKG-F02 | auto-fail | overall = 0 |
| PKG-F03 | scored (Reference Fidelity) | deducts 1.0 - referenceFidelity |
| PKG-F04 | scored (Visual Direction) | deducts 1.0 - visualDirectionFidelity |
| PKG-F05 | scored (Visual Direction) | deducts 1.0 - visualDirectionFidelity |
| PKG-F06 | scored (Visual Direction) | deducts 1.0 - visualDirectionFidelity |
| PKG-F07 | scored (Material Quality) | deducts 1.0 - materialQuality |
| PKG-F08 | scored (Composition Quality) | deducts 1.0 - compositionQuality |
| PKG-F09 | scored (Series Consistency, SERIES only) | deducts 1.0 - seriesConsistency |
| PKG-F10 | scored (Composition Quality, OPEN only) | deducts 1.0 - compositionQuality |
| PKG-F11 | auto-fail | overall = 0 |
| PKG-F12 | runtime | evaluation aborted; no score; report carries the upstream error code |

The exact scoring algorithm is **out of P1 scope**; P3 freezes
the algorithm. P1 records the **shape** (which codes are
auto-fail, which codes map to which axis).

## 4. Type definition (frozen)

`packages/image-generation-contracts/src/packaging-failure-code.ts`
adds the canonical type:

```ts
export type PackagingFailureCode =
  | 'PKG-F01' | 'PKG-F02' | 'PKG-F03' | 'PKG-F04'
  | 'PKG-F05' | 'PKG-F06' | 'PKG-F07' | 'PKG-F08'
  | 'PKG-F09' | 'PKG-F10' | 'PKG-F11' | 'PKG-F12';

export const PACKAGING_FAILURE_CODES: ReadonlyArray<PackagingFailureCode> =
  Object.freeze([
    'PKG-F01', 'PKG-F02', 'PKG-F03', 'PKG-F04', 'PKG-F05', 'PKG-F06',
    'PKG-F07', 'PKG-F08', 'PKG-F09', 'PKG-F10', 'PKG-F11', 'PKG-F12',
  ]);

export const PACKAGING_AUTO_FAIL_CODES: ReadonlyArray<PackagingFailureCode> =
  Object.freeze(['PKG-F01', 'PKG-F02', 'PKG-F11']);

export const PACKAGING_FAILURE_CODES_VERSION = '1.0.0' as const;
```

`@masterpiece/image-generation-contracts/src/index.ts` re-exports.

## 5. Source of truth

The codes are recorded in
`tests/fixtures/packaging/jiuzhou/failure-taxonomy.json`
(consumer by the P1 failure-taxonomy test; the file is also
referenced by the P3 Validator's Golden path).

```json
{
  "schemaVersion": "1.0",
  "taxonomyVersion": "1.0.0",
  "appliesTo": "golden-jiuzhou",
  "codes": [
    { "code": "PKG-F01", "name": "brand identity drift",
      "autoFail": true, "axis": "brandFidelity" },
    { "code": "PKG-F02", "name": "package structure drift",
      "autoFail": true, "axis": "structureFidelity" },
    { "code": "PKG-F03", "name": "reference fidelity failure",
      "autoFail": false, "axis": "referenceFidelity" },
    { "code": "PKG-F04", "name": "visual direction drift",
      "autoFail": false, "axis": "visualDirectionFidelity" },
    { "code": "PKG-F05", "name": "color ratio failure",
      "autoFail": false, "axis": "visualDirectionFidelity" },
    { "code": "PKG-F06", "name": "motif over-literalization",
      "autoFail": false, "axis": "visualDirectionFidelity" },
    { "code": "PKG-F07", "name": "material / texture failure",
      "autoFail": false, "axis": "materialQuality" },
    { "code": "PKG-F08", "name": "composition failure",
      "autoFail": false, "axis": "compositionQuality" },
    { "code": "PKG-F09", "name": "series consistency failure",
      "autoFail": false, "axis": "seriesConsistency",
      "appliesTo": "PKG-SERIES-GROUP" },
    { "code": "PKG-F10", "name": "open-box physical logic failure",
      "autoFail": false, "axis": "compositionQuality",
      "appliesTo": "PKG-GIFT-OPEN" },
    { "code": "PKG-F11", "name": "generic advertising look",
      "autoFail": true, "axis": "brandFidelity" },
    { "code": "PKG-F12", "name": "provider / runtime failure",
      "autoFail": false, "axis": null }
  ]
}
```

## 6. P1-4 acceptance

- [x] 12 codes defined (PKG-F01..F12)
- [x] Per-code axis mapping recorded
- [x] 3 auto-fail codes identified (F01 / F02 / F11)
- [x] Type + frozen array + version added to image-generation-contracts
- [x] Source of truth = `tests/fixtures/packaging/jiuzhou/failure-taxonomy.json`
- [x] Jiuzhou-specific; NOT a default for other projects
