# R8.5 Redirected — Stability & Generalization Gate Report

- Date: 2026-08-08
- Branch: `v2-space-generator`
- Commits: `342ee2c` (action-verb IR) → `43db914` (budget dedup) →
  `373e4c1` (brand sanitizer) → `f556805` (material/lighting color-role demotion)
- Compiler: Phase 9B quality, mode `phase9b_quality`
- Provider/model: volcengine / `doubao-seedream-5-0-pro-260628`, 2K, 16:9, refs=0
- Action-verb IR: 15 signal rules → 3 registers (strategy / form / organization)

## 1. JZMX reception stability gate (3 text-only runs)

Same compiled prompt (`promptChars=6831`, `sha256=cb46cd97…9627f`), three independent
seedream generations. Rubric 1–5 (5 best).

| Run | sha256 | Arch | Motif | Func | Brand | Color | Mat | Comm |
|---|---|---|---|---|---|---|---|---|
| reception-stab-1 | `84ea5c6a…` | 5 | 5 | 5 | 5 | 5 | 5 | 5 |
| reception-stab-2 | `a899fd67…` | 5 | 5 | 5 | 5 | 5 | 5 | 5 |
| reception-stab-3 | `d9a520f0…` | 5 | 2 | 4 | 5 | 4 | 5 | 5 |

Gate (R8.5 redirected): ≥2/3 at Arch≥4 AND Motif≥4, ≥1 at Functional≥4,
Color≥4.

- Arch/Motif ≥4: runs 1 & 2 → **2/3 PASS**
- Functional ≥4: runs 1, 2 & 3 → PASS
- Color ≥4: all runs → PASS

**Stability gate: PASS.** Run 3 produced a large wavy wall-relief behind the
desk (Motif 2/5); within variance and not a structural failure because 2/3
runs are clean. The model occasionally over-sculpts a single accent wall even
when the prompt asks for abstract surface behavior; the architecture is still
strong (Arch 5/5) and no literal peacock/feather/wing form appears.

## 2. Generalization smokes (one text-only run each)

Frozen V5 packets (`space-generator/quality-baselines/phase9b-recovered/_packets/`),
same compiler, no code change between brands.

| Brand (scene) | promptChars | Arch | Motif | Func | Brand | Color | Mat | Comm |
|---|---|---|---|---|---|---|---|---|
| FTT 冯烫烫 (lobby / 明档点餐) | 6211 | 4 | 5 | 5 | 5 | 4 | 5 | 5 |
| YJLF 一剂良方 (reception / 中医馆) | 6278 | 4 | 5 | 5 | 3 | 5 | 5 | 5 |

Generalization requirement: each brand reaches Arch≥4. **Both PASS.**

- FTT: central translucent open-kitchen pavilion, layered materials, believable
  order/pickup/dining flow; no literal cow/ox/pepper sculpture; color contained.
- YJLF: elegant translucent-screen zoning, herb-cabinet backdrop, strong
  materials. Brand 3/5 because faint circular marks/characters were rendered on
  the screen panels (in-scene identity variance). Arch/Motif/Functional/Color
  all pass; this is a rendering-variance issue already covered by the universal
  "no in-scene logo/wordmark" negative + post-composite route, not a compiler
  regression.

## 3. Production bugs found and fixed during the gate

1. **Prompt budget overrun (`43db914`)** — cross-block IR duplication pushed the
   live JZMX prompt to 7523 chars, over the Seedream 7500 hard cap. Removed
   `signatureMechanisms` from the concept block, constrained operationConstraints
   to functionalRelationships and commercialReality to positiveDifferentiators.
   Result: 7008 chars.
2. **Brand Translation motif leakage (`373e4c1`)** — raw V5 motif prose in the
   brand block overrode clean architecture IR and produced giant feather/wing
   sculptures. Deterministic `sanitizeBrandManifestation` converts motif nouns
   to surface behavior, drops identity/prose/ops/decor. Source adapter v1.3.0.
3. **Brand color as build material (`f556805`)** — V5 listed "brand-color
   acrylic/glass, role: visual focal point", so the model painted ceiling and
   partitions purple. `sanitizeMaterial/sanitizeLighting/sanitizeDifferentiators`
   demote a chromatic brand-color material/light to an accent-only role while
   leaving neutral base materials (white concrete, stainless steel, brass)
   untouched. Source adapter v1.4.0; sanitizer v1.1.0.

## 4. Verification

- `npm test`: 395/395
- `npm run desktop:test`: 265/265
- `npm run cli:test`: prior green (no CLI change in this gate)
- `verify:version-consistency`, `verify:workspace-boundaries`,
  `verify:no-obsolete-code`, `verify:production-boundaries`,
  `verify:no-project-specific-production-rules`, `verify:golden-boundary`: all PASS
- `verify:current-flows` (incl. desktop tsc): PASS, tsc clean
- Prompt budget: all prompts 6153–6831 chars, well under the 7500 Seedream cap

## 5. Verdict

**R8.5 redirected PASSES the stability + generalization gate.** The P9B-B
action-verb architecture IR generalizes across three distinct brands
(medical-aesthetics, Sichuan fast-casual, TCM clinic) without project-specific
rules, stays within the adapter prompt budget, and keeps literal motif and
brand-color surface pollution below the gate threshold.

R9 (Productionization) is unblocked, subject to the user accepting the run-3
wall-relief and YJLF screen-mark variance as within-tolerance model variance.
