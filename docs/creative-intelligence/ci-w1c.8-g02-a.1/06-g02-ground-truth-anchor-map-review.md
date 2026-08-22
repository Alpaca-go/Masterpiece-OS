# G02 Ground-Truth Anchor Map Review

No independent anchor map was approved.

- Anchor count: 0
- Human reviewed: false
- Review status: `BLOCKED`
- Blocking gate: `G02ROLE-02`

Although the replacement is independent from G01, an `UNKNOWN_SOURCE` cannot become the Planning carrier. Authoring anchors and marking them human-reviewed PASS would create an invalid qualification target. The machine-readable envelope preserves this fail-closed state without copying G01 keys or claim IDs.
