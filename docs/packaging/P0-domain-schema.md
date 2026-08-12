# P0-4 — Packaging Domain Schema

**Phase:** Packaging V1 / P0 — Architecture & Reuse Audit
**Date:** 2026-08-12
**Status:** `P0_DOMAIN_SCHEMA_FROZEN`
**Spec:** Packaging V1 Revised Development Specification §P0 ("定义 Packaging domain contract")
**Predecessor:** `P0-packaging-target-interface.md`

## 1. Purpose (per P0 spec)

Define the Packaging domain schema. The 14-block compiled-prompt
schema is the cross-target contract; this doc names the blocks,
explains which are Shared, which are Space-only filled, and which
are Packaging-specific filled (P1 will pin the exact fields).

## 2. Locked Source

The current 14-block schema is the golden baseline referenced
by `tests/image-generation/packaging-contract.test.js` and the
golden regression suite. Any change to the block list requires
a new A2.x / P1 re-evaluation cycle (not in P0 scope).

```text
// from tests/golden/golden-suite.js (current Space + Packaging
// golden; the 14-block contract is shared across both targets)
const EXPECTED_BLOCKS = [
  'task',
  'spatial_intent',
  'architecture_language',
  'architecture_context',
  'architecture_function_bridge',
  'architectural_concept',
  'architecture_dna',
  'brand_translation',
  'functional_requirement',
  'material',
  'lighting',
  'composition',
  'rendering',
  'negative_constraints',
];
```

## 3. Block-by-block role matrix (frozen at P0)

| # | Block ID | Cross-target (S) | Space fills (Sp) | Packaging fills (Pk, P1) |
|---|---|---|---|---|
| 1 | `task` | S | generic task description | generic task description |
| 2 | `spatial_intent` | S | Space target scene / spatial layout | Packaging 3D product / 6-face layout |
| 3 | `architecture_language` | Sp | Space architecture | (n/a for Packaging) |
| 4 | `architecture_context` | Sp | Space architectural surroundings | (n/a) |
| 5 | `architecture_function_bridge` | Sp | Space architecture ↔ function | (n/a) |
| 6 | `architectural_concept` | Sp | Space architectural concept | (n/a) |
| 7 | `architecture_dna` | Sp | Space architecture DNA | (n/a) |
| 8 | `brand_translation` | S | brand visual translation | brand visual translation |
| 9 | `functional_requirement` | S | Space functional reqs (reception / display) | Packaging functional reqs (open / display / protect) |
| 10 | `material` | S | material rendering | material rendering (PKG-specific: paper / cardboard / gloss / matte) |
| 11 | `lighting` | S | lighting | lighting |
| 12 | `composition` | S | composition | composition (PKG-specific: hero / series / open-box framing) |
| 13 | `rendering` | S | rendering | rendering |
| 14 | `negative_constraints` | S | negatives | negatives |

For P0 we **do not** add new blocks. We **do not** change the
shared `EXPECTED_BLOCKS` list. P1 may add Packaging-specific
field-level sub-schemas under existing blocks (e.g. a
`packaging_structure` sub-field under `functional_requirement`).

## 4. Domain types (P0 audit; P1 will freeze)

### 4.1 PackagingGoldenProject (P1, 九州美学)

```text
type PackagingGoldenProject = {
  schemaVersion:     '1.0'         // schemaVersion field
  projectId:         string
  brandName:         '九州美学'   // canonical golden brand (P1)
  brandKey:          'jiuzhou'     // canonical id
  visualDirection:   '东方秩序 × 生物光泽'
  colorBaseline: {
    pearlWhite:     [0.65, 0.70]  // 65-70%
    mineralPurple:  [0.20, 0.25]  // 20-25%
    graphiteBlack:  [0.05, 0.10]  // 5-10%
    iridescentAccent: 'local highlight only'
  }
  motifLanguage: [
    'peacock_feather_eye',     // 羽眼椭圆
    'nine_petal_radial',       // 九瓣放射
    'feather_streamline',      // 羽毛流线
    'local_iridescence',       // 局部虹彩
    'abstract_biological_rhythm'
  ]
  forbiddenMotifs: [
    'large_area_purple',          // 大面积浓紫
    'large_area_realistic_feather',
    'club_iridescence'            // 夜店式虹彩
  ]
  referenceFirst:  true
  analysisLed:     true
  shotContracts: [
    'PKG-HERO-SINGLE',
    'PKG-SERIES-GROUP',
    'PKG-GIFT-OPEN'
  ]
  acceptanceRubric:  PackagingAcceptanceRubric
  failureTaxonomy:    PackagingFailureTaxonomy
}
```

### 4.2 PackagingAcceptanceRubric (P1, scoped for P3)

```text
type PackagingAcceptanceRubric = {
  brandFidelity:           { threshold: 0.90, axis: 'primary' }
  structureFidelity:       { threshold: 0.85, axis: 'primary' }
  visualDirectionFidelity: { threshold: 0.85, axis: 'primary' }
  compositionQuality:      { threshold: 0.80, axis: 'primary' }
  materialQuality:         { threshold: 0.80, axis: 'primary' }
  referenceFidelity:       { threshold: 0.85, axis: 'primary' }
  seriesConsistency:       { threshold: 0.80, axis: 'series-only' }
  overall:                 { threshold: 0.85, axis: 'composite' }
}
```

These thresholds come from the P1 spec; P0 records them as
intake.

### 4.3 PackagingFailureTaxonomy (P1, scoped for P3)

```text
type PackagingFailureCode =
  | 'PKG-F01'  // brand identity drift
  | 'PKG-F02'  // package structure drift
  | 'PKG-F03'  // reference fidelity failure
  | 'PKG-F04'  // visual direction drift
  | 'PKG-F05'  // color ratio failure
  | 'PKG-F06'  // motif over-literalization
  | 'PKG-F07'  // material / texture failure
  | 'PKG-F08'  // composition failure
  | 'PKG-F09'  // series consistency failure
  | 'PKG-F10'  // open-box physical logic failure
  | 'PKG-F11'  // generic advertising look
  | 'PKG-F12'  // provider / runtime failure
```

### 4.4 PackagingShotContract (P1, frozen V1 set)

```text
type PackagingShotContract =
  | 'PKG-HERO-SINGLE'  // single hero render
  | 'PKG-SERIES-GROUP' // multi-SKU / series uniform display
  | 'PKG-GIFT-OPEN'   // gift box open state / interior structure
```

## 5. Schema versioning discipline (per P0 spec)

Per the spec, all versioning uses these field names (not P0/P1/
P2/P3/P4 namespace):

```text
schemaVersion       (the payload schema)
contractVersion     (the cross-target contract)
translationVersion  (P2 Packaging Translation)
compilerVersion     (P2 Packaging Compiler)
validatorVersion    (P3 Packaging Validator)
```

P0 does not introduce any of these yet. P1 / P2 / P3 introduce
each version field at the time of its module's first commit.

## 6. Compatibility with the existing `packaging-contract.test.js`

The existing test pins:

```text
task.deliverableFamily = 'packaging'
task.subtype           = 'lid_and_base_box'
task.shot              = 'open_box'
compiledPrompt.blocks.length     = 14
compiledPrompt.preflightReport.status = 'pass'
compiledPrompt.completeness.coverage.packagingStructure = 1
finalPrompt contains '半透明盒盖' (lid)
finalPrompt does NOT contain '迎宾空间动线|天花|35mm' (no Space terms)
```

P0 confirms this test is the existing **shape** contract for
Packaging. P1 may add new sub-fields under existing blocks
without breaking the 14-block length and the preflight status.

## 7. P0-4 acceptance

- [x] 14-block contract recorded (locked source of truth: tests/golden/golden-suite.js)
- [x] Block-by-block cross-target role matrix documented
- [x] PackagingGoldenProject, AcceptanceRubric, FailureTaxonomy, ShotContract types proposed for P1
- [x] Schema versioning discipline recorded (schemaVersion / contractVersion / etc.)
- [x] Existing packaging-contract.test.js compatibility confirmed
- [x] No code change in P0
