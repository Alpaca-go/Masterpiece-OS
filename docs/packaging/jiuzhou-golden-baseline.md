# P1-1 — Jiuzhou Golden Baseline

**Phase:** Packaging V1 / P1 — Golden Baseline & Shot Contracts
**Date:** 2026-08-12
**Status:** `JIUZHOU_GOLDEN_FROZEN` (Golden asset; NOT production rule)
**Spec:** Packaging V1 Revised Development Specification §P1
**Predecessor:** P0 frozen at commit `78c6021`; A4 frozen at `f94c51a`

## 1. Purpose (per P1 spec)

Define the Jiuzhou Golden Project for Packaging V1. The Golden
Project is **the single reference brand** for V1; it is not a
template for any other project. The Golden baseline is **evaluation
criteria** — it is NOT a production rule, translation, compiler, or
validator input. (See `golden-vs-production-boundary.md`.)

## 2. Golden Identity (Jiuzhou Aesthetics)

```text
Project ID:        jiuzhou
Brand Name:        九州美学
Brand Role:        高端美学连锁品牌
Industry:          美学行业
Project ID (golden): golden-jiuzhou
Schema Version:    1.0
Project Schema:    see tests/fixtures/packaging/jiuzhou/manifest.json
```

The Golden Project is intentionally narrow: **only Jiuzhou
Aesthetics** is the V1 Golden. No other brand is in scope for
V1; adding a second Golden is a P4 / P5 follow-up at the earliest
(per P1 spec "九州美学 Golden Project 成立").

## 3. Visual Direction (frozen; evaluation only)

```text
direction_id:        jiuzhou.eastern-order-biological-luster
direction_label:     东方秩序 × 生物光泽
direction_text_md5:  (see jiuzhou/visual-direction.md)
```

**Two anchor concepts**:

- **东方秩序** (Eastern order) — calm, asymmetric balance, structured spatial composition, disciplined hierarchy.
- **生物光泽** (biological luster) — organic rhythm, lustrous material, peacock-feather-derived visual language.

The two are intentionally paired: pure order without luster
yields a clinical aesthetic; pure luster without order yields
the forbidden "夜店式虹彩" (club iridescence).

## 4. Color Baseline (frozen; evaluation only)

Per spec color range:

| Role | Name (zh) | Range | Usage |
|---|---|---|---|
| **Base** | 珍珠白 / 暖灰 | **65 – 70 %** | packaging substrate, primary surface, dominant proportion |
| **Identity** | 矿物紫 | **20 – 25 %** | identity signal, accent panel, controlled area |
| **Structural** | 石墨黑 | **5 – 10 %** | text, line weight, structural outline, deep negative space |
| **Accent** | 虹彩蓝紫 | **局部高光 only** | reserved for peacock-feather-eye luster, micro-accent |

Source of truth: `tests/fixtures/packaging/jiuzhou/color-baseline.md`
(frozen file; SHA-256 in the manifest).

## 5. Motif Language (frozen; evaluation only)

Peacock-derived visual language, intentionally decomposed into
5 **abstract** components. None of these is a literal peacock
feather; they are visual primitives that the evaluator looks
for in the output.

```text
motif-1:  羽眼椭圆   (peacock-feather-eye oval)
motif-2:  九瓣放射   (nine-petal radial)
motif-3:  羽毛流线   (feather streamline)
motif-4:  局部虹彩   (localized iridescence — micro-accent only)
motif-5:  抽象 biological rhythm  (abstract organic rhythm)
```

Source: `tests/fixtures/packaging/jiuzhou/motif-language.md`.

## 6. Forbidden Motif Set (frozen; evaluation only)

These three are explicit evaluation **fail** conditions (NOT
production rules; not enforced by the Packaging Validator in
P3; enforced only by the Golden evaluator + the P3 Reference
Fidelity axis):

```text
forbidden-1:  大面积浓紫           (large-area saturated purple)
forbidden-2:  大面积写实羽毛        (large-area realistic feather)
forbidden-3:  夜店式虹彩           (club / disco iridescence)
```

Source: `tests/fixtures/packaging/jiuzhou/forbidden-motifs.md`.

If any of the three appears, the rubric's **Visual Direction
Fidelity** axis is **0** (auto-fail), regardless of overall score.
This is a Golden evaluation rule; it does NOT translate to a
hard Production rule. (See `golden-vs-production-boundary.md`.)

## 7. Cross-Reference to Existing `phase1.js`

The existing `tests/fixtures/phase1.js` already encodes a
Jiuzhou-fiavored project context (brand 九州美学, locked packaging
structure 天地盖硬盒, motif language, color behavior, brand
misread risk). It is the **analysis-led seed** for the Golden.

P1 does **not** mutate `phase1.js`. P1 introduces a
packaging-only Golden fixture under
`tests/fixtures/packaging/jiuzhou/` that is the **evaluator
input**, distinct from the analysis seed. The Reference-First
golden path in P2+ consumes both.

## 8. Jiuzhou Golden Provenance

| Field | Value |
|---|---|
| Created at | 2026-08-12 |
| Created by | Mavis (per user authorization) |
| Source of truth | `tests/fixtures/packaging/jiuzhou/manifest.json` (SHA-256 digests per file) |
| Reviewable | yes — every frozen file is a tracked text file in the repo |
| Mutable | NO — P0 / P1 freeze; changes require a new P1.x re-evaluation cycle |
| Used by | P2 Packaging Translation (consumes the color baseline + motif language as evaluator input ONLY), P3 Packaging Validator (uses the acceptance rubric), P4 freeze manifest |

## 9. P1-1 acceptance

- [x] Golden Identity frozen (Jiuzhou Aesthetics)
- [x] Visual Direction frozen (东方秩序 × 生物光泽)
- [x] Color Baseline frozen (65-70 / 20-25 / 5-10 / 局部高光)
- [x] Motif Language frozen (5 abstract motifs)
- [x] Forbidden Motif Set frozen (3 explicit fails)
- [x] Cross-reference to phase1.js documented
- [x] Provenance recorded
- [x] NOT production rule (per golden-vs-production-boundary.md)
