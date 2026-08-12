# Current Namespace Dictionary

Use capability names to navigate current code.

| Capability | Current namespace/path | Do not navigate by |
|---|---|---|
| Web UI | `apps/web` | Desktop, vNext |
| Node Host | `apps/web-runtime` | Electron Main |
| Visual Analysis | `apps/cli/src/analysis-engine` | CLI v5 |
| Analysis prompts | `apps/cli/prompts/analysis` | prompts/v5 |
| Runtime services | `packages/runtime-core/src/application` | implementation generations |
| Operation dispatch | `packages/runtime-core/src/operations` | IPC generations |
| Project visual context | `project-visual-context-builder.ts`, `project-context-service.ts` | project-context-vnext |
| Formal creative generation | `image-generation/short-chain-service.ts` | vnext-service |
| Generation compiler/orchestrator | `packages/image-generation-runtime/src/generation` | src/vnext |
| Space compiler | `packages/image-generation-runtime/src/space/compiler.js` | Phase9B/R8.6/R9 |
| Space source adapter | `packages/image-generation-runtime/src/space/source-adapter.js` | Phase9B adapter |
| Continuation | `src/space/continuation`, `src/space/scene-projection` | R11/R11.2 |
| Packaging | `src/prompt-contracts/packaging-contract.js` plus generation prompt compiler | vNext packaging |
| Providers | `packages/model-*`, `packages/image-provider-*` | model generation labels |
| Current tests | root `tests`, `apps/cli/tests/analysis-engine`, Web Runtime tests | v5/vNext current test families |
| Historical/evaluation | `docs` historical reports, `evaluation`, `space-generator` archaeology/experiments | current production |

Compatibility identifiers such as `.vnext.json`, `vnext-1.0`, `r8_6_golden`, and schema versions are not current namespaces.

