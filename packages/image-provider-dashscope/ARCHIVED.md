# @masterpiece/image-provider-dashscope — ARCHIVED

> **Status (2026-08-25 audit)**: Legacy fallback, **disabled by default**.
> No production consumer in the current Web Runtime.

## Why this file exists

Internal audit (item #6.2) verified this `@masterpiece/image-provider-dashscope`
is **not imported by any active runtime path**:

- `apps/web/src/**` — 0 references
- `apps/web-runtime/src/**` — 0 references
- `apps/cli/src/**` — 0 references
- `packages/runtime-core/src/**` — 0 references
- `packages/image-generation-runtime/src/**` — 0 references

## What's in the package

The package description (see `package.json`) states it provides a
"DashScope wan2.7-image-pro image provider adapter: async submit / poll /
cancel, region+endpoint resolution, provider error normalization,
capabilities. No project context, no prompt decisions, no local file
structure."

It is consistent with a single-image, async-poll provider shape that
precedes the vNext Reference First baseline.

## Why it is not in the runtime

`CURRENT_BASELINE.md` §6 records:

> Legacy-compatible and disabled by default: DashScope Wan.

The current P0 baseline (`masterpiece-reference-first-stable-2026-08`)
ships **Seedream protocol** as the active Short-Chain generation
baseline (`seedream-5.0-pro` registry model). DashScope Wan is
preserved as a fallback reference but is not wired into any IPC
operation in the shipped runtime.

The optional env var `MASTERPIECE_DASHSCOPE_API_KEY` is recognized but
no current code path consumes it.

## Forward guidance

- **Do not import this package from new code** without also restoring
  the IPC operation that would surface it, plus the UI toggle that
  would let a user opt into the Wan fallback. Adding an import without
  those surfaces will reintroduce the dead-code condition this audit
  caught.
- If Wan is meant to remain a long-term fallback for users whose
  Seedream access is blocked, add the corresponding IPC operation +
  profile toggle to a roadmap entry, not silently through this
  package.
- Removal from `workspaces` is intentionally **not** part of this
  audit's cleanup scope. Doing so without a recorded decision would
  erase the audit trail.

## Audit references

- `docs/baseline/runtime-reconciliation-2026-08-25.md` (audit notes)
- `CURRENT_BASELINE.md` §6 (provider baseline; Wan listed as
  legacy-compatible, disabled by default)
- `CURRENT_BASELINE.md` §7 (configuration baseline; Wan env var listed
  but no current code path consumes it)