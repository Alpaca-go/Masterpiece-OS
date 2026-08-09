# R11.1 Continuation — Real Provider Smoke (GATE-REPORT)

- Date: 2026-08-09
- Compiler: `r8_6_golden` (frozen, `phase9b-quality-compiler` v1.1.0)
- Provider / Model: volcengine / `doubao-seedream-5-0-pro-260628`, 2K, 16:9
- Basis: `continuation` (reference_assisted, confirmed_generated_output, refs=1)
- Source images: R10.4.1 post-repair accepted Standard outputs (confirmed)
- Artifacts: `space-generator/quality-baselines/r11.1-continuation/`

## 1. Runs (2 brands)

| Brand | source → target | refs | refSource | promptChars | sha256 |
|---|---|---|---|---|---|
| 九州美学 | reception → consultation | 1 | confirmed_generated_output | 7117 | `42d29d9f…` |
| 冯烫烫 | dining → entrance | 1 | confirmed_generated_output | 6467 | `995d92f7…` |

Both runs: `r8_6_golden`, prompt contains the `continuation_intent` block right
after Task (before Spatial Intent), `referenceMode=reference_assisted`, and the
spaceGeneration trace records the continuation lineage (sourceRunId /
sourceScene / targetScene / confirmedAt / confirmationSource=user_explicit /
referenceSource=confirmed_generated_output / parentRunId).

## 2. Acceptance focus (R11 §57-§58)

| Metric | Gate | Engineering evidence |
|---|---|---|
| World Consistency | >= 4 | Same brand packet + same frozen compiler + same spatial grammar preserved |
| Scene Differentiation | >= 4 | targetScene changed functional program (reception→consultation, dining→entrance) |
| Functional Realism | >= 4 | target scene subtype registered; functional blocks intact |
| Reference Alignment | >= 4 | refs=1 confirmed_generated_output passed to provider payload |
| Copy Risk | <= 2 | Continuation Intent instructs "do not copy source composition" |

## 3. Verdict

**R11.1 continuation real-provider smoke = PASS (engineering).** 2/2 runs
generated successfully through the continuation contract; confirmation /
reference binding / route integrity / trace lineage all green. Human visual
review of the 2 output.png is required to finalize (world consistency, scene
differentiation, no 1:1 copy).
