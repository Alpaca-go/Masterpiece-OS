# Current Baseline Dependency Graph

```text
WEB PRIMARY
|-- start: package.json -> apps/desktop/scripts/run-web-dev.mjs
|-- renderer: main.tsx -> App.tsx -> web-api.ts
|-- runtime host: web-rpc-server.ts -> main/index.ts
|   |
|   |-- VISUAL ANALYSIS
|   |   `-- pipeline-service.ts
|   |       |-- model-runtime/qwen-reasoner.js (qwen3.6-plus default)
|   |       |-- dynamic CLI src/v5/bootstrap.js -> prompts/v5
|   |       `-- analysis-runtime + model-schema + project context
|   |
|   |-- REFERENCE FIRST
|   |   `-- VNextGenerationWorkspace.tsx
|   |       -> reference-asset-resolver.ts
|   |       -> image-generation/vnext-service.ts
|   |       -> runtime/vnext/compile.js
|   |       -> runtime/space policy, target authority and gates
|   |       -> phase9b-space-compiler.js
|   |       -> seedream-adapter.js -> image-generation/service.ts
|   |
|   |-- PACKAGING
|   |   `-- ImageGenerationWorkspace.tsx
|   |       -> image-generation/service.ts
|   |       -> task-builder V3
|   |       -> deliverable-prompt-compiler.js
|   |       -> provider adapter
|   |
|   `-- CONFIG/SCHEMA
|       |-- settings-store + model-registry
|       |-- project/image-generation contracts
|       `-- task v1/v2 compatibility -> task v3 current
|
`-- CURRENT WEB SMOKE
    `-- apps/desktop/scripts/run-web-primary-smoke.mjs
```

Space lineage inside the Reference-First branch:

```text
R8.6 Golden identity <-> R9 production Phase9B module
  -> R10 route/semantic/Reference-First repairs
  -> R11 continuation
  -> R11.2 target-scene authority
  -> current vnext orchestration
```
