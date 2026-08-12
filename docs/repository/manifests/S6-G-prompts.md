# S6-G Manifest — Analysis Prompts

Batch: S6-G  
Purpose: replace the prompt implementation-generation directory with a capability name.

Old Namespace: `apps/cli/prompts/v5`  
Classification: CURRENT  
Old Path: `apps/cli/prompts/v5`

New Namespace: analysis prompts  
New Path: `apps/cli/prompts/analysis`

Files Renamed/Moved: 4 prompt files, content unchanged  
Files Deleted: 0  
Aliases Added/Removed: 0/0

Static Consumers Updated: prompt builder and prompt contract tests  
Dynamic Consumers Updated: 0  
Config References Updated: Node Host default prompt root; `MASTERPIECE_PROMPT_ROOT` unchanged  
Test References Updated: current prompt paths

Prompt Content Changed: NO  
Compiler Behavior Changed: NO  
Schema Changed: NO

Prompt digests: all four SHA-256 values identical before/after (recorded under ignored `.codex-smoke/s6-g`)  
Tests: Unit PASS; CLI PASS; Runtime PASS; Web Smoke PASS  
Golden: G01-G05 PASS; provider calls 0; auto-updated NO

Rollback: restore the directory and three path consumers.  
Result: PASS.

