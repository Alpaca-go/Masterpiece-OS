# Baseline Files Manifest

Content PIN: `deb1cba8b40b22bf9c026ae5ec40f5b46389d6e2` (commit exists).  
Recovery tag `masterpiece-reference-first-stable-2026-08` and branch `codex/r10-4-regression-repair` are absent on origin. Pending a Kyries decision. Do not invent a replacement anchor.

Paths below are repository-relative locations on tip `codex/visual-migration-vm1-integration-freeze`. The manifest records sensitivity of the files that exist now. It does not authorize renaming compatibility identifiers (`phase9b-quality-compiler`, `vnext-1.0`, `r8_6_golden`, `phase9b_quality`, `vnext_legacy`, `masterpiece-os-v5.json`). Those identifiers may still appear in `config/repository-contract/compatibility-registry.json` and in code after their old filenames moved.

`node scripts/audit/check-baseline-drift.mjs` parses the table below and diffs those paths against the content PIN. Drift against that pin is expected for files that moved or changed after 2026-08-11. It is not a reset instruction.

Absent as current entries (not listed in the table): `apps/desktop/**`, `apps/cli/src/v5/**`, `apps/cli/prompts/v5/**`, `packages/image-generation-runtime/src/vnext/**`, and filenames `phase9b-space-compiler.js` / `phase9b-source-adapter.js`. Desktop was removed in S5. This tip has no `apps/desktop/out/`.

| Path | Domain | Role | Criticality | Why |
|---|---|---|---|---|
| `VERSION` | Product | version source | CRITICAL | release identity |
| `package.json` | Runtime/Build | workspace commands | HIGH | Web/test/gate entrypoints |
| `apps/web-runtime/package.json` | Runtime | Web host commands | HIGH | dev and smoke scripts |
| `apps/web/vite.config.mjs` | Web | renderer proxy | CRITICAL | renderer and RPC proxy |
| `apps/web-runtime/scripts/run-web-dev.mjs` | Web | primary start | HIGH | sets Web runtime mode |
| `apps/web/src/main.tsx` | Web | renderer entry | CRITICAL | application mount |
| `apps/web/src/App.tsx` | Web | primary shell/routes | CRITICAL | active product flow |
| `apps/web/src/web-api.ts` | Web RPC | browser RPC client | CRITICAL | channel mapping |
| `apps/web-runtime/src/local-rpc-server.ts` | Web RPC | WebSocket RPC server | CRITICAL | browser/backend boundary |
| `apps/web-runtime/src/node-runtime-host.ts` | Runtime Host | service host | CRITICAL | shared backend entry |
| `apps/web-runtime/src/main.ts` | Runtime Host | process entry | CRITICAL | Node host boot |
| `apps/web-runtime/src/current-operation-graph.ts` | Operations | dispatch | HIGH | operation reachability |
| `apps/web-runtime/src/runtime-paths.ts` | Config | prompt root default | HIGH | analysis prompt location |
| `packages/runtime-core/src/application/pipeline-service.ts` | Analysis | pipeline entry | CRITICAL | analysis behavior/provider |
| `apps/cli/src/analysis-engine/bootstrap.js` | Analysis | analysis pipeline | CRITICAL | dynamic analysis dependency |
| `apps/cli/src/analysis-engine/creative-director/prompt-builder.js` | Analysis Prompt | prompt assembly | CRITICAL | behavior-sensitive ordering |
| `apps/cli/prompts/analysis/deep-creative-director.md` | Analysis Prompt | system behavior | CRITICAL | analysis authority |
| `apps/cli/prompts/analysis/benchmark-instructions.md` | Analysis Prompt | benchmark instructions | CRITICAL | evidence behavior |
| `apps/cli/prompts/analysis/execution-core-template.md` | Analysis Prompt | execution contract | CRITICAL | report behavior |
| `apps/cli/prompts/analysis/report-schema.md` | Analysis Prompt | output structure | CRITICAL | parsing contract |
| `packages/model-runtime/src/qwen-reasoner.js` | Analysis Provider | Qwen request adapter | CRITICAL | model calls/attachments |
| `packages/model-runtime/src/analysis-provider-registry.js` | Analysis Provider | provider dispatch | HIGH | reasoner selection |
| `packages/runtime-core/src/application/provider-policy.js` | Analysis Provider | default policy | CRITICAL | default/alternative provider |
| `packages/model-runtime/src/response-parser.js` | Analysis | structured parser | CRITICAL | output interpretation |
| `packages/model-runtime/src/model-capabilities.js` | Analysis | capability policy | HIGH | request compatibility |
| `packages/analysis-runtime/src/index.ts` | Analysis | runtime exports | HIGH | validation/repair boundary |
| `packages/analysis-runtime/src/schema-validator.ts` | Analysis Schema | validation | CRITICAL | fail-closed behavior |
| `packages/analysis-runtime/src/structured-repair-runner.ts` | Analysis Repair | repair loop | CRITICAL | retry/repair behavior |
| `packages/runtime-core/src/application/analysis-contract.ts` | Analysis | report contract | CRITICAL | report validation |
| `packages/runtime-core/src/application/model-schema/schema-registry.ts` | Analysis Schema | registry | CRITICAL | schema selection |
| `packages/runtime-core/src/application/model-schema/validation-issues.ts` | Analysis Repair | issue/repair contract | HIGH | failure semantics |
| `packages/runtime-core/src/application/visual-decision-packet.ts` | Project Context | packet bridge | CRITICAL | generation grounding |
| `packages/runtime-core/src/application/project-visual-context-builder.ts` | Project Context | visual context | CRITICAL | generation input |
| `packages/runtime-core/src/application/reference-first-reconstruction.ts` | Reference First | capability authority | CRITICAL | reference-first behavior |
| `apps/web/src/pages/ShortChainPage.tsx` | Reference First | formal creative UI | CRITICAL | short-chain workspace |
| `apps/web/src/components/ReferenceAnchorWorkspace.tsx` | Reference First | reference intake UI | HIGH | browser reference intake |
| `packages/image-generation-runtime/src/reference-engine/reference-asset-resolver.ts` | Reference First | explicit resolver | CRITICAL | asset binding/provenance |
| `packages/runtime-core/src/application/image-generation/short-chain-service.ts` | Reference First | orchestration service | CRITICAL | compile/generate/evidence |
| `packages/runtime-core/src/application/image-generation/service.ts` | Generator | provider execution | CRITICAL | payload/run persistence |
| `packages/image-generation-contracts/src/index.ts` | Schema | shared contracts | CRITICAL | cross-layer compatibility |
| `packages/image-generation-runtime/src/generation/index.js` | Compiler | public generation exports | HIGH | route boundary |
| `packages/image-generation-runtime/src/generation/compile.js` | Compiler | primary orchestrator | CRITICAL | mode/compiler selection |
| `packages/image-generation-runtime/src/generation/task-contract.js` | Schema | task contract | CRITICAL | authority/route inputs |
| `packages/image-generation-runtime/src/generation/prompt-compiler.js` | Compiler | non-space and legacy space prompt | CRITICAL | behavior-sensitive fallback |
| `packages/image-generation-runtime/src/generation/seedream-adapter.js` | Provider | payload adapter | CRITICAL | reference/prompt payload |
| `packages/image-generation-runtime/src/space/index.js` | Space | public exports | HIGH | package boundary |
| `packages/image-generation-runtime/src/space/source-adapter.js` | Space | source projection | CRITICAL | prompt source authority |
| `packages/image-generation-runtime/src/space/compiler.js` | Space Compiler | current compiler | CRITICAL | final prompt |
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
| `apps/web/src/components/ImageGenerationWorkspace.tsx` | Packaging | image-generation screen | HIGH | source bundle V3 screen |
| `apps/web/src/features/packaging/PackagingWorkspace.tsx` | Packaging | packaging workspace | HIGH | packaging UI |
| `packages/image-generation-runtime/src/prompt-contracts/packaging-contract.js` | Packaging | capability authority | CRITICAL | packaging contract |
| `packages/image-generation-runtime/src/task-builder.js` | Packaging | task compiler/router | CRITICAL | v1/v2/v3 compatibility |
| `packages/image-generation-runtime/src/deliverables/deliverable-prompt-compiler.js` | Packaging Compiler | final prompt | CRITICAL | media-specific behavior |
| `packages/image-generation-runtime/src/deliverables/deliverable-reference-policy.js` | Packaging | reference policy | HIGH | structure/identity refs |
| `packages/model-registry/src/index.js` | Provider | model registry | HIGH | responsibility/protocol |
| `apps/web-runtime/src/node-settings-store.ts` | Config | profile persistence | HIGH | provider/runtime config |
| `packages/image-generation-adapter/src/multi-model.js` | Provider | shared adapters | HIGH | optional protocol routing |
| `packages/image-provider-dashscope/src/index.js` | Provider | Wan compatibility | HIGH | legacy adapter behavior |
| `schemas/image-generation/image-generation-task.schema.json` | Schema | task 1.0 | HIGH | legacy compatibility |
| `schemas/image-generation/image-generation-task-v2.schema.json` | Schema | task 2.0 | HIGH | migration compatibility |
| `schemas/image-generation/image-generation-task-v3.schema.json` | Schema | task 3.0 | CRITICAL | current task contract |
| `schemas/image-generation/image-generation-source-bundle-v3.schema.json` | Schema | source bundle 3.0 | CRITICAL | current Standard input |
| `schemas/image-generation/image-generation-run.schema.json` | Schema | persisted run | HIGH | recovery/retry |
| `schemas/image-generation/image-provider-capabilities.schema.json` | Schema | provider capability | HIGH | adapter gates |
| `space-generator/quality-baselines/current-verification/space-golden/manifest.json` | Golden | frozen source baseline | CRITICAL | current parity identity |
| `space-generator/quality-baselines/current-verification/production-route/manifest.json` | Golden | production route | HIGH | compiler truth |
| `scripts/verify-space-golden-boundary.mjs` | Gate | Golden protection | HIGH | baseline integrity |
| `apps/web-runtime/scripts/run-web-primary-smoke.mjs` | Smoke | Current Web Smoke | CRITICAL | Primary Acceptance |
| `scripts/verify-current-flows.mjs` | Gate | offline current flows | HIGH | release validation |

## Counts

The executable drift checker derives its path set from this table. On this tip the manifest contains 81 paths: 55 CRITICAL and 26 HIGH; MEDIUM 0. Counts must be recalculated if the table changes.
