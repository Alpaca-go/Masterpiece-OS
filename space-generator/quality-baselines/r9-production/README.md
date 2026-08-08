# Space Generator R9 Production Baseline

> Productionized Space Generation Core — frozen after real-provider parity.
> Source: R8.6 Golden Baseline, migrated equivalently into
> `packages/image-generation-runtime/src/space/` (no redesign).

## Status

**R9 = PASS. Production = FROZEN. Default mode = `r8_6_golden`.**

| Item | Value |
|---|---|
| Production module | `packages/image-generation-runtime/src/space/` |
| Compiler | `phase9b-quality-compiler` v1.1.0 (mode `r8_6_golden`) |
| Source adapter | v1.4.0 |
| Feature flag | `MASTERPIECE_SPACE_COMPILER_MODE=r8_6_golden\|phase9b_quality\|vnext_legacy` |
| Deliverable router | space → src/space; packaging/vi/poster → vNext compiler |
| Trace | `spaceGeneration` schema (R9 §20) |

## Parity evidence

- **Text-level (offline)**: `apps/desktop/scripts/space-r9-parity/run-parity.mjs`
  reproduces the frozen R8.6 prompt hashes byte-exactly (4/4 MATCH).
- **Real provider (R9.9)**: `space-generator/quality-baselines/r9-parity/`
  5/5 runs on volcengine doubao-seedream-5-0-pro-260628 (2K, 16:9):
  JZMX reception + entrance text-only, FTT dining, YJLF reception, and the
  JZMX High Fidelity reference route (refs=1). See GATE-REPORT.md.

## Layout

```
quality-baselines/
├── r8.6/            # R8.6 golden baseline (source of truth for images)
├── r9-parity/       # R9 real-provider parity runs (5 scenes)
└── r9-production/   # this production baseline manifest
```

## What R9 kept unchanged

- 14-block prompt hierarchy (Architecture before Brand, negatives last)
- Semantic separation (architecture / brand motif / ambiguous)
- spatialMechanisms as compile-time ephemeral IR (no V5 schema change, no LLM)
- Reference policy: text-only = Standard, reference-assisted = High Fidelity,
  refs=0 not blocked; Logo never a core reference (post-composite)
- Packaging / NICE / ProjectGenerationContract / V5 Analysis untouched

## Next

R10 — Reference-First Productization (upload reference → first high-quality
space image), then R11 — Space Continuation.
