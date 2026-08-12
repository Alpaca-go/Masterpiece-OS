# A2-H CLI Default Smoke

**Phase:** Visual Analysis A2 — Default Provider Switch
**Batch:** A2-H.6 (CLI Default Verification) + A2-H.21 / §22
**Date:** 2026-08-12
**Status:** `A2H_CLI_DEFAULT_SMOKE_PASS` (cli:test post-switch 40/40 PASS; CLI has no independent default-provider authority)
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A2-H-Default-Provider-Switch.md` §21, §22

## 1. Run Record

| Field | Value |
|---|---|
| Runner | `npm run cli:test` |
| Pre-switch (baseline) | 40/40 PASS (see [`A2-H-final-report.md`](./A2-H-final-report.md) §"Baseline") |
| Post-switch (this run) | 40/40 PASS |
| Wall clock | ~0.8s |
| Exit code | 0 |

## 2. CLI Default-Provider Authority — Structural Finding

Per A2-H spec §7 / §8 (single-authority) and the audit in
[`A2-H-default-provider-authority-audit.md`](./A2-H-default-provider-authority-audit.md)
§4.2:

- **The CLI does not own an independent default-provider
  authority.** The CLI's analysis entry point
  (`apps/cli/src/analysis-engine/bootstrap.js`,
  `runAnalysisPipeline(input, options = {})`) accepts the
  reasoner as an injected dependency:
  - `options.deepCreativeDirectorReasoner` (an already-built
    reasoner function), or
  - `options.deepCreativeDirectorReasonerFactory` (a factory
    that returns a reasoner).
- If neither is provided, the CLI throws inside
  `runDeepCreativeDirector` because no reasoner is available
  for the call. There is no fallback to Qwen or Volcengine
  inside the CLI.
- The CLI therefore does not need to be patched for the
  default-provider switch. The harness (whatever invokes the
  CLI in production) is responsible for the default-provider
  choice; that harness reads from the same Node Runtime Host
  pipeline-service (`packages/runtime-core/src/application/pipeline-service.ts:388`),
  which calls `createDefaultAnalysisProviderRegistry()` —
  the **single** default-provider authority.

## 3. Mapping to A2-H spec §21 / §22 acceptance criteria

| A2-H §21 / §22 requirement | Evidence | Status |
|---|---|---|
| CLI resolves the same semantic default | CLI does not own a default; the harness reads from the shared pipeline-service default registry. After the A2-H switch, the shared default registry's first entry is Volcengine. | PASS (by structural proof) |
| `no explicit provider` → Volcengine / `doubao-seed-2.1-turbo-260628` | Verified at runtime layer via `tests/analysis-provider-contract.test.js` `default registry first provider is Volcengine (A2-G default)` | PASS |
| `explicit qwen` → Qwen / `qwen3.6-plus` | Verified via `tests/analysis-provider-contract.test.js` `unset provider with the baseline Qwen model resolves to Qwen` (L61, unchanged) and `default registry resolves the Qwen production baseline independently from model identity` (L23, reframed) | PASS |
| CLI does not own another default (A2-H §22) | `bootstrap.js` has no `DEFAULT_MODEL = ...` constant; no `qwen` or `volcengine` hard-code in the CLI bootstrap. CLI tests cover 40 cases, all PASS post-switch. | PASS |

## 4. CLI Test Suite Summary (post-switch)

`npm run cli:test` — 40 / 40 PASS. The CLI test suite is unchanged
in content; the post-switch run is the same suite that passed in
the A2-H §5 baseline. No CLI test was modified by the A2-H switch.

## 5. STOP-A2H-06 (Web / CLI default conflict) precheck

- Web resolves default through `getProviderCredentials()` (profile
  store) → `pipeline-service.ts:388` → `createDefaultAnalysisProviderRegistry()`.
- CLI (when used through the production harness) resolves default
  through the same `pipeline-service.ts:388`.
- Both paths therefore resolve to the same default. STOP-A2H-06
  NOT TRIGGERED.

## 6. Acceptance criteria

- A2-H §21 CLI resolves new default — PASS
- A2-H §22 no independent CLI default authority — PASS
- A2-H §58 CLI PASS — PASS
