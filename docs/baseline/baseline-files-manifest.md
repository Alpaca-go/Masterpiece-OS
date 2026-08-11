# Baseline Files Manifest

Baseline commit: `322ae676c546340fd7a9d467bca66ebe3fd023f7`. Paths are repository-relative. The manifest freezes sensitivity, not ownership or future immutability.

| Path | Domain | Role | Criticality | Why |
|---|---|---|---|---|
| `VERSION` | Product | version source | CRITICAL | release identity |
| `package.json` | Runtime/Build | workspace commands | HIGH | Web/test/gate entrypoints |
| `apps/desktop/package.json` | Runtime | Desktop/Web commands | HIGH | host scripts and packaging |
| `apps/desktop/electron.vite.config.ts` | Web | build/proxy entry | CRITICAL | renderer and RPC routing |
| `apps/desktop/scripts/run-web-dev.mjs` | Web | primary start | HIGH | sets Web runtime mode |
| `apps/desktop/src/renderer/src/main.tsx` | Web | renderer entry | CRITICAL | application mount |
| `apps/desktop/src/renderer/src/App.tsx` | Web | primary shell/routes | CRITICAL | active product flow |
| `apps/desktop/src/renderer/src/web-api.ts` | Web RPC | browser IPC bridge | CRITICAL | channel mapping |
| `apps/desktop/src/main/web-rpc-server.ts` | Web RPC | HTTP RPC server | CRITICAL | browser/backend boundary |
| `apps/desktop/src/main/index.ts` | Runtime Host | service registry | CRITICAL | shared backend entry |
| `apps/desktop/src/main/pipeline-service.ts` | Analysis | pipeline entry | CRITICAL | analysis behavior/provider |
| `apps/cli/src/v5/bootstrap.js` | Analysis | active hidden pipeline | CRITICAL | Web dynamic dependency |
| `apps/cli/src/v5/creative-director/prompt-builder.js` | Analysis Prompt | prompt assembly | CRITICAL | behavior-sensitive ordering |
| `apps/cli/prompts/v5/deep-creative-director.md` | Analysis Prompt | system behavior | CRITICAL | analysis authority |
| `apps/cli/prompts/v5/benchmark-instructions.md` | Analysis Prompt | benchmark instructions | CRITICAL | evidence behavior |
| `apps/cli/prompts/v5/execution-core-template.md` | Analysis Prompt | execution contract | CRITICAL | report behavior |
| `apps/cli/prompts/v5/report-schema.md` | Analysis Prompt | output structure | CRITICAL | parsing contract |
| `packages/model-runtime/src/qwen-reasoner.js` | Analysis Provider | request adapter | CRITICAL | model calls/attachments |
| `packages/model-runtime/src/response-parser.js` | Analysis | structured parser | CRITICAL | output interpretation |
| `packages/model-runtime/src/model-capabilities.js` | Analysis | capability policy | HIGH | request compatibility |
| `packages/analysis-runtime/src/index.ts` | Analysis | runtime exports | HIGH | validation/repair boundary |
| `packages/analysis-runtime/src/schema-validator.ts` | Analysis Schema | validation | CRITICAL | fail-closed behavior |
| `packages/analysis-runtime/src/structured-repair-runner.ts` | Analysis Repair | repair loop | CRITICAL | retry/repair behavior |
| `apps/desktop/src/main/analysis-contract.ts` | Analysis | report contract | CRITICAL | report validation |
| `apps/desktop/src/main/model-schema/schema-registry.ts` | Analysis Schema | registry | CRITICAL | schema selection |
| `apps/desktop/src/main/model-schema/validation-issues.ts` | Analysis Repair | issue/repair contract | HIGH | failure semantics |
| `apps/desktop/src/main/visual-decision-packet.ts` | Project Context | packet bridge | CRITICAL | generation grounding |
| `apps/desktop/src/main/project-context-vnext-builder.ts` | Project Context | vNext context | CRITICAL | Reference-First input |
| `apps/desktop/src/renderer/src/components/VNextGenerationWorkspace.tsx` | Reference First | active UI/workflow | CRITICAL | upload/mode/target state |
| `apps/desktop/src/main/reference-asset-resolver.ts` | Reference First | explicit resolver | CRITICAL | asset binding/provenance |
| `apps/desktop/src/main/image-generation/ipc.ts` | Image Generation | IPC registration | HIGH | runtime reachability |
| `apps/desktop/src/main/image-generation/vnext-service.ts` | Reference First | orchestration service | CRITICAL | compile/generate/evidence |
| `apps/desktop/src/main/image-generation/service.ts` | Generator | provider execution | CRITICAL | payload/run persistence |
| `packages/image-generation-contracts/src/index.ts` | Schema | shared contracts | CRITICAL | cross-layer compatibility |
| `packages/image-generation-runtime/src/vnext/index.js` | Compiler | public vNext exports | HIGH | route boundary |
| `packages/image-generation-runtime/src/vnext/compile.js` | Compiler | primary orchestrator | CRITICAL | mode/compiler selection |
| `packages/image-generation-runtime/src/vnext/task-contract.js` | Schema | task contract | CRITICAL | authority/route inputs |
| `packages/image-generation-runtime/src/vnext/prompt-compiler.js` | Compiler | fallback/non-space | CRITICAL | behavior-sensitive fallback |
| `packages/image-generation-runtime/src/vnext/seedream-adapter.js` | Provider | payload adapter | CRITICAL | reference/prompt payload |
| `packages/image-generation-runtime/src/space/index.js` | Space | public exports | HIGH | package boundary |
| `packages/image-generation-runtime/src/space/phase9b-source-adapter.js` | Space | source projection | CRITICAL | prompt source authority |
| `packages/image-generation-runtime/src/space/phase9b-space-compiler.js` | Space Compiler | current compiler | CRITICAL | final prompt |
| `packages/image-generation-runtime/src/space/space-reference-policy.js` | Reference First | reference policy | CRITICAL | explicit ref selection |
| `packages/image-generation-runtime/src/space/reference-boundary.js` | Reference First | behavior boundary | CRITICAL | cross-scene transfer |
| `packages/image-generation-runtime/src/space/product-policy.js` | Reference First | product capability | CRITICAL | effective references |
| `packages/image-generation-runtime/src/space/scene-projection/target-scene-projection.js` | Target Scene | projection | CRITICAL | target authority |
| `packages/image-generation-runtime/src/space/mode-boundary/mode-boundary-semantics.js` | Mode | Standard/Ref/Continuation | CRITICAL | semantic isolation |
| `packages/image-generation-runtime/src/space/gates/generation-route-integrity-gate.js` | Gate | compiler route | CRITICAL | fail-closed route |
| `packages/image-generation-runtime/src/space/gates/provider-prompt-gate.js` | Gate | provider prompt | CRITICAL | payload integrity |
| `packages/image-generation-runtime/src/space/semantic/validate-spatial-semantics.js` | Space Semantic | validation | CRITICAL | semantic safety |
| `packages/image-generation-runtime/src/space/semantic/rewrite-architecture-semantics.js` | Space Semantic | rewrite | CRITICAL | architecture behavior |
| `packages/image-generation-runtime/src/space/continuation/create-continuation-contract.js` | Continuation | contract | CRITICAL | lineage/program authority |
| `packages/image-generation-runtime/src/space/continuation/apply-continuation-program-override.js` | Continuation | target override | CRITICAL | source leakage prevention |
| `packages/image-generation-runtime/src/space/continuation/source-program-leakage-gate.js` | Continuation | leakage gate | CRITICAL | cross-scene correctness |
| `apps/desktop/src/renderer/src/components/ImageGenerationWorkspace.tsx` | Packaging | Standard UI | HIGH | source bundle V3 |
| `packages/image-generation-runtime/src/task-builder.js` | Packaging | task compiler/router | CRITICAL | v1/v2/v3 compatibility |
| `packages/image-generation-runtime/src/deliverables/deliverable-prompt-compiler.js` | Packaging Compiler | final prompt | CRITICAL | media-specific behavior |
| `packages/image-generation-runtime/src/deliverables/deliverable-reference-policy.js` | Packaging | reference policy | HIGH | structure/identity refs |
| `packages/model-registry/src/index.js` | Provider | model registry | HIGH | responsibility/protocol |
| `apps/desktop/src/main/settings-store.ts` | Config | profile persistence | HIGH | provider/runtime config |
| `packages/image-generation-adapter/src/multi-model.js` | Provider | shared adapters | HIGH | optional protocol routing |
| `packages/image-provider-dashscope/src/index.js` | Provider | Wan compatibility | HIGH | legacy adapter behavior |
| `schemas/image-generation/image-generation-task.schema.json` | Schema | task 1.0 | HIGH | legacy compatibility |
| `schemas/image-generation/image-generation-task-v2.schema.json` | Schema | task 2.0 | HIGH | migration compatibility |
| `schemas/image-generation/image-generation-task-v3.schema.json` | Schema | task 3.0 | CRITICAL | current task contract |
| `schemas/image-generation/image-generation-source-bundle-v3.schema.json` | Schema | source bundle 3.0 | CRITICAL | current Standard input |
| `schemas/image-generation/image-generation-run.schema.json` | Schema | persisted run | HIGH | recovery/retry |
| `schemas/image-generation/image-provider-capabilities.schema.json` | Schema | provider capability | HIGH | adapter gates |
| `space-generator/quality-baselines/r8.6/manifest.json` | Golden | frozen source baseline | CRITICAL | current parity identity |
| `space-generator/quality-baselines/r9-production/manifest.json` | Golden | production route | HIGH | compiler truth |
| `scripts/verify-space-r8.6-golden-boundary.mjs` | Gate | Golden protection | HIGH | baseline integrity |
| `apps/desktop/scripts/run-web-primary-smoke.mjs` | Smoke | Current Web Smoke | CRITICAL | Primary Acceptance |
| `scripts/verify-current-flows.mjs` | Gate | offline current flows | HIGH | release validation |

## Counts

The executable drift checker derives its path set from this table. At S1 creation the manifest contains 73 paths: 51 CRITICAL and 22 HIGH; MEDIUM 0. Counts must be recalculated if the table changes.
