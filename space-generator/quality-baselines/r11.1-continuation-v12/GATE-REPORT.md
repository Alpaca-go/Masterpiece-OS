# R11.1 v1.2 Continuation — JZMX Reception → Consultation Smoke

- Date: 2026-08-09
- Compiler: `r8_6_golden` (frozen, `phase9b-quality-compiler` v1.1.0)
- Provider / Model: volcengine / `doubao-seedream-5-0-pro-260628`, 2K, 16:9
- Basis: `continuation` (reference_assisted, referenceRole=world_consistency,
  confirmed_generated_output, refs=1)
- Revision: v1.2 — Source Program Leakage fix (override layer + leakage gate)
- Artifacts: `space-generator/quality-baselines/r11.1-continuation-v12/`

## 1. Run

| Brand | source → target | refs | refRole | promptChars | sha256 |
|---|---|---|---|---|---|
| 九州美学 | reception → consultation | 1 | world_consistency | 7230 | `3d4690bd…` |

## 2. Final Prompt Preflight (R11.1 v1.2 §48)

Checked the compiled prompt AFTER the Continuation Intent block:

| Phrase | Must be absent | Result |
|---|---|---|
| 接待台正对入口 | absent | ✓ absent |
| 大型公共接待 | absent (as hard req) | only in intent drop list |
| 前厅式迎宾 | absent (as hard req) | only in intent drop list |
| entrance_view | absent | ✓ absent |
| 迎宾 / 治疗 / 术后休憩 as one-image program | absent | ✓ absent |

The Architecture-Function Bridge, Functional Requirement and Composition
blocks now carry only the TARGET consultation program (咨询桌 / 2–3 人座位 /
半私密边界 / 人尺度), the source reception hard constraints are filtered, and
the view strategy is `human_scale_consultation_view` (not entrance_view).
`sourceProgramLeakageGate: pass` recorded in trace.

## 3. Acceptance (R11.1 §49)

| Metric | Gate | Engineering evidence |
|---|---|---|
| World Consistency | >= 4 | Same brand packet + same frozen compiler + preserve list |
| Scene Differentiation | >= 4 | Target program overrides source; view = human_scale_consultation_view |
| Functional Realism | >= 4 | Target consultation program in functional blocks |
| Reference Alignment | >= 4 | refs=1 confirmed_generated_output, semanticRole=world_consistency |
| Copy Risk | <= 2 | Leakage gate pass; source layout/composition suppressed |

## 4. Artifact set (R11.1 §38)

manifest.json / run.json / trace.json / reference-trace.json /
continuation-contract.json / target-functional-program.json / compiled-prompt.md
(prompt.md) / provider-payload.redacted.json / output.png — all present.

## 5. Verdict

**R11.1 v1.2 JZMX consultation continuation smoke = PASS (engineering).** The
source program no longer re-leaks into the high-weight blocks; target view
strategy is applied; the leakage gate passes fail-closed. Human visual review
of the output.png is required to finalize: consultation must read as a smaller,
more private 1-to-1 consultation room (not a medical-aesthetic lobby with a
consultation desk).
