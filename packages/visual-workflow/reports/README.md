# Reports

This directory now contains only **live test fixtures**:

| Path | Used by |
|---|---|
| `prompt-budget/` | `tests/methodology/acceptance.test.mjs` (historical prompt hashes) |
| `design-direction-editor/` | `tests/architectural-language.test.ts` (standard industry regression baseline) |
| `jiuzhou-art-direction/` | `tests/art-direction-business-fixture.ts` (project input fixture) |
| `compiler-integrity-review.json` | `tests/audit-compiler-integrity.mjs` |

## Historical reports moved out

The phase/release-numbered report set (`p7-*`, `p7b-*`, `fig2-fig3-*`, `architectural-*`, `jiuzhou-*`, `commercial-*`, `rks-*`, the root `*-review.md` / `*.diff` files, etc.) was moved out of the repository on 2026-10-28 to keep the main tree free of accumulating version numbers.

- Local archive: `E:\Masterpiece-OS-Archive-2026-10\visual-workflow-reports\` (outside the repository, structure preserved).
- Git history: the files remain reachable at commit `93bf83e6` and earlier; nothing was rewritten.
- The `p7a-prompt-budget` directory was renamed to `prompt-budget` because it is a live fixture; its file contents and hashes are unchanged.

## Naming rule for new reports

- Do not create new `p7`, `r10`, `S4`, `M1` style path names. Use the capability or decision name (`prompt-budget`, `spatial-layout`, `scene-authority`).
- Keep only fixtures and currently referenced evidence in this directory. Historical write-ups belong in `docs/` or the external archive.
