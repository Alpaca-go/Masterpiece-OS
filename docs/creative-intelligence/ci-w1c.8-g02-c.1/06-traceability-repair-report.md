# Traceability repair report

The repaired closed loop is:

`Strategic field.planningClaimRefs → runtime Planning claimId → sourceDocumentId/chunkRefs → human-reviewed Ground-Truth Anchor planningClaimRefs/sourceReference`.

The model-emitted Strategic source map remains an audit copy and cannot authorize references. Runtime Planning claims and runtime anchor bindings are authority. The retention report records retained Planning refs per anchor, missing CRITICAL/IMPORTANT IDs, exact ratios, and source references.

Offline tests prove a retained anchor resolves through a runtime Planning claim to a source reference and that a missing CRITICAL binding hard-fails.
