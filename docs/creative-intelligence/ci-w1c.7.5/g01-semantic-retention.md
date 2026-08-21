# G01 — Semantic Retention Audit

> CI-W1C.7.5 PART F — 8–20 source-backed planning anchors
> tracked from Planning → Strategic → Insight → Opportunity.
> Anchors: `g01-planning-anchor-map.json` (12 anchors).

## 0. Pre-condition: planning claim extraction

The 12 anchors are SPEC-SIDE ground truth (what the planning
extraction layer SHOULD have surfaced if it understood
narrative-style brand strategy documents). The actual
extraction produced **0 claims** (see `g01-source-inventory.md`).

This means the semantic-retention chain is structurally
broken at the first hop: planning claims never enter the
prompt, so the model never has planning claim IDs to cite.
The chain from here is a no-op on the planning side; only
Truth/Need/Evidence carriers feed the model.

## 1. Anchor retention table (Planning → … → Direction)

| Anchor | Category | Source location | Planning (claim injected?) | Strategic (cited?) | Insight (cited?) | Opportunity (cited?) | Direction (produced?) | Retention score | Note |
|---|---|---|---|---|---|---|---|---|---|
| PA-G01-001 | industry | ch.1.1 市场规模 | NO (0 claims extracted) | NO (model did not surface industry) | NO | NO | NOT_RUN | 0 | dropped |
| PA-G01-002 | brand_role | ch.2 核心定位 | NO | NO (Truth has contradictory 高端医疗美容服务提供者 from prior vnext run; model did not surface brand_role either way) | NO | NO | NOT_RUN | 0 | dropped + Truth CONTRADICTS source |
| PA-G01-003 | business_model | ch.2 业务模式 | NO | NO (Truth has business.model=''; no need for clarification in synthesis) | NO | NO | NOT_RUN | 0 | dropped |
| PA-G01-004 | target_audience | ch.2 业务模式 + ch.3 | NO | NO (Truth has no target_audience) | NO | NO | NOT_RUN | 0 | dropped |
| PA-G01-005 | audience_problem | ch.2 章节小结 情感缺口 | NO | NO | NO | NO | NOT_RUN | 0 | dropped |
| PA-G01-006 | brand_promise | ch.2 品牌理念 | NO | NO | NO | NO | NOT_RUN | 0 | dropped |
| PA-G01-007 | competitive_context | ch.3 竞品品牌参考 (5 competitors × 4 categories) | NO | NO (model never surfaced 国药/上药/美械宝/京东健康/爱美客) | NO | NO | NOT_RUN | 0 | dropped |
| PA-G01-008 | differentiation_logic | ch.2 章节小结 调性 + ch.3 洞悉总结 | NO | NO (model never surfaced 科学美学/可信美学/责任美学/共情美学/成长美学/平台美学) | NO | NO | NOT_RUN | 0 | dropped |
| PA-G01-009 | strategic_objective | ch.4 愿景 | NO | NO | NO | NO | NOT_RUN | 0 | dropped |
| PA-G01-010 | brand_positioning | ch.4 品牌定位 | NO | NO | NO | NO | NOT_RUN | 0 | dropped |
| PA-G01-011 | brand_personality | ch.4 品牌印象 | NO | NO | NO | NO | NOT_RUN | 0 | dropped |
| PA-G01-012 | transformation_objective | ch.2 更名目的 | NO | NO | NO | NO | NOT_RUN | 0 | dropped |

### Retention scores

- **Planning → Strategic retention**: 0 / 12 = 0.00
  (target ≥ 0.70 — FAIL)
- **Planning → Insight retention**: 0 / 12 = 0.00
  (target ≥ 0.60 — FAIL)
- **Planning → Opportunity retention**: 0 / 12 = 0.00
  (target ≥ 0.55 — FAIL)
- **Planning → Concept retention**: NOT_RUN
  (Concept stage never executed per spec PART E.13)
- **Planning → Direction retention**: NOT_RUN
  (Direction stage never executed per spec PART E.13)

## 2. Observed chain behaviour (synthesis attempt 1)

The model did NOT explicitly reference any of the 12 anchors
because the planning brief produced 0 claim IDs to reference.
The synthesis output was structurally:

- 1 `projectUnderstanding` — generic locked-asset
  immutability summary.
- 3 `tensions[*]` — all about brand.name / locked.assets /
  locked.facts preservation. No strategic tension that
  reflects G01's actual business model or competitive
  position.
- 4 `insights[*]` — all generic locked-asset insight
  patterns.
- 3 `opportunities[*]` — generic preservation /
  differentiation opportunities.
- 0 `diagnostics`.

The model did NOT mention:
- 医美 / 医美供应链 / 医疗美容 (industry)
- B2B 资源整合 / 上下游 / B2b / 安迹 (business model /
  audience)
- 九州通集团 (parent company backing)
- 国药 / 上药 / 美械宝 / 京东健康 / 爱美客 (competitors)
- 科学美学 / 可信美学 / 共情美学 (differentiation)
- 九州美学品牌定位提案 / 道法自然 / 美在成久 (planning-doc
  vocabulary)

This is the **surface-diversity-with-strategic-collapse**
signal: if the chain had continued to Concept and Direction,
the model would have produced metaphors / visual directions,
but with no project-specific strategic grounding. Per spec
PART L.25 this is `SURFACE_DIVERSITY_WITH_STRATEGIC_COLLAPSE`
when it occurs after direction ideation; in this G01 the
synthesis gate blocked before concept, so we can only
project the failure mode forward.

## 3. Critical cross-cuts (spec PART G)

| Metric | Value | Target | Verdict |
|---|---|---|---|
| Planning claim coverage (used / eligible) | 0 / 12 (0%) | ≥ 30% (no spec target; minimum practical) | FAIL |
| Planning ref coverage (PU / T / I / O refs) | 0 / 0 / 0 / 0 (no planning input) | n/a (no input) | NOT_APPLICABLE |
| SG-01 / SG-10 / SG-11 / SG-12 final | SG-01 FAIL (21 issue blocks) | all PASS | FAIL (HF-02) |

The "planning ref coverage" row is `NOT_APPLICABLE` because
the runtime input was empty. The spec says "Do not require
100%". With 0 input there is nothing to cover, so the
metric is degenerate.

## 4. Root-cause chain

1. **Root cause (A — PLANNING_EXTRACTION)**:
   `buildPlanningStrategicEvidenceArtifact` in
   `packages/creative-intelligence/src/strategic-synthesis/build-planning-strategic-evidence.ts`
   uses a regex extractor that only matches
   `key: value` single-line patterns. The G01 source is a
   10,737-char narrative-style brand positioning proposal.
   The extractor produces 0 claims.
2. **Downstream consequence**: `PLANNING STRATEGIC EVIDENCE`
   section in the prompt is empty. The model has no
   project-specific planning authority to cite.
3. **Secondary surface (B/D)**:
   `parseSourceMap` in
   `parse-strategic-synthesis.ts:216-245` silently drops
   model-emitted object arrays via `isStringArray() == false
   → []`. Consequence: the gate's `knownNeedIds` /
   `knownEvidenceIds` are empty Sets; the model emits valid
   needRef / evidenceRef strings, but the gate cannot
   resolve them. SG-01 fires 21 times.
4. **Final outcome**: Strategic FAIL (1 base + 1 repair,
   both SG-01). Concept NOT_RUN, Direction NOT_RUN. Per
   spec PART E.13, G02 is FORBIDDEN.

## 5. Verdict (PART N)

Primary failure class: **A — PLANNING_EXTRACTION**.

Secondary contributing class: **B — PLANNING_GROUNDING**
(parser silent-drop is a grounding-wiring defect that
should not exist even if extraction is fixed).

The synthesis never reached a point where retention could
be measured across the full chain. Need impact (PART H) is
not measurable. Project specificity (PART I) is not
measurable on the planning side. Human review gate (PART J)
is not reachable.

The CI-W1C.7.5 next step per spec PART T is
**`CI-W1C.7.5-R1 — Planning Semantic Extraction &
Epistemic Classification Repair`**.

## 6. STOP

Per spec PART U: after G01, STOP. Do not run G02 until
explicit user `RELEASE_FOR_G02`. The current G01 verdict
does not support a release; the next-phase repair is
unblocking.
