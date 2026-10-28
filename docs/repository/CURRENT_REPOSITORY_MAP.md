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
│  └─ src/operations                business operation modules
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
├─ config/repository-contract/compatibility-registry.json
│  identifiers, with consumer paths that exist on this tip
├─ mode aliases r8_6_golden, phase9b_quality, vnext_legacy
│  in packages/image-generation-runtime/src/generation/compile.js
├─ compiler id phase9b-quality-compiler
│  in packages/image-generation-runtime/src/space/compiler.js
├─ persisted project/run/settings version identifiers (including vnext-1.0)
└─ explicit legacy adapters and migrations

HISTORICAL / FIXTURE / ARCHIVE
├─ historical phase/release reports
├─ evaluation and Golden assets
├─ space-generator archaeology/isolated experiments
└─ existing archive topology
```

## Five-minute navigation

- Independent material → analysis → report → generation workflow: `packages/visual-workflow/src/service.js`; Web entry `/visual-workflow`, owned UI `apps/web/src/features/visual-workflow`. This capability has its own source, prompts, settings, credentials and data. Planning/migration cannot consume it; see `docs/runtime/independent-visual-workflow.md`.
- Visual Analysis: `packages/runtime-core/src/application/pipeline-service.ts`, `apps/cli/src/analysis-engine`, `apps/cli/prompts/analysis`
- Space orchestration: `packages/image-generation-runtime/src/generation/compile.js`
- Space compiler file: `packages/image-generation-runtime/src/space/compiler.js`
- Reference First: `packages/runtime-core/src/application/reference-first-*`
- Project visual context: `packages/runtime-core/src/application/project-visual-context-builder.ts`
- Formal creative flow: `packages/runtime-core/src/application/image-generation/short-chain-service.ts`
- Space Generator: `packages/image-generation-runtime/src/space`
- Packaging prompt compiler: `packages/image-generation-runtime/src/generation/prompt-compiler.js`
- Packaging contract: `packages/image-generation-runtime/src/prompt-contracts/packaging-contract.js`
- Providers: `packages/image-provider-*` and `packages/model-*`
- Node Host: `apps/web-runtime/src/node-runtime-host.ts`
- Tests: root `tests`, app-local test directories
- Historical implementations/evidence: historical docs, evaluation, and isolated archaeology; never import them from production.
- Web smoke: `apps/web-runtime/scripts/run-web-primary-smoke.mjs`

`packages/image-generation-runtime/src/vnext/` is not a directory on this tip. `apps/desktop/` was removed in S5 and is not on this tip.

## Identifier glossary

Compatibility identifiers can remain registered and emitted after the old filenames moved. Navigate by the current path. Keep the identifier.

| Identifier | Where it still lives | Current path |
|---|---|---|
| `phase9b-quality-compiler` | compiler id in code | `packages/image-generation-runtime/src/space/compiler.js` |
| `r8_6_golden`, `phase9b_quality`, `vnext_legacy` | `MASTERPIECE_SPACE_COMPILER_MODE` aliases | `packages/image-generation-runtime/src/generation/compile.js` |
| `vnext-1.0` | persisted run contract | `packages/runtime-core/src/application/image-generation/short-chain-service.ts` |
| `masterpiece-os-v5.json` | project-local config filename | `apps/cli/src/analysis-engine/bootstrap.js` |
| `project-visual-context.vnext.json` | persisted project contract | `packages/runtime-core/src/application/project-context-service.ts` |

The registry is `config/repository-contract/compatibility-registry.json`. This map does not change it.

## Governance sources

- Product version and compatibility navigation:
  `docs/repository/CURRENT_VERSION_AND_COMPATIBILITY.md`
- Current capability authorities:
  `config/repository-contract/current-authorities.json`
- Persisted compatibility identifiers:
  `config/repository-contract/compatibility-registry.json`
- Historical S0 version topology:
  `docs/history/stabilization/history/S0-version-registry-2026-08-11.md`
- Retired cleanup batches recoverable through Git:
  `docs/repository/CLEANUP_MANIFEST_2026-08-26.md`
