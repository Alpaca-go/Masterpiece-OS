# P3-C2 Canonical Context Selection & Runtime Handoff

Date: 2026-08-14
Branch: `codex/visual-analysis-a1-multi-provider`
Starting / consumed HEAD: `5b3da1101e22f52b3124621c06cb9040fad01e03`
Scope: thin deterministic upstream selection, validation and truth projection; P3-C3 not started
Decision: **PASS — P3-C3 READY**

## A. Git

P3-C2 consumes the pushed C1.2 acceptance commit above. Implementation commit:
`3035ada`; Node strip-only compatibility correction: `a010687`; this report is
the documentation commit.

## B. C1.2 Baseline Consumed

C1/C1.1 established the missing authority requirements; C1.2 supplied the
independent `analysisLed` and `referenceFirst` slots, explicit project-level
active Reference pointer, producer run identity and semantic fingerprint.
P3-C2 reads those authorities without recreating them.

## C. Selector Owner

`@masterpiece/runtime-core/application/canonical-packaging-context-selector`
owns the host-neutral Packaging handoff. The Node composition root only reads
the existing authorities and calls this selector/projector.

## D. generationMode Authority

`Workspace intent.generationMode` remains the sole mode authority. No
`contextMode`, producer preference, fallback mode or second selector field was
added.

## E. analysis_led Selection

`analysis_led` reads only `packagingTranslations.analysisLed`, then validates
context/source project binding, provenance, source kind and ready
`PackagingTranslationV2`. A missing analysis slot fails closed.

## F. reference_first Selection

`reference_first` reads only `packagingTranslations.referenceFirst`. It does
not inspect analysis-led output and cannot fall back to it.

## G. Active Reference Validation

Reference-first requires `ProjectRecord.activeReferenceSource` with canonical
schema, project id, run id, source fingerprint and selection time. Absence,
revocation or incomplete provenance fails closed before Prepare.

## H. Source Run Validation

The selected Reference producer `producerRunId` must equal the explicit active
run id. Run identity remains execution provenance and is not projected into the
semantic truth fingerprint.

## I. Fingerprint Validation

The selected Reference source fingerprint must equal the active pointer
fingerprint. P3-C2 only compares the producer-owned value; it never computes or
repairs a fingerprint.

## J. Project Binding

Workspace/session project id, Project Visual Context project id, selected
source project id and (Reference-only) active source project id must match.

## K. Cross-project Protection

Project mismatch is checked independently of run id and fingerprint, so a valid
fingerprint cannot authorize Project A truth in a Project B Workspace.

## L. PackagingTranslationV2 Projection

The selector validates and returns the canonical translation only. It does not
pass a Visual Decision Packet, Reference capsule, images, raw response, prompt
or run metadata bundle into Packaging.

## M. Truth Snapshot Projection

The projector fills the existing A11 `projectVisualContext.packageStructures`
and `packagingConcept` fields. It additionally carries `sourceKind` and
`sourceFingerprint` inside that existing truth surface for the existing stable
truth comparison. No second context object is created.

## N. Locked Assets Authority

Locked truth is still resolved independently by `LockedAssetsService` in the
Node composition root. Selected visual translation neither supplies nor
overrides Locked Assets.

## O. Shot Contract Authority

No ratio, provider hint or model field exists in the selector/projector. P2
Shot Contract remains the only output geometry authority.

## P. No Silent Fallback

Missing selected slot, active source, valid provenance or ready translation is
an application error. Neither mode reads the other slot.

## Q. No Runtime Reasoning

The handoff imports no reasoner, prompt, analysis model or Reference producer.
All creative semantics already exist upstream.

## R. No Run Discovery

The selector does not call `listRuns`, scan files, sort timestamps or infer a
latest run. It validates only the explicit project pointer supplied to it.

## S. No New Store

No handoff cache, selected-context file, database, browser storage or third
canonical copy was introduced. Projection remains derived runtime state.

## T. Failure Semantics

Safe fail-closed codes cover unsupported mode, unavailable analysis/reference
slot, missing active source, project mismatch, invalid provenance, source-kind
mismatch, invalid translation, run mismatch and fingerprint mismatch. Messages
contain no paths, credentials or Provider payload.

## U. analysis_led READY Evidence

AK-19 exercises Local RPC operations, mode-aware truth resolution, the
analysis-led slot, selector/projector, existing Workspace truthSnapshot and the
real P2 Prepare path. Result: `READY`.

## V. reference_first READY Evidence

AK-20 exercises the same production-like chain with only the Reference slot
selected plus explicit active run/fingerprint validation. Result: `READY`.

## W. Both-producer Coexistence

AK-02/03/21 prove both slots can coexist and the result changes only with
`generationMode`, never update order or producer recency.

## X. STALE Integration

Prepare re-resolves canonical truth before compilation so cached truth cannot
survive mode/source drift. Translation, active source or fingerprint changes
flow through the existing P3-A truth fingerprint to
`truth_surface_changed`. A mode edit continues through existing
`intent_changed`. No new tracker or manual state transition exists.

## Y. Same-source Re-run Semantics

The truth projection excludes `producerRunId`. Two runs with identical
translation and source fingerprint therefore retain the same truth surface and
do not produce false semantic STALE; run binding is still validated before
projection.

## Z. Changed Production Files

- shared Runtime selector/projector and public export;
- existing Packaging RPC operation bridge, only to pass current mode and
  re-resolve before Prepare;
- Node Runtime truth composition seam.

P2, P3-A application modules, Packaging UI and Reference producer reasoning
are unchanged.

## AA. Architecture Guards

- AH-C1: 14/14;
- AI-C1.1: 16/16;
- AJ-C1.2: 29/29;
- AK-C2: 29/29;
- combined C1 authority guards: 59/59.

## AB. Full Regression

- root public contracts: 1233/1233;
- Runtime Core/Application: 14/14 and 1207/1207;
- image generation: 981/981;
- CLI: 40/40;
- P2 geometry: 37/37;
- Reference workflow/authority: 52/52;
- Visual Analysis: 10/10;
- analysis Provider contracts: 32/32;
- Web typecheck and production build: PASS;
- Node Web Host typecheck and tests: PASS, 4/4;
- browser smoke: PASS, Provider calls 0, business writes 0,
  Electron/Desktop processes 0;
- `repo:verify`, `repo:check` and `verify:current-flows`: PASS;
- space compiler and R8.6 Golden boundary: PASS, 0 failures.

## AC. Golden / Provider Calls

Golden regression: 5/5 PASS. Provider calls: 0. Golden auto-update: NO.

## AD. Frozen Diff

- P2 current Packaging production: 0 changes;
- P3-A current Workspace production: 0 changes;
- P3-B accepted UI, Workspace state machine and public RPC surface semantics:
  0 changes. The already-authorized C2 runtime handoff internals are the only
  bridge delta.

## AE. Verification

All required phase, repository, boundary, build, smoke and Golden gates passed
from the committed tree. `verify:current-flows` completed without external API
calls.

## AF. Working Tree

Must be empty at handoff.

## AG. Final Decision

**PASS — P3-C3 READY**

P3-C2 selection, validation and runtime handoff criteria are satisfied. This
decision does not start P3-C3.

## AH. Recommended P3-C3 Scope

P3-C3 should consume the now-selected truth through the existing production
flow only. It must not add producer interpretation, run discovery, fingerprint
ownership, alternate mode authority, a new store, a new stale tracker, Shot
Contract overrides or Locked Asset precedence.
