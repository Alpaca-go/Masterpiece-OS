---
goldenPromptId: jiuzhou.series.rf.v1
version: "1.0.0"
frozenAt: "2026-08-12"
shotContract: PKG-SERIES-GROUP
generationMode: reference-first
goldenProject: jiuzhou
goldenProjectId: golden-jiuzhou
language: en
specSection: "V1 spec §14"
---

# Golden Prompt — `jiuzhou.series.rf.v1` (PKG-SERIES-GROUP, Reference-First)

> **Status:** P1 FROZEN benchmark.
> **Not for production import.** This file lives behind the
> `goldenProjectId: 'jiuzhou'` boundary rule (see
> `docs/packaging/golden-vs-production-boundary.md`).
> Production code MUST NOT read this file unless
> `goldenProjectId === 'jiuzhou'` is set on the run.

## 1. Reference role (per V1 spec §19)

- **Style** (dominant) — shared Jiuzhou family palette +
  finish register; one multi-SKU anchor set.
- **Material** (secondary) — uniform paperboard substrate
  feel across all SKUs.
- **Composition** (tertiary) — `set_display` layout; the
  group reads as ONE coherent family.
- **Structure** (lock) — each SKU's silhouette is taken
  from the anchor; do not redraw any single one.
- **Product** (lock) — the SKUs depicted in the anchor; do
  not substitute any one.

## 2. Visual direction

- 东方秩序 × 生物光泽 (Eastern Order × Biological Lustre)
- Source: `visual-direction.md` in the same Golden root.

## 3. Color baseline (V1 spec §11.3)

| Color | Ratio | Usage |
|---|---|---|
| Pearl-white / warm gray | 65-70% | substrate dominant field |
| Mineral purple | 20-25% | shared identification accent |
| Graphite black | 5-10% | type / fine line work |
| Iridescent blue-violet | local only | premium finish on flagship SKU only |

> Source: `color-baseline.md` in the same Golden root.

## 4. Motif language (V1 spec §11.2)

5 abstract peacock components — repeated across the series
in a controlled, consistent way (NOT a literal "peacock
sweep"):

1. 羽眼椭圆 (eye ellipse)
2. 九瓣放射 (nine-petal radial)
3. 羽毛流线 (feather streamline)
4. 局部虹彩结构 (local iridescent structure)
5. abstract biological rhythm

> Source: `motif-language.md` in the same Golden root.

## 5. Forbidden outcomes (auto-fail per V1 spec §31)

- 大面积浓紫 (large-area saturated purple) → PKG-F01 / F04
- 大面积写实羽毛 (large-area realistic peacock feather) →
  PKG-F06
- 夜店式虹彩 (nightclub-iridescent shimmer) → PKG-F11

Plus SERIES-specific (auto-fail F09):

- Each SKU looking visually unrelated (no shared system) →
  PKG-F09
- A collage of unrelated concepts (not a coherent family)
  → PKG-F09

> Source: `forbidden-motifs.md` in the same Golden root.

## 6. Camera + framing (V1 spec §14)

- `layout`: `set_display` (preferred) — family arranged in
  a row, slight forward stagger, consistent baseline.
- `aspectRatio`: `16:9` (SERIES preferred; Golden framing,
  not preflight constraint).
- `depthOfField`: medium; all SKUs sharp enough to read
  silhouette + finish, but soft enough to feel premium.
- `background`: clean and uniform; no graphic clutter;
  no supporting props that break the family rhythm.
- `lighting`: 3-point soft; key from upper-left; one
  consistent light across all SKUs (no per-SKU re-lighting).

## 7. Prompt body (English — sent to the image model)

```text
A multi-SKU packaging series render, Reference-First mode.

[PACKAGE SUBJECT]
3–4 SKUs of the Jiuzhou (九州美学) line, displayed as ONE
coherent family. Each SKU's silhouette is taken from the
provided reference anchor and MUST NOT be redrawn or
substituted. The SKUs share the same paperboard substrate
feel, the same finish register, the same family palette.

[VISUAL DIRECTION]
Eastern Order × Biological Lustre. Calm, premium, restrained
medical-beauty aesthetic. The series must read as one
designed system, not a collage.

[COLOR SYSTEM]
- pearl-white / warm gray 65–70% (shared substrate)
- mineral purple 20–25% (shared identification accent)
- graphite black 5–10% (shared type, shared lockup)
- iridescent blue-violet ONLY on the flagship SKU (one
  localized premium finish); not on the supporting SKUs

[GRAPHIC SYSTEM]
Use 5 abstract peacock-derived components in a consistent
pattern across all SKUs. The motif system is repeated and
restrained, not decorative. Do NOT render realistic peacock
feathers or literal bird imagery on any SKU.

[MATERIAL & SURFACE]
- uniform matte substrate across all SKUs
- spot-gloss ONLY on the flagship SKU
- believable paperboard / paper feel throughout
- no plastic, no foil, no metallic foil, no neon

[COMPOSITION]
- set_display layout, row with slight forward stagger
- all SKUs on a consistent baseline (same horizon line)
- consistent scale (the flagship may be slightly larger
  to anchor hierarchy, but proportional)
- aspect ratio 16:9
- medium depth of field; all SKUs sharp
- no extra props, no graphic clutter, no people, no hands

[LIGHTING & PHOTOGRAPHY]
- one consistent 3-point soft lighting across all SKUs
- key from upper-left, fill from lower-right
- rim from behind-left
- no per-SKU re-lighting; the family shares one light

[REFERENCE PRIORITY]
The provided reference image set is dominant for: family
palette, finish register, layout rhythm, shared motif
system, and shared substrate feel. Analysis context supplies
semantic constraints only.

[LOCKED ASSETS]
Each SKU's silhouette, brand identity, and product name are
locked. Do not redraw, do not invent, do not substitute.

[FORBIDDEN OUTCOMES]
- NO large-area saturated purple
- NO large-area realistic peacock feather illustration
- NO nightclub-iridescent shimmer
- NO collage of unrelated concepts (must be ONE family)
- NO per-SKU visual identity drift
- NO generic advertising look
- NO supporting props, NO people, NO hands

Output: a single series image, 16:9 aspect, the SKU family
as the primary subject, consistent lighting and background.
```

## 8. Comparison protocol (V1 spec §32)

After any Packaging Compiler revision, run this same Golden
Prompt against the same provider/model and compare the new
output against the previously stored baseline. Record
failure category (PKG-F01..F12) and the rubric result.
Pay particular attention to PKG-F09 (series consistency).

## 9. Notes

- The "primary risk" called out in V1 spec §14 is
  **"Model creates multiple unrelated packages."** The
  forbidden outcomes for SERIES lean on PKG-F09
  (series consistency failure) more than other shots.
- The flagship SKU is allowed one localized iridescent
  accent; supporting SKUs MUST stay matte. This is
  intentional hierarchy, not a styling inconsistency.
- The number of SKUs (3–4) is a Golden framing choice;
  future V1.x Golden Prompts may add 2-SKU or 5-SKU
  variants. V1 itself ships this 3–4 SKU variant.
