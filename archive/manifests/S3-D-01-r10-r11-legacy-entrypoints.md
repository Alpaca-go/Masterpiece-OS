# S3-D-01 — R10/R11 Legacy Entrypoints

Batch: `S3-D-01`

Date: `2026-08-11`

Reason: Isolate completed one-shot R10/R11 baseline construction, artifact-binding and closeout utilities from the active Desktop script tree.

## Original Paths

- `apps/desktop/scripts/space-r10-archive/archive-r10-final.mjs`
- `apps/desktop/scripts/space-r10-archive/bind-r10.4.1-artifacts.mjs`
- `apps/desktop/scripts/space-r10-archive/bind-r11.1-v12-artifacts.mjs`
- `apps/desktop/scripts/space-r10-archive/r11.1-closeout.mjs`

## Archived Paths

- `archive/legacy-entrypoints/space/r10-r11/archive-r10-final.mjs`
- `archive/legacy-entrypoints/space/r10-r11/bind-r10.4.1-artifacts.mjs`
- `archive/legacy-entrypoints/space/r10-r11/bind-r11.1-v12-artifacts.mjs`
- `archive/legacy-entrypoints/space/r10-r11/r11.1-closeout.mjs`

## Evidence

- The files describe themselves as archive builders, artifact binders, or closeout utilities.
- Git history records the corresponding R10 and R11 baseline/archive completion commits.
- Their generated artifacts already exist under `space-generator/quality-baselines/` and remain protected by current tests and Golden Regression.
- The S0 registry classified the directory as `UNKNOWN`; S3 resolved each file individually to `SAFE_TO_ARCHIVE` with HIGH confidence.

## Dependency Audit

Production Imports: `0`

Dynamic Loads of Candidate: `0`

Package Script References: `0`

Current Test Dependencies: `0`

Baseline Manifest Dependencies: `0`

The archived utilities dynamically loaded active compiler/integrity modules when manually executed. No active module, test, package script, filesystem resolver, child process, or environment route loads these utilities.

## Verification

Pre-Test:

- Unit: PASS, 710/710
- CLI: PASS, 40/40
- Web Smoke: PASS, Provider calls 0, business writes 0
- Golden: PASS, 5/5, Provider calls 0, auto-update NO

Post-Test:

- Unit: PASS, 711/711
- CLI: PASS, 40/40
- Web Smoke: PASS, Provider calls 0, business writes 0
- Golden: PASS, 5/5, Provider calls 0, auto-update NO

Golden:

- G-01: PASS (`VISUAL_MANUAL_ACCEPTED`)
- G-02: PASS (`VISUAL_MANUAL_ACCEPTED`)
- G-03: PASS (`VISUAL_MANUAL_ACCEPTED`)
- G-04: PASS (`NOT_APPLICABLE`)
- G-05: PASS (`NOT_READY`, deterministic packaging contract unchanged)

Result: `ARCHIVED` / PASS
