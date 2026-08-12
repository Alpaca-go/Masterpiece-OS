# A3-J Production Smoke Matrix

**Phase:** Visual Analysis A3 — Default Provider Transition & Production Readiness
**Batch:** A3-J
**Date:** 2026-08-12
**Status:** `A3_J_SMOKE_DESIGNED` (design doc; smoke runs in A3 Phase 3)
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A3-Default-Provider-Transition-Production-Readiness.md` §31, §32, §33
**Predecessor:** A3-I Web UX design

## 1. Production Smoke Matrix (per A3 spec §31)

| # | Scenario | Type | Run in |
|---:|---|---|---|
| 1 | Default provider smoke (no explicit provider) | Real call (cost-sensitive) | A3 Phase 3, manual opt-in |
| 2 | Explicit Volcengine | Real call (cost-sensitive) | A3 Phase 3, manual opt-in |
| 3 | Explicit Qwen | Real call (cost-sensitive) | A3 Phase 3, manual opt-in |
| 4 | Fallback smoke (Volcengine fails → Qwen used) | Real call (cost-sensitive) — only after Phase 2 fallback implementation | A3 Phase 3, manual opt-in |
| 5 | Unknown provider rejection | Offline contract test | A3 Phase 2 |
| 6 | Missing credentials | Offline contract test | A3 Phase 2 |
| 7 | Timeout path | Offline contract test | A3 Phase 2 |
| 8 | Malformed response path | Offline contract test | A3 Phase 2 |

## 2. Real Provider Calls (per A3 spec §32)

Real smoke remains:

- manual
- opt-in
- cost-sensitive

Do not add to default CI.

## 3. Offline Contract Tests (per A3 spec §33)

Must cover:

```text
Provider policy resolution         (A3-A)
Registry resolution               (A1 / A2 contract, re-verified)
Fallback classification           (A3-B)
Fallback provenance              (A3-B + A3-C)
Manual override                   (A3-G)
Unknown provider                  (A3-A + A2-H §14)
Qwen explicit selection            (A2-H §13)
Volcengine explicit selection      (A2-H §13)
```

No real network calls.

### 3.1 New offline tests (Phase 2 implementation)

- `tests/provider-policy.test.js` (new) — asserts the policy
  object structure (default = Volcengine, alternative = Qwen,
  fallback categories, manual override precedence)
- `tests/fallback-classification.test.js` (new) — asserts that
  `isFallbackEligible(error)` returns `true` for the 4 eligible
  categories and `false` for the 6 non-fallback categories
- `tests/provenance-shape.test.js` (new) — asserts the canonical
  result includes the `provenance` object with all required
  fields
- `tests/cli-default-resolution.test.js` (new) — asserts the
  CLI resolves to the policy default when no reasoner is
  injected, and respects the explicit `--provider` override
- `tests/observability-fields.test.js` (new) — asserts the
  reasoner layer records `providerInvocationMs` and the
  `provenance.usage` object

### 3.2 Existing offline tests (re-verified)

- `tests/analysis-provider-contract.test.js` 13/13 (A2-H reframed)
- `tests/volcengine-analysis-provider-contract.test.js` 19/19 (A2-H reframed)
- `tests/qwen-reasoner.test.js` (existing) — re-run
- `tests/volcengine-reasoner.test.js` (existing) — re-run
- `tests/provider-contract-fixtures/qwen-baseline.json` (unchanged)
- `tests/provider-contract-fixtures/volcengine-baseline.json` (unchanged)

## 4. Real Smoke Targets (Phase 3)

| Scenario | Provider | Model | Expected canonical result | Source |
|---|---|---|---|---|
| Default | (unset) | `doubao-seed-2-1-turbo-260628` | PASS, `result.provider = 'volcengine'` | `.codex-smoke/a2-h-real-smoke.mjs` (A2-I re-use) |
| Explicit Volcengine | `volcengine` | `doubao-seed-2-1-turbo-260628` | PASS, `result.provider = 'volcengine'` | (new) explicit `provider` field in the runner |
| Explicit Qwen | `qwen` | `qwen3.6-plus` | PASS, `result.provider = 'qwen'` | `.codex-smoke/a2-h-real-smoke.mjs` (A2-I re-use) |
| Fallback (Volcengine → Qwen) | (unset) | `doubao-seed-2-1-turbo-260628` (fail), Qwen fallback | PASS, `result.provenance.fallback.fallbackTriggered = true` | (new) requires Phase 2 fallback implementation |

The fallback smoke requires a **forced Volcengine failure**
(e.g. by setting the Volcengine API key to an invalid value);
this is a real-provider smoke with cost + opt-in.

## 5. STOP-A3 gate precheck

- STOP-A3-09 (Real provider calls enter repo:verify / CI) NOT TRIGGERED (smoke is manual / opt-in; offline contract tests cover the rest)
- STOP-A3-05 (Fallback is silent) NOT TRIGGERED (the offline contract tests assert the provenance fields are present when fallback fires)

## 6. Acceptance

- [x] Default provider smoke designed (Phase 3 run)
- [x] Explicit Volcengine smoke designed (Phase 3 run)
- [x] Explicit Qwen smoke designed (Phase 3 run)
- [x] Fallback smoke designed (Phase 3 run, requires Phase 2 fallback)
- [x] Unknown provider rejection (offline contract test, Phase 2)
- [x] Missing credentials path (offline contract test, Phase 2)
- [x] Timeout path (offline contract test, Phase 2)
- [x] Malformed response path (offline contract test, Phase 2)
- [ ] (Phase 2) New offline contract tests implemented
- [ ] (Phase 3) Real smoke runs all 4 scenarios PASS
