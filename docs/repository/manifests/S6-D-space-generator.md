# S6-D Manifest — Space Generator

Batch: S6-D  
Purpose: replace Phase9B implementation identity with semantic Space compiler names.

Old Namespace: `phase9b-space-compiler`, `phase9b-source-adapter`, matching implementation symbols  
Classification: CURRENT  
Old Path: `packages/image-generation-runtime/src/space/phase9b-*.js`

New Namespace: `compiler`, `source-adapter`, `compileSpacePrompt`, `adaptSpaceSource`  
New Path: `packages/image-generation-runtime/src/space/`

Files Renamed: 2  
Files Moved: 0  
Files Deleted: 0  
Aliases Added/Removed: 0/0

Static Consumers Updated: Space barrel, generation orchestrator, scripts, tests  
Dynamic Consumers Updated: 0  
Config References Updated: 0; compatibility values preserved  
Test References Updated: direct module/symbol consumers

Prompt Content Changed: NO  
Compiler Behavior Changed: NO  
Schema Changed: NO

Tests: Unit PASS; CLI PASS; Runtime PASS; Web Smoke PASS  
Golden: G01-G05 PASS; provider calls 0; auto-updated NO

Rollback: reverse both file/symbol renames and their imports as one batch.  
Result: PASS.

