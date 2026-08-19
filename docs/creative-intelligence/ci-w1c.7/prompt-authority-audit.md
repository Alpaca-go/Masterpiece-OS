# CI-W1C.7 — Prompt Authority Audit (PART G / H / I)

This document audits the prompt authority for the Model-Assisted creative reasoning layer. The CI package does NOT call the model — the runtime service does — but the prompt templates and source maps live in the CI package as deterministic contracts.

## 1. Prompt source map (spec §14)

The source map is the deterministic record of *what the model was allowed to use as positive creative authority* and *what was explicitly excluded*.

```ts
interface CreativeReasoningPromptSourceMap {
  planningTruth: string[];     // confirmed Project Truth fact IDs
  userRequirements: string[];  // user.requirement* fact IDs
  lockedIdentity: string[];     // LOCKED authority fact IDs
  prohibitedDirections: string[]; // prohibited.* / style.prohibited fact IDs
  needs: string[];              // Need IDs
  evidence: string[];           // Evidence IDs
  legacyVisualEvidenceExcluded: string[]; // non-empty: names of excluded authorities
}
```

The `legacyVisualEvidenceExcluded` field is asserted non-empty by the Strategic Grounding Gate (STR-08) and SG-04. The spec minimum set:

- `visualAsset.*`
- `old_visual_style`
- `old_VI`
- `old_poster`
- `old_packaging`
- `old_spatial`
- `style_reference`
- `structure_reference`
- `spatial_reference`

## 2. Prompt template structure (PART G)

The prompt is structured as:

```
# AUTHORITATIVE PROJECT FACTS
[planningTruth entries]

# USER REQUIREMENTS
[userRequirements entries]

# LOCKED RULES
[lockedIdentity entries]

# PROHIBITED DIRECTIONS
[prohibitedDirections entries]

# NEED SKELETON
[needs entries]

# SOURCE TRACE IDS
[all source IDs]

# TASK
[stage-specific instructions]

# OUTPUT JSON SCHEMA
[stage-specific schema]

# EPISTEMIC RULES
- Strategic interpretations are MODEL_INFERENCE (not FACT)
- Creative proposals are CREATIVE_HYPOTHESIS (not FACT)
- Every project-specific claim must resolve to provided source IDs
- Do not summarize the old visual style
- Do not reproduce legacy visual descriptors
- Do not invent project facts
- visualAsset.* and old_* are NOT positive creative authority
```

The Model-Assisted Concept / Direction prompts add the stage-specific sections:

```
# STRATEGIC SYNTHESIS ARTIFACT (for Concept stage)
[validated synthesis JSON]

# MODEL-ASSISTED CONCEPT SET (for Direction stage)
[validated concept set JSON]
```

## 3. Compilation

`compileStrategicReasoningContext` (in `packages/creative-intelligence/src/strategic-synthesis/`) builds the planning-only source context. The function is pure: same input → same source map. It explicitly does NOT include `VISUAL_SOURCE_FACT` facts in the source IDs.

The context includes:

- `authoritativeFacts` — `USER_CONFIRMED` / `CONFIRMED` / `LOCKED` facts.
- `userRequirements` — `user.requirement*` keys.
- `lockedIdentity` — `LOCKED` authority facts.
- `prohibitedDirections` — `prohibited.*` / `style.prohibited` keys.
- `needs` — NeedItem list (passed through).
- `evidence` — EvidenceItem list (passed through).
- `legacyVisualEvidenceExcluded` — the spec minimum set.

The `sourceIds` block (facts / needs / evidence) is the deterministic list of IDs that the model output's `factRefs` / `needRefs` / `evidenceRefs` MUST resolve into. The Strategic Grounding Gate (SG-01) asserts this on every artifact.

## 4. planningText parameter (PART G)

`compilePromptFromContract(contract, planningText?)` (in `packages/runtime-core/src/application/anchor-production-service.ts`, extended in CI-W1C.6 PART G) accepts an optional `planningText` object with:

```ts
{
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

When provided, the planning-first sections appear BEFORE opaque DNA/Grammar refs. The opaque refs are repositioned to the END with a `(traceability only)` suffix.

**Callers not yet wired** (`startAnchorProduction`, `compileAnchorProduction` in `anchor-production-service.ts` still call `compilePromptFromContract(contract)` without `planningText`). Deferred to follow-up.

## 5. Contamination scanner (PART I)

A deterministic contamination scanner `scanContamination(input)` lives in the test contract. It scans:

- `input.visualFacts` (Project Truth visualAsset.* facts)
- `input.concept: { conceptSet: { concepts: [...] } }`
- `input.direction: { directionSet: { directions: [...] } }`

It returns `{ findings: [{ kind, where, snippet }], visualDescriptorCount }`.

**The scanner does NOT hardcode 九州美学 / 一剂良方 tokens.** It is project-agnostic. It detects:

- Phrases like "based on the old VI" (legacy positive-authority claim).
- Mentions of `visualAsset.*` keys in concept / direction text.
- Cross-direction collapse (identical creativeThesis / visualMechanism across directions).
- Cross-project collapse (identical text across two projects' direction sets).
- Locked identity violations ("replace the brand identity").
- Prohibited direction violations (use of a `prohibited.*` key as positive direction).

## 6. Hard rules (verified)

- ✅ `legacy_visual_evidence` positive prompt blocks = 0 (enforced by SG-04 + MD-07 + the runtime path never passes visualAsset.* to the model).
- ✅ Every project-specific claim must resolve to provided source IDs (enforced by SG-01 / MC-01 / MD-01).
- ✅ No model call to image provider. `imageProviderCallCount` is always 0.
- ✅ No hardcoded project tokens in production rules (verified by `verify:no-project-specific-production-rules`).
- ✅ No CI-W1C.6 demotion reversal (Rule 9 stays `type='preservation'` + `coverage='constraint_only'`).

## 7. Deferred to follow-up

- Caller wiring for `planningText` parameter in `startAnchorProduction` / `compileAnchorProduction`.
- Runtime contamination scanner (currently a test-only helper).
- Prompt source map UI in the Web projection (the shadow artifacts are persisted but not yet rendered in the workspace).

The CI-W1C.7 surface is complete and tested. The runtime wiring is the only piece left. That wiring is the next phase's work, after a user authorization to begin CI-W1C.6.1.
