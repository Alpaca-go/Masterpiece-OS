# Restaurant Shadow Pipeline · offline contract 1.0

New exports appended to `index.js` extend the pure classifier without imports or
production registration. Its original implementation remains an exact unchanged
prefix. The dictionary, archetypes, conflict codes, candidate cards and prior
direction proposals retain their meaning and content.
Pass all data/resources explicitly. Neither public function reads files, stores,
global model settings, credentials, a UI, or a model. Returned drafts are detached
values, not saved directions or confirmations.

## Entry points and sources

`buildRestaurantBoundary({projectId, documents, initialBindings}, resources)`
receives no analysis Packet. Each document has a unique `id`, matching
`projectId`, `sourceType`, `verification`, `evidenceRef`, and JSON `data`.
Initial bindings specify `id`, `documentId`, an explicit safe `path` array, and a
dictionary `dimension`. Only `source_fact` / `verified_source` and
`user_confirmed_design_goal` / `confirmed_by_user` can support an initial
archetype. Historical/candidate sources are forbidden in this stage. Unverified,
missing or unmatched values remain unknown. Paths bind output evidence to the
actual input leaf; cuisine, location, price and efficiency imply no style,
materials, property details or customer demographics.

`runRestaurantShadowPipeline(input, resources)` calls that boundary first, then
reads `packet` (same project) and `analysisBindings`. A Packet requires a
`packetEvidenceRef`. Exact scalar aliases normalize directly; prose needs an
explicit `reviewedMapping` with matching project, `status: reviewed_offline`,
`expectedValue`, a known tag and an evidence reference. The complete source value
must match exactly. This mapping is supplied by the offline reviewer; it is not
NLP extraction or a validated model conclusion. All normalized Packet values,
including `projectFacts.*` marked confirmed inside that Packet, remain
`analysis_proposal` / probable here. Unbound prose is outside semantic review;
bound but unrecognized prose is review_required, never silently interpreted.

`resources` contains the original `dictionary`, `archetypes`, `knowledge`, plus
explicit shadow-only `tagExtensions`, `conflictPairs`, and `compatiblePairs`.
Extensions cannot replace existing tag definitions. Rules pair an independently
confirmed goal with an analysis proposal. Existing `auditConflicts` produces
RKS-CF-001..006; reviewer-supplied causal/replacement edges stay explicit.
Different tags alone are not incompatible. Matching/compatible annotations do
not promote analysis proposals to facts.

`verification` and mapping-review labels are caller attestations. The prototype
can validate project ownership and value/path correspondence; it cannot
authenticate a human, a document's truth, or an external confirmation service.
Future production integration must supply those assurances separately.

## Draft and candidate separation

`directionBindings` bind only verified user-goal document leaves to a small B1
field allowlist (`spatialConcept`, structure/function/visibility/composition
requirements, material/lighting language). Values are strings or arrays of
strings, formatted without semantic invention. Conflicting goal values for one
field are withheld for review; no last-write-wins. `b1Draft.fields` carries these
read-only, proposed values, source paths and evidence references. No confirmed
direction is read, replaced or saved. Optional `analysisFingerprint` is preserved
as caller-supplied, not authenticated by this pure module.

Knowledge must stay candidate/project_observation. Scope, source project,
applicable and excluded tags gate eligibility; foreign project knowledge is
withheld, including its material values. Non-local candidate generalizations are
withheld pending cross-project review. Prerequisites and exceptions remain
review_required, never presumed satisfied from a tag alone.

`knowledgeBindings` link an eligible knowledge ID to a historical/candidate
document explicitly carrying that ID and a field/value path. Their values appear
only in `candidateSuggestions`, with lifecycle/scope, prerequisites, exceptions,
source paths, and `automaticallyApplied: false`. They never overwrite goal fields
or become confirmed B1 values. An offline comparison may explicitly adopt a
candidate in a synthetic scenario, recording that separate choice; this is not
automatic knowledge wiring or a production confirmation.

## Output and limits

The result includes the initial classification, independently normalized
proposals, conflicts/alignments, knowledge applicability audit, suggestions,
unknowns and the proposed B1 envelope. Missing actual property/customer facts
stay unknown even when location/customer goals exist. `productionEnabled` and
`knowledgePromoted` remain false; image1 Run association remains undetermined.

The shadow core does not compile Prompts or change scene visibility. Test-only
comparison code calls existing B1/Short Chain/Seedream pure builders. The compiler
owns subtype scope: an entrance request cannot make a dining-only entity visible
by renaming its shot. Only existing input shot enums are used. Materials without
explicit reviewed material behavior stay candidate notes rather than gaining
invented optical/construction parameters.

Run the new tests from the repository root:

```powershell
node --import tsx --test packages/visual-workflow/tests/restaurant-knowledge/shadow*.test.ts
```

Regenerate only new synthetic shadow reports (never prior Golden/evidence):

```powershell
node --import tsx packages/visual-workflow/tests/restaurant-knowledge/shadow-evidence.ts
```
