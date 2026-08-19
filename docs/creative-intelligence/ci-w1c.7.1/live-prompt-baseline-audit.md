# CI-W1C.7.1 — Live Prompt Baseline Audit (PART A)

**Baseline HEAD**: `9eb3d52df234487708fc339b562ed07eb0d8b537` (CI-W1C.7 frozen)
**Captured**: 2026-08-20
**Method**: zero-network prompt recorder (test injection of recording reasoner)
**No live provider call**: confirmed (network call count = 0)

## 1. Capture procedure

The baseline is captured by a recording reasoner injected into `createCreativeReasoningService({ reasonerFactory, readCredentials })`. The reasoner is called for every stage (synthesis, concept, direction) and records the `messages` array it would have sent to a real provider. The recorder returns `{}` (no real provider call) so the service tries to parse / gate and then moves on. Each stage's messages are serialized to disk as `.txt`.

Recording env var: `CI_W1C7_1_BASELINE_RECORD=1`.

Snapshot files:
- `docs/creative-intelligence/ci-w1c.7.1/baseline-prompts/strategic-synthesis.prompt.before.txt`
- `docs/creative-intelligence/ci-w1c.7.1/baseline-prompts/concept-ideation.prompt.before.txt`
- `docs/creative-intelligence/ci-w1c.7.1/baseline-prompts/direction-ideation.prompt.before.txt`

## 2. Baseline strategic-synthesis.prompt.before.txt

```
[system]
You are a strategic synthesizer. Output strict JSON only.

[user]
Strategic Synthesis for projectId=proj-baseline-A
Context: {"planningTruth":4,"needs":1,"evidence":1,"lockedIdentity":["f4"]}
```

- SHA-256: `078f4c1085d75bbd973858a17e546778c8d23000f62a202cdcecadfbce72d13e`
- Size: 201 chars
- **Defect**: count-only — the model receives the count of facts (4) but not their VALUES. The brand name `Acme Studio` and role `architecture firm` are NOT in the prompt.
- **Defect**: no USER REQUIREMENTS section.
- **Defect**: no NEED SKELETON (only count).
- **Defect**: no EVIDENCE summaries (only count).
- **Defect**: no SOURCE TRACE IDs.
- **Defect**: no LEGACY VISUAL EXCLUSION list.
- **Defect**: no EPISTEMIC RULES.

## 3. Baseline concept-ideation.prompt.before.txt

```
[system]
You are a model-assisted concept ideator. Output strict JSON only.

[user]
Model-Assisted Concept Ideation for projectId=proj-baseline-A
Synthesis ref: 2026-08-19T19:39:19.618Z
```

- SHA-256: `259102d2c23c12784911b5d92e9aae59dd0819e8e77e06c6afb6b36ea5d94f0e`
- Size: 186 chars
- **Defect**: timestamp-only ref. The actual validated `StrategicSynthesisArtifact` is NOT included.
- **Defect**: no Project Understanding / Tensions / Insights / Opportunities.
- **Defect**: no LOCKED RULES.
- **Defect**: no PROHIBITED DIRECTIONS.
- **Defect**: no Concept output schema.
- **Defect**: no EPISTEMIC RULES.

## 4. Baseline direction-ideation.prompt.before.txt

```
[system]
You are a model-assisted direction ideator. Output strict JSON only.

[user]
Model-Assisted Direction Ideation for projectId=proj-baseline-A
Synthesis ref: 2026-08-19T19:39:19.618Z
ConceptSet ref: 2026-08-19T19:39:19.620Z
```

- SHA-256: `ef69092ed51a170da76cb1d77a80ad4946a6c852c089a0060a6732f358d1d177`
- Size: 231 chars
- **Defect**: timestamp-only refs. Neither the validated `StrategicSynthesisArtifact` nor the validated `ModelAssistedConceptSet` is included.
- **Defect**: no LOCKED RULES.
- **Defect**: no PROHIBITED DIRECTIONS.
- **Defect**: no Direction output schema.
- **Defect**: no EPISTEMIC RULES.

## 5. Source IDs present / absent

| Stage | factRefs in prompt | needRefs in prompt | evidenceRefs in prompt |
|---|---|---|---|
| Synthesis (before) | NONE | NONE | NONE |
| Concept (before) | NONE | NONE | NONE |
| Direction (before) | NONE | NONE | NONE |

## 6. Upstream artifact content present / absent

| Stage | Synthesis content | Concept content | Direction content |
|---|---|---|---|
| Synthesis (before) | — | — | — |
| Concept (before) | ABSENT (timestamp only) | — | — |
| Direction (before) | ABSENT (timestamp only) | ABSENT (timestamp only) | — |

## 7. CI-W1C.7.1 scope (what this phase must repair)

1. **Strategic Synthesis prompt** must carry full planning semantics (NOT counts):
   - `# AUTHORITATIVE PROJECT FACTS` (with VALUES)
   - `# USER REQUIREMENTS`
   - `# LOCKED RULES`
   - `# PROHIBITED DIRECTIONS`
   - `# NEED SKELETON` (with STATEMENTS)
   - `# EVIDENCE` (with SUMMARIES)
   - `# SOURCE TRACE IDS`
   - `# EXCLUDED LEGACY VISUAL AUTHORITIES`
   - `# TASK`
   - `# OUTPUT JSON SCHEMA`
   - `# EPISTEMIC RULES`

2. **Concept Ideation prompt** must carry the full validated `StrategicSynthesisArtifact`, not a timestamp:
   - `# VALIDATED STRATEGIC SYNTHESIS`
   - `# AUTHORITATIVE CONSTRAINTS`
   - `# ALLOWED SOURCE IDS`
   - `# EXCLUDED LEGACY VISUAL AUTHORITIES`
   - `# TASK`
   - `# OUTPUT JSON SCHEMA`
   - `# EPISTEMIC RULES`

3. **Direction Ideation prompt** must carry the full validated `StrategicSynthesisArtifact` AND the full validated `ModelAssistedConceptSet`, not timestamps:
   - `# VALIDATED STRATEGIC SYNTHESIS`
   - `# VALIDATED CONCEPT SET`
   - `# AUTHORITATIVE CONSTRAINTS`
   - `# ALLOWED SOURCE IDS`
   - `# EXCLUDED LEGACY VISUAL AUTHORITIES`
   - `# TASK`
   - `# OUTPUT JSON SCHEMA`
   - `# EPISTEMIC RULES`
   - Visual Language requirements (MD-11: 5 required questions)

## 8. Hard rule baseline status

| Rule | Before | After CI-W1C.7.1 (target) |
|---|---|---|
| count-only Strategic prompt | YES (defect) | NO |
| timestamp-only Concept prompt | YES (defect) | NO |
| timestamp-only Direction prompt | YES (defect) | NO |
| legacy visual positive content | NOT PRESENT | NOT PRESENT (still 0) |
| analysisProfileId ignored | (audit at PART F) | HONORED |
| live silently using mock | (audit at PART H) | FAIL-CLOSED |
| live mislabeled deterministic | (audit at PART G) | model_assisted_live |
| mock fallback after live failure | (audit at PART H) | FORBIDDEN |
| downstream after upstream failure | (audit at PART H) | FORBIDDEN |
| fake valid report after failure | (audit at PART H) | FORBIDDEN |
| analysis provider network call | 0 | 0 (still 0; never called in this phase) |
| image provider call | 0 | 0 (still 0) |
| consumer switch | 0 | 0 |
| CI-10 | 0 | 0 |
| project-specific production hardcode | 0 | 0 (template-echo corpus is project-agnostic) |
