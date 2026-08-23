# CI-W1C.8-G02-C.2.1 Transport Diagnosis

## Finding

The G02-C.2 Strategic failure is a transport reliability failure, not a semantic or qualification failure.

- observed message: `fetch failed`
- nested cause: `UND_ERR_HEADERS_TIMEOUT`
- response headers received: false
- configured timeout: 360000 ms
- failure latency: 305631 ms
- remaining configured margin: 54369 ms
- canonical granular class: `TRANSPORT_TIMEOUT`
- top-level category: `TRANSPORT_FAILURE`
- retry eligibility: true, bounded to one unchanged transport retry

The previous runtime lost the nested Undici cause while wrapping the Qwen error. The stage therefore received an unknown provider failure and could not apply the frozen transport retry policy.

No Provider or model request was made during this diagnosis.
