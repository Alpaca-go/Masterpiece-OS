# A3-K Final Regression

**Phase:** Visual Analysis A3 — Default Provider Transition & Production Readiness
**Batch:** A3-K
**Date:** 2026-08-12
**Status:** `A3_K_REGRESSION_DESIGNED` (design doc; regression in A3 Phase 3)
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A3-Default-Provider-Transition-Production-Readiness.md` §34, §35, §36, §37, §38

## 1. Final Regression Commands (per A3 spec §34)

```bash
npm run repo:verify
npm test
npm run cli:test
npm run runtime:test
npm run web:smoke
npm run golden:test
```

Actual Web must PASS.

## 2. Golden Rule (per A3 spec §35)

Golden must remain 5/5 PASS. **Do not update Golden** to
accommodate the provider transition.

A3-K re-runs the same `golden:test` that A2-I ran (5/5 PASS
+ G-04 hard gate PASS at A2-I commit `0c453ed` and A2-I commit
`295f83f`).

## 3. Prompt Rule (per A3 spec §36)

Frozen prompts: UNCHANGED. Prompt digest mismatch: 0.

The A3 batch does **not** touch:

- `docs/visual-analysis/A2-evaluation-rubric.md`
- `docs/visual-analysis/A2-evaluation-corpus.md`
- The analysis engine prompt builder
- The deep creative director prompt

The reasoner layer (Qwen + Volcengine) is allowed to add
metadata fields (`providerInvocationMs`, `provenance.usage`,
etc.) but the **analytical content** of the prompt is
unchanged.

## 4. Downstream Independence (per A3 spec §37)

Must remain:

```text
Reference First provider awareness = 0
Space provider awareness = 0
Packaging provider awareness = 0
Project Context provider awareness = 0
```

A3-K re-runs the same R5 scan that A2-I ran
(`tests/analysis-provider-contract.test.js` L107-128 +
`tests/volcengine-analysis-provider-contract.test.js` L148+).
Result pre-A3: 0 violations. Expected post-A3: 0 violations.

## 5. Provider Branching Audit (per A3 spec §38)

Search current product code for:

```js
if provider === 'qwen'
if provider === 'volcengine'
switch(provider)
```

Provider-specific branching is allowed only inside:

- provider adapters
- provider registry / policy layer

**Not in business logic.**

A3-K re-runs the same scan. The only allowed branching is:

- `packages/model-runtime/src/qwen-analysis-provider.js` `supports()` (Qwen provider factory — adapter)
- `packages/model-runtime/src/volcengine-analysis-provider.js` `supports()` (Volcengine provider factory — adapter)
- `packages/model-runtime/src/analysis-provider.js` `resolve()` (registry — policy layer)
- `packages/model-runtime/src/analysis-provider-registry.js` `createDefaultAnalysisProviderRegistry` (registry — policy layer)
- `packages/runtime-core/src/application/pipeline-service.ts` (runtime policy facade — policy layer)

No other layer branches on provider identity in business
logic.

## 6. STOP-A3 gate precheck

- STOP-A3-02 (Need to modify frozen prompt) NOT TRIGGERED (A3 batch does not touch prompts)
- STOP-A3-03 (Need to update Golden) NOT TRIGGERED (A3 batch does not touch Golden fixtures)
- STOP-A3-04 (Need to add provider branches to downstream business logic) NOT TRIGGERED (only the policy layer branches; the business logic remains provider-agnostic)

## 7. Acceptance

- [x] Final regression commands listed (per A3 spec §34)
- [x] Golden rule recorded (5/5 PASS, G-04 hard gate)
- [x] Prompt rule recorded (UNCHANGED)
- [x] Downstream independence recorded (0 violations)
- [x] Provider branching audit recorded (only policy / adapter layer branches)
- [ ] (Phase 3) Final regression: 6 suites all PASS
- [ ] (Phase 3) Actual Web PASS
- [ ] (Phase 3) Golden 5/5 PASS
- [ ] (Phase 3) G-04 PASS
- [ ] (Phase 3) R5 scan: 0 violations
