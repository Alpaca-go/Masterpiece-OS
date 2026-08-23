# CI-W1C.7.2 — G01 九州美学 Live Qualification

> Date: 2026-08-20
> Phase: CI-W1C.7.2 PART F (first live API call)
> Project: G01 = 九州美学
> ProjectId: `590eadf2-76cb-4042-a034-db93481b06c9`
> Profile: `profile-9eb57f7e-7bc5-4214-b325-a013ff1f8eca` (Qwen3.6 Plus, dashscope, hasApiKey=true)

---

## 1. Result

**G01 stage 1 (Strategic Synthesis) FAILED** after 2 attempts (1 primary + 1 repair).
Stages 2 (Concept) and 3 (Direction) were **NOT_RUN** per the fail-closed policy.

| Metric | Value |
|---|---:|
| Started | 2026-08-20T04:17:02.671Z |
| Finished | 2026-08-20T04:23:16.459Z |
| Duration | 373,788 ms (~6:14) |
| analysisCalls | 2 (1 primary + 1 repair for synthesis) |
| imageCalls | 0 |
| mode | `model_assisted_live` |
| Synthesis stage | **FAIL** (attempts: 2, passed: false) |
| Concept stage | NOT_RUN |
| Direction stage | NOT_RUN |

Per CI-W1C.7.2 PART F:
> "If any stage fails twice: STOP. G02 NOT_RUN."

G02 was NOT run.

---

## 2. Per-call record

| Call | Timestamp | Latency | Input chars | Output chars | finishReason | Stage | Outcome |
|---|---|---:|---:|---:|---|---|---|
| 1 (primary) | 2026-08-20T04:20:01.077Z | 178,338 ms | 10,942 | 7,501 | `stop` | synthesis | FAIL (PARSE_JSON) |
| 2 (repair) | 2026-08-20T04:23:16.457Z | 195,377 ms | 11,165 | 10,723 | `stop` | synthesis | FAIL (PARSE_JSON) |

Total analysis tokens spent: not reported by the Qwen endpoint
(`usage: {}` in both responses; the dashscope endpoint did not
return a usage block). Latency is real and recorded.

---

## 3. Failure classification

The failure category from the spec:
> "prompt / model capability / input quality / gate / report presentation"

The actual failure cause:

```
PARSE_JSON: Strategic Synthesis response is not valid JSON:
Unexpected token '`', "```json\n{\n"... is not valid JSON
```

The **model successfully returned the artifact** (a complete
StrategicSynthesisArtifact with projectUnderstanding, 3
tensions, 4 insights, 3 opportunities, all epistemicClass=MODEL_INFERENCE,
all factRefs / needRefs / evidenceRefs pointing to real G01 IDs).

The model wraps its JSON output in markdown code fences
(` ```json ... ``` `), as is standard for chat-completions APIs.

The runtime parser (`packages/creative-intelligence/src/strategic-synthesis/parse-strategic-synthesis.ts`)
calls `JSON.parse(input.rawText)` directly on the model's raw
output, which fails when the model returns fenced JSON.

**Classification: PARSER / model-output framing (production
defect).** The prompt is correct. The model's capability is
sufficient. The input quality is correct. The gate is never
reached. The report is never compiled.

This is a **real production bug** in the existing code path that
the CI-W1C.7.1 layer did not catch (because the prompt-fingerprint
harness used a mock factory that emitted raw JSON without
fences). The bug is independent of the live qualifier.

---

## 4. What the model actually said

Both attempts returned full StrategicSynthesisArtifact-shaped
JSON. The first attempt:

```json
{
  "schemaVersion": "0.1",
  "projectId": "590eadf2-76cb-4042-a034-db93481b06c9",
  "projectUnderstanding": {
    "summary": "在核心视觉资产与Logo被严格锁定、且品牌身份与商业模式尚未明确的背景下...",
    "coreChallenge": "如何在"资产零变更"与"关键信息未决"的双重约束下...",
    "transformationGoal": "将未决变量转化为受控的创作边界...",
    "epistemicClass": "MODEL_INFERENCE",
    "factRefs": ["project_record:...:locked.facts", "project_record:...:locked.logo"],
    "needRefs": ["need:clarification:...:business.model:critical", ...],
    "evidenceRefs": ["project:...:brand_name", "project:...:industry"]
  },
  "tensions": [3 tensions, all MODEL_INFERENCE, all referencing real G01 IDs],
  "insights": [4 insights, all MODEL_INFERENCE],
  "opportunities": [3 opportunities, all referencing real G01 IDs],
  ...
}
```

Wrapped in ` ```json ... ``` ` markdown fences (which is the
chat-completions convention).

The model is responding correctly to the prompt. It identified
the real G01 context: locked assets, brand identity undecided,
Logo locked, simplified Chinese output required. The response is
project-specific (mentions the real locked.facts, the real locked
asset IDs, the real business.model uncertainty).

The fact that the model output is correct but the parser fails
is a **real production defect**, not a model issue.

---

## 5. The fix (applied in this phase)

The fix is to strip markdown code fences from the model's raw
output before parsing. This is a one-line change in 3 parsers:

- `packages/creative-intelligence/src/strategic-synthesis/parse-strategic-synthesis.ts`
- `packages/creative-intelligence/src/model-assisted/parse-model-assisted.ts`

Both are pure functions; the fix is `try { parsed = JSON.parse(stripMarkdownFences(input.rawText)); }`.

After the fix, the model output's ` ```json\n{...}\n``` ` will be
stripped to ` {...} ` and `JSON.parse` will succeed.

The fix is local and the existing `parseStrategicSynthesis` /
`parseModelAssistedConceptSet` / `parseModelAssistedDirectionSet`
contracts are unchanged.

---

## 6. Verdict for G01 (current run)

Per the spec:
> "If G01 fails: STOP. DO NOT run G02. Verdict: HOLD_FOR_CREATIVE_REASONING_REPAIR."

The current run is HOLD. After the parser fix is applied, the
service will be re-tested in mock mode (no live tokens) to confirm
the parser correctly handles fenced JSON, then the live G01
qualification will be re-run.
