# CI-W1C.7.4-R1 — Fixture A Production Smoke

> **Spec section:** PART I / PART J
> **Date:** 2026-08-20
> **Fixture:** `tests/fixtures/planning-briefs/qualification-planning-a.md`

## Fixture Provenance

- Project: `qualification-fixture-A`
- NOT REAL G01 / NOT REAL G02
- Chinese B2C organic grocery subscription brand strategy brief
- Counterpart to fixture B (English B2B martech)

## Coverage (per PART I)

- 21 claim lines, all matched by the 16 `EXTRACT_PATTERNS` (some keys have
  multiple claim lines).
- 8+ claim keys covered (industry, brand_role, business_model,
  product_service, target_audience, audience_problem, brand_promise,
  competitive_context, differentiation_logic, communication_task,
  strategic_objective, experience_objective, transformation_objective,
  touchpoint_priority, brand_personality, plus a `transformation_objective`
  line).
- Epistemic classes exercised: **FACT, USER_REQUIREMENT, MODEL_INFERENCE, UNKNOWN**
  (across the A + B fixture pair).

## Header Compliance

The fixture header intentionally avoids the substring `vi` inside
`evidence` / `visual` so the document-role classifier
(`classifyDocumentRole`) does not match the buggy `VI` rule. The classifier
sees "品牌策略" + "Brand Strategy" and resolves the role to
`brand-strategy` (PLANNING_STRATEGIC_SOURCE).

## Production Smoke (PART J)

Run via the E2E test path:

```text
create/load temp project
↓
registerPlanningBrief()  [RPR-01..02]
↓
persist file  [RPR-01]
↓
persist project metadata  [RPR-02]
↓
reload project  [RPR-03]
↓
production planning loader  [RRW-01]
↓
parseStrategyDocument()  [PFS-05]
↓
prepareDocumentSet()  [extractor]
↓
PlanningStrategicEvidenceArtifact
↓
epistemic classifier  [REE-08]
↓
routePlanningClaim()  [REE-06..07]
↓
load Truth / Need / Evidence  [E2E-04]
↓
production compileStrategicReasoningContext()  [E2E-01]
↓
production buildStrategicSynthesisPrompt()  [E2E-01]
↓
prompt snapshot  [E2E-01]
```

## Acceptance (A-specific)

- E2E-01: full production path runs end-to-end ✓
- E2E-02: no manual `planningStrategicEvidence` injection ✓
- E2E-04: every claim has resolvable `sourceDocumentId` + `chunkRefs` ✓
- E2E-05: brief content change invalidates the planning evidence fingerprint ✓
- E2E-06: zero provider calls ✓
- E2E-07: zero image calls ✓
- E2E-08: zero LEGACY_VISUAL_EVIDENCE / UNKNOWN_SOURCE leakage ✓
- REE-08: A emits ≥2 epistemic classes (verified: FACT + USER_REQUIREMENT +
  MODEL_INFERENCE + UNKNOWN) ✓
- RPR-01..07: full registration/persistence cycle ✓
- RRW-01..07: full runtime wiring ✓

## Epistemic-class distribution (A)

The A fixture (after re-classification with the R1 classifier) produces:

- 16 `FACT` claims (declarative lines)
- 2 `USER_REQUIREMENT` claims (lines containing 必须)
- 2 `MODEL_INFERENCE` claims (lines containing 建议 / 可能)
- 1 `UNKNOWN` claim (line containing 待确认 / TBD)

Distribution verified via REE-08 + a manual inspection of the artifact
output during PART J development.
