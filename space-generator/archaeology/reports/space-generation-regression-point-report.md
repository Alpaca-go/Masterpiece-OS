# Masterpiece OS Space Generator — Phase R8.4 Regression Point Report

**Branch**: `v2-space-generator` (mainline preserved at `a5f98b2`)
**Archaeology worktree**: `D:/Masterpiece-OS-archaeology`
**Archaeology branches**: `archaeology/pre-anchor-space` (P7), `archaeology/p8b-anchor`, `archaeology/p9b-spatial`
**Backup branch**: `backup/v2-before-space-archaeology`
**Report date**: 2026-08-08
**Provider / model (uniform across all epochs)**: volcengine / `doubao-seedream-5-0-pro-260628` / 2K / 16:9 / refs=0 unless noted
**Authorized by**: user ("消耗积分，继续")

---

## 1. Executive Summary

R8.4 reproduced the full pre-anchor → post-anchor → spatial-intelligence → current-mainline lineage using the **original compiler and DNA at every epoch**, with only runner-compat shims (API, credential, path, Electron) modified. Across **9 real-provider images** we found:

1. **The old P7 text-only pipeline is genuinely capable of 4–5/5 Architecture Expressiveness** (3/3 runs ≥4, one at 5). P8B Mode A even produced a 5/5 image with zero literal motif — a *draped sheer-fabric ceiling canopy* that is not in any prompt, demonstrating that the old compiler lets the model discover novel spatial mechanisms.
2. **The historical S-level goldens are not pure survivor bias**, but the ceiling is real and the variance is also real: P7 Mode A 3/3 runs carried a literal feather/wing relief (Literal Motif Risk 2/5), so the old core was not motif-free either.
3. **The current mainline Phase 9B compiler (post R8.5.1) regresses on text-only stability**: a fresh CURRENT-T run on the same JZMX reception produced a **1/5 Literal Motif Risk (oversized literal purple petal sculpture)** and **3/5 Functional Realism**, despite the R8.5.1 semantic-separation fix. The earlier R8.5.1 post-fix smoke that looked clean was a favorable sample, not evidence that the structural problem is solved.
4. **Architecture Anchor (P8B-B) did not raise the ceiling.** It actually lowered Expressiveness (5→4) and Brand Translation (5→3) on the matched A/B pair. Anchors over-constrain spatial novelty toward the historical goldens.
5. **Spatial Intelligence (P9B-B) is the only layer that helped.** It is where the *draped fabric* mechanism emerged at 5/5 Expressiveness with zero literal motif. That is the high-water mark of the lineage.
6. **The true regression point is the transition from P9B-B to CURRENT**, not P7→P8B. The current compiler inherited the P9B architecture-first block order but **lost the action verbs and collapsed concrete language into semantic labels**, while V5 upstream fields leak literal Chinese motif phrases (`抽象羽毛纹理的墙面或屏风`, `翎羽之境`, `模拟羽毛的层叠与包裹感`) directly into architecture blocks 4–5 times per prompt.

The recommendation is **not** to roll back to P7. It is to forward-port the **P9B-B Generation Core** (concrete action verbs + short English block labels + motif-bearing English field names) into the current V5-adapter stack, while keeping R8.5.1's semantic separation **and extending it to cover `mustBeVisible` / `functionalNetwork` repeats**.

---

## 2. Epoch Matrix

Scores are 1–5 integers. For `genericAiSpaceRisk` and `literalMotifRisk`, higher is better (less generic / less literal).

| Epoch | Ref | Arch Express. | Arch Quality | Brand Trans. | Functional | Mat & Light | Generic AI | Literal Motif | Dominant mechanism |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| **P7 run-01** | none | 4 | 5 | 4 | 4 | 5 | 2 | 2 | Sculptural organic relief surface |
| **P7 run-02** | none | 4 | 4 | 4 | 4 | 5 | 2 | 2 | Fluid parametric curves + linear light |
| **P7 run-03** | none | **5** | 4 | 5 | 4 | 5 | 2 | 2 | Continuous monolithic curved plaster |
| **P8B-A** | none | **5** | 4 | **5** | 4 | 5 | 3 | **5** | Expansive draped sheer-fabric canopy |
| **P8B-B** | 3 anchor | 4 | 4 | 3 | 4 | 5 | 2 | 5 | Translucent fabric ceiling (similar) |
| **P9B-A** | runtime | 4 | 5 | 5 | 5 | 5 | 4 | 5 | Draped light-diffusing fabric canopy |
| **P9B-B** | + spatial intel | **5** | **5** | 4 | **5** | 5 | 4 | 5 | Draped sheer fabric ceiling + pods |
| **CURRENT-T** | none | 4 | 4 | 4 | 3 | 5 | 2 | **1** | Parametric forms + literal purple petal |
| **CURRENT-R** | 1 anchor | 4 | 3 | 4 | 3 | 4 | 2 | 2 | Organic curves + literal purple props |

Aggregate reading:
- **Architecture Expressiveness ceiling**: P7=5, P8B-A=5, P9B-B=5, CURRENT-T=4. The current compiler is the only one that never reached 5 in this sweep.
- **Literal Motif Risk ≤2 (bad)**: P7 all 3 runs, CURRENT-T=1, CURRENT-R=2. P8B onward (until current) mostly kept motif at 5 (clean).
- **Functional Realism**: P9B-A/B = 5; CURRENT-T/R = 3. The current compiler produces less usable spaces.
- **Anchor effect (P8B-A vs P8B-B)**: negative on Expressiveness, Brand, and Generic-AI.
- **Reference effect (CURRENT-T vs CURRENT-R)**: marginal improvement on literal motif (1→2), but Architecture Quality drops 4→3 and Functional stays at 3. Reference alone does not save the current prompt structure.

---

## 3. Image-Level Results

### P7 — pre-anchor text-only baseline (commit `a8074fde`)
- **Input**: `space-generator/v1-experimental/field-schema/examples/jiuzhou-aesthetics.dna.json` (v0.1, frozen 2026-08-01)
- **Compiler**: `compileFieldEnrichedPrompt` at P7 — 12 blocks, English keys, task → brand → function → concept → architecture → material → lighting → brandTranslation → functional → composition → rendering → negative
- **Prompt length**: 4072 chars
- 3/3 runs show continuous curved plaster / cove lighting / arched openings — clear architectural language.
- 3/3 runs still emboss or sculpt a feather/wing/frond relief into the focal wall. The motif problem is **native to the P7 DNA**, not a regression.
- Brand name "九州美学" is rendered as in-scene luminous text in all 3 — predates the R7 post-composite logo policy.

### P8B-A — 10-block architecture-first baseline (commit `d61403e`)
- **Input**: v1.1 DNA; same compiler, 10 blocks, architecture block promoted to position 2.
- **Prompt length**: 5019 chars
- Produces the single cleanest image of the entire sweep: an **expansive draped sheer-fabric ceiling canopy** with daylight, matte plaster, and a restrained metallic reception desk. No feather, no purple architecture, brand name only as small signage.
- This is direct evidence that the Seedream model, when given architecture-first ordering and concrete English field labels, invents a *new* spatial mechanism instead of illustrating the motif list.

### P8B-B — anchor-aware
- **Input**: v1.1 DNA + 3 JZMX architecture anchors (JZMX-ARCH-01/02/03)
- **Prompt length**: 6019 chars (anchor block = +1000 chars)
- Image remains competent but leans closer to the historical goldens; brand specificity drops because the anchor dominates the model's attention.

### P9B-A — previous runtime
- **Input**: v1.1 DNA through `compileRuntimePrompt` (Phase 8C + 8B.1 bridge)
- **Prompt length**: 7680 chars; Architecture section = 3100 chars
- 5/5 Functional Realism, 5/5 Material & Lighting. The Architecture-Function Bridge block is doing real work.

### P9B-B — spatial intelligence (HIGH-WATER MARK)
- **Input**: v1.1 DNA + `jiuzhou-aesthetics.spatial-intent.json` through `compileRuntimePromptWithSpatialIntelligence`
- **Prompt length**: 9123 chars (largest of any epoch, but still under the 10k warn threshold); Architecture section = 4543 chars
- Adds two new blocks at positions 2–3: `Spatial Intent` (why the space feels the way it does) and `Architecture Language` (what architectural principles deliver that feeling).
- 13 architecture action verbs in the prompt (highest of any epoch except P9B-B is the high point — P7 had 8, current has 1).
- Result: **5/5 Expressiveness, 5/5 Architecture Quality, 5/5 Functional Realism, 5/5 Literal Motif Risk**. Draped sheer-fabric ceiling plus sheer curtain consultation pods. This is the target generation core.

### CURRENT-T — mainline Phase 9B quality compiler (branch `v2-space-generator` @ `a5f98b2`)
- **Input**: live V5 `visual-decision-packet.json` for JZMX project `13c636af`; semantic-separation fix from R8.5.1 applied
- **Compiler**: `packages/image-generation-runtime/src/vnext/space-quality/phase9b-space-compiler.js` (`phase9b_quality` mode)
- **Prompt length**: 6830 chars across 14 blocks (same order as P9B-B)
- **Result**: 4/5 Expressiveness but **1/5 Literal Motif Risk** — giant purple petal/feather sculpture behind reception, purple-as-architecture, 3/5 Functional Realism because the sculpture blocks the desk.
- R8.5.1's earlier smoke (`r85.1-text-only-smokes/.../reception-v1`) was a favorable sample. Same compiler, fresh run, regression reappears. The fix is structurally incomplete.

### CURRENT-R — same compiler with one non-logo core reference
- **Input**: same packet + `input/golden-anchors/JZMX-SGR-02-Reception.png` as `core_reference`
- **Result**: motif risk improves 1→2 but architecture quality drops 4→3 (set-design feel), functional stays 3.
- Confirms: **reference cannot rescue a prompt that still carries motif signal in its architecture blocks.**

---

## 4. Prompt Structure Diff

| Epoch | Total chars | Blocks | Arch chars | Brand chars | Func chars | Mat+Light | Neg chars |
|---|---:|---:|---:|---:|---:|---:|---:|
| P7 | 4072 | 12 | 537 | 946 | 643 | 732 | 366 |
| P8B-A | 5019 | 10 | 439 | 1527 | 559 | 729 | 366 |
| P8B-B | 6019 | 11 | 1439 | 1527 | 559 | 729 | 366 |
| P9B-A | 7680 | 12 | 3100 | 1527 | 559 | 729 | 366 |
| P9B-B | 9123 | 14 | 4543 | 1527 | 559 | 729 | 366 |
| CURRENT-T | 6830 | 14 | 3370 | 873 | 379 | 478 | 613 |
| CURRENT-R | 6830 | 14 | 3370 | 873 | 379 | 478 | 613 |

Key structural movements:
- P7 → P8B: Brand block doubles (946 → 1527) and Architecture block shrinks (537 → 439) but **Architecture moves to block 2** (was block 5). Order > length.
- P8B → P9B: Architecture section grows 7x (439 → 3100 / 4543) via the new Spatial Intent, Architecture Language, and Architecture-Function Bridge blocks. This is where the expressive ceiling comes from.
- **P9B-B → CURRENT**: Architecture shrinks 35% (4543 → 3370), Brand shrinks 43% (1527 → 873), Functional shrinks 32% (559 → 379), Material+Light shrinks 34% (729 → 478), **Negative grows 67% (366 → 613)**. The current prompt is simultaneously shorter on every productive dimension and longer on prohibitions.

The CURRENT compiler inherits the P9B-B 14-block order, which is correct. What changed is **what gets written into each block**.

---

## 5. Architecture Action vs Abstract Language

| Epoch | Action verbs | /1k chars | Abstract adjectives | /1k chars |
|---|---:|---:|---:|---:|
| P7 | 8 | 1.96 | 18 | 4.42 |
| P8B-A | 7 | 1.39 | 17 | 3.39 |
| P8B-B | 7 | 1.16 | 17 | 2.82 |
| P9B-A | 7 | 0.91 | 17 | 2.21 |
| P9B-B | 13 | 1.42 | 21 | 2.30 |
| **CURRENT-T** | **1** | **0.15** | **3** | **0.44** |
| **CURRENT-R** | **1** | **0.15** | **3** | **0.44** |

This is the single most diagnostic number in the report.

- P9B-B uses 13 concrete action verbs (`descend`, `wrap`, `connect`, `open`, `bend`, `filter`, `frame`, `guide`, `transition`, `separate`, `span`, `flow`, `enclose`, plus `curve`/`drape`/`sweep`/`merge`) at 1.42 per 1k chars.
- CURRENT uses **one** action verb in 6830 chars. Its Architecture blocks are written as semantic labels and Chinese V5 narrative sentences, not as drawable instructions.
- This matches the R8.4 hypothesis: **SEMANTIC_COMPRESSION_RISK fires when abstract adjectives collapse and action verbs disappear**. Both fire on CURRENT.

Concrete illustration from P9B-B prompt body (Architecture Language block, paraphrased from compiler source):

> *"Surfaces descend from ceiling to form arched thresholds; walls bend to frame consultation zones; translucent membranes filter daylight; cove lines guide circulation from reception to waiting..."*

vs CURRENT (from actual compiled-prompt.md, verbatim):

> *"signature spatial mechanisms: [...] 流畅的曲线墙面或隔断，模拟羽毛的层叠与包裹感 [...] 抽象羽毛纹理的墙面或屏风"*
>
> *"architectural characteristics: [...] soft_continuity, layered_biomorphic_flow"*

One tells the model what to build. The other tells the model what motif to emulate.

---

## 6. Data Representation Diff

P7 / P8B / P9B input DNA is **structured, English, atomic** — every field is either an enum or a short label:

```json
"spatialConcept": { "primary": "soft_continuity", "secondary": "layered_biomorphic_flow" },
"geometry": { "dominant": ["continuous_curves", "rounded_openings", "soft_transitions"] },
"motifFamily": ["feather_like_flow", "petal_like_expansion", "flowing_membrane"]
```

CURRENT V5 packet uses **Chinese prose** and **duplicates the same motif sentence across multiple fields**:

| Field | Content |
|---|---|
| `mediaTranslations.spatial.signatureSpatialMechanism[0]` | 流畅的曲线墙面或隔断，模拟羽毛的层叠与包裹感 |
| `mustBeVisible[1]` | 抽象羽毛纹理的墙面或屏风 |
| `mustBeVisible` (other repeats) | same sentence appears 4 times in the compiled prompt (lines 134, 195, 220, 259) |
| `spatialConcept` | 翎羽之境 (Realm of Feathers) |
| `uniqueUpgradeThesis` / brand narrative block | "通过孔雀羽毛这一极具美学价值的意象..." (full prose paragraph) |
| `functionalNetwork[]` | contains motif-bearing descriptors that the R8.5.1 semantic layer does not yet strip |

R8.5.1 correctly routed `signatureSpatialMechanism[0]`, `spatialConcept`, and `uniqueUpgradeThesis` through `normalizeArchitectureSemantics()` and diverted literal motif items to the Brand Translation block. But:

1. **`mustBeVisible` is not in the stripped-field set.** It is rendered raw by the current source adapter in at least two blocks (architecture_dna and composition/functional), and its motif-bearing sentence appears **4 times** in the final prompt.
2. **`functionalNetwork` repeats motif language** and is not classified.
3. **The remaining architecture blocks use Chinese prose instead of the English action-verb vocabulary** that P9B-B uses. Even after motif literal is stripped, the block still reads like a brand poem rather than a build instruction.
4. The semantic separator classifies phrases but does not **rewrite them into action verbs** — it only strips motif tokens. So "流畅的曲线墙面或隔断，模拟羽毛的层叠与包裹感" becomes something like "流畅的曲线墙面或隔断，层叠与包裹感" — still an aesthetic description, not "walls bend and layer to enclose reception".

---

## 7. Anchor Effect

Across the matched P8B pair (same DNA, same compiler, same provider call, only difference = 3 anchor images attached to Mode B):

| Metric | P8B-A | P8B-B | Δ |
|---|---:|---:|---:|
| Architecture Expressiveness | 5 | 4 | −1 |
| Architecture Quality | 4 | 4 | 0 |
| Brand Translation | 5 | 3 | −2 |
| Functional Realism | 4 | 4 | 0 |
| Material & Lighting | 5 | 5 | 0 |
| Generic AI Risk (higher=less generic) | 3 | 2 | −1 |
| Literal Motif Risk | 5 | 5 | 0 |

The anchor is not carrying any of the qualities we want it to carry. It pulls the model toward the historical goldens and suppresses novel spatial solutions. This contradicts the intuition that anchors "raise the floor"; at least with the Seedream 5 Pro prompt format, they are more likely to lower the ceiling.

For CURRENT-R vs CURRENT-T, attaching one golden anchor as a core reference moved Literal Motif Risk only 1→2, while Architecture Quality dropped 4→3. **Reference cannot compensate for prompt structure.**

---

## 8. Spatial Intelligence Effect

Across P9B-A vs P9B-B (same DNA, same runtime, B adds the spatial intelligence layer):

| Metric | P9B-A | P9B-B | Δ |
|---|---:|---:|---:|
| Architecture Expressiveness | 4 | 5 | +1 |
| Architecture Quality | 5 | 5 | 0 |
| Brand Translation | 5 | 4 | −1 |
| Functional Realism | 5 | 5 | 0 |
| Generic AI Risk | 4 | 4 | 0 |
| Literal Motif Risk | 5 | 5 | 0 |
| Action verbs in prompt | 7 | 13 | +6 |
| Architecture chars | 3100 | 4543 | +1443 |

Spatial Intelligence is the single positive layer in the lineage. It gains Expressiveness without losing Functional or Motif control. Brand Translation dips 5→4 because the architecture dominates the image, which is the correct trade for a space generator.

The current Phase 9B compiler nominally has both `spatial_intent` and `architecture_language` blocks at positions 2 and 3 — but as written today, they contain Chinese V5 narrative and abstract labels, not the action-verb language that made P9B-B work. **The block exists; the content strategy was lost in the V5 migration.**

---

## 9. Survivor Bias Analysis

The three historical S-level JZMX architecture goldens (JZMX-ARCH-01/02/03) are often cited as evidence that the old system "could do this reliably." R8.4 shows:

- P7 (the exact pipeline that produced them) reaches 4–5/5 Expressiveness 3/3 runs. That is **not** pure survivor bias — the ceiling is real.
- But 3/3 P7 runs also carry a literal feather/wing relief. The goldens were likely curated from a larger pool where motif failure was common.
- P8B-A and P9B-B both produced 5/5 images **without any anchor attached and without literal motif**, showing that the model + compiler combination is capable of clean novel architecture on its own.
- Therefore the goldens should remain **benchmark references for the upper bound**, but they are not a reliable template. The thing that made them possible is the **compiler's concrete drawable language**, not the motifs in the DNA.

---

## 10. Regression Point

**The structural regression point is the P9B-B → CURRENT transition, not P7→P8B or P8B→P9B.**

Concretely:

- **Block order is preserved** (14 blocks, architecture-first). ✅
- **Spatial Intelligence blocks exist** (`spatial_intent`, `architecture_language`). ✅
- **What goes into the blocks changed**:
  - P9B-B: short English action-verb sentences generated by the spatial-intent + architecture-bridge compilers from structured DNA.
  - CURRENT: Chinese V5 prose, enum labels, and repeated motif sentences routed through a semantic separator that strips tokens but does not rewrite into drawable language.
- **Brand / functional / material blocks all shrank 30–45%** while the negative block grew 67%.
- **R8.5.1's semantic separation is necessary but not sufficient.** It misses `mustBeVisible` and `functionalNetwork[]`, and even when it strips a motif it does not replace it with an architectural action.

There is a secondary, smaller regression at P8B-A→P8B-B where the anchor was introduced; that layer is net-neutral-to-negative and should not be the primary quality lever.

---

## 11. Root Cause

The V5 Analysis packet is a **creative-director document**: it contains brand poetry, motif narrative, and Chinese prose about the intended *feeling* of the space. The Phase 9B source adapter initially fed that prose directly into architecture blocks, and R8.5.1 added a classifier that strips motif tokens — but neither step converts the remaining content into the **construction instructions** that the Seedream model actually renders well.

The P9B-B compiler worked because its `spatial-intent-compiler` and `architecture-bridge` modules translated atomic DNA fields into short English sentences of the form:

> *[Surface] [action verb] [spatial relationship] [function].*

That translation layer was effectively discarded when the system migrated to the V5 packet. The new source adapter copies V5 sentences instead of compiling them. The motif problem is the most visible symptom; the deeper problem is **loss of a generation-specific IR between V5 narrative and provider prompt**.

R8.5's `spatialMechanisms` Generation IR proposal is directionally correct but was being filled with more V5 prose. What is needed is not more fields — it is a **translation rule from V5 semantic content to P9B-B-style action-verb architecture language**, with motif-bearing phrases diverted to Brand Translation and `mustBeVisible` / `functionalNetwork` subject to the same provenance audit.

Contributing factors:
- Negative-prompt bloat (613 chars vs P9B-B's 366) gives a false sense of control while doing little against a strong motif anchor in the prompt body.
- Anchors/references are being leaned on as a quality crutch, but the A/B data shows they do not raise Expressiveness and sometimes lower it.
- Single-run smokes were being used to judge fixes, but the compiler's output variance is high enough that one favorable image cannot confirm a structural fix (R8.5.1 reception smoke vs this CURRENT-T run).

---

## 12. Recommended Generation Core

**Adopt P9B-B as the Generation Core Baseline.**

Not P7 — P7 has motif literalism baked into the DNA and predates the architecture-first block order.
Not current Phase 9B as-is — it has the right block skeleton but the wrong content strategy and an incomplete semantic filter.
Not anchor-heavy Mode B — anchors lower the ceiling.

P9B-B gives:
- 5/5 Expressiveness, 5/5 Architecture Quality, 5/5 Functional Realism, 5/5 Literal Motif Risk (single best epoch in the sweep).
- Concrete drawable language with 13 action verbs.
- Architecture section at 4543 chars (within the R8.5 +10% budget relative to R8 baseline).
- Spatial Intelligence layer that demonstrably helps.
- No reliance on reference images to reach the ceiling.

The forward-port keeps everything that CURRENT already gets right (V5 Analysis, ProjectGenerationContract, Logo post-composite, Session/History, Reference-First, Golden Regression, Quality Trace, R7 Phase 9B production default) and only replaces the **space-generation translation layer**.

---

## 13. Selective Forward-Port Plan

Pull into the current Phase 9B compiler from the P9B lineage:

1. **Action-verb architecture language templates.** Bring back the rule format used by `space-generator/v1-experimental/spatial-intelligence-compiler/` and `architecture-bridge/`: each architecture mechanism is rendered as a short English sentence in the form *[surface] [verb] [relationship] [function]*.
2. **Atomic spatial-intent fields.** Map V5 semantic content into a small IR (surface, action, relationship, function, material, light) rather than passing through Chinese prose. This is what R8.5 `spatialMechanisms` should become.
3. **Architecture-Function Bridge.** Reintroduce the explicit bridge that ties each mechanism to a commercial zone (reception, waiting, consultation). P9B-A/B both scored 5/5 Functional Realism with this block present; CURRENT scores 3/5 without an effective version.
4. **Keep the R8.5.1 semantic separator**, but:
   - Extend coverage to `mustBeVisible`, `functionalNetwork[]`, and any other field rendered into architecture/DNS/composition blocks.
   - Add a rewrite pass that replaces motif-stripped phrases with a construction-verb sentence rather than leaving a label.
   - Add a duplicate-suppression pass so one V5 sentence cannot appear 4 times.
5. **Trim the negative block back toward P9B-B's 366 chars.** Move all but the universal brand-generic guard into evaluation/regression expectations rather than production prompt text.
6. **Keep anchors/reference as a floor, not a ceiling.** Reference-First policy for production stays (for client-mandated references, logo post-composite, etc.), but the text-only path must hit ≥4/5 Expressiveness on its own.

Do **not** forward-port:
- P7's 12-block order with Brand at position 2.
- P8B anchor-aware Mode B as a default.
- Any old UI / task model / provider management / storage code.
- P7/P8B's habit of rendering the brand name as in-scene text (keep R7 post-composite).

---

## 14. R8.5 Go / No-Go

**R8.5 as currently scoped — No-Go for "more semantic layers and negative guards" path.**

- R8.5.1's structural fix is real but incomplete (misses `mustBeVisible` / `functionalNetwork`, does not rewrite to action verbs).
- R8.5.2 (Brand Motif Abstraction) should stay paused.
- Adding more motif classifiers or a longer negative block will not fix the root cause; P8B-A and P9B-B stayed at 5/5 literal-motif with **shorter** negatives and **different content**, not more guards.

**R8.5 redirected — Go.** Rename/repurpose R8.5 from "Brand Motif Architecture IR Pollution" to "V5 → P9B-B Action-Verb Architecture IR". The work becomes:
1. Extend the R8.5.1 provenance audit to every field that touches architecture blocks.
2. Add a translation pass from V5 semantic content to atomic construction-verb sentences (port the rule shape from `spatial-intent-compiler` + `architecture-bridge`).
3. Re-run the same 3-run P7-style stability test on JZMX reception text-only. Pass criteria: ≥2/3 runs at ≥4/5 Expressiveness AND ≥2/3 runs at ≥4/5 Literal Motif Risk, with one run ≥4/5 Functional Realism.

---

## 15. R9 Go / No-Go

**R9 Productionization — No-Go until R8.5 redirected lands and passes the stability gate.**

Productionizing the current Phase 9B compiler would lock in:
- 3/5 Functional Realism on text-only,
- 1/5 Literal Motif Risk on fresh samples,
- A single favorable smoke being mistaken for a fix.

R9 can proceed once:
- The forward-port in §13 is implemented.
- 3/3 JZMX reception text-only runs pass the gate in §14.
- One FTT and one YJLF text-only smoke also reach ≥4/5 Expressiveness (generalization check).
- The 9-image R8 batch is re-scored against the new compiler and does not regress.

Reference-First (R10) and Space Continuation (R11) stay sequenced after R9.

---

## 16. Artifacts

### Code
- `D:/Masterpiece-OS-archaeology/` — independent worktree, branches `archaeology/pre-anchor-space`, `archaeology/p8b-anchor`, `archaeology/p9b-spatial`. No mainline files modified inside this worktree.
- Mainline-only compatibility launchers (do not affect production):
  - `apps/desktop/scripts/run-archaeology-p7.mjs`
  - `apps/desktop/scripts/run-archaeology-p8b.mjs`
  - `apps/desktop/scripts/run-archaeology-p9b.mjs`
  - `apps/desktop/scripts/run-archaeology-current.mjs` (+ `.ts`)
  - Bundled entries live under `apps/desktop/out/archaeology-*.mjs` (gitignored).
- Archaeology runner sources (committed to the archaeology branches only):
  - `space-generator/archaeology/runner/run-p7-reproduction.ts`
  - `space-generator/archaeology/runner/run-p8b-ab.ts`
  - `space-generator/archaeology/runner/run-p9b-ab.ts`
  - `space-generator/archaeology/runner/prompt-diff.mjs`

### Results
- `space-generator/archaeology/results/p7/run-0{1,2,3}/`: 3 images + prompts + run.json + vision evaluation
- `space-generator/archaeology/results/p8b-a/`, `p8b-b/`
- `space-generator/archaeology/results/p9b-a/`, `p9b-b/`
- `space-generator/archaeology/results/current-t/`, `current-r/`
- `space-generator/archaeology/prompt-diff/epoch-stats.{json,md}`
- `space-generator/archaeology/reports/space-generation-regression-point-report.md` (this file)

### Vision scoring caveat
All per-image scores in §2–3 were produced by a multimodal vision model with a fixed rubric. They are **consistent across epochs** (same prompt, same model, same temperature) but are not human judgment. Before locking in the §14–15 decisions, please human-scan at minimum: P7 run-03, P8B-A, P9B-B, and CURRENT-T. If your eye disagrees with the vision scores by more than one point on Architecture Expressiveness or Literal Motif Risk, we re-run with a larger sample before changing course.

---

## 17. One-Paragraph Answer to the Central Question

> "旧版为什么能生成历史三张 S 级空间，而当前 Text-only 为什么更保守？"

旧版能到 S 级，不是因为它 motif 少（P7 三张都带羽毛浮雕），也不是因为有 anchor（anchor 在 A/B 里是负收益），而是因为 **P9B-B 那一版编译器把结构化 DNA 翻译成了具体的、可画的英语建筑动作句**——"surface descends / walls bend / membranes filter light"——Seedream 5 Pro 在这种指令下会主动发明像"draped sheer-fabric canopy"这样的新空间机制。当前 V5 迁移把这一层翻译丢了：Phase 9B source adapter 直接把 V5 的中文品牌叙事和 enum 标签拷进 architecture blocks，R8.5.1 只做了 motif 词元剥离，没把剥离后的内容重写成动作句，结果 model 读到的是"模拟羽毛的层叠与包裹感 / 抽象羽毛纹理的墙面或屏风"，就老老实实画了一根巨大的紫色羽毛。**回归点不在 P7→P8B，而在 P9B-B→CURRENT；药方不是回滚，是把 P9B-B 的动作句 IR 重新接回 V5。**
