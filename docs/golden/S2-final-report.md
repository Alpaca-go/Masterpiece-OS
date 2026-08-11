# S2 Final Report — Golden Regression Baseline

## Baseline

- Recovery Tag: `masterpiece-reference-first-stable-2026-08`
- Tag Commit / Current HEAD at S2 start: `a17eee37396776b848eb6a26d17c242a26202b01`
- S1 baseline comparison commit: `deb1cba8b40b22bf9c026ae5ec40f5b46389d6e2`
- Baseline Drift: `BASELINE_CLEAN`, 73 manifest files checked, with one documented S2-only `golden:test` hook in root `package.json`.
- Legacy detector note: the pre-S2 detector reports the root script addition as a whole-file drift. The S2 semantic detector proves this is the only `package.json` delta and compares all remaining frozen files exactly.

## Golden Infrastructure

- Runner: `npm run golden:test` → `scripts/golden/run-golden.mjs`
- Registry: `golden/manifests/golden-registry.json`
- Cases: 5 (`G-01-01` through `G-05-01`)
- Default real Provider calls: 0
- Expected auto-update: disabled; update flags are rejected
- Runtime report: `.runtime/golden/latest-report.json` (ignored local runtime output)

## G-01

- Reference First: JZMX Reception → Consultation
- Result: PASS
- Comparison Levels: EXACT + STRUCTURAL + SEMANTIC + VISUAL_MANUAL
- Protected behavior: explicit reference binding, cross-scene relation, target-scene authority, consultation program, locked Logo policy, accepted route trace.
- Visual Review: existing human-accepted output retained; no pixel diff and no new generation.

## G-02

- Standard Space: JZMX + FTT + YJLF R8.6 parity set
- Result: PASS
- Protected behavior: Phase9B block order, deterministic compilation, negative constraints, zero Standard references, frozen manifest and four accepted outputs.

## G-03

- Continuation: JZMX Reception → Consultation, canonical v12 evidence
- Result: PASS
- Protected behavior: `generationBasis=continuation`, `world_consistency`, confirmed generated-output lineage, distinct source/target scenes, target view strategy and leakage gate.

## G-04

- Visual Analysis: existing JZMX multi-image audit fixture
- Result: PASS
- Protected behavior: fixture SHA-256 bindings, report sections, locked identity semantics, visual-direction semantics, DashScope/Qwen analysis registry route.
- Natural-language comparison: structural and semantic only.

## G-05

- Packaging: FTT deterministic deliverable fixture
- Result: PASS
- Protected behavior: V1 → V2 task migration, V2 → V3 source migration, critical-field preservation, packaging prompt, structure-reference selection and provider route.
- Visual Status: NOT_READY, intentionally unchanged from S1.

## Existing Tests

- Unit: PASS — 710/710
- CLI: PASS — 40/40
- Web Smoke: PASS — provider calls 0, business writes 0
- Golden: PASS — 5/5, provider calls 0, auto-update NO

## S3 Readiness

`READY`

The S3 entry conditions are satisfied: G-01 PASS, G-02 PASS, G-03 PASS, Web Smoke PASS, and S2 semantic baseline drift CLEAN. S3 was not started.

## Safety Summary

```text
Production files deleted: 0
Production files moved: 0
Production files renamed: 0

Prompt behavior changed: NO
Compiler behavior changed: NO
Reference First behavior changed: NO
Generator behavior changed: NO
Provider behavior changed: NO
Schema behavior changed: NO

Golden auto-updated: NO
Real Provider calls: 0
Repository cleanup performed: NO
```
