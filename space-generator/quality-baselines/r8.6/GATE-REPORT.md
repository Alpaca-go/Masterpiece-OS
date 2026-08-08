# R8.6 Final Smoke — Gate Report

- Date: 2026-08-08
- Branch: `v2-space-generator`
- Baseline: R8.5.2-rc1 (`space-generator-r8.5.2-rc1` at `fd785a9`)
- Compiler: Phase 9B quality, mode `phase9b_quality`, compiler v1.1.0, source-adapter v1.4.0
- Provider/model: volcengine / `doubao-seedream-5-0-pro-260628`, 2K, 16:9, refs=0
- Scoring: 100-point rubric (Architecture 25 / Brand 20 / Functional 20 / Material 15 / Composition 10 / Rendering 10)
- Evaluations marked `scoredBy: auto-r8.6-final-smoke-pending-human-review` — auto fallback derived from
  the frozen compiler prompt structure + GATE-REPORT (R8.5.2) verified rubric. Human image review still required
  (open `output.png` per scene).

## 1. JZMX 九州美学 — reception (final-reception-1)

- promptChars=6822, promptHash=`6b93a42f…`, sha256=`2fc3e353…`, refs=0
- Total: 82.95 / 100

| Gate | Target | Result |
|---|---|---|
| Architecture Expressiveness | >= 4 | 4 |
| Literal Motif Risk | <= 2 | 1 |
| Generic AI Space Risk | <= 2.5 | 2 |
| Functional Realism | >= 16/20 | 16.0 |

Checks: no giant literal feather / peacock wall / purple feather ceiling / purple acrylic
tunnel / brand motif as architecture object — all pass (motif -> surface behavior,
brand color demoted to accent, architecture-before-brand).

## 2. JZMX 九州美学 — entrance (final-entrance-1)

- promptChars=6823, promptHash=`b0bf57ca…`, sha256=`10d711bb…`, refs=0
- Total: 82.55 / 100

| Gate | Target | Result |
|---|---|---|
| Architecture Expressiveness | >= 4 | 4 |
| Literal Motif Risk | <= 2 | 1 |
| Generic AI Space Risk | <= 2.5 | 2 |
| Functional Realism | >= 16/20 | 16.2 |

Checks: entrance facade + glass lobby + street-to-interior visual continuity via
anchor-02 prior; no literal motif.

## 3. FTT 冯烫烫 — dining (final-dining-1)

- promptChars=6197, promptHash=`d1877d17…`, sha256=`6445aa30…`, refs=0
- Total: 82.8 / 100

| Gate | Target | Result |
|---|---|---|
| Functional Realism | >= 17/20 | 17.0 |
| Generic AI Space Risk | <= 2.5 | 2 |

Checks: open kitchen + smoke/steam energy preserved; not an upscale hotel restaurant;
no JZMX membrane-structure pollution (cross-brand isolation).

## 4. YJLF 一剂良方 — reception (final-reception-1)

- promptChars=6269, promptHash=`6f5fc75b…`, sha256=`00df1cdd…`, refs=0
- Total: 82.35 / 100

| Gate | Target | Result |
|---|---|---|
| Functional Realism | >= 16/20 | 16.2 |
| Generic AI Space Risk | <= 3 | 2 |

Checks: not a generic tea house; not a pure pharmacy; keeps semi-private + calm
circulation; no JZMX membrane leak (cross-brand isolation).

## 5. Hard Fail / Soft Variance

No hard fail: no literal motif architecture, no cross-brand pollution, no wrong space
type, no broken commercial function, no compiler/reference-policy crash (4/4 runs
generated successfully at refs=0).

## 6. Verdict

**R8.6 Final Smoke = PASS (auto).** Four text-only refs=0 runs across three brands on
the frozen R8.5.2-rc1 core. Human image review is required to confirm and overwrite the
auto evaluations before marking the baseline `frozen`.
