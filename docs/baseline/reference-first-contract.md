# Reference First Current Behavior Contract

Status: STABLE / CURRENT BASELINE. This document describes existing behavior and does not redefine it.

## Route

```text
upload/select -> project asset processing -> explicit resolver -> reference policy
-> target scene projection/authority -> compiler -> reference boundary
-> Seedream payload -> provider -> validation/similarity evidence
```

## Frozen behavior

- Reference authority: explicit selected image is `high_fidelity_visual_reference`; it controls visual world, material language, atmosphere and brand mechanisms.
- Target scene: functional requirement, operation constraints, must-be-visible, lighting, composition and brand manifestation are target-aware. Cross-scene source program leakage fails closed.
- Style continuity: preserve mechanisms, not source-scene public objects. Cross-scene generation must not become a near-copy.
- Assets: post-analysis uploads are resolvable without rerunning analysis; project assets never enter implicitly.
- Locked Assets/Logo: confirmed identity is protected; Logo uses post-composite when the task contract requires it and is not rendered as mutated in-scene text.
- Reference count/weight: adapter capability and Product Policy decide count; S1 does not alter strength, weight or provider composition.
- Prompt authority: user explicit requirements and target scene authority are resolved before provider payload; Reference Boundary states what may and may not transfer.
- Fallback: missing explicit references fail closed. No implicit reference fallback. `vnext_legacy` is compiler fallback only, not permission to bypass reference requirements.
- Continuation is separate: confirmed generated output has role `world_consistency`, with `KEEP GRAMMAR / CHANGE PROGRAM` and complete lineage.
- Similarity audit triggers only for Reference-First cross-scene. Audit unavailability preserves the image/success but blocks final acceptance.

## Baseline files

Primary UI: `VNextGenerationWorkspace.tsx`; resolver: `reference-asset-resolver.ts`; service: `image-generation/vnext-service.ts`; policies and gates: `packages/image-generation-runtime/src/space/*`; compiler: `vnext/compile.js` -> `space/phase9b-space-compiler.js`; adapter: `vnext/seedream-adapter.js`.

Manual Product Acceptance: PASS based on the existing JZMX Reception -> Consultation accepted output. No S1 model call or new visual scoring was performed.
