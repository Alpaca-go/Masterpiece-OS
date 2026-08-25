# @masterpiece/image-provider-dashscope — ACTIVE, NOT ARCHIVED

> **Status (2026-08-25 audit correction)**: This package was originally
> marked ARCHIVED in commit `df4d9b11`. **That verdict was incorrect.**
> The package is actively consumed by runtime-core and has a dedicated
> test file. It is also referenced by three documentation files in
> `docs/packaging/`.

## Why this file exists (audit correction)

The 2026-08-25 audit (item #6.2) initially claimed this package had
"no production consumer". That claim was based on a search scoped to
`apps/web`, `apps/web-runtime`, `apps/cli`, and the npm `workspaces`
glob. **The audit missed multiple real consumers:**

1. `packages/runtime-core/src/application/image-generation/service.ts`
   line 57 imports `@masterpiece/image-provider-dashscope/index.js`.
   This service is part of the shipped runtime-core service graph and
   is wired through `current-operation-graph.ts` to the
   `apps/web-runtime` host.
2. `tests/image-generation/provider-dashscope.test.js` is a dedicated
   unit test that exercises the DashScope Wan adapter end-to-end. It
   is part of the project's `npm test` suite.
3. Three `docs/packaging/*` files mention this package by name:
   - `docs/packaging/shared-vs-target-matrix.md` line 33
   - `docs/packaging/reuse-decision-log.md` line 56
   - `docs/packaging/packaging-target-interface.md` line 87

When audit H3.4 (commit this directory) tried to move the package
out of `packages/`, the runtime-core import would have broken. The
move was rejected and the package stays in `packages/` as an active
workspace member.

## What this package is

`@masterpiece/image-provider-dashscope` exports the DashScope
`wan2.7-image-pro` image provider adapter: async submit / poll /
cancel, region+endpoint resolution, provider error normalization,
capabilities. No project context, no prompt decisions, no local file
structure.

Per `CURRENT_BASELINE.md` §6, this is "Legacy-compatible and
disabled by default" — but the runtime still wires it. Whether Wan is
actively used at runtime depends on the user's `imageGenerationProfile`
choice, not on whether the package is shipped.

## What consumes it

| Consumer | Path | What it uses |
|---|---|---|
| `runtime-core` | `packages/runtime-core/src/application/image-generation/service.ts:57` | Wan adapter (async submit / poll / cancel) |
| Tests | `tests/image-generation/provider-dashscope.test.js` | direct unit tests against the adapter |
| Docs | `docs/packaging/{shared-vs-target-matrix,reuse-decision-log,packaging-target-interface}.md` | design references |

## Forward guidance

- **Do not** treat this package as a candidate for removal from
  `workspaces/`. Removing it requires first refactoring
  `image-generation/service.ts` to drop the Wan code path, and that
  is a user-facing behavior change (removes a fallback that some
  users rely on when Seedream is unavailable).
- A future cleanup could move Wan support into the same provider
  namespace as Seedream under `@masterpiece/image-generation-runtime`,
  but that is structural refactoring and must ship its own
  baseline-impact analysis.
- Adding a new import from `apps/*` or `apps/web-runtime/` into this
  package is fine; the package is part of the live runtime surface
  even if most users default to Seedream.

## Audit references

- `docs/baseline/runtime-reconciliation-2026-08-25.md` (item #6.2;
  original claim, now corrected)
- `CURRENT_BASELINE.md` §6 (provider baseline; Wan listed as
  legacy-compatible, disabled by default, but still wired)
- `CURRENT_BASELINE.md` §7 (configuration baseline; Wan env var
  listed, `MASTERPIECE_DASHSCOPE_API_KEY`)
- Commit `df4d9b11` — first ARCHIVED.md (incorrect)
- H3.4 attempt (rejected) — would have broken
  `image-generation/service.ts`. The attempt was abandoned and
  superseded by this correction.
- This file replaces the original ARCHIVED.md. The file path stays
  the same to preserve the audit trail; only the content is corrected.