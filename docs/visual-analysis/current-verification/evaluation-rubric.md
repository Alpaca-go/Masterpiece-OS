# A2 Evaluation Rubric (Frozen)

**Phase:** Visual Analysis A2 — Provider Candidate Integration & Model Evaluation Matrix
**Batch:** A2-C (rubric frozen with corpus)
**Status:** `A2_RUBRIC_FROZEN`
**Frozen at:** `2026-08-12T17:14:44+08:00`
**Frozen by:** Mavis (per user authorization at the same instant)
**Source of truth:** This document. No machine-readable manifest sidecar for the rubric (the rubric is wholly narrative + numeric).

## 1. Purpose

This rubric is the **only** scorecard used to evaluate Provider outputs
during A2-D. Both Qwen (CONTROL) and Volcengine (CANDIDATE A) are
scored on the same 10 dimensions with the same weights and the same
1–5 scale. There is no per-Provider variant.

Any modification after this instant requires a new Corpus revision
(per A2 spec §121 STOP-A2-08). The user explicitly authorized
freezing this rubric at the same instant as the corpus.

## 2. Evaluation dimensions and weights

Per A2 spec §34–§46, the canonical 10 dimensions. The weights are
frozen at the canonical A2-spec values; **any change to a weight
requires a new Corpus revision**.

| # | Dimension | Definition (verbatim from A2 spec) | Weight |
|---|---|---|---:|
| 1 | Visual Understanding | 正确识别画面主体 / 构图 / 色彩 / 材质 / 字体-排版关系 / 空间关系 / 包装结构 / 视觉层级 | **15** |
| 2 | Brand / Locked Asset Fidelity | 品牌名称是否正确 / Logo 与 asset 是否被误认 / 产品结构是否被改写 / Locked Assets 是否得到尊重 | **15** |
| 3 | Design-System Extraction | Visual DNA / Visual Grammar / 颜色关系 / 字体行为 / 构图逻辑 / 材料语言 / 重复母题 / 跨触点一致性 | **15** |
| 4 | Creative Reasoning | 是否能从观察推导设计逻辑 / 是否能区分事实与推断 / 是否能给出有设计价值的判断 | **10** |
| 5 | Decision Usefulness | 是否真正帮助 Reference First / Creative Direction / Space Generation / Packaging / Designer 决策 | **15** |
| 6 | Evidence Grounding | 结论是否能追溯到输入视觉证据 / 是否出现脱离输入的空泛设计术语 | **10** |
| 7 | Hallucination Control | 无 invented brand facts / materials / packaging structures / text / design intentions | **10** |
| 8 | Cross-Image Consistency | 多图输入时是否把系列图理解为同一系统 / 是否错误地把局部差异当成完全不同方向 / 是否能识别稳定视觉机制 | **5** |
| 9 | Report Structure Compliance | Canonical Output Contract：required sections / required fields / valid structure / parser compatibility | **2.5** |
| 10 | Downstream Usability | 分析结果是否可安全作为 Project Context / Reference First input / Generation planning 而不需要大规模人工重写 | **2.5** |
| | **Total** | | **100** |

### 2.1 Per-Case dimension weight adjustments

For this corpus, the per-Case default weights above apply to all
seven cases. Two cases carry an explicit re-weight hint in their
`evaluationNotes` in `A2-evaluation-corpus.md`:

- **C05 — Mixed Visual System**: Design-System Extraction (#3) is the
  highest-signal dimension for this case; the default weight of 15
  is the right value. No re-weight.
- **C07 — Weak / Incomplete Input**: Report Structure Compliance
  (#9) and Decision Usefulness (#5) are the highest-signal
  dimensions; defaults are kept. No re-weight.

If a future A2.x phase requires per-Case re-weight, that change must
ship as a new Corpus revision (A2 spec §121 + §46 "如果调整权重，必须
在正式 Evaluation 前冻结并记录原因").

## 3. Scoring scale (1–5, per A2 spec §45)

| Score | Definition |
|---:|---|
| 1 | unusable / materially wrong |
| 2 | weak / major correction required |
| 3 | usable with correction |
| 4 | strong / minor correction |
| 5 | excellent / production-grade |

A score is recorded per (Provider × Case × Dimension). Half-point
scores are not allowed (matches the spec's integer scale).

## 4. Hard failure overrides (per A2 spec §47)

Regardless of the weighted total, a Case is **immediately FAIL** if
any of the following are observed:

- Locked Asset materially wrong (Logo redrawn, decomposed, or with
  altered inner glyphs).
- Brand identity hallucinated (a brand name or product line is
  invented that is not present in the input).
- Output contract invalid (the canonical Analysis Provider result
  cannot be parsed / required fields missing / structure broken).
- Analysis unusable downstream (the result cannot be passed to
  Reference First / Generation planning without a full rewrite).
- Wrong project / category understanding (the model describes the
  project as a different industry / brand than the project record
  says it is).

A Hard Failure is recorded as `FAIL` with a per-dimension sub-score
of `1` and a brief reason. The Provider's overall evaluation for
that Case is `FAIL` even if the weighted total is mathematically
above the soft threshold (none defined in this freeze; see §5).

## 5. Soft thresholds

This freeze does **not** define a numerical pass / fail threshold on
the weighted total. The Production Default Decision in A2-G is
explicit (KEEP_QWEN_DEFAULT or CHANGE_DEFAULT_TO_<MODEL>) and uses
the Decision Matrix, not a single weighted score.

Per-Case weighted totals are still recorded, because the A2-G
Decision Matrix (§81–§82) and the per-category matrix expect them.
But the rubric does not by itself declare pass / fail.

## 6. LLM Judge (per A2 spec §63)

An LLM Judge MAY be used to record a parallel scorecard as
**secondary evidence**. The LLM Judge scorecard is not authoritative
and does not enter the Decision Matrix. If the LLM Judge's score
disagrees with the human scorecard by more than 1.0 weighted point
on a single dimension, the disagreement is logged in
`A2-evaluation-matrix.md` for review but does not change the
human-recorded score.

## 7. STOP conditions honored

- **STOP-A2-09** (modify weights to favor a candidate): NOT
  triggered. This document is the freeze commit.
- **STOP-A2-12** (Prompt digest mismatch): NOT triggered. The frozen
  analysis Prompts are unchanged. (See A2 spec §23.)
- **STOP-A2-16** (LLM Judge as sole judge): NOT triggered. The LLM
  Judge is secondary evidence; human review is the source of
  truth.

## 8. Reproducibility

This rubric is a pure document. There is no machine-readable
sidecar. The frozen values (weights, dimension list, scale,
hard-failure list) are quoted verbatim from A2 spec §34–§47 and
carry no time-dependent state. Re-rendering this document at any
later time yields the same rubric.
