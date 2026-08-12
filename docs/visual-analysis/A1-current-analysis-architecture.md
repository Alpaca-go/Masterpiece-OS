# A1 Current Visual Analysis Architecture

Status: audited from commit `5436664b7293df5b768575cf4adaa2d4219131a6` before Provider extraction.

## Current call path

```text
Web App / selected Analysis API Profile
  -> Shared Operation Registry (`analysis:start`)
  -> Node Runtime Host
  -> Runtime Services / PipelineService
  -> existing Settings + encrypted Credential authorities
  -> analysis-engine bootstrap
  -> frozen analysis Prompt builder and Prompt files
  -> Qwen reasoner
  -> response parser + analysis validation/repair
  -> report + run report + Visual Decision Packet + Project Visual Context
  -> Project Runtime / Reference First / Space / Packaging
```

## Responsibility audit

| Component | Current path | Responsibility | Classification | Consumer |
|---|---|---|---|---|
| Web selection | `apps/web/src/App.tsx` | Select an enabled analysis Profile | PROVIDER_NEUTRAL | Pipeline start operation |
| Operation routing | `apps/web-runtime/src/current-operation-graph.ts` | Route `analysis:*` operations | PROVIDER_NEUTRAL | Node Runtime Host |
| Settings | `apps/web-runtime/src/node-settings-store.ts` | Profile, protocol and model configuration | PROVIDER_NEUTRAL | Runtime services |
| Credentials | `apps/web-runtime/src/node-credential-store.ts` | Encrypted API key authority | PROVIDER_NEUTRAL | Settings credential reader |
| Analysis workflow | `packages/runtime-core/src/application/pipeline-service.ts` | Preparation, execution, validation, artifacts and handoff | PROVIDER_NEUTRAL | Web analysis operation |
| Pipeline engine | `apps/cli/src/analysis-engine/bootstrap.js` | Canonical one-shot analysis pipeline | PROVIDER_NEUTRAL | PipelineService and CLI |
| Prompt assembly | `apps/cli/src/analysis-engine/creative-director/prompt-builder.js` | Select and compile canonical instructions | PROVIDER_NEUTRAL | analysis-engine |
| Frozen Prompts | `apps/cli/prompts/analysis/*` | Analysis methodology and output contract | PROVIDER_NEUTRAL | Prompt builder |
| Qwen reasoner | `packages/model-runtime/src/qwen-reasoner.js` | Endpoint, auth, request/image encoding, invocation, envelope parsing | PROVIDER_SPECIFIC | pre-A1 PipelineService and CLI |
| Structured parser | `packages/model-runtime/src/response-parser.js` | Parse model structured output | PROVIDER_NEUTRAL | Runtime validation |
| Validation/repair | `packages/analysis-runtime/src/*`, Runtime model schema | Fail-closed business result validation and repair | PROVIDER_NEUTRAL | PipelineService |
| Persistence | `pipeline-service.ts`, project/context services | Persist reports and canonical artifacts | PROVIDER_NEUTRAL | Current downstream |

Qwen coupling points before extraction were the two reasoner constructions in `PipelineService`, plus four shared services using the same reasoner factory. CLI Qwen selection is an explicit headless entry and remains separate. Unknown ownership after audit: 0; no unclear code was moved.
