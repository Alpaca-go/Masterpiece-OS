# S5-F Desktop Build System Manifest

## Removed

- Electron Vite and renderer Vite configuration.
- Electron Builder portable distribution configuration.
- Desktop TypeScript configuration.
- Desktop packaging, development, smoke and historical local runner scripts.
- Desktop workspace README and all root `desktop:*` commands.

The one current offline A/B runner was moved in S5-A to
`scripts/image-generation/run-ab-smoke.mjs`; its root test was retargeted.

## Preserved

- `web:dev`, `web:build`, `web:typecheck`, `web:smoke` names and behavior.
- Evaluation and historical governance artifacts outside the Desktop
  workspace.
- No Web UI or script naming normalization was performed.

