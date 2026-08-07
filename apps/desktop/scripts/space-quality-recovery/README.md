# Phase 9B Space Quality — A/B Recovery Runner

Recovery doc §17. This script compares the repaired production space
compiler (Mode B) against the frozen Phase 9B Mode B block order (Mode A),
using the same V5 `VisualDecisionPacket`, task, brand and reference set.

## Files

- `run-ab-smoke.mjs` — offline parity runner; optionally drives a real
  provider when credentials are available (R6).

## Prompt-level parity (offline, default)

```powershell
node apps/desktop/scripts/space-quality-recovery/run-ab-smoke.mjs `
  --project=<projectId> `
  --brand=jiuzhou-aesthetics `
  --packet=<path-to-visual_decision_packet.json> `
  --out=.runtime/ab-smoke-report.json
```

The script exits non-zero when:

- the production compiler emits blocks missing from or reordered against
  the Phase 9B Mode B baseline (`architecture_context` is optional — only
  included when architecture anchors are selected), or
- the R5 quality gate blocks the compiled prompt.

The JSON report includes block IDs, prompt length, anchor/reference counts,
budget ratios and quality-gate findings.

## Real-provider A/B (R6, requires user authorization)

> The `--dry-run=false` path invokes the live image-generation provider.
> It must NOT be run without explicit user authorization and valid API
> credentials, in line with `AGENTS.md` (real-provider smoke procedure).

The runner currently prepares the same compiled prompt for both modes and
records the §18 scoring rubric in the report. The actual image call goes
through the Desktop image-generation service; after generating A and B
images, score them with the §18 100-point rubric and the two diagnostics:

| Dimension | Score |
|---|---:|
| Architecture Quality | 25 |
| Brand Translation | 20 |
| Functional Realism | 20 |
| Material & Lighting | 15 |
| Composition | 10 |
| Rendering | 10 |
| **Total** | **100** |

Diagnostics (not counted in 100):

- Generic AI Space Risk: 1–5 (target ≤ 2)
- Reference Alignment: 1–5 (target ≥ 4)

R7 (default route switch) may only proceed when the human scorer confirms
**B ≈ A** within an agreed tolerance.
