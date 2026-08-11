# Archive Candidates — S0

## Result

```text
ARCHIVE_CANDIDATE count: 0
High confidence: 0
Medium confidence: 0
Low confidence: 0
```

No path met all five required conditions simultaneously:

1. no active runtime import;
2. no active dependency;
3. no current test dependency;
4. no dynamic-load/filesystem/CLI evidence;
5. explicit supersede or historical-value evidence.

This empty result is intentional and conservative. It is not permission to delete anything.

## Near-candidates retained as UNKNOWN

### `apps/desktop/scripts/space-r10-archive/`

- Family: R10/R11 acceptance utility scripts.
- Evidence: filenames/comments describe one-shot artifact binding/archive/closeout operations; Git history ties them to completed phases.
- Runtime imports: none found from current Web/Desktop entry.
- Test imports: none found.
- Dynamic dependency check: scripts themselves dynamically import compiler/integrity modules and are documented as direct `node ...` commands; absence from package scripts does not prove operators no longer invoke them.
- Historical value: strong.
- Risk: HIGH because they bind acceptance evidence and hashes.
- Confidence for archive: LOW; classification remains `UNKNOWN / KEEP` because manual CLI use cannot be excluded.

### `history/reviews/` and ignored local directories

- Family: local review/tool state.
- Runtime imports: none found.
- Test imports: none found.
- Dynamic dependency check: incomplete because ignored contents are outside the tracked repository contract.
- Historical value: unknown.
- Risk: MEDIUM.
- Confidence for archive: LOW; classification `UNKNOWN / KEEP`.

### Standalone historical-looking smoke runners

- Family: V6/V18/R8/R9/R10 smokes.
- Runtime imports: not production entrypoints.
- Test/package use: some are still wired to package scripts; others are executable manually and dynamically import current code.
- Historical value: strong.
- Risk: HIGH.
- Confidence for archive: LOW; grouped status is `TEST_DEPENDENCY` or `UNKNOWN`, never archive candidate.

## Already archived material

`docs/archive/v3.3` and `docs/archive/v4.0` are `HISTORICAL_REFERENCE`, not candidates awaiting an S0 action. S0 did not move or modify them.
