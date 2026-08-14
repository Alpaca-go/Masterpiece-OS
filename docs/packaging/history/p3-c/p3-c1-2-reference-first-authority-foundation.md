# P3-C1.2 Reference-First Active Source & Multi-Producer Packaging Context Foundation

Date: 2026-08-14
Branch: `codex/visual-analysis-a1-multi-provider`
Starting HEAD: `3335d2f630d963e2837ffa6832524bc1d308ff46`
Scope: upstream Reference/project-context foundation only; P3-C2 not started
Decision: **PASS — P3-C2 READY**

## A. Git

P3-C1.2 starts from the C1.1 HOLD audit. P2 remains re-frozen at
`a593278b55e437fac59d768c5cee734d9a9fc201`; P3-A remains re-frozen at
`f95c145b9b1e37430ac68315c9e039f1f3262ae4`; P3-B remains accepted at
`2ac4cf1cc18156d1e4a508382b4563298d69c014`.

## B. C1/C1.1 gap closure

The five recorded gaps are closed at their upstream owners:

1. the Reference producer now emits project-bound `PackagingTranslationV2`;
2. `anchorGoal` remains a separate generic Anchor contract;
3. the Reference producer owns a deterministic semantic source fingerprint;
4. Project metadata owns an explicit active Reference source pointer;
5. Project Visual Context preserves independent analysis-led and
   reference-first Packaging translation slots.

No downstream Packaging selection or projection was implemented.

## C. Reference producer

The existing `analyzeReferenceStyle` structured reasoning stage remains the
single model-call authority. Its one response now contains two siblings:

- `referenceStyleProfile`, still normalized as the existing generic style
  profile;
- `packagingTranslation`, normalized through the same canonical
  `PackagingTranslationV2` contract used by analysis-led.

The request receives current-project identity, products, touchpoints, real
Packaging structures, Locked facts and Logo lock state plus the Reference
visual attachments. It does not read analysis-led Packaging output.

## D. `PackagingTranslationV2` producer support

Reuse: **YES**.

`packaging-translation-contract.ts` is the shared normalization boundary.
Analysis-led delegates its existing normalization to that helper, preserving
current behavior. Reference-first uses the same helper for the composite model
response. No `ReferencePackagingTranslationV1` duplicate exists.

The producer rejects invented Locked structures, reference identity leakage,
and a Packaging concept equal to `anchorGoal`.

## E. Active Reference source authority

Owner: **Reference workflow persisted in existing Project metadata**.

`ProjectRecord.activeReferenceSource` records project id, selected run id,
source fingerprint and selection time. Approval is an explicit selection.
`setActiveSource` permits explicit re-selection of another approved run.
Editing an approved run, rejecting it or deleting it revokes the selection.

## F. Latest-run behavior

**FORBIDDEN.**

`listRuns` remains a display list only. Starting a newer run does not change
the active source. No timestamp sort, newest filesystem entry or first result
can authorize a handoff.

## G. Project binding

The run, producer output envelope, active pointer and Project Visual Context
slot all carry the same project id. Each boundary validates that binding.

## H. Cross-project protection

Selecting a Project A run for Project B fails with
`REFERENCE_ACTIVE_SOURCE_PROJECT_MISMATCH`. A valid run id or fingerprint does
not bypass the project check.

## I. Source run identity

`ReferenceAnchorRun.id` and `PackagingTranslationSource.producerRunId` identify
the producer execution instance. Every current Reference Packaging output
requires this identity.

## J. Source fingerprint

`computeReferencePackagingSourceFingerprint` is owned by the Reference
producer. It describes the semantic input revision, not the output-generation
request and not the Packaging compilation.

## K. Fingerprint inputs

The fingerprint contains only:

- Reference Packaging producer contract version;
- project id and normalized current-project semantic input;
- stable Reference asset content hashes, deduplicated and sorted.

It excludes run id, timestamps, absolute paths, credentials, Provider raw
responses, Packaging run ids, prompts and downstream artifacts.

## L. Fingerprint determinism

The same project semantics and Reference asset content produce the same
fingerprint regardless of asset hash ordering. Changed asset content changes
the fingerprint. No random value or wall-clock time enters the calculation.

## M. Run id versus fingerprint semantics

- run id: producer execution instance;
- source fingerprint: semantic input revision/freshness evidence;
- `selectedAt` / `generatedAt`: audit/display time.

Two reruns of the same source have different run ids and the same source
fingerprint.

## N. Multi-producer Project Visual Context

The additive `packagingTranslations` member contains independent
`analysisLed` and `referenceFirst` slots. Each slot is a
`PackagingTranslationSource` provenance envelope containing the canonical
translation, source kind, project id, run identity when available, fingerprint
and generation time.

Updating Reference only replaces `referenceFirst`; updating analysis only
replaces `analysisLed`.

## O. analysis-led coexistence

Existing `VisualDecisionPacket.mediaTranslations.packaging` is projected into
the `analysisLed` slot. Reference insertion never overwrites it. Analysis-led
continues to work when Reference is absent.

## P. reference-first independence

A Project Visual Context with no analysis-led Packaging slot can accept a valid
active Reference output and retain a complete `referenceFirst` slot. No
analysis-led fallback or source read is involved.

## Q. Legacy compatibility

Persisted Short-Chain schema 2.0 contexts remain readable because the new
members are optional. Migration derives `analysisLed` only when a real Visual
Decision Packet exists and never fabricates `referenceFirst`.

## R. Persistence

New Packaging Context Store: **NO**.

- producer output: existing `reference-runs/<runId>/outputs/` root;
- active selection: existing Project metadata;
- multi-producer semantics: existing Short-Chain Project Visual Context.

No database, binding store, Packaging cache or browser storage was added.

## S. Failure semantics

The upstream authority fails closed for absent active source, missing run,
unapproved run, project mismatch, invalid provenance, fingerprint mismatch,
Packaging-insufficient translation, schema mismatch and deleted/edited active
sources. It does not use `anchorGoal`, analysis-led fallback or latest-run
selection.

## T. Locked Assets authority

Locked Assets remain project truth. Reference output is translation semantics,
not a replacement authority. The producer rejects any `locked: true` structure
that is not locked by current-project truth.

## U. Shot Contract authority

P2 Shot Contract remains the only output geometry authority. The new Reference
producer input, output envelope and translation add no authoritative
`aspectRatio` or `providerHints`.

## V. Reference assignment separation

Reference semantic source assets are not Packaging Workspace Reference rows.
No automatic assignment, picker import or UI binding was added.

## W. Changed production files

Changes are limited to:

- canonical shared contracts and Packaging translation normalization;
- Reference prompt/parser/service and producer fingerprint helper;
- Project Visual Context builder/service and existing Project metadata.

Packaging Workspace, Packaging resolver, Packaging UI/RPC, P2, P3-A and P3-B
accepted production surfaces are unchanged.

## X. Architecture guards

- AH-C1: 14/14.
- AI-C1.1: 16/16.
- AJ-C1.2: 29/29 (`AJ-01`–`AJ-20` plus nine contract cases).

## Y. Reference workflow regression

Reference workflow and combined AH/AI/AJ targeted suites: PASS. The dedicated
authority suites total 59/59 (AH 14, AI 16, AJ 29); the broader targeted
Reference/Packaging group totals 82/82.

## Z. Full regression

- root public contracts: 1233/1233;
- Runtime Core/Application: 14/14 and 1178/1178;
- image generation: 981/981;
- CLI: 40/40;
- Web typecheck and production build: PASS;
- Node Web Host typecheck and tests: PASS, 4/4;
- browser smoke: PASS, Provider calls 0, business writes 0,
  Electron/Desktop processes 0.

External Provider calls: 0.

## AA. Frozen diff

- P2 current Packaging production: 0 modifications.
- P3-A current Workspace production: 0 modifications.
- P3-B accepted Packaging semantics: 0 modifications.

## AB. Verification

- `repo:verify`: PASS, including repository contract, version, workspace,
  production, Golden, A4 and current-flow guards;
- `verify:current-flows`: PASS without external API calls;
- `verify:space-compiler-baseline`: PASS, 0 failures;
- `verify:space-r8.6-golden-boundary`: PASS, 0 failures;
- P2/P3-A/P3-B frozen diffs: empty.

## AC. Working tree

Must be EMPTY at handoff.

## AD. Final decision

**PASS — P3-C2 READY**

All C1.2 foundation success criteria are satisfied upstream. This decision does
not start P3-C2.

## AE. Recommended P3-C2 scope

P3-C2 should only:

1. read `generationMode`;
2. select the matching canonical producer slot;
3. validate project binding and active Reference source/fingerprint;
4. project the selected `PackagingTranslationV2` into the existing truth
   snapshot;
5. rely on the existing truth-surface fingerprint and STALE mechanism.

It must not discover runs, select latest, reason over `ReferenceStyleCapsule`,
call a model, generate fingerprints, reinterpret `anchorGoal`, create a store,
or import Reference source images as Packaging assignments.
