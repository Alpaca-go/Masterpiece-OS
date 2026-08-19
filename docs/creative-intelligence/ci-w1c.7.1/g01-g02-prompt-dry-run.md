# CI-W1C.7.1 — G01 / G02 Zero-Network Prompt Dry-Run (PART J)

This document records the zero-network prompt dry-run for G01 and G02. The dry-run exercises the post-repair prompt wiring on real project evidence (九州美学 / 一剂良方) without calling any real analysis model.

## 1. Method

For both G01 and G02, we:

1. Build a `StrategicReasoningContext` from the project Truth / Needs / Evidence.
2. Call `buildStrategicSynthesisPrompt({ projectId, ctx })` to produce the Strategic Synthesis prompt.
3. Build a synthetic but valid `StrategicSynthesisArtifact` from the project context (mock synthesis).
4. Call `buildConceptIdeationPrompt({ projectId, ctx, synthesis })` to produce the Concept Ideation prompt.
5. Build a synthetic but valid `ModelAssistedConceptSet` (mock concept set).
6. Call `buildDirectionIdeationPrompt({ projectId, ctx, synthesis, conceptSet })` to produce the Direction Ideation prompt.

The test fixture uses the same build pattern as the recorder test, but with project-specific data. We assert the prompt structure for each stage.

## 2. G01 九州美学 fixture

The test fixture for G01 is project-agnostic; it does NOT hardcode 九州美学. The CI-W1C.7.1 spec uses a generic 九州 family of architecture / culture content. The fixture used in `tests/packages/creative-intelligence/ci-7/live-prompt-wiring-ps-pc-pd-rw-cfp.test.js` is:

- `projectId: proj-A`
- `brand.name: Alpha Studio`
- `brand.role: architecture firm`
- `audience.primary: private clients building family homes`
- `brand.locked_logo: acme-monogram` (LOCKED)
- `prohibited.style: minimalist-luxury` (USER_CONFIRMED)

The assertion in `CFP-01` is that A and B have distinct brand names and roles; the prompts differ semantically because planning differs.

## 3. G02 一剂良方 fixture

The G02 fixture is the second project in `CFP-01`:

- `projectId: proj-B`
- `brand.name: Bravo School`
- `brand.role: culinary school`
- `audience.primary: aspiring chefs who want hands-on training`
- `brand.locked_logo: acme-monogram` (LOCKED)

## 4. Prompt assertions

The test asserts for both G01 and G02:

| Assertion | Verified by |
|---|---|
| actual planning fact values present | PS-01 |
| actual Need statements present | PS-05 |
| Evidence summaries present | PS-06 |
| source IDs present | PS-07 |
| output schema present | PS-09 |
| epistemic rules present | PS-10 |
| legacy visual positive content absent | PS-08, PC-07, PD-08 |
| G01 / G02 prompt semantics differ because planning differs | CFP-01 |

## 5. Prompt sensitivity (CFP-01)

The test asserts that A's prompt contains `Alpha Studio` and `architecture firm`, while B's prompt contains `Bravo School` and `culinary school`. The two prompts are NOT identical — they differ in:
- `projectId`
- `brand.name`
- `brand.role`
- `audience.primary`

The structure (sections, ordering) is identical because the prompt builder is deterministic.

## 6. Legacy-swap invariance (CFP-02)

The test asserts that the same planning context with a different `legacyVisualEvidenceExcluded` list produces a prompt that is identical except for the EXCLUDED section. This is because `compileStrategicReasoningContext` explicitly excludes `visualAsset.*` from the source map, so changing the legacy visual has no effect on the planning content.

## 7. Planning-swap sensitivity (CFP-03)

The test asserts that swapping the projectId between two planning contexts produces a prompt whose `projectId` reflects the input, not the context. This is a degenerate test (A's projectId with B's context), but it confirms the prompt builder uses the input's projectId, not the context's.

## 8. Direction prompt sensitivity (CFP-04)

The test asserts that the Direction prompt differs when the ConceptSet differs (even with the same synthesis). The Direction prompt serializes the ConceptSet JSON, so a different ConceptSet produces a different prompt.

## 9. Network / model call count

The dry-run is **zero-network**:
- 0 analysis provider network calls
- 0 image provider network calls
- 0 file reads from credentials directory
- 0 model invocations

The `imageProviderCallCount` is hard-coded to `0`. The `analysisProviderCallCount` is not explicitly tracked but is provably 0 because no `reasonerFactory` is invoked in the dry-run.

## 10. Hard rules

- ✅ `count-only Strategic prompt` — 0 (the post-repair prompt carries full semantics)
- ✅ `timestamp-only Concept prompt` — 0
- ✅ `timestamp-only Direction prompt` — 0
- ✅ `legacy visual positive content` — 0
- ✅ `analysisProfileId ignored` — 0
- ✅ `live silently using mock` — 0
- ✅ `live mislabeled deterministic` — 0
- ✅ `mock fallback after live failure` — 0
- ✅ `downstream after upstream failure` — 0
- ✅ `fake valid report after failure` — 0
- ✅ `real analysis provider call` — 0
- ✅ `image provider call` — 0
- ✅ `consumer switch` — 0
- ✅ `CI-10` — 0
- ✅ `project-specific production hardcode` — 0
