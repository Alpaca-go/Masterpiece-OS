# Runtime Reconciliation — 2026-08-25

> **Status**: Historical reconciliation note. Not a baseline change.
> **Audience**: Future maintainers who notice `apps/desktop/` described as
> baseline-critical in `CURRENT_BASELINE.md` §1 (now corrected) and wonder
> why the directory no longer ships source code.
> **Authority**: See `CURRENT_BASELINE.md` (current truth) and
> `BASELINE_LOCK.md` (frozen P0 baseline paths).

## What changed

The previous `CURRENT_BASELINE.md` §1 described a runtime that started with
`apps/desktop/scripts/run-web-dev.mjs` and an Electron-vite pipeline that
mounted a renderer under `apps/desktop/src/renderer/src/`. That description
predates the Web-first delivery shape that became the Primary Runtime
during the `masterpiece-reference-first-stable-2026-08` baseline freeze.

The current shipped surface is:

| Layer | Current path |
|---|---|
| Web runtime host (Node + ws RPC) | `apps/web-runtime/src/main.ts` → `node-runtime-host.ts` → `local-rpc-server.ts` |
| Web renderer (Vite + React) | `apps/web/src/main.tsx` → `App.tsx` |
| RPC contract | `apps/web/src/web-api.ts` ↔ `apps/web-runtime/src/{local-rpc-server,current-operation-graph,node-native-operations}.ts` |
| Backend service host | `packages/runtime-core` operation registry |

`apps/desktop/` is a historical artifacts directory. Its current contents:

- `apps/desktop/out/` — 20+ historical smoke-app build outputs from prior
  visual-analysis passes (e.g. `r2-b4-reference-first-app`,
  `phase9b-real-ab-app`, `r86-final-smoke-app`).
- `apps/desktop/out/main/`, `apps/desktop/out/preload/`,
  `apps/desktop/out/renderer/` — last Electron build artifacts.
- `apps/desktop/node_modules/`, `apps/desktop/release/` — packaging artifacts.
- `apps/desktop/.codex-runtime/` — empty.

There is no `apps/desktop/package.json`, no `apps/desktop/src/`, and no
`apps/desktop/electron.vite.config.ts` in the current tree.

## Why the previous §1 was misleading

The `BASELINE_LOCK.md` line 8 explicitly forbids "deletion, move,
consolidation, rename or rewrite of baseline-critical modules before
Golden Regression Phase S2 is complete". The §1 narrative treated the
Electron shell as a live backend host, so anyone reading the baseline
as a source of truth assumed `apps/desktop/src/main/` was
authoritative shared code.

Reality: the Electron shell was deprecated in favor of `web-runtime`
during the r2.0 / r10.4 UX work, but the §1 narrative was never
updated. This created a documented-vs-shipped mismatch.

## What this reconciliation does NOT change

- `BASELINE_LOCK.md` continues to govern P0 baseline-critical paths
  (Visual Analysis, Reference First, Space Generator, Packaging, Provider).
- The Visual Analysis entry (`apps/desktop/src/main/pipeline-service.ts`
  referenced in §2 of `CURRENT_BASELINE.md`) is unchanged in scope; if that
  path is now also served by a `web-runtime` operation, that is a
  separate §2 reconciliation, tracked here once the audit identifies the
  new entry point.
- The `apps/desktop/out/*` historical builds are **not** deleted by this note;
  removing them is a separate cleanup pass with its own risk profile.

## Verification of the runtime baseline as of 2026-08-25

| Check | Path | Result |
|---|---|---|
| Web host entry exists | `apps/web-runtime/src/main.ts` | ✅ present |
| Renderer entry exists | `apps/web/src/main.tsx` | ✅ present |
| Electron entry exists | `apps/desktop/src/main/index.ts` | ❌ not present |
| Electron renderer exists | `apps/desktop/src/renderer/src/main.tsx` | ❌ not present |
| `apps/desktop/package.json` | — | ❌ not present |

## Forward guidance

If a future audit pass decides to retire `apps/desktop/out/*` historical
artifacts entirely, do it as a separate change with its own commit, its
own risk assessment, and a follow-up update to this note. Do not conflate
historical artifact removal with baseline reconciliation — they have
different review profiles.

If a future change reintroduces the Electron Desktop shell as a real
delivery surface, revert this note and re-author §1 to reflect the new
runtime topology.