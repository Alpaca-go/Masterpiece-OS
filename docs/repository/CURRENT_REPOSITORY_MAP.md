# Current Repository Map

```text
CURRENT
├─ apps/web                         Web Renderer, only production UI
├─ apps/web-runtime                 Node Host, RPC, credentials, native operations
├─ apps/cli
│  ├─ src/analysis-engine           Visual Analysis engine
│  └─ prompts/analysis              Current analysis prompts
├─ packages/runtime-core
│  ├─ src/application               services, persistence and orchestration
│  │  └─ image-generation
│  │     ├─ short-chain-service.ts  formal creative generation
│  │     ├─ deliverable-validator-service.ts
│  │     ├─ similarity-audit-service.ts
│  │     └─ evidence-scanner.ts
│  └─ src/operations                136 business operations
├─ packages/image-generation-runtime
│  └─ src
│     ├─ generation                 task routing/orchestration/compiler/adapters
│     └─ space
│        ├─ compiler.js             single production Space compiler
│        ├─ source-adapter.js
│        ├─ continuation
│        └─ scene-projection
└─ packages/*                       contracts, analysis, providers and other Core capabilities

COMPATIBILITY
├─ image-generation-runtime/src/vnext/index.js
├─ persisted project/run/settings version identifiers
└─ explicit legacy adapters and migrations

HISTORICAL / FIXTURE / ARCHIVE
├─ historical phase/release reports
├─ evaluation and Golden assets
├─ space-generator archaeology/isolated experiments
└─ existing archive topology
```

## Five-minute navigation

- Visual Analysis: `apps/cli/src/analysis-engine`
- Reference First: `packages/runtime-core/src/application/reference-first-*`
- Project visual context: `project-visual-context-builder.ts`
- Formal creative flow: `image-generation/short-chain-service.ts`
- Space Generator: `image-generation-runtime/src/space`
- Packaging prompt compiler: `image-generation-runtime/src/generation/prompt-compiler.js`
- Providers: `packages/image-provider-*` and `packages/model-*`
- Node Host: `apps/web-runtime/src/node-runtime-host.ts`
- Tests: root `tests`, app-local test directories
- Historical implementations/evidence: historical docs, evaluation, and isolated archaeology; never import them from production.

## Governance sources

- Product version and compatibility navigation:
  `docs/repository/CURRENT_VERSION_AND_COMPATIBILITY.md`
- Current capability authorities:
  `config/repository-contract/current-authorities.json`
- Persisted compatibility identifiers:
  `config/repository-contract/compatibility-registry.json`
- Historical S0 version topology:
  `docs/repository-stabilization/history/S0-version-registry-2026-08-11.md`
- Retired cleanup batches recoverable through Git:
  `docs/repository/CLEANUP_MANIFEST_2026-08-26.md`
