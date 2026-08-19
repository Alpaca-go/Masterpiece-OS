# CI-W1C.7.1 — Prompt Context Wiring Audit (PART B / C / D / F)

This document audits the prompt wiring repair added in CI-W1C.7.1. The defect found in CI-W1C.7 was that the runtime compressed the planning context into a count-only `ctxSummary` before sending the prompt. CI-W1C.7.1 replaces this with deterministic prompt builders that serialize the full Planning-First semantic authority.

## 1. Three prompt builders

CI-W1C.7.1 adds three pure prompt builders (no IO, no model call, no credentials):

| Builder | File | Output |
|---|---|---|
| `buildStrategicSynthesisPrompt` | `packages/creative-intelligence/src/strategic-synthesis/build-strategic-synthesis-prompt.ts` | Strategic Synthesis stage prompt |
| `buildConceptIdeationPrompt` | `packages/creative-intelligence/src/model-assisted/build-concept-ideation-prompt.ts` | Concept Ideation stage prompt |
| `buildDirectionIdeationPrompt` | `packages/creative-intelligence/src/model-assisted/build-direction-ideation-prompt.ts` | Direction Ideation stage prompt |

Each builder is a pure function: same input → same prompt. The output has a `promptVersion`, `systemMessage`, `userMessage`, `inputFingerprint`, and `size` diagnostics.

## 2. Strategic Synthesis prompt structure (PART B)

The user message contains the following sections (per spec §12 / PS tests):

- `# PROJECT` — `projectId: <id>`
- `# AUTHORITATIVE PROJECT FACTS` — each fact exposes `id`, `key`, `value`, `authority`
- `# USER REQUIREMENTS` — explicit `user.requirement*` facts (separated from generic planning facts)
- `# LOCKED RULES` — `LOCKED` authority facts
- `# PROHIBITED DIRECTIONS` — `prohibited.*` / `style.prohibited` facts
- `# NEED SKELETON` — each need exposes `id`, `type`, `coverage`, `statement`, `factRefs`
- `# EVIDENCE` — each evidence item exposes `id`, `sourceKind`, `confidence`, `summary`, `factRefs`
- `# SOURCE TRACE IDs` — `facts: [...]`, `needs: [...]`, `evidence: [...]`
- `# EXCLUDED LEGACY VISUAL AUTHORITIES` — the spec minimum set
- `# TASK` — explicit task description
- `# OUTPUT JSON SCHEMA` — `schemaVersion`, `projectId`, epistemic class
- `# EPISTEMIC RULES` — 9 explicit rules

## 3. Concept Ideation prompt structure (PART C)

The user message contains:

- `# VALIDATED STRATEGIC SYNTHESIS` — the full validated synthesis JSON (not a timestamp ref)
- `# AUTHORITATIVE CONSTRAINTS`
  - `## LOCKED RULES`
  - `## PROHIBITED DIRECTIONS`
- `# ALLOWED SOURCE IDS` — opportunity / insight / tension / fact IDs
- `# EXCLUDED LEGACY VISUAL AUTHORITIES` — the spec minimum set
- `# TASK` — explicit task description
- `# OUTPUT JSON SCHEMA` — `schemaVersion`, `projectId`, `CREATIVE_HYPOTHESIS`
- `# EPISTEMIC RULES` — 7 explicit rules

## 4. Direction Ideation prompt structure (PART D)

The user message contains:

- `# VALIDATED STRATEGIC SYNTHESIS` — the full validated synthesis JSON
- `# VALIDATED CONCEPT SET` — the full validated ConceptSet JSON
- `# AUTHORITATIVE CONSTRAINTS`
  - `## LOCKED RULES`
  - `## PROHIBITED DIRECTIONS`
- `# ALLOWED SOURCE IDS` — concept / opportunity / insight / fact IDs
- `# EXCLUDED LEGACY VISUAL AUTHORITIES` — the spec minimum set
- `# VISUAL LANGUAGE REQUIREMENTS (MD-11)` — 5 required questions
- `# TASK` — explicit task description
- `# OUTPUT JSON SCHEMA` — `schemaVersion`, `projectId`, `CREATIVE_HYPOTHESIS`
- `# EPISTEMIC RULES` — 9 explicit rules

## 5. Old vs new prompt snapshot

The baseline snapshots (CI-W1C.7) and the post-repair snapshots (CI-W1C.7.1) are at:

- `docs/creative-intelligence/ci-w1c.7.1/baseline-prompts/strategic-synthesis.prompt.before.txt` (201 chars, count-only)
- `docs/creative-intelligence/ci-w1c.7.1/baseline-prompts/strategic-synthesis.prompt.after.txt` (3840 chars, full planning semantics)
- `docs/creative-intelligence/ci-w1c.7.1/baseline-prompts/concept-ideation.prompt.before.txt` (186 chars, timestamp-only)
- `docs/creative-intelligence/ci-w1c.7.1/baseline-prompts/concept-ideation.prompt.after.txt` (5789 chars, full synthesis + constraints)
- `docs/creative-intelligence/ci-w1c.7.1/baseline-prompts/direction-ideation.prompt.before.txt` (231 chars, two timestamps)
- `docs/creative-intelligence/ci-w1c.7.1/baseline-prompts/direction-ideation.prompt.after.txt` (9345 chars, full synthesis + ConceptSet + constraints)

## 6. Hard rules verified

- ✅ Count-only Strategic prompt — REPLACED with full planning semantics.
- ✅ Timestamp-only Concept prompt — REPLACED with full synthesis JSON.
- ✅ Timestamp-only Direction prompt — REPLACED with full synthesis + ConceptSet.
- ✅ Legacy visual positive content — still 0; the `# EXCLUDED LEGACY VISUAL AUTHORITIES` section is preserved in every prompt.

## 7. Source ID policy

Every `factRef` / `needRef` / `evidenceRef` / `conceptRef` / `opportunityRef` / `insightRef` that the model may cite must appear in the `# SOURCE TRACE IDS` (synthesis) or `# ALLOWED SOURCE IDS` (concept / direction) section. The grounding gate (SG-01 / MC-01 / MD-01) asserts this on every artifact.

## 8. Prompt fingerprint policy

Each builder computes a stable `inputFingerprint` based on the input's deterministic fields (projectId, factCount, needCount, evidenceCount, etc.). The fingerprint is persisted in the prompt snapshot.

## 9. Prompt size control

The builders do NOT dump the raw planning document. They select only the safe fields:
- Facts: `id`, `key`, `value`, `authority`
- Needs: `id`, `type`, `coverage`, `statement`, `factRefs`
- Evidence: `id`, `sourceKind`, `confidence`, `summary`, `factRefs`

`visualAsset.*` facts (legacy visual evidence) are NOT serialized as positive content.

The `size` diagnostics include `characterCount`, `sectionCount`, `factCount`, `needCount`, `evidenceCount` so the caller can monitor prompt size. If the prompt exceeds a safe threshold, the caller can add a diagnostic and stop (rather than substring-slicing). CI-W1C.7.1 does not enforce a hard size limit because the spec leaves the threshold to the follow-up phase.

## 10. analysisProfileId wiring (PART F)

The runtime service honors `input.analysisProfileId`:

- `readCredentials(input.analysisProfileId)` is called (not `readCredentials()`).
- The result is logged in the stage's `meta` for audit.

Tests:
- ✅ `RW-01: analysisProfileId is forwarded to readCredentials`
- ✅ `RW-07: provider / model metadata is preserved in the result`
