# CI-W1C.7.3 — Evidence / Truth / Authority Balance Audit

> **Mode**: Zero-API static audit · **HEAD**: `c058316c442e3554c49a91a468533d5d426e5768`
> **Purpose**: Audit the Evidence → Truth authority balance. Determine whether constraints/unknowns dominate positive strategy, and whether the AUTHORITATIVE > VISUAL_SOURCE_FACT resolution is the correct first-loss candidate.

## Layer 4: Evidence (evidence-ledger.json)

| Field | G01 | G02 |
|---|---|---|
| Schema | 0.1 | 0.1 |
| Size (bytes) | 1685 | 1685 |
| Entries | 4 | 4 |
| `id` patterns | brand_name, industry, visual_understanding_core, pso_provenance | SAME SHAPE |
| `content` | "ProjectRecord.brandName", "ProjectRecord.industry", null, "PromptSourceObject derived..." | SAME SHAPE |
| `evidenceRefs[]` per entry | empty/1 | empty/1 |
| `isReferenceEvidence` | false on all 4 | false on all 4 |

**Finding: evidence-ledger is a 4-row generic table.** It carries:
- 1 brand_name evidence row (carrier: project_record)
- 1 industry evidence row (carrier: project_record)
- 1 visual_understanding_core provenance row (no content)
- 1 prompt_source_object provenance row (with sourceFingerprint but no per-fact evidence)

**Critical gap**: NONE of the 28-35 v1 DVC asset entries (logos, colors, motifs, copy, etc.) become evidence-ledger rows. The v1 DVC's 30+ asset IDs are not anchored to any fact. So when the prompt says "factRefs: [4f65f3f8-1749-...]" for the locked logo, the only "evidence" is the UUID itself.

## Layer 5: Truth (project-truth.json)

### 5.1 Fact count by key

| Key | G01 count | G02 count | Carrier (AUTHORITATIVE) | Carrier (VISUAL) | Resolution |
|---|---:|---:|---|---|---|
| `brand.name` | 3 | 3 | project_record | visual_understanding_core | UNANIMOUS_VALUE (consensus) |
| `brand.role` | 2 | 2 | (PSO only) | visual_understanding_core | UNANIMOUS_VALUE |
| `business.industry` | 3 | 3 | project_record=**待确认** | visual_understanding_core=**医疗美容** / **中医健康管理...** | **CONFLICTED, AUTHORITATIVE wins** |
| `business.model` | 1 (null) | 1 (null) | PSO=null | — | SINGLE_FACT, status=unknown |
| `product.core_products` | 1 (null) | 1 (null) | PSO=null | — | SINGLE_FACT, status=unknown |
| `locked.assets` | 5 | 4 | VUC=user-lock-2 | (VUC other) | CONFLICTED, AUTHORITATIVE wins |
| `locked.facts` | 1 | 1 | project_record | — | SINGLE_FACT, LOCKED |
| `locked.logo` | 1 | 1 | project_record | — | SINGLE_FACT, LOCKED |
| **Total facts** | **17** | **16** | | | |

### 5.2 Positive vs Constraint split

| Category | G01 | G02 |
|---|---:|---:|
| POSITIVE facts (brand.name, brand.role, business.industry w/ value) | 3 | 3 |
| UNKNOWN facts (business.model, product.core_products) | 2 | 2 |
| LOCKED/CONSTRAINT facts (locked.assets 5×/4×, locked.facts, locked.logo) | 12 | 11 |
| **Total** | **17** | **16** |

**Constraint-to-Positive ratio: 12:3 (G01) and 11:3 (G02) ≈ 4:1.**

**The Truth layer is HEAVILY constraint-dominated.** 70%+ of facts are LOCKED or UNKNOWN. Only 3 facts carry positive project-specific content. Of those 3:
- 1 is `brand.name` (forbidden from being used as positive creative authority per the synthesis prompt epistemic rules)
- 1 is `brand.role` (CONSENSUS, rich value, but downstream doesn't use it as TENSION driver)
- 1 is `business.industry` (CONFLICTED, AUTHORITATIVE=待确认 placeholder, NOT rich value)

So **effectively 1.5 of 17 facts carry project-specific POSITIVE STRATEGIC CONTENT** that the prompt COULD use (brand.role, partial business.industry).

### 5.3 Conflict resolution analysis

The `business.industry` conflict is the critical case:
- **AUTHORITATIVE_PROJECT_METADATA** (project_record) says: `待确认（基于现有素材推断）` with confidence=0
- **VISUAL_SOURCE_FACT** (visual_understanding_core) says: `医疗美容` (G01) / `中医健康管理与诊疗服务` (G02) with confidence=0.9

The resolution selects the AUTHORITATIVE value (correctly, by protocol: project_record owns business facts). The result: a low-confidence placeholder propagates to the prompt, suppressing the high-confidence visual inference.

**Is this a "first-loss" event?**

PRO: The visual inference of "this is a 医疗美容 business" / "this is a 中医健康管理与诊疗服务 business" is project-specific and high-confidence. Suppressing it forces the prompt to treat industry as "未知".

CON: The design choice is intentional. The system was designed to require USER confirmation of business facts before treating them as ground truth. This prevents the model from "trusting" its own visual inference.

**Audit verdict**: This is a **PROTOCOL_BY_DESIGN** choice, NOT a defect. The user has not yet confirmed `business.industry` (the project record says "待确认"). The system correctly propagates that "未确认" state.

However, this means the prompt is **STRUCTURALLY** biased toward "unknown" framings. The model has no positive business-anchor to work with (only brand.role), so it defaults to "lock vs unknown" tension framework.

## Authority weight audit

The Truth layer's `authority` field is the contract for downstream priority. The hierarchy (per the schema):
- `AUTHORITATIVE_PROJECT_METADATA` (project_record) — **highest** for business facts
- `USER_CONFIRMED` (locked.facts) — **highest** for constraints
- `VISUAL_SOURCE_FACT` (visual_understanding_core) — **high** for visual facts
- `SYSTEM_DEFAULT` (prompt_source_object) — **derived**, lower
- `LOCKED` — strongest for the locked field
- `UNKNOWN` — no value

**G01/G02 weight distribution**:
- AUTHORITATIVE_PROJECT_METADATA: 4 facts each (brand.name, business.industry, locked.facts, locked.logo) = 4/17 (G01), 4/16 (G02) = 24-25%
- VISUAL_SOURCE_FACT: 4 facts each (brand.name, brand.role, business.industry, locked.assets) = 4/17 = 24%
- SYSTEM_DEFAULT: 3 facts each (brand.name, brand.role, business.industry) = 3/17 = 18%
- LOCKED: 5-6 facts each = 30-35%
- UNKNOWN: 2 facts each (business.model, product.core_products) = 12%

**Heavy LOCKED presence (30%+) means the system is "anchored to constraints."** Combined with the AUTHORITATIVE business.industry=待确认 placeholder, the system is **designed** to produce constraint-dominated outputs.

## Hard rule check (spec PART H)

The spec says: "Audit Truth/Evidence authority balance. Determine whether constraints/unknowns dominate positive strategy."

**Answer: YES, constraints/unknowns dominate.** Constraint:Positive ratio ≈ 4:1 in both projects. The Truth layer is NOT a "balanced" strategic input; it is a **constraint registry with a thin layer of positive identity** (brand.name + brand.role).

## Does Truth layer cause the first-loss?

PARTIAL verdict. The Truth layer is a **major contributor** to the first-loss because:
1. business.industry=待确认 (AUTHORITATIVE choice) propagates to prompt as "unknown"
2. business.model UNKNOWN propagates
3. product.core_products UNKNOWN propagates
4. Only brand.role carries positive content, and the model doesn't use it as TENSION driver

But the Truth layer is **CORRECTLY APPLIED** — it faithfully represents the user's actual planning state. The real first-loss is the prompt's **failure to use brand.role as a TENSION driver** (covered in `strategic-prompt-salience-audit.md`).

So the **primary cause** is a combination of:
- Truth: business.industry=待确认 (low positive content)
- Prompt: TENSION framework doesn't use brand.role (salience collapse)

The combined effect is that the synthesis prompt carries the brand.role fact but the model defaults to "lock vs unknown" tension framework. This is **`STRATEGIC_CONTEXT_FILTER_LOSS`** (the prompt's filter doesn't elevate positive content into the tension-generation loop) or **`PROJECT_TRUTH_COMPRESSION`** (the AUTHORITATIVE selection suppresses rich visual content).

See `first-loss-stage-decision.md`.
