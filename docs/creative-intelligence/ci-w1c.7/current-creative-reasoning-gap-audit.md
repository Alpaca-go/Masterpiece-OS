# CI-W1C.7 — Current Creative Reasoning Gap Audit (PART B)

This document audits where Creative Intelligence (CI) is today (CI-W1C.6 frozen), what is already strong, and what is missing — so that the Model-Assisted Creative Reasoning layer added in CI-W1C.7 is a **strict superset**, not a rewrite.

## 1. CI package current structure

`packages/creative-intelligence/src/`:

| Sub-package | Phase | Role | Strong? | Gap to fill in CI-W1C.7 |
|---|---|---|---|---|
| `truth/` | CI-2 | Project Truth model + adapters + assembler + precedence + conflict detector | yes | none (frozen) |
| `evidence/` | CI-2 | Evidence ledger + normalizer + source index | yes | none (frozen) |
| `document-intelligence/` | CI-3 | Document Intelligence Core + adapters | yes | none (frozen) |
| `need-intelligence/` | CI-4 | Deterministic Need derivation (8 + 1 demoted Rule 9) | yes | keep as "Need skeleton" |
| `insight-intelligence/` | CI-4 | Deterministic Insight derivation (5 rules) | partial | allow MODEL_INFERENCE Strategic Insights |
| `opportunity/` | CI-4 | Opportunity Map (cluster by mechanism) | yes | keep as deterministic baseline |
| `concept-intelligence/` | CI-5 | Deterministic Concept synthesis (8 patterns) + 8-gate pipeline | partial | **add shadow Model-Assisted Concept path** |
| `direction-intelligence/` | CI-6 | Deterministic Direction synthesis (8 family templates) + 11-gate pipeline | partial | **add shadow Model-Assisted Direction path** |
| `evaluation/` | CI-7 | Direction Evaluation, Ranking, Recommendation | yes | unchanged (frozen) |
| `selection/` | CI-7 | User Selection State | yes | unchanged (frozen) |
| `visual-canon/` | CI-8 | Visual Canon, DNA, Grammar, Cross-Media | yes | unchanged (frozen) |
| `anchor-contract/` | CI-8 | Anchor Contract + leakage guard | yes | unchanged (frozen) |
| `anchor-production/` | CI-W2 | Anchor Production contract + run state | yes | unchanged (frozen) |
| `production-translation/` | CI-9 | Space + Packaging translation | yes | unchanged (frozen) |
| `integration/` | NICE | Shadow validator + report builder + NICE orchestrator | yes | extend with creativeReasoningMode |
| `visual-evidence/` | CI-W1C.5 | VisualEvidenceContribution (per-item visual facts) | yes (demoted in CI-W1C.6) | unchanged |
| `decisions/` | Core | Structured analysis validation & self-healing runtime | yes | unchanged |

**Conclusion**: The CI package has excellent **epistemic safety, traceability, and gate semantics** but the **creative reasoning depth** is template-based (8 concept patterns, 8 direction families). The 8 patterns are **system logic templates**, NOT **project-specific creative reasoning** — they substitute fields from project facts but they do not generate novel strategic interpretation.

## 2. Where the gap is most visible

### 2.1 Insight layer (`derive-insights.ts`)

The 5 deterministic insight rules output **implications of project facts** (e.g. "Identity-grounded: brand.name confirmed → brand identity must be preserved"). They are correct, grounded, and traceable.

What they are NOT:
- They do not say **why the brand's current state is strategically insufficient** (no strategic interpretation).
- They do not say **what the brand needs to transform into** (no transformation goal).
- They do not say **what specific audience tension** the brand must resolve (no tension analysis).

These are exactly the things a creative director would say in a real project kickoff: "This brand's real problem is X, the audience is stuck on Y, the transformation is Z." Today those statements come from a model OR don't come at all. The deterministic layer covers the "fact compliance" but not the "creative direction" half.

### 2.2 Concept layer (`generate-concepts.ts`)

8 strategic synthesis patterns. The output thesis is built by `tpl.systemHypothesisTpl(concept)`, where `tpl` is one of 8 fixed templates. The thesis is `tpl.thesisTpl(concept)` plus a name/audience/role substitution.

What this produces:
- All projects that hit the same template get the same sentence skeleton with only the field substitutions.
- Even with field substitution, the **strategic mechanism is fixed by the template** — the model is never consulted.
- The 8 patterns were chosen to cover known territory; for projects whose strategic mechanism is **outside the 8 patterns**, the system silently produces a wrong-but-grammatical concept.

### 2.3 Direction layer (`generate-directions.ts`)

8 DirectionFamily templates. The Direction's `thesis` is `tpl.systemHypothesisTpl(concept)`, `visualMechanism` is `tpl.visualMechanismTpl(concept)`, etc. CI-W1C.6 PART B removed the 视觉锚点 suffix; the template text is still the template text.

The cross-direction diversity check (`direction-family.ts`) verifies at least 2 structural dimensions differ. It prevents cosmetic-only diversity (color-only). It does NOT prevent **template-driven diversity that all projects get the same** — two projects with the same template will produce near-identical Direction text.

### 2.4 Evaluation layer (CI-7)

`evaluate-directions.ts` + `ranking.ts` + `recommendation.ts` produce a ranking with tradeoff analysis. This is solid. It does NOT need a model to be useful — but its input (the Direction text) is template-driven, so the recommendation ends up recommending a template.

## 3. What CI-W1C.7 adds (without removing anything)

| Layer | Current state | CI-W1C.7 addition |
|---|---|---|
| Need (CI-4) | Deterministic (Mode A baseline) | **Keep as skeleton input to CI-4B** |
| Insight (CI-4) | Deterministic (5 rules, `MODEL_INFERENCE` not yet emitted by name) | **Add `StrategicSynthesisArtifact` (CI-4B)** with `epistemicClass: 'MODEL_INFERENCE'` for strategic interpretations, validated by `Strategic Grounding Gate` (SG-01..10) |
| Concept (CI-5) | Deterministic (8 patterns, 8-gate pipeline) | **Add shadow Model-Assisted Concept path (CI-5B)** with `epistemicClass: 'CREATIVE_HYPOTHESIS'`, validated by MC-01..10 (template echo, project specificity, cross-project contamination, locked conflict, etc.) |
| Direction (CI-6) | Deterministic (8 family templates, 11-gate pipeline) | **Add shadow Model-Assisted Direction path (CI-6B)** validated by MD-01..12 (template echo, cross-direction collapse, cross-project semantic collapse, legacy visual contamination, prohibited direction violation, etc.) |
| Evaluation (CI-7) | Existing ranking + recommendation | **Unchanged**. The shadow DirectionSet can be fed into the same evaluator |
| Selection (CI-7) | User selection | **Unchanged**. Recommendation still does NOT auto-select. Shadow outputs are advisory. |
| Reporting (CI-W1C.7) | — | **New `Visual Direction Exploration Report` compiler** producing `.json` + `.md` |

## 4. What CI-W1C.7 explicitly does NOT do

- **No image generation provider call** (CI-W1C.6 image runtime activation stays deferred)
- **No CI-7 Recommendation auto-promoted to Selection** (frozen)
- **No deterministic CI-4 / 5 / 6 deletion** (kept as Mode A baseline / shadow comparison)
- **No CI-W1C.6 demotion reversal** (legacy visual evidence stays `type='preservation'`)
- **No CI-10** (consumer switch NOT STARTED)
- **No project-specific production hardcode** (G01/G02 fixtures in tests only; production rules must be project-agnostic)
- **No more than 1 primary + 1 repair per stage** (no infinite repair loop)
- **No hardcoded 九州美学 / 一剂良方 tokens in production rules** (test fixtures only)

## 5. Provider boundary

The CI package must NOT directly read credentials or call provider HTTP. The boundary is:

```
[CI package]            <-- pure functions, contracts, validators, gates
[creative-reasoning-service]   <-- runtime-core, resolves credentials, calls reasoner
[model-runtime/analysis-provider-registry]   <-- existing analysis reasoner factory
[analysis provider (e.g. dashscope + qwen3.6-plus)]   <-- existing
```

Existing reference patterns in `runtime-core/src/application/`:
- `creative-direction-service.ts` uses `createDefaultAnalysisReasoner` from `@masterpiece/model-runtime/analysis-provider-registry.js` and runs a 1 primary + 1 repair loop
- `creative-reading-service.ts` same pattern
- `deliverable-validator-service.ts` same pattern
- `similarity-audit-service.ts` same pattern

The new `creative-reasoning-service.ts` follows this same pattern: inject `reasonerFactory` and `readCredentials` for test seam, default to `createDefaultAnalysisReasoner` in production.

## 6. Summary

CI-W1C.7 is **a strict superset**: it adds three Model-Assisted reasoning layers (CI-4B, CI-5B, CI-6B) on top of the existing deterministic CI-4 / 5 / 6 baseline. It adds a creative-reporting layer. It does NOT delete or replace any frozen surface. It does NOT call any image provider. It does NOT promote Recommendation to Selection. It does NOT add a new provider stack.

The first execution must be **deterministic / mock / fixture only**. The path to `READY_FOR_MODEL_ASSISTED_TEXT_QUALIFICATION` requires:
- 0 image provider calls
- All deterministic / mock / fixture tests PASS
- All regression tests PASS (no new failures, no worsened failures)
- A separate user authorization for live analysis-model API consumption
