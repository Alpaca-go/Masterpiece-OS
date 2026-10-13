# Provider Baseline

| Role | Provider/model | Protocol | Baseline status |
|---|---|---|---|
| Visual Analysis | `provider-policy.js` default Volcengine / `doubao-seed-2.1-turbo`; registered alternative Qwen / `qwen3.6-plus` | provider-specific; Qwen remains `openai-chat-multimodal` | ACTIVE BASELINE |
| Image Generation | `seedream-5.0-pro` registry identity; profile may hold concrete Seedream model ID | `seedream-image` | ACTIVE CURRENT UI BASELINE |
| Optional generation | `gpt-image-2` | `openai-image-generation` | REGISTERED / SHARED SERVICE, not Primary UI baseline |
| Optional generation | `nano-banana` | `google-gemini-image` | REGISTERED / SHARED SERVICE, not Primary UI baseline |
| Legacy compatible | `wan2.7-image-pro` | `dashscope-wan-image` | DISABLED BY DEFAULT / COMPATIBILITY |

Registry truth is not runtime truth. Current renderer filters the formal generation entry to enabled Seedream profiles. Shared service adapters remain protected because config/protocol selection can reach them.

Analysis dispatch is `packages/runtime-core/src/application/pipeline-service.ts` calling `analysisProviders.createReasoner(credentials)`. The registry is `packages/model-runtime/src/analysis-provider-registry.js`. Policy defaults live in `packages/runtime-core/src/application/provider-policy.js`. `createQwenReasoner` remains in `packages/model-runtime/src/qwen-reasoner.js` for the Qwen alternative. The 2026-08 text named Qwen / `qwen3.6-plus` as the analysis default. This table records the tip policy file and does not declare a new product freeze.

No API key, token, credential file or raw provider response is part of the baseline documents or manifest.
