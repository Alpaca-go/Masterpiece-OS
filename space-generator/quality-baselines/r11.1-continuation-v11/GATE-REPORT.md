# R11.1 v1.1 Continuation — Real Provider Smoke (GATE-REPORT)

- Date: 2026-08-09
- Compiler: `r8_6_golden` (frozen, `phase9b-quality-compiler` v1.1.0)
- Provider / Model: volcengine / `doubao-seedream-5-0-pro-260628`, 2K, 16:9
- Basis: `continuation` (reference_assisted, referenceRole=world_consistency,
  confirmed_generated_output, refs=1)
- Revision: v1.1 (after first smoke: scene transformation was too weak; this
  revision adds a Target Functional Program that overrides the source program
  and a Preserve / Regenerate boundary)
- Artifacts: `space-generator/quality-baselines/r11.1-continuation-v11/`

## 1. Runs (2 brands)

| Brand | source → target | refs | refRole | promptChars | sha256 |
|---|---|---|---|---|---|
| 九州美学 | reception → consultation | 1 | world_consistency | 7411 | `b6322f8f…` |
| 冯烫烫 | dining → entrance | 1 | world_consistency | 6803 | `f2014770…` |

Both prompts carry the v1.1 `continuation_intent` block: reference role
WORLD-CONSISTENCY only, an explicit REGENERATE directive, the target
functional program (consultation: 咨询桌/半私密边界/更小尺度; entrance:
storefront/threshold/arrival sequence), and "Do not carry over from source"
drop rules (JZMX: 大型公共接待台/Lobby; FTT: 中央开放厨房/堂食大厅). No
negative-prompt bans (no "no reception desk / no kitchen").

## 2. Acceptance (R11.1 §41)

| Metric | Gate | Engineering evidence |
|---|---|---|
| World Consistency | >= 4 | Same brand packet + same frozen compiler + preserve list |
| Scene Differentiation | >= 4 | Target Functional Program overrides source program + REGENERATE directive |
| Functional Realism | >= 4 | Target scene subtype registered; target program in prompt |
| Reference Alignment | >= 4 | refs=1 confirmed_generated_output, world-consistency role |
| Copy Risk | <= 2 | REGENERATE + drop rules in prompt; reference is world-only |

## 3. Verdict

**R11.1 v1.1 continuation real-provider smoke = PASS (engineering).** 2/2 runs
generated successfully through the v1.1 contract; the prompts now explicitly
regenerate the target program rather than preserving the source layout.
Human visual review of the 2 output.png is required to finalize
(scene differentiation: is consultation really a smaller private room, is the
entrance really an entrance, not a dining-lobby re-render?).
