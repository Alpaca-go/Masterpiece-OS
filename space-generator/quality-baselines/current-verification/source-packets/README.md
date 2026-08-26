# Space Generator — Golden Baseline: phase9b-recovered

This directory freezes the image quality of the recovered Phase 9B Space
Generator as the **Space Generator Golden Quality Baseline**. Every future
Space Generator change must prove it does not regress image quality below
these scenes.

## What lives here

```
phase9b-recovered/
├── README.md                  ← this file
├── manifest.schema.json       ← JSON Schema for every per-scene manifest
├── evaluation.schema.json     ← JSON Schema for human image scoring
├── <brand-key>/
│   └── <scene>/
│       ├── manifest.json      ← fixed inputs + output pointers
│       ├── prompt.md          ← exact compiled prompt that produced golden output
│       ├── provider-payload.redacted.json
│       ├── reference-trace.json
│       ├── run.json
│       ├── output.png         ← may be gitignored; hash + runId stay
│       └── evaluation.json    ← 100-point human score
└── _packets/
    └── <brand-key>/visual-decision-packet.json   ← V5 packet snapshot
```

Brands in this series:

| brand key | display name | industry | scenes |
|---|---|---|---|
| `jiuzhou-aesthetics` | 九州美学 | medical_aesthetics | reception, entrance, consultation |
| `feng-tang-tang` | 冯烫烫 | restaurant | entrance, dining, open-kitchen |
| `yi-ji-liang-fang` | 一剂良方 | health_management | reception, tea-area, consultation |

A brand appears here only because it has a real project + V5 packet. The
brand-specific purple/peacock rules live **only** in evaluation/regression
criteria, never in production code.

## Fixed variables

Each scene keeps these constant across regression runs (recorded in the
manifest): Project, Scene, Provider, Model, API Profile, Image Size,
Aspect Ratio, Reference Images, Architecture Anchors, Compiler Mode.

## Scoring

Golden outputs are scored out of 100 (`evaluation.schema.json`):

| Dimension | Weight |
|---|---:|
| Architecture Quality | 25 |
| Brand Translation | 20 |
| Functional Realism | 20 |
| Material & Lighting | 15 |
| Composition | 10 |
| Rendering | 10 |

Plus two diagnostic metrics:

- **Generic AI Space Risk**: 1–5, target ≤ 2
- **Reference Alignment**: 1–5, target ≥ 4

A candidate only replaces a golden scene if it scores at least as high.
Unit tests prove code did not break; golden images prove the product did
not get uglier.

## Reproducing

Offline prompt-level regression (no provider):

```
node apps/desktop/scripts/space-quality/run-golden-regression.mjs
```

Real-provider recertification (requires an authorized Desktop API profile):

```
node apps/desktop/scripts/space-quality/run-golden-regression.mjs --real
```
