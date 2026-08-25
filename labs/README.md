# labs/

> **Status (2026-08-25 audit)**: Independent experiment workspaces.
> **Not part of the shipped runtime.** They are kept under the npm
> `workspaces` glob but are **not** consumed by `apps/web`,
> `apps/web-runtime`, `apps/cli`, or `packages/runtime-core`.

## What lives here

| Lab | Type | Status | npm script |
|---|---|---|---|
| `document-visual-directions/` | Node CLI + tests + snapshots | Standalone | `npm run lab:document-directions` / `npm run lab:document-directions:test` |
| `reference-style-conversion/` | Node CLI + tests | Standalone | `npm run lab:reference-conversion` / `npm run lab:reference-conversion:test` |
| `infinite-canvas/` | Browser-side experiment (Vite, in `infinite-canvas/web/`) | Standalone | (no root-level script) |

## Why these are NOT production

These labs are **experimental surfaces** maintained alongside the
P0 baseline:

- They have **no IPC channel**, **no UI surface in `apps/web`**, and
  **no operation registered in `runtime-core`**.
- Their tests and snapshots are scoped to themselves; they do not
  gate any P0 baseline verify.
- They may evolve independently of the shipped product.

If a lab graduates to a real product surface, the promotion path is:

1. Move relevant code under `apps/*` or `packages/*`.
2. Add a runtime operation + IPC channel + UI entry.
3. Add an integration test under `tests/` that exercises the surface
   end-to-end.
4. Remove the lab directory once the surface ships.

Do **not** import from `labs/*` in production paths — doing so re-creates
the dead-code condition that this audit caught.

## Adding a new lab

1. Create `labs/<name>/` with a `package.json` matching the lab
   template (see `document-visual-directions/package.json`).
2. Add npm scripts at the root `package.json` (`lab:<name>:run` and
   `lab:<name>:test`) — both prefixed with `lab:` so they are easy to
   find and easy to gate.
3. Document the lab in this README's table above.
4. Run `npm run repo:guard:test` to confirm the lab does not break
   workspace boundaries (no `@masterpiece/*` imports that bypass the
   `apps/*` → `packages/*` dependency direction).

## Audit references

- `docs/baseline/runtime-reconciliation-2026-08-25.md` (item #6.3)
- `CURRENT_BASELINE.md` §1 (runtime baseline; labs are not in the
  baseline because they are not in the shipped runtime)