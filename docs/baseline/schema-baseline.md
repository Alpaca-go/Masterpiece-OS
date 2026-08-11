# Schema Baseline

| Schema/domain | Current role | Classification |
|---|---|---|
| Desktop `model-schema/*` + analysis-runtime contracts | structured analysis parsing/validation/repair | ACTIVE |
| `packages/project-contracts/src/index.ts` | Visual Decision Packet, project context and generation contracts | ACTIVE |
| `packages/image-generation-contracts/src/index.ts` | vNext/reference/run/provider shared types | ACTIVE |
| `image-generation-source-bundle-v3.schema.json` | current Standard source bundle | ACTIVE |
| `image-generation-task-v3.schema.json` | current Packaging/Standard task | ACTIVE |
| `image-generation-task-v2.schema.json` | persisted task migration | COMPATIBILITY |
| `image-generation-task.schema.json` (`1.0`) | legacy task/run compatibility | LEGACY_DEPENDENCY |
| `image-generation-run.schema.json` | persisted run contract | ACTIVE / COMPATIBILITY |
| `source-context-snapshot-v2.schema.json` | persisted source context | ACTIVE |
| `image-provider-capabilities.schema.json` | provider capability gate | ACTIVE |
| project/reference context schemas at `schemas/*.schema.json` | context/reference validation | ACTIVE |
| creative-production schema `6.0` | current creative-session family contract | ACTIVE, independent namespace |

Schema numbers are domain-local. Product `5.0.0-rc.1`, CLI `v5`, task `3.0` and creative schema `6.0` do not supersede one another.

Migration and compatibility branches are baseline-sensitive; no schema normalization or removal is allowed in S1.
