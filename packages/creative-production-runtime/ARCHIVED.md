# @masterpiece/creative-production-runtime — ACTIVE, NOT ARCHIVED

> **Status (2026-08-25 audit correction)**: This package was originally
> marked ARCHIVED in commit `df4d9b11`. **That verdict was incorrect.**
> The package is actively consumed by runtime-core and is exercised by
> a dedicated test directory.

## Why this file exists (audit correction)

The 2026-08-25 audit (item #6.2) initially claimed this package had
"no production consumer". That claim was based on a search scoped to
`apps/web`, `apps/web-runtime`, `apps/cli`, and `packages/runtime-core/operations/`.
**The audit missed two real consumers:**

1. `packages/runtime-core/src/application/anchor-candidate-service.ts`
   imports `@masterpiece/creative-production-runtime/anchor-candidate.js`
   and `@masterpiece/creative-production-runtime/session.js`. This
   service is wired into `runtime-services.ts:97` and is part of the
   shipped runtime-core service graph.
2. `tests/packages/creative-production-runtime/*` contains 8 dedicated
   unit test files that import from this package directly.

When commit `bc52b992` (the F1 "remove from workspaces" attempt)
moved the package out of `packages/`, both consumers broke:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package
'@masterpiece/creative-production-runtime' imported from
D:\Masterpiece-OS\packages\runtime-core\src\application\anchor-candidate-service.ts
```

The move was rolled back. The package stays in `packages/` and remains
an active workspace member.

## What this package is

`@masterpiece/creative-production-runtime` exports the deterministic
Creative Production runtime: sessions, style profiles, visual canons,
generation series, anchor candidates, locked assets, revision assets,
generation blueprints, packaging translation, and visual memory. Its
`package.json` declares 10+ subpath exports. The `src/` directory ships
16+ files.

## What consumes it

| Consumer | Path | What it uses |
|---|---|---|
| `runtime-core` | `packages/runtime-core/src/application/anchor-candidate-service.ts` | `anchor-candidate.js`, `session.js` (`CREATIVE_WORKFLOW_STATES`) |
| `runtime-core` service graph | `packages/runtime-core/src/application/runtime-services.ts:97` | calls `createAnchorCandidateService(...)` which uses the package |
| `runtime-core` test | `tests/packages/runtime-core/runtime-services.test.js` | exercises the runtime-core service graph end-to-end |
| Tests | `tests/packages/creative-production-runtime/*` (8 files) | direct unit tests against the package's sub-modules |

## Forward guidance

- **Do not** treat this package as a candidate for removal from
  `workspaces/`. Removing it requires first refactoring
  `anchor-candidate-service.ts` to either inline the import or move the
  consumed modules into `@masterpiece/runtime-core` itself.
- A future cleanup **could** consolidate the
  `creative-production-runtime` concepts that overlap with
  `@masterpiece/creative-intelligence` (`visual-canon/`,
  `anchor-production/`, `direction-intelligence/`), but that is
  structural refactoring and must ship its own baseline-impact analysis.
- Adding a new import from `apps/` or `apps-web-runtime/` into this
  package is fine; the package is part of the live runtime surface.

## Audit references

- `docs/baseline/runtime-reconciliation-2026-08-25.md` (item #6.2;
  original claim, now corrected)
- Commit `df4d9b11` — first ARCHIVED.md (incorrect)
- Commit `bc52b992` (rolled back) — attempted removal; broke
  `anchor-candidate-service.ts`. The F1 attempt was undone and
  superseded by this correction.
- This file replaces the original ARCHIVED.md. The file path stays the
  same to preserve the audit trail; only the content is corrected.