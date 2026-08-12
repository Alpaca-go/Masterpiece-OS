---
goldenPromptId: jiuzhou.hero.rf.v1
version: "1.0.0"
frozenAt: "2026-08-12"
shotContract: PKG-HERO-SINGLE
generationMode: reference-first
goldenProject: jiuzhou
goldenProjectId: golden-jiuzhou
language: en
specSection: "V1 spec §13"
---

# Golden Prompt — `jiuzhou.hero.rf.v1` (PKG-HERO-SINGLE, Reference-First)

> **Status:** P1 FROZEN benchmark.
> **Not for production import.** This file lives behind the
> `goldenProjectId: 'jiuzhou'` boundary rule (see
> `docs/packaging/golden-vs-production-boundary.md`).
> Production code MUST NOT read this file unless
> `goldenProjectId === 'jiuzhou'` is set on the run.

## 1. Reference role (per V1 spec §19)

- **Style** (dominant) — moodboard-derived palette + finish
  register; one Jiuzhou hero anchor.
- **Material** (secondary) — pearl-white / mineral-purple
  paperboard substrate feel; matte dominant, spot gloss on
  one premium area only.
- **Composition** (tertiary) — front-3q hero camera;
  subject occupies the left third, negative space right.
- **Structure** (lock) — the package silhouette from the
  anchor; do not redraw, do not invent.
- **Product** (lock) — the SKU depicted in the anchor; do
  not substitute.

## 2. Visual direction

- 东方秩序 × 生物光泽 (Eastern Order × Biological Lustre)
- Source: `visual-direction.md` in the same Golden root.

## 3. Color baseline (V1 spec §11.3)

| Color | Ratio | Usage |
|---|---|---|
| Pearl-white / warm gray | 65-70% | substrate dominant field |
| Mineral purple | 20-25% | controlled identification accent |
| Graphite black | 5-10% | type / fine line work |
| Iridescent blue-violet | local only | one premium finish area |

> Source: `color-baseline.md` in the same Golden root.

## 4. Motif language (V1 spec §11.2)

5 abstract peacock components — keep them abstract; do not
literalize:

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

> Source: `forbidden-motifs.md` in the same Golden root.

## 6. Camera + framing (V1 spec §13)

- `cameraIntent`: `front-3q` (preferred) — alternative
  `front` or `top-3q` allowed if Reference Anchor dictates.
- `aspectRatio`: `4:5` (HERO preferred; Golden framing, not
  preflight constraint; P2/P3 may extend the preflight's
  accepted set).
- `depthOfField`: shallow; subject crisp, background soft.
- `background`: large negative space, no props, no
  distracting graphic clutter.
- `lighting`: 3-point soft; key from upper-left, fill from
  lower-right, rim from behind-left to lift the silhouette
  edge.

## 7. Prompt body (English — sent to the image model)

```text
A single premium packaging hero render, Reference-First mode.

[PACKAGE SUBJECT]
A single primary SKU of the Jiuzhou (九州美学) line, pearl-white
paperboard substrate with a controlled mineral-purple
identification accent. Package silhouette is taken from the
provided reference anchor and MUST NOT be redrawn or
substituted.

[VISUAL DIRECTION]
Eastern Order × Biological Lustre. Calm, premium, restrained
medical-beauty aesthetic. No decorative excess.

[COLOR SYSTEM]
- pearl-white / warm gray 65–70% (substrate dominant)
- mineral purple 20–25% (one focused identification accent)
- graphite black 5–10% (fine type, lockup, fine line work)
- iridescent blue-violet ONLY as a localized premium finish
  on one area (no full-shimmer coverage)

[GRAPHIC SYSTEM]
Use 5 abstract peacock-derived components in restrained,
non-decorative ways: eye ellipse, nine-petal radial, feather
streamline, local iridescent structure, abstract biological
rhythm. These are abstract; do NOT render realistic peacock
feathers or any literal bird imagery.

[MATERIAL & SURFACE]
- matte substrate dominant
- one spot-gloss area only (the iridescent highlight)
- believable paperboard / paper feel
- no plastic, no foil, no metallic foil, no neon

[COMPOSITION]
- front-3q hero camera
- subject occupies the left third, generous negative space right
- aspect ratio 4:5
- shallow depth of field; subject crisp, background soft
- no extra props, no supporting objects, no graphic clutter

[LIGHTING & PHOTOGRAPHY]
- 3-point soft
- key from upper-left
- fill from lower-right
- rim from behind-left to lift the silhouette edge
- clean, bright, premium feel; no harsh shadows

[REFERENCE PRIORITY]
The provided reference image is dominant for: material feel,
color relationship, packaging styling, photographic
composition, lighting, surface treatment, visual density,
rendering quality. Analysis context supplies semantic
constraints and brand intent only.

[LOCKED ASSETS]
The package silhouette, brand identity, and product name are
locked. Do not redraw, do not invent, do not substitute, do
not hallucinate.

[FORBIDDEN OUTCOMES]
- NO large-area saturated purple
- NO large-area realistic peacock feather illustration
- NO nightclub-iridescent shimmer or full-coverage foil
- NO generic advertising look (this is a packaging hero,
  not a magazine ad)
- NO supporting props, NO people, NO hands

Output: a single hero image, 4:5 aspect, the package as the
primary subject, restrained background.
```

## 8. Comparison protocol (V1 spec §32)

After any Packaging Compiler revision, run this same Golden
Prompt against the same provider/model and compare the new
output against the previously stored baseline. Record
failure category (PKG-F01..F12) and the rubric result. Accept
the compiler change only if the new output matches or exceeds
this benchmark. If it does not, the compiler is wrong; do not
"fix" this benchmark downward.

## 9. Notes

- This is a **benchmark**, not a production template. The
  Packaging Compiler (P2) must produce its own prompt; this
  file is the comparison target, never the source.
- The Chinese rationale behind each color ratio / motif /
  forbidden outcome is recorded in the corresponding
  `*.md` file in the same Golden root (visual-direction /
  color-baseline / motif-language / forbidden-motifs). All
  those files are equally behind the boundary rule.
- Language is English to match the image-model convention.
  A future `jiuzhou.hero.rf.v1.zh` variant may be added in
  a later phase; that is a separate baseline, not a
  replacement.
