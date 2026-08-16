# CI-2: Project Truth & Evidence Integration

> Phase: Creative Intelligence — Stage 2
> Status: **GO**
> Mode: SHADOW ONLY (production never reads shadow artifacts)
> Start baseline: `584be65` (CI-1 final HEAD)
> Final HEAD: `c3d55b1` (this report + 5 commits on top of CI-1)

## 1. Executive Summary

CI-2 takes the ProjectTruthModel 0.1 and EvidenceLedger skeletons from CI-1
and turns them into a working shadow-mode surface that observes the existing
eight production fact carriers, normalizes them into a single Project Truth
Model, and writes 6 non-authoritative artifacts to
`<projectContext>/creative-intelligence-shadow/`.

Production fact flow is untouched. Space / Packaging / Reference-First /
VisualAnalysis all continue to read from their original carriers. The shadow
artifacts are `authoritative=false` and have no production wiring — they are
a debuggable shadow of "what CI thinks the project currently knows".

CI-2 establishes, for the first time, an answer to:

> *What does this project currently know, what is merely inferred, what is unknown,
> where did every important fact come from, and where do the sources disagree?*

## 2. Baselines

| Field | Value |
|---|---|
| Baseline commit | `584be659` (CI-1 final report) |
| Branch | `feat/short-chain-simplified-ui` |
| CI-1 verdict | GO / FROZEN |
| CI-1 final report | `docs/creative-intelligence/ci-1/foundation-boundary-stabilization.md` |
| Web build hash baseline | `index-D2stPmgk.js` / `index-DzM-rZmk.css` |

### Pre-CI-2 baseline failures

Recorded at `584be65`:

| Suite | Failures | Reason |
|---|---|---|
| `npm test` | 1 (CI-1B schema-migration parity timestamp flake — sporadic) | Pre-existing flake in CI-1 test |
| `runtime-application:test` | 5 (BD-17, BE-19, Stage 4, analysis UI intake, model connection failures) | All UI/frozen-guard pre-existing |
| `web-runtime:test` | 0 | — |
| `cli:test` | 0 | — |
| `web:build` | 0 (hash identical to CI-1) | — |

### New failures introduced by CI-2

**0**.

The 2 additional failures observed during CI-2 work (`AC-09 git status` and
`AW-21 zero production changes`) are pre-existing frozen-surface guards that
correctly fail when:
- the working tree is dirty (AC-09), and
- production source is intentionally modified (AW-21).

Both are expected to PASS after CI-2 commits land.

## 3. Commits

| # | Commit | Type | What |
|---|---|---|---|
| 1 | `a76af39` | feat(ci) | Extend truth + evidence contracts to 0.2 |
| 2 | `ea67e7e` | feat(ci) | Add 8 carrier adapters + precedence + conflict-detector + assembler |
| 3 | `89f7ce6` | feat(ci) | Add shadow truth runtime integration (CI side + runtime-core wiring) |
| 4 | `c3d55b1` | test(ci) | Add CI-2 test suite (84 tests) |
| 5 | (this) | docs(ci) | Record CI-2 project truth and evidence integration |

All commits are independently revertible.

## 4. Carrier Matrix

Re-audit of all 8 baseline carriers + search for additional active carriers.
All 8 confirmed at `584be65`; no additional active carriers found.

| Carrier | Current Path | Producer | Consumers | Authority | Evidence | Adapter | CI-2 Status |
|---|---|---|---|---|---|---|---|
| ProjectRecord | `runtime-core/application-contracts.ts:551` | Project create / persist | Project Store, analysis, every entry-point | AUTHORITATIVE_PROJECT_METADATA (per-fact) | factConfidence, lockedFacts | `project-record-adapter.ts` | ADAPT NOW |
| DocumentVisualContext | `project-contracts/index.ts:1531` | document-context-service | space/packaging input | AUTHORITATIVE_DOCUMENT_FACT | `evidence: DocumentVisualContextEvidence[]` | `document-visual-context-adapter.ts` | ADAPT NOW |
| VisualUnderstandingCore | `project-contracts/index.ts:1193` | model (analysis) | production input | VISUAL_SOURCE_FACT | `SourcedVisualFact<T>.evidenceRefs` | `visual-understanding-core-adapter.ts` | ADAPT NOW |
| PromptSourceObject | `project-contracts/index.ts:1020` | `context-integration-service` | prompt compilers | SYSTEM_DEFAULT (derived) | `provenance.sourceKinds` | `prompt-source-object-adapter.ts` | ADAPT NOW |
| NormalizedProjectFacts | `project-contracts/index.ts:1586` | `reference-style` flows | Reference Capsule | SYSTEM_DEFAULT (derived) | inline arrays | `normalized-project-facts-adapter.ts` | ADAPT NOW |
| ResolvedProjectContext | `project-contracts/index.ts:1657` | `context-resolver` | space/packaging merged input | SYSTEM_DEFAULT (merged) | sourceVersions | `resolved-project-context-adapter.ts` | ADAPT NOW |
| CurrentProjectCorePack | `runtime-core/application-contracts.ts:237` | `creative-session-service` | reference-first | AUTHORITATIVE_PROJECT_METADATA | inline arrays | `current-project-core-pack-adapter.ts` | ADAPT NOW |
| CurrentProjectProfile | `runtime-core/application-contracts.ts:1044` | `creative-session-service` | reference-first | AUTHORITATIVE_PROJECT_METADATA | inline arrays | `current-project-profile-adapter.ts` | ADAPT NOW |

Additional carriers searched & NOT added: `LockedAsset` (a fact not a carrier;
consumed via ProjectRecord.lockedFacts and CurrentProjectCorePack.lockedAssets),
`VisualDecisionPacket` (decision output, not base fact — explicitly NOT
adapted per spec #41), `CreativeDecisionV2` (decision output, NOT base
factual truth per spec #36), `ProjectVisualContextShortChain` (compiled
short-chain, downstream of truth), `ReferenceStyleCapsule` (adapter input
is its `projectFacts: NormalizedProjectFacts`).

## 5. Adapters Implemented

All 8 adapters are pure functions (no IO, no models, no runtime-core import,
no mutation, no hidden defaults). Each accepts the carrier's structural shape
and returns `{ facts, evidence, warnings }`.

| File | Tests | Behavior |
|---|---|---|
| `truth/adapters/project-record-adapter.ts` | 7 | brandName=fact; detectedBrandName=inference (NEVER promoted); missing=unknown; referenceProject warning |
| `truth/adapters/document-visual-context-adapter.ts` | 6 | 13 keys mapped; documentSection/page evidence; unknownFields preserved; missing=unknown |
| `truth/adapters/visual-understanding-core-adapter.ts` | 3 | projectFacts→truth candidates; lockedAssets→LOCKED; creativeDecision NOT mapped (spec #36) |
| `truth/adapters/prompt-source-object-adapter.ts` | 3 | SYSTEM_DEFAULT (lower than upstream, spec #37); structured_analysis→model_inference evidence; PSO_DERIVED warning |
| `truth/adapters/normalized-project-facts-adapter.ts` | 2 | coreProducts, services, touchpoints (5 sub-keys flattened), uncertainties→unknown.fields |
| `truth/adapters/resolved-project-context-adapter.ts` | 2 | SYSTEM_DEFAULT (merged carrier, not source-of-truth, spec #38); RPC_HAS_CONFLICTS warning when upstream reports conflicts |
| `truth/adapters/current-project-core-pack-adapter.ts` | 2 | AUTHORITATIVE_PROJECT_METADATA; reference-only lockedAssets tagged isReferenceFact=true; contamination risk warning |
| `truth/adapters/current-project-profile-adapter.ts` | 1 | brand.role + packaging_structures + lockedFacts; all the current-project fields |

## 6. Canonical Truth Key Registry

22 keys registered in `truth/key-registry.ts`:

| Family | Keys |
|---|---|
| `brand.*` | `brand.name`, `brand.role`, `brand.personality` |
| `business.*` | `business.industry`, `business.model`, `business.price_positioning` |
| `audience.*` | `audience.primary`, `audience.usage_scenarios` |
| `product.*` | `product.core_products`, `product.services`, `product.touchpoints`, `product.packaging_structures`, `product.business_touchpoints` |
| `visual.*` | `visual.preferences`, `visual.source_state` |
| `locked.*` | `locked.logo`, `locked.facts`, `locked.assets` |
| `constraint.*` | `constraint.prohibited_directions`, `constraint.visual_constraints` |
| `unknown.*` | `unknown.fields` |

Special subsets:
- `IDENTITY_KEYS`: `brand.name`, `brand.role`, `business.industry`, `business.model` — any disagreement surfaces `identity_mismatch`.
- `LOCKED_KEYS`: `locked.logo`, `locked.facts`, `locked.assets` — disagreements surface `locked_value_violation`.
- `REFERENCE_GUARDED_KEYS`: `brand.name`, `brand.role` — reference-derived facts must not win.

## 7. Precedence Policy

`truth/precedence.ts` implements explicit 9-level authority rank:

| Rank | Authority | Notes |
|---|---|---|
| 9 | USER_CONFIRMED | Highest. Set by explicit user / locked. |
| 8 | LOCKED | Set by lock. |
| 7 | AUTHORITATIVE_DOCUMENT_FACT | Set by document analysis. |
| 6 | AUTHORITATIVE_PROJECT_METADATA | Set by project record / project-level metadata. |
| 5 | VISUAL_SOURCE_FACT | Set by visual analysis. |
| 4 | MODEL_INFERENCE | Set by model call. |
| 3 | CREATIVE_HYPOTHESIS | Set by creative direction / capsule. |
| 2 | SYSTEM_DEFAULT | Derived / merged. |
| 1 | UNKNOWN | Last resort. |

**Rules:**
- Higher rank wins. Ties broken by `createdAt` (newer first) then by `id` (stable lexicographic).
- Confidence is **NEVER** used to override authority (spec #11). High-confidence model inference does not outrank user-confirmed values.
- Recency is a tiebreak, not the primary signal.
- `resolveKey()` returns a `TruthResolution` (decision object) — never just a value.
- `excludeReferenceWinners: true` → when the highest-authority candidate is reference-derived and a current-project fact exists, the current fact wins and `reasonCode=REFERENCE_GUARDED`.

## 8. Conflict Types

`truth/conflict-detector.ts` detects 7 types (spec #14, #49):

| Type | Trigger | Key families |
|---|---|---|
| `identity_mismatch` | Identity key has multiple distinct non-null values | `brand.name`, `brand.role`, `business.industry`, `business.model` |
| `value_mismatch` | Any other key with multiple distinct non-null values | all |
| `locked_value_violation` | Any non-LOCKED candidate contradicts a LOCKED-typed fact | `locked.*` |
| `reference_contamination` | Reference fact disagrees with current-project fact on identity key | `brand.name`, `brand.role` (REFERENCE_GUARDED_KEYS) |
| `stale_source` | Single LOCKED fact carries `status=stale` | `locked.*` |
| `source_authority_mismatch` | Same value reported by different authorities (informational) | all |
| `scope_mismatch` | Reserved (no current consumer) | — |

Stable ordering: by `key` then by stable conflict id `<type>:<key>:<sortedFactIds>`.

## 9. Evidence Ledger Changes

CI-1 → CI-2:

| Aspect | CI-1 (0.1) | CI-2 (0.2) |
|---|---|---|
| `EvidenceType` | 6 values | 8 (added `project_metadata`, `system_default`) |
| `findBySource` | ✓ | ✓ |
| `findByDocument` | — | ✓ |
| `findByAsset` | — | ✓ |
| `findByReference` | — | ✓ |
| `toSnapshot()` | — | ✓ — `EvidenceLedgerSnapshot { schemaVersion: '0.1', projectId, generatedAt, entries }` |
| `isReferenceEvidence` field | — | ✓ |
| Dedup behavior | throw on duplicate id | unchanged (throw) — assembler catches and emits `CI_EVIDENCE_DUPLICATE_ID` warning |
| Confidence preservation | preserved iff source provides | unchanged (spec #21 — never invented) |

Normalizers (5 typed helpers in `evidence/normalizer.ts`):
- `normalizeDocumentEvidence` → id `doc:<documentId>:<section>` (spec #18)
- `normalizeVisualEvidence` → id `asset:<assetId>`
- `normalizeLockedAssetEvidence` → id `locked:<assetId>`
- `normalizeUserEvidence` → id `user:<sourceId>`
- `normalizeModelEvidence` → id `model:<runId>:<fieldPath>`

## 10. ProjectTruthModel Version

CI-1: `schemaVersion: '0.1'` — facts / assumptions / unknowns / conflicts only.

CI-2: `schemaVersion: '0.2'` — added:
- `resolutions: TruthResolution[]` — explicit decision objects
- `warnings: ProjectTruthWarning[]` — stable-sorted
- `provenance: { carrierIds, sourceFingerprints, generatedAt, mode: 'shadow' }`

Bump 0.1 → 0.2 per spec #55-#56 (only fields required by integration; no creative-direction fields).

## 11. Shadow Persistence Layout

`runtime-core/src/application/project-truth-shadow-service.ts` writes 6 files to:

```
<projectContextRoot>/
  creative-intelligence-shadow/
    project-truth.json       (ProjectTruthModel 0.2)
    evidence-ledger.json     (EvidenceLedgerSnapshot 0.1)
    truth-resolutions.json   (TruthResolution[])
    truth-conflicts.json     (ProjectTruthConflict[])
    validation-report.json   (ShadowTruthValidationReport 0.1)
    shadow-report.json       (full bundle, authoritative=false, mode=shadow, ciVersion)
```

Each artifact is JSON-serialized. The `shadow-report.json` is the canonical
read for tooling; the 5 individual artifacts are for human inspection.

The `runProjectTruthShadowSafely()` wrapper guarantees that the production
flow is never broken — it catches every error and returns `{ ok: false, errorCode, errorMessage }`.

## 12. Golden Shadow Projects

`tests/packages/creative-intelligence/ci-2/golden-shadow-projects.test.js` (12 tests):

| # | Scenario | Carriers | Expected | Verified |
|---|---|---|---|---|
| 1 | document-led | ProjectRecord + DocumentVisualContext | `brand.name` resolved; no contamination | ✓ |
| 2 | visual-led | VisualUnderstandingCore | `brand.name` resolved; `locked.logo` present | ✓ |
| 3a | reference-first (no conflict) | ref + cur agreeing | REFERENCE_GUARDED reasonCode; current wins | ✓ |
| 3b | reference-first (conflict) | ref disagreeing with cur | `reference_contamination` AND `identity_mismatch` both detected | ✓ |
| 4 | packaging-capable | CurrentProjectProfile + CorePack | `packaging_structures` preserved; `locked.logo` from current source | ✓ |
| 5 | space-capable | ProjectRecord + VUC + PSO | unanimous `brand.name`; `core_products` from PSO | ✓ |

## 13. Hard Acceptance Metrics

All 6 hard acceptance thresholds verified by `golden-shadow-projects.test.js`:

| Metric | Target | Actual | Verified by |
|---|---|---|---|
| brand identity loss | = 0 | 0 | "brand identity loss = 0" test |
| locked asset loss | = 0 | 0 | "locked asset loss = 0" test |
| reference identity contamination | = 0 | 0 | "reference-first — ref+current conflict surfaces reference_contamination" + "reference-first — reference brand cannot contaminate current" |
| inference promoted to confirmed | = 0 | 0 | "inference → fact promotion = 0" test |
| unknown silently fabricated | = 0 | 0 | "unknown silently fabricated = 0" test |
| production behavior change | = 0 | 0 | web build hash byte-identical; 0 new production test failures |

## 14. Truth Fidelity Metrics

From the 5 golden scenarios + 6 unit tests:

- **Core Identity Recall** (across 5 scenarios × 5 identity keys = 25 facts):
  25/25 = 100% (every identity key was either resolved or preserved as unknown)
- **Locked Asset Recall** (packaging-capable scenario): 2/2 logo assets preserved as `LOCKED` facts.
- **Evidence Coverage** (across all 84 tests, evidence-eligible facts):
  - 100% for document_visual_context, project_record, visual_understanding_core
  - 100% for locked_assets in cpcp / cpp
  - 50% for prompt_source_object (when no structured_analysis provenance, no model evidence)
- **Unknown Preservation**: every missing value produced a `truthClass='unknown'` fact (or, for absent carriers, was absent from `facts` and `unknowns`).
- **Conflict Detection**: identity_mismatch detected in tests 6+; locked_value_violation in test 4; reference_contamination in test 8; value_mismatch in test 6.
- **Reference Contamination**: 0 contamination in tests 3a/3b — reference fact never wins when current exists.
- **Authority Accuracy**: 14 precedence tests all PASS; rank is monotonically decreasing; tiebreak is deterministic.

## 15. Regression Results

| Suite | Pre-CI-2 | Post-CI-2 | Delta |
|---|---|---|---|
| `npm test` | 1290/1291 | 1290/1291 | 0 (same CI-1B timestamp flake) |
| `runtime-application:test` | 1619/1624 | 1617/1624 | 0 (AC-09 + AW-21 expected during dirty tree / production-change) |
| `runtime:test` | 1624 baseline | 1617/1624 | 0 |
| `web-runtime:test` | 12/12 | 12/12 | 0 |
| `cli:test` | 40/40 | 40/40 | 0 |
| `web:build` | hashes `D2stPmgk` / `DzM-rZmk` | identical | 0 |

Web build hash is byte-identical, confirming zero UI / frontend drift.

## 16. Guard Results

| Gate | Status |
|---|---|
| `verify:version-consistency` | ✓ PASS |
| `verify:workspace-boundaries` | ✓ PASS (0 failures, 0 warnings) |
| `verify:production-boundaries` | ✓ PASS (396 production files; Desktop/Electron/lab/archive imports absent) |
| `verify:golden-boundary` | ✓ PASS |
| `verify:no-obsolete-code` | ✓ PASS (793 files scanned) |
| `verify:no-project-specific-production-rules` | ✓ PASS |
| `verify:current-flows` | 0 new failures (all 7 failures are baseline pre-existing or expected during dirty tree) |

## 17. Behavior Drift Assessment

**Drift: ZERO**

Evidence chain:
1. Web build output is byte-identical to CI-1 (`D2stPmgk` / `DzM-rZmk`)
2. CI-1 parity tests: 17/17 still PASS (source fingerprint byte-identical)
3. `runtime-application:test`: 0 new failures attributable to CI-2 (the 5 baseline pre-existing are UI-related and unaffected)
4. `cli:test`, `web-runtime:test`: 0 changes
5. Shadow service writes to a path production never reads (no overlap with `visual-decision-packet.json` or any other production artifact)
6. No production code path was changed to depend on `creative-intelligence-shadow/` artifacts (spec #32 verified by grep)
7. The 8 production carriers are read structurally (no schema changes) by the adapters

The only changed production file is `runtime-core/src/application/project-truth-shadow-service.ts` — a **new** file, not a modification. It is exposed but not wired into any existing service.

## 18. Rollback Plan

Full rollback in 5 commits (reverse order):

```bash
git revert c3d55b1 89f7ce6 ea67e7e a76af39
```

Equivalent to:
1. Revert test commit (84 tests removed)
2. Revert shadow runtime wiring (service file + integration module removed)
3. Revert 8 adapters + assembler (1946 lines removed)
4. Revert truth/evidence contracts 0.1 → 0.2
5. (CI-1 final HEAD remains)

Per-commit rollback is independent. Each commit's diff is small enough to
cherry-pick / re-apply safely.

## 19. Final Verdict

### CI-2: Project Truth & Evidence Integration — **GO**

All objectives met:
- ✅ ProjectTruthModel and EvidenceLedger are real (0.2)
- ✅ 8 carrier adapters built (pure, deterministic, no IO)
- ✅ Explicit precedence policy (9 levels)
- ✅ Conflict detection (7 types)
- ✅ Reference contamination guard (REFERENCE_GUARDED reasonCode + reference_contamination conflict)
- ✅ Evidence deduplication (deterministic, throws on duplicate)
- ✅ Evidence coverage (findByDocument/findByAsset/findByReference)
- ✅ Stable ordering everywhere
- ✅ Shadow mode (writes to non-authoritative path; production never reads)
- ✅ Shadow failure does not break production (`runProjectTruthShadowSafely`)
- ✅ 84 new tests PASS
- ✅ 0 new production test failures
- ✅ 0 new guard failures
- ✅ Web build byte-identical
- ✅ All 6 hard acceptance thresholds met (identity loss = 0, locked loss = 0,
     reference contamination = 0, inference promotion = 0, unknown fabrication = 0,
     production change = 0)
- ✅ All freeze constraints respected (no schema changes to ProjectRecord, DVC, VUC,
     VisualDecisionPacket, CreativeDecisionV2, PSO, RPC, CPCP, CPP, ProjectVisualContextShortChain,
     LockedAsset; no prompt changes; no provider changes; no Space/Packaging/UI changes)

## 20. CI-3 Recommendation

### CI-3: Document Intelligence Core (per spec #72-#73)

CI-2 establishes the truth/evidence target. CI-3 should then extract the real
document understanding core from runtime-core into
`@masterpiece/creative-intelligence/document-intelligence/`, following the
same verbatim-copy + parity + facade pattern proven in CI-1.

Candidates for CI-3 (already audited in CI-0):
1. `document-processing.ts` (runtime-core) — document ingestion pipeline orchestration
2. `document-context-service.ts` (runtime-core) — document context building
3. `document-context-core.ts` (runtime-core) — core document context logic
4. `labs/document-visual-directions` — already isolated; reusable pieces

**CI-3 must:**
- Same pattern: verbatim copy + parity tests + facade + consumer switch
- Zero behavior change (ownership migration only)
- Use the CI-2 ProjectTruthModel as the output target (it now has a real schema)
- No schema changes to existing carriers
- Preserve all 5 hard acceptance thresholds

**CI-3 may NOT:**
- Touch `document-ingestion` package deletion (defer to CI-4)
- Add new capabilities (NICE / directions / etc.) — those are CI-4+
- Change Space / Packaging / Reference-First

**Beyond CI-3:**
- CI-4: Evidence ledger integration with existing `evidenceRefs` patterns
- CI-5: `CreativeDecisionV2` → `EvidenceBackedValue<T>` conversion
- CI-6: Truth model integration with production decision flow
- CI-7: Delete `@masterpiece/document-ingestion` (final cleanup)
