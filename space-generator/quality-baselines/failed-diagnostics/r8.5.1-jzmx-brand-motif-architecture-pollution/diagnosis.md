# Diagnosis: R8.5.1 JZMX reception Mode T — Brand Motif → Architecture IR Pollution

**Status**: `failed_diagnostic`  
**Failure type**: `brand_motif_architecture_pollution`  
**Reference count**: 0 (text-only)  
**Mode**: `R8.5_MODE_T` (text-only architecture expressiveness smoke)  
**Date**: 2026-08-08

## Symptom

The R8.5 Mode T first reception smoke (single JZMX reception prompt, refs=0)
returned a high-quality commercial interior with the architecture expressiveness
score raised relative to R8 baseline. However, the image was dominated by
**giant feather / peacock motif as a focal wall** and **purple as a ceiling
geometry generator** — the model had re-instated the brand symbol as literal
architecture, which is exactly the failure mode R8.5 was meant to prevent.

This is **not** "no progress" — it is the *opposite* of progress: the model
appeared more architectural because the brand motif was being rendered as a
large sculptural form, not because the spatial language itself was stronger.

## Root cause (audit-driven, not guessed)

Before the R8.5.1 fix, the Phase 9B space compiler passed these raw V5 fields
through to architecture blocks:

| V5 source path | Raw text | Where it rendered | Why it polluted |
|---|---|---|---|
| `mediaTranslations.spatial.signatureSpatialMechanism[0]` | `流畅的曲线墙面或隔断，模拟羽毛的层叠与包裹感` | `spatial_intent` / `architecture_language` / `architectural_concept` | The phrase names a literal motif (feather) as the spatial action generator. |
| `mediaTranslations.spatial.signatureSpatialMechanism[2]` | `从入口到诊疗室的渐变色彩过渡（白->浅紫->深紫）` | `spatial_intent` / `architecture_language` / `architectural_concept` | Color is the geometry-action generator; classic `COLOR_GEOMETRY_COUPLING_RISK`. |
| `mediaTranslations.spatial.spatialConcept` | `翎羽之境 (Realm of Feathers) - 沉浸式美学空间` | `spatial_intent.Experience Goal` / `architectural_concept.primary` | Brand-poetic title becomes the architecture concept's identity. |
| `mediaTranslations.spatial.mustBeVisible[1]` | `抽象羽毛纹理的墙面或屏风` | `functional_requirement.Must Be Visible` | Literal motif as in-frame "must be visible" item. |
| `creativeDecision.uniqueUpgradeThesis` | long poetic paragraph invoking 孔雀 / 羽毛 / 紫 / 雕塑 | `_raw` / also leaks via classifier into `architectureSemantics` | Brand narrative masquerading as architecture. |

The audit output (see `mechanism-source-audit.json` / `mechanism-source-audit.md`)
records every one of these in `provenance.motifInArchitectureIr` and flags
1 `color_geometry` coupling risk.

## Fix (R8.5.1, this commit)

1. Compiler-time semantic separation:
   - `semantic/separate-space-semantics.js` — classifies each raw V5 phrase
     into `architectural | brand_motif | ambiguous | color_accent | color_geometry | functional | decorative_identity`.
   - `semantic/normalize-architecture-semantics.js` — for `ambiguous` /
     `color_geometry` phrases, strip the literal motif/color form generator
     while preserving the abstract spatial property (recovery doc §11).
   - `semantic/mechanism-provenance.js` — produces a per-item trace:
     `{ id, sourceField, sourcePath, sourceRawText, classification, normalizedText, strip, includedInArchitecturePrompt }`.
   - `semantic/compile-spatial-mechanisms.js` — assembles the architecture
     IR and the brand IR as separate streams.
2. Source adapter (`phase9b-source-adapter.js`, version `1.1.0`) now
   consumes the architecture IR for `spatialStrategy`,
   `architecturalCharacteristics`, and `architecturalConcept.signatureMechanisms`.
   The `signatureSpatialMechanism` raw field is no longer used to render
   architecture blocks. `architecturalConcept.primary` and
   `experienceGoal` are passed through `normalizeConceptPrimary` which
   strips a leading brand-poetic title (e.g. "翎羽之境 (Realm of Feathers)")
   so the architecture concept identity is the architectural direction
   rather than the brand symbol.
3. Universal, brand-generic negative added to `BASE_NEGATIVES`:
   > "do not convert brand symbols, brand mascots, graphic motifs, or any
   > animal/feather/floral decoration into literal architectural structures
   > (no motif-shaped focal wall, ceiling, or sculpture)".
   This is the only P4 fallback (recovery doc §25); it is brand-generic
   (no "no peacock", no "no purple", no project hardcode) and is enabled
   unconditionally.
4. `blockSource` map updated in the compiler trace so the field-to-block
   relationships reflect the post-fix wiring.
5. Failed diagnostic saved here. R8 baseline (and the text-only smoke
   at `r85-text-only-smokes/.../reception-v1/`) are not overwritten.

## What this fix does NOT do

- It does not add `no feather` / `no peacock` / `no purple` (forbidden
  per doc §2 / §25).
- It does not change the V5 schema, the V5 analysis, or the
  ProjectGenerationContract.
- It does not modify production code paths deep in
  `space-generator/v1-experimental/`.
- It does not call an LLM during classification or normalization.
- It does not increase prompt length: R8.5.1 fixed prompt on this packet
  is 5532 chars vs 5956 chars for the failed smoke (-7.1%, well under
  the +5% budget cap in doc §22).

## Reception smoke re-run criteria

After this fix, the next R8.5.1 reception smoke must satisfy all of:
- Architecture Expressiveness >= 4
- Literal Motif Risk <= 2
- Generic AI Space Risk <= 2
- No "giant feather focal wall"
- No "purple-as-geometry dominant ceiling"
- No literal peacock spatial structure
- Prompt length <= failed prompt length + 5%
- Functional Realism within -5% of R8 baseline

If it fails, the audit re-runs; the JZMX 9-image batch does not start.

## Files in this diagnostic

- `output.png` — failed R8.5 Mode T reception image (reproduced from `r85-text-only-smokes/jiuzhou-aesthetics/reception-v1/output.png`).
- `run.json` — Seedream run record.
- `prompt.md` — exact prompt that produced the image.
- `provider-payload.json` — provider request payload (redacted).
- `mechanism-source-audit.json` / `.md` — full per-item provenance audit.
- `diagnosis.md` — this file.
