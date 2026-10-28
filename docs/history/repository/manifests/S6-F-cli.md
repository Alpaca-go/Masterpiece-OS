# S6-F Manifest — CLI

Batch: S6-F  
Purpose: replace the current CLI implementation-generation namespace with its capability.

Old Namespace: `src/v5`, `tests/v5`, `runV5Pipeline`  
Classification: CURRENT  
Old Path: `apps/cli/src/v5`, `apps/cli/tests/v5`

New Namespace: `analysis-engine`, `runAnalysisPipeline`  
New Path: `apps/cli/src/analysis-engine`, `apps/cli/tests/analysis-engine`

Files Renamed/Moved: implementation and current test directories  
Files Deleted: 0  
Aliases Added/Removed: 0/0

Static Consumers Updated: CLI entry  
Dynamic Consumers Updated: runtime-core pipeline dynamic import  
Config References Updated: none; `masterpiece-os-v5.json` compatibility filename retained  
Test References Updated: npm globs, current-flow gate, architecture assertion

Prompt Content Changed: NO  
Compiler Behavior Changed: NO  
Schema Changed: NO

Tests: Unit PASS; CLI PASS; Runtime PASS; Web Smoke PASS  
Golden: G01-G05 PASS; provider calls 0; auto-updated NO

Rollback: reverse directory, symbol, dynamic-import, and test-glob names.  
Result: PASS.

