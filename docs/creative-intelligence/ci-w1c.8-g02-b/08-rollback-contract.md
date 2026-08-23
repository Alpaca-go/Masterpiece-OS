# Rollback Contract

Any failed or aborted future attempt restores authorization state to `G02_PRELIVE_READY`. Partial live outputs are non-authoritative and cannot replace A.3 evidence or the Anchor Map.

Rollback must leave unchanged the frozen G01 baseline, all CI-W1C.8-G02-A.3 artifacts, the G02 Ground-Truth Anchor Map, and the document-role taxonomy. Cleanup of partial evidence must preserve the redacted failure ledger needed for audit.
