# CI-6 · Creative Direction Intelligence

> **Status:** GO  
> **Phase:** Creative Intelligence — CI-6  
> **Baseline:** `cfe3a76` (CI-5 final)  
> **Implementation HEAD:** `e1fc84d` (gates + tests + shadow)  
> **Documentation commit:** `TBD`  
> **Branch:** `feat/short-chain-simplified-ui`

---

## 0. Executive Summary

CI-6 is the first CI phase allowed to produce **visual-system output** — **Creative Directions** with explicit Visual Mechanisms, System Hypotheses, and Direction-level gates.

A Direction is a traceable visual-system hypothesis that converts a validated Concept into a coherent, repeatable, cross-touchpoint visual mechanism.

**Allowed:** direction, visualMechanism, systemHypothesis, colorRelationship, materialRelationship, compositionLogic, typographyBehavior, graphicBehavior, imageBehavior, crossMediaBehavior, spaceApplicability (conceptual), packagingApplicability (conceptual)

**Forbidden:** anchor, anchorImage, prompt, productionPrompt, generationPrompt, spacePrompt, packagingPrompt, imageGenerationRequest, selectedDirection, renderPrompt, "production-ready"

Core chain established end-to-end:

```
Project Truth
   ↓
Need
   ↓
Insight
   ↓
Opportunity
   ↓
Concept (CI-5)
   ↓
Direction (CI-6)
   ↓
Family Difference Evaluation
   ↓
11-Gate Validation
   ↓
SHADOW ONLY
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
| **Total pre-CI-6** | **231/231** | **PASS** |

Production file count before CI-6: **425**

---

## 2. Implementation

### Commits

| # | Hash | Message |
|---|---|---|
| 1 | `0ae772d` | feat(ci): add direction-intelligence namespace with deterministic synthesis (CI-6) |
| 2 | `e1fc84d` | feat(ci): add direction gates, shadow integration, and CI-6 tests (CI-6) |
| 3 | _pending_ | docs(ci): record CI-6 creative direction intelligence |

### Package Structure

```
packages/creative-intelligence/src/direction-intelligence/
├── index.ts                     # Public API
├── contracts.ts                 # CreativeDirectionCandidate / DirectionSet / gates / diagnostics
├── diagnostics.ts               # Stable diagnostic code constants
├── generate-directions.ts       # Deterministic Concept-led synthesis (8 family templates)
├── direction-trace.ts           # Trace validation + transitive closure builder
├── direction-family.ts          # Family Difference Evaluator (fake-diversity guard)
├── direction-deduper.ts         # Dedupe by family + concept set + mechanism overlap
├── direction-gates.ts           # 11-gate pipeline + individual gate runners
├── direction-leakage.ts         # Anchor / prompt / production-translation leakage guard
└── direction-pipeline.ts        # Top-level runDirectionPipeline orchestrator
```

10 source files, ~2090 lines of TypeScript.

### Package Exports Added

```json
{
  "./direction-intelligence": "./src/direction-intelligence/index.ts",
  "./direction-intelligence/*": "./src/direction-intelligence/*"
}
```

No breaking changes to existing exports.

---

## 3. Direction Contract

```ts
interface CreativeDirectionCandidate {
  id: string;
  title: string;
  thesis: string;

  conceptRefs: string[];          // ≥1 required

  visualMechanism: string;         // concrete visual-system hypothesis
  systemHypothesis: string;        // what brand IS expressed as
  directionFamily: DirectionFamily; // 1 of 8 system-logic families

  colorRelationship?: string;
  materialRelationship?: string;
  compositionLogic?: string;
  typographyBehavior?: string;
  graphicBehavior?: string;
  imageBehavior?: string;

  crossMediaBehavior: CrossMediaTouchpoint[];  // ≥1 required
  spaceApplicability?: string;     // conceptual only, no production layout
  packagingApplicability?: string;

  opportunityRefs: string[];       // ≥1
  insightRefs: string[];           // ≥1
  needRefs: string[];              // ≥1
  factRefs: string[];              // ≥1
  evidenceRefs: string[];

  strengths: string[];
  risks: string[];
  blockers: string[];

  status: 'grounded' | 'provisional' | 'blocked';
  generatedBy: 'deterministic_synthesis' | 'model_assisted';
  traceVersion: string;            // 'direction-intelligence-v0.1'
}
```

### Visual Mechanism Definition

A visual mechanism describes the **concrete visual-system logic** — the repeatable, structural rule that organizes the visual expression of a concept.

**Allowed example:**
> "Use a distributed relationship grammar where independent units remain autonomous but are connected by a repeatable structural logic."

**Forbidden (still belongs to CI-7+):**
> "Generate a 16:9 reception hall with..."

### System Hypothesis Definition

A system hypothesis describes **what the brand IS expressed as** through this mechanism.

**Allowed:**
> "The brand is expressed through how units connect rather than through one dominant object."

---

## 4. DirectionFamily Taxonomy

8 families, each a **system logic**, NOT a style label:

| Family | Creative Logic | Cross-Media Affinity |
|---|---|---|
| `structural-system` | 网格/结构骨架 | brand/VI, editorial, digital/UI, campaign |
| `relational-network` | 节点-关系图谱 | brand/VI, digital/UI, editorial, campaign |
| `narrative-sequence` | 顺序驱动的叙事 | editorial, campaign, digital/UI |
| `symbolic-abstraction` | 抽象符号图腾 | brand/VI, campaign, editorial |
| `material-expression` | 材质感官一致性 | packaging, space, brand/VI |
| `editorial-system` | 编辑信息层级 | editorial, digital/UI, brand/VI |
| `modular-identity` | 模块可重组 | brand/VI, digital/UI, campaign |
| `spatial-extension` | 空间关系骨架 | space, brand/VI, packaging |

**Forbidden family names** (style labels, not system logic):
- `luxury`, `minimal`, `futuristic`, `Chinese`, `purple`, `red`

---

## 5. Cross-Media Behavior

Every valid Direction describes at least one touchpoint class. When multiple touchpoints exist in the project, Direction must describe at least 2.

Touchpoint classes (6):
- `brand/VI`
- `editorial`
- `digital/UI`
- `space`
- `packaging`
- `campaign/poster`

Still conceptual — never production compilation.

### Space Applicability

**Allowed:** "The modular relationship system can extend into wayfinding, environmental graphics, and zone relationships."

**Forbidden:** specific lobby layout, camera position, material specification, render prompt.

### Packaging Applicability

**Allowed:** "The same modular system can organize product families and information hierarchy."

**Forbidden:** specific box geometry, render composition, shot contract, packaging prompt.

---

## 6. Deterministic Synthesis

### Strategy

**Concept-led.** Directions are generated from validated (non-blocked) Concepts, not from raw documents. Preserves Truth → Need → Insight → Opportunity → Concept → Direction chain.

### Status Propagation

```
blocked Concept       → no valid Direction
provisional Concept   → Direction max status = provisional
grounded Concept      → Direction may be grounded
```

Never increases certainty downstream.

### Generation Rules

- Up to 3 Directions per eligible Concept input
- No forced quota
- Fewer real Directions > three cosmetic variants
- Concepts without insight/need/fact trace are skipped (with diagnostic)
- Blocked concepts produce no directions

### Quality Note

Deterministic directions are intentionally template-driven. CI-6 establishes contract + trace + family-difference + gates. If deterministic quality is insufficient, the recommended path is **CI-6B — Model-Assisted Direction Ideation** — with gates already in place before any model call is enabled.

---

## 7. Trace Validation

### Minimum Requirements (every valid Direction)

- `conceptRefs.length >= 1`
- `opportunityRefs.length >= 1`
- `insightRefs.length >= 1`
- `needRefs.length >= 1`
- `factRefs.length >= 1`

### Transitive Closure

```
Direction → Concept → Opportunity → Insight → Need → Fact → Evidence
```

`buildDirectionTransitiveTrace()` aggregates all reachable objects through the chain.

### Detection

- Dangling conceptRef / opportunityRef / insightRef / needRef / factRef / evidenceRef
- Missing minimum refs
- Reference-only trace (all facts reference-derived)

**Hard target: Direction trace closure = 100% for valid/grounded directions.**

---

## 8. Family Difference Evaluator

### Structural Difference Rule

A pair of directions is **meaningfully distinct** when:

1. `directionFamily` differs
2. AND at least 2 structural dimensions differ
3. AND not cosmetic-only

Structural dimensions checked:
1. `visualMechanism`
2. `systemHypothesis`
3. `directionFamily`
4. `compositionLogic`
5. `crossMediaBehavior`

### Fake Diversity Guard

**Hard regression guard.** A pair is `fake-diversity` when:

- Same `directionFamily`
- AND `visualMechanism` token overlap ≥ 70%
- AND `systemHypothesis` token overlap ≥ 70%

Example fake-diversity fixture (must FAIL):

> Direction A: same mechanism, purple
> Direction B: same mechanism, blue
> Direction C: same mechanism, orange

→ Family Difference Gate: **BLOCK** (fake-diversity detected)

### Pairwise Coverage

For multi-direction sets, all pairs must be meaningfully distinct. If a pair is fake-diversity, both directions are blocked by the Family Difference Gate.

---

## 9. Gate Architecture

### Pipeline Order

```
Direction Candidate
    ↓
1. Trace Gate                       refs resolve? minimum counts met?
    ↓
2. Brand Identity Gate              no unauthorized brand
    ↓
3. Asset Authorization Gate         no fabricated claims / credentials
    ↓
4. Business Coverage Gate           critical business needs covered?
    ↓
5. Consumer Coverage Gate           critical audience needs covered?
    ↓
6. Group Visual Authorization Gate  no unauthorized sub-brand claims
    ↓
7. Family Difference Gate           fake-diversity / under-distinguished
    ↓
8. Spatial Drift Gate               no specific spatial mechanisms
    ↓
9. Aesthetic Gate                   style contradiction / system completeness
    ↓
10. Execution Readiness Gate        visualMechanism / systemHypothesis / crossMedia required
    ↓
11. Anchor / Prompt Leakage Gate    no anchor / prompt / production translation
    ↓
VALID / PROVISIONAL / BLOCKED
```

### Per-Gate Output

Each gate returns `DirectionGateResult`:
```ts
{
  directionId: string;
  gate: DirectionGateName;
  status: 'pass' | 'pass_with_warnings' | 'blocked';
  issues: DirectionGateIssue[];
}
```

### Overall Status

A direction's overall status is the **worst** gate result.

---

## 10. Lab Re-Evaluation

| Lab Evaluator | CI-6 Status | Adapted As | Notes |
|---|---|---|---|
| brand-identity-preservation | **PROMOTED** | `DirectionBrandIdentityGate` | Same invariant as CI-5, extended for Direction text |
| asset-authorization | **PROMOTED** | `DirectionAssetAuthorizationGate` | Fabrication + credential detection; locked-asset safety at Direction level |
| business-model-coverage | **PROMOTED** | `DirectionBusinessCoverageGate` | Critical business need coverage only (not the 3/4 dimensions rule) |
| consumer-value-coverage | **PROMOTED** | `DirectionConsumerCoverageGate` | Critical audience need coverage only |
| group-direction-authorization | **PROMOTED (disposition)** | `DirectionGroupVisualAuthorizationGate` | Only no-unauthorized-sub-brand-claim check; detailed per-project knowledge deferred |
| direction-family-difference | **PROMOTED** | `DirectionFamilyDifferenceGate` | Semantic invariant: ≥2 structural dimensions differ; cosmetic-only fails |
| spatial-drift | **PROMOTED** | `DirectionSpatialDriftGate` | Detects specific spatial prescriptions (camera, lobby, material specs) |
| aesthetic gate (frozen) | **PROMOTED (disposition)** | `DirectionAestheticGate` | Only contradiction / completeness checks; no beauty scoring |
| execution-readiness | **PROMOTED** | `DirectionExecutionReadinessGate` | Required field presence checks only |
| anchor / prompt leakage | **NEW (CI-6 native)** | `DirectionAnchorPromptLeakageGate` | First CI-6-specific gate; no lab origin |

**Promoted: 9 evaluators** (some via semantic extraction; some via disposition only).

All promoted logic lives under `creative-intelligence/direction-intelligence/` with new tests. Production never imports `labs/*`.

---

## 11. Anchor / Prompt Leakage Guard (CI-6 native)

**ALLOWED field names (CI-6 adds):**
direction, visualMechanism, systemHypothesis, colorRelationship, materialRelationship, compositionLogic, typographyBehavior, graphicBehavior, imageBehavior, crossMediaBehavior, spaceApplicability, packagingApplicability, directionFamily, crossMedia, space, packaging, all 6 *Refs arrays, strengths/risks/blockers, status, generatedBy, traceVersion, id, title, thesis

**FORBIDDEN field names (22):**
anchor, anchorImage, anchorCandidate, anchorPrompt, prompt, productionPrompt, generationPrompt, spacePrompt, packagingPrompt, imageGenerationRequest, imageRequest, providerRequest, finalVisualCanon, selectedDirection, selectedVisual, keyVisual, finalKV, renderPrompt, shotContract, imageSeed, imageSpec

**FORBIDDEN text patterns (16):**
- `Generate a 16:9 ...` / `Render a ...` / `Generate an ...` (render prompts)
- `具体的16:9 / 画幅 / 渲染 / 材质规格` (specific render specs)
- `具体的大堂 / 吧台 / 展墙 / 货架 布局` (specific layout)
- `具体的包装 / 盒型 / 结构 尺寸` (specific packaging geometry)
- `拍摄位置 / 机位设置` (camera position)
- `锚定图像 / 锚图 / 主视觉图 / KV 是具体` (anchor references)
- `即可生成 / 开始生产 / production-ready / ready for production` (production execution)
- `已选定的方向 / 最终选定` (selection state)

---

## 12. Shadow Artifact

### File

`creative-intelligence-shadow/direction-intelligence.json`

### Structure

```json
{
  "schemaVersion": "0.1",
  "authoritative": false,
  "mode": "shadow",
  "projectId": "...",
  "ciVersion": "...",
  "generatedAt": "...",
  "directionSet": { ... DirectionSet ... },
  "familyDifference": { ... },
  "gateSummary": {
    "overallStatus": "pass",
    "passedCount": N,
    "warningCount": N,
    "blockedCount": N,
    "perDirection": { ... }
  },
  "leakage": { "field": null, "text": null },
  "dedupe": { "removedCount": N }
}
```

### Safety

- Direction generation runs in its own try/catch block in the shadow service
- Failure writes a warning to the shadow report, does NOT break the run
- Production never reads direction-intelligence.json
- Total shadow artifacts after CI-6: **12 files**

---

## 13. Golden Scenarios

9 scenarios, 9/9 PASS:

| # | Scenario | Directions Generated | Distinct Families | Notes |
|---|---|---|---|---|
| 1 | document-led | ≥1 | ≥1 | Full grounding from DVC + project record |
| 2 | visual-led | ≥0 | — | VUC feeds identity needs; directions from visual source facts |
| 3 | reference-first | variable | — | Reference guard active; no contamination in passed directions |
| 4 | packaging-capable | ≥1 | — | No packaging-mechanism specific text |
| 5 | space-capable | ≥1 | — | No specific spatial-mechanism prescription |
| 6 | conflict-heavy | ≥1 | — | Selective blocking: unaffected opp still produces; conflict not silently resolved |
| 7 | sparse / unknown-heavy | 0 | — | **No fabrication to fill quota** |
| 8 | multi-concept | ≥1 | ≥2 distinct families (when ≥2 valid) | Structurally distinct directions |
| 9 | **fake-diversity (HARD REGRESSION GUARD)** | — | — | Same mechanism + different colors MUST be detected as fake-diversity and BLOCK |

### Grounding Rate

**100%** — all valid/grounded directions have minimum trace refs (concept, opportunity, insight, need, fact).

### Trace Closure Rate

**100%** — zero dangling refs in all valid directions across all 9 scenarios.

### Family Difference Rate

**100%** for valid multi-direction sets — all pairs meaningfully distinct, no fake-diversity.

---

## 14. Gate Pass/Block Summary

| Gate | Tested? | Hard Block Triggers |
|---|---|---|
| Trace | Yes (bad refs) | missing/dangling refs |
| Brand Identity | Yes (reference brand) | reference brand as current; identity distortion |
| Asset Authorization | Yes (fabrication) | official certs, exclusivity, locked-asset redesign |
| Business Coverage | Yes (critical need) | missing critical business need |
| Consumer Coverage | Yes (critical need) | missing critical audience need |
| Group Visual Auth | Yes (sub-brand claim) | unauthorized sub-brand claim |
| Family Difference | **Yes (fake-diversity)** | fake-diversity = BLOCK |
| Spatial Drift | Yes (specific layout) | specific spatial mechanism |
| Aesthetic | Yes (contradiction) | style contradiction; system incomplete (warning) |
| Execution Readiness | Yes (missing fields) | missing visualMechanism / systemHypothesis / crossMedia |
| Anchor/Prompt Leakage | Yes (forbidden fields + text) | any anchor / prompt / production translation |

---

## 15. Hard Acceptance Metrics

| Metric | Target | Actual | Status |
|---|---|---|---|
| Ungrounded Direction | 0 | 0 | ✅ PASS |
| Dangling Direction trace | 0 | 0 | ✅ PASS |
| Reference contamination | 0 | 0 | ✅ PASS |
| Unauthorized brand (hard block) | 0 valid | 0 valid | ✅ PASS |
| Unauthorized asset (hard block) | 0 valid | 0 valid | ✅ PASS |
| Unsupported factual claim | 0 | 0 | ✅ PASS |
| Unknown silently fabricated | 0 | 0 | ✅ PASS |
| Conflict silently resolved | 0 | 0 | ✅ PASS |
| Fake diversity accepted | 0 | 0 | ✅ PASS |
| Anchor generated | 0 | 0 | ✅ PASS |
| Prompt generated | 0 | 0 | ✅ PASS |
| Space/Packaging production output | 0 | 0 | ✅ PASS |
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
| **CI-6 (new)** | — | **39/39** | ✅ 27 unit + 9 golden + 3 shadow |
| **Total CI tests** | **231/231** | **270/270** | ✅ **+39, 0 regressions** |

---

## 17. Production Regression

### Pre-existing failures (unchanged)

8 baseline failures in runtime-application:
- 5 UI frozen guard failures (BD-17, BE-19, Stage 4, analysis UI, model connection)
- AE-01, AW-21, AC-09 (unrelated to CI-6)

**New production test failures: 0.**  
**Worsened failures: 0.**

### Web Build

| Metric | CI-5 | CI-6 | Status |
|---|---|---|---|
| JS hash | `index-D2stPmgk.js` | `index-D2stPmgk.js` | ✅ identical |
| JS size | 521.92 kB | 521.92 kB | ✅ identical |
| CSS hash | `index-DzM-rZmk.css` | `index-DzM-rZmk.css` | ✅ identical |
| CSS size | 163.28 kB | 163.28 kB | ✅ identical |

**Web build byte-identical to CI-5.** Zero frontend behavior drift.

### Production File Count

| Phase | Files | Delta |
|---|---|---|
| CI-5 | 425 | — |
| CI-6 | **435** | **+10** |

+10 = direction-intelligence 9 files + shadow service update (+1 net).

---

## 18. Guards

| Guard | Status |
|---|---|
| verify:version-consistency | ✅ PASS |
| verify:version-naming | ✅ PASS |
| verify:workspace-boundaries | ✅ PASS |
| verify:production-boundaries | ✅ PASS (435 files) |
| verify:golden-boundary | ✅ PASS |
| verify:no-obsolete-code | ✅ PASS (844 files scanned) |
| verify:no-project-specific-production-rules | ✅ PASS |
| verify:current-flows | ✅ PASS (0 new failures) |

---

## 19. Behavior Drift

Zero. Production code paths are unchanged.

What changed:
- **New files only** in `@masterpiece/creative-intelligence/direction-intelligence/` (pure logic, no production consumer)
- **runtime-core shadow service**: added direction-intelligence artifact writing (still shadow-only, try/catch protected)
- **No existing production function signature changed**
- **No existing type changed**
- **No existing behavior modified**

---

## 20. Rollback

```bash
git revert <docs-commit> <tests+shadow-commit> <namespace-commit>
```

Reverse order: docs → tests+shadow → namespace+gates.

Clean rollback: CI-6 consists entirely of additive changes with no modifications to existing production contracts or behaviors.

---

## 21. Verdict

### GO

**CI-6 — Creative Direction Intelligence: GO (shadow mode).**

- 270/270 CI tests PASS (39 new, 0 regressions)
- 9/9 golden scenarios PASS (including fake-diversity hard regression guard)
- 13/13 hard acceptance metrics PASS
- 8/8 guards PASS
- 0 new production failures
- Web build byte-identical
- Reference contamination = 0
- Direction / anchor / prompt leakage = 0
- Fake diversity = 0
- Production translation = 0
- Zero enabled model calls
- Shadow-only, production never reads direction output

---

## 22. CI-7 Recommendation

### CI-7 — Evaluation & User Selection State

Now that Concept + Direction are validated and gated, the next phase is **user selection**:

- Input: validated Direction Set + Evaluations
- Output: user-selected Direction (only via explicit user action)
- Hard invariant: `recommendedDirection != selectedDirection`
- New: Evaluation namespace (scoring, ranking, recommendation — non-final)
- New: User selection state (explicit user action required)
- New: Selected Direction artifacts (for downstream use)
- Deferred: production translation (CI-8+)

CI-7 is where the first user-facing state appears. The shadow must be preserved: production never auto-selects. Selection requires user action. Recommended ≠ Selected.
