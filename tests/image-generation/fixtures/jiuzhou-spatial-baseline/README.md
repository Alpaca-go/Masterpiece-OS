# Jiuzhou spatial baseline

This fixture freezes the sanitized, offline state before project Golden assets are
connected to the Short-Chain runtime.

- `analysis-output.json` records the reusable project signals available to the
  existing compiler.
- `spatial-foundation.json` records the large-space intent that later phases must
  preserve. The legacy runtime did not yet have preservation modes, so this file
  is a regression oracle rather than a legacy runtime input.
- `compiled-prompt.txt` captures the relevant pre-change prompt shape.

No client binary, provider response, credential, or generated deliverable is
stored here. The baseline was verified against commit `a7855e3` with the targeted
Short-Chain tests, workspace-boundary gate, and Golden-boundary gate.
