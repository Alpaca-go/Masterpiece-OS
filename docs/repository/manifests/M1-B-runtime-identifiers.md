# M1-B Manifest

Batch: M1-B  
Purpose: Stop newly generated historical-stage runtime IDs.

- Files modified: Continuation UI state and Short-Chain workspace; focused test.
- New-write behavior: `continuation-<timestamp>` replaces `r11-cont-<timestamp>`.
- Compatibility: existing `r11-cont-*` values remain opaque, readable lookup keys; no project rewrite.
- Runtime impact: ID spelling only; task persistence and lookup behavior unchanged.
- Verification: focused Continuation tests 9/9; runtime application 334/334; Golden 5/5.
- Rollback: restore ID factory/call site.
- Result: PASS.
