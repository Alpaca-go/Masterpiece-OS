# Jiuzhou — Color Baseline (frozen)

```text
baseline_id:        jiuzhou.color-baseline.v1
frozen:             2026-08-12
applies_to:         golden-jiuzhou
```

## Range table (frozen)

| Role | Name (zh) | Range | Usage |
|---|---|---|---|
| **Base** | 珍珠白 / 暖灰 | **65 – 70 %** | packaging substrate, primary surface, dominant proportion |
| **Identity** | 矿物紫 | **20 – 25 %** | identity signal, accent panel, controlled area |
| **Structural** | 石墨黑 | **5 – 10 %** | text, line weight, structural outline, deep negative space |
| **Accent** | 虹彩蓝紫 | **局部高光 only** | reserved for peacock-feather-eye luster, micro-accent |

## Rules (frozen)

1. The four ranges **must** sum (approximately) to 100 %.
2. The "Accent" row is **strictly local**; it may not exceed a
   small fraction of any single axis' surface. The visual
   evaluator interprets "local" as ≤ 5 % of the visible surface
   per shot.
3. The "Identity" range (矿物紫 20-25 %) is **NOT** a license
   for "大面积浓紫". 大面积浓紫 is an explicit fail.
4. The "Structural" range (石墨黑 5-10 %) is for line weight +
   text + structural outline; it is NOT a "dark / black
   packaging" license.
5. The four ranges are **Golden evaluation thresholds**;
   they are not defaults for non-Golden projects.

## Source

Authoritative at `docs/packaging/jiuzhou-golden-baseline.md` §4.
SHA-256 in `manifest.json`.
