# Packaging Generator Baseline

| Field | Current baseline |
|---|---|
| UI entry | `ImageGenerationWorkspace.tsx` |
| Current task/source schema | `3.0` |
| Migration support | task/source `1.0` and `2.0` |
| Service | `apps/desktop/src/main/image-generation/service.ts` |
| Router/compiler | `task-builder.js::compileImageGenerationTaskV3` |
| Prompt compiler | `deliverables/deliverable-prompt-compiler.js` |
| Reference policy | `deliverables/deliverable-reference-policy.js` |
| Gates | deliverable gate, compile fingerprint, provider gates |
| Generator | shared Desktop image-generation service |
| Provider | configured compatible image provider; current UI baseline Seedream |
| Output/run | V3 task with run/evidence persistence; image output contract remains one image |
| Tests | deliverable contracts/prompt/reference/golden/schema/service tests |

Packaging intentionally does not use the Space compiler. Schema 1.0/2.0 branches are baseline compatibility dependencies because persisted tasks can be migrated or retried.

S1 offline tests confirm a deterministic packaging golden fixture and packaging deliverable contract, but no new real-provider packaging visual was run. S2 candidate status is `TEXT_GOLDEN_READY / VISUAL_GOLDEN_NOT_REVALIDATED`.
