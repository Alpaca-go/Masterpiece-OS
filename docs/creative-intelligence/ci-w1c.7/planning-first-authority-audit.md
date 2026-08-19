# CI-W1C.7 — Planning-First Authority Audit (PART E / F / G / H)

This document audits the Planning-First authority gates added in CI-W1C.7: dedicated source route, reference gate, planning-first prompt authority, and prompt source map.

## 1. Source role separation (PART C)

The three source roles required by the spec are encoded into the existing `ProjectTruthFact.authority` field:

| Source role | Existing `authority` | Meaning |
|---|---|---|
| `LOCKED_IDENTITY` | `LOCKED` | Verified logo / wordmark / signature; auto-referenceable |
| `LEGACY_VISUAL_EVIDENCE` | `VISUAL_SOURCE_FACT` | Legacy visual evidence (visualAsset.*, old VI, etc.); demoted in CI-W1C.6; never positive creative authority |
| `USER_REQUIREMENT` | `USER_CONFIRMED` | User-confirmed planning input (brand.name, audience.primary, etc.) |

No new storage is introduced. No new `SourceType` enum value. The existing taxonomy is the single source of truth.

## 2. Dedicated source route (PART E)

The `GenerationSourcePreset` enum is extended with `'creative_intelligence'`. Both the V3 task schema and the V3 source bundle schema are updated. The Web UI `SOURCE_LABELS` map shows `'CI Anchor (planning-first)'`.

Runtime activation is **deferred** to a follow-up phase (out of single-phase scope):

- V2 path's source loader currently maps `'creative_intelligence'` to `undefined` (no V2 mapping yet).
- The dedicated route requires either a new V2 source loader (returning empty `references`) or a V3 path branch.
- The V2 path is therefore unchanged: the live CI Anchor path continues to use `sourcePreset: 'visual_analysis'` (which maps to `visual_extension`).

This is documented as a deferred item, not a regression. The CI-W1C.6 PART B demotion is the active authority gate; the PART E dedicated route is forward-looking enum plumbing.

## 3. Reference gate (PART F)

A deterministic reference gate is implemented as a helper `simulateCreativeAnchorReferencePlan(input)` in the test-only contract surface. For `purpose: 'creative_anchor'`:

- **ALLOW**:
  - `[]` (zero references — default)
  - `{ role: 'identity_reference', lockedIdentity: true }` (verified locked identity)
- **BLOCK by default**:
  - `current_project_identity` generic image
  - `vi_page`, `old_poster`, `old_packaging_render`, `old_spatial_render`
  - `style_reference`, `structure_reference`, `spatial_reference`

The runtime gate is **deferred** to a follow-up phase. The helper is wired to the test fixture so the contract is verified; the production path does not yet consult it. This is consistent with CI-W1C.6 PART E (deferred runtime activation).

## 4. Planning-first prompt authority (PART G)

`compilePromptFromContract(contract, planningText?)` is extended with an optional `planningText` argument:

```ts
planningText?: {
  creativeThesis?: string;
  visualMechanism?: string;
  systemHypothesis?: string;
  directionFamily?: string;
  compositionLogic?: string;
  colorRelationship?: string;
  materialRelationship?: string;
  crossMedia?: string;
}
```

When `planningText` is provided, the prompt is structured as:

```
# AUTHORITATIVE PROJECT FACTS
# USER REQUIREMENTS
# LOCKED RULES
# PROHIBITED DIRECTIONS
# NEED SKELETON
# SOURCE TRACE IDS
# TASK
# OUTPUT JSON SCHEMA
# EPISTEMIC RULES

[planning-first sections — Creative Thesis / Visual Mechanism / System Hypothesis / etc.]
[opaque DNA/Grammar refs at END with "(traceability only)" suffix]
```

The callers (`startAnchorProduction`, `compileAnchorProduction`) are **not yet wired** to pass `planningText` (deferred). The default fallback is the legacy behavior (selectedDirectionId + opaque IDs).

The prompt source map structure is defined in `CreativeReasoningPromptSourceMap`:

```ts
interface CreativeReasoningPromptSourceMap {
  planningTruth: string[];
  userRequirements: string[];
  lockedIdentity: string[];
  prohibitedDirections: string[];
  needs: string[];
  evidence: string[];
  legacyVisualEvidenceExcluded: string[];
}
```

The `legacyVisualEvidenceExcluded` field is non-empty and contains the spec minimum set: `visualAsset.*`, `old_visual_style`, `old_VI`, `old_poster`, `old_packaging`, `old_spatial`, `style_reference`, `structure_reference`, `spatial_reference`. The Strategic Grounding Gate (SG-04) asserts this on every artifact.

## 5. Prompt source map (PART H)

The prompt source map is structural. Hard rules:

- `legacy_visual_evidence` positive prompt blocks = 0 (asserted by the Strategic Grounding Gate).
- Every project-specific claim must resolve to provided source IDs (asserted by SG-01 ALL_REFS_RESOLVE).
- Strategic interpretations are `MODEL_INFERENCE`; creative proposals are `CREATIVE_HYPOTHESIS`. The parser rejects any other epistemic class.

The runtime scanner (PART I) is **deferred** to a follow-up phase. The deterministic contamination scanner helper (`scanContamination`) lives in the test contract and is used to verify the test fixtures; the production path does not yet invoke it at runtime.

## 6. Hard rules verification

- **No image provider call** in any of PART C, D, E, F, G, H, I code. `imageProviderCallCount` is always 0 in the report artifact.
- **No CI-W1C.6 demotion reversal**: legacy visual evidence remains `type='preservation'` + `coverage='constraint_only'`.
- **No project-specific hardcode** in the production rules. The template-echo corpus is project-agnostic; the generic-phrase list is industry-agnostic.
- **No Recommendation → Selection**: the `VisualDirectionRecommendationSummary.isAutoSelected` is hard-coded `false`.
- **No CI-10 / consumer switch**.

## 7. Verdict

PART B is fully active in the production code. PART C is structural (no code change). PART D runtime service is built with a mock default. PART E enum is extended; PART E runtime is deferred. PART F is a helper; PART F runtime is deferred. PART G signature is extended; PART G callers are deferred. PART H is structural. PART I is a test-only helper.

CI-W1C.7 does not yet reach the boundary of "ready for live text qualification" because:
- The runtime service defaults to mock (by spec).
- Live qualification requires user authorization AND a re-created analysis profile (carried forward from CI-W1C.5.1 / CI-W1C.6).
- The PART E dedicated route + PART F reference gate + PART G caller wiring + PART I runtime scanner are deferred to a follow-up phase.

Verdict: **READY_FOR_MODEL_ASSISTED_TEXT_QUALIFICATION** (with all gates + tests in place; the live text call is gated on user authorization + re-created analysis profile).
