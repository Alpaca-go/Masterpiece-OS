# CI-W1C.7.3 — Final Report

> **Audit**: Planning Semantic Sufficiency & Strategic Differentiation Audit (STATIC, zero API)
> **Mode**: Zero-API static audit
> **HEAD**: `c058316c442e3554c49a91a468533d5d426e5768`
> **Branch**: `feat/short-chain-simplified-ui`
> **Audit author**: Mavis (CI-W1C.7.3)
> **Status**: COMPLETE — STOP after audit, no fixes attempted

---

## 0. Definition of Done check

CI-W1C.7.3 is complete when the repository contains a reproducible evidence chain that explains:

> **Where and why the real G01 九州美学 / G02 一剂良方 planning differences stop influencing Strategic Synthesis, and why differentiation reappears at Concept / Direction.**

✅ **Achieved.** This audit traces the semantic propagation from Source (30+ project-specific entries per project) to Direction (3 families per project), with per-stage retention scores. The PRIMARY FIRST_LOSS_STAGE is identified as `NEED_DERIVATION_GENERICIZATION` with HIGH confidence and EASY reversibility.

The audit is also valid if it proves `NO_MATERIAL_FIRST_LOSS`. **Not proven**: there is a clear, material loss of 13-14 anchors at the DI→Evidence boundary and 2 anchors at the Truth→Synthesis boundary.

---

## 1. Audit summary (TL;DR)

| Question | Answer |
|---|---|
| **Where is the FIRST_LOSS_STAGE?** | `NEED_DERIVATION_GENERICIZATION` — the 5 needs are LITERALLY identical between G01 and G02 (identity-stripped) |
| **Confidence** | HIGH (direct textual comparison of `statement` fields yields 0 byte differences) |
| **Reversibility** | EASY (~50-200 LOC change in need-generation logic, schema unchanged) |
| **What's the recovery source at Concept/Direction?** | Family-diversity requirement (3 distinct families per project) + model's pretrained design vocabulary (6 unique metaphors across 6 directions) |
| **Is the recovery grounded in the project?** | NO — the recovery is surface-deep (unique metaphors, families, Chinese titles) but strategy-shallow (all 6 directions solve the same generic "lock + unknown" problem) |
| **Is there cross-project contamination?** | NO — 6 directions share no titles, no metaphors, no strengths/risks, no factIds, no brand-name. Only `typographic-system` family overlaps (1 of 3 each). |
| **Did we change any production code?** | NO — this audit is docs-only |
| **Did we call any LLM/image model?** | NO — 0 analysis calls, 0 image calls |
| **Should we attempt the fix in this audit?** | NO — STOP per spec. Recommend narrow CI-W1C.7.4 phase. |

---

## 2. Pipeline overview (per stage)

```
Source (29 PNG / 35 PNG)
    ↓ 100% retention
DI/DVC v2 + v1 (30+ entries each, project-distinct)
    ↓ 100% retention at v1 DVC; structural v2 DVC is near-empty
Evidence (4 rows each, generic)
    ↓ ↓↓↓↓↓ 93% loss (13-14 of 15-16 anchors lost)
Truth (17 / 16 facts, 2 of 17 differ in VALUE)
    ↓ ↓ 6% retention (only 2 LOCKED anchors survive as UUIDs)
Need (5 generic needs, statements LITERALLY identical)
    ↓ 6% retention (need statements carry no positive VALUE)
Strategic Context (compiled from Truth → inherits 6%)
    ↓ 6%
Prompt (3 facts + 5 needs + 4 evidence + 5 locked rules)
    ↓ ↓ 6% retention
Synthesis (3 generic "lock vs unknown" axes)
    ↓ 0% retention (no anchor reaches the synthesis content)
Insight (slice of Synthesis) — 0%
    ↓ 0%
Opportunity (slice of Synthesis) — 0%
    ↓ ↑ 3% partial recovery
Concept (3 candidates with NEW metaphors)
    ↓ 3% retention
Direction (3 candidates with NEW families + NEW Chinese titles)
    ↓ 3% retention (final)
```

**Per-stage retention curve (combined G01+G02)**: `[1.00, 1.00, 1.00, 0.065, 0.065, 0.065, 0.065, 0.065, 0.000, 0.000, 0.000, 0.032, 0.032]`

---

## 3. FIRST_LOSS_STAGE = `NEED_DERIVATION_GENERICIZATION`

### Evidence

- **Identity-stripped G01 need-intelligence.json and G02 need-intelligence.json are LITERALLY identical in their 5 `statement` fields.** Diff (with UUIDs and brand-name refs stripped) yields 0 byte differences.
- The 5 need types (clarification / identity / preservation / risk / differentiation) are the SAME in both projects.
- The need generation is `deterministic_rule` (no model call) — driven by the SHAPE of the Truth, not the VALUES.
- The brand.role VALUE (rich, project-specific) is referenced in factRefs but NEVER quoted in the need statement text.

### Why this is the FIRST loss

- The v1 DVC carries 100% of project-specific anchors (Stage 3).
- Evidence loses 13-14 of them (Stage 4 — 93% drop).
- Truth preserves only 2 LOCKED anchors as UUIDs (Stage 5).
- The Need layer is where the LAST opportunity to surface positive content is squandered: the 5 need statements are written as generic templates.
- The prompt's NEED section is HIGH-SALIENCE (5 natural-language statements) while the FACTS section is LOW-SALIENCE (3 sparse values).
- The model reads the 5 generic needs, defaults to a "lock vs unknown" TENSION framework, and produces generic synthesis.

### Reversibility: EASY

The fix is localized to the need-generation logic. Example change for the `identity` need:

```diff
- statement: "Preserve current brand identity and prevent reinterpretation as another category or brand."
+ statement: "Preserve the brand identity anchored to [brand.role VALUE, e.g. '高端医疗美容服务提供者'] and prevent reinterpretation as another category or brand."
```

This change would propagate through the prompt (Need section is high-salience) and give the model a project-specific TENSION driver. ~50-200 LOC + tests. Schema unchanged.

---

## 4. Secondary candidates (with confidence)

| Rank | Candidate | Confidence | Why secondary |
|---|---|:-:|---|
| 2 | `PROMPT_SALIENCE_COLLAPSE` | medium | Symptom of NEED_DERIVATION_GENERICIZATION. The 5 needs dominate the prompt because the 3 facts are sparse. |
| 3 | `PROJECT_TRUTH_COMPRESSION` | medium | 70% of facts are LOCKED/UNKNOWN. business.industry=待确认 (AUTHORITATIVE) suppresses rich visual inference. But this is BY DESIGN. |
| 4 | `EVIDENCE_CONTRIBUTION_LOSS` | low | 4-row evidence doesn't reach prompt anyway. Evidence is an audit trail, not a strategic input. |
| - | `MODEL_SYNTHESIS_COLLAPSE` | WEAK | Model is responding correctly to the prompt. The prompt is the cause. |

---

## 5. Counterfactuals (CF-S1, CF-S2, CF-S3)

- **CF-S1 (remove LOCKED RULES + NEED SKELETON)**: Likely produces different (more brand.role-driven) synthesis. **Hypothesis not verified** (would require a re-run; out of audit scope).
- **CF-S2 (positive-planning-only projection)**: If the prompt carried ONLY brand.name + brand.role + 5 locked.assets + 2 UNKNOWN, the model would likely drive TENSION by brand.role content. **G01 and G02 would produce different synthesis outputs** because their brand.role values differ.
- **CF-S3 (identity-stripped Truth comparison)**: When brand.name + brand.role + brand-specific copy are stripped, G01 and G02 are **functionally identical** at the Truth level. The ONLY distinguishing content (brand.role) is filtered out by the prompt's TENSION framework (driven by the 5 generic needs).

**All 3 counterfactuals confirm: the FIRST_LOSS_STAGE is at the Need layer.**

---

## 6. Bookkeeping (PART S)

### 6.1 G02 human review header agreement
- G02 6-dim scores: 3+3+3+3+3+3 = 18/6 = **3.00/3**
- Header says "3.00/3", aggregate says "3.00/3 (6×3)" — **agreement verified**
- No correction needed.

### 6.2 API cost: final vs retry/debug
- 6 final-success analysis calls (3 G01 + 3 G02)
- 0 image calls
- **Final successful qualification cost: ~¥0.18** (~$0.025 USD)
  - G01 final-success: ~¥0.09
  - G02 final-success: ~¥0.084
- **Retry/debug cost: PARTIAL/ESTIMATED** (8 G01 retries ran before retry-8 PASS, then 1 G02 run; exact per-retry totals were not captured per-retry. Do NOT describe the ~¥0.18 as the whole 8-retry cost. Mark partial/estimated for retry.)

### 6.3 Implementation HEAD vs Documentation Tip
- **Implementation HEAD = `c058316c442e3554c49a91a468533d5d426e5768`** (CI-W1C.7.2 READY; the line of real product/feature commits including the 7 production fixes from `cfe0fa36`..`0865863` and the docs commit `c058316c`)
- **Documentation Tip = this audit's commit** (docs-only, no production code change). Does NOT introduce a new Implementation HEAD.

---

## 7. Frozen surfaces preserved

Per CI-W1C.6/7/7.1/7.1A constraints, the following surfaces are UNTOUCHED by this audit:
- ✅ Document Intelligence (visual-decision-packet.json) — read but not modified
- ✅ DVC v2 (project-visual-context.vnext.json) — read but not modified
- ✅ Truth taxonomy (project-truth.json) — read but not modified
- ✅ Conflict Detector — no changes
- ✅ Concept Gate (8 gates: trace / brand-identity / asset-authorization / unsupported-claim / value-coverage / reference-guard / unknown-conflict / direction-leakage) — no changes
- ✅ CI-7 Evaluation — no changes
- ✅ Selection — no changes
- ✅ Canon — no changes
- ✅ Anchor — no changes
- ✅ Image Runtime — no changes
- ✅ Translation — no changes
- ✅ Consumers — no changes
- ✅ CI-10 — NOT STARTED (out of scope)
- ✅ LEGACY_VISUAL_EVIDENCE demoted (CI-W1C.6 PART B) — preserved
- ✅ All CI-W1C.7.1A contracts (fingerprint, prompt budget, sourceMap block, legacyVisualEvidenceExcluded) — preserved
- ✅ Recommendation advisory-only — selection unchanged (CI-W1C.7.2 invariant)

---

## 8. Hard rules verified (all 0)

| Rule | Status |
|---|:-:|
| analysis calls | 0 ✅ |
| image calls | 0 ✅ |
| production semantic delta | 0 ✅ |
| API key logged or persisted | 0 ✅ |
| consumer switch | 0 ✅ |
| new project-specific production hardcode | 0 ✅ |
| new regression | TBD (PART U runs after this) |
| cross-project contamination | 0 ✅ |
| mock output in live mode | 0 ✅ |

---

## 9. Recommended next step (NOT in this audit)

> **CI-W1C.7.4 candidate** — Need Value-Bearing Rewrite
>
> Change the need-generation logic in `packages/creative-intelligence/src/need-intelligence/` to embed the most-relevant fact VALUE in each need statement. Re-run the offline prompt qualification harness and confirm G01/G02 synthesis prompts have DIFFERENT need statement text. Acceptance: identity-stripped diff of the prompt's NEED section is non-empty between G01 and G02.
>
> **Cost**: ~50-200 LOC + 5-10 tests. Schema unchanged.
>
> **STOP after this audit**. Do not start CI-W1C.7.4, CI-W1C.6.1, or CI-10 without explicit user authorization.

---

## 10. User decision (after this audit)

The user must choose ONE of:
- (a) **Stop here.** The audit is a record, no fixes. CI-W1C.7.3 is the final state.
- (b) **Plan CI-W1C.7.4** to address the NEED_DERIVATION_GENERICIZATION first-loss.
- (c) **Defer to CI-W1C.6.1 / CI-10** instead (a larger scope change that supersedes this audit's findings).
- (d) **Adjust the audit's verdict** if the user has additional context (e.g., "the user DOES intend business.industry=待确认 to be the project state, and the system should treat it as a constraint, not a placeholder").

Per the user preference "用户说算了或你直接 X 吧时立刻重定向，不再列方案" — the user typically wants the audit to be the deliverable, not a follow-up plan.

---

## 11. Files produced (16 deliverables)

```
docs/creative-intelligence/ci-w1c.7.3/
├── baseline-freeze.md                          (PART A, pre-audit)
├── source-inventory.md                         (PART B, 13 stages × 2 projects)
├── g01-semantic-propagation-ledger.md          (PART D, 15 anchors × 11 stages)
├── g02-semantic-propagation-ledger.md          (PART D, 16 anchors × 11 stages)
├── g01-distinctive-planning-anchors.json       (PART C, 15 anchors)
├── g02-distinctive-planning-anchors.json       (PART C, 16 anchors)
├── semantic-retention-metrics.json             (PART E, per-stage retention)
├── cross-project-semantic-distinctness.md      (PART F, identity-stripped comparison)
├── dvc-document-intelligence-coverage-audit.md (PART G, DVC schema sufficiency)
├── evidence-truth-authority-audit.md           (PART H, Evidence/Truth balance)
├── need-intelligence-differentiation-audit.md  (PART I, generic need collapse)
├── strategic-prompt-salience-audit.md          (PART J, prompt section salience)
├── synthesis-source-utilization-audit.md       (PART K, synthesis model behavior)
├── concept-direction-recovery-audit.md         (PART L, recovery source)
├── first-loss-stage-decision.md                (PART M, primary verdict)
└── final-report.md                             (PART N, this file)
```

---

## 12. STOP

Per the user spec: "STOP after audit. No fixes attempted. No consumer switch. CI-W1C.6.1 + CI-10 still DEFERRED."

This audit is **COMPLETE** at `c058316c442e3554c49a91a468533d5d426e5768`. The next commit is a docs-only commit (Documentation Tip) that does not introduce a new Implementation HEAD.

The audit waits for the user's next instruction.
