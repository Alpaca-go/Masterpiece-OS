# Schema Baseline

| Schema/domain | Current role | Classification |
|---|---|---|
| `packages/runtime-core/src/application/model-schema/*` + analysis-runtime contracts | structured analysis parsing/validation/repair | ACTIVE |
| `packages/project-contracts/src/index.ts` | Visual Decision Packet, project context and generation contracts | ACTIVE |
| `packages/image-generation-contracts/src/index.ts` | reference/run/provider shared types; persisted vNext identifiers stay compatibility names | ACTIVE |
| `image-generation-source-bundle-v3.schema.json` | current Standard source bundle | ACTIVE |
| `image-generation-task-v3.schema.json` | current Packaging/Standard task | ACTIVE |
| `image-generation-task-v2.schema.json` | persisted task migration | COMPATIBILITY |
| `image-generation-task.schema.json` (`1.0`) | legacy task/run compatibility | LEGACY_DEPENDENCY |
| `image-generation-run.schema.json` | persisted run contract | ACTIVE / COMPATIBILITY |
| `source-context-snapshot-v2.schema.json` | persisted source context | ACTIVE |
| `image-provider-capabilities.schema.json` | provider capability gate | ACTIVE |
| project/reference context schemas at `schemas/*.schema.json` | context/reference validation | ACTIVE |
| creative-production schema `6.0` | current creative-session family contract | ACTIVE, independent namespace |

Schema numbers are domain-local. Product `5.0.0-rc.1`, the project config filename `masterpiece-os-v5.json`, task `3.0`, and creative schema `6.0` do not supersede one another. Analysis prompts on this tip are `apps/cli/prompts/analysis/`.

Migration and compatibility branches are baseline-sensitive; no schema normalization or removal is allowed in S1.
