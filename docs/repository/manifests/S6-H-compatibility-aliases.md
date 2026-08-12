# S6-H Manifest — Compatibility Aliases

Batch: S6-H  
Purpose: make semantic Short-Chain APIs current and retain only compatibility with real consumers.

Old Namespace: internal `VNext*` names and `vnext-*` current operation channels  
Classification: CURRENT names plus compatibility protocol/artifacts  
Old Path: contracts, Web API, operation registry, generation implementation

New Namespace: `ShortChain*` symbols and `short-chain-*` current channels  
New Path: semantic current implementation paths

Files Renamed/Moved/Deleted: 0/0/0  
Aliases Added: package subpath `./vnext` only  
Aliases Removed: old operation channels (tracked consumers = 0)

Static Consumers Updated: all repository consumers  
Dynamic Consumers Updated: 0  
Config References Updated: serialized values retained  
Test References Updated: semantic API/channel expectations

Prompt Content Changed: NO  
Compiler Behavior Changed: NO  
Schema Changed: NO; schema values and persisted property names remain readable

Tests: Unit PASS; CLI PASS; Runtime PASS; Web Smoke PASS with operationCount 147  
Golden: G01-G05 PASS; provider calls 0; auto-updated NO

Rollback: restore symbol names and channel mappings; no data migration required.  
Result: PASS. Compatibility aliases were not added where no real consumer exists.

