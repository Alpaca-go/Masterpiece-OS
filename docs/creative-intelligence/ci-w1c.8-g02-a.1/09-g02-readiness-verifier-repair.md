# G02 Readiness Verifier Repair

`verify:g02-source-readiness` is now generic and data-driven. It reads the current identity artifact, current anchor map and frozen G01 manifest. It no longer requires a candidate SHA to equal G01 and no longer prints a constant HOLD verdict.

Dynamic precedence is boundary HOLD, replacement-source HOLD, document-role HOLD, anchor HOLD, then READY. `VERIFIER-01..06` use synthetic fixtures for collision, independent source, valid anchors, invalid anchors, candidate-hardcode absence and computed-verdict variation.

The repaired verifier correctly computes the current artifact as `HOLD_FOR_G02_DOCUMENT_ROLE_REPAIR`.
