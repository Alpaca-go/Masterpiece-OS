# M1 Compatibility Name Register

M1 follows **READ old + new / WRITE new only** where M1 introduced a new semantic write identity. Existing persisted schemas and paths are not rewritten.

| Legacy name | Location | Reason preserved | Read/write behavior | Removal condition |
|---|---|---|---|---|
| `masterpiece-os-v5.json` | CLI bootstrap; pipeline service | Existing project configuration discovery | Read/write existing filename unchanged | Semantic filename migration completes a deprecation cycle |
| `project-visual-context.vnext.json`, `visualContextVNext*` | project context service/contracts/store | Existing project records and files | Existing persisted contract unchanged; UI/errors use semantic copy | Backward reader and explicit migration ship |
| `vnext-1.0`, `pipelineMode=vnext`, `image-generation-vnext` | Short-Chain service | Existing run/session/artifact loading | Existing contract unchanged | Backward run reader and artifact migration ship |
| `VNEXT_*` error/event identifiers | Short-Chain services/tests | Existing diagnostics and trace consumers | Codes preserved; human messages use Short-Chain semantics | Consumer inventory reaches zero with migration evidence |
| `r8_6_golden`, `phase9b_quality`, `vnext_legacy`, Phase9B trace fields | image-generation runtime | Accepted config, trace and Golden evidence | Read/write remains stable under frozen compatibility contract | Configuration deprecation and trace reader migration complete |
| Existing `r11-cont-*` task IDs | persisted Short-Chain task artifacts | Historical IDs are opaque lookup keys | READ old and new; WRITE `continuation-*` only | Supported project/artifact consumers of old IDs reach zero |

`deep-creative-director-provider-v5` was not registered as compatibility: repository-wide tracing found only its definition and no persisted/external consumer. New/current identity is `deep-creative-director-provider`.
