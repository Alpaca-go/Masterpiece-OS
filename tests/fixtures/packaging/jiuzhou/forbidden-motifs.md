# Jiuzhou — Forbidden Motif Set (frozen)

```text
forbidden_set_id:   jiuzhou.forbidden-motifs.v1
frozen:             2026-08-12
applies_to:         golden-jiuzhou
```

## 3 explicit fails (frozen)

These three states are **explicit evaluation fails** when
detected in a Jiuzhou output. They are **not** "Production Rules"
in the P1 / P3 sense; they are the **Golden evaluator's
auto-fail triggers**.

```text
forbidden-1:  大面积浓紫
              (large-area saturated purple)
              evaluator:   if "Identity" range (20-25 %)
                           exceeds the 25 % upper bound and the
                           area is contiguous (one zone of ≥
                           15 % of visible surface), the output
                           fails.
              axis:        Visual Direction Fidelity (= 0)
              rubric:      PKG-F05 (color ratio failure) +
                           PKG-F04 (visual direction drift)

forbidden-2:  大面积写实羽毛
              (large-area realistic feather)
              evaluator:   if a literal peacock feather is
                           rendered in > 5 % of the visible
                           surface, the output fails.
              axis:        Visual Direction Fidelity (= 0)
              rubric:      PKG-F06 (motif over-literalization)

forbidden-3:  夜店式虹彩
              (club / disco iridescence)
              evaluator:   if the "Accent" range is rendered
                           as a global hue shift (not local) and
                           covers > 8 % of the visible surface,
                           the output fails.
              axis:        Visual Direction Fidelity (= 0)
              rubric:      PKG-F04 (visual direction drift) +
                           PKG-F11 (generic advertising look)
```

## Strict scope

These are **Jiuzhou-specific** evaluation rules. They are NOT a
default for other projects. Other projects (V2, V3) will define
their own forbidden sets (or none).

The Packaging Translation / Compiler / Validator code MUST NOT
hard-code these three into production business logic. The only
allowed use is as evaluator input when the run carries
`goldenProjectId: 'jiuzhou'`.

## Source

Authoritative at `docs/packaging/jiuzhou-golden-baseline.md` §6.
SHA-256 in `manifest.json`.
