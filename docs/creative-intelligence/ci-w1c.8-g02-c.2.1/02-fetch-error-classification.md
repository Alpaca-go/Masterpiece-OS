# Fetch Error Classification

## Deterministic mapping

| Input evidence | Granular class | Category | Retryable |
| --- | --- | --- | --- |
| timeout code or nested timeout cause | `TRANSPORT_TIMEOUT` | `TRANSPORT_FAILURE` | yes |
| connection code or `fetch failed` | `TRANSPORT_CONNECTION` | `TRANSPORT_FAILURE` | yes |
| semantic parse rejection | `SEMANTIC_PARSE_FAILURE` | `SEMANTIC_FAILURE` | no transport retry |
| semantic gate rejection | `SEMANTIC_GATE_FAILURE` | `QUALIFICATION_FAILURE` | no transport retry |

The Qwen adapter now retains `causeCode`, `responseHeadersReceived`, and `requestDispatched`. Analysis-provider normalization carries those fields forward instead of replacing the nested cause with the wrapper code.

The existing granular taxonomy remains backward-compatible. The three-category view is additive.
