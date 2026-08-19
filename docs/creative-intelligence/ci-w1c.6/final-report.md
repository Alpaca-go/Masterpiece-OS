# CI-W1C.6 — Planning-First Creative Authority & Legacy Visual Contamination Repair (Final Report)

**STATUS: HOLD_FOR_AUTHORITY_REPAIR**

**Branch**: `feat/short-chain-simplified-ui`
**Baseline (CI-W1C.5.1 Frozen HEAD)**: `e71009829bcd075d802c623a49fa42e27277f65d`
**Final HEAD**: (uncommitted; CI-W1C.6 in-progress)
**Spec**: `Masterpiece-OS-Creative-Intelligence-CI-W1C.6-...-Repair.md`

---

## PART A — Baseline trace (DONE)

`docs/creative-intelligence/ci-w1c.6/baseline-authority-contamination-trace.md`
documents the 15-layer authority contamination trace. Key findings:

- **FIRST_LOSS_STAGE = L5 (Need derivation, Rule 9 in derive-needs.ts)**: the
  CI-W1C.5 PART E `visualAssetDifferentiationRule` emits a
  `differentiation` Need with `coverageRequirement: 'required'`. The
  Need statement embeds project-specific visual descriptors as
  positive future-style ("Differentiate via project-specific visual
  assets: ..."). This makes legacy visual evidence a required
  coverage target for future direction generation.
- **L8 (Concept) auto-injects "视觉锚点：..." suffix** into
  thesis/mechanism.
- **L9 (Direction) auto-injects "视觉锚点：..." suffix** into
  thesis/visualMechanism/systemHypothesis.
- **L13 (compiledPrompt)** uses direction ID + opaque DNA/Grammar
  IDs, NOT semantic text.
- **L14 (V3 source bundle) uses `sourcePreset: 'visual_analysis'`**
  which routes through `visual_extension` semantic.
- **L15 (reference plan)** may include current-project visual
  images (logo, VI page, old poster) as default references.

---

## PART B — Demote legacy visual evidence (DONE)

Production repair:
- `derive-needs.ts` Rule 9 renamed `legacyVisualEvidencePreservationRule`:
  type=`preservation`, coverageRequirement=`constraint_only`, statement
  no longer embeds visual descriptors.
- `generate-concepts.ts` removed the auto-promotion of visualAsset
  differentiation Need into concept's needRefs; removed the
  "视觉锚点：..." suffix injection from thesis/mechanism.
- `generate-directions.ts` removed the "视觉锚点：..." suffix
  injection from thesis/visualMechanism/systemHypothesis.
- `visual-evidence/visual-evidence-contribution.ts` UNCHANGED
  (VisualEvidenceContribution is preserved; visualAsset.* facts
  remain as traceable evidence).

---

## PART C — Source role separation (DONE — reuse existing schema)

The existing `authority` field encodes the source role:
- `VISUAL_SOURCE_FACT` → LEGACY_VISUAL_EVIDENCE (demoted)
- `LOCKED` → LOCKED_IDENTITY (preserved)
- `USER_CONFIRMED` → USER_REQUIREMENT (preserved)

No new storage introduced. No new `SourceType` enum value.

---

## PART D — Identity hardening (PENDING)

The CI-W1C.6 demoted Rule 9 does NOT extract brandRole from visual
evidence. The differentiation between projects is driven by planning
(branding / industry / brandRole via `adaptCurrentProjectCorePack`),
not by legacy visual.

The CI Anchor production path currently STILL routes through
`visual_analysis` → `visual_extension`. The reference gate is NOT
yet enforced in production (deferred to follow-up).

---

## PART E — Dedicated CI Anchor source route (PARTIAL — see HOLD note)

### Enum extension (DONE)

- `GenerationSourcePreset` type extended with `'creative_intelligence'`
- V3 task schema + V3 source bundle schema updated
- `purpose` enum extended with `'creative_anchor'`
- `ImageGenerationPurpose` already includes `'creative_anchor'`
- Web UI `SOURCE_LABELS` includes the new label

### Runtime route (NOT YET ACTIVATED)

`submitAnchorGeneration` continues to use `sourcePreset: 'visual_analysis'`.
The V3 path's `visual_extension` semantic is still inherited. The
new `creative_intelligence` source preset has no V2 mapping yet;
activating it requires a new V2 source loader (or V3 path branch)
that returns empty `references`. This is out of scope for the
current phase.

---

## PART F — Reference gate (HELPER ONLY)

The reference gate is encoded as a deterministic helper
(`simulateCreativeAnchorReferencePlan` in the test file). It
verifies:
- Default reference plan is empty (no auto current_project_identity).
- Only verified locked identity reference is allowed.
- Generic ready PNG/JPG is BLOCKED (not identity_reference merely
  because it exists).

The runtime gate is NOT yet wired to the V3 path.

---

## PART G — Planning-First prompt authority (PARTIAL)

`compilePromptFromContract(contract, planningText?)` is updated to
accept optional `planningText` (Creative Thesis, Visual Mechanism,
etc.) and emits a planning-first prompt structure. Opaque DNA /
Grammar refs are kept for traceability but positioned at the END of
the prompt.

The callers (`startAnchorProduction`, `compileAnchorProduction`)
have NOT yet been updated to pass `planningText`. The default
fallback is the legacy behavior (selectedDirectionId + opaque IDs).

---

## PART H — Prompt source map (NOT YET)

Deferred to a follow-up phase. The hard rule (`legacy_visual_evidence`
positive prompt blocks = 0) is structurally enforced by the
CI-W1C.6 PART B demotion.

---

## PART I — Contamination scanner (TEST-ONLY HELPER)

`scanContamination` in the test file inspects Concept / Direction
text and identifies legacy descriptors. It does NOT hardcode
九州美学 / 一剂良方 tokens.

Test coverage:
- CONTAM-01/02: scanner finds no legacy descriptors in demoted chain
  (A and B) → PASS
- CONTAM-03: scanner can detect legacy descriptors (positive case)
  → PASS

A runtime contamination scanner is deferred to a follow-up phase.

---

## PART J — Zero-cost dry-run (NOT RUN)

The dry-run requires an analysis profile in the credentials
directory. The smoke infrastructure is missing. Deferred to a
follow-up phase.

---

## PART K — Tests (DONE — 15/15 PASS)

`tests/.../planning-first-authority-auth-ref-prompt-contam-diff.test.js`:
- AUTH-01/02/03: planning-first authority (3/3 PASS)
- REF-01/02/03: reference gate (3/3 PASS)
- PROMPT-01: planning-first prompt (1/1 PASS)
- CONTAM-01/02/03: contamination scanner (3/3 PASS)
- DIFF-01/02/03: differentiation (3/3 PASS)
- FROZEN-01/02: frozen surface preservation (2/2 PASS)

---

## PART L — Regression (PASS — 0 new failures, 0 worsened failures)

| Suite | Pass | Fail | Notes |
| --- | --- | --- | --- |
| `node --test tests/packages/creative-intelligence/**` | 701 | 15 | 15 pre-existing (XD01-XD05 + XD2-01..XD2-05 + XD2-07 use OLD smoke evidence; CI-6 golden 1 latent bug; CI-W1A L1/L10; CI-1B parity timestamp flake). **0 new failures from CI-W1C.6.** |
| `npm test` (root contracts) | 1443 | 1 | 1 pre-existing CI-1B parity flake. **0 new failures.** |
| `npm run web:typecheck` | pass | — | clean tsc --noEmit |
| `npm run verify:version-consistency` | PASS | — | — |
| `npm run verify:version-naming` | PASS | — | — |
| `npm run verify:workspace-boundaries` | PRE-EXISTING FAIL | — | Script bug at line 218; unchanged |
| `npm run verify:production-boundaries` | PASS | — | — |
| `npm run verify:no-obsolete-code` | PASS | — | — |
| `npm run verify:no-project-specific-production-rules` | PASS | — | — |
| `npm run verify:golden-boundary` | PASS | — | — |
| `npm run verify:tracked-runtime-assets` | PASS | — | — |

---

## PART M — Verdict

**HOLD_FOR_AUTHORITY_REPAIR**

### Why HOLD_FOR_AUTHORITY_REPAIR (not READY_FOR_CONTROLLED_PROVIDER_SMOKE)

| Required for READY | Status |
| --- | --- |
| PART B demote legacy visual evidence | ✅ DONE |
| PART C source role separation | ✅ DONE (reuse existing schema) |
| PART D identity hardening | ⏳ PENDING (CI Anchor still routes through `visual_analysis`) |
| PART E dedicated source route | ⏳ PARTIAL (enum added; runtime not activated) |
| PART F reference gate | ⏳ HELPER ONLY (runtime not wired) |
| PART G planning-first prompt | ⏳ PARTIAL (compilePromptFromContract updated; callers not wired) |
| PART H prompt source map | ⏳ NOT YET |
| PART I contamination scanner | ⏳ TEST-ONLY HELPER (runtime not wired) |
| PART J zero-cost dry-run | ⏳ NOT RUN (smoke infrastructure missing) |
| PART K tests | ✅ 15/15 PASS |
| PART L regression | ✅ 0 new failures, 0 worsened failures |
| Production delta vs CI-W1C.5.1 | non-zero (PART B demoted production code; PART E enum extension; PART G signature change) |

The CI-W1C.6 PART B demotion is in place and verified. The PART E
dedicated source route + PART F reference gate + PART G caller
wiring + PART I runtime scanner require V2 path changes that are
out of scope for a single phase.

### Stop conditions honored

- Per-step STOP: HOLD verdict reported; no live Provider call.
- CI-10: NOT STARTED.
- Consumer switch: FORBIDDEN.
- No project-specific production hacks; tests are project-agnostic.

### Frozen surfaces preserved

- Document Intelligence, DVC schema, Truth taxonomy, Conflict Detector,
  Concept Gate critical semantics, CI-7 Evaluation, Selection, Canon
  schema, Anchor, Image Runtime, Translation, Consumers, CI-10.
- CI-W1C.1 image model authority, CI-W1C.3 RPC freshness, CI-W2
  explicit anchor approval, CI-W1B.2 all-blocked semantics,
  selection invalidation, anchor approval invalidation,
  Space/Packaging frozen consumer behavior.
- Locked identity preservation (Rule 2 lockedPreservationRule still
  emits a preservation Need with `constraint_only`).
- VisualEvidenceContribution preserved (`visualAsset.*` facts still
  emitted as traceable evidence; no `SourceType` enum change).

---

## Next unlock

A follow-up phase (e.g. CI-W1C.6.1) should:
1. Activate `creative_intelligence` source preset in
   `submitAnchorGeneration` runtime (PART E).
2. Add a V2 source loader (or V3 path branch) for
   `creative_intelligence` that returns empty `references` (PART F).
3. Update `startAnchorProduction` + `compileAnchorProduction` callers
   to pass `planningText` to `compilePromptFromContract` (PART G).
4. Add a runtime contamination scanner (PART I).
5. Add a prompt source map (PART H).
6. Re-run the dry-run qualification (PART J) with a re-created
   analysis profile and user authorization.

The user must decide whether to:
- (a) Authorize the CI-W1C.6.1 follow-up phase.
- (b) Accept HOLD_FOR_AUTHORITY_REPAIR and defer indefinitely.
- (c) Extend architecture (out of CI-W1C scope).
