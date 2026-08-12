# S6 Semantic Naming Plan

No rename is authorized unless it appears below. All changes are structural only: prompt content, prompt selection, compiler behavior, reference behavior, provider behavior, schemas, Golden fixtures, and existing user projects remain unchanged.

## D — Space generator

Old Namespace: `phase9b-space-compiler`, `compilePhase9bSpacePrompt`  
Classification: CURRENT implementation; emitted ID is COMPATIBILITY  
Current Role: deterministic production Space compiler  
Historical Role: Phase 9B quality implementation  
Action: RENAME  
Target Namespace: `space/compiler`, `compileSpacePrompt`  
Import Impact: Space barrel and direct scripts/tests  
Config/Fixture/Golden Impact: preserve `r8_6_golden`, `phase9b_quality`, `phase9b-quality-compiler`  
Documentation Impact: current docs only  
Rollback: restore file/symbol names and consumers in one batch.

Old Namespace: `phase9b-source-adapter`, `adaptPhase9bSource`  
Classification: CURRENT  
Current Role: VisualDecisionPacket-to-Space-source adapter  
Action: RENAME  
Target Namespace: `space/source-adapter`, `adaptSpaceSource`  
Impact: compiler/barrel/tests only; serialized adapter version remains accepted  
Rollback: restore paths and imports.

## E — generation, project context, Reference/Packaging

Old Namespace: `src/vnext`  
Classification: CURRENT plus compatibility contracts  
Current Role: short-chain task orchestration, deliverable routing, prompt compilation, provider adaptation  
Action: MOVE/RENAME  
Target Namespace: `src/generation`  
Import Impact: package exports, runtime-core, scripts, tests  
Config/Fixture/Golden Impact: keep old `./vnext` package subpath as one-way compatibility re-export; keep protocol/schema/artifact values  
Rollback: restore directory and package exports.

Old Namespace: `image-generation/vnext-service.ts` and related validator/scanner/audit files  
Classification: CURRENT  
Current Role: formal Short-Chain generation application service  
Action: RENAME  
Target Namespace: `image-generation/short-chain-service.ts` and responsibility-named companion services  
Import Impact: runtime service composition/tests  
Config/Fixture/Golden Impact: preserve persisted directory/schema/mode and compatibility type/API aliases  
Rollback: restore paths and imports.

Old Namespace: `project-context-vnext-builder.ts`  
Classification: CURRENT implementation plus persisted compatibility API  
Current Role: current structured project visual-context builder  
Action: RENAME implementation module; ALIAS public/persisted names  
Target Namespace: `project-visual-context-builder.ts`  
Rollback: restore module/import paths.

Old Namespace: Web `VNextGenerationWorkspace`  
Classification: CURRENT  
Current Role: formal Short-Chain creative workspace  
Action: RENAME  
Target Namespace: `ShortChainGenerationWorkspace`  
Protocol Impact: semantic Web methods/channels become current; old vnext channels remain explicit compatibility aliases for supported clients  
Rollback: restore component and internal calls.

## F — CLI

Old Namespace: `apps/cli/src/v5`, `runV5Pipeline`, `tests/v5`  
Classification: CURRENT  
Current Role: sole current visual-analysis engine  
Action: RENAME  
Target Namespace: `apps/cli/src/analysis-engine`, `runAnalysisPipeline`, `tests/analysis-engine`  
Dynamic Import Impact: update `pipeline-service.ts`  
Compatibility Impact: export `runV5Pipeline` only if a tracked/public consumer still requires it; preserve `masterpiece-os-v5.json` lookup  
Rollback: restore paths/imports/test globs.

## G — prompts

Old Namespace: `apps/cli/prompts/v5`  
Classification: CURRENT  
Current Role: sole current analysis prompt set  
Action: RENAME  
Target Namespace: `apps/cli/prompts/analysis`  
Config Impact: update Node Host default and builder fallback; `MASTERPIECE_PROMPT_ROOT` remains supported  
Prompt/Golden Impact: byte digests must match before/after; content and selection unchanged  
Rollback: restore directory and resolvers.

## H — compatibility aliases

Keep only aliases with real consumers:

| Alias | Reason / consumer | Removal condition | Target phase |
|---|---|---|---|
| package export `./vnext` | external/internal import compatibility | no supported consumer imports it | S7 review |
| `vnext-*` operation channels | existing Web/runtime clients | all supported clients use semantic channels and persisted sessions are migrated | S7 review |
| `getVNext`/`ProjectVisualContextVNext` and persisted fields | existing projects and application contract | schema migration with backward reader ships | future schema phase |
| `vnext-1.0`, `pipelineMode: vnext`, `image-generation-vnext` | persisted run/artifact compatibility | backward reader and artifact migration exist | future schema phase |
| `r8_6_golden`, `phase9b_quality`, `vnext_legacy` | environment/config compatibility | configuration deprecation cycle completes | S7 review |
| `masterpiece-os-v5.json` | existing project config | semantic filename reader/writer plus migration is adopted | future config phase |

Dependency direction must be compatibility alias -> semantic implementation.

## I — historical isolation

Action: KEEP/MOVE only where a live-looking historical implementation is outside the existing archive topology. Do not rename historical phase reports, evaluation evidence, or Golden fixtures. Verify production imports to historical/archive/evaluation remain zero.

## J — scripts, tests, config

Action: rename current test directories/scripts to semantic capability names; keep historical/Golden test names where the version is evidence. Rename `verify-phase9b-space-baseline` to a semantic current command while retaining a temporary npm-script alias only if a consumer exists. Preserve accepted config and schema values.

## K — dead namespace sweep

Classify every remaining match. Delete only when static consumers, dynamic consumers, compatibility consumers, fixtures, Golden dependencies, and historical value are all zero. Target UNKNOWN = 0 and version-named current architecture = 0 except documented protocol/compatibility cases.

## L — final documentation and verification

Create the namespace dictionary, historical index, repository map, dead sweep, and final report. Update only current architecture facts in README and current architecture/ownership docs. Run clean install, clean build, full regression, Actual Web, and Golden 5/5. Mark `S7_READY` only if every S6 gate passes.

