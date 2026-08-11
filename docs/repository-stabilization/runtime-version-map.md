# Runtime-to-Version Map

## Web Primary Runtime

```text
Browser renderer
  -> renderer/src/web-api.ts
  -> Vite /api/rpc proxy
  -> main/web-rpc-server.ts
  -> main/index.ts registered handlers
  -> Desktop-hosted shared services
```

### Analysis

```text
Web analysis:start
  -> apps/desktop/src/main/pipeline-service.ts
  -> @masterpiece/model-runtime/qwen-reasoner.js
  -> dynamic import apps/cli/src/v5/bootstrap.js
  -> apps/cli/prompts/v5/* (MASTERPIECE_PROMPT_ROOT may redirect packaged path)
  -> analysis/runtime validators + project context writers
```

Status: `v5` is `HIDDEN_VERSION_DEPENDENCY / ACTIVE_DEPENDENCY`, not historical-only.

### Reference-First / Space Generation

```text
VNextGenerationWorkspace.tsx
  -> image-generation:vnext-start-validated
  -> main/image-generation/vnext-service.ts
  -> @masterpiece/image-generation-runtime/vnext/compile.js
  -> task-contract + explicit reference resolver
  -> src/space/phase9b-source-adapter.js
  -> src/space/phase9b-space-compiler.js
  -> mode/reference/authority/semantic/generation-route gates
  -> vnext/seedream-adapter.js
  -> main/image-generation/service.ts
  -> selected provider protocol
```

`MASTERPIECE_SPACE_COMPILER_MODE` 的真实语义：

- 默认 `r8_6_golden`：当前生产模式，调用 `src/space` 的 Phase9B compiler。
- `phase9b_quality`：同一冻结生产实现的兼容别名。
- `vnext_legacy`：显式调试/fallback，调用旧 `compileVNextPrompt()`；因为能由环境变量激活，仍是 `ACTIVE_DEPENDENCY`。

Reference-First 的当前历史层叠依赖为 `vnext orchestration -> R8.6 canonical identity -> R9 production module -> R10/R11 semantic, target-scene and continuation gates`。所有节点都是 RED。

### Standard / Packaging

```text
ImageGenerationWorkspace.tsx
  -> main/image-generation/service.ts
  -> image-generation-runtime/task-builder.js
  -> sources schema 3.0 => compileImageGenerationTaskV3
  -> deliverables/deliverable-prompt-compiler.js
  -> deliverable gate / fingerprint
  -> provider adapter
```

兼容分支仍接受 schema `1.0` 和 `2.0` 并执行迁移/重试，因此旧 schema 不能归档。

### Provider selection

- Analysis：注册默认 `qwen3.6-plus`；管线具体耦合 `createQwenReasoner`，但 profile 可提供兼容的 model/base URL。
- Current Short-Chain UI：只接受启用且协议为 `seedream-image` 的 generation profile。
- Shared service：仍实现 `openai-image-generation`、`google-gemini-image`、`seedream-image` 与 legacy-compatible `dashscope-wan-image` 路由。

### Protected smoke

`npm run web:smoke -> apps/desktop/scripts/run-web-primary-smoke.mjs` 是 `PROTECTED_BASELINE_INFRASTRUCTURE`。S0 未移动、重命名、合并或替换它。
