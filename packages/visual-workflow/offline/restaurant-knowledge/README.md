# Restaurant knowledge — offline research prototype

This directory is owned by the independent visual workflow, but has no production
import, RPC, UI, provider, database or project-store registration. It is outside
`src/` deliberately: the package's production integrity manifest must not be
changed for this unintegrated experiment. Production implementations and their
digests remain unchanged. This is not a second production authority.

`index.js` is a pure structured-annotation API. Pass the JSON dictionary and
archetypes explicitly to `classify(input, dictionary, archetypes)`. Each claim
requires identity, project ownership, dimension, tag, sourceType, status,
assertion, evidenceRefs, scope and appliesTo. Synonyms are exact normalized
matches, not substring inference. Unknown terms stay unknown; missing dimensions
are listed. Multiple supported archetypes remain ambiguous. No cuisine implies
a style, no street location implies rustic materials, and efficiency can coexist
with a neighborhood restaurant.

`auditConflicts(classification, annotations)` accepts reviewer-supplied causal
edges (`inferences`), incompatible claim-ID pairs (`incompatibilities`), knowledge
applications and proposed replacements. It does not extract those relationships
from natural language. Both sides and their evidence remain in the diagnostic;
user goals take precedence over conflicting AI proposals without rewriting
facts. Fact/goal disagreement requires review. Diagnostics are not negative
prompts or automatic edits. Caller-supplied evidence references remain assertions
until a reviewer verifies the source; the prototype cannot authenticate them.

`validateKnowledge` checks local research record structure; it neither promotes
knowledge nor changes persisted production schemas. `compareDirections` requires
matching project/controls and an unconfirmed offline proposal. No API writes to
another project or fetches global knowledge.

Run from the repository root:

```powershell
node --import tsx --test packages/visual-workflow/tests/restaurant-knowledge/*.test.js packages/visual-workflow/tests/restaurant-knowledge/*.test.ts
```

To regenerate the **synthetic-only** compiler diagnostic, set
`RKS_COMPILE_EVIDENCE=1` for the compile test. A passing diagnostic harness does
not mean field preservation passed: inspect `semanticStatus` and `fieldChecks`
in `reports/restaurant-knowledge/offline-compile-comparison.json`. The current
experiment reports `blocked_field_loss`; compiler repair is outside this task.

The FTT data stays in reports, never in the classifier. Six reproducible cases
live in `tests/restaurant-knowledge/cases.json`. No original Packet, Golden,
confirmed direction, integrity manifest or runtime entry is edited.
