# CI-W1C.1 — Anchor → V3 Image Runtime Authority Repair

> **Status:** DEVELOPMENT / REPAIR SPEC  
> **Date:** 2026-08-18  
> **Target Branch:** `feat/short-chain-simplified-ui`  
> **Baseline HEAD:** `2a70a62a` (CI-W1C final)  
> **Previous Phase:** CI-W1C Attempt 1 = **HOLD — NOT READY**  
> **Primary Trigger:** Real Web E2E E11 reached Anchor dispatch but V3 image-generation sub-run was BLOCKED by Runtime authority mismatch  
> **CI-10:** NOT STARTED  
> **Consumer Switch:** FORBIDDEN  
> **Scope:** Runtime authority repair only

(Full report populated at the end of the CI-W1C.1 phase. This file
holds the baseline + plan, then is updated with the implementation,
regression, and verdict.)

---

## 1. Baseline (PART 0)

```text
HEAD                   = 2a70a62a
local == origin        = YES
working tree           = clean
authoritative chain    = 2a70a62a
                      ← 11c99189  CI-W1C report (HOLD)
                      ← 63e5c0a2  CI-W1C E2E harness scripts
                      ← 6e597f51  CI-W1C.0.3 (V3 sourcePreset/deliverable)
                      ← b43fb86e  CI-W1C.0.2 (V3 compileRunId)
                      ← 68614fca  CI-W1C.0.1 (await buildWorkspaceView)
                      ← 99477f0d  CI-W1C.0   (readDataDir dataPath)
                      ← 6a6e4a42  CI-W2 final
```

---

## 2. PART A — Pre-fix E11 reproduction

| Field | Value | Source |
|---|---|---|
| `analysisApiProfileId` | `profile-9eb57f7e-7bc5-4214-b325-a013ff1f8eca` | E11 RPC env |
| `analysisModelId` | `qwen3.6-plus` | project.json.model |
| `imageApiProfileId` | `profile-e871b4c5-7499-4749-b838-02410ad19cb1` | E11 RPC env |
| `explicit modelId` | `qwen3.6-plus` | runtime-services.ts submitAnchorGeneration (from `parent.model`) |
| `resolved provider` | `dashscope` | image-gen run.json.providerId (WRONG — should be `volcengine`) |
| `resolved model` | `qwen3.6-plus` | image-gen run.json.modelId (WRONG — should be `doubao-seedream-5-0-pro-260628`) |
| `sourcePreset` | `visual_analysis` | image-gen run.json.sourcePreset (CI-W1C.0.3) |
| `deliverable` | `anchor_image` | image-gen run.json.deliverable (CI-W1C.0.3) |
| `purpose` | `creative_anchor` | image-gen run.json.purpose |
| `projectId` | `590eadf2-76cb-4042-a034-db93481b06c9` | real JZMX projectId |
| `ciRunId` | `6635d5c9-915b-4115-95bb-d7f59849000d` | CI main run id |
| `anchorRunId` | `f67f6322-8600-411e-a1f6-659d6ee9daf1` | anchor sub-run id |
| `imageGenerationRunId` | `0f733b75-fd41-48d8-ac7b-fdacf60662cb` | image-gen sub-run id |
| `aspectRatio` | `16:9` | runtime-services.ts hard-coded |
| `size` | `2560*1440` | runtime-services.ts hard-coded |
| `errorCode` | `ASPECT_OR_SIZE_UNSUPPORTED` | image-gen run.json.errorCode |

The three runtime authority issues are:

1. **Analysis model override** — orchestrator passes `parent.model`
   (the analysis model) as the explicit `modelId`; the V3 path
   treats the explicit `modelId` as authoritative and resolves
   to the analysis provider / model, which has no image-gen
   capability.
2. **V3 source-preset semantics** — `visual_analysis` reads the
   project's `project-visual-context.json`; the CI-W2 anchor's
   actual semantic source is `SelectedDirectionSnapshot +
   VisualCanon + AnchorContract + LockedAssets` (CI run
   artifacts, not project visual context). The existing
   `visual_analysis` preset happens to be runnable because it
   only needs `projectId`; the **compiled prompt** carries the
   Canon / Direction / Locked-Asset information into the image
   runtime.
3. **virtualProjectId confusion** — the orchestrator does NOT
   actually pass `ciRunId` as `projectId` (the runtime layer
   preserves the real `projectId` from the run record). This
   issue is **not present in the current code**; the G01 E11
   reproduction shows the V3 path resolved `projectId` correctly
   to the real project. We will lock this in with a regression
   test (A04) regardless.

---

## 3. PART B — Model Authority (the P0 fix)

Current code in `packages/runtime-core/src/application/runtime-services.ts:190-241`:

```ts
const compileResult = await imageGeneration.compile({
  sources: compileSources,
  projectId: input.projectId ?? undefined,
  apiProfileId: input.apiProfileId,
  modelId: input.modelId,                 // ← BUG: input.modelId is parent.model (analysis)
  size: '2560*1440',
  dryRun: false,
});
const compileRunId = compileResult.run.runId;
const run = await imageGeneration.start({
  sources: compileSources,
  compileRunId,
  projectId: input.projectId ?? undefined,
  apiProfileId: input.apiProfileId,
  modelId: input.modelId,                 // ← BUG: same
  size: '2560*1440',
  dryRun: false,
});
```

Fix: **omit `modelId` entirely**. `resolveProviderConfig` falls
through to `readCredentials(apiProfileId)` which returns the
profile's `model` field (Seedream → `doubao-seedream-5-0-pro-260628`).
The V3 path then resolves `provider = volcengine` (from credentials)
and `model = doubao-seedream-5-0-pro-260628` (the Seedream API model
name, NOT the registry id `seedream-5.0-pro`).

If a future contract MUST carry an explicit `modelId`, it must
come from the image-profile resolution, never from the analysis
run. We will not add a special carve-out for Anchor; the rule is
"image profile is the sole authority for the image `modelId`".

---

## 4. PART C — No Analysis Profile Fallback (fail closed)

Add a new canonical error code `CI_ANCHOR_IMAGE_PROFILE_REQUIRED`
in the anchor orchestrator. If the caller does not pass
`apiProfileId` (i.e. `options?.apiProfileId ?? parent.apiProfileId`
is `undefined`), throw `CI_ANCHOR_IMAGE_PROFILE_REQUIRED` before
calling `submitAnchorGeneration`. No fallback to the analysis
profile under any circumstance.

---

## 5. PART D — V3 Preset Audit (reuse vs add)

Existing V3 `GenerationSourcePreset` enum:

| Preset | Legacy loader | Required inputs |
|---|---|---|
| `visual_analysis` | `visual_extension` | `projectId` |
| `document_context` | `document_concept` | `documentRunId` |
| `reference_anchor` | `reference_preview` | `referenceAnchorRunId` |
| `integrated_context` | `integrated_anchor` | `projectId` AND `referenceAnchorRunId` |

Audit conclusion: **no existing V3 preset exactly matches the
Canon-led Anchor flow**. `visual_analysis` is the closest
match (it only requires `projectId` and uses the project's
existing visual context), but its loader pulls project
visual context + project assets as references, which is
NOT what CI-W2 anchor needs (the anchor's references are
the run's SelectedDirectionSnapshot + VisualCanon +
AnchorContract + LockedAssets — these are all encoded in
the **compiled prompt**, not pulled from disk).

Decision: **reuse `visual_analysis` (preferred per PART D §1
"Reuse correct existing V3 preset")**. The compiled prompt
already carries the CI-W2 Anchor Contract's
`mustDemonstrate` / `mustPreserve` / `mayExplore` /
`mustNotChange` / locked-asset rules (per `packages/creative-intelligence/src/anchor-production/contracts.ts`).
The V3 visual-source-loader adds the project's visual
context as supplementary reference, which is appropriate
(the project IS the canonical visual ground truth for the
brand identity).

If `visual_analysis` proves insufficient during PART H real
provider execution, we will add a durable `visual_canon`
preset in a follow-up commit. The spec explicitly prefers
reuse over new presets.

---

## 6. PART E — Identity Model

`projectId` must be the real Masterpiece project id. The current
runtime-core path preserves this correctly (the orchestrator
passes `parent.projectId` from the CI run record, which is set
from the E03 `start` RPC `projectId` argument). The image
runtime resolves asset paths and the image-generation storage
scope from `projectId`. We add a regression test (A04) to
lock this in.

The four identities are already separated in the current code:

| Field | Source | Storage scope |
|---|---|---|
| `projectId` | E03 RPC `projectId` | project asset lookup, image-gen storage |
| `creativeIntelligenceRunId` | `run.id` | CI run artifacts |
| `anchorRunId` | `anchorRunProduction` (locally minted `makeRunId()`) | anchor sub-run artifacts |
| `imageGenerationRunId` | `imageGeneration.start` returns `run.runId` | image-gen run artifacts |

No code change required; add a regression test (A05, A06) to
lock in the separation.

---

## 7. PART F — V3 Contract (preserve compile + start)

CI-W1C.0.2 (commit `b43fb86e`) established the canonical V3 flow
`compile() → compileRunId → start()`. This phase PRESERVES
that flow. The PART B fix is the only behavioral change to
`submitAnchorGeneration`; the compile + start lifecycle
remains.

---

## 8. PART G — Size / Capability (use resolved image model)

After PART B, the resolved image model is
`doubao-seedream-5-0-pro-260628` (Seedream 5.0 Pro). The
capability gate runs against the **resolved** model, not the
analysis model. We retain the explicit `size: '2560*1440'`
hard-code for the Anchor flow; the gate is now expected to
PASS for `2560*1440` 16:9 (Seedream supports 2K and 4K variants
of 16:9). If a future image model rejects `2560*1440`, the
runtime capability resolution should fall back to a supported
16:9 size; this is a runtime capability concern, not an
Anchor concern. No project-specific hardcode in the
Anchor path.

---

## 9. PART H — Real Provider Evidence

The drive script `apps/web-runtime/scripts/ci-w1c/drive-ci-workflow.mjs`
already drives the full E01–E13 sequence. After PART B + PART C,
G01 E2E should reach E13 with:

- `resolvedModelId != analysisModelId`
- `resolvedProvider = volcengine` (or `seedream-image` protocol)
- 3 actual image candidates on disk at
  `C:\Users\Administrator\Documents\Masterpiece OS Data\projects\九州美学-590eadf2\image-generation\<subRunId>\images\image-01.png` etc.
- `approvedAnchor` is **null** until the user explicitly approves

A new probe script `apps/web-runtime/scripts/ci-w1c/probe-anchor-v3-authority.mjs`
will collect the per-run evidence (resolved model, candidates,
approval) into `.codex-smoke/ci-w1c/<run-alias>/authority.json`.

---

## 10. PART I — Approval

Drive script E13 already drives the explicit
`approve-anchor-candidate` RPC after the 3 candidates are
generated. We add a `stop after E13` mode so the CI-W1C.1
repair evidence captures the approval state without running
E14+.

---

## 11. PART J — Regression Suite (Authority)

| Test | Assertion |
|---|---|
| A01 | `parent.model = qwen3.6-plus` + `imageApiProfile = Seedream` → `imageGeneration.start.modelId != qwen3.6-plus` |
| A02 | `imageApiProfileId = Seedream` → resolved provider = `volcengine`, resolved model = `doubao-seedream-5-0-pro-260628` |
| A03 | `submitAnchorGeneration({apiProfileId, modelId: 'qwen3.6-plus'})` → throws OR ignores `modelId`; result.modelId != `qwen3.6-plus` |
| A04 | `submitAnchorGeneration({projectId: 'real', ...})` → image-gen run.projectId == `'real'` (no virtualProjectId) |
| A05 | `submitAnchorGeneration({...})` → image-gen run carries a separate `imageGenerationRunId` (does not collide with `anchorRunId` or `ciRunId`) |
| A06 | Anchor orchestrator mints a separate `anchorRunId` (does not collide with `imageGenerationRunId`) |
| A07 | Canon-led Anchor flow works without a Reference Anchor (no `referenceAnchorRunId` is set on the V3 source bundle) |
| A08 | `imageGeneration.compile()` then `imageGeneration.start({compileRunId})` — the canonical V3 lifecycle is preserved |

---

## 12. PART M — Hard Acceptance (PART M)

All of the following must be **0**:

- analysis model used as image model
- wrong provider resolved for anchor
- `virtualProjectId = ciRunId`
- Reference Anchor required for Canon-only flow
- Web direct provider call
- CI package provider import
- Anchor direct provider bypass
- Anchor without valid Canon
- auto-approved Anchor
- stale approval accepted
- Anchor modifies Canon
- Space consumer switch
- Packaging consumer switch
- project-specific routing
- new production regression
- CI-10 work

All of the following must be **PASS**:

- real `projectId` preserved
- `ciRunId` preserved separately
- `anchorRunId` preserved separately
- image profile authoritative
- resolved image model correct
- V3 compile PASS
- V3 start PASS
- real provider executes
- 3 candidates persisted
- `approvedAnchor` initially null
- explicit approval works
- approval persists

---

## 13. PART N — Full Report (to be filled in at end of phase)

The final report replaces this section with:

1. Baseline HEAD
2. Final Implementation HEAD
3. Documentation Commit
4. Commits
5. CI-W1C HOLD context
6. Pre-fix E11 reproduction
7. Analysis vs image model authority
8. Image profile resolution
9. V3 source preset audit
10. Preset decision
11. Project identity audit
12. projectId / ciRunId / anchorRunId separation
13. Reference requirement decision
14. Document requirement decision
15. V3 compile/start lifecycle
16. image model capability resolution
17. size/aspect resolution
18. real provider evidence
19. candidate persistence
20. no-auto-approval proof
21. explicit approval proof
22. approval persistence
23. Web boundary proof
24. CI package boundary proof
25. Space/Packaging unchanged
26. hard acceptance
27. full regression
28. guards
29. build delta
30. behavior drift
31. rollback
32. verdict
33. CI-W1C Attempt 2 readiness
34. CI-10 status

---

## 14. STOP CONDITIONS

The phase immediately STOPS if any of:

- V3 cannot represent Canon-led Anchor without semantic hacks
- must fake Reference Anchor
- must fake Document Context
- must use `ciRunId` as `projectId`
- must pass analysis model into image runtime
- must bypass image runtime directly to provider
- must change CI semantics
- must change Canon semantics
- must change Anchor approval semantics
- must switch Space/Packaging consumer
- must add project-specific production rule
- new high-severity production regression
- CI-10 starts

If CI-W1C.1 is **GO**: STOP. Wait for user authorization to
restart **CI-W1C Attempt 2** from Run 1 (the repair run does
not count toward the N ≥ 3 qualified real runs gate; Attempt 1
also does not count; only Attempt 2 onwards count).
