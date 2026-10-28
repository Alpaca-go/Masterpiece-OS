# S6-J Manifest — Scripts, Tests and Config

Batch: S6-J  
Purpose: remove implementation-generation names from current navigation and verification commands.

Old Namespace: `verify-phase9b-space-baseline`, current Phase9B compiler test filenames  
Classification: CURRENT test/script names; historical test cases remain FIXTURE  
Old Path: root scripts and current image-generation tests

New Namespace: `verify-space-compiler-baseline`, `space-compiler-*`  
New Path: semantic script/test paths

Files Renamed: verifier and current compiler/baseline tests  
Files Moved/Deleted: 0/0  
Aliases Added/Removed: 0/0 (tracked consumers updated)

Static/Dynamic Consumers Updated: npm scripts and test references  
Config References Updated: implementation paths only; accepted persisted/environment values unchanged  
Test References Updated: yes

Prompt Content Changed: NO  
Compiler Behavior Changed: NO  
Schema Changed: NO

Tests: version naming, workspace boundaries, obsolete-code, production-boundary, project-rule, Golden-boundary, and current-flows gates PASS  
Golden: unchanged

Rollback: reverse script/test names and npm command.  
Result: PASS.

