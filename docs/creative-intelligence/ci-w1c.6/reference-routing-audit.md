# CI-W1C.6 — Reference Routing Audit

**Status: PARTIAL** (PART E + PART F deferred to follow-up)

## PART E — Dedicated CI Anchor source route (PARTIAL)

### Current V3 source preset → V2 preset mapping (UNCHANGED in this phase)

`packages/image-generation-runtime/src/task-builder.js`:
```js
const V3_TO_V2_PRESET = {
  visual_analysis: 'visual_extension',
  document_context: 'document_concept',
  reference_anchor: 'reference_preview',
  integrated_context: 'integrated_anchor',
};
```

### Current CI Anchor runtime path (UNCHANGED)

`packages/runtime-core/src/application/runtime-services.ts`:
```js
const compileSources = {
  sourcePreset: 'visual_analysis',  // CI-W1C.6 PART E: DEFERRED
  deliverable: 'anchor_image',
  purpose: 'creative_anchor',
  // ...
};
```

The `visual_analysis` source preset maps to `visual_extension` in
V2, which loads current-project visual images as
`current_project_identity` references. This is the contamination
point identified in PART A.

### New `creative_intelligence` source preset (ENUM ADDED, ROUTE NOT ACTIVATED)

The `creative_intelligence` value has been added to:
- `packages/image-generation-contracts/src/index.ts` (`GenerationSourcePreset` type)
- `schemas/image-generation/image-generation-task-v3.schema.json` (V3 task schema)
- `schemas/image-generation/image-generation-source-bundle-v3.schema.json` (V3 source bundle schema)
- `apps/web/src/components/ImageGenerationWorkspace.tsx` (`SOURCE_LABELS` UI label)

Activation in the runtime is deferred to a follow-up phase.

## PART F — Reference gate (HELPER ONLY)

The reference gate is encoded as a deterministic helper:

```ts
// PART F: ALLOW only zero references or one verified locked identity
//         reference. BLOCK all others (current_project_identity,
//         VI page, old poster, old packaging render, old spatial
//         render, style_reference, structure_reference,
//         spatial_reference) unless a future explicit
//         USER_SELECTED_REFERENCE authority exists.
function simulateCreativeAnchorReferencePlan(input) {
  const references = [];
  const blocked = [];
  // ...
  if (ref) {
    const isVerifiedLockedIdentity = ref.role === 'identity_reference' && ref.lockedIdentity === true;
    const isLegacy = ['current_project_identity', 'vi_page', 'old_poster', 'old_packaging_render', 'old_spatial_render'].includes(ref.role);
    const isStyle = ref.role === 'style_reference';
    const isStructure = ref.role === 'structure_reference';
    const isSpatial = ref.role === 'spatial_reference';
    if (isVerifiedLockedIdentity) references.push(ref);
    else blocked.push(ref);
  }
  return { references, blocked, ... };
}
```

Test coverage:
- REF-01: default CI Anchor reference plan is empty → PASS
- REF-02: only verified locked identity reference is allowed → PASS
- REF-03: generic ready PNG/JPG is BLOCKED → PASS

The runtime gate (in the V3 path's source loader for
`creative_intelligence`) is deferred to a follow-up phase.

## Follow-up

A follow-up phase (CI-W1C.6.1) should:
1. Add a V2 source loader (or V3 path branch) for `creative_intelligence`
   that returns an empty `references` array.
2. Update `submitAnchorGeneration` to use `sourcePreset: 'creative_intelligence'`.
3. Add a runtime `enforceReferenceGate` function called from
   `submitAnchorGeneration` that wraps the helper logic.
4. Enforce: zero references OR one verified locked identity.
5. Add `USER_SELECTED_REFERENCE` authority tracking (when the UI
   implements it).

The deferred scope is bounded and isolated. The CI-W1C.6 demotion
already prevents legacy visual evidence from auto-promoting into
Need / Concept / Direction text.
