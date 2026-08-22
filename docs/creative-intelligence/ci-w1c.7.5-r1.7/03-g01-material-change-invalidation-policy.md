# G01 Material-Change Invalidation Policy

## State model

The review states are `FROZEN`, `INVALIDATION_REVIEW_REQUIRED`, and `SUPERSEDED`. R1.7 creates only `FROZEN`. A normal Git diff never changes state automatically.

## Material changes

Each of the following requires an explicit G01 baseline invalidation review:

- Planning schema or canonical PlanningClaimKeys semantics;
- Planning carrier or structured-coverage/Narrative-fallback decision semantics;
- epistemic classifier, confidence provenance, or source-faithfulness semantics;
- Strategic synthesis schema or accepted-artifact semantics;
- SG-01/11/12/13/14/15 gate semantics;
- four-domain source authority or exact-mirror semantics;
- traceability hard acceptance rules;
- Human Review applicability or thresholds;
- timeout authority or retry-state-machine semantics;
- default Provider/model family material behavior;
- `stopAfter` or stage-scope semantics;
- breaking evidence schema or Provider ledger changes.

The required action is an invalidation review, not an automatic G01 rerun. Reopening live G01 qualification additionally requires a material production architecture change and explicit authorization. Attempt 6 remains unauthorized.

## Non-material examples

The following do not automatically invalidate the baseline when semantics are preserved:

- documentation typo or report formatting;
- unrelated UI or generator work;
- test refactoring with identical behavior;
- non-semantic comments;
- deterministic verifier/report presentation changes that leave the manifest contract unchanged.

## Review outcome

The reviewer must identify the changed contract, compare it with the frozen manifest, record whether qualification evidence remains applicable, and explicitly choose to retain `FROZEN`, move to `INVALIDATION_REVIEW_REQUIRED`, or establish a separately authorized successor that marks this baseline `SUPERSEDED`. No automated tool may silently update the fingerprint, Golden evidence, or state.
