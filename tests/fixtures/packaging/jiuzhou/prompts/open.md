---
goldenPromptId: jiuzhou.open.rf.v1
version: "1.0.0"
frozenAt: "2026-08-12"
shotContract: PKG-GIFT-OPEN
generationMode: reference-first
goldenProject: jiuzhou
goldenProjectId: golden-jiuzhou
language: en
specSection: "V1 spec §15"
---

# Golden Prompt — `jiuzhou.open.rf.v1` (PKG-GIFT-OPEN, Reference-First)

> **Status:** P1 FROZEN benchmark.
> **Not for production import.** This file lives behind the
> `goldenProjectId: 'jiuzhou'` boundary rule (see
> `docs/packaging/golden-vs-production-boundary.md`).
> Production code MUST NOT read this file unless
> `goldenProjectId === 'jiuzhou'` is set on the run.

## 1. Reference role (per V1 spec §19)

- **Style** (secondary) — shared Jiuzhou palette + finish
  register; one open-state anchor.
- **Material** (dominant) — paperboard substrate behavior
  at the hinge, the lid, the inner tray, the contents.
- **Composition** (tertiary) — `open_box` camera; the open
  box is the primary subject, contents visible inside.
- **Structure** (lock) — the open-state geometry from the
  anchor; do not redraw the box, do not invent a new
  internal layout.
- **Product** (lock) — the SKUs in the box; do not
  substitute.

## 2. Visual direction

- 东方秩序 × 生物光泽 (Eastern Order × Biological Lustre)
- Source: `visual-direction.md` in the same Golden root.

## 3. Color baseline (V1 spec §11.3)

| Color | Ratio | Usage |
|---|---|---|
| Pearl-white / warm gray | 65-70% | substrate dominant field |
| Mineral purple | 20-25% | identification accent (inner + outer) |
| Graphite black | 5-10% | type / fine line work |
| Iridescent blue-violet | local only | premium finish on the inner lid only |

> Source: `color-baseline.md` in the same Golden root.

## 4. Motif language (V1 spec §11.2)

5 abstract peacock components — applied to BOTH outer lid
and inner tray surface, in restrained repetition:

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

Plus OPEN-specific (auto-fail F10):

- Physically impossible package geometry → PKG-F10
- Duplicated compartments / impossible inner tray → PKG-F10
- Missing internal logic (lid in mid-air, contents
  ungrounded) → PKG-F10
- Box structure changed without permission → PKG-F10 / F02

> Source: `forbidden-motifs.md` in the same Golden root.

## 6. Camera + framing (V1 spec §15)

- `layout`: `open_box` (preferred) — top-down 3q with the
  open lid visible, contents inside the tray.
- `aspectRatio`: `4:3` (OPEN preferred; the only Golden
  aspect that is also already preflight-accepted at
  4:3; Golden framing matches the preflight here).
- `depthOfField`: medium; lid edge crisp, contents
  slightly soft, background soft.
- `background`: clean negative space; no supporting props
  that compete with the open box.
- `lighting`: 3-point soft + slight top-down fill to
  illuminate the inner tray; the open lid acts as a
  secondary bounce surface.

## 7. Prompt body (English — sent to the image model)

```text
An open-box packaging render, Reference-First mode.

[PACKAGE SUBJECT]
A Jiuzhou (九州美学) gift box, OPEN state. Outer lid open
or removed, inner tray with contents visible. The box
geometry is taken from the provided reference anchor and
MUST NOT be redrawn, the inner layout MUST NOT be invented.

[VISUAL DIRECTION]
Eastern Order × Biological Lustre. Calm, premium, restrained
medical-beauty aesthetic. The open state must read as a real
gift set, not a stylized illustration.

[COLOR SYSTEM]
- pearl-white / warm gray 65–70% (substrate + inner tray)
- mineral purple 20–25% (identification accent; consistent
  on outer + inner surfaces)
- graphite black 5–10% (type, fine line work)
- iridescent blue-violet ONLY on the inner lid as a single
  localized premium finish; no full-coverage shimmer

[GRAPHIC SYSTEM]
Use 5 abstract peacock-derived components on BOTH outer lid
and inner tray in a consistent, restrained way. Do NOT
render realistic peacock feathers or literal bird imagery.

[MATERIAL & SURFACE]
- matte substrate on outer box
- inner tray has subtle soft-touch feel
- one spot-gloss area only (the inner-lid iridescence)
- believable paperboard hinge behavior
- believable paperboard / paper feel throughout
- no plastic, no foil, no metallic foil, no neon

[COMPOSITION]
- open_box layout, top-down 3q, lid visible
- inner tray contents are visible and grounded
- aspect ratio 4:3
- medium depth of field; lid edge crisp, contents slightly
  soft, background soft
- no extra props, no graphic clutter, no people, no hands

[LIGHTING & PHOTOGRAPHY]
- 3-point soft + slight top-down fill to illuminate the
  inner tray
- the open lid acts as a secondary bounce surface
- key from upper-left
- no harsh shadows inside the tray

[STRUCTURE INVARIANTS]
- the box is physically possible: lid hinges, contents
  rest on a single tray, no duplicated compartments
- the inner layout matches the reference anchor
- the box is opened (not mid-closing)
- the contents are arranged in a single coherent layout

[REFERENCE PRIORITY]
The provided reference image is dominant for: open-state
geometry, inner-tray layout, substrate behavior at the
hinge, finish register. Analysis context supplies semantic
constraints only.

[LOCKED ASSETS]
The box geometry, inner layout, brand identity, and the
SKU identity of the contents are locked. Do not redraw,
do not invent, do not substitute.

[FORBIDDEN OUTCOMES]
- NO large-area saturated purple
- NO large-area realistic peacock feather illustration
- NO nightclub-iridescent shimmer
- NO physically impossible box geometry
- NO duplicated compartments
- NO lid floating in mid-air
- NO box structure changed from the reference
- NO generic advertising look
- NO supporting props, NO people, NO hands

Output: a single open-box image, 4:3 aspect, the open box
as the primary subject, contents grounded in the inner
tray.
```

## 8. Comparison protocol (V1 spec §32)

After any Packaging Compiler revision, run this same Golden
Prompt against the same provider/model and compare the new
output against the previously stored baseline. Record
failure category (PKG-F01..F12) and the rubric result.
Pay particular attention to PKG-F10 (open-box physical
logic) and PKG-F02 (package structure drift).

## 9. Notes

- The OPEN shot is the **most structure-sensitive** of the
  three V1 shots (per V1 spec §15: "This shot requires
  stronger structure validation than the first two.").
  The 4 forbidden outcomes specific to OPEN (F10 family)
  are non-negotiable.
- The aspect ratio 4:3 is intentionally chosen because it
  matches the existing preflight-accepted set; the other
  two Golden shots (4:5, 16:9) are Golden framing, not
  preflight constraints, and P2/P3 may extend the
  preflight's accepted set.
- The 5 abstract peacock components appear on BOTH the
  outer lid and the inner tray. This is the only shot
  where motif appears in two distinct surfaces; SERIES
  distributes across SKUs, HERO has one surface only.
