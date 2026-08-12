# S6-E Manifest — Generation, Context, Reference and Packaging

Batch: S6-E  
Purpose: give current Short-Chain generation and project context responsibility-based paths.

Old Namespace: runtime `src/vnext`, `vnext-*-service`, `project-context-vnext-builder`, `VNextGenerationWorkspace`  
Classification: CURRENT implementation with COMPATIBILITY protocol identifiers  
Old Path: image runtime, runtime-core application, Web component

New Namespace: `generation`, `short-chain-service`, responsibility-named validator/scanner/audit services, `project-visual-context-builder`, `ShortChainGenerationWorkspace`  
New Path: corresponding semantic current paths

Files Renamed: current implementation directory, 5 runtime-core modules, 1 Web component  
Files Moved: generation implementation directory  
Files Deleted: 0  
Aliases Added: package `./vnext` compatibility export  
Aliases Removed: 0

Static Consumers Updated: package barrels, runtime services, Web, scripts, tests  
Dynamic Consumers Updated: 0  
Config References Updated: 0  
Test References Updated: module paths and internal factory symbols

Prompt Content Changed: NO  
Compiler Behavior Changed: NO  
Schema Changed: NO

Tests: Unit PASS; CLI PASS; Runtime PASS; Web Smoke PASS  
Golden: G01-G05 PASS; provider calls 0; auto-updated NO

Rollback: reverse semantic paths/symbols and remove the compatibility re-export.  
Result: PASS. Persisted `.vnext.json`, `vnext-1.0`, mode, artifact, and channel values remain unchanged.

