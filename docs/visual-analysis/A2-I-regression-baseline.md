# A2-I Regression Baseline

**Phase:** Visual Analysis A2 — Full Regression & Final Acceptance
**Batch:** A2-I.3 (Freeze Before Regression)
**Date:** 2026-08-12
**Status:** `A2I_BASELINE_FROZEN` (regression baseline recorded; R1 / R2 / R3 / R5 / R6 in progress)
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A2-I-Full-Regression-Final-Acceptance.md` §3, §4

## 1. Entry Gate (per A2-I spec §1)

- **A2-H gate status:** `A2H_DEFAULT_PROVIDER_SWITCH_PASS` ✓
- **Default Provider:** volcengine
- **Default Model:** `doubao-seed-2-1-turbo-260628` (actual API alias); canonical id `doubao-seed-2.1-turbo` per A2-H spec
- **Qwen status:** PRESERVED (registered as ALTERNATIVE / FALLBACK / REGRESSION_BASELINE)
- **Frozen Prompt Changed:** NO
- **Golden Updated:** NO
- **Current Authority Conflict:** 0

STOP-A2I-01 (A2-H gate not PASS) NOT TRIGGERED.

## 2. Repository State (per A2-I spec §3)

| Field | Value |
|---|---|
| **HEAD** | `4e74fbd` |
| **Branch** | `codex/visual-analysis-a1-multi-provider` |
| **Working tree status** | CLEAN (no uncommitted changes) |
| **A2-H commit** | `17284b7` — `feat(model-runtime): A2-H apply default Visual Analysis provider switch (qwen -> volcengine)` |
| **A2-G commit** | `06e3162` — `docs(visual-analysis): A2-G production model decision (CHANGE_DEFAULT_TO_VOLCENGINE, decision-only)` |
| **A2-F commits** | `3c03ce3` (transfer + reveal), `5cf1021` (blind bundle), `f4b5218` (template) |
| **A2-E commit** | `294a291` — `docs(visual-analysis): A2-E Cost / Latency / Reliability record` |
| **A2-D commit** | `9136214` — `docs(visual-analysis): A2-D evaluation matrix + raw outputs (14/14 ok)` |
| **A2-C commit** | `1c554ab` — `docs(visual-analysis): A2-C corpus + rubric frozen (commit gate)` |
| **A2-B commits** | `18da573` (probe PASS), `f7af745` (Real Provider Adapter Integration) |
| **A2-A commit** | `270faa8` — `chore(visual-analysis): A2-A close on user confirmation` |

### Last 3 commits (HEAD context)

```
4e74fbd ﻿docs(visual-analysis): A2-H final report update (real provider smoke PASS, 32/32 acceptance, A2H_DEFAULT_PROVIDER_SWITCH_PASS)
509dc17 docs(visual-analysis): A2-H deliverable docs (manifest, web smoke, CLI smoke, preservation, regression, final report)
17284b7 feat(model-runtime): A2-H apply default Visual Analysis provider switch (qwen -> volcengine)
```

## 3. Default Provider / Model Snapshot

| Field | Value |
|---|---|
| **Default Analysis Provider** | `volcengine` |
| **Default Model** | `doubao-seed-2-1-turbo-260628` (per A2-D API response); canonical id `doubao-seed-2.1-turbo` per A2-H spec |
| **Default Model Context capability** | UNKNOWN (per A2-B.2 probe; not estimated) |
| **Authority file** | `packages/model-runtime/src/analysis-provider-registry.js` L4-9 (`createDefaultAnalysisProviderRegistry`) |
| **Default resolution mechanism** | `supports(configuration)` predicate filter on `provider` field + model prefix dispatch |

## 4. Qwen Registration Status (per A2-H §11)

- **Qwen provider registration:** PRESENT (second entry in default registry)
- **Qwen adapter file:** `packages/model-runtime/src/qwen-analysis-provider.js` (unchanged)
- **Qwen reasoner file:** `packages/model-runtime/src/qwen-reasoner.js` (unchanged)
- **Qwen baseline fixture:** `tests/provider-contract-fixtures/qwen-baseline.json` (unchanged)
- **Qwen contract test:** `tests/analysis-provider-contract.test.js` (preserved + 2 new tests added)
- **Qwen explicit selection:** PASS (verified by `tests/analysis-provider-contract.test.js` L23-27 reframed and L61-64 unchanged)
- **Qwen runtime smoke (A2-H §25):** PASS (run 2026-08-12T11-48-54-276Z; `chatcmpl-3bd0d24a-...`; canonical result PASS)

## 5. Prompt Digests (per A2 spec §48 / §121)

| File | SHA-256 |
|---|---|
| `docs/visual-analysis/A2-evaluation-rubric.md` | `7220F30FF07226D1920AF085C562DD65BE2A799D816E6524960B9933E84F8C35` |
| `docs/visual-analysis/A2-evaluation-corpus.md` | `12D1526F6CEB2BE3733532DD43CAAE266403E8E96A3013EEF33711D88D246637` |

The rubric and corpus docs are the canonical Visual Analysis
prompt authority at the corpus-freeze level (A2 spec §48).
**No change in A2-H.** Re-verify at end of A2-I for STOP-A2I-07
/ STOP-A2I-08.

## 6. Golden Digests (per A2 spec §121)

| File | SHA-256 |
|---|---|
| `tests/provider-contract-fixtures/qwen-baseline.json` | `244D83C70E1B06142E4C3138C13730690937EAF2B4F524DCBABD75BB0F3AD6D0` |
| `tests/provider-contract-fixtures/volcengine-baseline.json` | `4DBB057930B7263BA8115AB1F8D09495C126CB9BBAE1FEB6C8183DFD62A2936B` |

Golden fixtures are unchanged from A2-C freeze. Re-verify
at end of A2-I for STOP-A2I-09 (Golden requires update).

## 7. A2-C Corpus Manifest Hash (per A2 spec §121)

| Field | Value |
|---|---|
| `manifest.manifestHash` (logical) | `f57da490dcb31f99f07142aaa3b3fc9a2bd2be0d3a5b849e872adb117100cdaa` |
| `manifest.frozenAt` | `2026-08-12T17:14:44+08:00` |
| `manifest.frozenBy` | `Mavis (per user authorization at 2026-08-12T17:14:44+08:00)` |
| `manifest.manifestHashAlg` | `SHA-256` |
| `manifest.productVersion` | `5.0.0-rc.1` |
| `manifest.a1BaselineTag` | `5.0.0-rc.1` |
| File-level SHA-256 (informational) | `65745CB1DC601798881A58CC1AC4305D1AB36340E8B677B825AE43A246DA338F` |

The file-level SHA-256 differs from the logical `manifestHash`
because the file contains the manifest hash as a self-
referential field (chicken-and-egg). The **logical** hash is the
spec source of truth; it matches the A2 spec §121 reference
hash `f57da490dcb31f99f07142aaa3b3fc9a2bd2be0d3a5b849e872adb117100cdaa`.

## 8. A2-G Decision Reference (per A2-I spec §45)

- **A2-G commit:** `06e3162`
- **Decision file:** `docs/visual-analysis/A2-production-model-decision.md`
- **Decision file SHA-256:** `A836D2DC93221C1BA8F90B8ED03B3A3B8838731B7DFEE917EA1C56048247CBD0`
- **Decision statement:** `CHANGE_DEFAULT_TO_VOLCENGINE` (no change in A2-I)

A2-I MUST NOT change A2-F scores, A2-G mapping, or A2-G
provider decision. STOP-A2I-11 is unrelated (existing
project corruption); STOP-A2I-15 (secrets) and STOP-A2I-16
(test weakening) are the most-likely accidental violations.

## 9. CURRENT Authorities (per A2-I spec §3, §6)

A2-I must verify that A2 did not reintroduce:
- `vNext` folders → scan with `verify:version-naming`
- `v10 / v11 / v12` production namespaces → scan with `verify:version-naming`
- duplicate `CURRENT` implementations → scan with `verify:no-obsolete-code` and `verify:production-boundaries`
- legacy Desktop runtime authority → scan with `verify:no-obsolete-code`
- provider-specific duplicate pipelines → audit by hand + `tests/analysis-provider-contract.test.js` L107-128

Pre-A2-I snapshot (to be re-verified by `npm run repo:verify`):

| Guard | Pre-A2-I status |
|---|---|
| `verify:repository-contract` | 28/28 PASS (A2-H §5 baseline) |
| `verify:version-consistency` | PASS |
| `verify:version-naming` | PASS |
| `verify:workspace-boundaries` | PASS |
| `verify:no-obsolete-code` | PASS |
| `verify:production-boundaries` | PASS |
| `verify:no-project-specific-production-rules` | PASS |
| `verify:golden-boundary` | PASS |
| `verify:current-flows` | PASS |
| `repo:guard:test` | 5/5 PASS |

`Current Authority Conflict` = 0
`New Version Namespace` = 0
STOP-A2I-13, STOP-A2I-14 NOT TRIGGERED (pre-baseline).

## 10. Pre-A2-I Test Counts (per A2-H §5)

| Suite | Pre-A2-I count |
|---|---:|
| `npm test` | 785/785 |
| `npm run cli:test` | 40/40 |
| `npm run runtime:test` | 334/334 |
| `npm run web:smoke` | PASS (status: pass, providerResolution: true) |
| `npm run golden:test` | 5/5 PASS (G-04 hard gate: NOT_APPLICABLE → PASS) |
| `tests/analysis-provider-contract.test.js` | 13/13 |
| `tests/volcengine-analysis-provider-contract.test.js` | 19/19 |
| **Total lightweight** | **1187 + web-smoke + golden 5/5** |

## 11. Real Provider Smoke Reference (per A2-H §23 / §25)

The A2-H real smoke runs (cost-sensitive, user-authorized) are
the seed for A2-I §15 real smoke re-runs. The A2-H audit trail
is at `.codex-smoke/a2-h-real-smoke/2026-08-12T11-48-54-276Z.json`
(gitignored, contains canonical result contract only — no API
keys).

| Run | Provider | Model | Elapsed | Canonical result | runId |
|---|---|---|---|---|---|
| A2-H §23 Volcengine default | volcengine | `doubao-seed-2-1-turbo-260628` | 23,283.859 ms | PASS | `021786535334098ccb5cb80d056078148fd97ed4662bb356d08c3` |
| A2-H §25 explicit Qwen | qwen | `qwen3.6-plus` | 57,131.398 ms | PASS | `chatcmpl-3bd0d24a-2aae-9be1-b1e7-4c07f07768b3` |

A2-I §15 will re-run real smoke (same or a different
representative case) to confirm the new default path is still
end-to-end correct after any intervening A2-I fixes (if any).
Currently **no fixes are planned**; the A2-I run is expected
to be a clean pass-through.

## 12. Out-of-Scope / Forbidden in A2-I (per A2-I spec §2 / §38)

A2-I must not:
- redesign Provider architecture
- change A2-G decision
- change Rubric
- change evaluation corpus
- rewrite prompts
- tune Golden
- introduce automatic fallback architecture
- perform repository cleanup
- rename unrelated modules
- add new providers
- start A3 work

## 13. Audit-Trail Invariants

- API keys: **never** committed, **never** logged, **never** printed
- Test fixtures use `apiKey: 'fixture-secret'` only
- Real smoke audit trail (run JSONs) is written to `.codex-smoke/`
  (gitignored)
- The user-supplied env file `.codex-smoke/a2-h-env.ps1` is the
  only file that may contain real API keys; it is gitignored

STOP-A2I-15 (secrets in repository / acceptance artifacts) NOT
TRIGGERED pre-A2-I.
