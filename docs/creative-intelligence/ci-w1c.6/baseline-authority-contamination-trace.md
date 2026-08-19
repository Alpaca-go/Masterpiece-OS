# CI-W1C.6 — Baseline Authority Contamination Trace

**Status: BASELINE ONLY** (production repair not yet started)
**Branch**: `feat/short-chain-simplified-ui`
**Baseline HEAD**: `e71009829bcd075d802c623a49fa42e27277f65d` (CI-W1C.5.1 frozen)
**CI-W1C.5 production repair commit**: `c9db663e` (frozen; cannot be modified)
**Spec**: `Masterpiece-OS-Creative-Intelligence-CI-W1C.6-...-Repair.md`

---

## PART A — Baseline verification

| Check | Status |
| --- | --- |
| `git status` | clean except `space-generator/.../ab-comparison-report.json` untracked smoke artifact |
| `git branch --show-current` | `feat/short-chain-simplified-ui` |
| `git rev-parse HEAD` | `e71009829bcd075d802c623a49fa42e27277f65d` |
| `git rev-parse origin/feat/short-chain-simplified-ui` | `e71009829bcd075d802c623a49fa42e27277f65d` (local == origin) |
| `git log --oneline -20` | confirms CI-W1C.5.1 + CI-W1C.5 on top of CI-W1C.4 Resume.1 chain |

Origin has advanced beyond the c9db663e reference. Actual baseline = e7100982 (CI-W1C.5.1 frozen HEAD). All later commits are:
- e7100982 (CI-W1C.5.1 test-only: NI-02..NI-07 + XD2-01..XD2-07 + final report)
- c9db663e (CI-W1C.5 production repair: VisualEvidenceContribution + Rule 9 + Concept/Direction visual anchor injection)

**Production delta for CI-W1C.6** (target): **demote legacy visual evidence to trace/evidence/risk/problem context only; no auto-promotion to positive future-style Need/Insight/Concept/Direction/Anchor**.

---

## PART A — Authority contamination trace (10 layers)

### Trace: Planning Document → Provider reference plan

| Layer | File / Function | Authority | What is leaked into the next layer |
| --- | --- | --- | --- |
| **L1** Planning Document | (project-vnext.json, project.json) | PLANNING_FACT | brandCore.brandRole, brandName, industry, assetInventory (logo/color/typography/motif/imagery/layout/material), styleBoundaries.mustAvoid, lockedAssets |
| **L2** DVC | `adaptDocumentVisualContext` | DVC carrier | (legacy DVC adapter does NOT extract brand.role; visualPreferences flattened to single string — pre-existing DVC limitation) |
| **L3** Project Truth | `assembleProjectTruth` | FACT | DVC facts + projectRecord facts (brand.name, industry, products, services, audience, businessModel, brandPersonality, visualPreferences) |
| **L4** Visual Evidence Contribution | `buildVisualEvidenceContribution` + `contributionToTruthFacts` (CI-W1C.5) | **VISUAL_SOURCE_FACT** + **MODEL_INFERENCE** | `visualAsset.{logo,color,typography,motif,imagery,layout,material}` + `visualAssetMeaning.all` per-item facts (in-memory; not persisted to truth.json) |
| **L5** Need | `deriveNeeds.ts` Rule 9 `visualAssetDifferentiationRule` (CI-W1C.5) | **NEED (differentiation, status='important', priority=2, coverageRequirement='required')** | The differentiation Need statement now contains project-specific visual descriptors: "Differentiate creative direction via project-specific visual assets: <asset> | <asset> | ... — not by generic category expression." This Need has **`coverageRequirement='required'`**, which means downstream Concept/Direction MUST cover it. **CONTAMINATION POINT #1**: legacy visual evidence becomes a required coverage target for future direction generation. |
| **L6** Insight | `derive-insights.ts` Rule 3 (differentiation) | INSIGHT (differentiation, hint='differentiation') | The differentiation Insight's `needRefs` include both the brand.role differentiation Need (Rule 5) and the visualAsset differentiation Need (Rule 9). The transitive trace resolves `visualAsset.*` facts. This is structurally OK (transitive trace is the existing contract). |
| **L7** Opportunity | `buildOpportunityMap.ts` | OPPORTUNITY | `asset-activation` opportunity (and others) — these now reach visualAsset.* facts via needRefs. **CONTAMINATION POINT #2**: opportunity is built from insights that include visualAsset Need, but the Opportunity's *statement* is still template-driven ("Asset activation territory..."), not project-specific. The visual descriptors do NOT contaminate Opportunity text yet. |
| **L8** Concept | `generate-concepts.ts` `buildConceptForOpportunity` (CI-W1C.5) | CONCEPT | **(a)** `buildConceptForOpportunity` always pulls visualAsset.* factIds into the concept's fact graph (regardless of trace path). **(b)** A "视觉锚点：<descriptors>" suffix is appended to `thesis` and `strategicMechanism` (AFTER variant 1 override so v0+v1 both carry it). **(c)** The visualAsset differentiation Need is auto-promoted into the concept's `needRefs` so the value-coverage gate does not block on MISSING_CRITICAL_NEED_COVERAGE. **CONTAMINATION POINT #3**: legacy visual descriptors appear as positive future-style anchors in Concept text (NOT as trace/evidence-only). |
| **L9** Direction | `generate-directions.ts` `buildDirectionForConcept` (CI-W1C.5) | DIRECTION | A "视觉锚点：<descriptors>" suffix is appended to `thesis`, `visualMechanism`, `systemHypothesis` of every Direction. The Concept's visual anchor is duplicated here. **CONTAMINATION POINT #4**: legacy visual descriptors appear as positive future-style anchors in Direction text. |
| **L10** Visual Canon | `build-visual-canon.ts` | VISUAL_CANON | Canon is built from the selected Direction. The selected Direction carries the visual anchor suffix, so the Canon's downstream DNA/grammar rules embed legacy visual descriptors. |
| **L11** Anchor Contract | `build-anchor-contract.ts` | ANCHOR_CONTRACT | Built from Canon + mustDemonstrate / mustPreserve / mayExplore / mustNotChange. The contract's `mustDemonstrate` etc. may carry visual anchor text. |
| **L12** AnchorProductionContract | `build-anchor-production-contract.ts` | ANCHOR_PRODUCTION_CONTRACT | Pure compiler. Carries `mustDemonstrate`, `mustPreserve`, `requiredDNARefs`, `requiredGrammarRefs`, `lockedAssetRuleRefs`. |
| **L13** compiledPrompt | `compilePromptFromContract` (anchor-production-service.ts L1068) | PROMPT (string) | **CONTAMINATION POINT #5**: The compiled prompt uses `selectedDirectionId` (an ID) but does NOT include the human-readable direction text (thesis, family, systemHypothesis, visualMechanism, compositionLogic, colorRelationship, materialRelationship, crossMediaBehavior). The required DNA/Grammar refs are opaque IDs, not semantic text. The prompt cannot be planning-first authoritative. |
| **L14** V3 source bundle | `submitAnchorGeneration` (runtime-services.ts L213) | V3_SOURCES | `sourcePreset: 'visual_analysis'` (NOT a dedicated CI anchor source preset). `deliverable: 'anchor_image'`. `purpose: 'creative_anchor'`. **CONTAMINATION POINT #6**: The V3 source bundle is built from the `visual_analysis` preset, which inherits `visual_extension` semantics. This may pass current-project visual images (logo, VI page, old poster, etc.) to the Provider through `visual_extension` reference logic. **CONTAMINATION POINT #7**: The `userIntent.prompt = compiledPrompt` is the same prompt from L13. If L13 lacks semantic text, L14's reference plan is forced to use opaque DNA/Grammar IDs, and the only "meaningful" reference available to the Provider is the current project's visual images. |
| **L15** Reference plan | (image-runtime compile/start) | PROVIDER_REFS | The reference plan is implicitly derived from the V3 source bundle. With `sourcePreset: 'visual_analysis'`, the V3 path may pass current-project visual images (logo / VI page / old poster / old packaging render / old spatial render / style_reference / structure_reference / spatial_reference) as `visual_extension` references. **CONTAMINATION POINT #8**: Legacy visual evidence / current-project visual images can become Provider references without explicit user selection. |

---

## PART A — First point where legacy visual observation becomes positive future prescription

**Layer 5 (Need derivation, Rule 9 in derive-needs.ts)**: the `visualAssetDifferentiationRule` emits a Need of type `differentiation` with `status: 'important'`, `priority: 2`, and `coverageRequirement: 'required'`. The Need statement contains project-specific visual descriptors (e.g., "九州美学主标志（紫色渐变 | 孔雀/凤凰形态 | 流线型设计 | 羽毛元素）"). This Need's `coverageRequirement: 'required'` means downstream Concept / Direction MUST cover it — effectively making legacy visual descriptors a required coverage target for future direction generation.

The semantic class: `LEGACY_VISUAL_EVIDENCE` is being promoted into `CREATIVE_DIRECTION_SOURCE` (via the required coverage target).

---

## PART A — First point where a legacy / current-project image can become a Provider reference

**Layer 14 (V3 source bundle, runtime-services.ts L215)**: `sourcePreset: 'visual_analysis'` is the source preset used for CI Anchor production. The `visual_analysis` preset is shared with non-CI image generation flows that semantically route through `visual_extension`. The V3 path's `visual_extension` semantics enumerate current-project visual images (logo / VI page / old poster / old packaging render / old spatial render) as potential references. A `style_reference` / `structure_reference` / `spatial_reference` is also a default. None of these requires an explicit `USER_SELECTED_REFERENCE` authority.

The semantic class: `LEGACY_VISUAL_EVIDENCE` (and even arbitrary `current_project_identity` images) is being treated as `USER_SELECTED_REFERENCE` (or default positive future reference) without explicit user action.

---

## Summary of contamination points

| # | Layer | Code location | Class | Severity |
| --- | --- | --- | --- | --- |
| 1 | L5 (Need) | `derive-needs.ts` Rule 9 — `coverageRequirement: 'required'` | legacy → required coverage | HIGH |
| 2 | L5 (Need) | `derive-needs.ts` Rule 9 — Need statement embeds visual descriptors | legacy → positive future style | HIGH |
| 3 | L8 (Concept) | `generate-concepts.ts` `buildConceptForOpportunity` — auto-pull visualAsset.* factIds + auto-promote visualAsset diff Need | legacy → concept trace | MEDIUM |
| 4 | L8 (Concept) | `generate-concepts.ts` — "视觉锚点：..." suffix in thesis/mechanism | legacy → positive future anchor | HIGH |
| 5 | L9 (Direction) | `generate-directions.ts` — "视觉锚点：..." suffix in thesis/visualMechanism/systemHypothesis | legacy → positive future anchor | HIGH |
| 6 | L13 (compiledPrompt) | `compilePromptFromContract` — uses direction ID + opaque DNA/Grammar IDs, not semantic text | prompt → opaque | HIGH |
| 7 | L14 (V3 source bundle) | `runtime-services.ts` L215 — `sourcePreset: 'visual_analysis'` | anchor path → visual_extension semantics | HIGH |
| 8 | L15 (reference plan) | (V3 path downstream of `visual_analysis` preset) — current-project images as default references | legacy → provider reference | CRITICAL |

---

## Authoritative architecture (target)

```
Planning Sources
  → Document Intelligence
  → Project Truth
  → Need
  → Insight
  → Opportunity
  → Concept
  → Creative Direction
  → Visual Canon
  → Anchor Contract
  → Creative Anchor Prompt        ← Planning-First (PART G)
  → Image Runtime                  ← Dedicated CI source preset (PART E)
                                     + Reference gate (PART F)
                                     + Default refs: [] or [verified locked logo]
```

Three source roles enforced throughout:
- **LOCKED_IDENTITY** — verified logo / wordmark only; auto-referenceable
- **LEGACY_VISUAL_EVIDENCE** — trace / evidence / risk / problem / comparison only
- **USER_SELECTED_REFERENCE** — positive future reference only after explicit user action

Hard rule: **LEGACY_VISUAL_EVIDENCE ≠ CREATIVE_DIRECTION_SOURCE**.

---

## Frozen surfaces (preserve)

- Document Intelligence
- DVC schema
- Truth taxonomy
- Conflict Detector
- Concept Gate critical semantics
- CI-7 Evaluation
- Selection
- Canon schema
- Anchor
- Image Runtime
- Translation
- Consumers
- CI-10 (NOT STARTED, FORBIDDEN)
- CI-W1C.5 production repair (frozen at c9db663e)
- CI-W1C.5.1 tests (frozen at e7100982)
- CI-W1A image model authority
- CI-W1C.3 RPC freshness
- CI-W2 explicit anchor approval
- CI-W1B.2 all-blocked semantics
- selection invalidation
- anchor approval invalidation
- Space/Packaging frozen consumer behavior
