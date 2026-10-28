# P3-C1.1 Reference-First Packaging Translation Authority & Provenance Binding

Date: 2026-08-14
Branch: `codex/visual-analysis-a1-multi-provider`
Starting HEAD: `261883337b1ec3d8d125d4a69c325b5f1397c291`
Scope: audit-before-implementation; no C2 work
Decision: **HOLD — REFERENCE-FIRST UPSTREAM AUTHORITY GAP**

## A. Git

C1.1 starts from the completed C1 audit. P2 remains re-frozen at
`a593278b55e437fac59d768c5cee734d9a9fc201`; P3-A remains re-frozen at
`f95c145b9b1e37430ac68315c9e039f1f3262ae4`; P3-B remains accepted at
`2ac4cf1cc18156d1e4a508382b4563298d69c014`.

## B. C1 HOLD evidence

C1 established that analysis-led has a project-bound
`VisualDecisionPacket.mediaTranslations.packaging` and canonical
`packagingConcept`. Reference-first had a `ReferenceStyleCapsule` and generic
`anchorGoal`, but no Packaging-specific semantic output, source fingerprint,
active Reference run binding, or Packaging session relationship.

The C1 historical report is not rewritten. C1.1 audits whether the actual
Reference producer can close those gaps without downstream interpretation.

## C. Reference-first producer audit

The actual current producer is `createReferenceAnchorService`:

1. The user explicitly supplies `currentProjectId` and reference file paths.
2. The service reads the current project’s legacy `ProjectVisualContext` and
   optional resolved/document context.
3. Reference files are copied into
   `<dataRoot>/reference-runs/<runId>/input/reference-assets/`.
4. A temporary Project Store project is created from those files.
5. `pipeline.analyzeReferenceStyle` makes the workflow’s single model call.
6. That call returns `ReferenceStyleProfile` only.
7. `compileReferenceStyleCapsule` deterministically merges the generic style
   profile with current-project facts into `ReferenceStyleCapsule`.
8. Capsule, human-readable capsule Markdown, Anchor brief and run record are
   persisted under the Reference run.
9. The user may approve/reject that run through `setDecision`.

The one model pass analyzes reference visual relationships. Its prompt does
not receive the current project truth used later by the deterministic capsule
compiler and does not request `PackagingTranslationV2`.

## D. `ReferenceStyleCapsule` semantics

The capsule is the canonical generic Reference-style understanding. It owns:

- `sourceRunId`, `currentProjectId`, `generatedAt`;
- current-project facts and locked-fact references;
- inherited color, layout/typography, graphic, material/photography and
  extension mechanisms;
- user preference/avoidance;
- prohibited reference identity;
- warnings and uncertainties.

It is not a Packaging translation schema. It has no `packagingConcept`,
Packaging structure strategy, product/category role, information hierarchy,
substrate/craft language, Packaging logo policy, series architecture, or
Packaging misread risks.

## E. `anchorGoal` semantics

`anchorGoal` describes a generic Anchor Candidate direction and retains an
Anchor-workflow aspect ratio. It is compiled after the model call. It is not a
Packaging media decision and cannot be aliased to `packagingConcept`. Likewise,
the Reference image ratio cannot override frozen P2 Shot Contract geometry.

## F. Packaging-specific Translation producer

**No current production producer exists.**

The existing reference model pass sees the reference project, not the current
project truth required to make a project-bound Packaging decision. The later
deterministic capsule compiler has current-project facts but only generic
Reference style semantics. Producing a truthful `packagingConcept` and the
required Packaging structure/product evidence would require a deliberately
designed upstream semantic producer, not field relabelling.

Adding an LLM call when Packaging opens is prohibited. Adding deterministic
guessing in Workspace, the Node Web Host resolver, or P2 is also prohibited.

## G. `PackagingTranslationV2` reuse decision

Reuse: **YES as the target canonical semantic schema; NO current producer can
legally emit it.**

The schema already represents Packaging-specific concepts, structure,
opening, arrangement, graphics, information hierarchy, substrate, craft,
color, logo, series, photography and risks. There is no semantic reason to
create `ReferencePackagingTranslationV1` with copied fields.

Future analysis-led and reference-first producers should emit the same
`PackagingTranslationV2` fields. Producer provenance must remain outside that
value unless the shared contract is deliberately versioned, because the
current interface has no provenance member. Different producers must not
overwrite each other in a single unqualified slot.

## H. Project binding

Reference run records carry `projectId`; capsules carry `currentProjectId`.
`validateReferenceStyleCapsule` requires the field, and Quick Style Extraction
rejects a capsule whose project differs from the requested project. A future
Packaging handoff must repeat this fail-closed check even when run id and
fingerprint are otherwise valid.

## I. Source run identity

`ReferenceAnchorRun.id` is the producer-instance identity and
`ReferenceStyleCapsule.sourceRunId` binds the capsule to it. Consumers that
already use Reference Anchor, such as image-generation source bundles, require
an explicit `referenceAnchorRunId`. This is the correct identity pattern.

Packaging Workspace has no `referenceAnchorRunId`, and the current Packaging
truth resolver receives only `projectId`. It therefore cannot identify which
Reference run would own a reference-first Packaging translation.

## J. Source fingerprint / freshness

No canonical semantic Reference source fingerprint currently exists.

- copied Reference input files are not represented by persisted content hashes
  in the run or capsule;
- image-generation context loaders calculate file SHA-256 later for generation
  references, but that is a downstream load operation, not the producer’s
  semantic revision authority;
- `runId` identifies a producer instance;
- `generatedAt` is informational time;
- neither proves the precise semantic input revision;
- P2/P3-A generation fingerprints have a different downstream purpose.

A future producer-owned fingerprint would need stable current project id,
stable Reference asset content hashes/identities, translation contract version,
and the relevant upstream input revision. It must exclude credentials,
Provider response bodies, absolute paths, Packaging run ids, compiled prompts
and execution results.

## K. Active Reference source authority

No project-level single active Reference Anchor selection exists. Approval is
stored on each run independently; multiple runs can be approved. `listRuns`
sorts records for display, but “newest” is not an active semantic authority.
Quick Style Extraction consumes an explicitly supplied run id, and generation
source bundles also carry an explicit run id.

Packaging resolver must not call `listRuns`, sort by time, or pick a run. A
future upstream owner must provide an explicit selected run/source identity.
Workspace `generationMode` may select analysis-led versus reference-first, but
it does not select a Reference producer instance.

## L. Persistence

New Packaging Context Store: **NO**.

Reference outputs already have a canonical per-run persistence root and
Project Visual Context already has canonical project persistence. However,
Short-Chain Project Visual Context has one unqualified embedded
`visualDecisionPacket`; it cannot safely hold simultaneous analysis-led and
reference-first Packaging translations without overwriting provenance.

The future contract must deliberately add a multi-source/versioned upstream
slot or an explicit selected-source pointer. C1.1 does not invent that storage
semantic and does not create a binding database, mapping file, Packaging
Reference Store, or cache database.

## M. Mode independence

- analysis-led: independent and Packaging-complete today;
- reference-first: execution mode exists, but upstream Packaging semantics are
  not independently complete today.

The acceptance case “analysis-led context absent + valid reference-first
Packaging translation” cannot currently be constructed from production
authorities. This is a HOLD, not permission to fall back.

## N. No silent fallback

If reference-first is selected and its Packaging translation/source identity
is absent, the future handoff must fail closed. It must never use the
analysis-led translation, generic Anchor goal, image appearance, latest run, or
an inferred default.

## O. Locked Asset authority

Reference semantics cannot override brand, Logo, product identity, structure,
mandatory copy, or confirmed components. Existing Locked Assets remain the
only authority. Reference structural observations are evidence, not locked
project truth, and no Reference-over-Locked precedence is introduced.

## P. Shot Contract / aspect ratio authority

Frozen P2 Shot Contracts remain the only Packaging geometry authority. Capsule
aspect ratio is local to Anchor output. A 16:9 Reference does not change
`PKG-HERO-SINGLE` from 4:5. No reference-first Packaging translation may own
authoritative output ratio or `providerHints.aspectRatio`.

## Q. Reference assignment separation

Reference Translation source images and Packaging Workspace Reference rows are
different contracts. The former establish semantic provenance; the latter are
explicit user intent governed by frozen P2 roles/precedence. C1.1 adds no
automatic conversion or picker binding.

## R. Failure semantics

The future safe failure must be blocking and actionable when the selected mode
lacks a Packaging translation, source identity, project binding, approval, or
freshness evidence. It must expose neither filesystem paths nor Provider
payloads and must not trigger an analysis-led fallback. A concrete error code
belongs to the future implementation contract, not this audit.

## S. Cross-project protection

Run project id, capsule current project id, translation project binding and
Packaging session project id must all match. A valid run/fingerprint cannot
authorize Project A semantics for Project B. Existing Quick Style Extraction
already demonstrates this fail-closed pattern.

## T. Freshness / future STALE compatibility

The future handoff must include producer instance identity plus one canonical
semantic source revision. Unchanged source must remain stable; a new run or a
changed source revision must differ; a different project must be rejected.
That revision will enter the existing truth snapshot so P3-A’s current
fingerprint and `truth_surface_changed` STALE path can act. There will be no
Reference-specific stale machine.

## U. Changed production files

**0.** Audit-before-implementation stopped production work because three core
authorities remain missing: Packaging-specific producer, semantic source
fingerprint, and explicit active Reference source selection/persistence.

## V. Architecture guards

- AH-C1: 14/14 retained.
- AI Reference-first Packaging Handoff: 16/16 audit guards.

AI guards prove the semantic separation and frozen boundaries, including the
two explicit HOLD facts: the producer is not Packaging-complete and no reliable
semantic source fingerprint exists.

## W. Regression

- `npm test`: 1233/1233.
- `npm run runtime-application:test`: 1149/1149.
- `npm run runtime:test`: Runtime Core 14/14 plus Runtime Application
  1149/1149.
- `npm run test:image-generation`: 981/981, including frozen P2 geometry.
- `npm run cli:test`: 40/40.
- `npm run web:typecheck`: PASS.
- `npm run web:build`: PASS.
- `npm run web-runtime:typecheck`: PASS.
- `npm run web-runtime:test`: 4/4.
- `npm run web:smoke`: PASS; all runtime checks true, Provider calls 0,
  business writes 0, Electron/Desktop process count 0.
- `npm run repo:verify`: PASS.
- `npm run verify:current-flows`: PASS; run both inside `repo:verify` and
  explicitly afterward.
- `npm run verify:space-compiler-baseline`: PASS.
- `npm run verify:space-r8.6-golden-boundary`: PASS.
- Current Visual Analysis / Reference workflow gates are covered by the root,
  Runtime Application, current-flows and repository suites.

External Provider calls: **0**.

## X. Current frozen diff

- P2 current frozen Packaging production: 0 modifications.
- P3-A current frozen Workspace production: 0 modifications.
- P3-B accepted Packaging semantics: 0 modifications.

## Y. Verification

- Repository Contract, version consistency/naming, workspace boundaries,
  obsolete-code, production-boundary, tracked-asset, project-specific-rule,
  Golden-boundary, A4 and repository guard gates: PASS.
- AH-C1 targeted rerun: 14/14.
- AI targeted rerun: 16/16.
- Combined AH-C1 + AI targeted rerun: 30/30.
- `git diff --check`: PASS after final report update.

## Z. Working tree

Must be EMPTY at handoff.

## AA. Final decision

**HOLD — REFERENCE-FIRST UPSTREAM AUTHORITY GAP**

The specific gaps are:

1. the one upstream Reference model pass does not produce project-bound
   Packaging semantics;
2. there is no producer-owned semantic source fingerprint;
3. there is no explicit project-level active Reference source authority;
4. current Short-Chain persistence cannot preserve simultaneous producer
   translations without an explicit multi-source contract.

## AB. Recommended next scope

P3-C2 remains locked. The next corrective phase must first design and authorize
within the Reference-first upstream owner:

1. a combined project-truth + Reference-evidence Packaging semantic producer,
   preferably emitting canonical `PackagingTranslationV2` in the existing
   upstream reasoning pass;
2. producer-owned semantic source fingerprint inputs and version;
3. an explicit approved/selected Reference run authority, never “latest”;
4. a versioned multi-source Project Visual Context persistence contract that
   preserves analysis-led and reference-first results independently;
5. cross-project, approval, freshness and mode-independence tests.

Do not implement downstream Packaging interpretation, new stores, P2/P3-A
changes, UI changes, or a Packaging-entry model call.
