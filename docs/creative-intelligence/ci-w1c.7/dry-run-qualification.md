# CI-W1C.7 — Dry-Run Qualification (PART J)

This document records the CI-W1C.7 dry-run qualification. Per the spec, the dry-run is the **zero-cost** qualification: it exercises the full Model-Assisted reasoning path on real project evidence **without calling any image provider** and **without calling any real model** (the default execution path is deterministic / mock / fixture).

## 1. What the dry-run does

The dry-run exercises:

1. **StrategicSynthesisArtifact compilation** — `compileStrategicReasoningContext` builds a planning-only source context from Project Truth + Needs + Evidence. The context explicitly excludes `visualAsset.*` and other legacy visual authorities.

2. **Strategic Synthesis parsing + grounding gate** — `parseStrategicSynthesis` + `runStrategicGroundingGate` (SG-01..10) + `validateStrategicSynthesisStructural` (STR-01..08).

3. **Model-Assisted Concept compilation + gates** — `parseModelAssistedConceptSet` + `runModelAssistedConceptGates` (MC-01..10).

4. **Model-Assisted Direction compilation + gates** — `parseModelAssistedDirectionSet` + `runModelAssistedDirectionGates` (MD-01..12) including cross-direction + cross-project collapse checks.

5. **Visual Direction Exploration Report compilation** — `compileVisualDirectionReport` + `renderVisualDirectionReportMarkdown`. The report includes Project Understanding, 3-6 Insights, 3-5 Opportunities, 3-5 Concepts, 3-4 Directions, plus a Recommendation (always `isAutoSelected: false`).

6. **Counterfactual tests** — planning-only differentiation, legacy-swap invariance, planning-swap sensitivity.

## 2. Required assertions (per spec §17/18)

| Assertion | Status |
|---|---|
| Direction trace is planning-derived | ✅ Verified by SG-01 / MC-01 / MD-01 (every factRef / opportunityRef / insightRef / needRef resolves into the synthesis set) |
| G01 / G02 differ meaningfully because planning differs | ✅ Verified by counterfactual test `10.1 planning-only differentiation` |
| Differentiation does NOT rely on old visual styles | ✅ Verified by SG-04 (no "based on the old ..." phrasing in any artifact) + MD-07 (no legacy visual positive-authority claims) |
| Prompt contains real semantic direction text | ✅ Verified by RP-06 / RP-07 (every Direction has `whyThisProject` and `differenceFromOtherDirections`) + MD-12 (visualLanguage is actionable, ≥ 80 chars across 5 fields) |
| `selectedReferences <= 1` | ✅ Verified by REF-01 / REF-02 / REF-03 (reference gate allows only zero or one verified locked identity) |
| If 1, it is verified locked identity | ✅ Verified by REF-02 |
| Legacy-only positive prompt tokens = 0 | ✅ Verified by SG-04 + MD-07 + CONTAM-01 / CONTAM-02 |
| Legacy-only Provider references = 0 | ✅ Verified by SG-04 + the source map `legacyVisualEvidenceExcluded` non-empty assertion |

Additional tests (per spec §16):

- ✅ **Planning-only counterfactual test** — `10.1 planning-only differentiation` PASS.
- ✅ **Legacy-swap invariance test** — `10.2 legacy-swap invariance` PASS.
- ✅ **Planning-swap sensitivity test** — `10.3 planning-swap sensitivity` PASS.

## 3. Image provider call count (HARD RULE)

`imageProviderCallCount` is hard-coded to `0` in `VisualDirectionExplorationReport`. The runtime service does NOT call any image provider. The dry-run is by construction zero-cost on the image provider side.

`modelCallCount` is bounded to `1` (primary) or `2` (primary + 1 repair) per stage. The mock path returns 1 in the best case; the production path can use up to 2 (spec §13: 1 primary + 1 repair per stage).

## 4. Live text qualification (DEFERRED)

The live text qualification (real model call) is **deferred**. The reasons are documented in `final-report.md`:

1. The analysis profile used in the 2310 smoke (`profile-9eb57f7e-7bc5-4214-b325-a013ff1f8eca` for G01, `profile-fa854643-4c01-43e7-8e5a-4ec52862c23b` for G02) is no longer in the credentials directory.
2. User has not yet authorized live API consumption for CI-W1C.7.
3. The current path is fully verified at the deterministic / mock / fixture level. The production code does NOT contain any hidden / hardcoded 九州美学 / 一剂良方 behavior.

When the user authorizes live text qualification:

- Re-create the analysis profile in the credentials dir.
- Run `creative-reasoning-service` with `useMock: false` and a `reasonerFactory` that returns `createDefaultAnalysisReasoner`.
- Capture artifacts at `<runRoot>/intermediate/strategic-synthesis.model-assisted.json`, `<runRoot>/intermediate/concept-set.model-assisted.json`, `<runRoot>/intermediate/direction-set.model-assisted.json`, `<runRoot>/deliverables/visual-direction-exploration-report.json`, `<runRoot>/deliverables/visual-direction-exploration-report.md`.
- Run the human rubric (Strategic Fidelity / Project Specificity / Conceptual Distinctness / Visual Discussability / Traceability / Non-Genericness, each ≥ 2, average ≥ 2.3, hard fail = 0).
- Only when both G01 / G02 pass the human rubric does the verdict become `READY_FOR_DIRECTION_REPORT_PRODUCTIZATION`.

## 5. CI-10 / CI-W1C.6.1 / consumer switch (DEFERRED)

None of the following is started in CI-W1C.7:

- ❌ `creative_intelligence` image source preset runtime activation (CI-W1C.6.1 PART E)
- ❌ V2 / V3 `creative_intelligence` source loader
- ❌ CI Anchor reference runtime gate (PART F)
- ❌ Image prompt `planningText` caller wiring (PART G)
- ❌ Image contamination runtime scanner (PART I)
- ❌ Real Anchor image smoke
- ❌ Space / Packaging consumer integration
- ❌ CI-10

The CI-W1C.7 surface is complete and tested. The runtime wiring is the only piece left. That wiring is the next phase's work, after a user authorization to begin CI-W1C.6.1.
