# Packaging Generator Baseline

| Field | Current baseline |
|---|---|
| UI entry | `apps/web/src/pages/ShortChainPage.tsx`, `apps/web/src/components/ImageGenerationWorkspace.tsx`, `apps/web/src/features/packaging/PackagingWorkspace.tsx` |
| Current task/source schema | `3.0` |
| Migration support | task/source `1.0` and `2.0` |
| Service | `packages/runtime-core/src/application/image-generation/service.ts` |
| Router/compiler | `packages/image-generation-runtime/src/task-builder.js` (`compileImageGenerationTask` routes source bundle `3.0`) |
| Prompt compiler | `packages/image-generation-runtime/src/deliverables/deliverable-prompt-compiler.js` and `packages/image-generation-runtime/src/generation/prompt-compiler.js` |
| Packaging contract | `packages/image-generation-runtime/src/prompt-contracts/packaging-contract.js` |
| Reference policy | `packages/image-generation-runtime/src/deliverables/deliverable-reference-policy.js` |
| Gates | deliverable gate, compile fingerprint, provider gates |
| Generator | `packages/runtime-core/src/application/image-generation/service.ts` |
| Provider | configured compatible image provider; current UI baseline Seedream |
| Output/run | V3 task with run/evidence persistence; image output contract remains one image |
| Tests | deliverable contracts/prompt/reference/golden/schema/service tests |

Packaging intentionally does not use `packages/image-generation-runtime/src/space/compiler.js`. Schema 1.0/2.0 branches are baseline compatibility dependencies because persisted tasks can be migrated or retried.

S1 offline tests confirm a deterministic packaging golden fixture and packaging deliverable contract, but no new real-provider packaging visual was run for this path rewrite. S2 candidate status remains `TEXT_GOLDEN_READY / VISUAL_GOLDEN_NOT_REVALIDATED`.
