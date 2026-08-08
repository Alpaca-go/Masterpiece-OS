# Space Generator R9 Parity Runner

R9 Productionization parity tooling (doc §23–§26).

## Files

- `run-parity.mjs` — **offline** text-level parity (Mode A = frozen R8.6 vs
  Mode B = production `src/space` compiler). Recompiles each frozen final-smoke
  packet through the production compiler and asserts prompt hash, block order,
  budget and refs match the frozen R8.6 records. Never calls a provider.
- `compare-trace.mjs` — compares the production compiler's `spaceGeneration`
  trace (R9 §20 schema) against the frozen R8.6 manifest/run and prints a diff.
- `run-parity.mjs --json` / `--brand <key>` / `--scene <rel>` for filtering.

## Modes

| Mode | Meaning |
|---|---|
| A | R8.6 Frozen Generation Core (recorded golden prompts) |
| B | R9 Production compiler (`packages/image-generation-runtime/src/space`) |
| C | vNext Legacy (debugging only) |

Goal: `B ≈ A` (production compiler must reproduce the frozen core exactly at
text level) and `B > C` (production beats legacy).

## Scenes

The four frozen R8.6 final-smoke scenes:

| Brand | Scene | Role |
|---|---|---|
| jiuzhou-aesthetics | final-reception-1 | Commercial Golden (89) |
| jiuzhou-aesthetics | final-entrance-1 | Architecture Golden (91) |
| feng-tang-tang | final-dining-1 | Commercial Golden (86) |
| yi-ji-liang-fang | final-reception-1 | Commercial Golden (86) |

Plus the R9.9 real-provider high-fidelity route (JZMX reference-assisted ×1).

## Run

```bash
node apps/desktop/scripts/space-r9-parity/run-parity.mjs
node apps/desktop/scripts/space-r9-parity/run-parity.mjs --json
node apps/desktop/scripts/space-r9-parity/compare-trace.mjs
```

Real-provider image parity (R9.9) is a separate user-authorized step using the
Desktop API profile; this directory's offline tools must never call a provider.
