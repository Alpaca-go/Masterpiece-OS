# S6 Current Authority Map

Date: 2026-08-12

| Capability | Current authority | Current path | Current consumers | Historical predecessor / compatibility | Golden coverage | Target semantic namespace |
|---|---|---|---|---|---|---|
| Project Runtime | Node Runtime Host | `apps/web-runtime/src/node-runtime-host.ts` | Web RPC | Removed Desktop/Electron host | Web smoke | `web-runtime` |
| Operation Dispatch | Current operation graph + shared operations | `apps/web-runtime/src/current-operation-graph.ts`, `packages/runtime-core/src/operations` | Node Host, Web API | vnext channel aliases | Web smoke | `operations` |
| Visual Analysis | analysis pipeline engine | `apps/cli/src/v5`, `pipeline-service.ts` | CLI, PipelineService | `masterpiece-os-v5.json` | unit/CLI/Golden | `analysis-engine` |
| Document Context | DocumentContextService | `packages/runtime-core/src/application/document-context-service.ts` | operation graph | legacy run adapter | runtime tests | `document-context` |
| Project Visual Context | structured visual-context builder/service | `project-context-vnext-builder.ts`, `project-context-service.ts` | pipeline, generation | persisted `.vnext.json` and API names | runtime/Golden | `project-visual-context` |
| Reference First | reconstruction + closure | `reference-first-reconstruction.ts`, `reference-first-beta-closure.ts` | project context, generation | legacy reference roles | runtime/Golden | `reference-first` |
| Formal Generation Orchestration | short-chain generation service | `image-generation/vnext-service.ts` | formal Web workspace, operation graph | `vnext-*` protocol/artifacts | runtime/Golden | `short-chain-generation` |
| Space Generation | Space compiler | `image-generation-runtime/src/space/phase9b-space-compiler.js` | short-chain orchestrator | mode/trace IDs | G01-G05 | `space/compiler` |
| Continuation | continuation contract + target-scene projection | `src/space/continuation`, `src/space/scene-projection` | Space compiler/orchestrator | R11.x provenance | G04/G05 | `space/continuation` |
| Packaging | short-chain prompt compiler + packaging contract | `src/vnext/prompt-compiler.js`, `src/prompt-contracts/packaging-contract.js` | orchestrator | schema/protocol versions | Golden | `generation/prompt-compiler` + `packaging` |
| Utility Image Generation | ImageGenerationService | `image-generation/service.ts` | reference/document preview, creative helpers | `legacy|vnext` persisted setting | runtime tests | `image-generation/service` |
| Creative Production | creative production services | `packages/runtime-core/src/application/creative-production-*` | operation graph | schema V6/V18 compatibility | runtime tests | `creative-production` |
| Provider Selection | provider registry + credential-selected adapters | runtime service/provider packages | analysis and generation services | provider/model external versions | offline adapter tests | `providers` |
| Prompt Compilation | analysis prompt builder; generation compiler by deliverable family | CLI prompt builder; image runtime orchestrator/compiler | analysis and generation | prompt/schema version fields | CLI/Golden | `analysis-prompts`; `generation` |
| Runtime Configuration | Node settings store + runtime paths | `apps/web-runtime/src/node-settings-store.ts`, `runtime-paths.ts` | Node Host/services | persisted mode values | Web smoke | `runtime-settings` |
| Credentials | Node credential store | `apps/web-runtime/src/node-credential-store.ts` | provider factories | environment/profile compatibility | Web smoke | `credentials` |
| CLI | Masterpiece CLI entry + analysis engine | `apps/cli/bin/masterpiece-os.js`, `apps/cli/src/v5/bootstrap.js` | shell users | config filename | CLI tests | `cli` + `analysis-engine` |

## Authority decision

Every required capability has exactly one current implementation authority.

- `r8_6_golden` and `phase9b_quality` are aliases selecting the same Space compiler.
- the legacy Space path is an explicit compatibility/debug route, not a current production authority.
- generic image generation serves preview/helper flows; short-chain generation owns the formal creative flow.
- persisted `vnext` names describe compatibility contracts and artifacts, not a second implementation.

Result: `Current Authority Conflict = 0`; `S6_AUTHORITY_CONFLICT` is not triggered. S6-D may proceed.

