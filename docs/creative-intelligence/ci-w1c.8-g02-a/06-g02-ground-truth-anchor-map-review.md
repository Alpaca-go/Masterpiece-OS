# G02 Ground-Truth Anchor Map Review

An independent Ground-Truth Anchor Map cannot be truthfully constructed from this candidate because it is the frozen G01 source itself. Creating 8–16 entries would either copy G01 semantics or falsely describe identical material as an independent generalization target.

The machine-readable anchor-map envelope is therefore intentionally blocked:

- status: `BLOCKED_SOURCE_NOT_INDEPENDENT`;
- anchors: 0;
- humanReviewed: false;
- reviewStatus: `BLOCKED`;
- trace granularity: `section-level`;
- blocking gate: `G02SRC-05`.

No G01 claim ID, 12-key map, or expected wording was copied. A future independently selected candidate requires a new source-grounded map with unique IDs, section references, semantic expectations, materiality, applicability, epistemic expectations, reviewer notes, and actual human review PASS.
