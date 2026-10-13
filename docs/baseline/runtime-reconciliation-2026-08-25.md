# Runtime Reconciliation — 2026-08-25

> **Status**: Historical reconciliation note from 2026-08-25, with a tip
> correction recorded below. Not a baseline change and not a new freeze.
> **Audience**: Future maintainers who notice older text describing
> `apps/desktop/` as baseline-critical.
> **Authority**: See `CURRENT_BASELINE.md` (tip paths) and
> `BASELINE_LOCK.md` (regression lock; recovery tag/branch absent).
> VM1 integration status is CONDITIONAL PASS / NOT FROZEN:
> `docs/runtime/visual-migration-vm1-integrated-baseline.md`.

## What changed

The previous `CURRENT_BASELINE.md` §1 described a runtime that started with
`apps/desktop/scripts/run-web-dev.mjs` and an Electron-vite pipeline that
mounted a renderer under `apps/desktop/src/renderer/src/`. That description
predates the Web-first delivery shape that became the Primary Runtime
during the 2026-08 Reference First content pin
(`deb1cba8b40b22bf9c026ae5ec40f5b46389d6e2`). The tag name
`masterpiece-reference-first-stable-2026-08` is absent on origin.

The current shipped surface is:

| Layer | Current path |
|---|---|
| Web runtime host (Node + ws RPC) | `apps/web-runtime/src/main.ts` → `node-runtime-host.ts` → `local-rpc-server.ts` |
| Web renderer (Vite + React) | `apps/web/src/main.tsx` → `App.tsx` |
| RPC contract | `apps/web/src/web-api.ts` ↔ `apps/web-runtime/src/{local-rpc-server,current-operation-graph,node-native-operations}.ts` |
| Backend service host | `packages/runtime-core` operation registry |

On 2026-08-25 this note observed that `apps/desktop/src/` was already gone
and that `apps/desktop/out/` still held historical smoke-app build outputs.
That observation is not the tip.

On tip `codex/visual-migration-vm1-integration-freeze`, S5 has removed the
Desktop/Electron workspace. `apps/desktop/` is not in the tree. There is no
`apps/desktop/out/`, no `apps/desktop/package.json`, no `apps/desktop/src/`,
and no `apps/desktop/electron.vite.config.ts`. Do not look for Electron build
output under `apps/desktop/`.

## Why the previous §1 was misleading

`BASELINE_LOCK.md` still forbids deletion, move, consolidation, rename,
or rewrite of baseline-critical modules before Golden Regression Phase S2
is complete. The §1 narrative treated the
Electron shell as a live backend host, so anyone reading the baseline
as a source of truth assumed `apps/desktop/src/main/` was
authoritative shared code.

Reality: the Electron shell was deprecated in favor of `web-runtime`
during the r2.0 / r10.4 UX work, but the §1 narrative was never
updated. This created a documented-vs-shipped mismatch.

## What this reconciliation does NOT change

- `BASELINE_LOCK.md` continues to govern P0 baseline-critical paths
  (Visual Analysis, Reference First, Space Generator, Packaging, Provider).
- Visual Analysis entry on this tip is
  `packages/runtime-core/src/application/pipeline-service.ts`, which
  dynamically imports `apps/cli/src/analysis-engine/bootstrap.js` and reads
  `apps/cli/prompts/analysis/`. `apps/desktop/src/main/pipeline-service.ts`
  and `apps/cli/src/v5/` are not on this tip.
- This note does not restore `apps/desktop/out/`. That directory is absent.

## Verification of the runtime baseline as of 2026-08-25

| Check | Path | Result |
|---|---|---|
| Web host entry exists | `apps/web-runtime/src/main.ts` | ✅ present |
| Renderer entry exists | `apps/web/src/main.tsx` | ✅ present |
| Electron entry | `apps/desktop/src/main/index.ts` | absent on 2026-08-25 and on this tip |
| Electron renderer | `apps/desktop/src/renderer/src/main.tsx` | absent on 2026-08-25 and on this tip |
| `apps/desktop/` | whole workspace | absent on this tip (S5) |
| Analysis entry | `packages/runtime-core/src/application/pipeline-service.ts` | present |
| Analysis pipeline | `apps/cli/src/analysis-engine/bootstrap.js` | present |
| Web smoke | `apps/web-runtime/scripts/run-web-primary-smoke.mjs` | present |

## Forward guidance

S5 already removed the Desktop workspace. Do not treat `apps/desktop/out/`
as a directory that still needs a cleanup pass on this tip.

If a future change reintroduces the Electron Desktop shell as a real
delivery surface, re-author `CURRENT_BASELINE.md` §1 to reflect that
runtime topology.