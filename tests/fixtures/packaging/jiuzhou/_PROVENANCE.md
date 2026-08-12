# Jiuzhou Golden — Provenance

```text
brand:             九州美学
goldenProjectId:   golden-jiuzhou
schemaVersion:     1.0
frozen:            2026-08-12
authoritative_at:  docs/packaging/jiuzhou-golden-baseline.md
```

## What this directory is

This directory holds the **frozen evaluation assets** for the
Jiuzhou Aesthetics Golden Project (V1 only). It is **evaluator
input only**. It is NOT a production default and is NOT a
hard-coded production rule. See
`docs/packaging/golden-vs-production-boundary.md` for the
boundary contract.

## Files (canonical listing)

| File | Role |
|---|---|
| `_PROVENANCE.md` | this file |
| `visual-direction.md` | 东方秩序 × 生物光泽 direction (frozen) |
| `color-baseline.md` | 65-70 / 20-25 / 5-10 / 局部高光 (frozen) |
| `motif-language.md` | 5 abstract peacock components (frozen) |
| `forbidden-motifs.md` | 3 explicit fails (frozen) |
| `shot-contracts/hero.md` | PKG-HERO-SINGLE framing |
| `shot-contracts/series.md` | PKG-SERIES-GROUP framing |
| `shot-contracts/open.md` | PKG-GIFT-OPEN framing |
| `acceptance-rubric.json` | 7-axis thresholds + composite |
| `failure-taxonomy.json` | 12 codes (PKG-F01..F12) |
| `manifest.json` | SHA-256 digests per file |

## Manifest invariant

The `manifest.json` is the source of truth for "is the Golden
still frozen?". Any file with a digest that has drifted is a
frozen-Golden integrity failure and must be re-evaluated
through a new P1.x cycle.

## Boundary

Production code MUST NOT read this directory unless the run
carries `goldenProjectId: 'jiuzhou'`. (See boundary doc.)
