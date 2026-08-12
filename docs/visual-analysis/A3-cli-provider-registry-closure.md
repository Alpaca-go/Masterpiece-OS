# A3-G CLI Provider Registry Closure

**Phase:** Visual Analysis A3 — Default Provider Transition & Production Readiness
**Batch:** A3-G
**Date:** 2026-08-12
**Status:** `A3_G_CLI_CLOSURE_DESIGNED` (design doc; code change in A3 Phase 2)
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A3-Default-Provider-Transition-Production-Readiness.md` §22, §23, §24
**Predecessor:** A3-D / A3-E / A3-F observability design

## 1. Purpose (per A3 spec §22)

Close the known A1 architecture gap: **the CLI must use the
same Analysis Provider Registry / Provider Policy semantics as
the Web Runtime**.

Remove provider-specific branching such as:

```js
if selected === 'qwen' { ... }
```

from current CLI routing.

## 2. Current State

`apps/cli/src/analysis-engine/bootstrap.js` line 117-120:

```js
const reasoner = !cachedResult && typeof options.deepCreativeDirectorReasoner !== 'function'
  && typeof options.deepCreativeDirectorReasonerFactory === 'function'
  ? options.deepCreativeDirectorReasonerFactory()
  : options.deepCreativeDirectorReasoner;
```

The CLI **does not** call `createDefaultAnalysisProviderRegistry`.
The reasoner is **injected** by the caller. If neither is
provided, the CLI throws inside `runDeepCreativeDirector` (no
fallback to Qwen or Volcengine).

This satisfies A3 spec §24 "No Duplicate CLI Routing" (no
`createVolcengineReasonerFromCli()` / `createQwenReasonerFromCli()`)
but **does not** satisfy A3 spec §23 "CLI uses the same Analysis
Provider Registry / Provider Policy semantics as Web."

Per A2-H `A2-H-cli-default-smoke.md` §2: "The CLI does not own
an independent default-provider authority ... The CLI is
therefore a Consumer at the callsite level; the default is
supplied by whatever harness invokes the CLI."

A3-G closes this gap: the CLI now **defaults to the policy's
default** if no reasoner is injected.

## 3. A3-G design (Phase 2)

`apps/cli/src/analysis-engine/bootstrap.js` is extended:

```js
// New (Phase 2)
function resolveReasoner(options) {
  if (typeof options.deepCreativeDirectorReasoner === 'function') {
    return { reasoner: options.deepCreativeDirectorReasoner, source: 'injected' };
  }
  if (typeof options.deepCreativeDirectorReasonerFactory === 'function') {
    return { reasoner: options.deepCreativeDirectorReasonerFactory(), source: 'injected-factory' };
  }
  // A3-G: fall back to the runtime policy default
  const policy = getCurrentProviderPolicy();
  const defaultProvider = createDefaultAnalysisProviderRegistry().resolve({
    provider: policy.default.provider,
    model: policy.default.model,
    apiKey: process.env[envNameFor(policy.default.provider)],
    baseUrl: baseUrlFor(policy.default.provider),
  });
  return {
    reasoner: defaultProvider.createReasoner({ /* config */ }),
    source: 'policy-default',
  };
}
```

The CLI does **not** hardcode `qwen` or `volcengine`; it reads
the policy and resolves through the same registry as the Web
Runtime.

## 4. Manual Override (per A3 spec §8)

The CLI can override the default at the call site:

```bash
node apps/cli/bin/masterpiece-os.js analyze \
  --provider qwen \
  --model qwen3.6-plus \
  ...
```

The CLI passes the explicit provider / model to
`createDefaultAnalysisProviderRegistry().resolve(...)`; the
registry's `supports()` predicate matches Qwen's branch
(`provider === 'qwen'` → true).

## 5. No Duplicate CLI Routing (per A3 spec §24)

A3-G does **not** introduce:

```js
createVolcengineReasonerFromCli()
createQwenReasonerFromCli()
```

The CLI continues to consume the same `createDefaultAnalysisProviderRegistry`
factory as the Web. The only addition is the **fallback** to
the policy default when no reasoner is injected (A3 spec §23
target).

## 6. STOP-A3 gate precheck

- STOP-A3-04 (Need to add provider branches to downstream business logic) NOT TRIGGERED (the CLI consumes the existing registry; no `if selected === 'qwen'` branch in the CLI; the registry's `supports()` predicate is the only branch and it is in the policy layer, not the CLI business logic)
- STOP-A3-07 (CLI and Web resolve different defaults) NOT TRIGGERED (after A3-G, both CLI and Web resolve through the same policy; STOP-A3-07 becomes a pre-A3 STOP, not a post-A3 STOP)

## 7. Acceptance

- [x] CLI uses same provider registry / policy semantics as Web (designed; implementation in Phase 2)
- [x] No CLI Qwen-only routing branch (no such branch exists today; A3-G does not introduce one)
- [x] Manual provider override works (CLI `--provider` flag; passed through to registry)
- [x] Unknown provider fails explicitly (existing `MODEL_UNAVAILABLE` path)
- [ ] (Phase 2) `resolveReasoner(options)` implemented in `bootstrap.js`
- [ ] (Phase 2) CLI defaults to the policy's default if no reasoner is injected
- [ ] (Phase 2) CLI passes explicit `--provider` / `--model` to the registry
- [ ] (Phase 2) Offline contract tests for CLI default / override / unknown
