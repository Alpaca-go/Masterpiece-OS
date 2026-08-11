# Compatibility Baseline

| Historical-looking dependency | Why it remains required | Status |
|---|---|---|
| CLI `src/v5` | Web/Desktop analysis dynamically imports its bootstrap | ACTIVE_DEPENDENCY |
| CLI `prompts/v5` | analysis prompt builder and packaged prompt path read it | ACTIVE_DEPENDENCY |
| `vnext` service/runtime namespace | current Reference-First orchestration and IPC | ACTIVE_RUNTIME |
| `vnext_legacy` compiler | environment-selectable debug/fallback route | ACTIVE_DEPENDENCY |
| task/schema `1.0` | persisted legacy tasks/runs and tests | LEGACY_DEPENDENCY |
| task/schema `2.0` | migration/retry source into V3 | COMPATIBILITY |
| R8.6 Golden | parity and release boundary for current Space compiler | TEST_DEPENDENCY / LOCKED |
| Phase9B/R9 | actual current Space compiler lineage | ACTIVE_DEPENDENCY |
| R10/R11/R11.2 | semantic, route, continuation and target-scene behavior in current files | ACTIVE_DEPENDENCY |
| lab visual-translation v1 | directly imported by lab v2 | TEST_DEPENDENCY |
| optional generation adapters | profile/protocol-driven shared service compatibility | ACTIVE_DEPENDENCY |
| Desktop main services | host Primary Web backend despite Legacy shell classification | ACTIVE SHARED CORE |

Names such as old, legacy, v5 or vnext do not authorize deletion. Compatibility can only be reduced after S2 behavior protection and a separately authorized migration/removal phase.
