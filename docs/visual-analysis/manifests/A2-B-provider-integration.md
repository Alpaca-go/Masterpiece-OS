# A2-B Manifest

**Batch:** A2-B
**Purpose:** Real Provider Adapter Integration — wire Candidate A
(volcengine / doubao-seed-2.1-turbo) through the A1 Analysis
Provider Contract without disturbing the Qwen production
baseline.
**Status:** `A2_B_INTEGRATION_PASS` (2026-08-12) — offline
contract tests + Qwen preservation verified. A2-B.2 capability
probe pending user authorization.

## Files

### Created
- `packages/model-runtime/src/volcengine-reasoner.js`
- `packages/model-runtime/src/volcengine-analysis-provider.js`
- `tests/provider-contract-fixtures/volcengine-baseline.json`
- `tests/volcengine-analysis-provider-contract.test.js`

### Modified
- `packages/model-runtime/src/index.js` — re-exports
  Volcengine reasoner + analysis-provider.
- `packages/model-runtime/package.json` — subpath exports.

## Adapter scope (per A2 spec §17, §18)

The Volcengine adapter owns ONLY:
- provider identity (`volcengine`)
- capabilities (`multimodal-analysis`, `structured-output`)
- profile matching (`supports()`)
- authentication adaptation (Bearer + API key)
- endpoint (Ark chat completions)
- request envelope (OpenAI-compatible multimodal chat completion)
- image / message adaptation (sharp optimize + data: URL)
- provider invocation (deadline + cancellation)
- response adaptation (canonical result shape)
- provider error normalization (`VOLCENGINE_*` codes → A1
  canonical codes via `normalizeAnalysisProviderError`)

The Volcengine adapter does NOT own:
- Prompt semantics
- Masterpiece analysis methodology
- project persistence
- Reference First / Space / Packaging
- report authority
- evaluation scoring

## Registration strategy

`createDefaultAnalysisProviderRegistry()` (no args) still returns
a single-Provider registry (Qwen only). Volcengine is added only
when the caller passes it via
`additionalProviders: [createVolcengineAnalysisProvider()]`. This
preserves the Qwen production default for every existing call
site.

## Verification

- `tests/volcengine-analysis-provider-contract.test.js`:
  19 / 19 PASS, offline, deterministic, no real Provider call.
- `npm test`: 783 / 783 PASS (was 764 / 764 before A2-B;
  +19 = Volcengine contract tests).
- `repo:verify`: all 9 verify gates PASS; 28 / 28
  `repo:guard:test` cases PASS; `verify:version-naming`,
  `verify:current-flows` PASS.
- Qwen baseline scan: clean (existing
  `tests/analysis-provider-contract.test.js` "downstream
  production capabilities do not import or branch on
  provider implementations" test still passes).
- New A2 Volcengine downstream scan: clean (no production
  module imports the Volcengine adapter directly).

## Qwen preservation contract (A2 spec §23)

- Qwen default: PRESERVED (default registry still 1 Provider).
- Qwen request semantics: PRESERVED (reasoner file unchanged).
- Qwen Prompt: UNCHANGED.
- Qwen baseline fixture (`qwen-baseline.json`): unchanged;
  the existing A1 test still passes against it.

## STOP conditions encountered

None of STOP-A2-01 through STOP-A2-19 triggered.

## What is NOT in A2-B.1

- No real Provider call was performed.
- No evaluation runner was built.
- No evaluation corpus was built.
- No human review was performed.
- No production default was changed.

## Rollback

Revert this commit. The Volcengine adapter is opt-in only
(default registry unchanged); reverting it removes the
Volcengine Provider option without affecting any existing
production path.

## Open (user-owned) items

- Authorize the A2-B.2 capability probe (4-class: vision /
  multi-image / structured / context). Per A2 spec §20,
  real Provider smoke is manual / opt-in / networked /
  cost-sensitive; it must be triggered by explicit user
  action and must never enter `repo:verify` or default CI.
