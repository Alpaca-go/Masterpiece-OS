# Space Quality — Golden Regression Scripts (Phase R8)

These tools freeze the recovered Phase 9B Space Generator image quality and
guard it against future regressions.

## Scripts

- `run-golden-regression.mjs` — offline: recompile every frozen golden scene
  and assert its prompt hash, block order and quality gate still match. No
  provider call. Exits non-zero on drift.
  - `--brand <key>` / `--scene <id>`: limit to one scene.
  - `--json`: machine-readable output.
- `collect-run-metadata.mjs --run-dir <dir>` — read a real-provider output dir
  and print a manifest fragment (promptHash, run id, provider, references).
- `build-evaluation-template.mjs --brand <key> --scene <id> --run-id <id>` —
  write a blank 100-point `evaluation.json`.

## Workflow to freeze a new golden scene

1. Generate a real image through the Phase 9B path (Desktop or
   `apps/desktop/scripts/space-quality-recovery/run-real-ab.ts`).
2. Copy `prompt.md`, the redacted provider payload, reference trace and
   `run.json` into `space-generator/quality-baselines/phase9b-recovered/<brand>/<scene>/`.
3. Run `collect-run-metadata.mjs --run-dir <that dir>` to get the manifest
   fragment, then fill in `manifest.json` per `manifest.schema.json`.
4. Run `build-evaluation-template.mjs` to create `evaluation.json`, score the
   image by eye, set `verdict: "golden"`.
5. Commit. `run-golden-regression.mjs` now guards that scene.

## Scoring (100 points)

| Dimension | Weight |
|---|---:|
| Architecture Quality | 25 |
| Brand Translation | 20 |
| Functional Realism | 20 |
| Material & Lighting | 15 |
| Composition | 10 |
| Rendering | 10 |

Diagnostics: Generic AI Space Risk 1–5 (target ≤ 2), Reference Alignment 1–5
(target ≥ 4). A candidate may replace a golden scene only if it scores at
least as high.
