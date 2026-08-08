# R8.6 Final Smoke — Gate Report

- Date: 2026-08-08
- Branch: `v2-space-generator`
- Baseline: R8.5.2-rc1 (`space-generator-r8.5.2-rc1` at `fd785a9`)
- Compiler: Phase 9B quality, mode `phase9b_quality`, compiler v1.1.0, source-adapter v1.4.0
- Provider/model: volcengine / `doubao-seedream-5-0-pro-260628`, 2K, 16:9, refs=0
- Scoring: 100-point rubric (Architecture 25 / Brand 20 / Functional 20 / Material 15 / Composition 10 / Rendering 10)
- **Status: PASS (human acceptance v1.0)** — auto fallback scores below were
  overwritten by human review (`scoredBy: human-r8.6-acceptance`); see §7.

## 1. JZMX 九州美学 — reception (final-reception-1)

- promptChars=6822, promptHash=`6b93a42f…`, sha256=`2fc3e353…`, refs=0
- Human total: **89 / 100** (JZMX_COMMERCIAL_GOLDEN_R8.6); auto 82.95

| Gate | Target | Result |
|---|---|---|
| Architecture Expressiveness | >= 4 | 4.2 |
| Literal Motif Risk | <= 2 | 1 |
| Generic AI Space Risk | <= 2.5 | 2 |
| Functional Realism | >= 16/20 | 18.0 |

Checks: no giant literal feather / peacock wall / purple feather ceiling / purple acrylic
tunnel / brand motif as architecture object — all pass (motif -> surface behavior,
brand color demoted to accent, architecture-before-brand).

## 2. JZMX 九州美学 — entrance (final-entrance-1)

- promptChars=6823, promptHash=`b0bf57ca…`, sha256=`10d711bb…`, refs=0
- Human total: **91 / 100** (JZMX_ARCHITECTURE_GOLDEN_R8.6); auto 82.55

| Gate | Target | Result |
|---|---|---|
| Architecture Expressiveness | >= 4 | 4.5 |
| Literal Motif Risk | <= 2 | 2 |
| Generic AI Space Risk | <= 2.5 | 2 |
| Functional Realism | >= 16/20 | 17.0 |

Checks: entrance facade + glass lobby + street-to-interior visual continuity via
anchor-02 prior; no literal motif.

## 3. FTT 冯烫烫 — dining (final-dining-1)

- promptChars=6197, promptHash=`d1877d17…`, sha256=`6445aa30…`, refs=0
- Human total: **86 / 100** (FTT_COMMERCIAL_GOLDEN_R8.6); auto 82.8

| Gate | Target | Result |
|---|---|---|
| Functional Realism | >= 17/20 | 18.0 |
| Generic AI Space Risk | <= 2.5 | 2 |

Checks: open kitchen + smoke/steam energy preserved; not an upscale hotel restaurant;
no JZMX membrane-structure pollution (cross-brand isolation).

## 4. YJLF 一剂良方 — reception (final-reception-1)

- promptChars=6269, promptHash=`6f5fc75b…`, sha256=`00df1cdd…`, refs=0
- Human total: **86 / 100** (YJLF_COMMERCIAL_GOLDEN_R8.6); auto 82.35

| Gate | Target | Result |
|---|---|---|
| Functional Realism | >= 16/20 | 17.0 |
| Generic AI Space Risk | <= 3 | 2 |

Checks: not a generic tea house; not a pure pharmacy; keeps semi-private + calm
circulation; no JZMX membrane leak (cross-brand isolation).

## 5. Hard Fail / Soft Variance

No hard fail: no literal motif architecture, no cross-brand pollution, no wrong space
type, no broken commercial function, no compiler/reference-policy crash (4/4 runs
generated successfully at refs=0).

## 6. Auto Verdict (superseded)

**R8.6 Final Smoke = PASS (auto).** Four text-only refs=0 runs across three brands on
the frozen R8.5.2-rc1 core. Auto evaluations were a placeholder pending human review.

## 7. Human Acceptance (v1.0)

Acceptance report: `Masterpiece-OS-R8.6-Final-Smoke-Acceptance-and-Golden-Selection-v1.0.md`

Golden selection:

| Sample | Role | Score | Verdict |
|---|---|---|---|
| JZMX-01 (entrance) | Architecture Golden | 91 | PASS |
| JZMX-02 (reception) | Commercial Golden | 89 | PASS |
| YJLF-01 (reception) | Commercial Golden | 86 | PASS |
| FTT-01 (dining) | Commercial Golden | 86 | PASS |

JZMX: architecture mechanism genuinely participates in spatial organization
(glass facade → enclosed reception → membrane ceiling → central reception →
waiting/treatment → deeper circulation); purple back to controlled accent, no
literal feather sculpture. YJLF: warm wood / herbal display / consultation·tea /
semi-private zoning preserved; no JZMX or FTT pollution. FTT: real dining
operations (open kitchen / staff / cooking / food display) preserved; no JZMX
membrane, no YJLF herb cabinet, no hotel-ification.

Final: **R8.6 Final Smoke = PASS, 4/4. Golden Baseline = FREEZE. R9 = UNLOCK.**
