# Model Provider Inventory

| Provider / adapter | Model | Protocol | Used by | Runtime | Status |
|---|---|---|---|---|---|
| Qwen reasoner | `qwen3.6-plus` default; profile may override model | `openai-chat-multimodal` | visual analysis, validation, similarity audit | WEB/DESKTOP/CLI | ACTIVE_RUNTIME |
| OpenAI image adapter | `gpt-image-2` | `openai-image-generation` | shared image-generation service/profile | SHARED | ACTIVE_DEPENDENCY |
| Google/Gemini image adapter | `nano-banana` | `google-gemini-image` | shared image-generation service/profile | SHARED | ACTIVE_DEPENDENCY |
| Seedream adapter | `seedream-5.0-pro` | `seedream-image` | current Short-Chain UI and vNext payload | WEB/DESKTOP | ACTIVE_RUNTIME |
| DashScope Wan adapter | `wan2.7-image-pro` | `dashscope-wan-image` | legacy-compatible service route | SHARED | ACTIVE_DEPENDENCY; disabled by default |

## Coupling findings

- Registry enables the first four models by default; Wan is registered with `enabledByDefault: false`.
- Current renderer generation selection filters for `seedream-image`, so enabled registry status alone does not equal current UI reachability.
- Analysis is architecture level B: profile-driven credentials/model, but `pipeline-service.ts` directly constructs `createQwenReasoner`.
- Provider choice is string/config based. This dynamic route is why apparently unused adapters are not archive candidates.
- S0 made no provider, strength, reference-count, request-shape or model changes.
