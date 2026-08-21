# G01 Attempt 2 Execution Report

## Frozen execution

Exactly one real qualification run was made. It used the registered planning brief and the production `runCreativeReasoningForProject` orchestration path. No standalone model request was used as a substitute.

| Field | Result |
| --- | --- |
| Started | `2026-08-21T13:08:09.558Z` |
| Finished | `2026-08-21T13:19:20.807Z` |
| Duration | 671,249 ms |
| Analysis provider/model | `dashscope / qwen3.6-plus` |
| Production orchestrator | `runCreativeReasoningForProject` |
| Structured claims | 0 |
| Canonical structured coverage | insufficient: `no_claims` |
| Coverage metrics | 0 claims; 0 semantic types; 0/3 chunks; 0 source-chunk coverage; 10,737 characters |
| Narrative base calls | 1 |
| Narrative repair calls | 0 |
| Hybrid Planning claims | 15 |
| Strategic base calls | 1 |
| Strategic repair calls | 1 |
| Total live analysis calls | 3 |
| Image calls | 0 |

## Call ledger

| Call | Stage | Latency | Input/output chars | Tokens in/out | Result |
| --- | --- | ---: | ---: | ---: | --- |
| 1 | Planning narrative base | 147,874 ms | 12,810 / 9,398 | 6,869 / 8,651 | valid on base |
| 2 | Strategic base | 287,245 ms | 24,175 / 20,829 | 10,483 / 16,851 | parsed; gate `SG-13` |
| 3 | Strategic repair | 235,982 ms | 26,434 / 17,078 | 11,607 / 13,826 | parsed; gate `SG-13` |

The run was not repeated after the blocker. The allowed maximum repair was consumed only by Strategic Synthesis. Narrative extraction did not need repair.

## Stage closure

Planning followed the required production sequence: structured extraction, canonical coverage computation, required narrative extraction, raw parse/validation, deterministic normalization and projection, then hybrid merge. The final Planning artifact contains 15 claims.

Strategic Synthesis failed closed after base plus one repair. Both responses were parseable and project-specific, but neither became a canonical artifact because the grounding gate returned only `SG-13`. Consequently:

- Strategic: `FAIL`, attempts 2, artifact `null`.
- Concept: `NOT_RUN`, attempts 0.
- Direction: `NOT_RUN`, attempts 0.
- G02: not executed.

Raw provider responses remain ignored runtime evidence and are not committed.

## Offline follow-up checks

After freezing the run, the Planning carrier tests passed 8/8 and the creative-reasoning mock tests passed 2/2. The older Strategic SR suite had 1 pass and 10 parse-stage failures because its fixtures omit the now-required `planningClaimRefs`; no fixture or production repair was made in this stage. Project-specific-rule and golden-boundary guards passed. The workspace-boundary guard reported existing deep imports and then its own `ReferenceError: dir is not defined`.
