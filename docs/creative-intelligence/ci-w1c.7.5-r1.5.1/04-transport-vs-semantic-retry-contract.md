# Transport vs semantic retry contract

每个 stage 的 production 状态机硬限制为最多三次 provider attempt：

1. `BASE`：原始 system + user prompt。
2. `TRANSPORT_RETRY`：只在 BASE 发生 retryable transport/provider failure 时允许一次；逐字复用缓存的原始 messages，不出现 `# REPAIR`、blocked codes 或“previous output invalid”。
3. `SEMANTIC_REPAIR`：只在 response text 非空且 parse/structural/gate 失败后允许一次；包含 original task、previous output 和 validation/gate errors。

`providerAttempts`、`transportRetries`、`semanticRepairAttempts` 分开计数。非 retryable 4xx/auth/cancelled/unknown 不重试；空 response 不具备 repair 所需 previous output；transport retry 再失败即终止；任何路径总调用数不超过 3。失败后不使用 mock/fixture fallback，也不运行下游 stage。
