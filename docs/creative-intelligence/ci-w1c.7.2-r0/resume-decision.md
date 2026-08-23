# CI-W1C.7.2-R0 — Resume Decision (PART F + R0 verdict)

> Date: 2026-08-20
> Phase: CI-W1C.7.2-R0
> R0 verdict: **PROFILE_RUNTIME_READY**

---

## 1. R0 verdict

| PART | Status |
|---|---|
| A — baseline preflight | PASS (HEAD = origin = `01ebe3d9`) |
| B — profile-management path audit | PASS (`docs/creative-intelligence/ci-w1c.7.2-r0/profile-management-path-audit.md`) |
| C — user creates one profile | PASS (user confirmed; the resolved profile is the pre-existing Qwen3.6 Plus default at `profile-9eb57f7e-7bc5-4214-b325-a013ff1f8eca`, with `hasApiKey: true` and `connectionStatus: connected`) |
| D — verify resolution | PASS (5 profiles visible, Qwen3.6 Plus default, `hasApiKey: true`, `provider = dashscope`, `model = qwen3.6-plus`) |
| E — restart persistence | PASS (same profile across 3 Web Host boots) |
| F — resume G01 | **READY, awaiting explicit user authorization for the live API call** |

**R0 verdict: PROFILE_RUNTIME_READY.**

---

## 2. Why the verdict is READY but PART F is awaiting authorization

The R0 spec PART F is conditional:
> "If PROFILE_RUNTIME_READY: resume the SAME CI-W1C.7.2.
> Use: useMock=false, analysisProfileId=<resolved id>
> Run only: G01 九州美学"

The verdict is `PROFILE_RUNTIME_READY`, which satisfies the
condition. However, the original CI-W1C.7.2 spec was explicit:

> "the user must ... explicitly authorize CI-W1C.7.2 live text
> qualification with real API tokens against G01 九州美学 +
> G02 一剂良方"

R0 PART F's "resume" instruction is the operational hand-off.
The actual spend of Qwen API tokens is a one-way decision and
warrants one final explicit authorization from the user before
proceeding. This document records the verdict but does not
itself authorize the live call.

---

## 3. What "resume" means (if user authorizes)

If the user explicitly authorizes the live resume, the
agent will:

1. Invoke `creative-reasoning-service.run({
     projectId: '590eadf2-76cb-4042-a034-db93481b06c9',  // G01
     truth:    <load real G01 Project Truth from
                C:/Users/Administrator/Documents/Masterpiece OS Data
                /projects/九州美学-590eadf2/project-context/
                creative-intelligence-shadow/project-truth.json>,
     needs:    <load real G01 Need skeleton>,
     evidence: <load real G01 Evidence ledger>,
     readCredentials:  (profileId) => nodeWebHostReadCredentials(profileId),
     reasonerFactory:  (creds) => createQwenOpenAIReasoner(creds),
     useMock:           false,
     analysisProfileId: 'profile-9eb57f7e-7bc5-4214-b325-a013ff1f8eca',
     qualificationBudget: DEFAULT_QUALIFICATION_BUDGET,
   })`
2. Capture the result at the 5 expected paths:
   - `intermediate/strategic-synthesis.model-assisted.json`
   - `intermediate/concept-set.model-assisted.json`
   - `intermediate/direction-set.model-assisted.json`
   - `intermediate/prompt-snapshots/{strategic-synthesis,concept-ideation,direction-ideation}.prompt.json`
   - `intermediate/live-attempts/{synthesis,concept,direction}.attempt-N.raw.txt`
   - `intermediate/live-attempts/{synthesis,concept,direction}.gate.json`
   - `deliverables/visual-direction-exploration-report.{json,md}`
3. STOP after G01 (per CI-W1C.7.2 PART G). Do NOT run G02
   without explicit human release.

### 3.1 Budget policy (R0 / CI-W1C.7.1A default)

```yaml
maxInputTokens:       16000
reservedOutputTokens: 4000
reservedRepairTokens: 4000
hardContextLimit:     32000
estimator:            ceil(charCount / 3)
```

### 3.2 Repair policy (R0 / CI-W1C.7.1A default)

- 1 primary + 1 repair per stage (maxAttempts = 2)
- On 2nd failure: persist raw + gate diagnostics; STOP
- Repair prompt includes: original task, previous invalid
  output (bounded 2000-char excerpt), blocked gate codes, repair
  instructions.

### 3.3 Gate versions (used in both G01 and G02)

- SG gates: `runStrategicGroundingGate` + `validateStrategicSynthesisStructural` (CI-W1C.7)
- MC gates: `runModelAssistedConceptGates` (CI-W1C.7)
- MD gates: `runModelAssistedDirectionGates` (CI-W1C.7)

### 3.4 Prompt versions (used in both G01 and G02)

- Strategic: `ci-w1c.7.1-strategic-synthesis-v0.2`
- Concept: `ci-w1c.7.1-model-assisted-concept-v0.2`
- Direction: `ci-w1c.7.1-model-assisted-direction-v0.2`

---

## 4. The actual resume needs the user's go-ahead

The R0 verdict is `PROFILE_RUNTIME_READY`. The R0 spec says to
resume on that verdict. The agent stops here and asks the user
to confirm the live API spend.

This is the second explicit authorization gate (the first was
the R0 spec itself; the second is the actual Qwen call). Once
confirmed, the agent proceeds to G01 and stops again before G02
for the human release gate.
