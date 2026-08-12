# A2 Final Freeze

**Phase:** Visual Analysis A2 — Final Freeze
**Date:** 2026-08-12
**Status:** `A2_FROZEN` (Visual Analysis Phase A2 is complete; A3 may begin)
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A2-I-Full-Regression-Final-Acceptance.md` §74, §76
**Predecessor:** A2-I Final Acceptance Report (commit _this commit_, `VISUAL_ANALYSIS_A2_PASS`)

## 1. Final commit (this freeze)

`_this commit_` on branch `codex/visual-analysis-a1-multi-provider`
(final acceptance report + this freeze record).

## 2. Default / Alternative

| Field | Value |
|---|---|
| **Default Provider** | volcengine |
| **Default Model** | `doubao-seed-2-1-turbo` (canonical id; A2-D actual API alias `doubao-seed-2-1-turbo-260628` per A2 spec §107) |
| **Alternative Provider** | qwen |
| **Alternative Model** | `qwen3.6-plus` |
| **Qwen Role** | ALTERNATIVE / FALLBACK_ELIGIBLE / REGRESSION_BASELINE |
| **Volcengine Role** | DEFAULT (production) |

## 3. Evaluation decision reference

- **A2-A Candidate Model Discovery** — `270faa8`
- **A2-B.1 Volcengine adapter integration** — `f7af745`
- **A2-B.2 Capability probe** — `18da573` (Vision / Multi-image / Structured = PASS; Context = UNKNOWN)
- **A2-C Corpus + Rubric frozen** — `1c554ab`
  - Manifest hash: `f57da490dcb31f99f07142aaa3b3fc9a2bd2be0d3a5b849e872adb117100cdaa`
  - Frozen at: `2026-08-12T17:14:44+08:00`
  - Frozen by: Mavis (per user authorization)
- **A2-D Evaluation Matrix** — `9136214` (14/14 OK)
- **A2-E Cost / Latency / Reliability** — `294a291`
- **A2-F Human Visual Review** — `5cf1021` (blind bundle) + `f4b5218` (template) + `3c03ce3` (transfer + reveal)
- **A2-G Provider Decision** — `06e3162` (`CHANGE_DEFAULT_TO_VOLCENGINE`, 7/7 case wins, mean margin +0.88)
- **A2-H Default Provider Switch** — `17284b7` (apply) + `509dc17` (deliverable docs) + `4e74fbd` (final report with real smoke)
- **A2-I Full Regression & Final Acceptance** — `0c453ed` (Phase 1) + `161f843` (Phase 2) + _this commit_ (final acceptance + freeze)

## 4. A2-H switch reference

- A2-H switch commit: `17284b7`
- Diff scope: 1 production file (`packages/model-runtime/src/analysis-provider-registry.js`), 3-line diff + 7-line comment; 2 test files reframed; 1 audit doc + 6 deliverable docs + 1 final report
- Qwen preservation: PASS (Qwen remains registered as alternative / fallback / regression baseline; explicit Qwen selection still works; A1 contract test reframed to verify A2-H §11)
- STOP-A2H-01 through STOP-A2H-15: all NOT TRIGGERED

## 5. A2-I acceptance reference

- A2-I final acceptance: `VISUAL_ANALYSIS_A2_PASS` (this commit)
- A2-I §70 criteria: 30 of 30 PASS
- A2-I STOP-A2I-01 through STOP-A2I-17: all NOT TRIGGERED
- A2-I issue ledger: 0 confirmed A2 regressions
- A2-I fix count: 0 (no fixes required during A2-I)
- A2-I final clean run: `repo:verify` 28/28 + `npm test` 785/785 + `cli:test` 40/40 + `runtime:test` 334/334 + `golden:test` 5/5
- A2-I final Actual Web run: `web:smoke` (run 1 + run 2) `status: pass, providerResolution: true, electronProcessCountZero: true, desktopMainProcessCountZero: true`

## 6. Prompt digests (per A2 spec §121)

| File | SHA-256 |
|---|---|
| `docs/visual-analysis/A2-evaluation-rubric.md` | `7220F30FF07226D1920AF085C562DD65BE2A799D816E6524960B9933E84F8C35` |
| `docs/visual-analysis/A2-evaluation-corpus.md` | `12D1526F6CEB2BE3733532DD43CAAE266403E8E96A3013EEF33711D88D246637` |
| `docs/visual-analysis/A2-evaluation-corpus.manifest.json` (logical `manifestHash`) | `f57da490dcb31f99f07142aaa3b3fc9a2bd2be0d3a5b849e872adb117100cdaa` |

Frozen Prompt Changed = NO. Prompt digest mismatch = 0.

## 7. Golden status (per A2 spec §121)

| File | SHA-256 |
|---|---|
| `tests/provider-contract-fixtures/qwen-baseline.json` | `244D83C70E1B06142E4C3138C13730690937EAF2B4F524DCBABD75BB0F3AD6D0` |
| `tests/provider-contract-fixtures/volcengine-baseline.json` | `4DBB057930B7263BA8115AB1F8D09495C126CB9BBAE1FEB6C8183DFD62A2936B` |

Golden Updated = NO. `golden:test` 5/5 PASS; G-04 hard gate PASS (NOT_APPLICABLE → PASS).

## 8. Repository status (per A2 spec §121)

- Current Authority Conflict = 0
- New Version Namespace = 0
- Repository Contract = PASS (`repo:verify` 28/28)
- Current Product Feature Lost = 0
- Web + Node Runtime Host = primary execution path; no Desktop runtime dependency
- Working tree = clean (post A2-I final commit)
- Branch = `codex/visual-analysis-a1-multi-provider`

## 9. Known non-blocking limitations (per A2-I spec §75)

1. **Volcengine cost visibility incomplete.** Neither reasoner surfaces `usage` in the canonical Analysis Provider result. Cost observability is a candidate A3 concern (per A2-G §8 follow-up requirement #1 / #2).
2. **Volcengine latency higher than Qwen** (~2.4–2.7×, per A2-E and re-confirmed in A2-I §15 real smoke). UI long-running progress feedback is a candidate A3 concern (per A2-G §8 follow-up requirement #4).
3. **Automatic fallback not implemented.** A2-H §26 and A2-I §26 explicitly excluded introducing broad automatic fallback; A3 may revisit per the spec.
4. **Provider health dashboard absent.** Out of A2 scope; candidate A3 concern.
5. **Context capability still UNKNOWN.** Per A2-B.2 probe and A2-D observation; not estimated per A2 spec §56. A2-G §8 follow-up requirement #5 (larger-n re-evaluation) is the candidate A3 concern.

## 10. A3 handoff (per A2-I spec §76)

Only after `VISUAL_ANALYSIS_A2_PASS` may the project enter:

```text
Masterpiece OS · Visual Analysis
Phase A3 — Default Provider Transition & Production Readiness
```

A3 should **not** repeat A2 acceptance. A2 is frozen.

## 11. Reopening A2

Per A2 spec §121 STOP-A2-08: "Frozen corpus / rubric / Golden
schema / Current Authority cannot be modified based on model
output." Any future change to:

- the A2-C corpus manifest hash,
- the A2 evaluation rubric dimensions / weights,
- the Qwen / Volcengine baseline fixtures,
- the `createDefaultAnalysisProviderRegistry` factory (the
  single semantic default-provider authority),

is a **new A2.x phase** and must be accompanied by a new
A2-G decision, a new A2-H switch, and a new A2-I acceptance
record. The A2 freeze is irrevocable without an A2.x
re-evaluation cycle.

## 12. A2 final state — single sentence

Visual Analysis Phase A2 is **complete and frozen** at
`VISUAL_ANALYSIS_A2_PASS`: Volcengine is the production default
(`doubao-seed-2.1-turbo-260628`); Qwen is preserved as
alternative / fallback / regression baseline (`qwen3.6-plus`);
the multi-provider architecture, repository contract, frozen
prompt, Golden baseline, and current product flows are all
intact; 30 of 30 A2-I §70 criteria PASS; 17 of 17 STOP-A2I
gates NOT TRIGGERED; 0 confirmed A2 regressions; 0 fixes
required during A2-I.
