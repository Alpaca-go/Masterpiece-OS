# S3 Before / After Map

Metric scope: tracked paths outside `archive/` and `docs/archive/`. Version-named paths match a path segment beginning with `v`, `r`, `phase`, or `vnext` followed by a version-like suffix. Counts are informational and are not an acceptance target.

## Active Tree Before

- Version-named active files: 679
- Version-named active directories: 225
- Smoke-named active files: 59
- Evidence/snapshot-named active files: 39

## Active Tree After

- Version-named active files: 678
- Version-named active directories: 225
- Smoke-named active files: 59
- Evidence/snapshot-named active files: 39

The version-named file count decreased by one under this deliberately conservative metric. The four archived files are tracked separately below; reducing the metric was not used to justify the archive decision.

## Archive Movement

- Archived files: 4
- Archived directories: 1 coherent source directory
- Original: `apps/desktop/scripts/space-r10-archive/`
- Archived: `archive/legacy-entrypoints/space/r10-r11/`

No active runtime path, current test, package script, prompt, compiler, provider, schema, or Golden fixture was moved.
