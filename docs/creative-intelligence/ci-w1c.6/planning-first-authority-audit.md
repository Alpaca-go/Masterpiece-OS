# CI-W1C.6 — Planning-First Authority Audit

**Status: HOLD_FOR_AUTHORITY_REPAIR** (partial repair in place; PART E + PART F require V2 path changes that are out of scope for a single phase)
**Branch**: `feat/short-chain-simplified-ui`
**Baseline**: `e7100982` (CI-W1C.5.1 frozen)
**Final HEAD**: (uncommitted; in-progress)
**Spec**: `Masterpiece-OS-Creative-Intelligence-CI-W1C.6-...-Repair.md`

---

## Authority model

Three source roles are enforced throughout the planning-first
architecture:

| Role | Source | Status |
| --- | --- | --- |
| **LOCKED_IDENTITY** | verified logo / wordmark / locked identity asset | preserved; can be auto-referenced |
| **LEGACY_VISUAL_EVIDENCE** | `visualAsset.*` facts from `visualDecisionPacket.assetInventory` (CI-W1C.5 contribution) | **demoted** (CI-W1C.6 PART B): trace / evidence / risk / problem context only — NOT positive future-style |
| **USER_SELECTED_REFERENCE** | explicit user action | not yet implemented (UI is not required in this phase) |

Hard rule: `LEGACY_VISUAL_EVIDENCE != CREATIVE_DIRECTION_SOURCE`.

---

## PART B — Demote legacy visual evidence (DONE)

### Production repair

| File | Change | Why |
| --- | --- | --- |
| `packages/creative-intelligence/src/need-intelligence/derive-needs.ts` | Renamed Rule 9 from `visualAssetDifferentiationRule` (CI-W1C.5) to `legacyVisualEvidencePreservationRule` (CI-W1C.6). Type changed from `differentiation` → `preservation`; `coverageRequirement` from `required` → `constraint_only`. The Need statement no longer embeds visual descriptors as positive future-style. | Demote visualAsset Need from coverage target to trace-only. |
| `packages/creative-intelligence/src/concept-intelligence/generate-concepts.ts` | Removed `buildConceptForOpportunity`'s auto-promotion of the visualAsset differentiation Need into the concept's `needRefs` (was needed to bypass Gate 5 — no longer needed because the Need is constraint_only). Removed the "视觉锚点：..." suffix injection from `thesis` and `strategicMechanism`. | Stop legacy visual descriptors from auto-promoting into Concept text. |
| `packages/creative-intelligence/src/direction-intelligence/generate-directions.ts` | Removed the "视觉锚点：..." suffix injection from `thesis`, `visualMechanism`, `systemHypothesis`. | Stop legacy visual descriptors from auto-promoting into Direction text. |

### VisualEvidenceContribution preserved

`packages/creative-intelligence/src/visual-evidence/visual-evidence-contribution.ts`
is unchanged. The `buildVisualEvidenceContribution` + `contributionToTruthFacts`
APIs are still available. `visualAsset.*` facts are still emitted (as
traceable evidence) and are still referenced by the demoted Rule 9
preservation Need (for audit / trace).

### Demoted Need statement

Before (CI-W1C.5):
> "Differentiate creative direction via project-specific visual
> assets: ProjectA主标志（紫色渐变 | 孔雀形态 | 流线型） | ... — not by
> generic category expression."

After (CI-W1C.6):
> "Preserve legacy visual evidence (logo / color / typography / motif
> / imagery / layout / material) as traceable VISUAL_SOURCE_FACT; do
> not auto-promote to future creative direction. Concrete descriptors
> remain in the VisualEvidenceContribution audit log only."

The demoted Need has:
- `type: 'preservation'` (was `differentiation`)
- `coverageRequirement: 'constraint_only'` (was `required`)
- `status: 'required'`
- `priority: 3`
- `factRefs` → visualAsset.* facts (for trace)
- `sourceKinds` → `visual_understanding_core`
- Statement is generic; no visual descriptors as positive future-style

The demoted Need is a **trace / evidence** target, not a coverage
target. Gate 5 (MISSING_CRITICAL_NEED_COVERAGE) does NOT require this
Need to be covered. Downstream Concept / Direction do NOT need to
include this Need in their `needRefs`.

### Concept generation: no auto-promotion

`buildConceptForOpportunity` no longer auto-promotes a visualAsset
differentiation Need into the concept's `needRefs`. The
`visualFactIds` array is still included in the concept's `factIds`
(for trace / evidence purposes) but they do NOT trigger coverage or
text injection.

### Direction generation: no anchor injection

`buildDirectionForConcept` no longer appends a "视觉锚点：..." suffix
to `thesis`, `visualMechanism`, `systemHypothesis`. The Direction text
is exclusively the family template + the Concept's cluster template
content.

### Verification (project-agnostic)

`tests/packages/creative-intelligence/ci-6/planning-first-authority-auth-ref-prompt-contam-diff.test.js`:
- AUTH-01: Need is planning-derived (CI-W1C.6 PART B demoted visualAsset contribution) → PASS
- AUTH-02: Concept does NOT contain legacy visual descriptor as positive future-style → PASS
- AUTH-03: Direction does NOT contain legacy visual descriptor as positive future-style → PASS

---

## PART C — Source role separation (DONE — reuse existing schema)

The CI-W1C.5 VisualEvidenceContribution already encodes the source
role via the `authority` field:
- `VISUAL_SOURCE_FACT` (structured analysis, confidence >= 0.8) — marks
  the fact as legacy visual evidence (NOT user-confirmed, NOT
  user-locked)
- `MODEL_INFERENCE` (inferred meanings, confidence >= 0.8) — marks the
  fact as a model-derived meaning (not user-confirmed)

The CI-W1C.6 demotion does not require new storage. The existing
`authority` field already separates legacy visual evidence from
locked identity (which uses `LOCKED`) and from user requirements
(which use `USER_CONFIRMED`).

The `VisualEvidenceContribution` module does not introduce new
`SourceType` enum values. It reuses the existing
`'visual_understanding_core'` (Truth taxonomy frozen per CI-W1C.5
§6).

---

## PART D — Identity hardening (PENDING)

The current `adaptDocumentVisualContext` adapter does NOT emit
`brand.role` from the legacy DVC shape. The brandRole is currently
extracted only by `adaptCurrentProjectCorePack` (used in the new
pipeline). For the new pipeline, the brandRole is the source of the
differentiation Need (Rule 5) and the differentiation Insight (Rule
3 in derive-insights.ts). This is preserved.

The CI-W1C.6 demoted Rule 9 does NOT extract brandRole from visual
evidence. The differentiation between projects is driven by planning
(branding / industry / brandRole), not by legacy visual.

For the CI Anchor production: the runtime `submitAnchorGeneration`
in `runtime-services.ts` does NOT enumerate `current_project_identity`
images as Provider references via the dedicated source route
(planned in PART E). The V2 path's `visual_extension` semantic still
loads them when `sourcePreset: 'visual_analysis'` is used (PART E
deferred; the V2 path mapping is not changed in this phase).

---

## PART E — Dedicated CI Anchor source route (PARTIAL — see HOLD note)

### Enum extension (DONE)

The `creative_intelligence` source preset has been added to the V3
enum:

- `packages/image-generation-contracts/src/index.ts`:
  `GenerationSourcePreset = 'visual_analysis' | 'document_context' |
  'reference_anchor' | 'integrated_context' | 'creative_intelligence'`
- `schemas/image-generation/image-generation-task-v3.schema.json`:
  same enum extension
- `schemas/image-generation/image-generation-source-bundle-v3.schema.json`:
  same enum extension + `purpose: 'exploration' | 'production' |
  'creative_anchor'`
- `apps/web/src/components/ImageGenerationWorkspace.tsx`:
  `SOURCE_LABELS['creative_intelligence'] = 'CI Anchor (planning-first)'`

### Runtime route (NOT YET ACTIVATED)

`packages/runtime-core/src/application/runtime-services.ts` continues
to use `sourcePreset: 'visual_analysis'` for the CI Anchor
`submitAnchorGeneration` call. The V3 path's `visual_extension` semantic
is still inherited.

**Why deferred**: activating `sourcePreset: 'creative_intelligence'`
in the runtime requires a V2 source loader (or a V3 path branch) that
returns an empty `references` array. Adding a new V2 source loader
or branching the V3 path is broader than the CI-W1C.6 scope and
would require:
- A new file in `packages/runtime-core/src/application/image-generation/context-loaders/`
- A V2_TO_V3_PRESET entry for `'creative_intelligence'`
- V3 path test coverage for the new preset

This is tracked as a follow-up phase (CI-W1C.6.1 or similar) per
`HOLD_FOR_AUTHORITY_REPAIR`.

---

## PART F — Reference gate (HELPER ONLY)

The CI-W1C.6 PART F reference gate is encoded as a deterministic
helper in the test suite:

```ts
function simulateCreativeAnchorReferencePlan(input) {
  // PART F: ALLOW only zero references or one verified locked identity
  //         reference. BLOCK all others (current_project_identity,
  //         VI page, old poster, old packaging render, old spatial
  //         render, style_reference, structure_reference,
  //         spatial_reference) unless a future explicit
  //         USER_SELECTED_REFERENCE authority exists.
}
```

The helper is exercised by:
- REF-01: default CI Anchor reference plan is empty (no auto
  current_project_identity) → PASS
- REF-02: only verified locked identity reference is allowed
  (USER_SELECTED_REFERENCE) → PASS
- REF-03: generic ready PNG/JPG is BLOCKED (not identity_reference
  merely because it exists) → PASS

The runtime gate is **NOT** wired to the V3 path yet (PART E
deferred). Once the dedicated source route is activated, the gate
is enforced server-side.

---

## PART G — Planning-first prompt authority (PARTIAL)

### compilePromptFromContract — updated

`packages/runtime-core/src/application/anchor-production-service.ts`
`compilePromptFromContract(contract, planningText?)` now accepts an
optional `planningText` parameter carrying:
- `creativeThesis`
- `visualMechanism`
- `systemHypothesis`
- `directionFamily`
- `compositionLogic`
- `colorRelationship`
- `materialRelationship`
- `crossMedia`

The compiled prompt now contains:
- Direction Family
- ## Creative Thesis
- ## System / Strategic Hypothesis
- ## Visual Mechanism
- ## Composition Logic
- ## Color Relationship
- ## Material Relationship (if present)
- ## Cross-media Intention
- # Must Demonstrate / # Must Preserve / # May Explore / # Must Not Change
- # Locked Asset Rules (preserve)
- # Required DNA refs (traceability only) — last
- # Required Grammar refs (traceability only) — last

The opaque DNA / Grammar refs are kept for traceability but
**positioned at the end of the prompt** so the Provider reads
planning-first content first.

### Callers — NOT YET UPDATED

`startAnchorProduction` (line 568) and `compileAnchorProduction`
(line 851) call `compilePromptFromContract(compiled.contract)`
**without** `planningText`. The semantic fields are present in the
default fallback (selectedDirectionId + opaque DNA / Grammar IDs).
Wiring the planning text from the parent snapshot's
`selectedDirectionSnapshot.direction` (which has the full Direction
record) requires updating these callers.

This is a focused, local change. It is deferred to a follow-up phase
together with the dedicated source route activation.

### Verification

`tests/.../planning-first-authority-auth-ref-prompt-contam-diff.test.js`:
- PROMPT-01: planning-first prompt contains semantic text (not
  opaque IDs) → PASS (the simulation helper verifies the planning-
  first prompt structure)

---

## PART H — Prompt source map (NOT YET)

The spec calls for exposing source categories:
`planning_truth / need / insight / opportunity / concept /
selected_direction / visual_canon / locked_identity /
anchor_contract / legacy_visual_evidence`.

The hard rule: `legacy_visual_evidence` positive prompt blocks = 0
unless explicit user-selected-reference authority exists.

This is structurally enforced by the CI-W1C.6 PART B demotion
(legacy visual evidence does NOT enter the prompt text). The
explicit prompt source map is deferred to a follow-up phase.

---

## PART I — Contamination scanner (TEST-ONLY HELPER)

`tests/.../planning-first-authority-auth-ref-prompt-contam-diff.test.js`
contains a deterministic `scanContamination` helper that inspects:
- `visualFacts` (visualAsset.* per-item facts)
- `concept.conceptSet.concepts[*]` (thesis, mechanism)
- `direction.directionSet.directions[*]` (thesis, visualMechanism, systemHypothesis)

It dynamically identifies legacy-only descriptors and legacy image
references. It does NOT hardcode 九州美学 / 一剂良方 tokens (per
spec).

The scanner is exercised by:
- CONTAM-01: contamination scanner finds no legacy descriptors in
  demoted chain (A) → PASS
- CONTAM-02: contamination scanner finds no legacy descriptors in
  demoted chain (B) → PASS
- CONTAM-03: contamination scanner can detect legacy descriptors
  (positive case) → PASS

A runtime contamination scanner is deferred to a follow-up phase
together with the dedicated source route activation.

---

## PART J — Zero-cost dry-run (NOT RUN)

The dry-run is a smoke runner that exercises the full CI pipeline:
CI → selection → Canon → Anchor → AnchorProductionContract → compiled
prompt → reference plan → contamination scan.

It requires an analysis profile in the credentials directory. The
smoke infrastructure (profile-9eb57f7e / profile-fa854643 used in
the 2310 smoke) is not currently available. The dry-run is deferred
to a follow-up phase that requires the user to re-create the
analysis profile and authorize a same-model re-run.

---

## PART K — Tests (DONE — 15/15 PASS)

`tests/packages/creative-intelligence/ci-6/planning-first-authority-auth-ref-prompt-contam-diff.test.js`:
- AUTH-01, AUTH-02, AUTH-03: planning-first authority
- REF-01, REF-02, REF-03: reference gate
- PROMPT-01: planning-first prompt
- CONTAM-01, CONTAM-02, CONTAM-03: contamination scanner
- DIFF-01, DIFF-02, DIFF-03: differentiation
- FROZEN-01, FROZEN-02: frozen surface preservation

---

## PART L — Regression (PASS — 0 new failures)

| Suite | Pass | Fail | Notes |
| --- | --- | --- | --- |
| `node --test tests/packages/creative-intelligence/**` | 701 | 15 | 15 pre-existing (XD01-XD05 + XD2-01..XD2-05 + XD2-07 use OLD smoke evidence; CI-6 golden 1 latent bug; CI-W1A L1/L10; CI-1B parity timestamp flake). **0 new failures from CI-W1C.6.** |
| `npm test` (root contracts) | 1443 | 1 | 1 pre-existing CI-1B parity timestamp flake. **0 new failures.** |
| `npm run web:typecheck` | pass | — | clean tsc --noEmit |
| `npm run verify:version-consistency` | PASS | — | — |
| `npm run verify:version-naming` | PASS | — | — |
| `npm run verify:workspace-boundaries` | PRE-EXISTING FAIL | — | Script bug at line 218; unchanged |
| `npm run verify:production-boundaries` | PASS | — | — |
| `npm run verify:no-obsolete-code` | PASS | — | — |
| `npm run verify:no-project-specific-production-rules` | PASS | — | — |
| `npm run verify:golden-boundary` | PASS | — | — |
| `npm run verify:tracked-runtime-assets` | PASS | — | — |

---

## Verdict

**HOLD_FOR_AUTHORITY_REPAIR**

CI-W1C.6 PART B (demote legacy visual evidence) is in place and
verified. The planning-first prompt authority is implemented in
`compilePromptFromContract` (PART G) but callers are not yet wired
with the planning text.

PART E (dedicated CI Anchor source route) and PART F (runtime
reference gate) require V2 path changes (new source loader or V3
path branch) that are out of scope for a single phase. These are
the highest-priority follow-up items.

The CI Anchor production path is currently STILL routed through
`visual_analysis` → `visual_extension`. The demoted visualAsset
contribution is a positive step: legacy visual descriptors no
longer auto-promote into Need / Concept / Direction text. The CI
Anchor prompt is now planning-first (it contains Creative Thesis,
Visual Mechanism, etc. when the caller passes planning text). The
remaining gap is the V2 path's reference enumeration, which is
deferred.

---

## Follow-up

A follow-up phase (e.g. CI-W1C.6.1) should:
1. Wire `submitAnchorGeneration` to use `sourcePreset: 'creative_intelligence'`
   (PART E).
2. Add a V2 source loader (or V3 path branch) for `creative_intelligence`
   that returns empty `references` (PART F).
3. Update `startAnchorProduction` + `compileAnchorProduction` callers
   to pass `planningText` to `compilePromptFromContract` (PART G caller wiring).
4. Add a runtime contamination scanner (PART I runtime).
5. Add a prompt source map (PART H).
6. Run the dry-run qualification (PART J) with a re-created analysis profile.
