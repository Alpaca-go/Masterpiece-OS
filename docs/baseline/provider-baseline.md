# Provider Baseline

| Role | Provider/model | Protocol | Baseline status |
|---|---|---|---|
| Visual Analysis | registry default `qwen3.6-plus` through Qwen reasoner | `openai-chat-multimodal` | ACTIVE BASELINE |
| Image Generation | `seedream-5.0-pro` registry identity; profile may hold concrete Seedream model ID | `seedream-image` | ACTIVE CURRENT UI BASELINE |
| Optional generation | `gpt-image-2` | `openai-image-generation` | REGISTERED / SHARED SERVICE, not Primary UI baseline |
| Optional generation | `nano-banana` | `google-gemini-image` | REGISTERED / SHARED SERVICE, not Primary UI baseline |
| Legacy compatible | `wan2.7-image-pro` | `dashscope-wan-image` | DISABLED BY DEFAULT / COMPATIBILITY |

Registry truth is not runtime truth. Current renderer filters the formal generation entry to enabled Seedream profiles. Shared service adapters remain protected because config/protocol selection can reach them.

Analysis coupling is Level B — Partial Qwen Coupling: credentials/model/base URL are profile-driven, but `pipeline-service.ts` constructs `createQwenReasoner` directly.

No API key, token, credential file or raw provider response is part of the baseline documents or manifest.
