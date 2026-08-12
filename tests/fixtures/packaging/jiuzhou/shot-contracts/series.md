# PKG-SERIES-GROUP — Framing (frozen)

```text
shot_id:            PKG-SERIES-GROUP
frozen:             2026-08-12
applies_to:         golden-jiuzhou
```

## Subject

Multiple SKUs of the **same series**, closed-state. 3 to 5 SKUs
in a single frame. All SKUs must share:

- The same substrate family
- The same color baseline ratio (65-70 / 20-25 / 5-10 / 局部高光)
- The same brand mark position

## Framing

- Line-up composition (horizontal or arc; not chaotic scatter).
- Equal visual weight per SKU.
- All SKUs fully visible (no SKU cut by frame edge).
- Brand mark is **once** (one master brand mark; SKUs may carry
  their variant name in the same mark family).

## Aspect ratio

Preferred `16:9` (landscape). `3:2` acceptable.

## Lighting

- Uniform across all SKUs.
- Same key, same bounce.
- No SKU in deep shadow.

## Series Consistency (axis 7)

The **Series Consistency** axis is **REQUIRED** for this shot.
Threshold: ≥ 0.80. PKG-F09 fires on detection.

## Reference fidelity

- Each SKU honors the Locked Asset (substrate + structure).
- Reference assets apply to the series as a whole (not per-SKU
  drift).

## Source

Authoritative at `docs/packaging/shot-contracts.md` §4.
SHA-256 in `manifest.json`.
