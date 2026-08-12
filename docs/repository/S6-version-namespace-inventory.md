# S6 Version Namespace Inventory

Date: 2026-08-12  
Entry commit: `9498019f9ec27e9bc22904784bf5159eb4a773a9`  
Method: tracked-path search, static import/export tracing, dynamic import tracing, configuration and environment lookup, operation-graph reachability, test/script/Golden references, and persisted-artifact review.

## Classification summary

| Classification | Namespace families | Decision |
|---|---:|---|
| CURRENT | 5 | Rename current implementation identities to semantic names. |
| COMPATIBILITY | 8 | Preserve serialized values, public operation aliases, migrations, and explicit legacy adapters. |
| HISTORICAL | 4 | Keep historical truth; do not make reachable from production. |
| ARCHIVE | 2 | Keep unchanged in the existing archive topology. |
| FIXTURE | 6 | Keep evidence and baseline names unchanged. |
| DOCUMENTATION | 3 | Keep phase/release chronology in historical documents. |
| EXTERNAL_VERSION | 4 | Out of scope. |
| UNKNOWN | 0 | All current-reachable matches have an owner. |

## Inventory

### 1. CLI `v5` implementation

- Namespace: `apps/cli/src/v5`, `runV5Pipeline`, `apps/cli/tests/v5`
- Type: CURRENT
- Current consumers: `apps/cli/bin/masterpiece-os.js`; `packages/runtime-core/src/application/pipeline-service.ts`
- Dynamic consumers: the pipeline service dynamically imports `apps/cli/src/v5/bootstrap.js`.
- Tests/scripts: CLI test glob and `verify-current-flows.mjs` reference `tests/v5`.
- Golden dependency: indirect through the current analysis/report path; no Golden path is dynamically resolved from the name.
- Prompt dependency: resolves the current prompt root described below.
- Persisted/config dependency: default project config filename `masterpiece-os-v5.json` is persisted compatibility data.
- Historical meaning: fifth implementation generation of the analysis engine.
- Current meaning: the only current visual-analysis engine.
- Action: RENAME implementation/test namespaces; preserve the persisted config filename through compatibility lookup.

### 2. Prompt directory `prompts/v5`

- Namespace: `apps/cli/prompts/v5`
- Type: CURRENT
- Current consumers: `apps/cli/src/v5/creative-director/prompt-builder.js`; Node Host runtime paths.
- Dynamic/config consumers: `MASTERPIECE_PROMPT_ROOT`; default `apps/cli/prompts/v5` in `apps/web-runtime/src/runtime-paths.ts`.
- Tests: CLI prompt-builder and report-contract suites.
- Golden dependency: prompt content contributes to current output; content and selection must remain byte-for-byte stable during the move.
- Persisted dependency: none; the filesystem path is runtime configuration, not project schema.
- Historical meaning: prompt contract introduced with CLI v5.
- Current meaning: the sole current analysis prompt set.
- Action: RENAME directory to a semantic analysis prompt namespace and update path resolution only.

### 3. Image-generation `vnext` implementation namespace

- Namespace: `packages/image-generation-runtime/src/vnext`, `compileVNextImageGeneration`, `VNext*` implementation symbols
- Type: CURRENT
- Current consumers: runtime-core image generation service, Web creative workspace, package root export, tests and production audit scripts.
- Dynamic consumers: none; imports are static.
- Config consumers: the `vnext_legacy` Space mode enters the non-Space/legacy compiler branch but does not own the current Space compiler.
- Golden dependency: direct; compilation traces, prompt digests, and G01-G05 cover this path.
- Prompt dependency: contains current short-chain task routing, packaging prompt compilation, and provider adapter composition.
- Persisted dependency: `vnext-1.0`, `pipelineMode: vnext`, `image-generation-vnext`, and `project-visual-context.vnext.json` are serialized compatibility identifiers.
- Historical meaning: successor generation name.
- Current meaning: current short-chain generation orchestration shared by Space, Packaging, VI, and Poster.
- Action: RENAME implementation paths and internal symbols; preserve serialized/public compatibility identifiers and provide explicit one-way aliases where required.

### 4. Space `phase9b` implementation names

- Namespace: `phase9b-space-compiler.js`, `phase9b-source-adapter.js`, `compilePhase9bSpacePrompt`, `adaptPhase9bSource`, `phase9b-quality-compiler`
- Type: CURRENT for implementation files/symbols; COMPATIBILITY for emitted compiler ID.
- Current consumers: `src/space/index.js`; the short-chain generation orchestrator.
- Scripts: `run-ab-smoke.mjs` and `verify-phase9b-space-baseline.mjs`.
- Golden dependency: direct; active route baseline expects the emitted compiler ID.
- Prompt dependency: direct deterministic Space prompt compilation.
- Current meaning: the one production Space compiler and its source adapter.
- Action: RENAME files and implementation symbols; keep emitted IDs as compatibility/provenance fields.

### 5. `R8.6`, `r8_6_golden`, `phase9b_quality`, `R9`

- Namespace: Space compiler mode strings, comments, quality baselines, scripts, evidence.
- Type: COMPATIBILITY for mode strings and trace fields; FIXTURE for Golden/baseline evidence; DOCUMENTATION for chronology.
- Current consumers: `resolveSpaceCompilerMode`, route-integrity gates, active baseline.
- Config consumers: `MASTERPIECE_SPACE_COMPILER_MODE` accepts `r8_6_golden`, `phase9b_quality`, and `vnext_legacy`.
- Authority result: `r8_6_golden` and `phase9b_quality` both resolve to the same compiler implementation. They are not two current authorities.
- Action: keep accepted values and emitted trace identifiers; expose a semantic default internally; isolate compatibility parsing.

### 6. `R10`, `R11`, `R11.1`, `R11.2`, `R12`

- Namespace: comments, test names, evaluation assets, quality reports, continuation/mode-boundary provenance.
- Type: FIXTURE, HISTORICAL, or DOCUMENTATION. A small number of current files contain historical rule citations, but the identifiers do not select implementations.
- Current consumers: semantic continuation and target-scene policies use the resulting rules, not an R-numbered module authority.
- Dynamic/config consumers: none.
- Golden dependency: historical evidence and fixtures only.
- Action: keep evidence/history; replace current navigational identity and current-only comments where useful, without rewriting old reports.

### 7. Project Visual Context `vnext`

- Namespace: `project-context-vnext-builder.ts`, `ProjectVisualContextVNext`, `project-visual-context.vnext.json`, project record fields, `projectContext.getVNext/rebuildVNext`.
- Type: CURRENT implementation plus COMPATIBILITY serialized/public contract.
- Current consumers: pipeline completion, project-context service, current generation workspace.
- Persisted dependency: filename, schema/version fields, and project-store field names occur in existing user projects.
- Authority result: one builder/service owns the current structured project visual context.
- Action: rename implementation/module and add semantic internal APIs; retain persisted JSON names and compatibility operation aliases.

### 8. Web `VNextGenerationWorkspace` and `vnext-*` operations

- Namespace: component name, API method names, operation channels.
- Type: CURRENT implementation; COMPATIBILITY for the browser API/channel strings during migration.
- Current consumers: `App.tsx`, `web-api.ts`, shared application contracts, operation registry.
- Persisted dependency: none for component name; operation channel strings form a public runtime protocol.
- Authority result: this is the only formal Short-Chain creative workspace. `ImageGenerationWorkspace` is a separate utility/reference-preview capability, not a competing formal creative-flow authority.
- Action: rename component and internal API surface; retain one-way channel aliases until all supported clients use semantic channels.

### 9. Image pipeline values `legacy | vnext`

- Namespace: `ImageGenerationPipelineMode`, settings storage, `pipeline-mode.js`.
- Type: COMPATIBILITY.
- Current consumers: settings migration/defaulting and legacy utility generation.
- Persisted dependency: settings and historical projects.
- Action: KEEP accepted serialized values; do not use them as current module names.

### 10. Packaging V1/V2/V3 and task/source migrations

- Namespace: `migrateImageGenerationTaskV1`, `migrateImageGenerationSourcesV2`, source/task schema versions and packaging contract versions.
- Type: COMPATIBILITY or external/public protocol version.
- Current consumers: current task builder and existing project inputs.
- Action: KEEP. These numbers identify schemas/protocols, not implementation generations.

### 11. Creative schema `V6` / `V18`

- Namespace: creative-production and historical schema/contract references.
- Type: COMPATIBILITY, HISTORICAL, or DOCUMENTATION depending on location.
- Current consumers: compatibility readers and contract validation only; no V6/V18-named Current UI or runtime branch is selected.
- Action: KEEP serialized/schema identifiers; no current architecture namespace is created from them.

### 12. Explicit `legacy` adapters and migration operations

- Namespace: `legacy-context-adapter.ts`, `adapt-legacy-run`, legacy source/status enum values.
- Type: COMPATIBILITY.
- Current consumers: old persisted run/project ingestion.
- Action: KEEP and label as compatibility. These are intentionally temporal because their responsibility is migration.

### 13. Golden/evaluation/versioned baselines

- Namespace: `evaluation/**`, quality baselines, Golden cases and reports containing Phase/R version labels.
- Type: FIXTURE.
- Current consumers: offline verification only; production imports are prohibited by `verify:golden-boundary`.
- Action: KEEP unchanged. Golden updates are forbidden in S6.

### 14. Historical and archive documentation

- Namespace: S1-S5 reports, R-series investigation documents, archive-only implementation references.
- Type: HISTORICAL, ARCHIVE, DOCUMENTATION.
- Current consumers: none in production.
- Action: KEEP historical truth. Only current architecture/navigation documents may be updated.

### 15. External versions and false positives

- Namespace: package versions, product `VERSION`, provider model versions, HTTP/API versions, `pdfjs-dist/legacy`, ordinary words such as “new copy” or “final result”.
- Type: EXTERNAL_VERSION or out of scope.
- Action: KEEP.

## Dependency audit conclusions

- Static production import of a version namespace: present for CLI v5, prompt v5, image-generation vnext, Phase9B Space files, and project-context vnext.
- Dynamic version-path import: exactly one relevant production import, the visual-analysis `src/v5/bootstrap.js` load in `pipeline-service.ts`.
- Config-driven version path: prompt root default `prompts/v5`; Space compiler compatibility mode values.
- Script-driven version path: Phase9B baseline/A-B scripts and CLI test globs.
- Persisted version references: CLI config filename, project visual context filename/fields, generation artifact directory/schema/mode, settings pipeline mode.
- Cache/artifact references: analysis cache/config and `image-generation-vnext` project artifact root must remain readable.
- Current Production -> Historical Runtime imports: 0.
- Current Production -> Archive imports: 0.
- UNKNOWN current namespaces: 0.

