# CI-W1C.7.3A — Need Rewrite Sufficiency Audit

> **Mode**: Zero-API diagnostic phase · **HEAD**: 5159d938
> **Purpose**: Classify the proposed 50-200 LOC CI-W1C.7.4 Need rewrite as SUFFICIENT / HELPFUL_BUT_INSUFFICIENT / NOT_YET_JUSTIFIED. Rule per spec: "SUFFICIENT only if real Planning semantics already survive upstream and Need is actually the first meaningful generalizer."

## Background

CI-W1C.7.3 recommended a 50-200 LOC change in the need-generation logic to embed the most-relevant fact VALUE in each need statement (e.g., for the `identity` need, write "Preserve the brand identity anchored to 高端医疗美容服务提供者..." instead of generic "Preserve current brand identity...").

CI-W1C.7.3A now asks: is this Need rewrite actually sufficient to fix the first-loss, given that the TRUE_FIRST_LOSS has been reconciled to PLANNING_SOURCE_NOT_PRESENT?

## Per-anchor evidence on whether real planning semantics survive upstream

For the Need rewrite to be SUFFICIENT, **real planning semantics must already survive upstream** (i.e., the v1 DVC / Truth / Strategic Context must carry project-specific planning content). If they don't, the Need rewrite is HELPFUL_BUT_INSUFFICIENT or NOT_YET_JUSTIFIED.

### What "real planning semantics" means in this audit

A planning-positive fact with project-specific VALUE (not just placeholder or constraint). Examples that would qualify:
- `business.industry=医疗美容` (G01) or `=中医健康管理与诊疗服务` (G02) AS A PLANNING FACT
- `business.model=B2C 医美机构` AS A PLANNING FACT
- `audience.primary=30-50岁高净值女性` AS A PLANNING FACT
- `brand.positioning=高端科学美学医美引领者` AS A PLANNING FACT

### What currently survives upstream

**For G01:**
- Truth: 17 facts, of which 4 are planning-positive (S01, S04, S05, S06) and 13 are either constraint, placeholder, or legacy.
- The 4 planning-positive anchors have VALUES that are:
  - S01 brandName=九州美学 (placeholder, not strategy)
  - S04 logoLocked=true (constraint, no value)
  - S05 lockedFacts[0] 原始 Logo Locked (constraint text)
  - S06 lockedFacts[1] 输出语言简体中文 (constraint text)
- **0 facts carry a project-specific planning VALUE that is not a placeholder or constraint.**

**For G02:** same as G01.

### What would change if the user uploaded a planning brief

If the user uploaded a `brief.pdf` containing:
- 品牌定位：高端医疗美容服务领导者
- 目标客群：30-45岁高净值女性
- 业务模式：会员制医美机构
- 竞争框架：vs 传统美容院 + 连锁医美

Then the document parser + DI would extract these as PLANNING_STRATEGIC_SOURCE facts, and Truth would have:
- 4+ new planning-positive facts with rich VALUE
- The Need layer's generic 5 statements could be value-bearing using these facts
- The Need rewrite would be SUFFICIENT

But the user has NOT uploaded such a brief. The current dataset has no planning source.

## Classification per spec criteria

> "SUFFICIENT only if: real Planning semantics already survive upstream and Need is actually the first meaningful generalizer."

- Real planning semantics survive upstream: **NO** (0 planning-positive facts with rich VALUE)
- Need is the first meaningful generalizer: **NO** (Need is at Stage 6, but Stage 1-2 have NO planning content. The first generalizer is at Stage 1, not Stage 6.)

**Classification**: `NOT_YET_JUSTIFIED`

> "If planning docs are missing from the dataset: NOT_YET_JUSTIFIED."

Exactly. The planning docs ARE missing. The Need rewrite is NOT_YET_JUSTIFIED.

## What the Need rewrite would do if applied anyway

If the 50-200 LOC Need rewrite is applied WITHOUT first adding planning data:
- The 5 need statements would embed the AVAILABLE planning-positive values (brandName + 2 lockedFacts)
- The new statements would read:
  - clarification: "...(e.g., brandName=九州美学 + business.model=UNKNOWN)..."
  - identity: "Preserve the brand identity anchored to brandName=九州美学 and prevent reinterpretation..."
  - preservation: "Locked assets (4f65f3f8, 755bd372, brand-name) and locked facts (原始 Logo Locked, 输出语言简体中文) must remain unchanged..."
  - risk: "...(brandName=九州美学 + business.industry=待确认)..."
  - differentiation: "Differentiate brandName=九州美学 from generic category expression..."
- These new statements would be **slightly more specific** but still **don't carry strategy** (only metadata + constraints)
- The model would still default to "lock vs unknown" framework because the value is still placeholder/constraint, not strategy
- The Need rewrite would marginally improve the prompt's specificity (the model sees "brandName=九州美学" instead of just "brand name") but would NOT produce project-specific synthesis output
- **Net effect**: HELPFUL for prompt salience (slight improvement), but NOT sufficient to produce project-specific Direction outputs

## What a 2-step path would look like

If the user wants the Need rewrite to be SUFFICIENT, the path is:
1. **CI-W1C.7.4-STEP-1**: Add a planning-source ingestion path (user uploads brief.pdf → document parser → DI → evidence → truth). 0 changes to existing code; just verify the path works end-to-end with a real brief. ~100-300 LOC + tests.
2. **CI-W1C.7.4-STEP-2**: Then do the Need rewrite. ~50-200 LOC + tests.
3. **CI-W1C.7.4-STEP-3**: Re-run G01 + G02 with the new planning source. Re-measure retention. Re-evaluate first-loss.

Without Step 1, the Need rewrite alone is HELPFUL_BUT_INSUFFICIENT.

## Classification

| Verdict | Status |
|---|---|
| `NEED_REWRITE_SUFFICIENT` | NO (real planning semantics don't survive upstream) |
| `NEED_REWRITE_HELPFUL_BUT_INSUFFICIENT` | ALSO NO (the help is marginal; would marginally improve prompt salience but won't produce project-specific Direction output) |
| `NEED_REWRITE_NOT_YET_JUSTIFIED` | **YES** (planning docs missing; need to add a planning source first) |

## What should be done instead

**Recommended next phase (NOT a Need rewrite)**:
- **CI-W1C.7.4 — Planning Source Ingestion** (or similar name)
- Scope: add a `briefFiles` upload UI + a `planning-doc-parser` module that extracts PLANNING_STRATEGIC_SOURCE facts and writes them to Truth.
- Cost: ~200-500 LOC + tests + UI.
- Acceptance: G01 and G02 each have at least 1 PLANNING_STRATEGIC_SOURCE fact in Truth after upload.
- Out of scope: any change to Need, prompt, or synthesis logic.

After CI-W1C.7.4, the system would have planning data. Then a follow-up audit (CI-W1C.7.5) can re-measure retention and determine whether the Need rewrite is now justified.

## Hard rule check (spec PART I)

> "GENERIC_NEED_COLLAPSE remains CONFIRMED."

✓ Confirmed (from CI-W1C.7.3). The 5 need statements are LITERALLY identical between G01 and G02.

> "Now classify the proposed 50-200 LOC Need rewrite as: NEED_REWRITE_SUFFICIENT / HELPFUL_BUT_INSUFFICIENT / NOT_YET_JUSTIFIED."

→ `NEED_REWRITE_NOT_YET_JUSTIFIED`. The proposed 50-200 LOC change should be deferred until planning data is in the pipeline.
