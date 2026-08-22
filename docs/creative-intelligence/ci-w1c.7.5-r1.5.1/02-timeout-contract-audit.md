# Timeout contract audit

修复前存在三层字段漂移：Creative Reasoning Service 与 qualification bridge 传递 `maximumDurationMs`，而 OpenAI-compatible transport 实际读取 `requestTimeoutMs`。这使应用层的 duration 值不构成 transport deadline。

修复后的唯一 authority 是 `requestTimeoutMs`：

- runtime-core 按 stage policy 解析 timeout，并只向 reasoner 传 `requestTimeoutMs`；
- qualification bridge 原样转交 `requestTimeoutMs`；
- model-runtime 使用该字段构建 `AbortSignal.timeout()`；
- `maximumDurationMs` 仅在 model-runtime 单点作为临时兼容 alias；两者同时存在时 canonical 字段优先；
- application timeout 触发时规范化为 `REQUEST_TIMEOUT / TRANSPORT_TIMEOUT`，并记录 `responseHeadersReceived=false`。

TIMEOUT-01..06 证明 authority 贯通、alias 不分叉、离线 stub 可实际触发 abort、Planning/Strategic 各取自己的 policy，且默认全阶段 orchestration 仍会进入原有 stage 流程。
