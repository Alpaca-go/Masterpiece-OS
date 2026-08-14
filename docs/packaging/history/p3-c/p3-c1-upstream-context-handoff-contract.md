# P3-C1 Upstream Context Handoff Contract

Date: 2026-08-14  
Branch: `codex/visual-analysis-a1-multi-provider`  
Scope: architecture audit and conceptual contract only  
Decision: **HOLD — UPSTREAM HANDOFF CONTRACT GAP**

## 1. Current architecture

The production chain is:

`Project Store / Locked Assets / Visual Analysis / Reference Anchor`
→ `ProjectVisualContextShortChain or ReferenceStyleCapsule`
→ `apps/web-runtime/src/current-operation-graph.ts::resolveTruthSnapshot`
→ P3-A Packaging Workspace truth snapshot
→ P3-A deterministic translation projection
→ frozen P2 Packaging Translation / Compiler / execution.

`ProjectVisualContextShortChain` is persisted at
`<projectRoot>/project-context/project-visual-context.vnext.json`. Its filename,
status, version, and last-built time are recorded on `ProjectRecord`. Locked
Assets are independently persisted under `<projectRoot>/locked-assets/`.
Reference Anchor runs are independently persisted under
`<dataRoot>/reference-runs/<runId>/` and expose a structured
`ReferenceStyleCapsule` plus a human-readable brief.

The Packaging Workspace remains an in-memory intent/state machine. Project
context is project/creative truth, not a second Workspace and never owns
READY, STALE, EXECUTING, retry, reset, run, or result state.

## 2. Upstream authority inventory

| Truth / semantic | Canonical owner and production type | Current storage / resolver | Packaging mode | Requirement |
|---|---|---|---|---|
| project id/name | Project Store, `ProjectRecord` | `project.json`; `projects.get` | both | required |
| brand name / industry | Project Store hard facts; `ProjectRecord` | `project.json`; `projects.get` | both | required when locked/known |
| brand role | Visual Analysis, `VisualDecisionPacket.projectFacts.brandRole` | Short-Chain context | analysis-led | optional; never inferred by handoff |
| logo/product/category/mandatory copy/confirmed components | Locked Assets, `LockedAsset[]` | `locked-assets/index.json` + item files; `lockedAssets.list` | both | required according to frozen P2 validation |
| packaging form factor | Locked Assets `packaging_structure` | `lockedAssets.list` | both | required |
| structure evidence | Visual Analysis `PackagingTranslationV2.structureStrategy[].evidenceRefs` and Short-Chain `lockedAssets.packageStructures` | Short-Chain context | analysis-led | required where structure is claimed |
| Packaging visual direction | `PackagingTranslationV2.packagingConcept` | `VisualDecisionPacket.mediaTranslations.packaging` inside Short-Chain context | analysis-led | required |
| creative decision | `VisualDecisionPacket.creativeDecision` | Short-Chain context | analysis-led | upstream canonical, not projected wholesale |
| visual identity | `ProjectVisualContextShortChain.visualIdentity` | Short-Chain context | analysis-led | optional |
| color | `PackagingTranslationV2.colorBehavior`; supplemental `visualIdentity.colorBehavior` | Short-Chain context | analysis-led | optional |
| graphic/motif | `PackagingTranslationV2.graphicTranslation`; supplemental `visualIdentity.graphicBehavior` | Short-Chain context | analysis-led | optional |
| material/craft | `PackagingTranslationV2.substrateLanguage` / `craftLanguage`; supplemental `visualIdentity.materialBehavior` | Short-Chain context | analysis-led | optional |
| composition | `visualIdentity.compositionBehavior`; reference capsule `layoutAndTypography` | Short-Chain / Reference Anchor | mode-specific | optional |
| lighting / photography | `visualIdentity.lightingBehavior`; `PackagingTranslationV2.photographyDirection`; capsule `materialAndPhotography` | Short-Chain / Reference Anchor | mode-specific | optional |
| camera / scene program | no Packaging-specific canonical upstream field | none | both | absent; do not invent |
| reference style mechanisms | `ReferenceStyleCapsule.inheritedStyle` and prohibited identity | Reference Anchor run; `getCapsule` | reference-first | optional upstream evidence |
| selected references and roles | Workspace intent + frozen P2 Reference Policy | session intent / P2 resolver | reference-first | explicit references required |
| reference precedence | frozen P2 Reference Policy | P2 `reference-policy.js` | reference-first | forbidden in handoff |
| shot and aspect ratio | Workspace `shotContractId` + frozen P2 Shot Contract | Workspace intent / P2 contracts | both | forbidden in handoff |
| generation mode | P3-A Workspace intent | session intent | both | forbidden as an upstream decision; provenance may state source availability |
| model / API profile / Provider | Workspace intent, registry, credential resolver | session/settings/runtime | both | forbidden in handoff |
| preparation fingerprint | P3-A/P2 | prepared snapshot | both | forbidden as handoff authority |
| run/artifact/credential | P2 execution/runtime authorities | run store/artifact store/credential store | both | forbidden |

## 3. Current Packaging truth resolver

The composition-root resolver reads `projects.get(projectId)`,
`lockedAssets.list(projectId)`, and `projectContext.getShortChain(projectId)`.
It projects the seven frozen Locked Asset fields, a small analysis context,
project identity, `lockedAssets.packageStructures`, and
`visualDecisionPacket.mediaTranslations.packaging.packagingConcept`.

This is honest but incomplete. It drops context schema/version/fingerprint,
Packaging structure evidence, the rest of `PackagingTranslationV2`, source
mode identity, and Reference Anchor identity. It also deep-reads the nested
Visual Decision Packet in the Node Web Host composition root. That is the
principal coupling debt for C2+: the resolver should consume a narrow
runtime-core projection instead of knowing Visual Analysis internals.

## 4. `analysis_led` handoff

The source is explicit and project-bound:

1. `ProjectRecord` and Locked Assets provide hard project truth.
2. Unified Visual Understanding produces `VisualDecisionPacket`.
3. The packet contains a Packaging-specific `PackagingTranslationV2`.
4. `buildProjectVisualContext` embeds a same-project packet and records
   builder version, structured-analysis run id, and source fingerprint.
5. The handoff projects only Packaging-relevant canonical fields.

`packagingConcept` is the canonical analysis-led Packaging visual direction.
The handoff must not summarize it again. Analysis source images remain
analysis assets; they are not automatically converted to References.

## 5. `reference_first` handoff

Reference Anchor has real structured canonical data: project binding,
generated time, source run id, current-project identity, inherited color,
layout/typography, graphic, material/photography and extension mechanisms,
prohibited reference identity, user preference/avoidance, warnings and
uncertainties.

It does **not** currently produce `PackagingTranslationV2` or a
Packaging-specific `packagingConcept`. Its `anchorGoal` is a generic Anchor
Candidate direction and its `aspectRatio` belongs to that Anchor workflow; it
cannot be relabelled as Packaging direction or geometry. The current Packaging
resolver does not accept a Reference Anchor run identity, does not read a
capsule, and cannot prove which capsule corresponds to Workspace References.

Therefore `reference_first` is a valid P2/P3-A execution mode but does not yet
have an independent, canonical upstream Packaging context source. The B6.3
fixture proved downstream execution with an upstream-shaped truth snapshot;
it did not prove this missing upstream production handoff. Silent dependence
on an analysis-led packet would violate mode independence.

## 6. `PackagingContextHandoff` conceptual contract

This is a conceptual shape only; C1 creates no runtime type.

```text
PackagingContextHandoff {
  schemaVersion
  projectBinding { projectId }
  projectIdentity { projectName, brandName?, industry?, brandRole? }
  resolvedLockedTruth { canonical seven-field projection }
  packaging {
    visualDirection { summary, sourceKind, sourceId, sourceVersion }
    structure { formFactor, structuralFeatures[], evidenceRefs[] }
    productAndCategoryRole[]?
    informationHierarchy[]?
    graphicTranslation[]?
    colorBehavior?
    substrateLanguage[]?
    craftLanguage[]?
    photographyDirection[]?
    misreadRisks[]?
  }
  upstreamProvenance {
    sourceKind: visual_analysis | reference_translation
    sourceId
    sourceVersion
    generatedAt
    sourceFingerprint?
  }
  uncertainties[]
}
```

The future canonical type belongs with the shared upstream contracts in
`@masterpiece/project-contracts`. Its deterministic, read-only projector
belongs at the `@masterpiece/runtime-core` application boundary. The Node Web
Host should call that projector; Web UI must receive only the existing safe
Workspace view. The handoff is ephemeral and is not persisted.

## 7. Required, optional, and forbidden fields

| Field | analysis-led | reference-first | Class |
|---|---:|---:|---|
| schema version / project binding | required | required | REQUIRED |
| resolved Locked truth | required | required | REQUIRED |
| visual direction summary + source identity | `packagingConcept`, required | missing today; required before readiness | REQUIRED |
| form factor | required | required | REQUIRED |
| structural features/evidence | required when claimed | required when claimed | REQUIRED-CONDITIONAL |
| upstream source kind/id/version/generatedAt | required | required | REQUIRED |
| source fingerprint | available and required | optional until canonical reference fingerprint exists | MODE-SPECIFIC |
| product/category role and information hierarchy | optional | optional only if structured source exists | OPTIONAL |
| color/graphic/material/craft/composition/lighting/photography | optional projection of real source | optional projection of real capsule/translation source | OPTIONAL |
| camera / scene program | absent | absent | OMIT |
| whole `VisualDecisionPacket` / human report / Anchor brief Markdown | forbidden | forbidden | FORBIDDEN |
| generation mode selection | forbidden | forbidden | FORBIDDEN |
| reference assignments/roles/precedence | forbidden | forbidden | FORBIDDEN |
| `shotContractId`, ratio, `providerHints.aspectRatio` | forbidden | forbidden | FORBIDDEN |
| model id, Provider, API profile, credentials, payload | forbidden | forbidden | FORBIDDEN |
| P2/P3-A fingerprints, status, run, artifact, result | forbidden | forbidden | FORBIDDEN |

## 8. Structure ownership

`formFactor` remains Locked Asset truth. Structural features are upstream
Project Visual Context evidence; Packaging Translation structure strategy may
add purpose and evidence references without overriding the lock. The handoff
keeps these fields distinct. P3-A remains the deterministic translation seam
to the frozen P2 input. P3-C introduces neither precedence nor a third
structure resolver.

## 9. Visual Direction ownership

`PackagingTranslationV2.packagingConcept` is Packaging media translation, not
a generic project slogan. It is the canonical analysis-led source for P2
`visualDirection.summary` and must be passed verbatim with provenance. Generic
`anchorGoal`, report prose, project name, industry, brand role, or reference
image appearance cannot silently replace it.

The unresolved reference-first requirement is a structured,
Packaging-specific translation owned by the upstream Reference Translation
workflow. C2 must not manufacture one in the handoff projector.

## 10. Optional visual systems

Real canonical sources exist for Packaging color, graphic translation,
substrate, craft and photography, and for Short-Chain composition/lighting
behaviour. Reference Capsule also has color, layout/typography, graphic and
material/photography mechanisms. These may be projected only when their source
kind, source id and project binding are preserved. Camera and Packaging scene
program have no canonical source and stay absent. The whole packet is never
forwarded merely for completeness.

## 11. Reference ownership

Workspace intent owns the user’s explicit Reference assignments. Frozen P2
owns allowed roles, required-reference validation, precedence, capability and
limits. Upstream context may describe available reference-translation
provenance but cannot select References or synthesize roles. Analysis images
are never auto-promoted to generation References.

## 12. Locked Assets ownership

The existing Locked Assets service and item/index files are the only mutable
Locked Asset authority. Project Visual Context may carry ids or evidence but
cannot override it. The handoff carries a read-only resolved projection so
P3-A can consume the same truth. No second lock compiler, store, or UI-owned
truth is allowed.

## 13. Shot Contract ownership

Workspace intent owns `shotContractId`; frozen P2 Shot Contracts own geometry
and canonical aspect ratio. Reference Capsule aspect ratio is local to the
Anchor workflow. The handoff must not contain shot id, ratio, geometry maps,
`providerHints.aspectRatio`, or a translated model id.

## 14. Freshness / STALE integration

Short-Chain context already provides `version`, `generatedAt`, builder id and
version, structured-analysis run id, and `sourceFingerprint`. The future
projection includes these existing signals in the truth snapshot. P3-A’s
existing stable truth fingerprint then detects a change; `setTruthSnapshot`
causes `truth_surface_changed` and the existing STALE transition. P3-C owns no
hash algorithm, refresh loop, or state machine and never auto-reprepares.

Reference freshness is incomplete: the capsule has source run id and
generated time but no canonical source fingerprint and no Packaging resolver
selection link. That gap is part of the HOLD.

## 15. Project binding

Every handoff must satisfy:

- requested project id = `ProjectRecord.id` = Short-Chain `projectId`;
- embedded `VisualDecisionPacket.projectId` equals the same id;
- Reference Capsule `currentProjectId` equals the same id;
- Locked Asset records all belong to the same id;
- a selected upstream source id/version is explicit and validated before
  projection;
- changing projects creates/loads a session and truth snapshot for the new
  project; no prior-project context or Reference source is reused.

Mismatch fails closed. Project name similarity is never binding evidence.

## 16. Failure semantics

The future projector must return or throw stable blocking failures for:

- project/source binding mismatch;
- missing/corrupt/not-ready Short-Chain context;
- absent Packaging visual direction;
- absent required structure or structure evidence;
- source mode unavailable or ambiguous;
- unapproved/stale/missing Reference Translation source;
- unsupported schema/version.

It must not fall back between modes, read report/brief prose, invoke an LLM,
invent defaults, alter Workspace state, or contact a Provider. Existing P2
validation codes remain unchanged downstream.

## 17. STOP-P3-C matrix

| Stop | Condition |
|---|---|
| STOP-P3-C-01 | Packaging Web deep-imports Visual Analysis internals |
| STOP-P3-C-02 | P3-C creates a second Project Visual Context authority |
| STOP-P3-C-03 | P3-C creates a second Locked Asset authority |
| STOP-P3-C-04 | P3-C creates a second Shot Contract or ratio authority |
| STOP-P3-C-05 | P3-C creates a second Reference precedence engine |
| STOP-P3-C-06 | P3-C introduces compiler-time reasoning or LLM calls |
| STOP-P3-C-07 | P3-C Web calls Provider/network directly |
| STOP-P3-C-08 | analysis-led and reference-first silently fall back into each other |
| STOP-P3-C-09 | P3-C introduces project-specific production rules |
| STOP-P3-C-10 | P3-C modifies current P2 frozen semantics |
| STOP-P3-C-11 | C1 modifies current P3-A or P3-B production semantics |
| STOP-P3-C-12 | P3-C causes Space, Visual Analysis, or repository regression |

## 18. P3-C2 implementation scope

C2 is **not ready** until the upstream Reference Translation owner defines and
emits a project-bound, Packaging-specific structured direction (preferably a
real `PackagingTranslationV2` or a deliberately versioned equivalent), and a
selected source/run identity can be associated with the Packaging session
without making the handoff choose `generationMode`.

After that prerequisite, recommended C2 scope is limited to:

1. add the narrow handoff type to `@masterpiece/project-contracts`;
2. add one deterministic, read-only runtime-core projector/resolver;
3. validate source readiness, project binding and provenance;
4. project real optional Packaging systems without forwarding entire packets;
5. replace the Node Web Host’s deep packet read with that runtime-core seam;
6. feed the resulting truth into the existing `setTruthSnapshot` → fingerprint
   → STALE path;
7. add no store, LLM, Provider call, UI authority, P2 field, or P3-A state.

## Acceptance record A–AH

- **A. Git:** C1 started at P3-B accepted `2ac4cf1cc18156d1e4a508382b4563298d69c014`.
- **B. P3-B baseline:** accepted and unchanged.
- **C. Current baselines:** P2 `a593278b55e437fac59d768c5cee734d9a9fc201`; P3-A `f95c145b9b1e37430ac68315c9e039f1f3262ae4`.
- **D–I. Audit/inventory:** recorded in §§1–5 and §2.
- **J. Resolver / K. debt:** recorded in §3.
- **L–O. Contract fields:** recorded in §§6–7.
- **P–U. Ownership:** recorded in §§8–13.
- **V. Freshness:** existing truth snapshot → fingerprint → STALE only.
- **W. Project binding:** fail-closed requirements in §15.
- **X. Failure semantics:** contract only, §16.
- **Y. Persistence decision:** New Packaging Context Store: **NO**.
- **Z. STOP-P3-C:** canonical 12-stop matrix, §17.
- **AA. Architecture guards:** `AH-C1-01` through `AH-C1-14`.
- **AB. Production changed files:** target and actual: **0**.
- **AC. Frozen diff:** P2 **0**; P3-A **0**; P3-B accepted production semantic modifications **0**.
- **AD–AE. Regression/verification:** PASS — root public contracts 1233/1233;
  CLI 40/40; Runtime Core 14/14; Runtime Application 1133/1133; P3-C1
  `AH-C1` 14/14; image-generation 981/981; Node Host 4/4; Web typecheck,
  build and primary Node Host browser smoke; `repo:verify` (including
  `verify:current-flows`); Space compiler baseline; Space R8.6 Golden
  boundary. All verification was offline/sanctioned-local with 0 external
  Provider calls.
- **AF. Working tree:** must be **EMPTY** at handoff.
- **AG. Decision:** **HOLD — UPSTREAM HANDOFF CONTRACT GAP**.
- **AH. Recommended scope:** prerequisite and bounded C2 scope in §18; not implemented in C1.
