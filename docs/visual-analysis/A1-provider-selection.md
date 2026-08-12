# A1 Provider Selection

`createDefaultAnalysisProviderRegistry()` is a small in-process registry, not a plugin system and not a second Operation Registry.

```text
selected API Profile
  -> existing Settings/Credential authorities
  -> Analysis Provider Registry
  -> exactly one supporting Provider Adapter
  -> canonical reasoner result
```

The production registry contains one real adapter: Qwen. It accepts the current Qwen/DashScope/compatible Qwen Profile identities using the multimodal analysis protocol. An unset Provider with the registered baseline Qwen model still resolves to Qwen. Unsupported Providers fail with `ANALYSIS_PROVIDER_UNSUPPORTED`; there is no silent Qwen fallback.

The Web project page reuses the existing Profile selector and now limits it to enabled `analysis` + `openai-chat-multimodal` Profiles. It displays the existing provider and model values. API keys remain in the Node credential authority and never enter the renderer.

Second real Provider: DEFERRED because no additional real analysis model is registered or safely discoverable without inventing a model ID. Fake Provider Contract tests prove pluggability offline.
