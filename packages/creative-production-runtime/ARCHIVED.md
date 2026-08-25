# @masterpiece/creative-production-runtime — ARCHIVED

> **Status (2026-08-25 audit)**: No production consumer. Retained as
> `workspaces` member for historical reference only.

## Why this file exists

Internal audit (item #6.2) verified this `@masterpiece/creative-production-runtime`
is **not imported by any active runtime path**:

- `apps/web/src/**` — 0 references
- `apps/web-runtime/src/**` — 0 references
- `apps/cli/src/**` — 0 references
- `packages/runtime-core/src/**` — 0 references

## What's in the package

The package exports sub-modules covering a wide surface area: session,
style-profile, locked-assets, anchor-candidate, visual-canon,
generation-prompt, creative-reading, creative-direction,
generation-series, revision-assets. Its `package.json` declares
10+ subpath exports, but the consumer side is empty.

The `src/` directory ships 12+ files (`session.js`, `style-profile.js`,
`locked-assets.js`, `anchor-candidate.js`, `visual-canon.js`,
`generation-prompt.js`, `creative-reading.js`, `creative-direction.js`,
`generation-series.js`, `revision-assets.js`, plus an `index.js`).

## Why it is not in the runtime

The P0 baseline ships its creative-production semantics through
`@masterpiece/creative-intelligence` (which IS consumed). The
`creative-production-runtime` package appears to be a **parallel /
alternative implementation** of concepts that already live in
`creative-intelligence` under `visual-canon`, `anchor-production`,
`direction-intelligence`, etc. Two implementations of overlapping
concepts is structural debt, even when one is dormant.

## Forward guidance

- **Do not import this package from new code** without first
  consolidating its semantics into `@masterpiece/creative-intelligence`
  or vice versa. Two implementations of the same concept invite
  behavior drift.
- If the package is intentionally preserved for a future surface,
  add a note to `CURRENT_BASELINE.md` §2 or a new §12 explaining
  what that surface is and why it is not yet wired.
- Removal from `workspaces` is intentionally **not** part of this
  audit's cleanup scope. Doing so without a recorded decision would
  erase the audit trail.

## Audit references

- `docs/baseline/runtime-reconciliation-2026-08-25.md` (audit notes)
- `packages/creative-intelligence/src/index.ts` (live consumer
  of equivalent concepts)