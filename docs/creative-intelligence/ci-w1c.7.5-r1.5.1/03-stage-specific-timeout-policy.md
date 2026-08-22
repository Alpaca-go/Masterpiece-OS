# Stage-specific timeout policy

Canonical policy 位于 runtime-core 的 `DEFAULT_CREATIVE_REASONING_TIMEOUTS`：

| Stage | Timeout | 依据 |
|---|---:|---|
| Planning narrative | 180,000 ms | G01 Attempt 4 Planning 约 121,044 ms；保留约 59 秒余量 |
| Strategic synthesis | 290,000 ms | 已成功历史约 255 秒；保留 35 秒余量，并早于 Attempt 4 约 305–307 秒的 underlying headers timeout |
| Concept | 180,000 ms | 尚未 live-qualified，维持 provisional default |
| Direction | 180,000 ms | 尚未 live-qualified，维持 provisional default |

Strategic 明确不再复用 60,000 ms。调用方只能通过 typed `qualificationTimeouts` 显式覆盖；非法的非有限值或非正数 fail closed。Concept/Direction 的值不是本阶段 live 结论，未来授权其 live qualification 时应重新校准。
