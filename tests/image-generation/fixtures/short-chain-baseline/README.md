# Short-Chain image-generation baseline

This directory freezes the pre-Short-Chain comparison set without committing client
assets or local project deliverables.

- `legacy-problems.json` records the failure modes the legacy path must preserve
  for A/B comparison.
- `project-matrix.json` defines four deliberately different project archetypes
  and their expected deliverables.
- `aesthetic-space-prompt.md` preserves the reusable professional structure of
  the successful reception-space prompt. Project-specific values are sanitized.

Phase 0 keeps `legacy` as the default pipeline. Later phases may opt into
`short-chain`; Phase 5 is responsible for changing the default only after regression
checks pass.
