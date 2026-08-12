# A2-G Production Model Decision

**Phase:** Visual Analysis A2 — Provider Candidate Integration & Model Evaluation Matrix
**Batch:** A2-G
**Date:** 2026-08-12
**Status:** `A2_G_DECISION_RECORDED` (decision artifact only; **actual default switch deferred** to a follow-up phase per user authorization)
**Scope of this document:** Provider Role assignment + Default Recommendation + Migration impact analysis. **No production code, config, Frozen Prompt, Golden, Persisted Schema, or Current Authority is modified by this batch.**

## 1. Purpose

Per A2 spec §84, A2 must conclude with an explicit production
model decision that names a winner (`KEEP_QWEN_DEFAULT` or
`CHANGE_DEFAULT_TO_<MODEL>`) and records the supporting
evidence. This document is the **decision artifact**; it does
**not** by itself change the runtime default. The actual
default switch and any code-level change is scoped to a
follow-up phase (see §7 / §8).

The decision is bound to the frozen A2-C corpus (`f57da490…`),
the frozen A2-C rubric (`2026-08-12T17:14:44+08:00`), the
A2-D run batch `2026-08-12T09-30-05-859Z`, and the A2-F
human scorecard dated 2026-08-12 (this run). Any modification
of the corpus, rubric, run batch, or scorecard would require
a new A2.x phase and a new decision document.

## 2. Inputs

| Source | Role in this decision |
|---|---|
| [`docs/visual-analysis/A2-evaluation-matrix.md`](./A2-evaluation-matrix.md) | A2-D per-(Case × Provider) raw outputs, contract validation, latency |
| [`docs/visual-analysis/A2-cost-latency-reliability.md`](./A2-cost-latency-reliability.md) | A2-E reliability / latency / cost evidence; reliability 100%/100%, latency ~2.68× Volcengine slower, cost `UNKNOWN` for both |
| [`docs/visual-analysis/A2-human-review-sheet.md`](./A2-human-review-sheet.md) | A2-F scorecard (all 14 cells, 0 hard-fail) + §8.1 per-case reveal mapping |
| [`docs/visual-analysis/A2-model-character-profiles.md`](./A2-model-character-profiles.md) | Per-Provider strength / weakness / failure pattern / recommended role profiles |
| A2 spec §74 | Default tie rule (`KEEP_QWEN_DEFAULT`); cited in `A2-model-character-profiles.md` §4 |
| A2 spec §76 | No automatic routing; role classification is informational only |
| A2 spec §47 | Hard-failure overrides; zero in this run |
| A2 spec §65 | Close-case (within 0.5 weighted) pairwise review; not triggered in this run |
| A2 spec §121 STOP-A2-08 | Frozen corpus / rubric / golden / schema / current authority cannot be modified based on model output |
| User authorization (2026-08-12) | "本阶段只形成 Provider Role / Default Recommendation，不要直接修改生产默认模型、Frozen Prompt、Golden、Persisted Schema 或 Current Authority" |

## 3. Decision framework

### 3.1 Spec §74 default tie rule

The A2 spec §74 default tie rule, as recorded in
`A2-model-character-profiles.md` §4, is **`KEEP_QWEN_DEFAULT`**.
This rule applies **only when the (Case × Provider) scorecard
is a tie** — i.e. when Candidate A and Qwen are within the
spec §65 close-case band on all 7 cases.

### 3.2 This run is not a tie

Per `A2-human-review-sheet.md` §3.1.1 and §8.2:

- **Volcengine wins 7/7 cases.** Every (Case, Provider) tuple
  where Volcengine was the candidate (whether A or B) came out
  on top.
- **Volcengine mean = 4.65, Qwen mean = 3.77, mean margin
  +0.88** in favor of Volcengine.
- **Volcengine min (4.40, C01) > Qwen max (4.03, C05)** — the
  two score distributions do **not overlap** across the 7
  cases. This is a stronger signal than a marginal win on the
  mean.
- **Zero cases fall within the 0.5 weighted-point band**; the
  spec §65 close-case pairwise path is not triggered.

The spec §74 default rule therefore does **not** apply.
The decision is open under the A2-G framework.

### 3.3 User-directed A2-G decision path

Per user authorization on 2026-08-12 (recorded in §2), the
A2-G decision for a non-tie, non-close-case result is to apply
the A2-G decision path: name the winner explicitly
(`KEEP_QWEN_DEFAULT` or `CHANGE_DEFAULT_TO_<MODEL>`).

This is the only stage at which the A2-G decision is
expressed; the actual switch is deferred to a follow-up
phase (see §7 / §8).

## 4. Final decision

### 4.1 Decision statement

> **`CHANGE_DEFAULT_TO_VOLCENGINE`**
> (`doubao-seed-2-1-turbo-260628`)

This is the explicit A2-G production model decision, recorded
per A2 spec §84.

### 4.2 Rationale (bound to frozen evidence)

1. **Volcengine wins 7/7 (Case × Provider) tuples** in the
   A2-F human scorecard. The mean margin (+0.88) is
   dominated by five dimensions: DSE (+0.150 weighted),
   DU (+0.150), HC (+0.143), VU (+0.129), BLF (+0.129).
   See `A2-model-character-profiles.md` §4.3.
2. **No overlap of score distributions**: Volcengine min
   (4.40) > Qwen max (4.03) across the 7 cases. This is
   absolute, not marginal.
3. **Reliability is identical**: both providers 100% success
   rate over 7 runs, 0 contract-validation failures, 0
   timeouts, 0 retries (`A2-cost-latency-reliability.md` §1.1).
4. **The contract compliance is identical**: both providers
   scored 5.00 on RSC across all cases. The decision is a
   **quality of analysis** decision, not a contract-compliance
   decision.
5. **The spec §74 default tie rule does not apply** (not a
   tie). The decision is open under the A2-G framework.
6. **Qwen remains registered** for fallback / alternative
   use (see §5 and §6); this is not a removal decision.

### 4.3 What the decision is not

- **It is not a removal of Qwen.** Qwen is preserved as
  registered alternative / fallback with all adapter, contract,
  baseline, and regression fixture artifacts intact. See §5 / §6.
- **It is not a code change.** No production code, config,
  Frozen Prompt, Golden, Persisted Schema, or Current Authority
  is modified by this batch. See §7.
- **It is not a final spec sign-off.** The decision is bound
  to the A2-C frozen corpus and rubric; any new evidence or
  any change to the corpus / rubric would require a new A2.x
  phase.
- **It is not a routing implementation.** A2 spec §76
  prohibits automatic routing; the role classification is
  informational only.

## 5. Provider Role assignments

| Provider | Model | Recommended role | Status (this batch) |
|---|---|---|---|
| Volcengine | `doubao-seed-2-1-turbo-260628` | **DEFAULT (production)** | decision recorded; actual switch deferred to follow-up phase |
| Qwen | `qwen3.6-plus` | **ALTERNATIVE / FALLBACK** | remains registered; preserved adapter / contract / baseline / fixtures |
| (Other / future candidates) | — | n/a | not in scope of A2-G |

### 5.1 Volcengine (DEFAULT)

- Default for Visual Analysis in any future default-switch
  implementation. The recommended default comes with the
  cost / latency profile documented in
  `A2-cost-latency-reliability.md` §1.2 / §1.3.
- **Cost remains UNKNOWN** for Volcengine as of A2-E; the
  follow-up phase should plan for cost observability
  (reasoner-level `usage` exposure or per-call cost lookup)
  **before** the actual default switch is enabled for
  end-user traffic. See §8.
- **Latency is ~2.68× Qwen** (median 151.4 s vs 56.4 s).
  The follow-up phase should plan for UI-side progress
  feedback and / or pipeline-level budgeting to absorb
  this delta; see §6.

### 5.2 Qwen (ALTERNATIVE / FALLBACK)

- Qwen remains a **registered** provider in
  `packages/model-registry` (entry unchanged).
- The Qwen analysis adapter
  (`packages/model-runtime/src/qwen-analysis-provider.js`),
  the Qwen reasoner
  (`packages/model-runtime/src/qwen-reasoner.js`), the
  Qwen baseline
  (`tests/provider-contract-fixtures/qwen-baseline.json`),
  and the Qwen contract test
  (`tests/qwen-analysis-provider-contract.test.js`) are
  **preserved** unchanged.
- The fallback path is: any Volcengine availability event
  (timeout, contract validation failure, transient error)
  should fall back to Qwen without code change beyond
  config. The follow-up phase should validate that the
  fallback path works end-to-end with a smoke test before
  the actual default switch is enabled.
- The Qwen contract and behavior remain the **control
  reference** for any future A2.x re-evaluation; the
  Qwen baseline fixture is the historical A1 baseline
  that all future candidates are compared against.

## 6. Migration impact analysis (forward-looking, NOT applied in this batch)

This section is a **planning artifact** for the follow-up
phase. No change is made in this A2-G batch.

### 6.1 Latency impact (UI / pipeline)

- Volcengine median latency is **151.4 s** vs Qwen 56.4 s
  (a +95 s delta).
- A2-D cases ranged from 127.8 s to 189.0 s for Volcengine;
  this is consistent across input size, so the delta is
  not just a "larger case" effect.
- The follow-up phase should:
  - **UI**: surface a long-running progress state in the
    creative-session / project-page entry, and provide a
    visible "analyzing…" indicator with a budget warning
    if latency exceeds the 5-minute runner abort threshold.
  - **Pipeline**: if the post-analysis path includes any
    "analyze → plan → generate" sequence, plan for
    per-stage progress feedback; do not assume
    sub-minute analysis.

### 6.2 Cost impact (UNOBSERVED; planning required)

- Cost is `UNKNOWN` for both providers; Volcengine's
  reasoner does not surface `usage`. **No estimate is
  made**, per A2 spec §56.
- The follow-up phase should:
  - Expose `usage` (prompt tokens, completion tokens,
    total tokens) in the canonical Analysis Provider
    result, OR
  - Add a per-call cost lookup table per Provider.
  - Re-run the A2-D cost extraction on a follow-up
    `A2.x` batch **before** end-user traffic is
    switched to Volcengine, so the cost impact is
    observed rather than estimated.

### 6.3 Failure-mode impact (planning required)

- Qwen had a 2.71 average on Hallucination Control and
  dropped to 2 on 4 of 7 cases (C03, C06, C07, …). This
  is a known failure pattern for Qwen.
- Volcengine had a 4.14 average on Hallucination Control
  and never dropped below 4 in any case. The follow-up
  phase should **observe Volcengine's HC on a larger
  corpus** before locking in the default; the A2-D
  n=7 sample is too small to be definitive.

### 6.4 Fallback path (Qwen as registered alternative)

- The fallback path is **structural** (Qwen remains
  registered with adapter / contract / baseline /
  fixtures intact). The follow-up phase should:
  - Validate the fallback switch with a smoke test
    (Qwen still works end-to-end on a representative
    project after the Volcengine default is enabled).
  - Document the operational trigger for fallback
    (timeout, contract validation, transient error) in
    the runtime.

### 6.5 Regression / audit impact

- The Qwen baseline fixture
  (`tests/provider-contract-fixtures/qwen-baseline.json`)
  remains the **A1 control reference**. Any future A2.x
  re-evaluation must compare against the same baseline.
- The Volcengine baseline fixture
  (`tests/provider-contract-fixtures/volcengine-baseline.json`)
  becomes a **secondary control** for the post-A2-G
  world. The follow-up phase should ensure both fixtures
  are exercised in the regression gate.
- All 14 raw outputs under
  `docs/visual-analysis/evaluation/{caseId}/{provider}/`
  are preserved unchanged; the A2-F blinded bundle under
  `docs/visual-analysis/human-review/` is preserved
  unchanged.

### 6.6 What is NOT impacted (per A2 spec §121)

- **Frozen Prompt** (provider-agnostic, set at corpus
  freeze): unchanged.
- **Golden cases** (`evaluation/golden-cases/`): unchanged.
- **Persisted Schema** (canonical Analysis Provider result
  contract): unchanged.
- **Current Authority** (`AGENTS.md` /
  `BASELINE_LOCK.md` / `CURRENT_BASELINE.md`): unchanged.
- **No new code path** is added in this batch; the A2-G
  decision is documentation-only.

## 7. In-scope vs Out-of-scope (this A2-G batch)

### 7.1 In-scope (this batch)

- Record the A2-G decision in this document.
- Record the per-Provider role assignment in
  `A2-model-character-profiles.md` §5.
- Transfer A2-F scores into `A2-human-review-sheet.md`
  §3.1 / §5 / §6 / §7 / §8 (already done in the same
  batch).
- Preserve all Qwen provider artifacts (adapter,
  contract, baseline fixture, regression fixture) as
  registered alternative / fallback.

### 7.2 Out-of-scope (deferred to a follow-up phase)

- **Actual runtime default switch** (changing the
  default Provider from Qwen to Volcengine in
  `packages/model-registry`).
- **Any code change** in `packages/model-runtime/`,
  `packages/model-registry/`, or downstream
  consumers.
- **Any change to Frozen Prompt / Golden / Persisted
  Schema / Current Authority.**
- **Cost observability work** (exposing `usage` in the
  Volcengine reasoner canonical result; per-call cost
  lookup table).
- **Latency-aware UI / pipeline work** (long-running
  progress feedback, per-stage budgeting).
- **Volcengine fallback smoke test** (validate Qwen
  still works end-to-end after Volcengine is the
  default).
- **A larger n re-evaluation of Volcengine HC** to
  confirm the A2-D 7-case observation.

## 8. Follow-up requirements

| # | Requirement | Owner | Trigger |
|---|---|---|---|
| 1 | Expose `usage` in Volcengine reasoner canonical result OR add per-call cost lookup | (follow-up phase) | Pre-default-switch |
| 2 | Re-run A2.x cost extraction with the new cost observability | (follow-up phase) | Pre-default-switch |
| 3 | Validate Qwen fallback end-to-end with a smoke test | (follow-up phase) | Pre-default-switch |
| 4 | UI long-running progress feedback for >90 s analyses | (follow-up phase) | Pre-default-switch |
| 5 | Larger-n re-evaluation of Volcengine HC on a new corpus | (follow-up A2.x) | If / when A2.x is opened |
| 6 | Update `CURRENT_BASELINE.md` to reflect Volcengine-as-default when the actual switch lands | (follow-up phase) | At default-switch time |

## 9. Audit trail

- **A2-D run batch:** `2026-08-12T09-30-05-859Z`
- **A2-C corpus manifest hash:** `f57da490dcb31f99f07142aaa3b3fc9a2bd2be0d3a5b849e872adb117100cdaa`
- **A2-C rubric frozen at:** `2026-08-12T17:14:44+08:00`
- **A2-F human review completed:** 2026-08-12 (14/14 scorecards, 0 hard-fail)
- **A2-F mapping revealed:** 2026-08-12
  (per-case deterministic from `caseId` hash; see
  `docs/visual-analysis/human-review/_MAPPING_DO_NOT_OPEN_UNTIL_DONE.md`)
- **A2-G decision recorded:** 2026-08-12
  (this document; no code change in the same batch)
- **A2-G user authorization:** 2026-08-12
  ("按 A2 spec §84 执行 CHANGE_DEFAULT_TO_VOLCENGINE 决策路径, 本阶段只形成 Provider Role / Default Recommendation, 实际 default switch 留给下一阶段执行, 保留 qwen3.6-plus 为 registered alternative / fallback")

## 10. A2 phase exit gate

- A2-A ✓ Candidate Model Discovery
- A2-B.1 ✓ Volcengine adapter integrated
- A2-B.2 ✓ Capability probe
- A2-C ✓ Evaluation Corpus (7 cases, frozen)
- A2-D ✓ Evaluation Matrix (14/14 OK)
- A2-E ✓ Cost / Latency / Reliability
- A2-F ✓ Human Visual Review (14/14 scored, 0 hard-fail, mapping revealed)
- **A2-G ✓ Production Model Decision (this document)**
- A2-H ⏸ Optional config change (deferred; the actual default switch is the follow-up phase)
- A2-I ⏸ Full regression + final acceptance (deferred; the follow-up phase + a re-evaluation)
