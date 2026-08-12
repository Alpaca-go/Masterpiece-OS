# A2-B Real Provider Adapter Integration

**Phase:** Visual Analysis A2 — Provider Candidate Integration & Model Evaluation Matrix
**Batch:** A2-B
**Date:** 2026-08-12
**Status:** `A2_B_INTEGRATION_PASS` (offline contract tests + Qwen preservation)
**Next:** A2-B capability probe (manual / opt-in, user-authorized real Provider call)

## 1. Scope

A2-B integrates Candidate A (`volcengine` / `doubao-seed-2.1-turbo`) as
a real second Provider against the A1 Analysis Provider Contract.
Qwen remains the production baseline (CONTROL).

Per A2 spec §14 the standard flow is:

```
Implement Provider Adapter  →  Register Provider  →  Reuse Profile / Credential
                           →  Offline Contract Test  →  Opt-in Real Smoke
```

A2-B.1 (this batch) covers the first four steps. A2-B.2 (the
**capability probe**) is the opt-in real smoke and is scheduled
separately so the user can authorize real Provider calls explicitly.

## 2. Files added

- `packages/model-runtime/src/volcengine-reasoner.js` — Provider-
  specific HTTP client. Mirrors the A1 Qwen reasoner shape but
  with Volcengine identity, Ark base URL, `VOLCENGINE_*` error
  codes, and `VOLCENGINE_API_KEY` / `VOLCENGINE_MODEL` /
  `VOLCENGINE_BASE_URL` env-var fallbacks (plus `ARK_*` aliases
  for legacy callers).
- `packages/model-runtime/src/volcengine-analysis-provider.js` —
  the A1 contract adapter (`id`, `capabilities`, `supports`,
  `createReasoner`).
- `tests/provider-contract-fixtures/volcengine-baseline.json` —
  frozen request envelope baseline (pathSuffix, messageRoles,
  stream, imageEncoding, structuredOutputType, supportsMatchers).
- `tests/volcengine-analysis-provider-contract.test.js` — offline
  contract tests (19 cases).

## 3. Files modified

- `packages/model-runtime/src/index.js` — re-exports
  `volcengine-reasoner` and `volcengine-analysis-provider`.
- `packages/model-runtime/package.json` — adds
  `./volcengine-reasoner` and `./volcengine-analysis-provider`
  subpath exports.

No other production module touched. Qwen reasoner / Qwen
analysis-provider / A1 contract / downstream code all unchanged.

## 4. Registration strategy — opt-in only

`createDefaultAnalysisProviderRegistry()` (no arguments) still
returns a registry that contains **only Qwen**. Existing
production callers therefore see no behavior change.

A Volcengine Provider is added **only** when the caller passes it
explicitly:

```js
import { createDefaultAnalysisProviderRegistry } from '@masterpiece/model-runtime/analysis-provider-registry.js';
import { createVolcengineAnalysisProvider } from '@masterpiece/model-runtime/volcengine-analysis-provider.js';

const registry = createDefaultAnalysisProviderRegistry({
  additionalProviders: [createVolcengineAnalysisProvider()],
});
```

This means the Qwen production default is preserved for every
existing call site. The A2 evaluation runner (A2-D) will be the
first place that wires Volcengine in.

## 5. Provider identity and model identity

Per A2 spec §16, `providerId` and `modelId` stay separate:

```
providerId = volcengine
modelId    = doubao-seed-2.1-turbo
```

`createVolcengineAnalysisProvider().supports(configuration)`
matches the configured Profile via:

| Configuration                       | Match |
|-------------------------------------|-------|
| `provider = "volcengine"` or `"ark"`| YES   |
| `provider = "openai-compatible"` or unset AND `model` starts with `doubao-` | YES |
| Other `provider` value              | NO    |

The matcher is also protocol-pinned to `openai-chat-multimodal`
(the Doubao multimodal chat-completion protocol); any other
protocol is rejected even if the model name matches.

## 6. Offline contract tests

`tests/volcengine-analysis-provider-contract.test.js` covers the
A2 spec §22 mandatory test set:

- `registry resolution` — Volcengine resolves when a real
  configured Profile is passed; Qwen is not in the default
  registry unless `additionalProviders` is set.
- `request adaptation fixture` — request envelope (URL pathname,
  method, messageRoles, stream flag, response_format type,
  Authorization header) is preserved against the
  `volcengine-baseline.json` fixture.
- `response adaptation fixture` — Volcengine reasoner returns
  the canonical Analysis Provider result (`runId`, `provider`,
  `model`, `completedAt`, `reportMarkdown`).
- `error normalization` — five source error shapes are mapped to
  the canonical `AUTHENTICATION_FAILED` / `TIMEOUT` /
  `RATE_LIMITED` / `MALFORMED_RESPONSE` / `MODEL_UNAVAILABLE`
  codes.
- `unsupported profile rejection` — non-multimodal protocols and
  Qwen credentials are not picked up by Volcengine; unknown
  Providers still fail explicitly.
- `secret redaction` — a VolcengineReasonerError surfaced through
  the registry never contains the raw API key.

Test results (offline, deterministic, no Provider call):

```
ℹ tests 19
ℹ pass 19
ℹ fail 0
```

## 7. Qwen preservation

After adding Volcengine, every Qwen-only contract test still
passes:

- `npm test`: 783 / 783 PASS (was 764 before A2-B; +19 = the
  Volcengine contract test file).
- `repo:verify`: all 9 verify gates PASS; 28 / 28
  `repo:guard:test` cases PASS (including the existing
  "Qwen production baseline" and "downstream production
  capabilities do not import or branch on Qwen" scans).
- `verify:version-naming` and `verify:current-flows` PASS.

A new scan in
`tests/volcengine-analysis-provider-contract.test.js` mirrors
the existing Qwen downstream-scan: it walks the same scan roots
(`packages/runtime-core/src/application` and
`packages/image-generation-runtime/src`) and fails if any
downstream file imports
`@masterpiece/model-runtime/volcengine-reasoner` /
`...-analysis-provider` or hardcodes `provider = 'volcengine'`.
The scan currently finds zero violations.

## 8. STOP conditions encountered

None of STOP-A2-01 through STOP-A2-19 triggered. The
integration:

- did not invent any model ID;
- did not duplicate the analysis pipeline;
- did not modify any frozen analysis Prompt;
- did not change Qwen request semantics;
- does not silently fall back to Qwen when Volcengine fails
  (the registry has no such fallback path — A1 contract §24
  preserved);
- did not require browser-side API key exposure;
- does not change the production default;
- does not change any Golden evidence.

## 9. What is NOT in A2-B.1

- No real Provider call was performed in this batch. The
  contract tests run against an injected HTTP client
  (`options.client` in the reasoner factory).
- No evaluation runner was built. (A2-D.)
- No evaluation corpus was built. (A2-C.)
- No human review was performed. (A2-F.)
- No production default was changed. (A2-H, only if A2-G
  decides.)

## 10. A2-B.2 — Capability probe (next, opt-in)

The 4-class capability probe promised in A2-A §6 (vision input /
2-image / JSON Schema / context) is the next step and must be
triggered by the user (per A2 spec §20: real Provider smoke is
manual / opt-in / networked / cost-sensitive).

Probe plan (subject to user authorization):

1. Vision input: send a single 1-image multimodal request;
   expect non-empty `reportMarkdown`; record `model` identity
   and any usage / latency.
2. Multi-image: send a 2-image multimodal request; expect
   non-empty `reportMarkdown`; record same.
3. Structured output: send a 1-image request with a JSON Schema;
   expect the response_format to be honored (non-empty
   `reportMarkdown` parseable as JSON, or schema-shaped text);
   record same.
4. Context / capability introspection: read the response
   `model` field, any usage block, and a small probe of
   context-window behavior (e.g. by truncating a long prompt
   to a known size and observing finish_reason).

All four probe requests will be triggered through an explicit
`npm run visual-analysis:probe-volcengine` script (planned in
A2-B.2) so the smoke can never run unattended and never enters
`repo:verify` or default CI (per A2 spec §21 and §105).

## 11. A2-B exit gate checklist

- [x] Provider adapter implemented (volcengine-reasoner.js,
      volcengine-analysis-provider.js).
- [x] Provider registered (via opt-in `additionalProviders`).
- [x] Profile / Credential authority reused (no new
      credentials store; the existing settings.json profile is
      used as-is).
- [x] Offline contract tests PASS (19 / 19).
- [x] Qwen baseline preserved (npm test 783/783,
      repo:verify all green, Qwen scan clean).
- [x] Secret redaction PASS.
- [ ] Opt-in real smoke (capability probe) — **PENDING user
      authorization in A2-B.2**.

A2-B.1 closes. A2-B.2 (capability probe) awaits user go-ahead.
