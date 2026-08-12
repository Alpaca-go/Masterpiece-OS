# A1 Qwen Baseline

Qwen 3.6 Plus is the production Visual Analysis baseline and remains the default configured analysis model.

## Frozen behavior

- Provider adapter identity: `qwen`
- Runtime Profile provider: existing `qwen`, `dashscope`, or compatible Qwen Profile identity
- Model: `qwen3.6-plus` registry baseline
- Protocol: `openai-chat-multimodal`
- Endpoint: Profile Base URL plus `/chat/completions`
- Messages: one system message followed by one multimodal user message
- Images: source order preserved; optimized JPEG data URLs; asset label before each image
- Documents: supported text documents embedded in source order; unsupported documents remain manifest evidence
- Options: `stream: false`; JSON Schema response format only when requested
- Result: run ID, provider, model, completion time, report Markdown, inspected asset IDs
- Parser/validation/artifact/downstream contracts: unchanged

Deterministic evidence is stored in `tests/provider-contract-fixtures/qwen-baseline.json`. Existing Qwen reasoner and integration tests remain authoritative for single call, cache, forced rerun, timeout, cancellation, diagnostics, empty response, and secret redaction.

The four frozen analysis Prompt digests in `config/repository-contract/prompt-integrity.json` did not change. Natural-language output is not expected to be byte-identical; request shape, Prompt selection, output contract, required sections, and downstream compatibility are protected.
