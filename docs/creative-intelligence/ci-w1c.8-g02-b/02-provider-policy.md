# Provider Policy

The future G02 attempt is frozen to `dashscope / qwen3.6-plus`, model family `qwen3.6`, protocol `openai-chat-multimodal`. Allowed stages are `planning-narrative` and `strategic-synthesis` only. Structured Planning may skip the narrative call naturally, but no other stage becomes authorized.

Automatic Provider switching is forbidden. Fallback is disabled and has an empty allowed-Provider set. Any later fallback proposal requires a separate human authorization and a new authorization-manifest review. This policy changes no Provider runtime or production default.
