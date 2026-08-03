# Jiuzhou Aesthetics spatial Golden assets

Version: `1.0`

This directory contains the human-readable source standards for the Jiuzhou
Aesthetics spatial-image workflow.

- `golden-prompt-v1.0.md` is the audited source for generation-side project
  rules. Runtime code must use a structured Project Visual Canon instead of
  appending this document verbatim.
- `golden-acceptance-standard-v1.0.md` is the audited source for the project
  evaluator. It must never be injected into a generation prompt.
- Image anchors live under
  `assets/golden-references/spatial/jiuzhou-aesthetics/` and are project-scoped
  calibration evidence, not layout or spatial-scale templates.

## Checksums

| Asset | SHA-256 |
|---|---|
| `golden-prompt-v1.0.md` | `95e63acecc21c03a134eafff14c9961f002b49b7ca3d6d43b0fc7a6828b93310` |
| `golden-acceptance-standard-v1.0.md` | `aed2752163e6ac4d0f5c015d62d9419763b157b3082606a3d678c8ee6fdc5f20` |
| `JZMX-SGR-01-Exterior.png` | `ef124d2aa23835eb1d64eb28fd18548c451181894b77a017e205374e80d093b6` |
| `JZMX-SGR-02-Reception.png` | `7cf89a3edc69f87487c0123f3238091137e5ec98ca848364e6f96eb45ec4ba51` |
| `calibration-development-v1.1.md` | `a000c5f48564d4bf4597eab722564e0289c774516e0f7ac7e7fe465a0675a2d2` |
| `calibration-development-v1.0-architecture-backup.md` | `48a5cb06cd878e2659c957e22fb1e5ab503e3632d246eb0a3e2260743466cfb6` |

The checksums cover the original user-provided content after stable renaming.
Changing an asset requires a new version or an explicit checksum update.
