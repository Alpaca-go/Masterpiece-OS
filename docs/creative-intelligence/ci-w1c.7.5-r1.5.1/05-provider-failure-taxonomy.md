# Provider failure taxonomy

唯一 classifier `classifyProviderFailure()` 输出 `failureClass`、`retryable`、`responseHeadersReceived`、`errorCode`、`causeCode` 与可选 HTTP status。

| Failure class | Retryable | Headers |
|---|---:|---:|
| `TRANSPORT_TIMEOUT` | yes | no |
| `TRANSPORT_CONNECTION` | yes | no |
| `RATE_LIMIT_RETRYABLE` | yes | yes |
| `PROVIDER_5XX_RETRYABLE` | yes | yes |
| `PROVIDER_4XX_NON_RETRYABLE` | no | yes |
| `AUTHENTICATION_ERROR` | no | status dependent |
| `CANCELLED` | no | no |
| `SEMANTIC_PARSE_FAILURE` | no transport retry | yes |
| `SEMANTIC_GATE_FAILURE` | no transport retry | yes |
| `UNKNOWN_PROVIDER_FAILURE` | no | observed state |

强制映射：`REQUEST_FAILED` 且 cause 为 `UND_ERR_HEADERS_TIMEOUT` 得到 `TRANSPORT_TIMEOUT / retryable=true / responseHeadersReceived=false`。Semantic 分类由 runtime 在 response 到达后产生，不伪装成 provider transport error。
