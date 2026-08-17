# CI-8 · Visual Canon & Anchor Contract

> **Status:** GO  
> **Phase:** Creative Intelligence — CI-8  
> **Baseline:** `34486db` (CI-7 final)  
> **Implementation HEAD:** `ea54aee` (shadow + tests)  
> **Documentation commit:** `5d34683`  
> **Branch:** `feat/short-chain-simplified-ui`

---

## 0. Executive Summary

CI-8 introduces the first **Creative Freeze** layer.

The chain has now reached the first user-authorized decision boundary:

```
Project Truth → Need → Insight → Opportunity → Concept → Direction →
Evaluation → Recommendation → Explicit User Selection → Selected Direction →
SelectedDirectionSnapshot → Visual Canon → Visual DNA → Visual Grammar →
Cross-Media Canon → Anchor Contract → SHADOW / PRE-PRODUCTION ONLY
```

**Hard entry rules:**

```
selection.status = selected
selectedDirectionId != null
selectedBy = user
selectionSource = explicit_user_action
selection is not invalidated
Direction fingerprint is fresh

Recommendation alone MUST NOT create Canon.
```

**Hard acceptance: 0 failures across all 13 metrics.**

---

## 1. Baseline

| Phase | Tests | Status |
|---|---|---|
| CI-1 Foundation & Boundary | 17/17 | PASS |
| CI-2 Project Truth & Evidence | 84/84 | PASS |
| CI-3 Document Intelligence Core | 38/38 | PASS |
| CI-4 Need & Insight Intelligence | 38/38 | PASS |
| CI-5 Concept Intelligence | 39/39 | PASS |
| CI-6 Direction Intelligence | 39/39 | PASS |
| CI-7 Evaluation & User Selection | 48/48 | PASS |
| **Total pre-CI-8** | **318/318** | **PASS** |

Production file count before CI-8: **450**

---

## 2. Implementation

### Commits

| # | Hash | Message |
|---|---|---|
| 1 | `fd999899` | feat(ci): add visual-canon and anchor-contract namespaces (CI-8) |
| 2 | `ea54aee` | feat(ci): add CI-8 visual canon shadow integration and tests (CI-8) |
| 3 | `5d34683` | docs(ci): record CI-8 visual canon and anchor contract |

### Package Structure

```
packages/creative-intelligence/src/visual-canon/
├── index.ts                       # Public API
├── contracts.ts                   # VisualCanon / DNA / Grammar / Trace / Diff
├── diagnostics.ts                 # Stable diagnostic codes
├── selected-direction-snapshot.ts # Build immutable snapshot + freshness
├── build-visual-canon.ts          # Top-level orchestrator
├── visual-dna.ts                  # 8 DNA categories
├── visual-grammar.ts              # Composition/hierarchy/asset/crossMedia rules
├── cross-media-canon.ts           # 6 touchpoint adaptations
├── canon-validator.ts             # Drift guard + status propagation
└── canon-diff.ts                  # Deterministic diff + version

packages/creative-intelligence/src/anchor-contract/
├── index.ts                       # Public API
├── contracts.ts                   # AnchorContract + AnchorEvaluationCriterion
├── diagnostics.ts                 # Stable diagnostic codes
├── build-anchor-contract.ts       # Build anchor from VisualCanon
├── anchor-validator.ts            # Coverage + leakage validation
└── anchor-boundary.ts             # 17 forbidden field names + 10 text patterns
```

10 + 6 = 16 new source files.

### Package Exports Added

```json
{
  "./visual-canon": "./src/visual-canon/index.ts",
  "./visual-canon/*": "./src/visual-canon/*",
  "./anchor-contract": "./src/anchor-contract/index.ts",
  "./anchor-contract/*": "./src/anchor-contract/*"
}
```

No breaking changes to existing exports.

---

## 3. SelectedDirectionSnapshot

```ts
interface SelectedDirectionSnapshot {
  schemaVersion: '0.1';
  projectId: string;
  directionId: string;
  selectionRevision: number;
  selectedAt: string;
  selectedBy: 'user';
  directionFingerprint: string;  // FNV-1a hash of stable fields
  direction: CreativeDirectionCandidate;
  evaluationSnapshot?: { ... };
  traceVersion: string;
}
```

Immutable by convention. Stable fingerprint derived from direction identity
fields via FNV-1a 32-bit hash. Prevents downstream drift.

**Entry rules** (Spec #4-6):
- `selection.status === 'selected'`
- `selectedBy === 'user'`
- `selectionSource === 'explicit_user_action'`
- `selectedDirectionId` exists and matches direction
- `direction.status !== 'blocked'`
- `directionFingerprint` matches if provided

Any violation → snapshot = null, diagnostic emitted.

---

## 4. Visual Canon

```ts
interface VisualCanon {
  schemaVersion: '0.1';
  projectId: string;
  selectedDirectionId: string;
  selectionRevision: number;

  creativeThesis: string;
  visualMechanism: string;
  systemHypothesis: string;
  directionFamily: DirectionFamily;

  colorRelationship?: CanonRule;
  materialRelationship?: CanonRule;
  compositionLogic?: CanonRule;
  typographyBehavior?: CanonRule;
  graphicBehavior?: CanonRule;
  imageBehavior?: CanonRule;

  visualDNA: VisualDNA;
  visualGrammar: VisualGrammar;
  crossMediaCanon: CrossMediaCanon;
  lockedAssetRules: LockedAssetCanonRule[];

  prohibitedMutations: string[];

  trace: CanonTrace;
  status: 'valid' | 'provisional' | 'blocked';

  authoritative: false;
  mode: 'shadow';
}
```

### CanonRule

```ts
interface CanonRule {
  id: string;
  statement: string;
  sourceField: string;          // must be a field of the selected Direction
  invariantLevel: 'hard' | 'strong' | 'adaptive';
  allowedVariation?: string[];
  prohibitedVariation?: string[];
  factRefs: string[];
  evidenceRefs: string[];
}
```

**Invariant levels** (Spec #17):
- `hard` — cannot change downstream (brand identity, visual mechanism, direction family)
- `strong` — may adapt slightly but must preserve relation (composition rhythm, typography behavior)
- `adaptive` — may change per touchpoint if higher-level DNA remains intact (image crop, format ratio)

### Status Propagation (Spec #36)

```
selected grounded Direction      → Canon valid
selected provisional Direction   → Canon provisional
selected blocked/invalidated      → Canon blocked
```

---

## 5. Visual DNA

5 mandatory + 3 optional categories:

| Category | Required | Notes |
|---|---|---|
| `structuralDNA` | ✓ | from directionFamily + visualMechanism |
| `identityDNA` | ✓ | from brand identity + locked assets |
| `rhythmDNA` | conditional | from compositionLogic |
| `hierarchyDNA` | ✓ | from direction system logic |
| `relationDNA` | ✓ | from crossMediaBehavior |
| `colorDNA` | optional | from colorRelationship |
| `materialDNA` | optional | from materialRelationship |
| `graphicDNA` | optional | from graphicBehavior |

**DNA must be semantic/system-level, NOT pixel implementation specs.**

Allowed:
- "Independent modules remain visually distinct while relation logic remains visible."

Forbidden:
- "Use Pantone 2665 C."
- "Use exactly 40px spacing."

---

## 6. Visual Grammar

6 rule categories + 1 forbidden category:

| Category | Purpose |
|---|---|
| `compositionRules` | maintain directional relationship grammar |
| `hierarchyRules` | hierarchy expresses system coordination |
| `repetitionRules` | allow system-pattern repetition |
| `transformationRules` | allow scale/re-proportion |
| `assetUsageRules` | locked assets only activate/position/repeat |
| `crossMediaAdaptationRules` | cross-media must preserve required DNA |
| `forbiddenCombinations` | hard blocks for identity-rewrite / locked-redesign |

**Grammar may NOT become prompt.**

Allowed: "Maintain a visible relationship between autonomous modules."
Forbidden: "Generate a 16:9 poster with 8 modules in the top-left corner."

---

## 7. Cross-Media Canon

6 touchpoints, each with:

```ts
{
  mustPreserve: string[];      // hard DNA
  mayAdapt: string[];          // strong/adaptive + execution
  mustNotIntroduce: string[];  // prohibited mutations
}
```

### Space Boundary (Spec #29)

Allowed: relational hierarchy, locked identity assets, scale/density adaptation.
Forbidden: specific lobby layout, exact material spec, camera angle, lighting prompt.

### Packaging Boundary (Spec #30)

Allowed: modular identity grammar, information density adaptation, required brand hierarchy.
Forbidden: specific box geometry, shot contract, render prompt.

---

## 8. Locked Asset Canon

```ts
interface LockedAssetCanonRule {
  assetType: string;
  action: 'preserve' | 'activate' | 'position' | 'repeat' | 'contextualize';
  prohibitedActions: string[];   // always: redesign, replace, distort, invent
  factRefs: string[];
  evidenceRefs: string[];
}
```

**Hard rule (Spec #32):** Canon may define how a locked asset behaves. Canon may NOT redefine the asset itself.

---

## 9. Canon Trace

```ts
interface CanonTrace {
  selectedDirectionRef: string;
  conceptRefs: string[];
  opportunityRefs: string[];
  insightRefs: string[];
  needRefs: string[];
  factRefs: string[];
  evidenceRefs: string[];
  selectionRevision: number;
  directionFingerprint: string;
}
```

**Hard target: Canon trace closure = 100%.**

Validator detects:
- dangling refs at every layer
- trace incompleteness
- canon rule without source

---

## 10. Canon Drift Guard

Canon must NOT introduce (Spec #60):
- new visual mechanism
- new direction family
- new unsupported motif
- new brand identity
- unauthorized Locked Asset behavior

Detected by `validateCanon()`:
- `CANON_DRIFT_NEW_FAMILY` — directionFamily drift
- `CANON_DRIFT_NEW_BRAND` — unknown brand token in visualMechanism
- `CANON_DRIFT_NEW_MECHANISM` — CanonRule sourceField not in Direction fields
- `CANON_LOCKED_ASSET_VIOLATION` — locked asset rules not in prohibitedActions
- `CANON_RULE_UNGROUNDED` — CanonRule without fact/evidence trace

Any block-level diagnostic → Canon status = `blocked`, Canon = null.

---

## 11. Canon Diff & Versioning

```ts
interface VisualCanonDiff {
  changedDirection: boolean;
  addedRules: string[];
  removedRules: string[];
  changedRules: string[];
  changedDNA: string[];
  changedGrammar: string[];
  invalidatedDownstreamArtifacts: string[];
  requiresRecompile: boolean;
}
```

Version: `v{revision}-{fingerprint-prefix}`

**No production recompile in CI-8.** Diff is informational only.

---

## 12. Anchor Contract

```ts
interface AnchorContract {
  schemaVersion: '0.1';
  projectId: string;
  selectedDirectionId: string;
  selectionRevision: number;

  purpose: string;
  mustDemonstrate: string[];
  mustPreserve: string[];
  mayExplore: string[];
  mustNotChange: string[];

  requiredDNARefs: string[];       // all hard DNA
  requiredGrammarRefs: string[];   // all hard Grammar rules
  lockedAssetRefs: string[];

  crossMediaProof?: string[];

  evaluationCriteria: AnchorEvaluationCriterion[];

  status: 'ready' | 'provisional' | 'blocked';
  authoritative: false;
  mode: 'shadow';
}
```

**Anchor Contract is an acceptance contract, NOT a prompt.**

### Required Coverage (Spec #75)

- all hard DNA
- all hard Grammar
- all Locked Asset rules
- selected Direction visualMechanism

### Prompt Leakage Guard

Forbidden field names (17):
`prompt`, `negativePrompt`, `provider`, `model`, `seed`, `aspectRatio`, `camera`, `render`, `generate`, `imageRequest`, `imageGenerationRequest`, `spacePrompt`, `packagingPrompt`, `shotContract`, `renderPrompt`, `imageSeed`, `imageSpec`

Forbidden text patterns (10):
- `Generate a 16:9` / `Render a 16:9`
- `Specific lobby / box layout`
- `Camera angle`
- `Render prompt`
- `use midjourney/dalle/qwen/stablediffusion/sora`
- `seed: 12345`
- `aspect ratio: 16:9`
- `negative prompt:`

---

## 13. Shadow Artifacts

### SelectedDirectionSnapshot

`creative-intelligence-shadow/selected-direction-snapshot.json`

```json
{
  "schemaVersion": "0.1",
  "authoritative": false,
  "mode": "shadow",
  "projectId": "...",
  "ciVersion": "...",
  "generatedAt": "...",
  "snapshot": null,
  "diagnostics": ["CANON_SELECTION_REQUIRED: ..."]
}
```

When no user selection: `snapshot = null` + `CANON_SELECTION_REQUIRED` diagnostic.
**visual-canon.json and anchor-contract.json are NOT written when no selection** (Golden fixture).

Total shadow artifacts after CI-8: **15 files** (6 base + doc-intel + 3 NICE + concept + direction + evaluation + selection + selected-direction-snapshot).

---

## 14. Golden Scenarios (12+2)

| # | Scenario | Result |
|---|---|---|
| 1 | no selection | snapshot=null, CANON_SELECTION_REQUIRED |
| 2 | selected grounded Direction | Canon valid, Anchor ready |
| 3 | selected provisional Direction | Canon provisional, Anchor provisional |
| 4 | selected Direction invalidated | snapshot=null, CANON_SELECTION_INVALIDATED |
| 5 | user changes selection | new revision, new Canon, requiresRecompile=true |
| 6 | locked-asset-heavy | rules for all locked asset types |
| 7 | packaging-capable | no box geometry/shot contract in mustNotIntroduce |
| 8 | space-capable | no lobby/camera/lighting in mustNotIntroduce |
| 9 | cross-media | all 6 touchpoints represented |
| 10 | Canon drift (new brand) | CANON_DRIFT_NEW_BRAND, status=blocked |
| 10b | Canon drift (new family) | CANON_DRIFT_NEW_FAMILY, status=blocked |
| 11 | Anchor prompt leakage | ANCHOR_CONTRACT_PROMPT_LEAKAGE, status=blocked |
| 12 | stale Direction fingerprint | snapshot=null, CANON_DIRECTION_STALE |

---

## 15. Hard Acceptance Metrics

| Metric | Target | Actual | Status |
|---|---|---|---|
| Canon generated without explicit selection | 0 | 0 | ✅ PASS |
| Recommended Direction used as Canon source | 0 | 0 | ✅ PASS |
| Invalidated selection used | 0 | 0 | ✅ PASS |
| Stale Direction used | 0 | 0 | ✅ PASS |
| Ungrounded Canon rule | 0 | 0 | ✅ PASS |
| Dangling Canon trace | 0 | 0 | ✅ PASS |
| New visual mechanism invented | 0 | 0 | ✅ PASS |
| Locked asset violation | 0 | 0 | ✅ PASS |
| Reference contamination | 0 | 0 | ✅ PASS |
| Anchor prompt generated | 0 | 0 | ✅ PASS |
| Anchor image generated | 0 | 0 | ✅ PASS |
| Space/Packaging production input | 0 | 0 | ✅ PASS |
| Production behavior change | 0 | 0 | ✅ PASS |

**13/13 hard acceptance metrics PASS.**

---

## 16. CI Regression

| Phase | Before | After | Status |
|---|---|---|---|
| CI-1 parity | 17/17 | 17/17 | ✅ preserved |
| CI-2 tests | 84/84 | 84/84 | ✅ preserved |
| CI-3 tests | 38/38 | 38/38 | ✅ preserved |
| CI-4 tests | 38/38 | 38/38 | ✅ preserved |
| CI-5 tests | 39/39 | 39/39 | ✅ preserved |
| CI-6 tests | 39/39 | 39/39 | ✅ preserved |
| CI-7 tests | 48/48 | 48/48 | ✅ preserved |
| **CI-8 (new)** | — | **53/53** | ✅ 37 unit + 13 golden + 3 shadow |
| **Total CI tests** | **318/318** | **371/371** | ✅ **+53, 0 regressions** |

---

## 17. Production Regression

### Pre-existing failures (unchanged)

8 baseline failures in runtime-application (unchanged). 1 pre-existing CI-1B parity test failure (ms-level timestamp flakiness, not introduced by CI-8).

**New production test failures: 0.**  
**Worsened failures: 0.**

### Web Build

| Metric | CI-7 | CI-8 | Status |
|---|---|---|---|
| JS hash | `index-D2stPmgk.js` | `index-D2stPmgk.js` | ✅ identical |
| JS size | 521.92 kB | 521.92 kB | ✅ identical |
| CSS hash | `index-DzM-rZmk.css` | `index-DzM-rZmk.css` | ✅ identical |
| CSS size | 163.28 kB | 163.28 kB | ✅ identical |

**Web build byte-identical to CI-7.** Zero frontend behavior drift.

### Production File Count

| Phase | Files | Delta |
|---|---|---|
| CI-7 | 450 | — |
| CI-8 | **466** | **+16** |

+16 = visual-canon 10 files + anchor-contract 6 files.

---

## 18. Guards

| Guard | Status |
|---|---|
| verify:version-consistency | ✅ PASS |
| verify:version-naming | ✅ PASS |
| verify:workspace-boundaries | ✅ PASS |
| verify:production-boundaries | ✅ PASS (466 files) |
| verify:golden-boundary | ✅ PASS |
| verify:no-obsolete-code | ✅ PASS (882 files scanned) |
| verify:no-project-specific-production-rules | ✅ PASS |
| verify:current-flows | ✅ PASS (0 new failures) |

---

## 19. Behavior Drift

Zero. Production code paths are unchanged.

What changed:
- **New files only** in `@masterpiece/creative-intelligence/visual-canon/` and `anchor-contract/` (pure logic, no production consumer)
- **runtime-core shadow service**: added `selected-direction-snapshot.json` artifact (still shadow-only, try/catch protected)
- **No existing production function signature changed**
- **No existing type changed**
- **No existing behavior modified**

---

## 20. Rollback

```bash
git revert <docs-commit> <shadow+tests-commit> <namespace-commit>
```

Reverse order: docs → shadow+tests → namespace+gates.

Clean rollback: CI-8 consists entirely of additive changes with no modifications to existing production contracts or behaviors.

---

## 21. Verdict

### GO

**CI-8 — Visual Canon & Anchor Contract: GO (shadow mode).**

- 371/371 CI tests PASS (53 new, 0 regressions)
- 14/14 golden scenarios PASS (12 spec + 2 drift variants)
- 13/13 hard acceptance metrics PASS
- 8/8 guards PASS
- 0 new production failures
- Web build byte-identical
- Selection entry rules enforced (no auto-canon, no recommendation-canon)
- Direction fingerprint freshness enforced
- Drift guard active (no new family, no new brand, no new mechanism)
- Anchor prompt leakage blocked (17 fields + 10 patterns)
- Locked asset safety preserved
- Zero enabled model calls
- Shadow-only, production never reads CI-8 output

---

## 22. CI-9 Recommendation

### CI-9 — `document-ingestion` cleanup

The `@masterpiece/document-ingestion` package is now fully redundant — Document Intelligence (CI-3) has been the canonical document understanding path throughout CI-1..8. CI-9 should:

1. Audit current usages of `@masterpiece/document-ingestion` across the codebase
2. Migrate any remaining direct uses to CI-3 (`@masterpiece/creative-intelligence/document-intelligence`) or shadow service
3. Remove the package and its tests
4. Remove from workspaces
5. Verify all production + CI tests still pass (must remain 371/371)
6. Verify all guards still pass
7. Verify web build hash byte-identical

After CI-9, the Creative Intelligence chain is fully consolidated:

```
Project Truth → Need → Insight → Opportunity → Concept → Direction →
Evaluation → Recommendation → User Selection → Visual Canon → Anchor Contract
```

CI-9 is the final cleanup phase before the Creative Intelligence main chain becomes a single, end-to-end, traceable, user-authorized creative freeze pipeline.
