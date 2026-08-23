# Anchor retention policy

Retention is deterministic. A Ground-Truth Anchor is retained only when the Strategic artifact cites at least one runtime Planning claim explicitly bound to that anchor.

- CRITICAL: 100% required. Any missing CRITICAL anchor blocks with `ANCHOR_RETENTION_CRITICAL_MISSING` and yields `HOLD_FOR_ANCHOR_RETENTION_FAILURE` at qualification policy level.
- IMPORTANT: target at least 80%. The ratio and missing IDs are recorded diagnostically and do not independently block.
- Invalid map or unresolved Planning binding: hard block `ANCHOR_MAP_INVALID`.

This gate is separate from frozen SG-01/11/12/13/14/15; no G01 SG-set mutation occurs.
