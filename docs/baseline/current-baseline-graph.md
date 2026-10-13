# Current Baseline Dependency Graph

Paths below are the tip of `codex/visual-migration-vm1-integration-freeze`. Desktop was removed in S5. This tip has no `apps/desktop/` tree.

```text
WEB PRIMARY
|-- start: package.json -> apps/web-runtime/scripts/run-web-dev.mjs
|-- renderer: apps/web/src/main.tsx -> App.tsx -> web-api.ts
|-- runtime host: apps/web-runtime/src/node-runtime-host.ts
|   |-- local-rpc-server.ts
|   |-- current-operation-graph.ts
|   `-- node-native-operations.ts
|   |
|   |-- VISUAL ANALYSIS
|   |   `-- packages/runtime-core/src/application/pipeline-service.ts
|   |       |-- model-runtime analysis-provider-registry.js
|   |       |-- dynamic import apps/cli/src/analysis-engine/bootstrap.js
|   |       |-- apps/cli/prompts/analysis
|   |       `-- analysis-runtime + runtime-core model-schema + project context
|   |
|   |-- REFERENCE FIRST
|   |   `-- apps/web Short-Chain + ReferenceAnchorWorkspace
|   |       -> reference-engine/reference-asset-resolver.ts
|   |       -> image-generation/short-chain-service.ts
|   |       -> reference-first-reconstruction.ts
|   |       -> generation/compile.js
|   |       -> space policy, target authority and gates
|   |       -> space/compiler.js
|   |       -> generation/seedream-adapter.js
|   |       -> image-generation/service.ts
|   |
|   |-- PACKAGING
|   |   `-- Short-Chain packaging family
|   |       + ImageGenerationWorkspace.tsx
|   |       + features/packaging/PackagingWorkspace.tsx
|   |       -> image-generation/service.ts
|   |       -> task-builder.js (source bundle 3.0)
|   |       -> deliverable-prompt-compiler.js
|   |       -> prompt-contracts/packaging-contract.js
|   |       -> generation/prompt-compiler.js
|   |       -> provider adapter
|   |
|   `-- CONFIG/SCHEMA
|       |-- node-settings-store + model-registry
|       |-- project/image-generation contracts
|       `-- task v1/v2 compatibility -> task v3 current
|
`-- CURRENT WEB SMOKE
    `-- apps/web-runtime/scripts/run-web-primary-smoke.mjs
```

Space mode aliases inside the Reference-First / Space branch:

```text
generation/compile.js
  -> default r8_6_golden and alias phase9b_quality
     -> space/compiler.js (compiler id phase9b-quality-compiler)
  -> vnext_legacy
     -> generation/prompt-compiler.js
  -> continuation and target-scene projection under space/
```

`r8_6_golden`, `phase9b_quality`, and `vnext_legacy` are mode aliases. `phase9b-quality-compiler` is a compiler id. They are not filenames on this tip.
