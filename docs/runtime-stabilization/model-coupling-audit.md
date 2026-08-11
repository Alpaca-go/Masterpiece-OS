# Visual Analysis / Model Coupling Audit

## Executive conclusion

```text
Current default registered analysis model: qwen3.6-plus
Analysis restricted to that exact model ID: NO
Concrete analysis adapter hard-wired in pipeline: YES — createQwenReasoner
Architecture Level: B — Partial Qwen coupling
Risk marker: ANALYSIS_PROVIDER_COUPLING_HIGH
```

The runtime can accept an unregistered analysis model when its profile uses `openai-chat-multimodal`, and the selected profile supplies model/base URL/API key. Therefore the analysis path is not literally restricted to `qwen3.6-plus`. However, `pipeline-service.ts` directly constructs `createQwenReasoner()` for the main report, Unified Visual Understanding, structured repair, and reference-related model steps. A non-Qwen provider must be compatible with that adapter's request and attachment conventions or requires code changes.

## Required questions

### 1. What is the current default analysis model?

`packages/model-registry/src/index.js` registers `qwen3.6-plus` as the only named analysis model and marks it `enabledByDefault: true`.

No API profile is created automatically. At runtime the selected/default user profile supplies `credentials.model`; an empty installation opens the Model Center.

### 2. Where is Qwen3.6 Plus configured?

- Registry identity/capabilities: `packages/model-registry/src/index.js`.
- capability assumptions: `packages/model-runtime/src/model-capabilities.js`.
- user-selected model/base URL/key: `apps/desktop/src/main/settings-store.ts` and encrypted credential files.
- environment fallback for direct use: `QWEN_MODEL`, `QWEN_BASE_URL`, `QWEN_API_KEY` in `packages/model-runtime/src/qwen-reasoner.js`.

### 3. Is there hard-coding?

Yes, at the adapter selection boundary:

- `pipeline-service.ts` imports `createQwenReasoner` directly.
- it constructs that concrete reasoner in the main analysis path and structured reference steps.
- errors and diagnostics contain Qwen-specific names/codes.
- the reasoner reports `provider: 'qwen'` before the Desktop wrapper replaces the top-level display provider in some paths.

No hard-coded `if (model === 'qwen3.6-plus')` was found in the analysis business logic.

### 4. Is the Analysis Prompt Qwen-specific?

Mostly no.

- Base v5 prompts live under `apps/cli/prompts/v5` and describe business/output behavior, not a Qwen API.
- Desktop structured prompts live in analysis/reference modules and are provider-neutral in intent.
- Pipeline instructions assume a capable multimodal structured-output model, but do not branch on Qwen model ID.

Prompt resources are still behavior-sensitive and currently coupled to CLI/Desktop path resolution.

### 5. Is the request Qwen-specific?

Partially.

`qwen-reasoner.js` sends an OpenAI-compatible `/chat/completions`-style body with:

- `model` and `messages`;
- a system string and multimodal user content;
- optional strict `json_schema` response format;
- non-streaming response handling.

This is portable only to providers that accept the same multimodal content and structured response format. Attachment conversion, Qwen error codes, URL construction, and response expectations are implemented in the Qwen adapter.

### 6. Is the response parser Qwen-specific?

The network response extraction is inside `qwen-reasoner.js` and therefore Qwen-named. Downstream structured parsing is largely provider-independent:

- `@masterpiece/model-runtime/response-parser.js`;
- Desktop model-schema validators;
- `@masterpiece/analysis-runtime` completion/repair logic.

### 7. Is the schema provider-independent?

Yes in structure. Project facts, assets, anchors, styles, task selection, validation issues, visual decision packets, and project contracts do not encode a Qwen model ID.

The provider must support enough structured output quality to satisfy these schemas and repair gates.

### 8. How many files must change to add a model today?

Two cases:

1. **OpenAI-chat-multimodal-compatible model:** a user can add a custom API profile without source changes. Registering it as a first-class known model usually changes the registry plus tests (about 2 files).
2. **Different request/attachment/response protocol:** at minimum a new model-runtime adapter/export, registry/protocol metadata, shared type/protocol union, settings validation/connection test, pipeline reasoner selection, and tests are required (approximately 6–9 files). The pipeline currently has no generic analysis-provider factory.

### 9. What is the current architecture level?

**Level B — Partial Qwen coupling.**

Reasoning:

- business prompts and schemas are substantially provider-independent;
- model/base URL/key are profile-driven;
- the service still imports and constructs one concrete Qwen adapter;
- incompatible providers cannot be added through configuration alone.

This is high coupling at the provider selection seam, but not a Qwen-specific rewrite of the whole analysis business pipeline.

### 10. What is the minimum future Provider Adapter path?

Proposal only:

```text
pipeline-service
→ AnalysisReasoner interface
→ provider factory selected by profile.protocol
→ Qwen / Volcengine / generic adapters
```

Minimum staged approach after Golden Regression:

1. Freeze a provider-neutral `AnalysisReasoner` input/output contract matching the context already passed to `createQwenReasoner`.
2. Move concrete selection out of `pipeline-service.ts` into a factory in a shared provider package.
3. Keep `qwen-reasoner.js` behavior byte-for-byte equivalent as the first adapter.
4. Add an OpenAI-compatible generic adapter only after replaying report, UVU, repair, timeout, cancellation, attachment, and schema tests.
5. Add optional prompt profiles only where provider evidence proves a need; do not fork the entire pipeline.

## Current data flow

```text
Analysis UI
→ pipeline-service.ts
→ selected API profile
→ createQwenReasoner({ apiKey, model, baseUrl })
→ qwen-reasoner request/attachment handling
→ provider response text
→ provider-independent response/schema validation
→ report + Visual Decision Packet + project contexts
```

## Future directory proposal (not implemented)

```text
packages/
└─ model-providers/
   ├─ types.ts
   ├─ factory.ts
   ├─ qwen.ts
   ├─ volcengine.ts
   └─ openai-compatible.ts

prompts/
└─ visual-analysis/
   ├─ base.md
   └─ profiles/
      ├─ qwen.md
      ├─ volcengine.md
      └─ generic.md
```

## P0–P1 safety decision

No provider abstraction, prompt profile split, registry expansion, or Qwen code move was implemented. This report records `ANALYSIS_PROVIDER_COUPLING_HIGH`; the current behavior remains unchanged.
