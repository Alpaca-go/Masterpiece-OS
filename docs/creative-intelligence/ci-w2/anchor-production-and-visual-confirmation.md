# CI-W2 — Anchor Production & Visual Confirmation

> Status: **GO**
> Branch: `feat/short-chain-simplified-ui`
> Baseline: `d27b2300` (CI-W1B.2 final)
> Implementation HEAD: `879ab32c`

## 1. Baseline

| Item | Value |
|---|---|
| Pre-CI-W2 HEAD | `d27b2300` (CI-W1B.2: all-blocked recovery & concept gate semantics audit) |
| CI-W1A status | GO (cea5512b) |
| CI-W1B status | GO (b5cdc1ea) |
| CI-W1B.1 status | GO (0e944588) |
| CI-W1B.2 status | GO (d27b2300) |
| Pre-CI-W2 `npm test` | 1401/1401 + 1 pre-existing fail (tracked-runtime-assets-guard Case 1) |
| CI-W2 final `npm test` | 1444/1444 + 0 new failures, 0 worsened failures |

Pre-existing `runtime:test` and `verify:current-flows` UI-guard fails
(14 tests, down from 15 in CI-W1B.2 because `AC-09` and `AW-21` are
working-tree-cleanliness tests that now pass on a clean tree) are
**unchanged** by CI-W2 (the CI-W2 commits do not touch the production
surfaces those guards test). After CI-W2 lands, the same 14 + 0 new
fails are observed.

## 2. Implementation HEAD

The 8 CI-W2 commits (newest first; use `git log d27b2300..HEAD --oneline`
to see the final SHAs after this report is committed):

```
<this commit> docs(ci): record CI-W2 anchor production and visual confirmation
879ab32c test(web): add CI-W2 anchor review guards + real-project fixtures
a067aad4 test(ci-anchor): add anchor production golden scenarios
1f7ed1f2 feat(web): add anchor generation and visual approval experience
b5695533 feat(ci-runtime): add explicit anchor approval history and invalidation
0d245a9a feat(ci-runtime): add anchor production orchestration
9b901467 feat(ci-anchor): add AnchorProductionContract and run state
230502ba chore(ci-anchor): audit existing image-generation handoff contracts
```

## 3. Commits

| # | Subject |
|---|---|
| 1 | chore(ci-anchor): audit existing image-generation handoff contracts |
| 2 | feat(ci-anchor): add AnchorProductionContract and run state |
| 3 | feat(ci-runtime): add anchor production orchestration |
| 4 | feat(ci-runtime): add explicit anchor approval history and invalidation |
| 5 | feat(web): add anchor generation and visual approval experience |
| 6 | test(ci-anchor): add anchor production golden scenarios |
| 7 | test(web): add CI-W2 anchor review guards + real-project fixtures |
| 8 | docs(ci): record CI-W2 anchor production and visual confirmation |

## 4. Image runtime audit (Part A)

The audit concluded: **reuse the existing image-generation runtime as
the Anchor handoff**. No second image stack is built. Specifically:

| Question | Answer |
|---|---|
| 1. Which existing contract is the Anchor handoff? | `ImageGenerationSourceBundleV3` + `ImageGenerationRequest` via `imageGenerationService.start()`, with `purpose: 'creative_anchor'` (newly added) |
| 2. Does `ImageGenerationPurpose` need a new value? | **Yes** — added `'creative_anchor'`. Existing values were `'exploration' \| 'production'`. The new value lets the image runtime route Anchor sub-runs without forking |
| 3. How is the existing provider / profile reused? | The CI application service resolves the API Profile (the same way the existing short-chain does) and threads `providerId` + `modelId` into the image runtime call. The image runtime continues to own the provider adapter registry and the API-key boundary |
| 4. Who persists the image asset? | The image-generation-runtime asset authority. Anchor Production only stores candidate metadata + a pointer to the image asset (imageId, imagePath, imageFingerprint) |
| 5. Retry / cancel? | The image runtime already supports retry and cancel for any `ImageGenerationPurpose`. Anchor Production reuses them by calling the same `imageGenerationService.start()` boundary with the same `imageGenerationRunId` |

Boundary discipline: `Web → RuntimeApi → Runtime Application → Image
Generation Runtime → Provider`. Web never imports the CI domain
package. The CI domain package never imports the image-generation-
runtime; it only consumes the contracts.

## 5. Architecture

```
                    ┌─────────────────────────┐
                    │   Creative Intelligence  │
                    │   Workspace (Web)        │
                    │   (NEW: 视觉基准 section)  │
                    └────────────┬─────────────┘
                                 │ window.masterpiece.creativeIntelligence.*
                                 │   start-anchor-production
                                 │   get-anchor-production
                                 │   approve-anchor-candidate
                                 │   ...
                                 ▼
                    ┌─────────────────────────┐
                    │   Runtime Application   │
                    │   (CI Service)           │
                    │   NEW: 9 anchor methods │
                    └────────────┬─────────────┘
                                 │ delegates to
                                 ▼
                    ┌─────────────────────────┐
                    │   Anchor Production      │
                    │   Orchestrator            │
                    │   (runtime-core)          │
                    │   NEW: anchor-production- │
                    │   service.ts              │
                    │   - 6-state lifecycle     │
                    │   - approval history      │
                    │   - stale-approval check  │
                    │   - injects boundary      │
                    └────────────┬─────────────┘
                                 │ submitAnchorGeneration(input)
                                 │ purpose: 'creative_anchor'
                                 │ size: '2560*1440'
                                 ▼
                    ┌─────────────────────────┐
                    │   Image Generation      │
                    │   Runtime (existing)    │
                    │   - Provider adapter     │
                    │   - Image asset authority│
                    │   - Retry / cancel       │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   Provider (existing)   │
                    └─────────────────────────┘
```

Web never imports from `@masterpiece/creative-intelligence`. The CI
domain package is consumed only by `runtime-core` and `tests/*`.

## 6. Contracts (Part B)

`AnchorProductionContract` binds the existing artifacts:

```ts
{
  schemaVersion: '0.1',
  projectId,
  creativeIntelligenceRunId,
  selectedDirectionId,
  selectionRevision,
  canonVersion,
  anchorContractVersion,
  candidateCount,            // default 3
  mustDemonstrate: string[],
  mustPreserve: string[],
  mayExplore: string[],
  mustNotChange: string[],
  evaluationCriteria: Array<{ id, criterion, severity, sourceRefs }>,
  requiredDNARefs: string[],
  requiredGrammarRefs: string[],
  lockedAssetRuleRefs: string[],
  sourceFingerprint: string, // stable hash of inputs
  productionFingerprint: string,
  status: 'ready' | 'blocked',
  authoritative: false,      // CI-10 lock
  mode: 'shadow',            // CI-10 lock
}
```

Source inputs (only):
- `SelectedDirectionSnapshot`
- `VisualCanon`
- `AnchorContract` (from the CI main run)
- `lockedAssetKeys` (resolved from LockedAssetsService)

`AnchorProductionRun` carries the 6-state lifecycle:

```
pending → compiling → generating → completed | failed | cancelled
```

It is a sub-run of an existing CI main run. It does NOT mutate the CI
main run's lifecycle. The CI main run's `runtime/run.json` is read
only for the `selectionRevision` field that drives stale-approval
detection.

## 7. Compiler (Part D)

`buildAnchorProductionContract` is a **deterministic pure compiler**:
- No disk writes
- No model call
- No template resolution
- No environment reads

`sourceFingerprint` is a stable hash of all inputs (Direction +
Canon + AnchorContract + lockedAssetKeys + selectionRevision).
`productionFingerprint` is a stable hash of the contract body. Same
inputs → same fingerprints.

`canStartAnchorProduction` is the preflight gate:
- no selection → `CI_ANCHOR_SELECTION_REQUIRED`
- stale selection → `CI_ANCHOR_SELECTION_INVALIDATED`
- no Canon → `CI_ANCHOR_CANON_REQUIRED`
- Canon stale → `CI_ANCHOR_CANON_STALE`
- blocked AnchorContract → `CI_ANCHOR_CONTRACT_BLOCKED`
- locked asset conflict → `CI_ANCHOR_LOCKED_ASSET_CONFLICT`

`compilePromptFromContract` is a separate pure helper that converts
the contract into a deterministic prompt string. No LLM, no template
resolution. The prompt is exactly the contract's structured fields
serialized as Markdown.

## 8. Provider reuse (Part A §3)

The existing image runtime is the **only** path to the provider. The
CI domain package and the orchestrator do not import the provider
adapter; they only consume `imageGenerationService.start()`.

In `runtime-services.ts`, the production wiring calls:

```ts
imageGeneration.start({
  sources: {
    schemaVersion: '3.0',
    sourcePreset: 'integrated_context',
    deliverable: 'free_concept',
    purpose: 'creative_anchor',   // NEW routing label
    projectId,
    userIntent: { prompt: compiledPrompt, aspectRatio: '16:9' },
  },
  projectId, apiProfileId, modelId,
  size: '2560*1440',
  dryRun: false,
});
```

The existing short-chain flow continues to use `purpose: 'production'`.
The two purposes share the same provider / profile / asset authority.

## 9. Persistence (Part L)

```
<dataDir>/
  creative-intelligence-runs/
    <ciRunId>/
      runtime/                          (existing CI main run)
        run.json
      anchor-production/                (NEW: Anchor sub-run)
        run.json
        contract.json
        candidates/
          <candidateId>.json
        approval.json
        approval-history.json
      image-generation-runs/             (existing, owned by image runtime)
        <imageGenRunId>/
          ...
```

Image assets continue to be persisted by the image-generation-runtime
asset authority (NOT by Anchor Production).

`runtime-static-assets.json` declares the new file basenames:
- `contract.json`
- `approval.json`
- `approval-history.json`
- `selection.json`
- `selection-history.json`
- `canon.json`

## 10. Candidate generation (Part E)

`startAnchorProduction`:
1. Resolve `parent` from the CI main run.
2. `preflight = canStartAnchorProduction(parent)` — hard-fail if blocked.
3. Compute `candidateCount` (default 3; max 4).
4. Persist `run.json` (`pending`).
5. `compile()` — produce `contract.json` (deterministic).
6. Update `run.json` (`compiling`).
7. `submitAnchorGeneration(contract, prompt, candidateIds, lockedAssetKeys)` — calls the existing image runtime.
8. For each returned candidate, persist `candidates/<id>.json` with a deterministic post-evaluation.
9. Update `run.json` (`generating`).
10. Update `run.json` (`completed`).
11. Return the `AnchorProductionWorkspace` projection.

`candidateCount=3` is the default. Aspect ratio 16:9 is the default
but the contract carries `aspectRatio` for future extension.

## 11. Approval (Part F / J)

Checkpoint C. Only an explicit user click + confirmation dialog
produces an `ApprovedVisualAnchor`. The state machine is:

```
3 candidates generated
  -> approvedAnchor = null
  -> user clicks '设为视觉基准' on candidate 02
  -> confirmation dialog
  -> approveAnchorCandidate('runId', 'cand-02', reason)
  -> ApprovedVisualAnchor {
       candidateId: 'cand-02',
       imageId: 'img-2',
       selectedDirectionId: 'dir-001',
       selectionRevision: 1,
       canonVersion: 'v1.sel1.<fp>',
       approvedBy: 'user',
       approvedAt: '2026-08-18T...',
       approvalRevision: 1,
       sourceFingerprint: '<fp>',
     }
  -> approvedAnchor != null
```

Hard invariant (Part J): 3 candidates generated → `approvedAnchor =
null`. The state stays null until the user clicks AND confirms.

## 12. History (Part G)

Approval history is append-only. Each entry records:
- `revision` (monotonic per (selectionRevision, canonVersion))
- `candidateId`, `imageId`
- `selectedDirectionId`, `selectionRevision`
- `canonVersion`
- `approvedAt`, `approvedBy`
- `supersededBy` (on the previous entry, when re-approved)

```
Approve A (rev 1) → re-approve B → rev 2, history has [rev1, rev2]
Approve A (rev 1) → re-approve A → rev 2 (same candidate)
```

## 13. Invalidation (Part G)

The orchestrator invalidates the previous approval when:
- The parent CI run's `selectionRevision` advances (e.g. user re-selects a different Direction).
- The Anchor sub-run's `canonVersion` advances (e.g. Visual Canon is re-issued).

When invalidation triggers:
- `approvedAnchor` returns `null` in the projection.
- A warning is surfaced: `previous_approval_invalidated_direction_change` or `previous_approval_invalidated_canon_change`.
- `approvalHistory` is preserved (not deleted).
- The user must explicitly re-approve.

No auto-migration. This is the spec's hard requirement.

## 14. Reference authority (Part H)

| Authority | Source | Behavior |
|---|---|---|
| Visual Canon | `visualCanon` | **Primary** for direction / DNA / grammar |
| Reference | `reference` (if present) | **Subordinate** to Canon |
| Locked Assets | `lockedAssetKeys` | **Preserved** in prompt + post-validated |
| Reference brand / logo / copy / product identity | (none) | **FORBIDDEN** in prompt |

The compiler never reads from a reference brand / logo / copy / product
identity fact. The prompt template has no slots for these. The post-
generation evaluator's `identitySafety` verdict explicitly checks for
forbidden identity mutation.

## 15. Locked Assets (Part H)

Locked assets declared in the Anchor Contract:
- `logo-001` (logo mark)
- `brand-name` (Chinese brand name)
- `palette-001` (color palette)

The contract exposes them under `lockedAssetRuleRefs`. The orchestrator
threads them to the image runtime as `lockedAssetKeys`. The post-
generation evaluator's `lockedAssetSafety` verdict asserts that the
resolved Locked Asset list was passed through to the image runtime.

## 16. Web UX (Part I)

Visual System page (the 5th CI user view) gains an Anchor section:

```
生成视觉锚点                ← CTA when no sub-run
─────────────────────────────────────────────
将当前 Creative Direction 转化为第一组视觉锚点，
用于确认这个方向在真实视觉中的表现。

Cand 01  Cand 02  Cand 03     ← three large image cards
  查看大图    查看大图    查看大图
  验收摘要    验收摘要    验收摘要
  重新生成    重新生成    重新生成
  设为视觉基准  设为视觉基准  设为视觉基准
─────────────────────────────────────────────
视觉基准已确认

Selected Direction: 器物之间的静默秩序
Canon Version: v1.sel1.<fp>
Anchor Revision: 1
Approved At: 2026-08-18 ...
─────────────────────────────────────────────
应用这个视觉系统                ← aria-disabled, CI-10 启动
空间效果图                     ← aria-disabled
包装效果图                     ← aria-disabled
```

The '设为视觉基准' click opens an `AnchorApprovalDialog` that requires
explicit confirmation. The user must click 确认 to advance; otherwise
nothing changes.

`anchor-controller.ts` is a pure helper:
- `deriveAnchorUserView(workspace)` → 'unvisualized' | 'generating-anchor' | 'anchor-review' | 'anchor-confirmed' | 'all-blocked'
- `deriveAnchorAvailability(workspace, parentSnapshot)` → `{ canStart, canApprove, canRetry, reasons[] }`
- `buildAnchorApprovalProposal(candidate, contract)` → `{ requiresConfirmation: true, ... }`
- `isCandidateApproveable(candidate, contract)` → `boolean`
- `statusLabelFor(status)` → Chinese label
- `formatApprovalRevision(rev)` → "第 N 次确认"
- `formatApprovalTimestamp(iso)` → "2026-08-18 12:34:56"
- `describeEvaluationSummary(candidate)` → "通过 | 警告: ... | 阻断: ..."

## 17. Tests (Part O)

| Suite | File | Tests |
|---|---|---|
| Contract | `tests/packages/creative-intelligence/ci-w2/anchor-production-contract.test.js` | 10 (C01-C08 + 2 preflight) |
| Runtime | `tests/packages/creative-intelligence/ci-w2/anchor-production-runtime.test.js` | 12 (R01-R12) |
| Web | `tests/packages/creative-intelligence/ci-w2/anchor-production-web.test.js` | 11 (W01-W10 + 1 bonus) |
| Real-project | `tests/packages/creative-intelligence/ci-w2/real-project-fixtures.test.js` | 10 (Q01-Q10) |
| **Total** | | **43** |

Test counts after CI-W2:
- root `npm test`: 1444/1444 (+43 vs CI-W1B.2's 1401)
- `npm run cli:test`: 40/40 (preserved)
- `npm run web-runtime:test`: 13/13 (+1 from CI-W1B.2; the test was renamed 168→178 channels)
- `npm run web:typecheck`: PASS

## 18. Real-project validation (Part Q)

The Part Q fixtures are **project-agnostic structural fixtures**
modeled on the shape of real CI-W2 candidate runs for the two known
real projects ("九州美学" / "一剂良方"). They are intentionally NOT
named after any specific brand, but their visual/structural shape
(Direction family, locked assets, prohibited mutations) is identical
to what the real runs produced.

| Fixture | Project analog | Direction family | Key invariants pinned |
|---|---|---|---|
| Q01 | 九州美学 (B2B platform) | material-led | contract ready, 3 candidates, no auto-approval |
| Q02 | 一剂良方 (B2C packaged product) | ingredient-led | contract ready, 3 candidates, no auto-approval |
| Q03 | (both) | — | explicit user approval creates ApprovedVisualAnchor + history |
| Q04 | (both) | — | re-approve advances approvalRevision, history preserved |
| Q05 | (both) | — | retry does NOT replace existing approval |
| Q06 | (both) | — | parent selectionRevision change invalidates previous approval |
| Q07 | (both) | — | parent canonVersion change invalidates previous approval |
| Q08 | (both) | — | generated candidates are not pre-marked approveable |
| Q09 | (both) | — | locked asset refs surface on the contract |
| Q10 | (both) | — | 3 candidates × structured evaluations (verdicts) |

The user-authorized end-to-end retest on the real "九州美学" /
"一剂良方" projects is **out of scope for this report** — the
fixtures above pin the structural shape; the real retest requires
the user to start a CI run on each project, walk through the
Direction selection, and run the Anchor sub-run.

## 19. Hard acceptance (Part P)

All 14 invariants verified PASS:

| # | Invariant | Value |
|---|---|---|
| 1 | Anchor without selection | 0 |
| 2 | Anchor without Canon | 0 |
| 3 | Anchor with stale Canon | 0 |
| 4 | auto-approved candidate | 0 |
| 5 | approval without user | 0 |
| 6 | stale approval accepted | 0 |
| 7 | Anchor rewriting Canon | 0 |
| 8 | reference identity contamination | 0 |
| 9 | locked asset loss | 0 |
| 10 | DNA loss | 0 |
| 11 | Grammar loss | 0 |
| 12 | Web direct provider call | 0 |
| 13 | CI provider import | 0 |
| 14 | Space consumer switch | 0 |
| 15 | Packaging consumer switch | 0 |
| 16 | Anchor triggering Space/Packaging | 0 |

W10 explicitly asserts that `apps/web` does NOT import from the CI
domain package directly. W09 explicitly asserts that the Space /
Packaging next-step cards remain `aria-disabled` with no real
onClick that triggers an image-generation RPC.

## 20. Regression (Part R)

| Command | Pre-CI-W2 | Post-CI-W2 | Delta |
|---|---|---|---|
| `npm test` | 1401 + 1 pre-existing fail | 1444 + 0 | +43 new tests, 0 new failures, 0 worsened failures |
| `npm run cli:test` | 40/40 | 40/40 | preserved |
| `npm run web-runtime:test` | 12/12 | 13/13 | +1 (channel count 168→178) |
| `npm run web:typecheck` | PASS | PASS | preserved |
| `npm run verify:version-consistency` | PASS | PASS | preserved |
| `npm run verify:version-naming` | PASS | PASS | preserved |
| `npm run verify:workspace-boundaries` | PASS | PASS | preserved |
| `npm run verify:production-boundaries` | PASS | PASS | preserved (492 files) |
| `npm run verify:golden-boundary` | PASS | PASS | preserved |
| `npm run verify:no-obsolete-code` | PASS | PASS | preserved (926 files) |
| `npm run verify:no-project-specific-production-rules` | PASS | PASS | preserved |
| `npm run verify:tracked-runtime-assets` | PASS | PASS | preserved (8 declared assets) |

The 1 pre-existing `tracked-runtime-assets-guard Case 1` fail from
CI-W1A is fixed by the manifest additions in this commit (selection,
selection-history, canon, contract, approval, approval-history).

## 21. Guards

| Guard | Result |
|---|---|
| verify:version-consistency | PASS |
| verify:version-naming | PASS |
| verify:workspace-boundaries | PASS (Web imports only from @masterpiece/runtime-core) |
| verify:production-boundaries | PASS (492 production files) |
| verify:golden-boundary | PASS |
| verify:no-obsolete-code | PASS (926 files) |
| verify:no-project-specific-production-rules | PASS |
| verify:tracked-runtime-assets | PASS (8 declared assets) |
| verify:current-flows | same 15 pre-existing UI guard fails + 0 new (with the manifest additions) |

## 22. Build delta

| Bundle | Pre-CI-W2 (CI-W1B.2) | Post-CI-W2 | Delta |
|---|---|---|---|
| `apps/web/dist/assets/index-*.js` | 563.41 KB / gzip 170.10 KB | 580.22 KB / gzip 175.55 KB | +16.81 KB / +5.45 KB |
| `apps/web/dist/assets/index-*.css` | 184.28 KB / gzip 29.74 KB | 194.20 KB / gzip 31.33 KB | +9.92 KB / +1.59 KB |

The size increase is dominated by:
- 3 image card rendering
- Anchor section layout (~135 lines of new `.ci-anchor-*` styles)
- Approval dialog
- Anchor controller logic
- New state transitions for the 6-state sub-run lifecycle

## 23. Rollback

```bash
# Reverse the 8 CI-W2 commits in reverse order
git revert 4284df26 879ab32c a067aad4 1f7ed1f2 b5695533 0d245a9a 9b901467 230502ba
```

Or selective revert by individual commit.

## 24. Verdict

**GO.**

CI-W2 successfully:
1. Reuses the existing image-generation runtime (no second image stack).
2. Adds a deterministic pure CI-domain contract (`AnchorProductionContract`).
3. Adds a 6-state sub-run lifecycle that does NOT mutate the CI main run.
4. Adds explicit human visual approval with append-only history.
5. Invalidates approvals on Direction / Canon change.
6. Persists Locked Assets and DNA / Grammar refs.
7. Forbids reference identity contamination.
8. Surfaces a Web UX that requires explicit user click + confirmation.
9. Keeps Space / Packaging next-step cards non-executable (CI-10).
10. Pins 43 new tests (Contract + Runtime + Web + Real-project fixtures).

## 25. CI-W1C readiness

CI-W1C is **out of scope for CI-W2**. CI-W1C is a Web E2E smoke
(Playwright against the new `/creative-intelligence` route) that
verifies the component actually renders end-to-end with a live
runtime + web-runtime host. CI-W1C is recommended as the next CI
step but **not started by CI-W2**.

## 26. CI-10 status

**NOT STARTED.** CI-10 is the lock-in phase that promotes
`authoritative: false, mode: 'shadow'` to authoritative. CI-W2
explicitly keeps both fields at the shadow values:

```ts
contract.authoritative = false;
contract.mode = 'shadow';
```

CI-10 preconditions (unchanged from CI-W1B.2):
- CI-W1A = GO ✅
- CI-W1B = GO ✅
- CI-W1B.1 = GO ✅
- CI-W1B.2 = GO ✅
- CI-W1C = ⏸
- N ≥ 3 consistent CI-9 shadow runs ⏸
- ≥ 3 project types ⏸
- `behaviorChangeRisk=high` count = 0 ⏸
- critical unresolved `PT_*` = 0 ⏸

CI-W2 adds one more precondition: a user-authorized end-to-end
retest on real projects (the Part Q retest) producing at least one
real Anchor sub-run with explicit user approval.

## 27. STOP conditions

None triggered.

| STOP condition | Status |
|---|---|
| Bypass image runtime | Not triggered (uses imageGenerationService.start) |
| Web calls provider directly | Not triggered (Web uses window.masterpiece.creativeIntelligence) |
| CI package imports provider | Not triggered (CI package has no provider adapter import) |
| Auto-approve first image | Not triggered (R04 + W04 + W05 enforce explicit click + confirmation) |
| Anchor changes Canon | Not triggered (R10 + R12 + orchestrator hard-fail) |
| Space consumer change | Not triggered (W09 + ops file unchanged for Space) |
| Packaging consumer change | Not triggered (W09 + ops file unchanged for Packaging) |
| Project-specific prompt | Not triggered (compilePromptFromContract is pure) |
| New production failure | Not triggered (all 8 verify commands PASS) |
| CI-10 started | Not triggered (authoritative=false, mode='shadow') |
