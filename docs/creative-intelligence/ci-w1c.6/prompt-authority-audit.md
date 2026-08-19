# CI-W1C.6 — Prompt Authority Audit

**Status: PARTIAL** (compilePromptFromContract updated; callers not yet wired)

## PART G — Planning-First Prompt Authority (PARTIAL)

### compilePromptFromContract — UPDATED

`packages/runtime-core/src/application/anchor-production-service.ts`:
```ts
export function compilePromptFromContract(
  contract: AnchorProductionContract,
  planningText?: {
    creativeThesis?: string;
    visualMechanism?: string;
    systemHypothesis?: string;
    directionFamily?: string;
    compositionLogic?: string;
    colorRelationship?: string;
    materialRelationship?: string;
    crossMedia?: string;
  },
): string {
  // Compiles a planning-first authoritative prompt with semantic
  // text (Creative Thesis, Visual Mechanism, etc.) before the
  // opaque DNA / Grammar refs (which are kept for traceability
  // but positioned at the END of the prompt).
}
```

The compiled prompt now contains:
- Direction Family (if provided)
- ## Creative Thesis
- ## System / Strategic Hypothesis
- ## Visual Mechanism
- ## Composition Logic
- ## Color Relationship
- ## Material Relationship (if present)
- ## Cross-media Intention
- # Must Demonstrate / # Must Preserve / # May Explore / # Must Not Change
- # Locked Asset Rules (preserve)
- # Required DNA refs (traceability only) — LAST
- # Required Grammar refs (traceability only) — LAST

The opaque DNA / Grammar refs are kept for traceability but
**positioned at the end of the prompt** so the Provider reads
planning-first content first. The previous order (DNA first, then
Must/Preserve) has been inverted.

### Callers — NOT YET WIRED

`startAnchorProduction` (line 568) and `compileAnchorProduction`
(line 851) call `compilePromptFromContract(compiled.contract)`
**without** `planningText`. The semantic fields are present in the
default fallback (selectedDirectionId + opaque DNA / Grammar IDs).
Wiring the planning text from the parent snapshot's
`selectedDirectionSnapshot.direction` (which has the full Direction
record) is deferred to a follow-up phase.

### Test coverage

`tests/.../planning-first-authority-auth-ref-prompt-contam-diff.test.js`:
- PROMPT-01: planning-first prompt contains semantic text (not
  opaque IDs) → PASS

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

## Follow-up

A follow-up phase (CI-W1C.6.1) should:
1. Update `startAnchorProduction` + `compileAnchorProduction` callers
   to pass `planningText` to `compilePromptFromContract` (the
   planning text is derived from `parent.selectedDirectionSnapshot.direction`).
2. Add a runtime prompt source map (the contract has opaque
   `requiredDNARefs` / `requiredGrammarRefs`; the map should make
   these traceable to the original Direction / Canon source).
3. Assert: `legacy_visual_evidence` positive prompt blocks = 0
   (the demoted Rule 9 already guarantees this for Need statement;
   the Concept / Direction template text also has no visual anchor
   injection).
