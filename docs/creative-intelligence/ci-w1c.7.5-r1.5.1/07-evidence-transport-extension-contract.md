# Evidence transport extension contract

Qualification evidence schema 升级为 `ci-qualification-evidence-v2.1`，保留 v2 的历史只读兼容。每个 call ledger entry 必须包含：

- `attemptKind`: `BASE | TRANSPORT_RETRY | SEMANTIC_REPAIR`
- `success`
- `errorCode`
- `causeCode`
- `failureClass`
- `retryable`
- `responseHeadersReceived`
- 原有 redacted `stage/provider/model/latencyMs` 与可选 finish/usage

失败记录必须具有完整分类字段；成功记录的 error/cause/class/retryable 为 null。validator 拒绝 API key、credentials、raw text/response、stack、base/full/endpoint URL。未来 evidence 可据此独立判定“无 usable response”与“semantic response failed”。
